import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Peer from '../../../../src';
import ChatBox from '../components/ChatBox';
import CamVideo from '../components/CamVideo';
import CamActions from '../components/CamActions';
import { usePeer, useSocket, useCreatePeer, useCreateSocket } from '../utils/hooks';

const SignalStyled = styled.div`
  display: grid;
  box-sizing: border-box;
  grid-template-columns: 250px 1fr 1fr;
  grid-template-rows: 1fr 40px;
  grid-gap: 20px;
  grid-template-areas:
    'chat remote local'
    'chat actions actions';

  padding-right: 20px;

  .chat {
    grid-area: chat;
  }

  .remote {
    grid-area: remote;
  }

  .local {
    grid-area: local;
  }

  .actions {
    grid-area: actions;
  }
`;

export default function Signal() {
  const [streamLocal, setStreamLocal] = useState<MediaStream | null>(null);
  const [streamRemote, setStreamRemote] = useState<MediaStream | null>(null);
  const peer = useCreatePeer({ enableDataChannels: true, channelName: 'messages' });
  const socket = useCreateSocket();

  // socket handlers
  useSocket(socket, 'onicecandidates', async ({ candidates }) => {
    // eslint-disable-next-line
    const promises = candidates.map(async (candidate) => peer.addIceCandidate(candidate));
    await Promise.all(promises);
  });

  useSocket(socket, 'signal', async ({ description }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (description.type === 'offer') {
      peer.destroy();
    }
    await peer.signal(description);
  });

  // peer handlers
  usePeer(peer, 'onicecandidates', (candidates) => {
    socket.emit('onicecandidates', { candidates });
  });

  usePeer(peer, 'signal', (description) => {
    socket.emit('signal', { description });
  });

  usePeer(peer, 'streamRemote', (remoteStream) => {
    setStreamRemote(remoteStream);
  });

  usePeer(peer, 'streamLocal', (localStream) => {
    setStreamLocal(localStream);
  });

  useEffect(() => {
    (async () => {
      const stream = await Peer.getUserMedia();
      peer.addStream(stream);
    })();
  }, []);

  return (
    <SignalStyled>
      <ChatBox className="chat" peer={peer} socket={socket} />
      <CamVideo className="remote" id="remoteVideo" muted={false} stream={streamRemote} />
      <CamVideo className="local" id="localVideo" muted stream={streamLocal} />
      <CamActions className="actions" peer={peer} />
    </SignalStyled>
  );
}
