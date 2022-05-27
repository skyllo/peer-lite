import { FilterTracksFunc } from './types';

export function getDefaultCamConstraints(): MediaStreamConstraints {
  const audio = true;
  const videoObj: MediaTrackConstraints = {};
  const supported = navigator.mediaDevices.getSupportedConstraints();
  if (supported.facingMode) videoObj.facingMode = 'user';
  if (supported.frameRate) videoObj.frameRate = { max: 30 };
  const video = Object.keys(videoObj).length > 0 ? videoObj : true;
  return { audio, video };
}

export function randomHex(n: number) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function filterByTrack(track: MediaStreamTrack): FilterTracksFunc {
  return (existingTrack) => existingTrack === track;
}

export function removeTracks(stream: MediaStream, filterFunc: FilterTracksFunc) {
  stream
    .getTracks()
    .filter(filterFunc)
    .forEach((track) => {
      track.stop();
      stream.removeTrack(track);
    });
}

export function removeTracksFromPeer(peer: RTCPeerConnection, filterFunc: FilterTracksFunc) {
  peer
    .getSenders()
    .filter((sender) => sender.track && filterFunc(sender.track))
    .forEach((sender) => peer.removeTrack(sender));
}
