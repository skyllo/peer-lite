import Peer, { PeerOptions } from '../src';

declare global {
  interface Window {
    Peer: typeof Peer;
  }
}

export async function getPeer(options: PeerOptions = {}) {
  const peer: Peer = new window.Peer(options);
  peer.on('error', (err) => {
    throw new Error(err.toString());
  });
  return peer;
}

export async function setupPeers(peer1: Peer, peer2: Peer, stream: MediaStream) {
  peer1.on('signal', (description) => {
    peer2.signal(description);
  });

  peer2.on('signal', (description) => {
    peer1.signal(description);
  });

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

  await peer1.addStream(stream);
  await peer2.addStream(stream);
}
