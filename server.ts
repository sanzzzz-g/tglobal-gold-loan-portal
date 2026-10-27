import 'dotenv/config';
import path from 'path';
import express from 'express';
import { app } from './server/app.ts';

const PORT = Number(process.env.PORT) || 3000;
const DIST_PATH = path.resolve(process.cwd(), 'dist');

// Serve frontend static assets if dist exists (production build)
app.use(express.static(DIST_PATH));

// For SPA routing, serve index.html for non-api routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.resolve(DIST_PATH, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('T Global Gold Loan Portal server is running.');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`T Global Gold Loan Portal backend running at http://0.0.0.0:${PORT}`);
});
