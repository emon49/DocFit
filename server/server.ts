import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRouter);

// Static assets and UI pages
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Also serve the raw designs if requested directly
const designPath = path.join(__dirname, '..', 'design', 'docfit-f1-screens');
app.use('/design-preview', express.static(designPath));

// Default fallback to index.html or signin
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'auth-signin.html'));
});

// Explicit route aliases to match both clean paths and .html paths
const pages = [
  'auth-signup.html',
  'auth-signup-doctor.html',
  'auth-signup-existing-email.html',
  'auth-verify-pending.html',
  'auth-verify-expired.html',
  'auth-signin.html',
  'auth-signin-mfa.html',
  'auth-mfa-enroll.html',
  'patient-dashboard.html',
  'auth-forbidden.html',
  'index.html'
];

for (const page of pages) {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(publicPath, page));
  });
  const clean = page.replace('.html', '');
  app.get(`/${clean}`, (req, res) => {
    res.sendFile(path.join(publicPath, page));
  });
}

// Global 404 handler
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(publicPath, 'auth-forbidden.html'));
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`DocFit application server listening on http://${HOST}:${PORT}`);
});

export { app, server };
