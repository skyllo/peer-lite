import React from 'react';
import styled from 'styled-components';
import Peer from '../../../../src';

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
}

export default function CamActions(props: Props) {
  const { className, peer } = props;

  function call() {
    peer.destroy();
    // create offer
    peer.start();
  }

  function hangup() {
    peer.destroy();
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
