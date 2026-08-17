'use client';

import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <h1 className="text-sm font-mono tracking-widest uppercase">
          ARPIT DEOSTHALE
        </h1>
        <p className="text-xs font-mono text-neutral-500">
          Loading 2D Interactive World...
        </p>
      </div>
    </div>
  );
};
