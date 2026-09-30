import axios from "axios";

// Use a same-origin path by default. This lets Vite (development) and nginx
// (Docker production) proxy API traffic without exposing the backend port to
// the browser. An explicitly configured non-empty VITE_API_URL still wins.
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const BASE_URL = configuredApiUrl || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 120000, // 2 minutes to handle longer ML/embedding operations
});

// Attach JWT + debug log on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data ?? "");
    return config;
  },
  (err) => Promise.reject(err)
);

// Handle 401 globally — clear storage and redirect
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    return Promise.reject(err);
  }
);

export default api;
