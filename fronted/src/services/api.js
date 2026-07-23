import axios from "axios";

const fallbackApiUrl =
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "https://tintaretirada-production.up.railway.app/api"
        : "http://localhost:5000/api";

const rawApiUrl = import.meta.env.VITE_API_URL || fallbackApiUrl;
const baseURL = rawApiUrl.replace(/\/$/, "");

const api = axios.create({
    baseURL
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;