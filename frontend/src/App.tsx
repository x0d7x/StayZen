import React, { useState, useEffect, useCallback } from 'react';
import { Status } from './types/api';
import Header from './components/Header';
import TimeMode from './components/TimeMode';
import MonitorMode from './components/MonitorMode';
import StatusIndicator from './components/StatusIndicator';
import Footer from './components/Footer';
import Settings from './components/Settings';
import History from './components/History';

const App: React.FC = () => {
  const [status, setStatus] = useState<Status>({
    mode: 'idle',
    active: false,
    remaining_seconds: 0,
    app_name: '',
    started_at: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const newStatus = await window.stayzen.getStatus();
      setStatus(newStatus);
      setError(null);
    } catch (err) {
      setError('Failed to connect to backend');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    window.stayzen.getAutoLaunch().then(setAutoStart).catch(() => {});
  }, []);

  const handleStartTimeMode = async (seconds: number) => {
    setLoading(true);
    try {
      const newStatus = await window.stayzen.startTimeMode(seconds);
      setStatus(newStatus);
      setError(null);
    } catch (err) {
      setError('Failed to start time mode');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMonitorMode = async (appName: string) => {
    setLoading(true);
    try {
      const newStatus = await window.stayzen.startMonitorMode(appName);
      setStatus(newStatus);
      setError(null);
    } catch (err) {
      setError('Failed to start monitor mode');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const newStatus = await window.stayzen.stop();
      setStatus(newStatus);
      setError(null);
    } catch (err) {
      setError('Failed to stop');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoStartChange = async (enabled: boolean) => {
    try {
      await window.stayzen.setAutoLaunch(enabled);
      setAutoStart(enabled);
    } catch (err) {
      setError('Failed to change auto-start setting');
    }
  };

  return (
    <div className="app">
      <div className="container">
        <Header onHistoryClick={() => setShowHistory(true)} />
        
        <div className="content">
          <TimeMode
            onStart={handleStartTimeMode}
            disabled={loading || status.active}
            isActive={status.mode === 'time'}
            remainingSeconds={status.remaining_seconds}
          />
          
          <MonitorMode
            onStart={handleStartMonitorMode}
            disabled={loading || status.active}
            isActive={status.mode === 'monitor'}
            currentApp={status.app_name}
          />
          
          <StatusIndicator
            mode={status.mode}
            active={status.active}
            remainingSeconds={status.remaining_seconds}
            appName={status.app_name}
          />
          
          {error && <div className="error">{error}</div>}
          
          <Settings autoStart={autoStart} onAutoStartChange={handleAutoStartChange} />
        </div>
        
        <Footer onStop={handleStop} disabled={!status.active || loading} isStopping={loading} />
      </div>
      
      <History isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
};

export default App;
