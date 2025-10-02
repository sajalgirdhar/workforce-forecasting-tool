import asyncio
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.seasonal import seasonal_decompose
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ✅ FastAPI app with CORS
app = FastAPI()

# Allow Netlify + local dev (CRA:3000, Vite:5173)
origins = [
    "https://forecastingtool.netlify.app",  # Netlify frontend
    "http://localhost:3000",                # React CRA local dev
    "http://localhost:5173",                # Vite local dev
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # 👈 only allow trusted frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API router with prefix
api_router = APIRouter(prefix="/api")

# (⚠️ keep all your Pydantic models, helper functions, and routes unchanged)
# IMPORTANT ROUTES (frontend calls these):
# POST /api/call-data
# POST /api/call-data/bulk
# GET  /api/call-data
# POST /api/upload-csv
# POST /api/forecast
# GET  /api/forecasts
# GET  /api/analytics/accuracy

# Include router
app.include_router(api_router)

# Health check
@app.get("/health")
async def health():
    return {"status": "Backend is running 🚀"}

# Shutdown
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
