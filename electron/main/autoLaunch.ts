import { app } from 'electron';
import log from 'electron-log';

const appName = 'StayZen';

export const autoLaunch = {
  isEnabled: (): boolean => {
    const settings = app.getLoginItemSettings({
      path: process.execPath,
      args: []
    });
    return settings.openAtLogin;
  },

  enable: async (): Promise<void> => {
    log.info('Enabling auto-launch at login');
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: []
    });
  },

  disable: async (): Promise<void> => {
    log.info('Disabling auto-launch at login');
    app.setLoginItemSettings({
      openAtLogin: false,
      path: process.execPath,
      args: []
    });
  }
};
