/* eslint-disable no-param-reassign */
import { EventEmitter } from './emitter';
import { Arguments, PeerEvents, PeerOptions, TypedEmitter } from './types';
import {
  getDefaultCamConstraints,
  removeTracks,
  removeTracksFromPeer,
  setTracksEnabled,
} from './utils';

export class Peer {
  private peerConn: RTCPeerConnection;

  private readonly streamLocal: MediaStream = new MediaStream();

  private readonly channels = new Map<string, RTCDataChannel>();

  private readonly emitter = new EventEmitter() as TypedEmitter<PeerEvents>;

  private makingOffer = false;

  private readonly options: PeerOptions = {
    batchCandidates: true,
    batchCandidatesTimeout: 200,
    enableDataChannels: true,
    config: {
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    },
    offerOptions: {},
    answerOptions: {},
    channelName: 'peer-lite',
    channelOptions: {},
    sdpTransform: (sdp) => sdp,
  };

  /** Creates a Peer instance */
  public constructor(options?: PeerOptions) {
    this.options = { ...this.options, ...options };
  }

  /** Add a stream the local stream */
  public async addStream(stream: MediaStream, replace = true) {
    try {
      // remove existing tracks if replace is true
      if (replace) {
        this.removeTracks(true, true);
      }
      // add stream tracks
      stream.getTracks().forEach((track) => this.addTrack(track));
      return this.streamLocal;
    } catch (e) {
      this.error('Failed to set local stream', e);
      throw e;
    }
  }

  /** Add a track the local stream */
  public async addTrack(track: MediaStreamTrack) {
    this.streamLocal.addTrack(track);
    this.emit('streamLocal', this.streamLocal);
    if (this.peerConn) {
      // add tracks to peer connection - triggers "negotiationneeded" event if connected
      this.peerConn.addTrack(track, this.streamLocal);
    }
  }

  /** Removes the local and remote stream of audio and or video tracks */
  public removeTracks(video = true, audio = true) {
    removeTracks(this.streamLocal, video, audio);
    if (this.peerConn) {
      // remove tracks from peer connection
      removeTracksFromPeer(this.peerConn, video, audio);
    }
  }

  /** Removes both local and remote streams of both audio and video */
  public stop() {
    removeTracks(this.streamLocal, true, true);
  }

  /** Disables the local stream of audio and or video tracks  */
  public pauseTracks(video = true, audio = true) {
    setTracksEnabled(this.streamLocal, video, audio, false);
  }

  /** Enables the local stream of audio and or video tracks */
  public resumeTracks(video = true, audio = true) {
    setTracksEnabled(this.streamLocal, video, audio, true);
  }

