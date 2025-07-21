// src/api/axiosInstance.ts
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios'; // 🌟🌟🌟 جدید: import کردن AxiosRequestConfig 🌟🌟🌟

// یک نمونه از Axios ایجاد کنید
const axiosInstance = axios.create({
  // baseURL: 'http://your-default-api-base-url.com/api/',
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config: AxiosRequestConfig) => { // 🌟🌟🌟 تغییر: نوع config را به AxiosRequestConfig مشخص کنید 🌟🌟🌟
    const authToken = localStorage.getItem('authToken');

    // 🌟🌟🌟 اصلاح منطق: مطمئن شوید config.headers یک آبجکت است 🌟🌟🌟
    if (!config.headers) {
      config.headers = {}; // اگر headers وجود ندارد، آن را به یک آبجکت خالی مقداردهی اولیه کنید
    }

    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized: Session expired or invalid token. Redirecting to login.');
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;