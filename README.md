# PeerLite

[![CircleCI](https://circleci.com/gh/skyllo/peer-lite.svg?style=svg&circle-token=cd1df6b2a763871eb9c52ec816a40e0ba0e9beeb)](https://circleci.com/gh/skyllo/peer-lite)

Lightweight WebRTC browser library that supports video, audio and data channels.

# Features
* Lightweight! 3kb (gzipped)
* Zero dependencies
* Ships with TypeScript definitions
* Uses modern WebRTC APIs
* ["Perfect negotiation"](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation) pattern
* Support for [renegotiation](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onnegotiationneeded) of connection
* ICE candidate batching

# Installation
```bash
yarn add peer-lite
```

# Usage
## Two peers connecting locally

```javascript
import Peer from 'peer-lite';

const peer1 = new Peer();
const peer2 = new Peer();

peer1.on('signal', async (description) => {
  await peer2.signal(description);
})

peer2.on('signal', async (description) => {
  await peer1.signal(description);
})

peer1.on('onicecandidates', async (candidates) => {
  const promises = candidates.map(async candidate => peer2.addIceCandidate(candidate));
  await Promise.all(promises);
});

peer2.on('onicecandidates', async (candidates) => {
  const promises = candidates.map(async candidate => peer1.addIceCandidate(candidate));
  await Promise.all(promises);
});

peer1.on('streamRemote', (stream) => {
  document.querySelector('#video1').srcObject = stream;
});

peer2.on('streamRemote', (stream) => {
  document.querySelector('#video2').srcObject = stream;
});

(async () => {
  const stream = await Peer.getUserMedia();
  peer1.addStream(stream);
  peer2.addStream(stream);
  peer1.start();
})();
```

## Peer connection with fake signalling server

```javascript
import Peer from 'peer-lite';

const peer = new Peer();
const fakeSocket = new Socket();

// Peer events

peer.on('signal', async (description) => {
  fakeSocket.emit('signal', description);
});

peer.on('onicecandidates', async (candidates) => {
  fakeSocket.emit('onicecandidates', candidates);
});

peer.on('streamLocal', (stream) => {
  document.querySelector('#videoLocal').srcObject = stream;
});

peer.on('streamRemote', (stream) => {
  document.querySelector('#videoRemote').srcObject = stream;
});

// Socket events

fakeSocket.on('signal', async (description) => {
  await peer.signal(description);
});

fakeSocket.on('onicecandidates', async (candidates) => {
  const promises = candidates.map(async candidate => peer.addIceCandidate(candidate));
  await Promise.all(promises);
});

(async () => {
  const stream = await Peer.getUserMedia();
  peer.addStream(stream);
  peer.start();
})();
```

# Examples
See more examples [here](example) with signalling server.

# API
## Constructor
`new Peer(Options)`

## Peer Options
```typescript
interface PeerOptions {
  /** Enable support for batching ICECandidates */
  batchCandidates?: boolean;
  /** Timeout in MS before emitting batched ICECandidates */
  batchCandidatesTimeout?: number;
  /** Peer id used when emitting errors */
  id?: string;
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
```

## Peer API
```typescript
interface Peer {
  /** Create a peer instance */
  constructor(options?: PeerOptions);
  /** Initialize the peer */
  init(): RTCPeerConnection;
  /** Start the RTCPeerConnection signalling */
  start({ polite }?: {
      polite?: boolean | undefined;
  }): void;
  /** Process a RTCSessionDescriptionInit on peer */
  signal(description: RTCSessionDescriptionInit): Promise<void>;
  /** Add RTCIceCandidate to peer */
  addIceCandidate(candidate: RTCIceCandidate): Promise<void>;
  /** Send data to connected peer using an RTCDataChannel */
  send(data: string | Blob | ArrayBuffer | ArrayBufferView, label?: string): boolean;
  /** Add RTCDataChannel to peer */
  addDataChannel(label?: string, options?: RTCDataChannelInit): void;
  /** Get RTCDataChannel added to peer */
  getDataChannel(label?: string): RTCDataChannel | undefined;
  /** Close peer if active */
  destroy(): void;
  /** Return the ICEConnectionState of the peer */
  status(): RTCIceConnectionState;
  /** Return true if the peer is connected */
  isConnected(): boolean;
  /** Return true if the peer is closed */
  isClosed(): boolean;
  /** Return the RTCPeerConnection */
  get(): RTCPeerConnection;
  /** Return the local stream */
  getStreamLocal(): MediaStream;
  /** Add stream to peer */
  addStream(stream: MediaStream, replace?: boolean): void;
  /** Remove stream from peer */
  removeStream(stream: MediaStream): void;
  /** Add track to peer */
  addTrack(track: MediaStreamTrack): void;
  /** Remove track on peer */
  removeTrack(track: MediaStreamTrack): void;
  /** Remove tracks on peer */
  removeTracks(tracks: MediaStreamTrack[]): void;
  /** Replace track with another track on peer */
  replaceTrack(track: MediaStreamTrack, newTrack: MediaStreamTrack): Promise<void>;
  on<E extends keyof PeerEvents>(event: E, listener: PeerEvents[E]): TypedEmitter<PeerEvents>;
  off<E extends keyof PeerEvents>(event: E, listener: PeerEvents[E]): TypedEmitter<PeerEvents>;
  offAll<E extends keyof PeerEvents>(event?: E): TypedEmitter<PeerEvents>;
}
```

## Peer Events
```typescript
interface PeerEvents {
  error: (data: { id: string; message: string; error?: Error }) => void;
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
```

# Testing
The tests run inside a headless Chrome and Firefox with [Playwright](https://playwright.dev/)
and [@playwright/test](https://www.npmjs.com/package/@playwright/test).
These run quickly and allow testing of WebRTC APIs in real browsers.

**Run Tests (Chrome only)**
```bash
yarn test
```

**Run Tests (Chrome + Firefox)**
```bash
CI=true yarn test
```

# Similar Projects
* PeerJS: https://github.com/peers/peerjs
* Simple Peer: https://github.com/feross/simple-peer
* SimpleWebRTC: https://github.com/andyet/SimpleWebRTC
* More here: https://stackoverflow.com/questions/24857637/current-state-of-javascript-webrtc-libraries
