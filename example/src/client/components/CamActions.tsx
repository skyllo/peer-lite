import React, { useState } from 'react';
import styled from 'styled-components';
import { Socket } from 'socket.io-client';
import { usePeer } from '../utils/hooks';
import Peer from '../../../../src/peer';

const CamActionsStyled = styled.div`
  display: flex;
  flex-direction: row;
  margin: 0 auto;
  width: fit-content;
  padding: 5px;

  .button {
    width: 10em;
  }
`;

interface Props {
  className?: string;
  peer: Peer;
  socket: Socket;
}

export default function CamActions(props: Props) {
  const { className, peer, socket } = props;
  const [connected, setConnected] = useState(false);

  // peer handlers
  usePeer(peer, 'connected', () => {
    setConnected(true);
  });

  usePeer(peer, 'disconnected', () => {
    setConnected(false);
  });

  async function call() {
    // create offer
    const offer = await peer.call();
    // send offer remotely
    socket.emit('offer', { offer });
  }

  function hangup() {
    peer.hangup();
  }

  return (
    <CamActionsStyled className={className}>
      <button className="button" type="danger" onClick={hangup}>Hang Up</button>
      <button className="button" type="primary" onClick={call}>Call</button>
    </CamActionsStyled>
  );
}
