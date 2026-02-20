import React, { useState, useEffect } from 'react';

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
  const [runningApps, setRunningApps] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const loadApps = async () => {
      try {
        const apps = await window.stayzen.getRunningApps();
        setRunningApps(apps.sort());
      } catch (err) {
        console.error('Failed to load running apps:', err);
      }
    };

    loadApps();
  }, []);

  const handleStart = () => {
    if (appName.trim()) {
      onStart(appName.trim());
    }
  };

  const handleSelectApp = (app: string) => {
    setAppName(app);
    setShowDropdown(false);
  };

  const filteredApps = runningApps.filter(app => 
    app.toLowerCase().includes(appName.toLowerCase())
  );

  return (
    <div className={`section ${isActive ? 'active-section' : ''}`}>
      <div className="section-title">🖥 Monitor Application</div>
      
      <div className="input-group monitor-input-wrapper">
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
          {showDropdown && appName && filteredApps.length > 0 && !isActive && (
            <div className="dropdown">
              {filteredApps.slice(0, 8).map((app) => (
                <div
                  key={app}
                  className="dropdown-item"
                  onClick={() => handleSelectApp(app)}
                >
                  {app}
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
