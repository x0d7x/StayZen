import React, { useState, useEffect } from 'react';

interface SettingsProps {
  autoStart: boolean;
  onAutoStartChange: (enabled: boolean) => void;
}

const isElectron = typeof window !== 'undefined' && window.stayzen !== undefined;

const Settings: React.FC<SettingsProps> = ({ autoStart, onAutoStartChange }) => {
  const [enabled, setEnabled] = useState(autoStart);

  useEffect(() => {
    setEnabled(autoStart);
  }, [autoStart]);

  const handleToggle = () => {
    if (!isElectron) {
      return;
    }
    const newValue = !enabled;
    setEnabled(newValue);
    onAutoStartChange(newValue);
  };

  if (!isElectron) {
    return (
      <div className="settings-section">
        <div className="download-banner">
          <div className="download-icon">⚡</div>
          <div className="download-content">
            <div className="download-title">Get the Desktop App</div>
            <div className="download-desc">
              Unlock all features including Launch at Login, system tray, and more.
            </div>
          </div>
          <a 
            href="https://github.com/x0d7x/StayZen" 
            target="_blank" 
            rel="noopener noreferrer"
            className="download-btn"
          >
            Download for Mac →
          </a>
        </div>
        <div className="features-list">
          <div className="feature-item">
            <span>🚀</span>
            <span>Launch at Login</span>
          </div>
          <div className="feature-item">
            <span>📌</span>
            <span>Menu Bar Access</span>
          </div>
          <div className="feature-item">
            <span>🔔</span>
            <span>Native Notifications</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="setting-row">
        <div className="setting-label">
          <span>🚀</span>
          <span>Launch at Login</span>
        </div>
        <button 
          className={`toggle-btn ${enabled ? 'active' : ''}`}
          onClick={handleToggle}
        >
          <span className="toggle-knob" />
        </button>
      </div>
    </div>
  );
};

export default Settings;
