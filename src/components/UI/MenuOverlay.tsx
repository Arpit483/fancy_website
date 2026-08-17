'use client';

import React from 'react';
import { X, ExternalLink, Download, ArrowRight } from 'lucide-react';
import siteContent from '@/data/site-content.json';

interface MenuOverlayProps {
  onClose: () => void;
  onSelectZone: (worldX: number) => void;
}

export const MenuOverlay: React.FC<MenuOverlayProps> = ({
  onClose,
  onSelectZone,
}) => {
  const { personal, domainPaths, skills, achievements } = siteContent;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl text-white overflow-y-auto p-8 md:p-16 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h2 className="text-xl font-bold font-mono">{personal.name.toUpperCase()}</h2>
          <p className="text-xs text-neutral-400 mt-1">
            {personal.bio.slice(0, 120)}...
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Grid Content */}
      <div className="my-10 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* World Teleport Navigation */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold font-mono">
            World Navigation
          </h3>
          <div className="space-y-2">
            {domainPaths.map((dp, idx) => {
              const xStart = 3800 + idx * 3000;
              return (
                <button
                  key={dp.id}
                  onClick={() => onSelectZone(xStart)}
                  className="w-full flex items-center justify-between p-3.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition text-left group"
                >
                  <span className="font-semibold text-sm group-hover:text-amber-400 transition">
                    {dp.icon} {dp.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 group-hover:text-amber-400 transition" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Skills Summary */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold font-mono">
            Skills Snapshot
          </h3>
          <div className="space-y-3">
            {Object.entries(skills).map(([category, list]) => (
              <div key={category} className="space-y-1">
                <span className="text-xs text-neutral-400 font-medium capitalize">
                  {category}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 text-xs font-mono rounded bg-white/5 text-neutral-300 border border-white/10"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Experience & Achievements */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold font-mono">
            Key Recognitions
          </h3>
          <div className="space-y-3 text-sm text-neutral-300">
            {achievements.map((ach, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <span className="text-amber-400 font-bold">•</span>
                <span className="text-xs leading-relaxed">{ach}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
        <div>
          <span>{personal.location}</span>
          <span className="mx-2">•</span>
          <a
            href={`mailto:${personal.email}`}
            className="hover:text-white underline"
          >
            {personal.email}
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="/resume.pdf"
            download="Arpit_Deosthale_Resume.pdf"
            className="flex items-center space-x-1 hover:text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Resume</span>
          </a>
          <a
            href={personal.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 hover:text-white transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
};
