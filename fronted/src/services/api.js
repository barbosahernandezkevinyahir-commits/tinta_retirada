import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
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