import React, { useState } from 'react';
import styled from 'styled-components';
import { Socket } from 'socket.io-client';
import ChatMessages from './ChatMessages';
import Peer from '../../../../src/peer';

const ChatBoxStyled = styled.div`
  display: flex;
  flex-direction: column;
  border: 2px solid darkgray;
  border-radius: 4px;
  width: 100%;
  max-height: 100%;
  transition: opacity 200ms linear;

  .messages {
    flex-grow: 1;
  }

  .input {
    display: flex;
    flex-direction: row;
    flex-shrink: 0;
    margin-top: 5px;

    textarea {
      border: 4px solid darkgray;
      border-radius: 4px;
    }
  }

  textarea {
    font-family: "Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","微软雅黑",Arial,sans-serif;
    font-size: 15px;
    width: 100%;
  }
`;

interface Props {
  className?: string;
  peer: Peer;
  socket: Socket;
}

export default function ChatBox(props: Props) {
  const { className, peer, socket } = props;
  const [messageToSend, setMessageToSend] = useState('');

  function send() {
    const isSuccess = peer.send(messageToSend);
    if (isSuccess) {
      setMessageToSend('');
    }
  }

  function handleKeyPress(event) {
    if ((event.which === 13 || event.keyCode === 13) && !event.shiftKey) {
      send();
      event.preventDefault();
    }
  }

  function handleChange(event) {
    setMessageToSend(event.target.value);
  }

  return (
    <ChatBoxStyled className={className}>
      <ChatMessages className="messages" peer={peer} socket={socket} />

      <div className="input">
        <textarea
          rows={1}
          value={messageToSend}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
        />
      </div>
    </ChatBoxStyled>
  );
}
