import { rollup, RollupOptions } from 'rollup';
import rollupConfig from '../build/rollup.config';
import * as TestUtils from './test-utils';

jest.setTimeout(5000);

const { connectPeers, getPeer, handshake } = TestUtils;

const config: RollupOptions = {
  ...rollupConfig,
  output: rollupConfig.output[0],
};

beforeAll(async () => {
  // generate code from rollup
  const bundle = await rollup(config);
  const { output } = await bundle.generate(config.output);
  const [{ code }] = output;
  // goto localhost
  await page.goto('https://localhost:3077');
  // evaluate generated code
  await page.evaluate(code);
  // add test utils functions to page
  await page.addScriptTag({ content: `${connectPeers} ${getPeer} ${handshake}` });
  // add error listener
  page.on('error', (err) => {
    console.log(err);
  });
  // add page error listener
  page.on('pageerror', (err) => {
    console.log(err);
  });
  // add console log listener
  page.on('console', (msg) => {
    console.log(msg.args().map((i) => i.toString().replace('JSHandle:', '')).join(' '));
  });
}, 5000);

it('should emit the local stream', async () => {
  await page.evaluate(() => new Promise(async (resolve) => {
    const peer1 = await getPeer();
    const stream = await window.Peer.getUserMedia();

    peer1.on('streamLocal', () => {
      resolve();
    });

    await peer1.addStream(stream);
  }));
});

it('should set the local stream and be active', async () => {
  const isStreamLocalActive = await page.evaluate(async () => {
    const stream = await window.Peer.getUserMedia();
    const peer = await getPeer();
    const streamLocal = await peer.addStream(stream);
    return streamLocal.active;
  });

  expect(isStreamLocalActive).toEqual(true);
});

it('should not recreate a new connection on reset', async () => {
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

it('should reset an active connection on reset', async () => {
  const isEqual = await page.evaluate(() => new Promise(async (resolve) => {
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
  }));

  expect(isEqual).toEqual(true);
});

it('should emit both peer remote streams', async () => {
  await page.evaluate(() => new Promise(async (resolve) => {
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
  }));
});

it('should renegotiate the connection when disabling and enabling the local stream', async () => {
  await page.evaluate(() => new Promise(async (resolve) => {
    const peer1 = await getPeer();
    const peer2 = await getPeer();

    const stream = await window.Peer.getUserMedia();

    peer2.on('connected', async () => {
      setTimeout(async () => {
        await peer2.addStream(stream, true);
      }, 500);
    });

    peer2.on('negotiation', async () => {
      await handshake(peer1, peer2);
      resolve();
    });

    // connect peers together
    await connectPeers(peer1, peer2, stream);
  }));
});

it('should enable and disable tracks correctly', async () => {
  const actual = await page.evaluate(() => new Promise(async (resolve) => {
    const peer1 = await getPeer();
    const peer2 = await getPeer();

    const stream = await window.Peer.getUserMedia();

    function isTracksEnabled() {
      return peer2.getStreamLocal().getTracks().some((track) => track.enabled);
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
  }));

  expect(actual).toEqual([true, false, true]);
});
