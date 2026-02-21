import React from 'react';

interface HeaderProps {
  onHistoryClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHistoryClick }) => {
  return (
    <header style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <h1 style={{ 
        fontSize: '24px', 
        fontWeight: 600, 
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <span>⚡</span>
        <span>StayZen</span>
      </h1>
      <button 
        className="history-btn" 
        onClick={onHistoryClick} 
        title="History"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        📊
      </button>
    </header>
  );
};

export default Header;
