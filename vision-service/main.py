"""
SeeMe Vision Service Entry Point.

Run with: python main.py
Or: uvicorn main:app --reload --port 8001
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from src.routes import body_avatar_router, friendship_poses_router

app = FastAPI(
    title="SeeMe Vision Service",
    description="Computer Vision service for body detection, pose estimation, and friendship meetup validation",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(body_avatar_router)
app.include_router(friendship_poses_router)


@app.get("/")
async def root():
    return {
        "service": "SeeMe Vision Service",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "vision-service"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True, log_level="info")
