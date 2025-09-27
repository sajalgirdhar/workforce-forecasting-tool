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
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()
origins = [
    "https://forecastingtool.netlify.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class CallDataPoint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    calls_volume: int
    staffing_level: int
    service_level: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CallDataCreate(BaseModel):
    date: str
    calls_volume: int
    staffing_level: int
    service_level: float

class BulkCallData(BaseModel):
    data_points: List[CallDataCreate]

class ForecastRequest(BaseModel):
    method: str  # "arima", "exponential_smoothing", "random_forest", "linear_regression", "seasonal_decompose"
    forecast_days: int
    seasonality_factors: Optional[Dict[str, Any]] = None
    confidence_level: float = 0.95

class ForecastResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    method: str
    forecast_dates: List[str]
    predicted_calls: List[float]
    confidence_intervals: Optional[Dict[str, List[float]]] = None
    accuracy_metrics: Optional[Dict[str, float]] = None
    staffing_recommendations: List[int]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StaffingRecommendation(BaseModel):
    date: str
    predicted_calls: int
    recommended_staff: int
    service_level_target: float
    confidence: str

# Helper Functions
def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data.get('timestamp'), datetime):
        data['timestamp'] = data['timestamp'].isoformat()
    return data

def parse_from_mongo(item):
    """Parse datetime strings from MongoDB back to datetime objects"""
    if isinstance(item.get('timestamp'), str):
        item['timestamp'] = datetime.fromisoformat(item['timestamp'])
    return item

async def get_historical_data():
    """Retrieve historical call data from MongoDB"""
    data_points = await db.call_data.find().sort("date", 1).to_list(1000)
    if not data_points:
        return pd.DataFrame()
    
    df = pd.DataFrame([parse_from_mongo(item) for item in data_points])
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    return df

def calculate_staffing_requirement(predicted_calls, target_service_level=0.8):
    """Calculate staffing requirements based on predicted calls and target service level"""
    # Simple Erlang C model approximation
    # In reality, this would be more complex with proper queueing theory
    base_ratio = 8  # Average calls per staff per hour
    service_adjustment = 1 / target_service_level
    return max(1, int((predicted_calls / base_ratio) * service_adjustment))

