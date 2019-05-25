import styled from 'styled-components';
import React, { useEffect, useRef } from 'react';

const StyledCamVideo = styled.div`
  align-items: center;
  display: flex;

  video {
    display: inline-block;
    width: 100%;
    max-height: 100%;
  }
`;

interface Props {
  id: string;
  className?: string;
  muted: boolean;
  stream: MediaStream;
}

export default function CamVideo(props: Props) {
  const {
    className, id, muted, stream,
  } = props;
  const videoRef = useRef(null);

  useEffect(() => {
    const wrapper = document.getElementById(id);
    const videoElement = document.createElement('video');
    videoElement.setAttribute('autoplay', '');
    wrapper.appendChild(videoElement);
    videoRef.current = videoElement;
  }, []);

  useEffect(() => {
    videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    // @ts-ignore
    const videoEl: HTMLVideoElement = videoRef.current;
    if (videoEl) {
      // set video stream
      videoEl.srcObject = stream;
      // hack for iOS 11
      videoEl.setAttribute('playsinline', 'true');
    }
  }, [stream]);

  return (
    <StyledCamVideo className={className} id={id} />
  );
}
