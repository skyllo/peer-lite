/* eslint-disable no-async-promise-executor */
import { test, expect } from '@playwright/test';
import { rollup, RollupOptions } from 'rollup';
import rollupConfig from '../build/rollup.config';
import * as TestUtils from './test-utils';

const { setupPeers, getPeer } = TestUtils;

process.env.BUILD = 'development';

const config: RollupOptions = {
  ...rollupConfig,
  output: rollupConfig.output,
};

test.beforeEach(async ({ page }) => {
  if (!Array.isArray(config.output)) return;
  // generate code from rollup
  const bundle = await rollup(config);
  const { output } = await bundle.generate(config.output?.[0]);
  const [{ code }] = output;
  // goto localhost
  await page.goto('https://localhost:3077');
  // evaluate generated code
  await page.evaluate(code);
  // add test utils functions to page
  await page.addScriptTag({ content: `${setupPeers.toString()} ${getPeer.toString()}` });
  // add page error listener
  page.on('pageerror', (err) => {
    console.log(err);
  });
  // add console log listener
  page.on('console', (msg) => {
    console.log(
      msg
        .args()
        .map((i) => i.toString().replace('JSHandle:', ''))
        .join(' ')
    );
  });
});

test('should emit the local stream', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = getPeer();
        const stream = await window.Peer.getUserMedia();

        peer1.on('streamLocal', (localStream) => {
          if (localStream) {
            resolve();
          } else {
            reject();
          }
        });

        peer1.addStream(stream);
      })
  );
});

test('should set the local stream and be active', async ({ page }) => {
  const isStreamLocalActive = await page.evaluate(async () => {
    const stream = await window.Peer.getUserMedia();
    const peer = getPeer();
    peer.addStream(stream);
    return peer.getStreamLocal().active;
  });

  expect(isStreamLocalActive).toEqual(true);
});

test('should start peer if called twice afters listeners added', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve) => {
        const peer1 = getPeer({ name: 'peer1' });
        const peer2 = getPeer({ name: 'peer2' });

        peer1.start();
        peer2.start({ polite: false });

        const stream = await window.Peer.getUserMedia();

        peer1.on('connected', () => {
          resolve();
        });

        setupPeers(peer1, peer2, stream);
        peer1.start();
        peer2.start({ polite: false });
      })
  );
});

test('should remove tracks from local stream peer', async ({ page }) => {
  const isNoTracks = await page.evaluate(async () => {
    const stream = await window.Peer.getUserMedia();
    const peer = getPeer();
    peer.addStream(stream);
    peer.removeTrack(stream.getVideoTracks()[0]);
    peer.removeTrack(stream.getAudioTracks()[0]);
    return peer.getStreamLocal().getTracks().length === 0;
  });

  expect(isNoTracks).toEqual(true);
});

test('should not reset a new connection', async ({ page }) => {
  const isEqual = await page.evaluate(() => {
    const peer = getPeer();
    peer.init();
    const p1 = peer.get();
    peer.init();
    const p2 = peer.get();
    return p1 === p2;
  });

  expect(isEqual).toEqual(true);
});

test('should reset a destroyed connection', async ({ page }) => {
  const isEqual = await page.evaluate(() => {
    const peer = getPeer();
    const p1 = peer.get();
    peer.destroy();
    peer.init();
    const p2 = peer.get();
    return p1 !== p2;
  });

  expect(isEqual).toEqual(true);
});

test('should emit both peers remote streams', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve) => {
        const peer1 = getPeer({ name: 'peer1' });
        const peer2 = getPeer({ name: 'peer2' });

        const stream = await window.Peer.getUserMedia();

        let remoteCount = 0;
        peer1.on('streamRemote', () => {
          remoteCount += 1;
          if (remoteCount === 4) resolve();
        });

        peer2.on('streamRemote', () => {
          remoteCount += 1;
          if (remoteCount === 4) resolve();
        });

        setupPeers(peer1, peer2, stream);
        peer1.start();
      })
  );
});

test('should replace track on peer', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = getPeer({ name: 'peer1' });
        const peer2 = getPeer({ name: 'peer2' });

        const stream = await window.Peer.getUserMedia();
        const stream2 = await window.Peer.getUserMedia();

        let remoteCount = 0;
        peer1.on('streamRemote', async () => {
          remoteCount += 1;
          if (remoteCount === 1) {
            const [oldTrack] = stream.getVideoTracks();
            const [newTrack] = stream2.getVideoTracks();
            if (oldTrack) {
              try {
                await peer1.replaceTrack(oldTrack, newTrack);
                const [hasSender] = peer1
                  .get()
                  .getSenders()
                  .filter((sender) => sender.track === newTrack);
                const numSenders = peer1.get().getSenders().length;
                const numTracks = peer1.getStreamLocal().getTracks().length;
                if (hasSender && numSenders === 2 && numTracks === 2) {
                  resolve();
                } else {
                  reject();
                }
              } catch (err) {
                reject(err);
              }
            }
          }
        });

        setupPeers(peer1, peer2, stream);
        peer1.start();
      })
  );
});

