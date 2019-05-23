// @ts-ignore
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        browsers: [
          'last 1 chrome version',
          'last 1 firefox version',
          'last 1 safari version',
        ],
      },
      modules: false,
    }],
    '@babel/preset-typescript',
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            browsers: ['last 1 chrome versions'],
          },
        }],
      ],
    },
  },
};
