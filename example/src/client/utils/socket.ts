import io from 'socket.io-client';

// eslint-disable-next-line import/prefer-default-export
export function createSocket() {
  const socket = io(`https://${window.location.hostname}:9001`, {
    transports: ['websocket'],
  });

  socket.on('reconnect_attempt', () => {
    socket.io.opts.transports = ['polling', 'websocket'];
  });

  return socket;
}