  /** Initializes the peer connection */
  public async init(): Promise<RTCPeerConnection> {
    // close any existing active peer connections
    this.hangup();
    // create peer connection
    this.peerConn = new RTCPeerConnection(this.options.config);
    // add local stream to peer connection
    this.streamLocal
      .getTracks()
      .forEach((track) => this.peerConn.addTrack(track, this.streamLocal));

    // setup peer connection events
    const candidates = [];
    let candidatesId = null;

    function clearBatchedCandidates() {
      clearTimeout(candidatesId);
      candidates.length = 0;
      candidatesId = null;
    }

    this.peerConn.onicecandidate = async (event) => {
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
          this.hangup();
          break;
        }
        case 'checking': {
          this.emit('connecting');
          break;
        }
        case 'connected': {
          this.emit('connected');
          break;
        }
        default:
          break;
      }
    };

    this.peerConn.onnegotiationneeded = () => {
      // only emit negotiation if already connected
      if (this.isConnected()) {
        this.makingOffer = true;
        this.emit('negotiation');
      }
    };

    this.peerConn.ondatachannel = (event) => {
      // called for in-band negotiated data channels
      const { channel } = event;
      if (this.options.enableDataChannels) {
        this.channels.set(channel.label, channel);
        this.addDataChannelEvents(channel);
      }
    };

    return this.peerConn;
  }

  /** Adds an ICE candidate to the peer connection */
  public async addIceCandidate(candidate: RTCIceCandidate) {
    try {
      if (this.peerConn && !this.isClosed()) {
        await this.peerConn.addIceCandidate(candidate);
      }
    } catch (e) {
      this.error('Failed to add ICE Candidate', e);
    }
  }

  /** Returns an offer to send to another Peer */
  public async call(options: RTCOfferOptions = {}): Promise<RTCSessionDescriptionInit> {
    try {
      await this.reset();

      const { channelName, channelOptions, enableDataChannels } = this.options;
      if (enableDataChannels) {
        // create data channel, needed to add "m=application" to SDP
        this.getDataChannel(channelName, channelOptions);
      }

      const offerOptions = {
        ...this.options.offerOptions,
        ...options,
      };

      const offer = await this.peerConn.createOffer(offerOptions);
      offer.sdp = this.options.sdpTransform(offer.sdp);
      await this.peerConn.setLocalDescription(offer);
      return offer;
    } catch (e) {
      this.error('Failed to call', e);
      throw e;
    } finally {
      this.makingOffer = false;
    }
  }

  /** Accepts an offer from another peer and returns an answer */
  public async answer(offer: RTCSessionDescriptionInit, options: RTCAnswerOptions = {}) {
    try {
      await this.reset();

      const offerCollision = this.makingOffer || this.peerConn.signalingState !== 'stable';

      if (offerCollision) {
        await Promise.all([
          this.peerConn.setLocalDescription({ type: 'rollback' }),
          this.peerConn.setRemoteDescription(offer),
        ]);
      } else {
        await this.peerConn.setRemoteDescription(offer);
      }
    } catch (e) {
      this.error('Failed to answer (remote)', e);
      throw e;
    }

    const answerOptions = {
      ...this.options.answerOptions,
      ...options,
    };

    try {
      const answer = await this.peerConn.createAnswer(answerOptions);
      answer.sdp = this.options.sdpTransform(answer.sdp);
      await this.peerConn.setLocalDescription(answer);
      return answer;
    } catch (e) {
      this.error('Failed to answer (local)', e);
      throw e;
    }
  }

  /** Accepts an answer from another peer */
  public async accept(answer: RTCSessionDescriptionInit) {
    try {
      if (this.peerConn) {
        await this.peerConn.setRemoteDescription(answer);
      }
    } catch (e) {
      this.error('Failed to accept', e);
      throw e;
    }
  }

  /** Sends data to another peer using a RTCDataChannel */
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
  ): RTCDataChannel | null {
    if (this.isClosed()) {
      return null;
    }
    if (this.channels.has(label)) {
      return this.channels.get(label);
    }
    const channel = this.peerConn.createDataChannel(label, opts);
    this.channels.set(channel.label, channel);
    this.addDataChannelEvents(channel);
    return channel;
  }

  private addDataChannelEvents(channel: RTCDataChannel) {
    // setup data channel events
    channel.onopen = this.emit.bind(this, 'channelOpen', { channel });
    channel.onerror = (error: RTCErrorEvent) => this.emit('channelError', { channel, error });
    channel.onclose = () => {
      this.channels.delete(channel.label);
      this.emit('channelClosed', { channel });
    };
    channel.onmessage = (event: MessageEvent) => {
      this.emit('channelData', { channel, data: event.data, source: 'incoming' });
    };
  }

  /** Closes any active Peer connection */
  public hangup() {
    if (this.peerConn) {
      this.peerConn.close();
      this.peerConn = null;
      this.emit('disconnected', this.makingOffer);
    }
  }

  /** Closes and resets the peer connection */
  public async reset() {
    if (this.status() !== 'new') {
      this.hangup();
      await this.init();
    }
    return this.peerConn;
  }

  /** Returns the ICEConnectionState of the peer connection */
  public status(): RTCIceConnectionState {
    if (this.peerConn) {
      return this.peerConn.iceConnectionState;
    }
    return 'closed';
  }

  /** Returns true if the peer is connected */
  public isConnected(): boolean {
    return this.status() === 'connected';
  }

  public isClosed(): boolean {
    return this.status() === 'closed';
  }

  public isMakingOffer(): boolean {
    return this.makingOffer;
  }

  public getPeerConnection() {
    return this.peerConn;
  }

  public getStreamLocal() {
    return this.streamLocal;
  }

  /** Get stats for peer connection */
  public async getStats(): Promise<RTCStatsReport> {
    return this.peerConn ? this.peerConn.getStats() : null;
  }

  private error(name: string, error: Error) {
    console.error(`${name} - ${error.toString()}`);
    this.emit('error', { name, error });
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
