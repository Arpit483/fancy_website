'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink, ChevronRight, ChevronLeft, Minimize2, Maximize2 } from 'lucide-react';
import gsap from 'gsap';
import siteContent from '@/data/site-content.json';

export interface ProjectData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  tech: string[];
  github: string | null;
  demo: string | null;
  worldX: number;
}

export const WalkSidePanel: React.FC = () => {
  const allProjects = siteContent.featuredProjects as ProjectData[];
  const [characterX, setCharacterX] = useState(0);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Poll character position from DOM or home-game state
    const interval = setInterval(() => {
      const charEl = document.querySelector('[data-character]') as HTMLElement | null;
      if (charEl) {
        // Compute current world position of character
        const style = window.getComputedStyle(charEl);
        const transform = style.transform || style.webkitTransform;
        let currentX = 0;
        if (transform && transform !== 'none') {
          const matrixValues = transform.match(/matrix.*\((.+)\)/);
          if (matrixValues && matrixValues[1]) {
            const values = matrixValues[1].split(', ');
            currentX = Math.abs(parseFloat(values[4]) || 0);
          }
        }
        // Fallback: estimate from progress bar
        const progressLine = document.querySelector('[data-progress-line]') as HTMLElement | null;
        if (progressLine) {
          const scaleX = parseFloat(progressLine.style.transform?.replace('scaleX(', '').replace(')', '') || '0');
          if (scaleX > 0) {
            currentX = Math.max(currentX, scaleX * 18000);
          }
        }
        setCharacterX(currentX);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Update revealed projects list as character walks past worldX
  useEffect(() => {
    const newlyRevealed = allProjects.filter((p) => characterX >= p.worldX - 150).map((p) => p.id);
    setRevealedIds((prev) => {
      const merged = Array.from(new Set([...prev, ...newlyRevealed]));
      if (merged.length > prev.length) {
        // Auto-select latest revealed project
        setActiveIndex(merged.length - 1);
      }
      return merged;
    });
  }, [characterX, allProjects]);

  const revealedProjects = allProjects.filter((p) => revealedIds.includes(p.id));
  const currentProject = revealedProjects[activeIndex] || null;

  // Animate panel slide-in when first project is revealed
  useEffect(() => {
    if (revealedProjects.length > 0 && panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { x: 100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [revealedProjects.length]);

  // Do not render anything until character reaches/passes the first project landmark
  if (revealedProjects.length === 0 || !currentProject) {
    return null;
  }

  return (
    <aside
      ref={panelRef}
      className={`fixed right-6 top-24 z-40 transition-all duration-300 ${
        isMinimized ? 'w-14 h-14 overflow-hidden rounded-full' : 'w-80 md:w-96 rounded-2xl'
      } bg-black/80 backdrop-blur-xl border border-white/15 text-white shadow-2xl p-5 select-none`}
    >
      {/* Minimized View Button */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full h-full flex items-center justify-center text-amber-400 font-bold"
          title="Expand Project Side Panel"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      ) : (
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                Revealed ({activeIndex + 1}/{revealedProjects.length})
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition"
                title="Minimize panel"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Project Details */}
          <div>
            <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
              {currentProject.tags.join(' • ')}
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5 leading-tight">
              {currentProject.title}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
              {currentProject.subtitle}
            </p>
            <p className="text-xs text-neutral-300 mt-3 leading-relaxed line-clamp-4">
              {currentProject.description}
            </p>
          </div>

          {/* Tech Stack Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentProject.tech.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 text-[10px] font-mono rounded bg-white/10 text-neutral-200 border border-white/10"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Navigation Controls & Links */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex items-center space-x-1">
              <button
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                className="p-1.5 rounded bg-white/10 disabled:opacity-30 hover:bg-white/20 transition text-white"
                title="Previous revealed project"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-neutral-400 px-1">
                {activeIndex + 1}/{revealedProjects.length}
              </span>
              <button
                disabled={activeIndex === revealedProjects.length - 1}
                onClick={() => setActiveIndex((prev) => Math.min(revealedProjects.length - 1, prev + 1))}
                className="p-1.5 rounded bg-white/10 disabled:opacity-30 hover:bg-white/20 transition text-white"
                title="Next revealed project"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {currentProject.github && (
              <a
                href={currentProject.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-xs font-semibold text-white hover:text-amber-400 transition"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
