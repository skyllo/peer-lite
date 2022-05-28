export type Arguments<T> = [T] extends [(...args: infer U) => any]
  ? U
  : [T] extends [void]
  ? []
  : [T];

export type FilterTracksFunc = (track: MediaStreamTrack) => boolean;

export interface TypedEmitter<Events> {
  on<E extends keyof Events>(event: E, listener: Events[E]): this;
  off<E extends keyof Events>(event: E, listener: Events[E]): this;
  emit<E extends keyof Events>(event: E, ...args: Arguments<Events[E]>): boolean;
}

export interface PeerEvents {
  error: (data: { name: string; message: string; error?: Error }) => void;
  // Connection Status and RTCIceCandidates
  connecting: VoidFunction;
  connected: VoidFunction;
  disconnected: () => void;
  signal: (description: RTCSessionDescriptionInit) => void;
  status: (status: RTCIceConnectionState) => void;
  onicecandidates: (iceCandidates: RTCIceCandidate[]) => void;
  // MediaStream
  streamLocal: (stream: MediaStream) => void;
  streamRemote: (stream: MediaStream) => void;
  // RTCDataChannel
  channelOpen: (data: { channel: RTCDataChannel }) => void;
  channelClosed: (data: { channel: RTCDataChannel }) => void;
  channelError: (data: { channel: RTCDataChannel; event: RTCErrorEvent }) => void;
  channelData: (data: {
    channel: RTCDataChannel;
    source: 'incoming' | 'outgoing';
    data: string | Blob | ArrayBuffer | ArrayBufferView;
  }) => void;
}

export interface PeerOptions {
  /** Enables support for batching ICECandidates */
  batchCandidates?: boolean;
  /** Timeout in MS before emitting batched ICECandidates */
  batchCandidatesTimeout?: number;
  /** Peer name used in emitting errors */
  name?: string;
  /** RTCPeerConnection options */
  config?: RTCConfiguration;
  /** RTCOfferOptions options */
  offerOptions?: RTCOfferOptions;
  /** Enables support for RTCDataChannels */
  enableDataChannels?: boolean;
  /** Default RTCDataChannel label */
  channelLabel?: string;
  /** Default RTCDataChannel options */
  channelOptions?: RTCDataChannelInit;
  /** Function to transform offer/answer SDP */
  sdpTransform?: (sdp: string) => string;
}
