/* eslint-disable @typescript-eslint/no-var-requires */
const https = require('https');
const fs = require('fs');

const port = 3077;

const options = {
  key: fs.readFileSync('./test/__setup__/certs/key.pem'),
  cert: fs.readFileSync('./test/__setup__/certs/cert.pem'),
  requestCert: false,
  rejectUnauthorized: false,
};

const server = https.createServer(options, (req, res) => {
  fs.readFile(`${__dirname}/index.html`, (err, data) => {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': data.length });
    res.write(data);
    res.end();
  });
});

server.listen(port, (err) => {
  if (err) {
    console.error('error starting server', err);
    throw err;
  }
  console.log(`server is listening on ${port}`);
});
