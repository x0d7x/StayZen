import { contextBridge, ipcRenderer } from 'electron';

export interface Status {
  mode: 'time' | 'monitor' | 'idle';
  active: boolean;
  remaining_seconds: number;
  app_name: string;
  started_at: string;
}

export interface StayZenAPI {
  startTimeMode: (seconds: number) => Promise<Status>;
  startMonitorMode: (appName: string) => Promise<Status>;
  stop: () => Promise<Status>;
  getStatus: () => Promise<Status>;
  getRunningApps: () => Promise<AppInfo[]>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<{ success: boolean }>;
  getHistory: () => Promise<{ entries: HistoryEntry[]; total_seconds: number }>;
}

export interface AppInfo {
  name: string;
  path: string;
}

export interface HistoryEntry {
  id: number;
  mode: string;
  app_name: string;
  duration: number;
  started_at: string;
  ended_at: string;
}

const api: StayZenAPI = {
  startTimeMode: (seconds: number) => ipcRenderer.invoke('stayzen:startTimeMode', seconds),
  startMonitorMode: (appName: string) => ipcRenderer.invoke('stayzen:startMonitorMode', appName),
  stop: () => ipcRenderer.invoke('stayzen:stop'),
  getStatus: () => ipcRenderer.invoke('stayzen:getStatus'),
  getRunningApps: () => ipcRenderer.invoke('stayzen:getRunningApps'),
  getAutoLaunch: () => ipcRenderer.invoke('stayzen:getAutoLaunch'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('stayzen:setAutoLaunch', enabled),
  getHistory: () => ipcRenderer.invoke('stayzen:getHistory'),
};

contextBridge.exposeInMainWorld('stayzen', api);
