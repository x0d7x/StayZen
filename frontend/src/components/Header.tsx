import React from 'react';

const Header: React.FC = () => {
  return (
    <header style={{ textAlign: 'center' }}>
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
    </header>
  );
};

export default Header;
