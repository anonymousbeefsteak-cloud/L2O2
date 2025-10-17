
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="text-center py-5">
      <div className="border-4 border-gray-200 border-t-blue-500 rounded-full w-10 h-10 animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-gray-600">訂單發送中...</p>
    </div>
  );
};

export default LoadingSpinner;
