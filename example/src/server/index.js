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
      console.log(`Sending ${name}`, user);
      io.to(user).emit(name, data);
    }
  });
}

io.on('connection', (socket) => {
  userIds.add(socket.id);
  console.log('Added new User', socket.id);

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    userIds.delete(socket.id);
  });

  socket.on('onicecandidates', (data) => {
    console.log('onicecandidates', socket.id);
    emit('onicecandidates', socket, data);
  });

  socket.on('answer', (data) => {
    console.log('answer', socket.id);
    emit('answer', socket, data);
  });

  socket.on('offer', (data) => {
    console.log('offer', socket.id);
    emit('offer', socket, data);
  });

  socket.on('accept', (data) => {
    console.log('accept', socket.id);
    emit('accept', socket, data);
  });
});

server.listen(9001);
