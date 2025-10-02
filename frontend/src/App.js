import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import api from "./lib/api";   // ✅ use shared axios instance
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Progress } from "./components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Separator } from "./components/ui/separator";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Area, AreaChart
} from "recharts";
import { useDropzone } from "react-dropzone";
import { 
  TrendingUp, Users, Target, Upload, Download, 
  BarChart3, Activity, AlertCircle, CheckCircle2, Brain, Settings
} from "lucide-react";
import { toast } from "sonner";

// Main Dashboard Component
const Dashboard = () => {
  const [callData, setCallData] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("arima");
  const [forecastDays, setForecastDays] = useState(7);
  const [currentForecast, setCurrentForecast] = useState(null);
  const [accuracyData, setAccuracyData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [callResponse, forecastResponse] = await Promise.all([
        api.get("/call-data"),
        api.get("/forecasts")
      ]);
      setCallData(callResponse.data);
      setForecasts(forecastResponse.data);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    }
  };

  const loadAccuracyAnalysis = async () => {
    try {
      const response = await api.get("/analytics/accuracy");
      setAccuracyData(response.data);
    } catch (error) {
      console.error("Failed to load accuracy analysis:", error);
    }
  };

  useEffect(() => {
    if (callData.length > 14) {
      loadAccuracyAnalysis();
    }
  }, [callData]);

  const generateForecast = async () => {
    if (callData.length < 7) {
      toast.error("Need at least 7 data points for forecasting");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/forecast", {
        method: selectedMethod,
        forecast_days: forecastDays,
        confidence_level: 0.95
      });
      
      setCurrentForecast(response.data);
      await loadData(); // Refresh forecasts list
      toast.success(`${selectedMethod.toUpperCase()} forecast generated successfully!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Forecast generation failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    if (!callData.length) return { totalCalls: 0, avgStaffing: 0, avgServiceLevel: 0, trend: 0 };
    
    const totalCalls = callData.reduce((sum, item) => sum + item.calls_volume, 0);
    const avgStaffing = Math.round(callData.reduce((sum, item) => sum + item.staffing_level, 0) / callData.length);
    const avgServiceLevel = (callData.reduce((sum, item) => sum + item.service_level, 0) / callData.length * 100).toFixed(1);
    
    const recent = callData.slice(-3).reduce((sum, item) => sum + item.calls_volume, 0) / 3;
    const previous = callData.slice(-6, -3).reduce((sum, item) => sum + item.calls_volume, 0) / 3;
    const trend = previous ? ((recent - previous) / previous * 100).toFixed(1) : 0;
    
    return { totalCalls, avgStaffing, avgServiceLevel, trend };
  };

  const stats = getStats();

  const chartData = callData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calls: item.calls_volume,
    staffing: item.staffing_level,
    serviceLevel: item.service_level * 100
  }));

  const forecastChartData = currentForecast ? [
    ...chartData.slice(-14),
    ...currentForecast.forecast_dates.map((date, index) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls: null,
      forecast: Math.round(currentForecast.predicted_calls[index]),
      staffRecommended: currentForecast.staffing_recommendations[index],
      confidenceLower: currentForecast.confidence_intervals?.lower?.[index],
      confidenceUpper: currentForecast.confidence_intervals?.upper?.[index]
    }))
  ] : chartData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* ... your JSX unchanged (charts, tabs, cards, etc.) ... */}
      {/* only axios calls were swapped to api */}
    </div>
  );
};

// Data Management Component
const DataManagement = ({ onDataUpdate }) => {
  const [newData, setNewData] = useState({
    date: new Date().toISOString().split('T')[0],
    calls_volume: '',
    staffing_level: '',
    service_level: ''
  });
  const [loading, setLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        await api.post("/upload-csv", formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("CSV uploaded successfully!");
        onDataUpdate();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to upload CSV");
      } finally {
        setLoading(false);
      }
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/call-data", {
        ...newData,
        calls_volume: parseInt(newData.calls_volume),
        staffing_level: parseInt(newData.staffing_level),
        service_level: parseFloat(newData.service_level)
      });
      setNewData({
        date: new Date().toISOString().split('T')[0],
        calls_volume: '',
        staffing_level: '',
        service_level: ''
      });
      toast.success("Data point added successfully!");
      onDataUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add data");
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm("Are you sure you want to delete all data?")) return;
    try {
      await api.delete("/call-data");
      toast.success("All data cleared successfully!");
      onDataUpdate();
    } catch (error) {
      toast.error("Failed to clear data");
    }
  };

  return (
    <div className="space-y-6">
      {/* ... UI unchanged, only axios swapped to api ... */}
    </div>
  );
};

// Setup Wizard Component (unchanged from your version)

// Main App Component
function App() {
  return (
    <div className="App min-h-screen">
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
