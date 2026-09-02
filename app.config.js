module.exports = ({ config }) => {
  const isDev = process.env.APP_VARIANT === 'development';

  return {
    ...config,
    name: isDev ? 'Christ Pavilion (Dev)' : config.name,
    scheme: isDev ? 'spiritoffaithapp-dev' : config.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: isDev ? 'com.spiritoffaith.app.dev' : config.ios?.bundleIdentifier,
    },
    android: {
      ...config.android,
      package: isDev ? 'com.spiritoffaith.app.dev' : config.android?.package,
    },
  };
};
