'use client';

import React, { useRef, useEffect } from 'react';

interface WorldCanvasProps {
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({ onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block touch-none pointer-events-auto"
      tabIndex={0}
      aria-label="Walkable 2D Portfolio World Canvas"
    />
  );
};
