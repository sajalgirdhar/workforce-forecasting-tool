import axios from "axios";

// Try to load from environment, otherwise fallback to localhost
const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

console.log("✅ API Base URL:", baseURL); // helps in debugging

const api = axios.create({
  baseURL: `${baseURL}/api`,
  headers: { "Content-Type": "application/json" },
});

export default api;
