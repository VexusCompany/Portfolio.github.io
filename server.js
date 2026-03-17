const express = require('express');
const path = require('path');

const app = express();
const rootDir = __dirname;
const indexFile = path.join(rootDir, 'index.html');
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use(express.static(rootDir, {
  index: false,
  extensions: false,
  fallthrough: true,
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (/\.(html|json|xml|txt)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get('*', (req, res, next) => {
  if (path.extname(req.path)) {
    return next();
  }
  return res.sendFile(indexFile);
});

app.use((req, res) => {
  res.status(404).type('text/plain').send('Not Found');
});

app.listen(port, () => {
  console.log(`VEXUS server running on http://localhost:${port}`);
});
