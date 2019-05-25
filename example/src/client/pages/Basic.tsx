import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import CamVideo from '../components/CamVideo';
import Peer from '../../../../src/peer';
import { useCreatePeer, usePeer } from '../utils/hooks';

const BasicStyled = styled.div`
  display: grid;
  box-sizing: border-box;
  grid-template-columns: 1fr 1fr;
  grid-gap: 20px;
  grid-template-areas:
    "remote local";

  padding: 20px;

  .remote {
    grid-area: remote;
  }

  .local {
    grid-area: local;
  }
`;

export default function Basic() {
  const [streamLocal, setStreamLocal] = useState<MediaStream>();
  const [streamRemote, setStreamRemote] = useState<MediaStream>();
  const peer1 = useCreatePeer();
  const peer2 = useCreatePeer();

  usePeer(peer1, 'onicecandidates', async (candidates) => {
    const promises = candidates.map(async candidate => peer2.addIceCandidate(candidate));
    await Promise.all(promises);
  });

  usePeer(peer2, 'onicecandidates', async (candidates) => {
    const promises = candidates.map(async candidate => peer1.addIceCandidate(candidate));
    await Promise.all(promises);
  });

  usePeer(peer1, 'streamRemote', (remoteStream) => {
    setStreamRemote(remoteStream);
  });

  usePeer(peer2, 'streamRemote', (remoteStream) => {
    setStreamLocal(remoteStream);
  });

  useEffect(() => {
    (async () => {
      const stream = await Peer.getUserMedia();

      // start local streams
      await peer1.addStream(stream);
      await peer2.addStream(stream);

      // do call, answer and accept
      const offer = await peer1.call();
      const answer = await peer2.answer(offer);
      await peer1.accept(answer);
    })();
  }, []);

  return (
    <BasicStyled>
      <CamVideo
        className="remote"
        id="remoteVideo"
        muted={false}
        stream={streamRemote}
      />
      <CamVideo
        className="local"
        id="localVideo"
        muted
        stream={streamLocal}
      />
    </BasicStyled>
  );
}
