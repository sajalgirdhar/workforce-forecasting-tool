import React, { useState } from "react";
import api from "./lib/api";

function Forecasting() {
  const [method, setMethod] = useState("arima");
  const [days, setDays] = useState(7);
  const [forecast, setForecast] = useState(null);

  const handleForecast = async () => {
    try {
      const res = await api.post("/api/forecast", {
        method,
        forecast_days: parseInt(days, 10),
        confidence_level: 0.95,
      });
      setForecast(res.data);
    } catch (err) {
      console.error("❌ Forecast error:", err);
      alert("Forecast request failed!");
    }
  };

  return (
    <div>
      <h2>📊 Forecasting</h2>

      <label>
        Method:
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="arima">ARIMA</option>
          <option value="exponential_smoothing">Exponential Smoothing</option>
          <option value="random_forest">Random Forest</option>
          <option value="linear_regression">Linear Regression</option>
          <option value="seasonal_decompose">Seasonal Decompose</option>
        </select>
      </label>

      <label>
        Days:
        <input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
      </label>

      <button onClick={handleForecast}>Generate Forecast</button>

      {forecast && (
        <div>
          <h3>Result ({forecast.method})</h3>
          <ul>
            {forecast.forecast_dates.map((date, idx) => (
              <li key={idx}>
                {date}: {Math.round(forecast.predicted_calls[idx])} calls (staff {forecast.staffing_recommendations[idx]})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Forecasting;
