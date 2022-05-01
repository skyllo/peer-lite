/* eslint-disable no-async-promise-executor */
import { test, expect } from '@playwright/test';
import { rollup, RollupOptions } from 'rollup';
import rollupConfig from '../build/rollup.config';
import * as TestUtils from './test-utils';

const { connectPeers, getPeer, handshake } = TestUtils;

const config: RollupOptions = {
  ...rollupConfig,
  output: rollupConfig.output,
};

test.beforeEach(async ({ page }) => {
  // generate code from rollup
  const bundle = await rollup(config);
  const { output } = await bundle.generate(config.output[0]);
  const [{ code }] = output;
  // goto localhost
  await page.goto('https://localhost:3077');
  // evaluate generated code
  await page.evaluate(code);
  // update window object
  await page.evaluate(() => {
    window.Peer = window.PeerLite.Peer;
  });
  // add test utils functions to page
  await page.addScriptTag({ content: `${connectPeers} ${getPeer} ${handshake}` });
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
      new Promise<void>(async (resolve) => {
        const peer1 = await getPeer();
        const stream = await window.Peer.getUserMedia();

        peer1.on('streamLocal', () => {
          resolve();
        });

        await peer1.addStream(stream);
      })
  );
});

test('should set the local stream and be active', async ({ page }) => {
  const isStreamLocalActive = await page.evaluate(async () => {
    const stream = await window.Peer.getUserMedia();
    const peer = await getPeer();
    const streamLocal = await peer.addStream(stream);
    return streamLocal.active;
  });

  expect(isStreamLocalActive).toEqual(true);
});

test('should not recreate a new connection on reset', async ({ page }) => {
  const isEqual = await page.evaluate(async () => {
    const peer = await getPeer();
    await peer.init();
    const p1 = peer.getPeerConnection();
    await peer.reset();
    const p2 = peer.getPeerConnection();
    return p1 === p2;
  });

  expect(isEqual).toEqual(true);
});

test('should reset an active connection on reset', async ({ page }) => {
  const isEqual = await page.evaluate(
    () =>
      new Promise(async (resolve) => {
        const peer1 = await getPeer();
        const peer2 = await getPeer();

        const stream = await window.Peer.getUserMedia();

        peer2.on('connected', async () => {
          const p1 = peer2.getPeerConnection();
          await peer2.reset();
          const p2 = peer2.getPeerConnection();
          resolve(p1 !== p2);
        });

        // connect peers together
        await connectPeers(peer1, peer2, stream);
      })
  );

  expect(isEqual).toEqual(true);
});

test('should emit both peer remote streams', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve) => {
        const peer1 = await getPeer();
        const peer2 = await getPeer();

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

        // connect peers together
        await connectPeers(peer1, peer2, stream);

        // start and stop local stream
        await peer1.removeTracks();
        await peer1.addStream(stream);
      })
  );
});

test('should renegotiate the connection when adding a new stream', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = await getPeer();
        const peer2 = await getPeer();

        const stream = await window.Peer.getUserMedia();

        peer2.on('connected', async () => {
          setTimeout(async () => {
            await peer2.addStream(stream, true);
          }, 500);
        });

        peer2.on('negotiation', async () => {
          await handshake(peer2, peer1);
          resolve();
        });

        peer2.on('disconnected', async (isMakingOffer) => {
          if (!isMakingOffer) {
            reject();
          }
        });

        // connect peers together
        await connectPeers(peer1, peer2, stream);
      })
  );
});

test('should renegotiate the connection when adding a new stream and not emit disconnect when offers collide', async ({
  page,
}) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = await getPeer();
        const peer2 = await getPeer();

        const stream = await window.Peer.getUserMedia();

        peer2.on('connected', async () => {
          await peer2.addStream(stream, true);
        });

        peer2.on('negotiation', async () => {
          // trigger offerCollision
          await peer1.call();
          await peer2.call();
          await handshake(peer2, peer1);
          resolve();
        });

        peer2.on('disconnected', async (isMakingOffer) => {
          if (!isMakingOffer) {
            reject();
          }
        });

        // connect peers together
        await connectPeers(peer1, peer2, stream);
      })
  );
});

test('should enable and disable tracks correctly', async ({ page }) => {
  const actual = await page.evaluate(
    () =>
      new Promise(async (resolve) => {
        const peer1 = await getPeer();
        const peer2 = await getPeer();

        const stream = await window.Peer.getUserMedia();

        function isTracksEnabled() {
          return peer2
            .getStreamLocal()
            .getTracks()
            .some((track) => track.enabled);
        }

        const result = [];

        peer2.on('streamRemote', async () => {
          result.push(isTracksEnabled());
          peer2.pauseTracks();
          result.push(isTracksEnabled());
          peer2.resumeTracks();
          result.push(isTracksEnabled());
          resolve(result);
        });

        // connect peers together
        await connectPeers(peer1, peer2, stream);
      })
  );

  expect(actual).toEqual([true, false, true]);
});

test('should send data to other peer using data channels', async ({ page }) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = await getPeer({ channelName: 'default' });
        const peer2 = await getPeer({ channelName: 'default' });

        const stream = await window.Peer.getUserMedia();

        peer1.on('channelData', async ({ data }) => {
          if (data === 'hello world') {
            resolve();
          } else {
            reject(new Error('did not get correct channel data'));
          }
        });

        peer2.on('connected', async () => {
          setTimeout(async () => {
            peer2.send('hello world');
          }, 500);
        });

        // connect peers together
        await connectPeers(peer1, peer2, stream);
      })
  );
});

test('should send data to other peer then close using negotiated data channels', async ({
  page,
}) => {
  await page.evaluate(
    () =>
      new Promise<void>(async (resolve, reject) => {
        const peer1 = await getPeer();
        const peer2 = await getPeer();

        const stream = await window.Peer.getUserMedia();

        peer1.on('channelData', async ({ data }) => {
          if (data !== 'hello world') {
            reject(new Error('did not get correct channel data'));
          } else {
            const channel = peer1.getDataChannel();
            channel.close();
          }
        });

        peer1.on('channelClosed', () => {
          resolve();
        });

        peer2.on('connected', async () => {
          peer1.getDataChannel('extraMessages', { negotiated: true, id: 0 });
          peer2.getDataChannel('extraMessages', { negotiated: true, id: 0 });

          setTimeout(async () => {
            peer2.send('hello world', 'extraMessages');
          }, 500);
        });

        // connect peers together
        await connectPeers(peer1, peer2, stream);

        peer1.getPeerConnection().addEventListener('datachannel', () => {
          reject(new Error('got non-negotiated data channel'));
        });
      })
  );
});
