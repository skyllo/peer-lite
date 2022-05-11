const fs = require('fs');
const https = require('https');
const socketIO = require('socket.io');

const key = fs.readFileSync('certs/key.pem');
const cert = fs.readFileSync('certs/cert.pem');

const options = {
  key,
  cert,
  requestCert: false,
  rejectUnauthorized: false,
};

const server = https.createServer(options);
const io = socketIO(server);
const userIds = new Set();

function emit(name, socket, data) {
  userIds.forEach((user) => {
    if (user !== socket.id) {
      console.log(`Sending ${name} -> ${user}`);
      io.to(user).emit(name, data);
    }
  });
}

io.on('connection', (socket) => {
  userIds.add(socket.id);
  console.log('Added User', socket.id);

  socket.on('disconnect', () => {
    console.log('Disconnect User', socket.id);
    userIds.delete(socket.id);
  });

  socket.on('onicecandidates', (data) => {
    emit('onicecandidates', socket, data);
  });

  socket.on('signal', (data) => {
    emit('signal', socket, data);
  });
});

server.listen(9001);
