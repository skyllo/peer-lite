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
  // Connection Status
  connecting: VoidFunction;
  connected: VoidFunction;
  disconnected: VoidFunction;
  status: (status: RTCIceConnectionState) => void;
  // Signal and RTCIceCandidates
  signal: (description: RTCSessionDescriptionInit) => void;
  onicecandidates: (iceCandidates: RTCIceCandidate[]) => void;
  // MediaStreams
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
  /** Enable support for batching ICECandidates */
  batchCandidates?: boolean;
  /** Timeout in MS before emitting batched ICECandidates */
  batchCandidatesTimeout?: number;
  /** Peer name used when emitting errors */
  name?: string;
  /** RTCPeerConnection options */
  config?: RTCConfiguration;
  /** RTCOfferOptions options */
  offerOptions?: RTCOfferOptions;
  /** Enable support for RTCDataChannels */
  enableDataChannels?: boolean;
  /** Default RTCDataChannel label */
  channelLabel?: string;
  /** Default RTCDataChannel options */
  channelOptions?: RTCDataChannelInit;
  /** Function to transform offer/answer SDP */
  sdpTransform?: (sdp: string) => string;
}
