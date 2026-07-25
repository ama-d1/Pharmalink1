// Added 2026-07-22 to work around the phone-can't-reach-port-8080-over-
// Apple-Personal-Hotspot problem, after extensive Windows Firewall /
// Hyper-V Firewall / WSL2 NAT / netsh portproxy troubleshooting.
//
// What we know for certain: Metro's own dev-server port (8081, whatever
// `expo start` prints) is reliably reachable from a physical device over
// this exact hotspot connection - the phone already uses it to load the JS
// bundle. Port 8080 (Docker Desktop's api-gateway, routed through the
// WSL2/Hyper-V network stack) has been unreliable-to-unreachable from the
// phone on the same hotspot, even after the PC-to-PC networking layer was
// fixed and verified working.
//
// Rather than keep fighting that stack, this reverse-proxies REST API
// requests (anything starting with /api/ or /internal/) straight through
// Metro's own already-working port to the real backend on
// http://localhost:8080. The phone only ever talks to Metro's port; Metro
// (a plain Node process on this same machine) forwards to the backend over
// localhost, which has worked flawlessly this entire time.
//
// NOT covered yet: the chat feature's WebSocket connection (see
// services/ChatClient.ts) still goes straight to port 8080, since proxying
// a WS upgrade through Metro's own server needs lower-level access to the
// underlying HTTP server than server.enhanceMiddleware gives us safely
// without risking Metro's own Fast Refresh websocket. Chat over hotspot is
// a separate follow-up - see TODO.md.
const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 8080;
const PROXIED_PREFIXES = ['/api/', '/internal/'];

const defaultEnhanceMiddleware = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (metroMiddleware, metroServer) => {
  const withDefaults = defaultEnhanceMiddleware
    ? defaultEnhanceMiddleware(metroMiddleware, metroServer)
    : metroMiddleware;

  return (req, res, next) => {
    const shouldProxy = PROXIED_PREFIXES.some((prefix) => req.url.startsWith(prefix));
    if (!shouldProxy) {
      return withDefaults(req, res, next);
    }

    const proxyReq = http.request(
      {
        host: BACKEND_HOST,
        port: BACKEND_PORT,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', (err) => {
      console.error('[metro-proxy] backend request failed:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end(`Bad gateway - could not reach backend on ${BACKEND_HOST}:${BACKEND_PORT}: ${err.message}`);
    });

    req.pipe(proxyReq, { end: true });
  };
};

module.exports = config;
