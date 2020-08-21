export function getDefaultCamConstraints(): MediaStreamConstraints {
  const audio = true;
  const videoObj: MediaTrackConstraints = {};
  const supported = navigator.mediaDevices.getSupportedConstraints();
  if (supported.facingMode) videoObj.facingMode = 'user';
  if (supported.frameRate) videoObj.frameRate = { max: 30 };
  const video = Object.keys(videoObj).length > 0 ? videoObj : true;
  return { audio, video };
}

function getTracks(stream: MediaStream, video: boolean, audio: boolean): MediaStreamTrack[] {
  return [
    ...(video && stream.getVideoTracks()),
    ...(audio && stream.getAudioTracks()),
  ];
}

function removeTrack(stream: MediaStream, track: MediaStreamTrack) {
  track.stop();
  stream.removeTrack(track);
}

export function removeTracks(stream: MediaStream, video: boolean, audio: boolean) {
  const tracks = getTracks(stream, video, audio);
  tracks.forEach((track) => removeTrack(stream, track));
}

export function removeTracksFromPeer(peerConn: RTCPeerConnection, video: boolean, audio: boolean) {
  peerConn.getSenders().forEach((sender) => {
    if (!sender.track) return;
    const isVideo = video && sender.track.kind === 'video';
    const isAudio = audio && sender.track.kind === 'audio';
    if (isVideo || isAudio) {
      peerConn.removeTrack(sender);
    }
  });
}

export function setTracksEnabled(
  stream: MediaStream, video: boolean, audio: boolean, enabled: boolean,
) {
  const tracks = getTracks(stream, video, audio);
  // eslint-disable-next-line
  tracks.forEach(track => track.enabled = enabled);
}
