'use client';

import React, { useState } from 'react';
import { WorldCanvas } from './WorldCanvas';
import { useWorld } from '@/hooks/useWorld';
import { ProjectPanel } from '@/components/UI/ProjectPanel';
import { Navigation } from '@/components/UI/Navigation';
import { HUD } from '@/components/UI/HUD';
import { MenuOverlay } from '@/components/UI/MenuOverlay';
import { LoadingScreen } from '@/components/UI/LoadingScreen';
import type { Project } from '@/types/world';

export const PortfolioWorld: React.FC = () => {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const {
    setCanvas,
    isLoaded,
    currentZone,
    nearObject,
    progress,
    setTouchMove,
    jumpTo,
  } = useWorld({
    onProjectInteract: (project) => setActiveProject(project),
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {!isLoaded && <LoadingScreen />}

      <WorldCanvas onCanvasReady={setCanvas} />

      {/* Top Header */}
      <Navigation onOpenMenu={() => setIsMenuOpen(true)} />

      {/* HUD Progress & Hints */}
      <HUD
        currentZone={currentZone}
        nearObjectLabel={nearObject?.label ?? null}
        progress={progress}
        onTouchMove={setTouchMove}
      />

      {/* Slide-in Project Panel */}
      {activeProject && (
        <ProjectPanel
          project={activeProject}
          onClose={() => setActiveProject(null)}
        />
      )}

      {/* Full-screen Menu Overlay */}
      {isMenuOpen && (
        <MenuOverlay
          onClose={() => setIsMenuOpen(false)}
          onSelectZone={(x) => {
            jumpTo(x);
            setIsMenuOpen(false);
          }}
        />
      )}
    </div>
  );
};
