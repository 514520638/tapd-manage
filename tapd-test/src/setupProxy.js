const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://api.tapd.cn',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '', // 将 /api 前缀去掉，转发到 target
      },
    })
  );
};
