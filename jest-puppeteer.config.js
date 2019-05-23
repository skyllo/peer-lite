module.exports = {
  launch: {
    ignoreHTTPSErrors: true,
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream', // avoids the need to grant camera/microphone permissions
      '--use-fake-device-for-media-stream', // feeds a test pattern to getUserMedia() instead of live camera input
      '--no-sandbox', // disable Chrome's sandbox as we trust the content
      '--disable-setuid-sandbox', // disable Linux SUID sandbox
    ],
  },
  server: {
    command: 'node test/__setup__/server.js',
    port: 3077,
  },
};
