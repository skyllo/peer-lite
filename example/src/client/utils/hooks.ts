import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import Peer from '../../../../src/peer';
import { createSocket } from './socket';

export function useCreatePeer(): Peer {
  const peerRef = useRef<Peer>();

  if (!peerRef.current) {
    peerRef.current = new Peer();
  }

  useEffect(() => () => {
    peerRef.current.hangup();
  }, []);

  return peerRef.current;
}

export function usePeer(peer: Peer, eventName: string, func: Function) {
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

  useEffect(() => () => {
    socketRef.current.disconnect();
  }, []);

  return socketRef.current;
}

export function useSocket(socket: typeof Socket, eventName: string, func: Function) {
  useEffect(() => {
    socket.on(eventName, func);
    return () => {
      socket.removeListener(eventName, func);
    };
  }, []);
}
