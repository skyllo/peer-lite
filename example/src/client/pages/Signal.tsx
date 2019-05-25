import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ChatBox from '../components/ChatBox';
import CamVideo from '../components/CamVideo';
import CamActions from '../components/CamActions';
import {
  usePeer, useSocket, useCreatePeer, useCreateSocket,
} from '../utils/hooks';
import Peer from '../../../../src/peer';

const SignalStyled = styled.div`
  display: grid;
  box-sizing: border-box;
  grid-template-columns: 300px 1fr 1fr;
  grid-template-rows: 1fr 40px;
  grid-gap: 20px;
  grid-template-areas:
    "chat remote local"
    "chat actions actions";

  .chat {
    grid-area: chat;
  }

  .remote {
    grid-area: remote;
  }

  .local {
    grid-area: local;
    padding-right: 20px;
  }

  .actions {
    grid-area: actions;
  }
`;

export default function Signal() {
  const [streamLocal, setStreamLocal] = useState<MediaStream>();
  const [streamRemote, setStreamRemote] = useState<MediaStream>();
  const peer = useCreatePeer();
  const socket = useCreateSocket();

  // socket handlers
  useSocket(socket, 'offer', async ({ offer }) => {
    console.log('socket <- offer()', offer);
    const answer = await peer.answer(offer);
    console.log('socket -> answer()', answer);
    socket.emit('answer', { answer });
  });

  useSocket(socket, 'onicecandidates', async ({ candidates }) => {
    console.log('socket <- onicecandidates()', candidates);
    const promises = candidates.map(async candidate => peer.addIceCandidate(candidate));
    await Promise.all(promises);
  });

  useSocket(socket, 'answer', async ({ answer }) => {
    console.log('socket <- answer()', answer);
    await peer.accept(answer);
  });

  // peer handlers
  usePeer(peer, 'onicecandidates', (candidates) => {
    console.log('peer - onicecandidates()', candidates);
    socket.emit('onicecandidates', { candidates });
  });

  usePeer(peer, 'disconnected', async () => {
    console.log('peer - hangup()');
    await peer.hangup();
  });

  usePeer(peer, 'negotiation', async () => {
    console.log('peer - negotiation()');
    // create offer
    const offer = await peer.call();
    // send offer remotely
    socket.emit('offer', { offer });
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
      await peer.addStream(stream);
    })();
  }, []);

  return (
    <SignalStyled>
      <ChatBox className="chat" peer={peer} socket={socket} />
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
      <CamActions className="actions" peer={peer} socket={socket} />
    </SignalStyled>
  );
}
