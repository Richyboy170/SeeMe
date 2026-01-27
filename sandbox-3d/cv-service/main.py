"""
CV Service Entry Point.

Run with: python main.py
Or: uvicorn main:app --reload --port 8001
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from src.routes import body_avatar_router

app = FastAPI(
    title="SeeMe CV Service - 3D Sandbox",
    description="Computer Vision service for body detection and pose estimation",
    version="1.0.0",
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


@app.get("/")
async def root():
    return {
        "service": "SeeMe CV Service - 3D Sandbox",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "cv-sandbox"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True, log_level="info")
