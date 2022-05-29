# PeerLite

[![CircleCI](https://circleci.com/gh/skyllo/peer-lite.svg?style=svg&circle-token=cd1df6b2a763871eb9c52ec816a40e0ba0e9beeb)](https://circleci.com/gh/skyllo/peer-lite)

Lightweight WebRTC browser library that supports video, audio and data channels.

# Features
* Lightweight! 3kb (gzipped)
* Zero dependencies
* Using modern WebRTC APIs with TypeScript Types
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

### Peer Options

```typescript
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
```

### Peer Events
```typescript
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
```

# Testing
The tests run inside a headless Chrome and Firefox with [Playwright](https://playwright.dev/)
and [@playwright/test](https://www.npmjs.com/package/@playwright/test).
These run quickly and allow testing of WebRTC APIs in real browsers.

Run Tests (Chrome only)
```bash
yarn test
```

Run Tests (Chrome + Firefox)
```bash
CI=true yarn test
```

# Similar Projects
* PeerJS: https://github.com/peers/peerjs
* Simple Peer: https://github.com/feross/simple-peer
* SimpleWebRTC: https://github.com/andyet/SimpleWebRTC
* More here: https://stackoverflow.com/questions/24857637/current-state-of-javascript-webrtc-libraries