def perform_arima_forecast(df, forecast_days, confidence_level):
    """Perform ARIMA forecasting"""
    try:
        model = ARIMA(df['calls_volume'], order=(1, 1, 1))
        fitted_model = model.fit()
        forecast = fitted_model.forecast(steps=forecast_days)
        conf_int = fitted_model.get_forecast(steps=forecast_days).conf_int(alpha=1-confidence_level)
        
        return {
            'predictions': forecast.tolist(),
            'confidence_lower': conf_int.iloc[:, 0].tolist(),
            'confidence_upper': conf_int.iloc[:, 1].tolist(),
            'aic': fitted_model.aic,
            'bic': fitted_model.bic
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ARIMA forecasting failed: {str(e)}")

def perform_exponential_smoothing(df, forecast_days, confidence_level):
    """Perform Exponential Smoothing forecasting"""
    try:
        seasonal_periods = min(7, len(df) // 2)  # Weekly seasonality if enough data
        
        if len(df) > seasonal_periods * 2:
            model = ExponentialSmoothing(
                df['calls_volume'], 
                seasonal_periods=seasonal_periods,
                trend='add', 
                seasonal='add'
            )
        else:
            model = ExponentialSmoothing(df['calls_volume'], trend='add')
        
        fitted_model = model.fit()
        forecast = fitted_model.forecast(forecast_days)
        
        # Simple confidence interval calculation (can be improved)
        residuals = fitted_model.fittedvalues - df['calls_volume']
        std_residuals = np.std(residuals)
        z_score = 1.96 if confidence_level == 0.95 else 2.576
        
        confidence_margin = z_score * std_residuals
        
        return {
            'predictions': forecast.tolist(),
            'confidence_lower': (forecast - confidence_margin).tolist(),
            'confidence_upper': (forecast + confidence_margin).tolist(),
            'aic': fitted_model.aic
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Exponential smoothing failed: {str(e)}")

def perform_ml_forecast(df, forecast_days, method="random_forest"):
    """Perform machine learning-based forecasting"""
    try:
        # Feature engineering
        df['day_of_week'] = df['date'].dt.dayofweek
        df['month'] = df['date'].dt.month
        df['day_of_month'] = df['date'].dt.day
        
        # Create lag features
        for i in range(1, min(8, len(df))):
            df[f'calls_lag_{i}'] = df['calls_volume'].shift(i)
        
        # Remove rows with NaN values
        df_clean = df.dropna()
        
        if len(df_clean) < 5:
            raise ValueError("Insufficient data for machine learning")
        
        features = ['day_of_week', 'month', 'day_of_month', 'staffing_level'] + [col for col in df_clean.columns if col.startswith('calls_lag_')]
        X = df_clean[features]
        y = df_clean['calls_volume']
        
        # Train model
        if method == "random_forest":
            model = RandomForestRegressor(n_estimators=50, random_state=42)
        else:
            model = LinearRegression()
        
        model.fit(X, y)
        
        # Generate predictions
        predictions = []
        last_row = df_clean.iloc[-1:].copy()
        
        for i in range(forecast_days):
            pred = model.predict(last_row[features])[0]
            predictions.append(pred)
            
            # Update for next prediction (simplified)
            new_row = last_row.copy()
            new_row['calls_volume'] = pred
            for lag in range(1, min(8, len(df))):
                if f'calls_lag_{lag}' in new_row.columns:
                    if lag == 1:
                        new_row[f'calls_lag_{lag}'] = pred
                    else:
                        new_row[f'calls_lag_{lag}'] = last_row[f'calls_lag_{lag-1}'].values[0]
            last_row = new_row
        
        # Calculate accuracy metrics
        y_pred = model.predict(X)
        mae = mean_absolute_error(y, y_pred)
        rmse = np.sqrt(mean_squared_error(y, y_pred))
        
        return {
            'predictions': predictions,
            'mae': mae,
            'rmse': rmse,
            'r2_score': model.score(X, y) if hasattr(model, 'score') else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ML forecasting failed: {str(e)}")

def perform_seasonal_decompose(df, forecast_days):
    """Perform seasonal decomposition and forecasting"""
    try:
        if len(df) < 14:  # Need at least 2 weeks of data
            raise ValueError("Insufficient data for seasonal decomposition")
        
        # Set date as index for decomposition
        df_indexed = df.set_index('date')
        decomposition = seasonal_decompose(df_indexed['calls_volume'], model='additive', period=7)
        
        # Handle NaN values in trend data
        trend_clean = decomposition.trend.dropna()
        if len(trend_clean) < 6:  # Need at least 6 data points for slope calculation
            raise ValueError("Insufficient trend data after removing NaN values")
        
        # Simple trend extrapolation for forecast
        trend_slope = (trend_clean[-3:].mean() - trend_clean[:3].mean()) / len(trend_clean)
        seasonal_pattern = decomposition.seasonal.iloc[-7:].values  # Last week's pattern
        
        # Get the last valid trend value
        last_trend = trend_clean.iloc[-1]
        if pd.isna(last_trend):
            last_trend = trend_clean.mean()  # Fallback to mean if last value is NaN
        
        predictions = []
        for i in range(forecast_days):
            trend_component = last_trend + (i + 1) * trend_slope
            seasonal_component = seasonal_pattern[i % 7]
            
            # Handle NaN values
            if pd.isna(trend_component):
                trend_component = trend_clean.mean()
            if pd.isna(seasonal_component):
                seasonal_component = 0
            
            prediction = float(trend_component + seasonal_component)
            predictions.append(max(0, prediction))  # Ensure non-negative predictions
        
        return {
            'predictions': predictions,
            'trend': trend_clean.tolist(),
            'seasonal': [float(x) if not pd.isna(x) else 0 for x in decomposition.seasonal.tolist()],
            'residual': decomposition.resid.dropna().tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Seasonal decomposition failed: {str(e)}")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Call Center Forecasting API"}

@api_router.post("/call-data", response_model=CallDataPoint)
async def create_call_data(input: CallDataCreate):
    """Add a single call data point"""
    data_dict = input.dict()
    data_obj = CallDataPoint(**data_dict)
    
    prepared_data = prepare_for_mongo(data_obj.dict())
    await db.call_data.insert_one(prepared_data)
    
    return data_obj

@api_router.post("/call-data/bulk")
async def create_bulk_call_data(input: BulkCallData):
    """Add multiple call data points"""
    data_objects = []
    
    for data_point in input.data_points:
        data_dict = data_point.dict()
        data_obj = CallDataPoint(**data_dict)
        data_objects.append(prepare_for_mongo(data_obj.dict()))
    
    await db.call_data.insert_many(data_objects)
    
    return {"message": f"Successfully added {len(data_objects)} data points"}

@api_router.get("/call-data", response_model=List[CallDataPoint])
async def get_call_data():
    """Retrieve all call data"""
    data_points = await db.call_data.find().sort("date", 1).to_list(1000)
    return [CallDataPoint(**parse_from_mongo(data)) for data in data_points]

@api_router.delete("/call-data")
async def delete_all_call_data():
    """Delete all call data"""
    result = await db.call_data.delete_many({})
    return {"message": f"Deleted {result.deleted_count} data points"}

@api_router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Upload CSV file with call data"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Validate required columns
        required_columns = ['date', 'calls_volume', 'staffing_level', 'service_level']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {required_columns}")
        
        # Convert to data objects
        data_objects = []
        for _, row in df.iterrows():
            data_point = CallDataCreate(
                date=str(row['date']),
                calls_volume=int(row['calls_volume']),
                staffing_level=int(row['staffing_level']),
                service_level=float(row['service_level'])
            )
            data_obj = CallDataPoint(**data_point.dict())
            data_objects.append(prepare_for_mongo(data_obj.dict()))
        
        # Insert to database
        await db.call_data.insert_many(data_objects)
        
        return {"message": f"Successfully uploaded {len(data_objects)} data points from CSV"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")

@api_router.post("/forecast", response_model=ForecastResult)
async def generate_forecast(request: ForecastRequest):
    """Generate call volume forecast"""
    df = await get_historical_data()
    
    if df.empty:
        raise HTTPException(status_code=400, detail="No historical data available for forecasting")
    
    if len(df) < 7:
        raise HTTPException(status_code=400, detail="Minimum 7 data points required for forecasting")
    
    # Generate forecast dates
    last_date = pd.to_datetime(df['date'].max())
    forecast_dates = [(last_date + pd.Timedelta(days=i+1)).strftime('%Y-%m-%d') for i in range(request.forecast_days)]
    
    # Perform forecasting based on method
    try:
        if request.method == "arima":
            result = perform_arima_forecast(df, request.forecast_days, request.confidence_level)
            predictions = result['predictions']
            confidence_intervals = {
                'lower': result['confidence_lower'],
                'upper': result['confidence_upper']
            }
            accuracy_metrics = {'aic': result['aic'], 'bic': result.get('bic')}
            
        elif request.method == "exponential_smoothing":
            result = perform_exponential_smoothing(df, request.forecast_days, request.confidence_level)
            predictions = result['predictions']
            confidence_intervals = {
                'lower': result['confidence_lower'],
                'upper': result['confidence_upper']
            }
            accuracy_metrics = {'aic': result['aic']}
            
        elif request.method in ["random_forest", "linear_regression"]:
            result = perform_ml_forecast(df, request.forecast_days, request.method)
            predictions = result['predictions']
            confidence_intervals = None  # ML methods don't provide confidence intervals by default
            accuracy_metrics = {
                'mae': result['mae'],
                'rmse': result['rmse'],
                'r2_score': result.get('r2_score')
            }
            
        elif request.method == "seasonal_decompose":
            result = perform_seasonal_decompose(df, request.forecast_days)
            predictions = result['predictions']
            confidence_intervals = None
            accuracy_metrics = None
            
        else:
            raise HTTPException(status_code=400, detail="Invalid forecasting method")
        
        # Calculate staffing recommendations
        staffing_recommendations = [
            calculate_staffing_requirement(pred, target_service_level=0.8) 
            for pred in predictions
        ]
        
        # Create forecast result
        forecast_result = ForecastResult(
            method=request.method,
            forecast_dates=forecast_dates,
            predicted_calls=predictions,
            confidence_intervals=confidence_intervals,
            accuracy_metrics=accuracy_metrics,
            staffing_recommendations=staffing_recommendations
        )
        
        # Save to database
        prepared_forecast = prepare_for_mongo(forecast_result.dict())
        await db.forecasts.insert_one(prepared_forecast)
        
        return forecast_result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Forecasting failed: {str(e)}")

@api_router.get("/forecasts", response_model=List[ForecastResult])
async def get_forecasts():
    """Retrieve all saved forecasts"""
    forecasts = await db.forecasts.find().sort("timestamp", -1).to_list(100)
    return [ForecastResult(**parse_from_mongo(forecast)) for forecast in forecasts]

@api_router.get("/analytics/accuracy")
async def get_accuracy_analysis():
    """Get forecasting accuracy analysis"""
    df = await get_historical_data()
    
    if len(df) < 14:
        return {"message": "Insufficient data for accuracy analysis"}
    
    # Split data for validation
    split_point = len(df) - 7
    train_data = df.iloc[:split_point]
    test_data = df.iloc[split_point:]
    
    methods = ["arima", "exponential_smoothing", "random_forest", "linear_regression"]
    accuracy_results = {}
    
    for method in methods:
        try:
            if method == "arima":
                result = perform_arima_forecast(train_data, 7, 0.95)
                predictions = result['predictions']
            elif method == "exponential_smoothing":
                result = perform_exponential_smoothing(train_data, 7, 0.95)
                predictions = result['predictions']
            elif method in ["random_forest", "linear_regression"]:
                result = perform_ml_forecast(train_data, 7, method)
                predictions = result['predictions']
            
            # Calculate accuracy
            actual = test_data['calls_volume'].values[:len(predictions)]
            mae = mean_absolute_error(actual, predictions[:len(actual)])
            rmse = np.sqrt(mean_squared_error(actual, predictions[:len(actual)]))
            
            accuracy_results[method] = {
                'mae': mae,
                'rmse': rmse,
                'predictions': predictions[:len(actual)],
                'actual': actual.tolist()
            }
        except:
            continue
    
    return accuracy_results

# Include router in main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
