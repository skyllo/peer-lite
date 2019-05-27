# PeerLite

[![CircleCI](https://circleci.com/gh/skyllo/peer-lite.svg?style=svg&circle-token=cd1df6b2a763871eb9c52ec816a40e0ba0e9beeb)](https://circleci.com/gh/skyllo/peer-lite)

Lightweight WebRTC browser library that supports video, audio and data channels - written in TypeScript.

# Features
* Lightweight! 6kb in size (2kb gzip)
* Using modern WebRTC APIs (no deprecations)
* Support for [renegotiation](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onnegotiationneeded) of streams
* Tested on latest Safari, Firefox, Chrome on MacOS (recommend to use this [shim](https://github.com/webrtc/adapter) for better support)
* Gathering of ICE candidates is trickle only (most browsers now support trickle ICE, Chrome even has a bug that prevents you from checking support for it https://bugs.chromium.org/p/chromium/issues/detail?id=708484)

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
  // start and set local stream
  const stream = await Peer.getUserMedia();
  await peer1.addStream(stream)
  await peer2.addStream(stream);
  // handshake
  const offer = await peer1.call();
  const answer = await peer2.answer(offer);
  await peer1.accept(answer);
})();
```

# API
## Constructor
`new Peer(Options)`

### Options
Typescript Options Definition

```typescript
interface Options {
  batchCandidates?: boolean;
  batchCandidatesTimeout?: number;
  config?: RTCConfiguration;
  constraints?: MediaStreamConstraints;
  offerOptions?: RTCOfferOptions;
  answerOptions?: RTCAnswerOptions;
  channelName?: string;
  channelOptions?: RTCDataChannelInit;
  sdpTransform?: (sdp: string) => string;
}
```

### Static Methods
Use static helper method `getUserMedia()` to get a local video and audio stream with some default configuration.

```javascript
const peer = new Peer();

peer.on('streamLocal', (streamLocal) => {
  console.log(streamLocal);
});

(async () => {
  const stream = await Peer.getUserMedia();
  await peer.addStream(stream);
})();
```

# Testing
The tests run inside a headless Chrome with [puppeteer](https://github.com/GoogleChrome/puppeteer)
using [jest-puppeteer](https://github.com/smooth-code/jest-puppeteer) to integrate with [Jest](https://jestjs.io/).
These run pretty quickly and allow testing of real WebRTC APIs in a real browser.

```javascript
yarn test
```

# Similar Projects
* PeerJS: https://github.com/peers/peerjs
* Simple Peer: https://github.com/feross/simple-peer
* SimpleWebRTC: https://github.com/andyet/SimpleWebRTC
* More here: https://stackoverflow.com/questions/24857637/current-state-of-javascript-webrtc-libraries