test('should fail to replace track on peer', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = getPeer({ name: 'peer1' });
        const peer2 = getPeer({ name: 'peer2' });

        const stream = await window.Peer.getUserMedia();

        let remoteCount = 0;
        peer1.on('streamRemote', async () => {
          remoteCount += 1;
          if (remoteCount === 1) {
            const [oldTrack] = stream.getVideoTracks();
            const [newTrack] = peer1
              .get()
              .getSenders()
              .map((sender) => sender.track)
              .filter((track) => track?.kind === 'audio');
            if (newTrack) {
              try {
                await peer1.replaceTrack(oldTrack, newTrack);
              } catch (err) {
                if (err instanceof Error) {
                  resolve();
                } else {
                  reject(err);
                }
              }
            }
          }
        });

        setupPeers(peer1, peer2, stream);
        peer1.start();
      })
  );
});

test('should renegotiate the connection when adding a new stream', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = getPeer({ name: 'peer1' });
        const peer2 = getPeer({ name: 'peer2' });

        const stream = await window.Peer.getUserMedia();

        let remoteCount = 0;

        peer2.on('connected', () => {
          setTimeout(() => {
            peer2.addStream(stream, true);
          }, 500);
        });

        peer2.on('disconnected', () => {
          reject();
        });

        peer1.on('streamRemote', () => {
          remoteCount += 1;
          if (remoteCount === 4) {
            resolve();
          }
        });

        setupPeers(peer1, peer2, stream);
        peer1.start();
      })
  );
});

test('should connect two peers that make an offer simultaneously when one is polite', async ({
  page,
}) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve) => {
        const peer1 = getPeer({ name: 'peer1' });
        const peer2 = getPeer({ name: 'peer2' });

        const stream = await window.Peer.getUserMedia();

        peer2.on('connected', () => {
          resolve();
        });

        setupPeers(peer1, peer2, stream);
        peer1.start({ polite: false });
        peer2.start();
      })
  );
});

test('should send data to other peer using data channels', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = getPeer({
          name: 'peer1',
          enableDataChannels: true,
          channelName: 'test',
        });
        const peer2 = getPeer({
          name: 'peer2',
          enableDataChannels: true,
          channelName: 'test',
        });

        const stream = await window.Peer.getUserMedia();

        peer1.on('channelData', ({ channel, data, source }) => {
          if (channel.label === 'test' && data === 'hello world' && source === 'incoming') {
            resolve();
          } else {
            reject(new Error('did not get correct channel data'));
          }
        });

        peer2.on('connected', () => {
          setTimeout(() => {
            peer2.send('hello world');
          }, 500);
        });

        setupPeers(peer1, peer2, stream);
        peer1.start();
      })
  );
});

test('should send data to other peer using dynamic data channels', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = getPeer({
          name: 'peer1',
          enableDataChannels: true,
        });
        const peer2 = getPeer({
          name: 'peer2',
          enableDataChannels: true,
        });

        const stream = await window.Peer.getUserMedia();

        peer1.on('connected', () => {
          peer1.addDataChannel('test');
        });

        peer1.on('channelOpen', () => {
          setTimeout(() => {
            peer2.send('hello world', 'test');
          }, 500);
        });

        peer1.on('channelData', ({ channel, data, source }) => {
          if (channel.label === 'test' && data === 'hello world' && source === 'incoming') {
            resolve();
          } else {
            reject(new Error('did not get correct channel data'));
          }
        });

        setupPeers(peer1, peer2, stream);
        peer1.start();
      })
  );
});

test('should send data to other peer then close using negotiated data channels', async ({
  page,
}) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = getPeer({ name: 'peer1', enableDataChannels: true });
        const peer2 = getPeer({ name: 'peer2', enableDataChannels: true });

        peer1.addDataChannel('extraMessages', { negotiated: true, id: 0 });
        peer2.addDataChannel('extraMessages', { negotiated: true, id: 0 });

        const stream = await window.Peer.getUserMedia();

        peer1.on('channelData', ({ data }) => {
          if (data !== 'hello world') {
            reject(new Error('did not get correct channel data'));
          } else {
            const channel = peer1.getDataChannel('extraMessages');
            channel?.close();
          }
        });

        peer2.on('channelOpen', () => {
          setTimeout(() => {
            peer2.send('hello world', 'extraMessages');
          }, 500);
        });

        peer1.on('channelClosed', () => {
          resolve();
        });

        setupPeers(peer1, peer2, stream);
        peer1.start();

        peer1.get().addEventListener('datachannel', () => {
          reject(new Error('got non-negotiated data channel'));
        });
      })
  );
});
