import React, { useEffect, useRef, useReducer } from 'react';
import styled from 'styled-components';
import { Socket } from 'socket.io-client';
import Peer from '../../../../src';
import { useSocket, usePeer } from '../utils/hooks';

const ChatMessagesStyled = styled.div`
  padding: 10px;
  overflow-y: auto;

  > * {
    word-break: break-all;
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .message {
    &--you {
      color: black;
    }

    &--partner {
      color: hotpink;
    }

    &--error {
      color: red;
    }
  }
`;

interface Message {
  message: string;
  from: string;
  time: number;
}

interface Props {
  className?: string;
  peer: Peer;
  socket: typeof Socket;
}

export default function ChatMessages(props: Props) {
  const { className, peer, socket } = props;
  const myRef = useRef<HTMLDivElement>();
  const [messages, dispatchMessage] = useReducer(
    (state: Message[], action: { message: Message; type: string }) => {
      switch (action.type) {
        case 'add':
          return [...state, action.message];
        case 'clear':
          return [];
        default:
          return state;
      }
    },
    []
  );

  useEffect(() => {
    const elem = myRef.current;
    elem.scrollTop = elem.scrollHeight;
  }, [myRef, messages.length]);

  function addMessage(message: string, from: string) {
    const msgObj = { message, from, time: Date.now() };
    dispatchMessage({ type: 'add', message: msgObj });
  }

  // socket handlers
  useSocket(socket, 'connect_error', (err) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    addMessage(`WebSocket - ${err.message}`, 'error');
  });

  useSocket(socket, 'error', (err) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    addMessage(`WebSocket - ${err.message}`, 'error');
  });

  // peer handlers
  usePeer(peer, 'connecting', () => {
    addMessage('Connecting...', 'you');
  });

  usePeer(peer, 'connected', () => {
    addMessage('Connected!', 'you');
  });

  usePeer(peer, 'disconnected', () => {
    addMessage('Disconnected.', 'you');
  });

  usePeer(peer, 'channelData', ({ data, source }) => {
    const clazz = source === 'outgoing' ? 'you' : 'partner';
    addMessage(data.toString(), clazz);
  });

  usePeer(peer, 'error', ({ name, error }) => {
    addMessage(`${name} - ${error.message}`, 'error');
  });

  return (
    <ChatMessagesStyled className={className} ref={myRef}>
      <h2>Messages</h2>

      {messages.map((msg) => (
        <div className={`message message--${msg.from}`} key={msg.time}>
          {`[${msg.from}]: ${msg.message}`}
        </div>
      ))}
    </ChatMessagesStyled>
  );
}
