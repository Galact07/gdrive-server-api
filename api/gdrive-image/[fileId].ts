import { google } from 'googleapis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_SERVICE_ACCOUNT_KEY 
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    : undefined,
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? undefined : process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './src/lib/service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { fileId } = req.query;
  if (!fileId || typeof fileId !== 'string') {
    res.status(400).json({ error: 'File ID is required' });
    return;
  }
  try {
    const file = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    res.setHeader('Content-Type', file.headers['content-type'] || 'application/octet-stream');
    file.data.pipe(res);
  } catch (error: any) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image', message: error.message });
  }
} 