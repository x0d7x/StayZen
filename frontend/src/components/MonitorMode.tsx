import React, { useState, useEffect, useRef } from 'react';
import { AppInfo } from '../types/api';
import { stayzen } from '../api';

interface MonitorModeProps {
  onStart: (appName: string) => void;
  disabled: boolean;
  isActive: boolean;
  currentApp: string;
}

const MonitorMode: React.FC<MonitorModeProps> = ({ 
  onStart, 
  disabled, 
  isActive, 
  currentApp 
}) => {
  const [appName, setAppName] = useState('');
  const [runningApps, setRunningApps] = useState<AppInfo[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadApps = async () => {
      try {
        const apps = await stayzen.getRunningApps();
        setRunningApps(apps.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Failed to load running apps:', err);
      }
    };

    loadApps();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStart = () => {
    if (appName.trim()) {
      onStart(appName.trim());
    }
  };

  const handleSelectApp = (app: AppInfo) => {
    setAppName(app.name);
    setShowDropdown(false);
  };

  const filteredApps = runningApps.filter(app => 
    app.name.toLowerCase().includes(appName.toLowerCase())
  );

  return (
    <div className={`section ${isActive ? 'active-section' : ''}`}>
      <div className="section-title">🖥 Monitor Application</div>
      
      <div className="input-group monitor-input-wrapper" ref={dropdownRef}>
        <div className="select-wrapper">
          <input
            type="text"
            placeholder="Select or type app name..."
            value={appName}
            onChange={(e) => {
              setAppName(e.target.value);
              setShowDropdown(true);
            }}
            disabled={disabled || isActive}
            onFocus={() => setShowDropdown(true)}
            onKeyPress={(e) => e.key === 'Enter' && handleStart()}
          />
          {showDropdown && !isActive && runningApps.length > 0 && (
            <div className="dropdown">
              {filteredApps.slice(0, 8).map((app) => (
                <div
                  key={app.name}
                  className="dropdown-item"
                  onClick={() => handleSelectApp(app)}
                >
                  <span className="app-icon">
                    <span className="app-icon-placeholder">📦</span>
                  </span>
                  <span className="app-name">{app.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={handleStart}
          disabled={disabled || isActive || !appName.trim()}
        >
          {disabled ? 'Starting...' : 'Monitor'}
        </button>
      </div>

      {isActive && currentApp && (
        <div className="active-indicator">
          <span>👁</span>
          <span>Monitoring: <strong>{currentApp}</strong></span>
        </div>
      )}
    </div>
  );
};

export default MonitorMode;
