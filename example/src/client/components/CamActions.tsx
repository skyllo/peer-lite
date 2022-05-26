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

  function destroy() {
    peer.destroy();
  }

  async function shareScreen() {
    const screenStream = await navigator.mediaDevices.getDisplayMedia();
    peer.addStream(screenStream);
  }

  function start() {
    peer.destroy();
    peer.start();
  }

  return (
    <CamActionsStyled className={className}>
      <button className="button" type="button" onClick={destroy}>
        Hang Up
      </button>
      <button className="button" type="button" onClick={shareScreen}>
        Share Screen
      </button>
      <button className="button" type="button" onClick={start}>
        Start
      </button>
    </CamActionsStyled>
  );
}
