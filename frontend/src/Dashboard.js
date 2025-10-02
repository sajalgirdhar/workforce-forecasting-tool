import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Activity, TrendingUp, Users, Target, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Dashboard() {
  const [callData, setCallData] = useState([]);
  const [forecasts, setForecasts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [callResponse, forecastResponse] = await Promise.all([
        axios.get(`${API}/call-data`),
        axios.get(`${API}/forecasts`)
      ]);
      setCallData(callResponse.data);
      setForecasts(forecastResponse.data);
    } catch (error) {
      toast.error("Failed to load data");
    }
  };

  const stats = {
    totalCalls: callData.reduce((sum, i) => sum + i.calls_volume, 0),
    avgStaffing: callData.length ? Math.round(callData.reduce((s, i) => s + i.staffing_level, 0) / callData.length) : 0,
    avgServiceLevel: callData.length ? ((callData.reduce((s, i) => s + i.service_level, 0) / callData.length) * 100).toFixed(1) : 0
  };

  const chartData = callData.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    calls: item.calls_volume,
    staffing: item.staffing_level,
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">📊 Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent><p>Total Calls: {stats.totalCalls}</p></CardContent></Card>
        <Card><CardContent><p>Avg Staffing: {stats.avgStaffing}</p></CardContent></Card>
        <Card><CardContent><p>Service Level: {stats.avgServiceLevel}%</p></CardContent></Card>
      </div>

      {/* Line Chart */}
      <Card>
        <CardHeader><CardTitle>Historical Trends</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="calls" stroke="#3b82f6" name="Calls" />
              <Line type="monotone" dataKey="staffing" stroke="#10b981" name="Staffing" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Forecasts */}
      <Card>
        <CardHeader><CardTitle>Recent Forecasts</CardTitle></CardHeader>
        <CardContent>
          {forecasts.length > 0 ? forecasts.slice(0, 5).map((f, i) => (
            <div key={i} className="flex justify-between">
              <p>{f.method.toUpperCase()} - {f.forecast_dates.length} days</p>
              <Badge>{new Date(f.timestamp).toLocaleDateString()}</Badge>
            </div>
          )) : <p>No forecasts yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
