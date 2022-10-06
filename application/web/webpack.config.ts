import createExpoWebpackConfigAsync from '@expo/webpack-config/webpack';
import {Arguments, Environment} from '@expo/webpack-config/webpack/types';

const path = require('path');

module.exports = async function (env: Environment, argv: Arguments) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
    },
    {
      ...argv,
      plugins: [
        ...argv?.plugins,
      ]
    }
  );
  
  return config;
};
