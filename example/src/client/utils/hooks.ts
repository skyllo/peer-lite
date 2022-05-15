import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import Peer, { PeerEvents, PeerOptions } from '../../../../src';
import { createSocket } from './socket';

export function useCreatePeer(options: PeerOptions = {}): Peer {
  const peerRef = useRef<Peer>();

  if (!peerRef.current) {
    peerRef.current = new Peer(options);
  }

  useEffect(
    () => () => {
      peerRef.current.destroy();
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

export function useCreateSocket(): Socket {
  const socketRef = useRef<Socket>();

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

export function useSocket(
  socket: Socket,
  eventName: 'signal' | 'onicecandidates' | 'disconnected' | 'connect_error' | 'error',
  func: (params: { description: any; candidates: any }) => void
) {
  useEffect(() => {
    socket.on(eventName, func);
    return () => {
      socket.off(eventName, func);
    };
  }, []);
}
