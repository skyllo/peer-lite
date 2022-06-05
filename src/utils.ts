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

export function getSenderForTrack(peer: RTCPeerConnection, track: MediaStreamTrack) {
  return peer.getSenders().filter((sender) => sender.track === track)[0];
}

export function removeTrack(stream: MediaStream, trackToRemove: MediaStreamTrack) {
  stream
    .getTracks()
    .filter((track) => track === trackToRemove)
    .forEach((track) => {
      track.stop();
      stream.removeTrack(track);
    });
}
