import React, { useState } from 'react';

interface TimeModeProps {
  onStart: (seconds: number) => void;
  disabled: boolean;
  isActive: boolean;
  remainingSeconds: number;
}

const PRESETS = [
  { label: '30m', seconds: 30 * 60 },
  { label: '1h', seconds: 60 * 60 },
  { label: '2h', seconds: 2 * 60 * 60 },
];

const TimeMode: React.FC<TimeModeProps> = ({ 
  onStart, 
  disabled, 
  isActive, 
  remainingSeconds 
}) => {
  const [selectedTime, setSelectedTime] = useState('12:00');

  const calculateSeconds = (): number => {
    const now = new Date();
    const [hours, minutes] = selectedTime.split(':').map(Number);
    
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    
    return Math.floor((target.getTime() - now.getTime()) / 1000);
  };

  const handleStart = (seconds?: number) => {
    const secs = seconds ?? calculateSeconds();
    if (secs > 0) {
      onStart(secs);
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className={`section ${isActive ? 'active-section' : ''}`}>
      <div className="section-title">🕒 Keep Awake</div>
      
      {!isActive && (
        <>
          <div className="preset-buttons">
            {PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                className="btn-preset"
                onClick={() => handleStart(preset.seconds)}
                disabled={disabled}
              >
                {preset.label}
              </button>
            ))}
          </div>
          
          <div className="divider">
            <span>or select time</span>
          </div>
          
          <div className="input-group">
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={disabled}
            />
            <button
              className="btn-primary"
              onClick={() => handleStart()}
              disabled={disabled}
            >
              Start
            </button>
          </div>
        </>
      )}

      {isActive && remainingSeconds > 0 && (
        <div className="active-indicator">
          <span>⏱</span>
          <span className="countdown">{formatTime(remainingSeconds)}</span>
          <span>remaining</span>
        </div>
      )}
    </div>
  );
};

export default TimeMode;
