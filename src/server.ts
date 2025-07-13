import express from 'express';
import cors from 'cors';
import { createGoogleDriveMiddleware, serveGoogleDriveImage } from './lib/googleDriveApi.js';

const app = express();

// Global CORS headers for all responses
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.get('/api/gdrive-images', createGoogleDriveMiddleware());
app.get('/api/gdrive-image/:fileId', serveGoogleDriveImage);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Google Drive API Server running on port ${PORT}`);
});
export default app; 