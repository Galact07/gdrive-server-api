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

function extractFolderId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /\/folders\/([\-\w]{25,})/, // Standard folder URL
    /id=([\-\w]{25,})/, // URL with id parameter
    /([\-\w]{25,})/ // Just the ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow all origins for CORS (for production, you may want to restrict this to your frontend domain)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { folderUrl } = req.query;
  if (!folderUrl || typeof folderUrl !== 'string') {
    res.status(400).json({ error: 'Folder URL is required', message: 'Please provide a Google Drive folder URL' });
    return;
  }
  const folderId = extractFolderId(folderUrl);
  if (!folderId) {
    res.status(400).json({ error: 'Invalid folder URL', message: 'Could not extract folder ID from the provided URL' });
    return;
  }
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime)',
      pageSize: 100,
      orderBy: 'createdTime desc'
    });
    const images = response.data.files?.map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size!,
      createdTime: file.createdTime!,
      url: `/api/gdrive-image/${file.id}`,
      thumbnailUrl: `/api/gdrive-image/${file.id}?size=thumbnail`
    })) || [];
    res.status(200).json({
      success: true,
      images,
      totalCount: images.length,
      folderId
    });
  } catch (error: any) {
    console.error('Google Drive API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch images from Google Drive'
    });
  }
} 