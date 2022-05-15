# PeerLite

[![CircleCI](https://circleci.com/gh/skyllo/peer-lite.svg?style=svg&circle-token=cd1df6b2a763871eb9c52ec816a40e0ba0e9beeb)](https://circleci.com/gh/skyllo/peer-lite)

Lightweight WebRTC browser library that supports video, audio and data channels - written in TypeScript.

# Features
* Lightweight! 6kb in size (2kb gzip)
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
Example of two peers connecting to each other locally, see more examples [here](example).

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

# API
## Constructor
`new Peer(Options)`

### Options
Typescript Options Definition

```typescript
export interface PeerOptions {
  batchCandidates?: boolean;
  batchCandidatesTimeout?: number;
  enableDataChannels?: boolean;
  name?: string;
  config?: RTCConfiguration;
  constraints?: MediaStreamConstraints;
  offerOptions?: RTCOfferOptions;
  answerOptions?: RTCAnswerOptions;
  channelName?: string;
  channelOptions?: RTCDataChannelInit;
  sdpTransform?: (sdp: string) => string;
}
```

# Testing
The tests run inside a headless Chrome with [Playwright](https://playwright.dev/)
using [@playwright/test](https://www.npmjs.com/package/@playwright/test) with [Jest](https://jestjs.io/).
These run quickly and allow testing of real WebRTC APIs in a real browser.

```bash
yarn test
```

# Similar Projects
* PeerJS: https://github.com/peers/peerjs
* Simple Peer: https://github.com/feross/simple-peer
* SimpleWebRTC: https://github.com/andyet/SimpleWebRTC
* More here: https://stackoverflow.com/questions/24857637/current-state-of-javascript-webrtc-libraries
