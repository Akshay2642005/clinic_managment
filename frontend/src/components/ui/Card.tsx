import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
