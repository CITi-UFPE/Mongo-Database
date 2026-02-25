import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Centralized axios instance with base URL
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
});

// Preserve any defaults set elsewhere (if needed)
export default axiosInstance;
