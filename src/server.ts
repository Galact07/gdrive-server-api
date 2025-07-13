import express from 'express';
import cors from 'cors';
import { createGoogleDriveMiddleware, serveGoogleDriveImage } from './lib/googleDriveApi.js';

const app = express();

// Use CORS middleware to allow requests from localhost:8080
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
}));
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