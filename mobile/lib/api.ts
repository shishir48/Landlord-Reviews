import axios from 'axios';
import { getIdToken } from 'firebase/auth';
import { auth } from './auth';
import { Config } from '../constants/Config';

export const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async config => {
  const user = auth.currentUser;
  if (user) {
    const token = await getIdToken(user);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});