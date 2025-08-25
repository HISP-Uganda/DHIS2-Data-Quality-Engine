// This setupProxy.js is used by d2-app-scripts (Create React App / Webpack Dev Server)
module.exports = function(app) {
  const { createProxyMiddleware } = require("http-proxy-middleware");
  
  // DQ Engine proxy for specific endpoints
  const dqEngineProxy = createProxyMiddleware({
    target: "http://localhost:4000",
    changeOrigin: true,
    logLevel: "debug",
    onError: (err, req, res) => {
      console.error('DQ Engine proxy error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'DQ Engine proxy failed', details: err.message }));
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[PROXY] Routing ${req.method} ${req.url} -> http://localhost:4000${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[PROXY] Response for ${req.url}: ${proxyRes.statusCode}`);
    }
  });

  // Route specific DQ engine endpoints to port 4000 - ORDER MATTERS!
  // These must come BEFORE any generic DHIS2 /api proxy to avoid conflicts
  
  // Notification management endpoints - HIGH PRIORITY
  app.use("/api/facilities", dqEngineProxy);
  app.use("/api/notifications/configure-email", dqEngineProxy);
  app.use("/api/notifications/configure-whatsapp", dqEngineProxy);
  app.use("/api/notifications/configure-sms", dqEngineProxy);
  app.use("/api/notifications/test-services", dqEngineProxy);
  app.use("/api/notifications/test-dq", dqEngineProxy);
  app.use("/api/notifications", dqEngineProxy);
  
  // DQ Engine core endpoints
  app.use("/api/run-dq", dqEngineProxy);
  app.use("/api/schedules", dqEngineProxy);
  app.use("/api/compare-datasets", dqEngineProxy);
  app.use("/api/get-datasets", dqEngineProxy);
  app.use("/api/get-dataset-elements", dqEngineProxy);
  app.use("/api/get-org-units", dqEngineProxy);
  app.use("/api/get-data-elements", dqEngineProxy);
  
  // Dashboard and statistics endpoints
  app.use("/api/dashboard-metrics", dqEngineProxy);
  app.use("/api/comparison-stats", dqEngineProxy);
  app.use("/api/dq-runs", dqEngineProxy);
  app.use("/api/comparisons", dqEngineProxy);
  app.use("/api/reset-stats", dqEngineProxy);

  // DHIS2 API fallback proxy - MUST BE LAST
  const dhis2Proxy = createProxyMiddleware({
    target: "https://hmis-tests.health.go.ug",
    changeOrigin: true,
    secure: true,
    logLevel: "debug",
    onError: (err, req, res) => {
      console.error('DHIS2 proxy error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'DHIS2 proxy failed', details: err.message }));
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[DHIS2 PROXY] Routing ${req.method} ${req.url} -> https://hmis-tests.health.go.ug${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[DHIS2 PROXY] Response for ${req.url}: ${proxyRes.statusCode}`);
    }
  });

  // Fallback: Route all other /api/* calls to DHIS2 server
  app.use("/api", dhis2Proxy);

  console.log("✅ DQ Engine proxy setup complete - routing DQ endpoints to localhost:4000");
  console.log("✅ DHIS2 API proxy setup complete - routing other /api/* to https://hmis-tests.health.go.ug");
  console.log("📋 Configured DQ routes:", [
    "/api/facilities", "/api/notifications/configure-email", "/api/notifications/configure-whatsapp", 
    "/api/notifications/configure-sms", "/api/notifications/test-services", "/api/notifications/test-dq", "/api/notifications",
    "/api/run-dq", "/api/schedules", "/api/compare-datasets", "/api/get-datasets",
    "/api/get-dataset-elements", "/api/get-org-units", "/api/get-data-elements",
    "/api/dashboard-metrics", "/api/comparison-stats", "/api/dq-runs", 
    "/api/comparisons", "/api/reset-stats"
  ]);
};
