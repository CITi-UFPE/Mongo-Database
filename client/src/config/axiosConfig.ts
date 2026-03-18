import axios, { AxiosInstance } from 'axios';

const envApiUrl = (import.meta.env.VITE_API_URL ?? '').trim();
const API_URL = import.meta.env.DEV
  ? 'http://localhost:5000'
  : envApiUrl || 'http://localhost:5000';

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const removeApiSuffix = (value: string): string => value.replace(/\/api\/?$/, '');

// Centralized axios instance with base URL
const axiosInstance: AxiosInstance = axios.create({
  baseURL: normalizeBaseUrl(API_URL),
});

axiosInstance.interceptors.request.use((config) => {
  const requestUrl = typeof config.url === 'string' ? config.url : '';
  const base = normalizeBaseUrl((config.baseURL as string) || API_URL);

  if (base.endsWith('/api') && requestUrl.startsWith('/api/')) {
    config.url = requestUrl.replace(/^\/api/, '');
  }

  if (base.endsWith('/api') && requestUrl.startsWith('/auth/')) {
    config.baseURL = removeApiSuffix(base);
  }

  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// Preserve any defaults set elsewhere (if needed)
export default axiosInstance;
