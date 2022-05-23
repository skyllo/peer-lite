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

export const filterTracksAV =
  (video: boolean, audio: boolean): FilterTracksFunc =>
  (track) => {
    const isVideo = video && track?.kind === 'video';
    const isAudio = audio && track?.kind === 'audio';
    return isVideo || isAudio;
  };

function getTracks(stream: MediaStream, filterFunc: FilterTracksFunc) {
  return stream.getTracks().filter(filterFunc);
}

function removeTrack(stream: MediaStream, track: MediaStreamTrack) {
  track.stop();
  stream.removeTrack(track);
}

export function removeTracks(stream: MediaStream, filterFunc: FilterTracksFunc) {
  getTracks(stream, filterFunc).forEach((track) => removeTrack(stream, track));
}

export function removeTracksFromPeer(peerConn: RTCPeerConnection, filterFunc: FilterTracksFunc) {
  peerConn
    .getSenders()
    .filter((sender) => filterFunc(sender.track))
    .forEach((sender) => peerConn.removeTrack(sender));
}

export function setTracksEnabled(
  stream: MediaStream,
  filterFunc: FilterTracksFunc,
  enabled: boolean
) {
  getTracks(stream, filterFunc).forEach((track) => {
    // eslint-disable-next-line no-param-reassign
    track.enabled = enabled;
  });
}
