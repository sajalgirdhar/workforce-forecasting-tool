import React, { useState } from "react";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Upload, Download } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function DataManagement() {
  const [newData, setNewData] = useState({ date: "", calls_volume: "", staffing_level: "", service_level: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/call-data`, {
        ...newData,
        calls_volume: parseInt(newData.calls_volume),
        staffing_level: parseInt(newData.staffing_level),
        service_level: parseFloat(newData.service_level)
      });
      toast.success("Data added successfully!");
    } catch (err) {
      toast.error("Failed to add data");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">📂 Data Management</h1>

      <Card>
        <CardHeader><CardTitle>Manual Data Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <Input type="date" value={newData.date} onChange={(e) => setNewData({ ...newData, date: e.target.value })} required />
            <Input type="number" placeholder="Calls" value={newData.calls_volume} onChange={(e) => setNewData({ ...newData, calls_volume: e.target.value })} required />
            <Input type="number" placeholder="Staffing" value={newData.staffing_level} onChange={(e) => setNewData({ ...newData, staffing_level: e.target.value })} required />
            <Input type="number" placeholder="Service Level (0-1)" value={newData.service_level} onChange={(e) => setNewData({ ...newData, service_level: e.target.value })} required />
            <Button type="submit" className="bg-green-600">Add Data</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upload CSV</CardTitle></CardHeader>
        <CardContent>
          <Button><Upload className="h-4 w-4 mr-2" /> Upload CSV</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data Actions</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export Data</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default DataManagement;
