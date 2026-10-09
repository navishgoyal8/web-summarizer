# Web Page Summarizer

Paste a URL and get a short AI-generated summary of the page.

**Live demo:** https://web-summarizer-ljsdmu8c8-navish-goyals-projects.vercel.app
**API:** https://web-summarizer-backend.onrender.com/api/health

> The backend runs on a free hosting plan, so the first request after a period of
> inactivity can take up to a minute while the server wakes up.

## Tech stack
- Frontend: React (Vite)
- Backend: Node.js, Express, Cheerio (HTML scraping)
- AI: Groq API (free tier)

## How it works
1. The frontend sends the URL to `POST /api/summarize`.
2. The backend downloads the page, removes scripts, menus and footers, and extracts the main text.
3. The text (first ~12,000 characters) is sent to the AI model, which returns a summary.
4. The frontend shows a loading state, then the summary.

## Run locally

### Prerequisites
- Node.js 18 or newer
- A free Groq API key from https://console.groq.com

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```
Open **`backend/.env`** and fill in:
```
GROQ_API_KEY=your_key_here
GROQ_MODEL=<a chat model name>
CORS_ORIGIN=http://localhost:5173
PORT=3001
```
Run `npm run models` to list the models available to your key and pick one for `GROQ_MODEL`.
Then start the server:
```bash
npm run dev
```
The API runs at http://localhost:3001 (check http://localhost:3001/api/health).

### 2. Frontend (in a second terminal)
```bash
cd frontend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```
**`frontend/.env`** contains `VITE_API_URL=http://localhost:3001`.
Open http://localhost:5173.

## API
`POST /api/summarize` with body `{ "url": "https://example.com" }`
Returns `{ "title": "...", "summary": "...", "truncated": false }` or `{ "error": "..." }`.

## Safety notes
- Only http/https URLs are accepted; localhost and private network addresses are blocked
  (including through redirects) so the server can't be used to probe internal networks.
- Requests have timeouts and size limits, and the endpoint is rate limited to 10 per minute per IP.
- API keys live only in `.env` files, which are git-ignored.

## Limitations
- Pages that need JavaScript to render their content, or that block bots, can't be summarized.
- Very long pages are truncated before summarizing.
