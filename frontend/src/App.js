import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./Dashboard";
import DataManagement from "./DataManagement";
import Forecasting from "./Forecasting";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        {/* Navigation Bar */}
        <nav className="bg-white shadow p-4 flex gap-6">
          <Link to="/" className="text-blue-600 hover:underline">🏠 Dashboard</Link>
          <Link to="/forecast" className="text-blue-600 hover:underline">📊 Forecasting</Link>
          <Link to="/data" className="text-blue-600 hover:underline">📂 Data Management</Link>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/forecast" element={<Forecasting />} />
          <Route path="/data" element={<DataManagement />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
