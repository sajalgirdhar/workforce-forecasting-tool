import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import axios from "axios";
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
  BarChart, Bar, ReferenceLine, Area, AreaChart
} from "recharts";
import { useDropzone } from "react-dropzone";
import { 
  Calendar, TrendingUp, Users, Target, Upload, Download, 
  BarChart3, Activity, AlertCircle, CheckCircle2, Brain, Settings
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
        axios.get('https://workforce-forecasting-tool-1.onrender.com/api/call-data')
axios.get('https://workforce-forecasting-tool-1.onrender.com/api/forecasts')
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
      const response = await axios.get(`${API}/analytics/accuracy`);
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
      const response = await axios.post(`${API}/forecast`, {
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
    
    // Calculate trend (last 3 vs previous 3)
    const recent = callData.slice(-3).reduce((sum, item) => sum + item.calls_volume, 0) / 3;
    const previous = callData.slice(-6, -3).reduce((sum, item) => sum + item.calls_volume, 0) / 3;
    const trend = previous ? ((recent - previous) / previous * 100).toFixed(1) : 0;
    
    return { totalCalls, avgStaffing, avgServiceLevel, trend };
  };

  const stats = getStats();

  // Prepare chart data
  const chartData = callData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calls: item.calls_volume,
    staffing: item.staffing_level,
    serviceLevel: item.service_level * 100
  }));

  const forecastChartData = currentForecast ? [
    ...chartData.slice(-14), // Last 14 days of historical data
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
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Call Center Forecasting Dashboard
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Advanced analytics and AI-powered forecasting for workforce management and capacity planning
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Calls</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalCalls.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg Staffing</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.avgStaffing}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Service Level</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.avgServiceLevel}%</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Trend</p>
                  <p className={`text-2xl font-bold ${parseFloat(stats.trend) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.trend}%
                  </p>
                </div>
                <TrendingUp className={`h-8 w-8 ${parseFloat(stats.trend) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/70 backdrop-blur-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="forecast" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Forecasting
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Data Management
            </TabsTrigger>
            <TabsTrigger value="accuracy" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Model Accuracy
            </TabsTrigger>
            <TabsTrigger value="wizard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Setup Wizard
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Historical Call Volume & Staffing Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 12}} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="calls" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Call Volume"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="staffing" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Staffing Level"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Service Level Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{fontSize: 12}} />
                        <YAxis domain={[0, 100]} tick={{fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="serviceLevel" 
                          stroke="#8b5cf6" 
                          fill="#8b5cf6" 
                          fillOpacity={0.3}
                          name="Service Level %"
                        />
                        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="5 5" label="Target 80%" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Recent Forecasts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {forecasts.slice(0, 5).map((forecast, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{forecast.method.toUpperCase()}</p>
                          <p className="text-xs text-slate-600">
                            {forecast.forecast_dates?.length} days forecast
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(forecast.timestamp).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))}
                    {forecasts.length === 0 && (
                      <p className="text-slate-600 text-center py-4">No forecasts generated yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Forecasting Tab */}
          <TabsContent value="forecast" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI-Powered Forecasting Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Forecasting Method</label>
                    <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                      <SelectTrigger data-testid="forecast-method-select">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arima">ARIMA (Time Series)</SelectItem>
                        <SelectItem value="exponential_smoothing">Exponential Smoothing</SelectItem>
                        <SelectItem value="random_forest">Random Forest (ML)</SelectItem>
                        <SelectItem value="linear_regression">Linear Regression</SelectItem>
                        <SelectItem value="seasonal_decompose">Seasonal Decomposition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Forecast Period (Days)</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={forecastDays}
                      onChange={(e) => setForecastDays(parseInt(e.target.value))}
                      data-testid="forecast-days-input"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={generateForecast}
                      disabled={loading || callData.length < 7}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      data-testid="generate-forecast-btn"
                    >
                      {loading ? "Generating..." : "Generate Forecast"}
                    </Button>
                  </div>
                </div>

                {callData.length < 7 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Insufficient Data</AlertTitle>
                    <AlertDescription>
                      At least 7 data points are required for forecasting. Current: {callData.length}
                    </AlertDescription>
                  </Alert>
                )}

                {currentForecast && (
                  <div className="space-y-4">
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Forecast Results - {currentForecast.method.toUpperCase()}</h3>
                      <Badge className="bg-green-100 text-green-800">
                        Generated {new Date(currentForecast.timestamp).toLocaleString()}
                      </Badge>
                    </div>

                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                      <CardContent className="p-6">
                        <div className="h-80 mb-6">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forecastChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="date" tick={{fontSize: 12}} />
                              <YAxis tick={{fontSize: 12}} />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: 'none',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="calls" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                name="Historical Calls"
                                connectNulls={false}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="forecast" 
                                stroke="#f59e0b" 
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                name="Forecast"
                                connectNulls={false}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="staffRecommended" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                name="Recommended Staff"
                                connectNulls={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Accuracy Metrics */}
                        {currentForecast.accuracy_metrics && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {Object.entries(currentForecast.accuracy_metrics).map(([metric, value]) => (
                              value !== null && (
                                <div key={metric} className="bg-white/70 p-4 rounded-lg">
                                  <p className="text-sm font-medium text-slate-600 uppercase">
                                    {metric.replace('_', ' ')}
                                  </p>
                                  <p className="text-xl font-bold">
                                    {typeof value === 'number' ? value.toFixed(2) : value}
                                  </p>
                                </div>
                              )
                            ))}
                          </div>
                        )}

                        {/* Staffing Recommendations */}
                        <div className="space-y-3">
                          <h4 className="font-semibold">Staffing Recommendations</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {currentForecast.forecast_dates.slice(0, 7).map((date, index) => (
                              <Card key={index} className="bg-white/70">
                                <CardContent className="p-4">
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-slate-600">
                                      {new Date(date).toLocaleDateString('en-US', { 
                                        weekday: 'short', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </p>
                                    <p className="text-lg font-bold text-blue-600">
                                      {Math.round(currentForecast.predicted_calls[index])} calls
                                    </p>
                                    <p className="text-sm text-green-600">
                                      {currentForecast.staffing_recommendations[index]} staff
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data">
            <DataManagement onDataUpdate={loadData} />
          </TabsContent>

          {/* Model Accuracy Tab */}
          <TabsContent value="accuracy" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Forecasting Model Accuracy Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                {accuracyData && Object.keys(accuracyData).length > 0 ? (
                  <div className="space-y-6">
                    {/* Accuracy Metrics Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(accuracyData).map(([method, data]) => (
                        <Card key={method} className="bg-gradient-to-br from-white to-slate-50">
                          <CardContent className="p-4">
                            <div className="text-center space-y-2">
                              <h4 className="font-semibold text-sm uppercase">{method.replace('_', ' ')}</h4>
                              <div className="space-y-1">
                                <p className="text-xs text-slate-600">MAE</p>
                                <p className="text-lg font-bold text-blue-600">{data.mae?.toFixed(2)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-slate-600">RMSE</p>
                                <p className="text-lg font-bold text-purple-600">{data.rmse?.toFixed(2)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Predictions vs Actual Chart */}
                    <Card className="bg-white/70">
                      <CardHeader>
                        <CardTitle>Predictions vs Actual (Last 7 Days)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={Object.values(accuracyData)[0]?.actual?.map((actual, index) => ({
                              day: `Day ${index + 1}`,
                              actual,
                              ...Object.fromEntries(
                                Object.entries(accuracyData).map(([method, data]) => [
                                  method,
                                  data.predictions?.[index]
                                ])
                              )
                            })) || []}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="day" tick={{fontSize: 12}} />
                              <YAxis tick={{fontSize: 12}} />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="actual" stroke="#1f2937" strokeWidth={3} name="Actual" />
                              <Line type="monotone" dataKey="arima" stroke="#3b82f6" strokeWidth={2} name="ARIMA" />
                              <Line type="monotone" dataKey="exponential_smoothing" stroke="#10b981" strokeWidth={2} name="Exp. Smoothing" />
                              <Line type="monotone" dataKey="random_forest" stroke="#f59e0b" strokeWidth={2} name="Random Forest" />
                              <Line type="monotone" dataKey="linear_regression" stroke="#8b5cf6" strokeWidth={2} name="Linear Reg." />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Accuracy analysis requires at least 14 data points</p>
                    <p className="text-sm text-slate-500">Current data points: {callData.length}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Setup Wizard Tab */}
          <TabsContent value="wizard">
            <SetupWizard />
          </TabsContent>
        </Tabs>
      </div>
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
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      const file = acceptedFiles[0];
      setLoading(true);
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        await axios.post(`${API}/upload-csv`, formData, {
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
      await axios.post(`${API}/call-data`, {
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
    if (!confirm("Are you sure you want to delete all data? This action cannot be undone.")) return;
    
    try {
      await axios.delete(`${API}/call-data`);
      toast.success("All data cleared successfully!");
      onDataUpdate();
    } catch (error) {
      toast.error("Failed to clear data");
    }
  };

  return (
    <div className="space-y-6">
      {/* Manual Data Entry */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manual Data Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={newData.date}
                onChange={(e) => setNewData({...newData, date: e.target.value})}
                required
                data-testid="data-entry-date"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Call Volume</label>
              <Input
                type="number"
                placeholder="150"
                value={newData.calls_volume}
                onChange={(e) => setNewData({...newData, calls_volume: e.target.value})}
                required
                data-testid="data-entry-calls"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Staffing Level</label>
              <Input
                type="number"
                placeholder="12"
                value={newData.staffing_level}
                onChange={(e) => setNewData({...newData, staffing_level: e.target.value})}
                required
                data-testid="data-entry-staffing"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Level (0-1)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="0.85"
                value={newData.service_level}
                onChange={(e) => setNewData({...newData, service_level: e.target.value})}
                required
                data-testid="data-entry-service-level"
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="add-data-btn"
              >
                {loading ? "Adding..." : "Add Data"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* CSV Upload */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV File Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            data-testid="csv-upload-zone"
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="text-slate-600 mb-2">Drag & drop a CSV file here, or click to select</p>
                <p className="text-sm text-slate-500">
                  Required columns: date, calls_volume, staffing_level, service_level
                </p>
              </div>
            )}
          </div>
          
          {loading && (
            <div className="mt-4 text-center">
              <Progress value={50} className="w-full mb-2" />
              <p className="text-sm text-slate-600">Processing CSV file...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Management Actions */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant="destructive" 
              onClick={clearAllData}
              data-testid="clear-all-data-btn"
            >
              Clear All Data
            </Button>
            <Button variant="outline" data-testid="export-data-btn">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Setup Wizard Component
const SetupWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    businessType: '',
    avgCallsPerDay: '',
    peakHours: '',
    targetServiceLevel: '0.8',
    currentStaffing: ''
  });

  const steps = [
    { number: 1, title: "Business Information", description: "Tell us about your call center" },
    { number: 2, title: "Call Patterns", description: "Define your typical call patterns" },
    { number: 3, title: "Performance Targets", description: "Set your service level goals" },
    { number: 4, title: "Setup Complete", description: "Review and finalize" }
  ];

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Call Center Setup Wizard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= step.number ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > step.number ? <CheckCircle2 className="h-6 w-6" /> : step.number}
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 ${
                  currentStep > step.number ? 'bg-blue-600' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Business Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Business Type</label>
                  <Select value={wizardData.businessType} onValueChange={(value) => 
                    setWizardData({...wizardData, businessType: value})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer-service">Customer Service</SelectItem>
                      <SelectItem value="technical-support">Technical Support</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="helpdesk">Help Desk</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Average Calls Per Day</label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={wizardData.avgCallsPerDay}
                    onChange={(e) => setWizardData({...wizardData, avgCallsPerDay: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Call Patterns</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Peak Hours</label>
                  <Select value={wizardData.peakHours} onValueChange={(value) => 
                    setWizardData({...wizardData, peakHours: value})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select peak hours" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (8AM-12PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12PM-5PM)</SelectItem>
                      <SelectItem value="evening">Evening (5PM-9PM)</SelectItem>
                      <SelectItem value="all-day">All Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Current Staffing Level</label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={wizardData.currentStaffing}
                    onChange={(e) => setWizardData({...wizardData, currentStaffing: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Performance Targets</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Target Service Level</label>
                  <Select value={wizardData.targetServiceLevel} onValueChange={(value) => 
                    setWizardData({...wizardData, targetServiceLevel: value})
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.7">70% - Basic</SelectItem>
                      <SelectItem value="0.8">80% - Good</SelectItem>
                      <SelectItem value="0.9">90% - Excellent</SelectItem>
                      <SelectItem value="0.95">95% - Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Setup Complete!</h3>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Configuration Summary</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Business Type:</strong> {wizardData.businessType}</p>
                  <p><strong>Average Daily Calls:</strong> {wizardData.avgCallsPerDay}</p>
                  <p><strong>Peak Hours:</strong> {wizardData.peakHours}</p>
                  <p><strong>Target Service Level:</strong> {(parseFloat(wizardData.targetServiceLevel) * 100).toFixed(0)}%</p>
                  <p><strong>Current Staff:</strong> {wizardData.currentStaffing}</p>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Next Steps</AlertTitle>
                <AlertDescription>
                  Start adding historical call data to enable accurate forecasting. Upload a CSV file or add data manually.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          <Button 
            onClick={nextStep} 
            disabled={currentStep === 4}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {currentStep === 4 ? "Complete" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

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
