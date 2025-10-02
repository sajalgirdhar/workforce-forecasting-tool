import axios from "axios";

// ✅ Read from .env (Netlify/Render) or fallback to localhost
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
