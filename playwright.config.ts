// eslint-disable-next-line import/no-extraneous-dependencies
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  globalTimeout: 20 * 1000,
  use: {
    ignoreHTTPSErrors: true,
    headless: true,
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream', // avoids the need to grant camera/microphone permissions
        '--use-fake-device-for-media-stream', // feeds a test pattern to getUserMedia() instead of live camera input
        '--no-sandbox', // disable Chrome's sandbox as we trust the content
        '--disable-setuid-sandbox', // disable Linux SUID sandbox
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node test/__setup__/server.js',
    port: 3077,
  },
};

export default config;
