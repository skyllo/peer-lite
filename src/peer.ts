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

const POLITE_DEFAULT_VALUE = true;

export default class Peer {
  private peer: RTCPeerConnection;

  private readonly streamLocal: MediaStream = new MediaStream();

  private readonly channels = new Map<string, RTCDataChannel>();

  private readonly channelsPending = new Map<string, RTCDataChannelInit>();

  private readonly emitter = new EventEmitter() as TypedEmitter<PeerEvents>;

  private polite = POLITE_DEFAULT_VALUE;

  private isActive = false;

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
    this.peer = this.init();
  }

  /** Initializes the peer connection */
  public init(): RTCPeerConnection {
    // do not reset connection if a new one already exists
    if (this.status() === 'new') {
      return this.peer;
    }
    // close any existing active peer connections
    this.destroy();
    // create peer connection
    this.peer = new RTCPeerConnection(this.options.config);
    // ⚡ triggers "negotiationneeded" event if connected
    this.streamLocal.getTracks().forEach((track) => this.peer.addTrack(track, this.streamLocal));

    // setup peer connection events
    const candidates: RTCIceCandidate[] = [];
    let candidatesId: ReturnType<typeof window.setTimeout>;

    function clearBatchedCandidates() {
      clearTimeout(candidatesId);
      candidates.length = 0;
    }

    this.peer.onicecandidate = (event) => {
      if (!event || !event.candidate) return;
      // if batching candidates then setup timeouts
      if (this.options.batchCandidates) {
        // clear timeout and push new candidate into batch
        clearTimeout(candidatesId);
        candidates.push(event.candidate);
        // return all candidates if finished gathering
        if (this.peer.iceGatheringState === 'complete') {
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

    this.peer.ontrack = (event) => {
      if (event.streams) {
        this.emit('streamRemote', event.streams[0]);
      }
    };

    this.peer.oniceconnectionstatechange = () => {
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

    this.peer.onnegotiationneeded = async () => {
      try {
        if (!this.isActive) return;

        this.makingOffer = true;

        const { channelName, channelOptions, enableDataChannels } = this.options;
        if (enableDataChannels) {
          // create data channel to add "m=application" to SDP
          this.addDataChannel(channelName, channelOptions);
        }

        const offer = await this.peer.createOffer(this.options.offerOptions);
        if (this.peer.signalingState !== 'stable') return;

        // add pending data channels
        this.createDataChannels();

        console.log(`${this.options.name}.onnegotiationneeded()`);
        offer.sdp = offer.sdp && this.options.sdpTransform(offer.sdp);
        await this.peer.setLocalDescription(offer);

        if (this.peer.localDescription) {
          console.log(this.options.name, '->', offer.type);
          this.emit('signal', this.peer.localDescription);
        }
      } catch (err) {
        if (err instanceof Error) {
          this.error('Failed in negotiation needed', err);
        }
      } finally {
        this.makingOffer = false;
      }
    };

    this.peer.ondatachannel = (event) => {
      // called for in-band non-negotiated data channels
      const { channel } = event;
      if (this.options.enableDataChannels) {
        this.channels.set(channel.label, channel);
        this.addDataChannelEvents(channel);
      }
    };

    return this.peer;
  }

  /** Starts the RTCPeerConnection signalling */
  public start({ polite = POLITE_DEFAULT_VALUE }: { polite?: boolean } = {}) {
    try {
      // reset peer if only local offer is set
      if (this.peer.signalingState === 'have-local-offer') {
        this.destroy();
      }
      if (this.isClosed()) {
        this.init();
      }

      console.log(`${this.options.name}.start()`);

      this.isActive = true;
      this.polite = polite;

      // ⚡ triggers "negotiationneeded" event if connected
      this.peer.restartIce();
    } catch (err) {
      if (err instanceof Error) {
        this.error('Failed to start', err);
      }
    }
  }

  /** Process a RTCSessionDescriptionInit on peer */
  public async signal(description: RTCSessionDescriptionInit) {
    try {
      if (this.isClosed()) {
        this.init();
      }

      console.log(this.options.name, '<-', description.type);

      this.isActive = true;
      const offerCollision =
        description.type === 'offer' && (this.makingOffer || this.peer.signalingState !== 'stable');

      this.ignoreOffer = !this.polite && offerCollision;
      if (this.ignoreOffer) {
        console.log(this.options.name, '- ignoreOffer');
        return;
      }

      await this.peer.setRemoteDescription(description);
      if (description.type === 'offer') {
        // add pending data channels
        this.createDataChannels();

        await this.peer.setLocalDescription();
        if (this.peer.localDescription) {
          console.log(this.options.name, '->', this.peer.localDescription.type);
          this.emit('signal', this.peer.localDescription);
        }
      }
      this.polite = POLITE_DEFAULT_VALUE;
    } catch (err) {
      if (err instanceof Error) {
        this.error('Failed to set local/remote descriptions', err);
      }
    }
  }

  public async addIceCandidate(candidate: RTCIceCandidate) {
    try {
      console.log(this.options.name, '<-', 'icecandidate');
      await this.peer.addIceCandidate(candidate);
    } catch (err) {
      if (!this.ignoreOffer && err instanceof Error) {
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
    if (channel?.readyState === 'open' && data) {
      channel.send(data);
      this.emit('channelData', { channel, data, source: 'outgoing' });
      return true;
    }
    return false;
  }

  /** Add an RTCDataChannel to peer */
  public addDataChannel(label: string = this.options.channelName, opts: RTCDataChannelInit = {}) {
    if (!this.options.enableDataChannels) {
      this.error('Failed to addDataChannel as "enableDataChannels" is false');
      return;
    }
    if (this.isClosed()) {
      this.error('Failed to addDataChannel as peer connection is closed');
      return;
    }
    this.channelsPending.set(label, opts);
    if (this.isActive) {
      this.createDataChannels();
    }
  }

  /** Get an RTCDataChannel added to peer */
  public getDataChannel(label: string = this.options.channelName) {
    return this.channels.get(label);
  }

  private createDataChannels() {
    Array.from(this.channelsPending.entries()).forEach(([key, value]) => {
      // ⚡ triggers "negotiationneeded" event if connected and no other data channels already added
      const channel = this.peer.createDataChannel(key, value);
      this.channels.set(channel.label, channel);
      this.addDataChannelEvents(channel);
    });
    this.channelsPending.clear();
  }

  private addDataChannelEvents(channel: RTCDataChannel) {
    // setup data channel events
    channel.onopen = () => this.emit('channelOpen', { channel });
    channel.onerror = (ev: Event) => {
      const event = ev as RTCErrorEvent;
      this.emit('channelError', { channel, event });
    };
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
      this.polite = POLITE_DEFAULT_VALUE;
      this.isActive = false;
      this.makingOffer = false;
      this.ignoreOffer = false;
      this.channelsPending.clear();
      this.peer.close();
      console.log(`${this.options.name}.disconnected()`);
      this.emit('disconnected');
    }
  }

  /** Returns the ICEConnectionState of the peer */
  public status(): RTCIceConnectionState {
    return this.peer?.iceConnectionState ?? 'closed';
  }

  /** Returns true if the peer is connected */
  public isConnected(): boolean {
    return this.status() === 'connected';
  }

  /** Returns true if the peer is closed */
  public isClosed(): boolean {
    return this.status() === 'closed';
  }

  /** Returns the peer RTCPeerConnection */
  public get() {
    return this.peer;
  }

  /** Get local stream */
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
    } catch (err) {
      if (err instanceof Error) {
        this.error('Failed to set local stream', err);
      }
    }
  }

  /** Add a track to the local stream */
  public addTrack(track: MediaStreamTrack) {
    this.streamLocal.addTrack(track);
    this.emit('streamLocal', this.streamLocal);
    if (!this.isClosed()) {
      // ⚡ triggers "negotiationneeded" event if connected
      this.peer.addTrack(track, this.streamLocal);
    }
  }

  /** Removes the local and remote stream of audio and/or video tracks */
  public removeTracks(video = true, audio = true) {
    removeTracks(this.streamLocal, filterTracksAV(video, audio));
    if (!this.isClosed()) {
      // remove tracks from peer connection
      removeTracksFromPeer(this.peer, filterTracksAV(video, audio));
    }
  }

  /** Replace track with another track on peer */
  public async replaceTrack(track: MediaStreamTrack, trackToReplace: MediaStreamTrack) {
    if (!this.isClosed()) {
      const [sender] = this.peer.getSenders().filter((_sender) => _sender.track === trackToReplace);
      if (sender) {
        // remove/add track on local stream
        removeTracks(this.streamLocal, (_track) => _track === trackToReplace);
        this.streamLocal.addTrack(track);
        // replace track on peer connection - will error if renegotiation needed
        await sender.replaceTrack(track);
        this.emit('streamLocal', this.streamLocal);
      } else {
        this.error(`Failed to find track to replace: ${trackToReplace.id}`);
      }
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
