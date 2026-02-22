import { Status, AppInfo, HistoryData, StayZenAPI } from './types/api';

const API_BASE = '/api';

const fetchApi = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
};

const webAPI: StayZenAPI = {
  startTimeMode: (seconds: number) => 
    fetchApi<Status>('/keep-awake-until', {
      method: 'POST',
      body: JSON.stringify({ seconds }),
    }),
  startMonitorMode: (appName: string) => 
    fetchApi<Status>('/monitor-app', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName }),
    }),
  stop: () => fetchApi<Status>('/stop', { method: 'POST' }),
  getStatus: () => fetchApi<Status>('/status'),
  getRunningApps: () => fetchApi<{ apps: AppInfo[] }>('/running-apps').then(res => res.apps),
  getAutoLaunch: () => Promise.resolve(false),
  setAutoLaunch: () => Promise.resolve({ success: true }),
  getHistory: () => fetchApi<HistoryData>('/history'),
};

export const stayzen = window.stayzen || webAPI;
