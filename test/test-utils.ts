import Peer from '../src';

declare global {
  interface Window { Peer }
}

export async function getPeer() {
  const peer: Peer = new window.Peer();
  peer.on('error', (err) => {
    throw new Error(err.toString());
  });
  return peer;
}

export async function handshake(peer1: Peer, peer2: Peer) {
  const offer = await peer1.call();
  const answer = await peer2.answer(offer);
  await peer1.accept(answer);
}

export async function connectPeers(peer1: Peer, peer2: Peer, stream: MediaStream) {
  peer1.on('onicecandidates', async (candidates) => {
    const promises = candidates.map(async (candidate) => peer2.addIceCandidate(candidate));
    await Promise.all(promises);
  });

  peer2.on('onicecandidates', async (candidates) => {
    const promises = candidates.map(async (candidate) => peer1.addIceCandidate(candidate));
    await Promise.all(promises);
  });

  peer1.on('streamRemote', (remoteStream) => {
    document.querySelector<HTMLVideoElement>('#video1').srcObject = remoteStream;
  });

  peer2.on('streamRemote', (remoteStream) => {
    document.querySelector<HTMLVideoElement>('#video2').srcObject = remoteStream;
  });

  // start local streams
  await peer1.addStream(stream);
  await peer2.addStream(stream);

  // do call, answer and accept
  await handshake(peer1, peer2);
}
