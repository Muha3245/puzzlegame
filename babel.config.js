module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [require.resolve('./scripts/babel-transform-dynamic-import')],
  };
};
