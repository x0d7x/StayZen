import { app, BrowserWindow, ipcMain, Tray, Menu, Notification, nativeImage, NativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess, execSync } from 'child_process';
import log from 'electron-log';
import { autoLaunch } from './autoLaunch';

log.transports.file.level = 'info';
log.transports.console.level = 'info';
log.info('StayZen starting...');

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let backendProcess: ChildProcess | null = null;
let backendPort = '8080';
let currentStatus: Status = { mode: 'idle', active: false, remaining_seconds: 0, app_name: '', started_at: '' };
let autoStartEnabled = false;

interface Status {
  mode: string;
  active: boolean;
  remaining_seconds: number;
  app_name: string;
  started_at: string;
}

const API_BASE = `http://127.0.0.1:${backendPort}`;

function getBackendPath(): string {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'backend', 'stayzen');
  }
  if (process.platform === 'darwin') {
    return path.join(process.resourcesPath, 'stayzen');
  }
  return path.join(process.resourcesPath, 'stayzen');
}

function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendPath = getBackendPath();
    log.info(`Starting backend from: ${backendPath}`);

    if (!fs.existsSync(backendPath)) {
      log.error(`Backend binary not found at: ${backendPath}`);
      reject(new Error('Backend binary not found'));
      return;
    }

    const env = { ...process.env, STAYZEN_PORT: backendPort };
    backendProcess = spawn(backendPath, [], {
      env,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    backendProcess.stdout?.on('data', (data) => {
      log.info(`Backend: ${data.toString().trim()}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      log.error(`Backend error: ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
      log.error(`Backend process error: ${err.message}`);
      reject(err);
    });

    backendProcess.on('exit', (code) => {
      log.info(`Backend process exited with code: ${code}`);
    });

    let attempts = 0;
    const maxAttempts = 20;

    const checkBackend = () => {
      attempts++;
      fetch(`${API_BASE}/health`)
        .then(() => {
          log.info('Backend is ready');
          resolve();
        })
        .catch(() => {
          if (attempts < maxAttempts) {
            setTimeout(checkBackend, 500);
          } else {
            reject(new Error('Backend failed to start'));
          }
        });
    };

    setTimeout(checkBackend, 1000);
  });
}

function stopBackend(): void {
  if (backendProcess) {
    log.info('Stopping backend...');
    try {
      if (process.platform === 'darwin') {
        execSync(`pkill -f stayzen`, { stdio: 'ignore' });
      }
    } catch (e) {
      // Ignore errors
    }
    backendProcess.kill();
    backendProcess = null;
  }
}

async function apiRequest<T>(endpoint: string, method: string, body?: object): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function createTrayIcon(): NativeImage {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cx = size / 2;
      const cy = size / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      
      if (dist < size / 2 - 1) {
        canvas[idx] = 88;
        canvas[idx + 1] = 86;
        canvas[idx + 2] = 214;
        canvas[idx + 3] = 255;
      } else {
        canvas[idx + 3] = 0;
      }
    }
  }
  
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function updateTrayMenu() {
  if (!tray) return;
  
  const statusText = currentStatus.active 
    ? currentStatus.mode === 'time' 
      ? `Active (${formatTime(currentStatus.remaining_seconds)})`
      : `Monitoring: ${currentStatus.app_name}`
    : 'Idle';
  
  const contextMenu = Menu.buildFromTemplate([
    { label: `StayZen - ${statusText}`, enabled: false },
    { type: 'separator' },
    { label: 'Open Window', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      stopBackend();
      app.exit(0);
    }}
  ]);
  
  tray.setContextMenu(contextMenu);
  
  const iconName = currentStatus.active ? '⚡' : '💤';
  tray.setToolTip(`StayZen - ${statusText}`);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 560,
    resizable: false,
    frame: true,
    center: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('StayZen');
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
  
  updateTrayMenu();
}

app.whenReady().then(async () => {
  log.info('App is ready');

  try {
    await startBackend();
    createTray();
    createWindow();
    
    autoStartEnabled = autoLaunch.isEnabled();
  } catch (error) {
    log.error('Failed to start app:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close, stay in tray
});

app.on('before-quit', () => {
  stopBackend();
});

ipcMain.handle('stayzen:startTimeMode', async (_, seconds: number) => {
  try {
    const result = await apiRequest<Status>('/keep-awake-until', 'POST', { seconds });
    currentStatus = result;
    updateTrayMenu();
    showNotification('StayZen', `Keeping Mac awake for ${formatTime(seconds)}`);
    return result;
  } catch (error) {
    log.error('startTimeMode error:', error);
    throw error;
  }
});

ipcMain.handle('stayzen:startMonitorMode', async (_, appName: string) => {
  try {
    const result = await apiRequest<Status>('/monitor-app', 'POST', { app_name: appName });
    currentStatus = result;
    updateTrayMenu();
    showNotification('StayZen', `Monitoring ${appName} - will keep Mac awake while running`);
    return result;
  } catch (error) {
    log.error('startMonitorMode error:', error);
    throw error;
  }
});

ipcMain.handle('stayzen:stop', async () => {
  try {
    const result = await apiRequest<Status>('/stop', 'POST');
    currentStatus = result;
    updateTrayMenu();
    showNotification('StayZen', 'Sleep prevention stopped');
    return result;
  } catch (error) {
    log.error('stop error:', error);
    throw error;
  }
});

ipcMain.handle('stayzen:getStatus', async () => {
  try {
    const result = await apiRequest<Status>('/status', 'GET');
    currentStatus = result;
    updateTrayMenu();
    return result;
  } catch (error) {
    log.error('getStatus error:', error);
    throw error;
  }
});

ipcMain.handle('stayzen:getRunningApps', async () => {
  try {
    const response = await apiRequest<{ apps: string[] }>('/running-apps', 'GET');
    return response.apps;
  } catch (error) {
    log.error('getRunningApps error:', error);
    throw error;
  }
});

ipcMain.handle('stayzen:getAutoLaunch', async () => {
  return autoStartEnabled;
});

ipcMain.handle('stayzen:setAutoLaunch', async (_, enabled: boolean) => {
  try {
    if (enabled) {
      await autoLaunch.enable();
    } else {
      await autoLaunch.disable();
    }
    autoStartEnabled = enabled;
    return { success: true };
  } catch (error) {
    log.error('setAutoLaunch error:', error);
    throw error;
  }
});

ipcMain.handle('stayzen:getHistory', async () => {
  try {
    const response = await apiRequest<{ entries: HistoryEntry[]; total_seconds: number }>('/history', 'GET');
    return response;
  } catch (error) {
    log.error('getHistory error:', error);
    throw error;
  }
});

interface HistoryEntry {
  id: number;
  mode: string;
  app_name: string;
  duration: number;
  started_at: string;
  ended_at: string;
}
