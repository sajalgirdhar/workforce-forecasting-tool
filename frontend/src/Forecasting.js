import React, { useState } from "react";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Forecasting() {
  const [method, setMethod] = useState("arima");
  const [days, setDays] = useState(7);

  const generateForecast = async () => {
    try {
      await axios.post(`${API}/forecast`, { method, forecast_days: days, confidence_level: 0.95 });
      toast.success("Forecast generated!");
    } catch (err) {
      toast.error("Failed to generate forecast");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">📊 Forecasting</h1>
      <Card>
        <CardHeader><CardTitle>Generate Forecast</CardTitle></CardHeader>
        <CardContent className="flex gap-4">
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="arima">ARIMA</SelectItem>
              <SelectItem value="exponential_smoothing">Exponential Smoothing</SelectItem>
              <SelectItem value="random_forest">Random Forest</SelectItem>
              <SelectItem value="linear_regression">Linear Regression</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" min="1" max="30" value={days} onChange={(e) => setDays(parseInt(e.target.value))} />
          <Button onClick={generateForecast} className="bg-blue-600">Generate</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default Forecasting;
