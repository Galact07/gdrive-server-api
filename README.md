# Google Drive API Server

A simple Express server (deployable to Vercel) that exposes endpoints to list and proxy images from a Google Drive folder using a service account.

## Setup

### 1. Install dependencies

```
npm install
```

### 2. Service Account Key

- For **local development**, place your Google service account key JSON at `src/lib/service-account-key.json` (do NOT commit this file).
- For **Vercel deployment**, add the contents of your service account key JSON as the `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable in the Vercel dashboard:
  1. Open your `service-account-key.json` file and copy the entire contents (including the `{ ... }`).
  2. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard).
  3. Click on your project, then go to **Settings > Environment Variables**.
  4. Add a new variable:
     - **Name:** `GOOGLE_SERVICE_ACCOUNT_KEY`
     - **Value:** Paste the entire JSON content (Vercel supports multiline values).
     - **Environment:** Select Production (and Preview/Development if needed).
  5. Save and redeploy your project.

### 3. Run Locally

```
npm run dev
# or
node dist/server.js
```

## API Endpoints

### Health Check
```
GET /api/health
```

### List Images in Google Drive Folder
```
GET /api/gdrive-images?folderUrl=GOOGLE_DRIVE_FOLDER_URL
```
- Returns a JSON object with image metadata and URLs.

### Proxy Image by File ID
```
GET /api/gdrive-image/:fileId
```
- Streams the image file from Google Drive.

## Deployment

- Deploy to Vercel. The `vercel.json` is preconfigured for serverless deployment.
- Set the `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable in Vercel as described above.

## Security

- Never commit your service account key JSON to git.
- The `.gitignore` is set up to prevent this. 