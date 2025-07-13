import { google } from 'googleapis';
import { Request, Response } from 'express';

// Google Drive API configuration
const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_SERVICE_ACCOUNT_KEY 
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    : undefined,
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? undefined : process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './src/lib/service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

export const drive = google.drive({ version: 'v3', auth });

// Helper function to extract folder ID from Google Drive URL
export function extractFolderId(url: string): string | null {
  if (!url) return null;
  
  // Handle different Google Drive URL formats
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

// Interface for Google Drive image
export interface GoogleDriveImage {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  url: string;
  thumbnailUrl: string;
}

// Interface for API response
export interface GoogleDriveResponse {
  success: boolean;
  images: GoogleDriveImage[];
  totalCount: number;
  folderId: string;
  error?: string;
  message?: string;
}

// Main function to fetch images from Google Drive folder
export async function fetchGoogleDriveImages(folderUrl: string): Promise<GoogleDriveResponse> {
  try {
    if (!folderUrl) {
      return {
        success: false,
        images: [],
        totalCount: 0,
        folderId: '',
        error: 'No folder URL provided',
        message: 'Please provide a Google Drive folder URL'
      };
    }

    const folderId = extractFolderId(folderUrl);
    
    if (!folderId) {
      return {
        success: false,
        images: [],
        totalCount: 0,
        folderId: '',
        error: 'Invalid folder URL',
        message: 'Could not extract folder ID from the provided URL'
      };
    }

    // List files in the folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime)',
      pageSize: 100,
      orderBy: 'createdTime desc'
    });

    const images: GoogleDriveImage[] = response.data.files?.map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size!,
      createdTime: file.createdTime!,
      url: `/api/gdrive-image/${file.id}`,
      thumbnailUrl: `/api/gdrive-image/${file.id}?size=thumbnail`
    })) || [];

    return {
      success: true,
      images,
      totalCount: images.length,
      folderId
    };

  } catch (error: unknown) {
    console.error('Google Drive API Error:', error);
    
    const errorCode = (error as { code?: string | number })?.code;
    if (errorCode === 404 || errorCode === '404') {
      return {
        success: false,
        images: [],
        totalCount: 0,
        folderId: '',
        error: 'Folder not found',
        message: 'The folder does not exist or is not accessible'
      };
    }
    
    if (errorCode === 403 || errorCode === '403') {
      return {
        success: false,
        images: [],
        totalCount: 0,
        folderId: '',
        error: 'Access denied',
        message: 'The folder is not shared with the service account'
      };
    }

    return {
      success: false,
      images: [],
      totalCount: 0,
      folderId: '',
      error: 'Internal server error',
      message: 'Failed to fetch images from Google Drive'
    };
  }
}

// Proxy endpoint to serve images with authentication
export async function serveGoogleDriveImage(req: Request, res: Response) {
  try {
    const { fileId } = req.params;
    const { size } = req.query;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Get the file from Google Drive
    const file = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    });

    // Set appropriate headers
    res.setHeader('Content-Type', file.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the image data
    res.send(file.data);
    
  } catch (error: unknown) {
    console.error('Error serving image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to serve image',
      message: errorMessage 
    });
  }
}

// Express.js middleware for API endpoint
export function createGoogleDriveMiddleware() {
  return async (req: Request, res: Response) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { folderUrl } = req.query;
    console.log(folderUrl)
    
    if (!folderUrl) {
      return res.status(400).json({ 
        error: 'Folder URL is required',
        message: 'Please provide a Google Drive folder URL'
      });
    }

    try {
      const result = await fetchGoogleDriveImages(folderUrl as string);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Something went wrong'
      });
    }
  };
}

// Vercel/Netlify serverless function handler
export async function handler(req: Request, res: Response) {
  return createGoogleDriveMiddleware()(req, res);
}

// Export for direct usage
export default {
  fetchGoogleDriveImages,
  extractFolderId,
  createGoogleDriveMiddleware,
  serveGoogleDriveImage,
  handler
}; 