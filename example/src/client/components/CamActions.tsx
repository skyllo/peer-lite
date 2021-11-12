import React from 'react';
import styled from 'styled-components';
import { Socket } from 'socket.io-client';
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
  socket: typeof Socket;
}

export default function CamActions(props: Props) {
  const { className, peer, socket } = props;

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
      <button className="button" type="button" onClick={hangup}>
        Hang Up
      </button>
      <button className="button" type="button" onClick={call}>
        Call
      </button>
    </CamActionsStyled>
  );
}
