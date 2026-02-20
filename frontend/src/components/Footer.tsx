import React from 'react';

interface FooterProps {
  onStop: () => void;
  disabled: boolean;
  isStopping?: boolean;
}

const Footer: React.FC<FooterProps> = ({ onStop, disabled, isStopping }) => {
  return (
    <div className="footer">
      <button
        className="btn-danger"
        onClick={onStop}
        disabled={disabled}
      >
        {isStopping ? 'Stopping...' : 'Stop All'}
      </button>
    </div>
  );
};

export default Footer;
