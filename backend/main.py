from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes import profile, daily, meals, suggestions, chat

app = FastAPI(
    title="FitFlow AI API",
    description="AI-powered health and fitness tracking API",
    version="1.0.0",
)

# CORS middleware - allow mobile app and local development
cors_origins = settings.cors_origins_list + [
    "exp://localhost:8081",
    "exp://10.0.0.0:8081",  # Expo Go on local network
    "exp://*",  # Allow all Expo tunnel URLs
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for mobile app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "FitFlow AI API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Register API routes
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(daily.router, prefix="/api/daily", tags=["daily"])
app.include_router(meals.router, prefix="/api/meals", tags=["meals"])
app.include_router(suggestions.router, prefix="/api/suggestions", tags=["suggestions"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
