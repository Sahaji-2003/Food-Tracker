# FitFlow AI

A mobile-first Progressive Web App (PWA) that acts as a proactive health partner. Uses Gemini AI to analyze food photos, predict health risks, and assign real-time "Burn Tasks" based on caloric intake and activity data from Google Fit.

## 🚀 Features

- **AI-Powered Meal Analysis**: Upload food photos for instant calorie and macro analysis
- **Smart Burn Tasks**: Get personalized exercise tasks based on your caloric surplus
- **Health Grading**: Every meal gets a grade (A+ to F) with detailed reasoning
- **Fit Buddy Chatbot**: RAG-powered AI assistant with personalized health insights
- **Google Fit Integration**: Automatic step and activity tracking
- **Offline Support**: Log meals even without internet connection
- **Push Notifications**: Smart reminders for burn tasks and hydration
- **Voice Logging**: Speak your meals naturally
- **Smart Grocery Lists**: AI-generated shopping lists from pantry photos

## 📁 Project Structure

```
Food-Tracker/
├── frontend/          # Vite + React + TypeScript PWA
├── backend/           # FastAPI + LangChain + Gemini AI
├── docs/              # Documentation
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Vite + React (TypeScript)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI, Lucide Icons
- **Animations**: Framer Motion
- **State Management**: Zustand
- **PWA**: vite-plugin-pwa
- **Offline Storage**: Dexie.js (IndexedDB)

### Backend
- **Framework**: FastAPI (Python)
- **AI**: Gemini 1.5 Pro/Flash, LangChain
- **Database**: Supabase (PostgreSQL + Vector Store)
- **External APIs**: Google Fit REST API

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Supabase account
- Gemini API key
- Google Fit API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sahaji-2003/Food-Tracker.git
   cd Food-Tracker
   ```

2. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your API keys
   npm run dev
   ```

3. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # On Windows
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your API keys
   uvicorn main:app --reload
   ```

4. **Setup Database**
   - Create a Supabase project
   - Run the SQL schema from `docs/database-architecture.md`
   - Create storage buckets: `meal-images`, `pantry-images`, `menu-images`

## 📖 Documentation

- [Database Architecture](docs/database-architecture.md)
- [API Documentation](docs/api-documentation.md) *(coming soon)*
- [Deployment Guide](docs/deployment.md) *(coming soon)*

## 🎯 Roadmap

- [x] Project setup and architecture
- [ ] Core meal logging with AI analysis
- [ ] Dashboard with animated stats
- [ ] Google Fit integration
- [ ] Offline PWA functionality
- [ ] Push notifications
- [ ] Voice logging
- [ ] RAG chatbot

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**Sahaji-2003**

---

Built with ❤️ using Gemini AI