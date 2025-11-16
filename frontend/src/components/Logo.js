import React from 'react';
import logoImage from '../assets/White logo.png';

function Logo({ size = 40, className = '' }) {
  return (
    <img 
      src={logoImage} 
      alt="City Concepter Logo" 
      style={{ width: size, height: size }}
      className={className}
    />
  );
}

export default Logo;
