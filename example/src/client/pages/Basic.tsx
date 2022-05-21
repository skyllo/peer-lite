import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import Peer from '../../../../src';
import CamVideo from '../components/CamVideo';
import { useCreatePeer, usePeer } from '../utils/hooks';

const BasicStyled = styled.div`
  display: grid;
  box-sizing: border-box;
  grid-template-columns: 1fr 1fr;
  grid-gap: 20px;
  grid-template-areas: 'remote local';

  padding: 20px;

  .remote {
    grid-area: remote;
  }

  .local {
    grid-area: local;
  }
`;

export default function Basic() {
  const [streamLocal, setStreamLocal] = useState<MediaStream | null>(null);
  const [streamRemote, setStreamRemote] = useState<MediaStream | null>(null);
  const peer1 = useCreatePeer();
  const peer2 = useCreatePeer();

  usePeer(peer1, 'onicecandidates', async (candidates) => {
    const promises = candidates.map(async (candidate) => peer2.addIceCandidate(candidate));
    await Promise.all(promises);
  });

  usePeer(peer2, 'onicecandidates', async (candidates) => {
    const promises = candidates.map(async (candidate) => peer1.addIceCandidate(candidate));
    await Promise.all(promises);
  });

  usePeer(peer1, 'signal', async (description) => {
    await peer2.signal(description);
  });

  usePeer(peer2, 'signal', async (description) => {
    await peer1.signal(description);
  });

  usePeer(peer1, 'streamRemote', (remoteStream) => {
    setStreamRemote(remoteStream);
  });

  usePeer(peer2, 'streamRemote', (remoteStream) => {
    setStreamLocal(remoteStream);
  });

  const start = useCallback(async () => {
    const stream = await Peer.getUserMedia();

    // start local streams
    peer1.addStream(stream);
    peer2.addStream(stream);

    // do call, answer and accept
    peer1.start();
  }, []);

  useEffect(() => {
    start().catch((err) => console.log(err));
  }, []);

  return (
    <BasicStyled>
      <CamVideo className="remote" id="remoteVideo" muted={false} stream={streamRemote} />
      <CamVideo className="local" id="localVideo" muted stream={streamLocal} />
    </BasicStyled>
  );
}
