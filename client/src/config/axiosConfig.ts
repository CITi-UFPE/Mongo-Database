import axios, { AxiosInstance } from 'axios';

const envApiUrl = (import.meta.env.VITE_API_URL ?? '').trim();
const API_URL = import.meta.env.DEV
  ? 'http://localhost:5000'
  : envApiUrl || '';

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const removeApiSuffix = (value: string): string => value.replace(/\/api\/?$/, '');

const getStoredAuthToken = (): string | null => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return null;
  }

  const normalized = token.trim();
  return normalized.length > 0 ? normalized : null;
};

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

  const token = getStoredAuthToken();
  const hasAuthorizationHeader = Boolean(config.headers && 'Authorization' in config.headers);

  if (token && !hasAuthorizationHeader) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// Preserve any defaults set elsewhere (if needed)
export default axiosInstance;
