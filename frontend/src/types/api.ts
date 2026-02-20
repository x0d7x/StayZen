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
  getRunningApps: () => Promise<string[]>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    stayzen: StayZenAPI;
  }
}
