/* eslint-disable no-param-reassign */
import { EventEmitter } from './emitter';
import { Arguments, PeerEvents, PeerOptions, TypedEmitter } from './types';
import {
  filterTracksAV,
  getDefaultCamConstraints,
  randomHex,
  removeTracks,
  removeTracksFromPeer,
  setTracksEnabled,
} from './utils';

export default class Peer {
  private peerConn: RTCPeerConnection;

  private readonly streamLocal: MediaStream = new MediaStream();

  private readonly channels = new Map<string, RTCDataChannel>();

  private readonly emitter = new EventEmitter() as TypedEmitter<PeerEvents>;

  private polite = true;

  private makingOffer = false;

  private ignoreOffer = false;

  private readonly options: Required<PeerOptions> = {
    batchCandidates: true,
    batchCandidatesTimeout: 200,
    name: 'peer',
    config: {
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    },
    constraints: {},
    offerOptions: {},
    answerOptions: {},
    enableDataChannels: false,
    channelName: randomHex(20),
    channelOptions: {},
    sdpTransform: (sdp) => sdp,
  };

  /** Creates a peer instance */
  public constructor(options?: PeerOptions) {
    this.options = { ...this.options, ...options };
  }

  /** Initializes the peer connection */
  public init(): RTCPeerConnection {
    // do not reset connection if a new one already exists
    if (this.status() === 'new') {
      return this.peerConn;
    }
    // close any existing active peer connections
    this.destroy();
    // create peer connection
    this.peerConn = new RTCPeerConnection(this.options.config);
    // ⚡ triggers "negotiationneeded" event if connected
    this.streamLocal
      .getTracks()
      .forEach((track) => this.peerConn.addTrack(track, this.streamLocal));

    // setup peer connection events
    const candidates: RTCIceCandidate[] = [];
    let candidatesId: ReturnType<typeof window.setTimeout>;

    function clearBatchedCandidates() {
      clearTimeout(candidatesId);
      candidates.length = 0;
    }

    this.peerConn.onicecandidate = (event) => {
      if (!event || !event.candidate) return;
      // if batching candidates then setup timeouts
      if (this.options.batchCandidates) {
        // clear timeout and push new candidate into batch
        clearTimeout(candidatesId);
        candidates.push(event.candidate);
        // return all candidates if finished gathering
        if (this.peerConn && this.peerConn.iceGatheringState === 'complete') {
          this.emit('onicecandidates', candidates);
        } else {
          // create timeout to return candidates after 200ms
          candidatesId = setTimeout(() => {
            if (candidates.length) {
              this.emit('onicecandidates', candidates);
              clearBatchedCandidates();
            }
          }, this.options.batchCandidatesTimeout);
        }
      } else {
        // if not batching candidates then return them individually
        this.emit('onicecandidates', [event.candidate]);
      }
    };

    this.peerConn.ontrack = (event) => {
      if (event.streams) {
        this.emit('streamRemote', event.streams[0]);
      }
    };

    this.peerConn.oniceconnectionstatechange = () => {
      this.emit('status', this.status());
      switch (this.status()) {
        case 'closed':
        case 'failed':
        case 'disconnected': {
          clearBatchedCandidates();
          this.destroy();
          break;
        }
        case 'checking': {
          this.emit('connecting');
          break;
        }
        case 'connected': {
          console.log(`${this.options.name}.connected()`);
          this.emit('connected');
          break;
        }
        default:
          break;
      }
    };

    this.peerConn.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;

        const { channelName, channelOptions, enableDataChannels } = this.options;
        if (enableDataChannels) {
          // create data channel, needed to add "m=application" to SDP
          this.getDataChannel(channelName, channelOptions);
        }

        const offer = await this.peerConn.createOffer(this.options.offerOptions);
        if (this.peerConn.signalingState !== 'stable') return;

        console.log(`${this.options.name}.onnegotiationneeded()`);
        offer.sdp = offer.sdp && this.options.sdpTransform(offer.sdp);
        await this.peerConn.setLocalDescription(offer);

        if (this.peerConn.localDescription) {
          console.log(this.options.name, '->', offer.type);
          this.emit('signal', this.peerConn.localDescription);
        }
      } catch (err) {
        this.error('Failed in negotiation needed', err);
      } finally {
        this.makingOffer = false;
      }
    };

    this.peerConn.ondatachannel = (event) => {
      // called for in-band negotiated data channels
      const { channel } = event;
      if (this.options.enableDataChannels) {
        this.channels.set(channel.label, channel);
        this.addDataChannel(channel);
      }
    };

    return this.peerConn;
  }

  public start({ polite = false }: { polite?: boolean } = {}) {
    try {
      if (this.isClosed()) {
        this.init();
      }

      console.log(`${this.options.name}.start()`);

      this.polite = polite;

      // ⚡ triggers "negotiationneeded" event if connected
      this.peerConn.restartIce();
    } catch (err) {
      this.error('Failed to start', err);
      throw err;
    }
  }

  public async signal(description: RTCSessionDescriptionInit) {
    try {
      if (this.isClosed()) {
        this.init();
      }

      console.log(this.options.name, '<-', description.type);

      const offerCollision =
        description.type === 'offer' &&
        (this.makingOffer || this.peerConn.signalingState !== 'stable');

      this.ignoreOffer = !this.polite && offerCollision;
      if (this.ignoreOffer) {
        console.log(this.options.name, '- ignoreOffer');
        return;
      }

      await this.peerConn.setRemoteDescription(description);
      if (description.type === 'offer') {
        await this.peerConn.setLocalDescription();
        if (this.peerConn.localDescription) {
          console.log(this.options.name, '->', this.peerConn.localDescription.type);
          this.emit('signal', this.peerConn.localDescription);
        }
      }
      this.polite = true;
    } catch (err) {
      this.error('Failed to set local/remote descriptions', err);
    }
  }

  public async addIceCandidate(candidate: RTCIceCandidate) {
    try {
      console.log(this.options.name, '<-', 'icecandidate');
      await this.peerConn?.addIceCandidate(candidate);
    } catch (err) {
      if (!this.ignoreOffer) {
        this.error('Failed to addIceCandidate', err);
      }
    }
  }

  /** Sends data to another peer using an RTCDataChannel */
  public send(
    data: string | Blob | ArrayBuffer | ArrayBufferView,
    label: string = this.options.channelName
  ): boolean {
    const channel = this.channels.get(label);
    if (channel && channel.readyState === 'open' && data) {
      channel.send(data);
      this.emit('channelData', { channel, data, source: 'outgoing' });
      return true;
    }
    return false;
  }

  /** Gets existing open data channels or creates new ones */
  public getDataChannel(
    label: string = this.options.channelName,
    opts: RTCDataChannelInit = {}
  ): RTCDataChannel | undefined {
    if (!this.options.enableDataChannels) {
      this.error('Failed to createDataChannel as "enableDataChannels" is false');
      return undefined;
    }
    if (this.isClosed()) {
      this.error('Failed to createDataChannel as peer connection is closed');
      return undefined;
    }
    if (this.channels.has(label)) {
      return this.channels.get(label);
    }
    // ⚡ triggers "negotiationneeded" event if connected and no other data channels already added
    const channel = this.peerConn.createDataChannel(label, opts);
    this.channels.set(channel.label, channel);
    this.addDataChannel(channel);
    return channel;
  }

  private addDataChannel(channel: RTCDataChannel) {
    // setup data channel events
    channel.onopen = () => this.emit('channelOpen', { channel });
    channel.onerror = (error: RTCErrorEvent) => this.emit('channelError', { channel, error });
    channel.onclose = () => {
      this.channels.delete(channel.label);
      this.emit('channelClosed', { channel });
    };
    channel.onmessage = (event: MessageEvent<string | Blob | ArrayBuffer | ArrayBufferView>) => {
      this.emit('channelData', { channel, data: event.data, source: 'incoming' });
    };
  }

  /** Closes any active peer connection */
  public destroy() {
    if (!this.isClosed()) {
      this.polite = true;
      this.makingOffer = false;
      this.ignoreOffer = false;
      this.peerConn.close();
      console.log(`${this.options.name}.disconnected()`);
      this.emit('disconnected');
    }
  }

  /** Returns the ICEConnectionState of the peer connection */
  public status(): RTCIceConnectionState {
    return this.peerConn?.iceConnectionState ?? 'closed';
  }

  /** Returns true if the peer is connected */
  public isConnected(): boolean {
    return this.status() === 'connected';
  }

  /** Returns true if the peer is closed */
  public isClosed(): boolean {
    return this.status() === 'closed';
  }

  /** Returns RTCPeerConnection */
  public get() {
    return this.peerConn;
  }

  public getStreamLocal() {
    return this.streamLocal;
  }

  private error(message: string, error?: Error) {
    console.error(`${this.options.name}`, message, error ? `- ${error.toString()}` : '');
    this.emit('error', { name: this.options.name, message, error });
  }

  // helpers

  /** Add a stream to the local stream */
  public addStream(stream: MediaStream, replace = true) {
    try {
      if (replace) {
        this.removeTracks(true, true);
      }
      stream.getTracks().forEach((track) => this.addTrack(track));
      return this.streamLocal;
    } catch (err) {
      this.error('Failed to set local stream', err);
      throw err;
    }
  }

  /** Add a track to the local stream */
  public addTrack(track: MediaStreamTrack) {
    this.streamLocal.addTrack(track);
    this.emit('streamLocal', this.streamLocal);
    // ⚡ triggers "negotiationneeded" event if connected
    this.peerConn?.addTrack(track, this.streamLocal);
  }

  /** Removes the local and remote stream of audio and/or video tracks */
  public removeTracks(video = true, audio = true) {
    removeTracks(this.streamLocal, filterTracksAV(video, audio));
    if (this.peerConn) {
      // remove tracks from peer connection
      removeTracksFromPeer(this.peerConn, filterTracksAV(video, audio));
    }
  }

  /** Disables local stream tracks of audio and/or video tracks  */
  public pauseTracks(video = true, audio = true) {
    setTracksEnabled(this.streamLocal, filterTracksAV(video, audio), false);
  }

  /** Enables local stream tracks of audio and/or video tracks */
  public resumeTracks(video = true, audio = true) {
    setTracksEnabled(this.streamLocal, filterTracksAV(video, audio), true);
  }

  // emitter

  public on<E extends keyof PeerEvents>(event: E, cb: PeerEvents[E]) {
    return this.emitter.on(event, cb);
  }

  public off<E extends keyof PeerEvents>(event: E, cb: PeerEvents[E]) {
    return this.emitter.off(event, cb);
  }

  public emit<E extends keyof PeerEvents>(event: E, ...args: Arguments<PeerEvents[E]>) {
    return this.emitter.emit(event, ...args);
  }

  // statics

  public static getUserMedia(constraints?: MediaStreamConstraints) {
    return navigator.mediaDevices.getUserMedia({
      ...getDefaultCamConstraints(),
      ...constraints,
    });
  }
}
