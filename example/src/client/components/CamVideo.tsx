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
  stream: MediaStream | null;
}

export default function CamVideo(props: Props) {
  const { className = '', id, muted, stream } = props;
  const videoRef = useRef<HTMLVideoElement>();

  useEffect(() => {
    const wrapper = document.getElementById(id);
    const videoElement = document.createElement('video');
    videoElement.setAttribute('autoplay', '');
    wrapper?.appendChild(videoElement);
    videoRef.current = videoElement;
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      // set video stream
      videoEl.srcObject = stream;
      // hack for iOS 11
      videoEl.setAttribute('playsinline', 'true');
    }
  }, [stream]);

  return <StyledCamVideo className={className} id={id} />;
}
