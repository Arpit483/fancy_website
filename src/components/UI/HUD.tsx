'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Zone } from '@/types/world';

interface HUDProps {
  currentZone: Zone;
  nearObjectLabel: string | null;
  progress: number;
  onTouchMove: (dir: 'left' | 'right' | null) => void;
}

export const HUD: React.FC<HUDProps> = ({
  currentZone,
  nearObjectLabel,
  progress,
  onTouchMove,
}) => {
  return (
    <>
      {/* Bottom HUD Bar */}
      <div className="fixed bottom-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        {/* Zone Title & Hints */}
        <div className="flex flex-col space-y-1">
          {currentZone.label && (
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
              {currentZone.label}
            </span>
          )}
          {nearObjectLabel && (
            <span className="text-sm font-semibold text-amber-400 bg-black/60 px-3 py-1 rounded border border-amber-500/30 backdrop-blur-sm pointer-events-auto">
              {nearObjectLabel}
            </span>
          )}
        </div>

        {/* Keyboard Controls Hint (Desktop) */}
        <div className="hidden md:flex items-center space-x-2 bg-black/50 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full text-xs font-mono text-neutral-300">
          <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20">A</kbd>
          <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20">D</kbd>
          <span>Walk</span>
          <span className="text-neutral-600">|</span>
          <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20">E</kbd>
          <span>Interact</span>
        </div>

        {/* World Exploration Progress Bar */}
        <div className="flex items-center space-x-3 bg-black/50 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full">
          <span className="text-xs font-mono text-neutral-400">WORLD</span>
          <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-mono text-neutral-300">{progress}%</span>
        </div>
      </div>

      {/* Mobile Touch Controls (Always visible on mobile) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex md:hidden items-center space-x-6 pointer-events-auto">
        <button
          onMouseDown={() => onTouchMove('left')}
          onMouseUp={() => onTouchMove(null)}
          onTouchStart={() => onTouchMove('left')}
          onTouchEnd={() => onTouchMove(null)}
          className="w-14 h-14 rounded-full bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition"
          aria-label="Walk Left"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onMouseDown={() => onTouchMove('right')}
          onMouseUp={() => onTouchMove(null)}
          onTouchStart={() => onTouchMove('right')}
          onTouchEnd={() => onTouchMove(null)}
          className="w-14 h-14 rounded-full bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition"
          aria-label="Walk Right"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </>
  );
};
