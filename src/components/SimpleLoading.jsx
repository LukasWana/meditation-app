/**
 * Jednoduchá loading komponenta pro preloading
 */

import React from 'react';

const SimpleLoading = ({ message = "Načítám data...", show = true }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-[#f4ddc4] flex items-center justify-center z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-700 mx-auto mb-4"></div>
        <p className="text-xl text-gray-700 mb-2">{message}</p>
        <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
          <div className="bg-gray-700 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoading;

