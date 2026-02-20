import React from 'react';

interface StatusIndicatorProps {
  mode: 'time' | 'monitor' | 'idle';
  active: boolean;
  remainingSeconds: number;
  appName: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  mode, 
  active, 
  remainingSeconds, 
  appName 
}) => {
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const getStatusInfo = () => {
    if (!active) {
      return {
        label: 'Idle',
        dotClass: 'idle',
        detail: 'Not preventing sleep'
      };
    }

    if (mode === 'time') {
      return {
        label: 'Active',
        dotClass: 'active',
        detail: formatTime(remainingSeconds) + ' remaining'
      };
    }

    if (mode === 'monitor') {
      return {
        label: 'Monitoring',
        dotClass: 'monitoring',
        detail: `Keeping awake while ${appName} runs`
      };
    }

    return {
      label: 'Idle',
      dotClass: 'idle',
      detail: 'Not preventing sleep'
    };
  };

  const status = getStatusInfo();

  return (
    <div className="status-section">
      <div className="status-info">
        <div className={`status-dot ${status.dotClass}`} />
        <div>
          <div className="status-text">{status.label}</div>
          <div className="status-detail">{status.detail}</div>
        </div>
      </div>
    </div>
  );
};

export default StatusIndicator;
