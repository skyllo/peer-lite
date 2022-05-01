import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import Peer, { PeerEvents } from '../../../../src';
import { createSocket } from './socket';

export function useCreatePeer(): Peer {
  const peerRef = useRef<Peer>();

  if (!peerRef.current) {
    peerRef.current = new Peer();
  }

  useEffect(
    () => () => {
      peerRef.current.hangup();
    },
    []
  );

  return peerRef.current;
}

export function usePeer<E extends keyof PeerEvents>(peer: Peer, eventName: E, func: PeerEvents[E]) {
  useEffect(() => {
    peer.on(eventName, func);
    return () => {
      peer.off(eventName, func);
    };
  }, []);
}

export function useCreateSocket(): typeof Socket {
  const socketRef = useRef<typeof Socket>();

  if (!socketRef.current) {
    socketRef.current = createSocket();
  }

  useEffect(
    () => () => {
      socketRef.current.disconnect();
    },
    []
  );

  return socketRef.current;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function useSocket(socket: typeof Socket, eventName: string, func: Function) {
  useEffect(() => {
    socket.on(eventName, func);
    return () => {
      socket.removeListener(eventName, func);
    };
  }, []);
}
