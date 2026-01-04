# FitFlow AI Backend

FastAPI backend for the FitFlow AI health tracking app.

## Setup

### Prerequisites
- Python 3.11+
- [UV](https://github.com/astral-sh/uv) package manager

### Installation

1. **Create virtual environment with UV:**
   ```bash
   uv venv .venv
   ```

2. **Activate the virtual environment:**
   ```bash
   # Windows
   .\.venv\Scripts\activate
   
   # Linux/Mac
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   uv pip install -r requirements.txt
   ```

4. **Create `.env` file from template:**
   ```bash
   cp .env.example .env
   ```

5. **Edit `.env` with your API keys:**
   - `GEMINI_API_KEY` - Google Gemini AI API key
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Supabase service role key

### Running the Server

```bash
# With venv activated:
python main.py

# Or directly:
.\.venv\Scripts\python.exe main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update user profile |
| GET | `/api/daily` | Get daily log |
| POST | `/api/daily/water` | Add water intake |
| POST | `/api/daily/sync-google-fit` | Sync Google Fit data |
| POST | `/api/meals/analyze` | Analyze meal image |
| POST | `/api/meals/analyze-text` | Analyze meal from text |
| GET | `/api/meals/history` | Get meal history |
| POST | `/api/suggestions/menu` | Suggest from menu image |
| POST | `/api/suggestions/cooking` | Suggest recipes from pantry |
| POST | `/api/chat` | Chat with Fit Buddy AI |

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── config.py            # Environment configuration
├── models.py            # Pydantic models
├── requirements.txt     # Python dependencies
├── routes/              # API route handlers
│   ├── profile.py
│   ├── daily.py
│   ├── meals.py
│   ├── suggestions.py
│   └── chat.py
└── services/            # Business logic
    ├── auth.py          # JWT authentication
    ├── supabase_client.py
    └── gemini.py        # AI integration
```
