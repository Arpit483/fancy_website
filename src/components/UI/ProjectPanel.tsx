'use client';

import React, { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import gsap from 'gsap';
import type { Project } from '@/types/world';

interface ProjectPanelProps {
  project: Project;
  onClose: () => void;
}

export const ProjectPanel: React.FC<ProjectPanelProps> = ({
  project,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { x: '100%', opacity: 0 },
        { x: '0%', opacity: 1, duration: 0.35, ease: 'power3.out' }
      );
    }
  }, []);

  const handleClose = () => {
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        x: '100%',
        opacity: 0,
        duration: 0.25,
        ease: 'power3.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="w-full max-w-xl h-full bg-neutral-900 border-l border-white/10 p-8 flex flex-col justify-between text-white overflow-y-auto"
      >
        <div>
          <div className="flex items-start justify-between pb-6 border-b border-white/10">
            <div>
              <span className="text-xs uppercase tracking-widest font-mono text-amber-400">
                Featured Project
              </span>
              <h2 className="text-2xl font-bold mt-1 text-neutral-100">
                {project.title}
              </h2>
              <p className="text-sm text-neutral-400 mt-0.5">
                {project.subtitle}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-6 space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              About
            </h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {project.description}
            </p>
          </div>

          <div className="py-4 space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              Technologies Used
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-white/5 border border-white/10 text-neutral-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center space-x-4">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>View Source</span>
            </a>
          )}
          {project.demo && (
            <a
              href={project.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-neutral-800 text-white font-semibold text-sm border border-white/10 hover:bg-neutral-700 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Live Demo</span>
            </a>
          )}
          {!project.github && !project.demo && (
            <span className="text-xs text-neutral-500 italic">
              Proprietary / College Hackathon Build
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
