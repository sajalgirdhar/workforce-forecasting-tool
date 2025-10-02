import React, { useState } from "react";
import api from "./lib/api";

function DataManagement() {
  const [file, setFile] = useState(null);
  const [date, setDate] = useState("");
  const [callsVolume, setCallsVolume] = useState("");
  const [staffingLevel, setStaffingLevel] = useState("");
  const [serviceLevel, setServiceLevel] = useState("");

  // Upload CSV
  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a CSV file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file); // must be "file" to match FastAPI UploadFile

    try {
      const res = await api.post("/api/upload-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("✅ File uploaded successfully!");
      console.log(res.data);
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert("Upload failed!");
    }
  };

  // Manual Entry
  const handleManualSubmit = async () => {
    if (!date || !callsVolume || !staffingLevel || !serviceLevel) {
      alert("Please fill in all fields!");
      return;
    }

    try {
      const res = await api.post("/api/call-data", {
        date,
        calls_volume: parseInt(callsVolume, 10),
        staffing_level: parseInt(staffingLevel, 10),
        service_level: parseFloat(serviceLevel),
      });
      alert("✅ Manual entry saved!");
      console.log(res.data);
    } catch (err) {
      console.error("❌ Manual entry error:", err);
      alert("Failed to save manual entry!");
    }
  };

  return (
    <div>
      <h2>📂 Data Management</h2>

      <div>
        <h3>Upload CSV</h3>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleFileUpload}>Upload CSV</button>
      </div>

      <div>
        <h3>Manual Data Entry</h3>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="number" placeholder="Call Volume" value={callsVolume} onChange={(e) => setCallsVolume(e.target.value)} />
        <input type="number" placeholder="Staffing Level" value={staffingLevel} onChange={(e) => setStaffingLevel(e.target.value)} />
        <input type="number" step="0.01" placeholder="Service Level (0–1)" value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)} />
        <button onClick={handleManualSubmit}>Save Entry</button>
      </div>
    </div>
  );
}

export default DataManagement;
