from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, ocr, advisor, finance, email_gen

app = FastAPI(
    title="PropTrack AI Service",
    description="AI microservice for PropTrack — OCR, financial advisor, email generation.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — only Spring Boot and localhost need access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://spring-boot:8080", "http://localhost:8080", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(ocr.router)
app.include_router(advisor.router)
app.include_router(finance.router)
app.include_router(email_gen.router)