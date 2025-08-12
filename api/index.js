const url = require('url');
const corsAnywhere = require('../lib/cors-anywhere');

// Parse environment variables
function parseEnvList(env) {
  if (!env) {
    return [];
  }
  return env.split(',');
}

// Export as Vercel serverless function
module.exports = (req, res) => {
  // Parse the URL to get query parameters
  const parsedUrl = url.parse(req.url, true);
  const targetUrl = parsedUrl.query.url;

  // If no URL parameter is provided, show an error
  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing required query parameter: url\n\nUsage: ?url=https://example.com');
    return;
  }

  // Modify the request URL to match cors-anywhere's expected format
  // cors-anywhere expects the target URL to be in the path after /
  req.url = '/' + targetUrl;

  const originBlacklist = parseEnvList(process.env.CORSANYWHERE_BLACKLIST);
  const originWhitelist = parseEnvList(process.env.CORSANYWHERE_WHITELIST);
  const checkRateLimit = require('../lib/rate-limit')(process.env.CORSANYWHERE_RATELIMIT);

  // Create options for cors-anywhere
  const options = {
    originBlacklist: originBlacklist,
    originWhitelist: originWhitelist,
    requireHeader: null, // Allow requests without specific headers
    checkRateLimit: checkRateLimit,
    removeHeaders: [
      // Note: We're not removing cookies to allow auth to pass through
      // 'cookie',
      // 'cookie2',
      // Strip Vercel-specific headers
      'x-vercel-id',
      'x-vercel-deployment-url',
      'x-vercel-trace',
      'x-vercel-proxied-for',
      'x-vercel-proxy-signature',
      'x-vercel-proxy-signature-ts',
    ],
    redirectSameOrigin: true,
    httpProxyOptions: {
      // Do not add X-Forwarded-For, etc. headers, because Vercel already adds it.
      xfwd: false,
    },
  };

  // Create the proxy server instance to get the request handler
  const server = corsAnywhere.createServer(options);
  
  // Extract the request handler from the server
  const handler = server.listeners('request')[0];
  
  // Call the handler with the request and response
  handler(req, res);
};