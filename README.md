# SnapClaw

A mobile-first web app for screenshot extraction and logging with client-side OCR and Google integration.

## Features

- 📸 Screenshot upload with drag-and-drop
- 🔍 Client-side OCR using Tesseract.js
- 📝 Extract and edit: Title, Date, Time, Location, Category
- 📅 Create Google Calendar events
- 📊 Log to Google Sheets (auto-creates "SnapClaw Log" spreadsheet)
- 🔐 Backend-assisted OAuth (no user key management)
- 📱 Mobile-optimized responsive design

## Setup

### Prerequisites

- Node.js 18+ (with npm/yarn)
- Google Cloud project with OAuth 2.0 configured

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
APP_BASE_URL=http://localhost:3000
```

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable APIs:
   - Google Calendar API
   - Google Drive API
   - Google Sheets API
4. Create OAuth 2.0 Credentials (Web Application):
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
5. Copy Client ID and Client Secret to `.env.local`

### Running

Development:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Production:
```bash
npm run build
npm start
```

## How It Works

1. **Screenshot Upload**: Drag-and-drop or click to upload an image
2. **OCR**: Tesseract.js extracts text from the image (client-side, no server processing)
3. **Edit Metadata**: Modify extracted title, date, time, location, and category
4. **Connect Google**: First-time users click "Connect Google" for OAuth
5. **Create Event/Log**:
   - **Create Calendar Event**: Adds to primary Google Calendar
   - **Log to Sheet**: Appends row to "SnapClaw Log" spreadsheet in Drive

## API Routes

- `GET /api/auth/status` - Check authentication
- `GET /api/auth/google/start` - Initiate OAuth flow
- `GET /api/auth/google/callback` - OAuth callback handler
- `POST /api/calendar/create` - Create calendar event
- `POST /api/sheets/append` - Append row to sheet

## Privacy

- **No image storage**: Screenshots are processed client-side only
- **OCR is local**: Text extraction happens in browser, not on server
- **No background monitoring**: Manual upload/action only
- **Secure tokens**: Refresh tokens stored encrypted server-side

## Categories

- EVENT_LOGISTICS
- EXPENSE
- IDEA
- CONTENT
- PROOF
- BUG
- REFERENCE
- REVIEW_REQUIRED
- OTHER

## Stack

- Next.js 15+ (App Router)
- TypeScript
- Tesseract.js (OCR)
- Google APIs (Calendar, Sheets, Drive)
