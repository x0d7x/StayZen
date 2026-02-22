![StayZen](https://i.imgur.com/ALtspsx.jpeg)

# StayZen

A sleek macOS menu bar app that prevents your Mac from sleeping using the system `caffeinate` command.

## Features

- ⚡ **Quick Presets** - One-click keep awake for 30min, 1hr, or 2hr
- 🕒 **Time-Based** - Set a specific time until which your Mac stays awake
- 🖥 **App Monitoring** - Keep Mac awake while a specific app is running
- 🔔 **Notifications** - Get notified when sleep prevention starts/stops
- 🚀 **Launch at Login** - Auto-start when you log in
- 📌 **Menu Bar** - Runs quietly in your menu bar
- 📊 **History** - Track total time and sessions

## TODO

- [x] Add app icons to dropdown
- [x] Add History to view total time and past sessions

## Download

Get the latest release from the [Releases page](https://github.com/x0d7x/StayZen/releases).

## Usage

1. **Quick Start**: Click 30m, 1h, or 2h buttons for preset durations
2. **Custom Time**: Select a specific time using the time picker
3. **Monitor App**: Enter an app name to keep Mac awake while that app runs
4. **Stop**: Click "Stop All" to immediately stop preventing sleep
5. **Settings**: Toggle "Launch at Login" to start automatically

The app runs in your menu bar - click the icon to show/hide the window. Right-click for quick options.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Go
- **Desktop**: Electron
- **System**: macOS caffeinate, pgrep

## License

MIT
