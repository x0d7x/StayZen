import React, { useState, useEffect } from 'react';

interface HistoryEntry {
  id: number;
  mode: string;
  app_name: string;
  duration: number;
  started_at: string;
  ended_at: string;
}

interface HistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const History: React.FC<HistoryProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      window.stayzen.getHistory().then((data) => {
        setEntries(data.entries || []);
        setTotalSeconds(data.total_seconds || 0);
      }).catch((err) => {
        console.error('Failed to load history:', err);
        setEntries([]);
        setTotalSeconds(0);
      }).finally(() => {
        setLoading(false);
      });
      
      window.history.pushState({ historyOpen: true }, '');
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  const handleClose = () => {
    window.history.back();
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="history-overlay" onClick={handleClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2>History</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="history-stats">
          <div className="stat">
            <span className="stat-value">{formatDuration(totalSeconds)}</span>
            <span className="stat-label">Total Time</span>
          </div>
          <div className="stat">
            <span className="stat-value">{entries.length}</span>
            <span className="stat-label">Sessions</span>
          </div>
        </div>

        <div className="history-list">
          {loading ? (
            <div className="history-empty">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="history-empty">No history yet</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="history-item">
                <div className="history-item-icon">
                  {entry.mode === 'time' ? '🕒' : '🖥'}
                </div>
                <div className="history-item-info">
                  <div className="history-item-title">
                    {entry.mode === 'time' ? 'Time Mode' : `Monitoring: ${entry.app_name}`}
                  </div>
                  <div className="history-item-time">
                    {formatDate(entry.started_at)}
                  </div>
                </div>
                <div className="history-item-duration">
                  {formatDuration(entry.duration)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
