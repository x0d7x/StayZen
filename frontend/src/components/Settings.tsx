import React, { useState, useEffect } from 'react';

interface SettingsProps {
  autoStart: boolean;
  onAutoStartChange: (enabled: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ autoStart, onAutoStartChange }) => {
  const [enabled, setEnabled] = useState(autoStart);

  useEffect(() => {
    setEnabled(autoStart);
  }, [autoStart]);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    onAutoStartChange(newValue);
  };

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
