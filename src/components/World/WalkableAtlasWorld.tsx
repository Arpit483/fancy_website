'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Navigation } from '@/components/UI/Navigation';
import { ProjectPanel } from '@/components/UI/ProjectPanel';
import { MenuOverlay } from '@/components/UI/MenuOverlay';
import { WalkSidePanel } from '@/components/UI/WalkSidePanel';
import { projects } from '@/data/projects';
import type { Project } from '@/types/world';

export const WalkableAtlasWorld: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    // Add motion class on mount if reduced-motion is not set
    try {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('motion');
        window.setTimeout(() => {
          document.documentElement.classList.add('motion-settled');
        }, 2800);
      }
    } catch (_e) {}

    // Listen for custom journey signals from home-game.js
    const handleJourneySignal = (e: Event) => {
      const customEvent = e as CustomEvent<{ event: string; parameters?: Record<string, unknown> }>;
      const detail = customEvent.detail;
      if (detail && detail.event === 'article_open') {
        const title = String(detail.parameters?.title || '');
        const matched = projects.find(
          (p) => title.toLowerCase().includes(p.title.toLowerCase()) || p.title.toLowerCase().includes(title.toLowerCase())
        );
        if (matched) {
          setSelectedProject(matched);
        }
      }
    };

    window.addEventListener('arpit:journey-signal', handleJourneySignal);

    // Also delegate click events on game cards to open modern React ProjectPanel
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-card-link], .drp-projects a, [data-card-title]')) {
        const cardTitleEl = document.querySelector('[data-card-title]');
        const cardTitle = cardTitleEl?.textContent || '';
        const matched = projects.find(
          (p) => cardTitle.toLowerCase().includes(p.title.toLowerCase()) || p.title.toLowerCase().includes(cardTitle.toLowerCase())
        );
        if (matched) {
          e.preventDefault();
          setSelectedProject(matched);
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('arpit:journey-signal', handleJourneySignal);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const handleSelectZoneFromMenu = (worldX: number) => {
    setIsMenuOpen(false);
    // Find matching jump key for worldX
    let jumpKey = 'ai-ml';
    if (worldX > 14000) jumpKey = 'open-source';
    else if (worldX > 11000) jumpKey = 'iot-embedded';
    else if (worldX > 8000) jumpKey = 'fullstack';
    else if (worldX > 5000) jumpKey = 'ai-ml';

    const jumpBtn = document.querySelector(`[data-jump="${jumpKey}"]`) as HTMLButtonElement | null;
    if (jumpBtn) {
      jumpBtn.click();
    } else {
      // Fallback scroll
      const worldEl = document.querySelector('[data-world]') as HTMLElement | null;
      if (worldEl) {
        worldEl.scrollLeft = worldX;
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Modern React Navigation Header */}
      <Navigation onOpenMenu={() => setIsMenuOpen(true)} />

      {/* Walk-by Project Reveal Side Panel */}
      <WalkSidePanel />

      {/* Main Game Stage */}
      <main
        id="main"
        className="home-game home-game--moss-focus home-game--journey pt-12"
        data-home-game
        data-render="dots"
        tabIndex={-1}
      >
        <div className="home-game__boot-logo" aria-hidden="true">
          <i></i>
          <span>ARPIT DEOSTHALE</span>
        </div>

        <button
          className="living-atlas-bookmark"
          type="button"
          data-living-atlas-shortcut
          hidden
          aria-label="LIVING ATLAS / ARPIT.CO"
        >
          <span className="living-atlas-bookmark__mark" aria-hidden="true">
            <i></i><i></i><i></i><i></i><i></i><i></i>
          </span>
          <span>Journey map</span>
        </button>

        <div
          className="living-atlas-transition"
          data-living-atlas-transition
          aria-hidden="true"
        >
          <canvas data-living-atlas-transition-canvas></canvas>
          <div
            className="living-atlas-transition__character"
            data-living-atlas-transition-character
          >
            <img alt="" src="/character_sit.svg" />
          </div>
          <p>
            <em aria-hidden="true">
              <i></i><i></i><i></i><i></i><i></i><i></i>
            </em>
            <span>ACT II / LIVING ATLAS</span>
            <b>The domains you walked become a summary map</b>
          </p>
        </div>

        <section
          className="home-game__stage"
          aria-label="Walk through the world"
        >
          <h1 className="home-game__semantic-title">
            ARPIT.CO — Walkable Atlas by Arpit Deosthale
          </h1>
          <div className="home-game__sky" aria-hidden="true"></div>
          <div className="home-game__viewport">
            <canvas
              className="dot-world-canvas dot-world-canvas--far"
              data-dot-world-far-canvas
              aria-hidden="true"
            ></canvas>
            <canvas
              className="dot-world-canvas dot-world-canvas--near"
              data-dot-world-canvas
              aria-hidden="true"
            ></canvas>
            <div className="home-game__world" data-world>
              <svg
                className="world-svg world-svg--far"
                viewBox="0 0 18000 1400"
                aria-hidden="true"
              >
                <g data-layer="far"></g>
              </svg>
              <svg
                className="world-svg world-svg--mid"
                viewBox="0 0 18000 1400"
                aria-hidden="true"
              >
                <g data-layer="mid"></g>
              </svg>
              <svg
                className="world-svg world-svg--near"
                viewBox="0 0 18000 1400"
                aria-hidden="true"
              >
                <g data-layer="near"></g>
              </svg>
              <div className="world-atmosphere" data-atmosphere aria-hidden="true"></div>
              <div className="world-labels" data-world-labels></div>
            </div>

            <div className="game-character" data-character aria-hidden="true">
              <img data-character-img alt="" src="/character_sit.svg" />
            </div>
          </div>

          <canvas
            className="particle-canvas"
            data-particle-canvas
            aria-hidden="true"
          ></canvas>
          <div className="game-vignette" aria-hidden="true"></div>

          <div className="game-hud">
            <div className="game-brand">
              <span>ARPIT.CO</span>
            </div>
            <div className="game-progress" aria-hidden="true">
              <span data-progress-line></span>
              <i data-progress-dot></i>
            </div>
            <div className="game-keys" data-help>
              <kbd>A</kbd>
              <kbd>D</kbd>
              <span>walk to reveal</span>
            </div>
          </div>

          <div className="game-start-hint" data-start-hint aria-hidden="true">
            <span className="game-start-hint__row">
              <span className="game-start-hint__word">back</span>
              <span className="game-start-hint__arrow game-start-hint__arrow--left"></span>
              <span className="game-start-hint__key">A</span>
              <span className="game-start-hint__key">D</span>
              <span className="game-start-hint__arrow game-start-hint__arrow--right"></span>
              <span className="game-start-hint__word">forward</span>
            </span>
          </div>

          <nav
            className="game-touch-controls"
            data-touch-control-bar
            aria-label="Walk through the world"
          >
            <div className="game-touch-controls__walk" role="group" aria-label="Move">
              <button
                type="button"
                data-touch-move="ArrowLeft"
                aria-label="Walk left"
              >
                <span
                  className="game-touch-controls__arrow game-touch-controls__arrow--left"
                  aria-hidden="true"
                ></span>
              </button>
              <button
                type="button"
                data-touch-move="ArrowRight"
                aria-label="Walk right"
              >
                <span
                  className="game-touch-controls__arrow game-touch-controls__arrow--right"
                  aria-hidden="true"
                ></span>
              </button>
              <button
                className="game-touch-controls__tilt"
                type="button"
                data-tilt-walk
                aria-pressed="false"
                aria-label="Tilt your phone to walk"
                title="Tilt your phone to walk"
                hidden
              >
                <span className="game-touch-controls__phone" aria-hidden="true">
                  <i></i>
                </span>
                <span className="game-touch-controls__tilt-guide" aria-hidden="true">
                  Tilt left or right
                </span>
              </button>
            </div>
            <button
              className="game-touch-controls__action"
              type="button"
              data-touch-action
              aria-label="Explore"
              disabled
            >
              <span data-touch-action-glyph aria-hidden="true">
                ○
              </span>
              <small data-touch-action-label>Explore</small>
            </button>
          </nav>

          <button
            className="game-sound"
            type="button"
            data-game-sound
            aria-pressed="false"
            aria-label="Turn sound off"
            title="Turn sound off"
          >
            <span aria-hidden="true">♪</span>
          </button>

          <aside className="game-card" data-event-card aria-hidden="true">
            <p className="game-card__kicker" data-card-kicker>
              domain
            </p>
            <p className="game-card__title" data-card-title>
              ARPIT.CO
            </p>
            <p data-card-description></p>
            <ul data-card-list></ul>
            <a data-card-link href="#home-links">
              open summary
            </a>
          </aside>

          <nav className="game-map" data-game-map aria-label="World map">
            <button type="button" data-jump="ai-ml">
              [AI] Agentic AI &amp; ML
            </button>
            <button type="button" data-jump="fullstack">
              [DEV] Dev
            </button>
            <button type="button" data-jump="iot-embedded">
              [IOT] IoT &amp; Embedded
            </button>
            <button type="button" data-jump="open-source">
              [SRC] Open Source
            </button>
            <button type="button" data-jump="hackathons">
              [HACK] Hackathons
            </button>
            <button type="button" data-jump="atlas-threshold">
              Entrance to Act II
            </button>
          </nav>
        </section>

        <p className="game-status" data-game-status role="status" aria-live="polite">
          Walk with A or D, the arrow keys, or the controls on screen.
        </p>

        <div id="domain-reveal-panel" className="drp" hidden aria-live="polite">
          <div className="drp__inner">
            <h2 className="drp-heading"></h2>
            <p className="drp-desc"></p>
            <div className="drp-chips"></div>
            <div className="drp-projects"></div>
          </div>
        </div>

        {/* ACT II Summary */}
        <section
          id="home-links"
          className="home-fallback living-atlas"
          aria-label="ARPIT.CO Portfolio Summary"
          tabIndex={-1}
        >
          <canvas
            className="living-atlas__canvas"
            data-living-atlas-canvas
            aria-hidden="true"
          ></canvas>
          <div className="living-atlas__content" data-living-atlas-content>
            <button
              className="home-fallback__close atlas-world-return"
              type="button"
              data-close-home-links
              aria-label="Return to the world of Act I"
            >
              <span className="atlas-world-return__trail" aria-hidden="true">
                <i></i><i></i><i></i><i></i><i></i><i></i>
              </span>
              <span className="atlas-world-return__copy">
                <small>ACT I</small>
                <b>Return to Walkable World</b>
              </span>
            </button>

            <header className="home-fallback__intro" data-atlas-section="origin">
              <p className="home-fallback__eyebrow">PORTFOLIO SUMMARY / ARPIT.CO</p>
              <h1 tabIndex={-1}>
                <span className="home-fallback__subject">Arpit Deosthale</span>
                <span className="home-fallback__statement">
                  <span>ML, and full-stack Engineer</span>
                  <br />
                </span>
              </h1>
              <p className="home-fallback__summary">
                Computer Engineering student at Dr. D.Y. Patil Institute of Technology,
                Pune (2023–2027). Smart India Hackathon Finalist.
              </p>
            </header>

            <section
              className="home-fallback__section summary-condensed"
              data-atlas-section="person"
            >
              <div className="summary-card">
                <h2>About &amp; Background</h2>
                <p>
                  Computer Engineering student at DYPIT, Pune. I build end-to-end ML
                  systems — from radar human detection to facial recognition attendance and
                  sensor fusion on ESP32.
                </p>
                <p className="education-line">
                  <strong>Education:</strong> Dr. D.Y. Patil Institute of Technology,
                  Pune — Bachelor of Computer Engineering (2023 – 2027)
                </p>
              </div>

              <div className="summary-card">
                <h2>Featured Projects</h2>
                <ul className="condensed-list">
                  <li>
                    <strong>VITAL Radar</strong> — ML Human Detection System (SIH Finalist)
                    <small>Python, scikit-learn, Raspberry Pi, Flask, Firebase</small>
                  </li>
                  <li>
                    <strong>Wahan Mitra</strong> — Intelligent IoT Headlamp Automation
                    <small>ESP32, Embedded C, IR/Ultrasonic/LDR Sensors</small>
                  </li>
                  <li>
                    <strong>AutoAttend</strong> — AI-Powered Facial Recognition Attendance
                    <small>Python, Flask, OpenCV, PostgreSQL, Firebase, Android</small>
                  </li>
                  <li>
                    <strong>Legal Document Analyzer</strong> — LLM + RAG Intelligence
                    <small>Python, LangChain, RAG, NLP, Ollama</small>
                  </li>
                  <li>
                    <strong>
                      <a
                        href="https://github.com/Arpit483/Hack2Hire"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Hack2Hire
                      </a>
                    </strong>{' '}
                    — AI Mock Interview Platform
                    <small>React 18, Vite, Tailwind, Gemini API</small>
                  </li>
                  <li>
                    <strong>
                      <a
                        href="https://github.com/pewdiepie-archdaemon/odysseus"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Odysseus
                      </a>
                    </strong>{' '}
                    — Confirmed Bugfix Contribution
                    <small>Python, uv</small>
                  </li>
                </ul>
              </div>

              <div className="summary-card">
                <h2>Honors &amp; Recognitions</h2>
                <ul className="condensed-list">
                  <li>
                    <strong>Smart India Hackathon Finalist</strong> — Selected nationally for radar ML model
                  </li>
                  <li>
                    <strong>20+ Hackathons &amp; CTFs</strong> — Active competitor across security &amp; ML
                  </li>
                  <li>
                    <strong>Two Patents Filed</strong> — AutoAttend &amp; Wahan Mitra
                  </li>
                </ul>
              </div>

              <div className="summary-card summary-card--skills">
                <h2>Skills</h2>
                <div className="skills-grid">
                  <div className="skills-group">
                    <span className="skills-group__label">Languages</span>
                    <div className="skill-chips">
                      <span className="skill-chip">Python</span>
                      <span className="skill-chip">Java</span>
                      <span className="skill-chip">C/C++</span>
                      <span className="skill-chip">JavaScript</span>
                      <span className="skill-chip">TypeScript</span>
                    </div>
                  </div>
                  <div className="skills-group">
                    <span className="skills-group__label">ML &amp; AI</span>
                    <div className="skill-chips">
                      <span className="skill-chip">NumPy</span>
                      <span className="skill-chip">Pandas</span>
                      <span className="skill-chip">scikit-learn</span>
                      <span className="skill-chip">TensorFlow/Keras</span>
                      <span className="skill-chip">LangChain</span>
                      <span className="skill-chip">RAG Systems</span>
                    </div>
                  </div>
                  <div className="skills-group">
                    <span className="skills-group__label">Full-Stack &amp; Embedded</span>
                    <div className="skill-chips">
                      <span className="skill-chip">Node.js</span>
                      <span className="skill-chip">React</span>
                      <span className="skill-chip">Next.js</span>
                      <span className="skill-chip">Raspberry Pi</span>
                      <span className="skill-chip">ESP32</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="summary-card summary-card--contact">
                <h2>Contact &amp; Resume</h2>
                <p>
                  <strong>Email:</strong> arpitdeosthale12@gmail.com |{' '}
                </p>
                <div className="summary-actions">
                  <a
                    className="resume-download-btn"
                    href="/resume.pdf"
                    download="Arpit_Deosthale_Resume.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ↓ Download Resume (PDF)
                  </a>
                  <a
                    className="contact-link"
                    href="https://github.com/Arpit483"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                  <a
                    className="contact-link"
                    href="https://linkedin.com/in/arpit-deosthale"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </section>

            <footer className="living-atlas__footer" data-atlas-section="footer">
              <p>Location: Pune, India | Email: arpitdeosthale12@gmail.com</p>
              <nav className="living-atlas__legal" aria-label="Related information">
                <a href="https://github.com/Arpit483" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
                <a
                  href="https://linkedin.com/in/arpit-deosthale"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
                <span>© 2026 Arpit Deosthale</span>
              </nav>
              <button type="button" data-close-home-links data-atlas-restart>
                Walk the domains again
              </button>
            </footer>
          </div>
        </section>
      </main>

      {/* React UI Overlays: Slide-in Project Panel & Full-Screen Menu */}
      {selectedProject && (
        <ProjectPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {isMenuOpen && (
        <MenuOverlay
          onClose={() => setIsMenuOpen(false)}
          onSelectZone={handleSelectZoneFromMenu}
        />
      )}

      {/* Embedded Portfolio Config JSON */}
      <script
        id="portfolio-config-data"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            personal: {
              name: 'Arpit Deosthale',
              brandTitle: 'ARPIT.CO',
              tagline: 'AI-native engineer building ML systems, full-stack products, and IoT devices.',
              bio: 'Computer Engineering student at Dr. D.Y. Patil Institute of Technology, Pune (2023–2027). Smart India Hackathon Finalist.',
              location: 'Pune, India',
              links: {
                github: 'https://github.com/Arpit483',
                linkedin: 'https://linkedin.com/in/arpit-deosthale',
                email: 'arpitdeosthale12@gmail.com',
              },
            },
            domainPaths: [
              {
                id: 'ai-ml',
                label: 'AI & Machine Learning',
                icon: '[AI]',
                borderStyle: 'solid',
                fontWeight: '700',
                description:
                  'Model training, real-time inference, RAG systems, and deployment — from radar classifiers to LLM document intelligence.',
              },
              {
                id: 'fullstack',
                label: 'Full-Stack Engineering',
                icon: '[DEV]',
                borderStyle: 'dashed',
                fontWeight: '500',
                description:
                  'Node/Express backends, React frontends, PostgreSQL/Firebase/MongoDB — shipping working products.',
              },
              {
                id: 'iot-embedded',
                label: 'IoT & Embedded Systems',
                icon: '[IOT]',
                borderStyle: 'solid',
                fontWeight: '600',
                description:
                  'ESP32 multi-sensor fusion, Raspberry Pi edge inference — hardware-software systems built from scratch.',
              },
              {
                id: 'open-source',
                label: 'Open Source',
                icon: '[SRC]',
                borderStyle: 'dotted',
                fontWeight: '500',
                description:
                  'Confirmed contributions to community projects, including Odysseus PR bugfix.',
              },
              {
                id: 'hackathons',
                label: 'Hackathons & Competitions',
                icon: '[HACK]',
                borderStyle: 'solid',
                fontWeight: '600',
                description:
                  '20+ hackathons & CTFs, Smart India Hackathon Finalist — rapid prototyping under pressure.',
              },
            ],
            featuredProjects: [
              {
                title: 'VITAL Radar',
                subtitle: 'ML-Based Human Detection — SIH Finalist',
                description:
                  'Trained and deployed ML classification models on Raspberry Pi behind Flask REST backend for radar human detection.',
                tags: ['ai-ml'],
                tech: ['Python', 'scikit-learn', 'Raspberry Pi', 'Flask', 'Firebase'],
                links: {},
              },
              {
                title: 'Wahan Mitra',
                subtitle: 'Intelligent IoT Headlamp Automation',
                description:
                  'Self-initiated IoT system on ESP32 with multi-sensor fusion (IR, ultrasonic, LDR) for automated beam switching. Patent filed.',
                tags: ['ai-ml', 'iot-embedded'],
                tech: ['ESP32', 'IR/Ultrasonic/LDR', 'Embedded C'],
                links: {},
              },
              {
                title: 'AutoAttend',
                subtitle: 'AI-Powered Facial Recognition Attendance',
                description:
                  'Facial recognition attendance system with Flask backend and Android frontend. Patent filed.',
                tags: ['ai-ml', 'fullstack'],
                tech: ['Python', 'Flask', 'OpenCV', 'PostgreSQL', 'Android'],
                links: {},
              },
              {
                title: 'Legal Document Analyzer',
                subtitle: 'LLM-Powered Document Intelligence',
                description:
                  'AI platform extracting and querying legal documents via LLMs and RAG.',
                tags: ['ai-ml'],
                tech: ['Python', 'LangChain', 'NLP', 'RAG'],
                links: {},
              },
              {
                title: 'Hack2Hire',
                subtitle: 'AI Mock Interview Platform',
                description:
                  'Hackathon build simulating technical interviews with Gemini API feedback.',
                tags: ['fullstack', 'hackathons'],
                tech: ['React 18', 'Vite', 'Tailwind', 'Gemini API'],
                links: { github: 'https://github.com/Arpit483/Hack2Hire' },
              },
              {
                title: 'Odysseus Bugfix',
                subtitle: 'Open Source Contribution',
                description:
                  'Diagnosed and fixed NameError in chat routes, submitted as PR.',
                tags: ['open-source'],
                tech: ['Python', 'uv'],
                links: { github: 'https://github.com/pewdiepie-archdaemon/odysseus' },
              },
            ],
            skills: {
              languages: ['Python', 'Java', 'C/C++', 'JavaScript'],
              mlAndData: [
                'NumPy',
                'Pandas',
                'scikit-learn',
                'TensorFlow/Keras',
                'LangChain',
                'RAG Systems',
              ],
              softwareDevelopment: ['Node.js', 'React', 'Next.js'],
              databases: ['MongoDB', 'Firebase', 'PostgreSQL'],
              cloudAndDevOps: ['AWS', 'Google Cloud', 'Linux'],
              developerTools: ['Git/GitHub', 'Raspberry Pi', 'ESP32'],
            },
            honorsAndAchievements: [
              'Smart India Hackathon Finalist',
              '20+ Hackathons & CTFs',
              'Two Patents Filed (AutoAttend, Wahan Mitra)',
            ],
            education: {
              institution: 'Dr. D.Y. Patil Institute of Technology, Pune',
              degree: 'Bachelor of Computer Engineering',
              years: '2023 – 2027',
            },
            contact: {
              email: 'arpitdeosthale12@gmail.com',
              github: 'https://github.com/Arpit483',
              linkedin: 'https://linkedin.com/in/arpit-deosthale',
              location: 'Pune, India',
            },
          }),
        }}
      />

      {/* Runtime Data Bridge Script */}
      <Script
        id="home-world-data-bridge"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          (function() {
            var rawConfig = document.getElementById('portfolio-config-data');
            var config = {};
            if (rawConfig) {
              try { config = JSON.parse(rawConfig.textContent || '{}'); } catch(e) {}
            }

            var domainPaths      = config.domainPaths      || [];
            var featuredProjects = config.featuredProjects || [];
            var skills           = config.skills           || {};

            var skillsMap = {
              'ai-ml':        (skills.mlAndData || []).concat(['Python']),
              'fullstack':    (skills.softwareDevelopment || []).concat(skills.databases || []),
              'iot-embedded': (skills.developerTools || []).concat(['ESP32', 'Raspberry Pi']),
              'open-source':  (skills.languages || []).concat(['Python']),
              'hackathons':   (skills.softwareDevelopment || []).concat(['Rapid Prototyping']),
            };

            function dedup(arr) {
              var seen = {};
              return arr.filter(function(x) { return seen[x] ? false : (seen[x] = true); });
            }

            var xRanges = [
              [3800, 5600],
              [8920, 10480],
              [11680, 13280],
              [14020, 15120],
              [15120, 16360],
            ];

            var areas = domainPaths.map(function(dp, i) {
              var rng = xRanges[i] || [3800 + i * 2000, 5800 + i * 2000];
              var domainSkills = dedup(skillsMap[dp.id] || []);

              var domainProjects = featuredProjects.filter(function(p) {
                return Array.isArray(p.tags) && p.tags.indexOf(dp.id) !== -1;
              });

              var articles = domainProjects.map(function(proj) {
                var url = (proj.links && proj.links.github)
                  ? proj.links.github
                  : 'https://github.com/Arpit483';
                return { title: proj.title + ' \\u2014 ' + proj.subtitle, url: url, date: '2026.08.17', language: 'en' };
              });

              if (articles.length === 0) {
                articles.push({ title: dp.label + ' \\u2014 ' + dp.description, url: 'https://github.com/Arpit483', date: '2026.08.17', language: 'en' });
              }

              var skillsLabel = domainSkills.length > 0 ? '  \\u00b7  ' + domainSkills.slice(0, 6).join(' \\u00b7 ') : '';

              return {
                key: dp.id,
                name: (dp.icon ? dp.icon + ' ' : '') + dp.label,
                label: 'domain landmark',
                title: (dp.icon ? dp.icon + ' ' : '') + dp.label,
                role: dp.description,
                description: dp.description + skillsLabel,
                url: '#home-links',
                event: 'explore',
                xStart: rng[0],
                xEnd: rng[1],
                articles: articles
              };
            });

            var personal = config.personal || {};
            areas.unshift({
              key: 'moss',
              name: personal.name || 'Arpit Deosthale',
              label: 'moss',
              title: personal.name || 'Arpit Deosthale',
              role: 'CS Student \\u00b7 Pune, India',
              description: personal.tagline || '',
              url: '#home-links',
              event: 'explore',
              xStart: 0,
              xEnd: 5600,
              articles: []
            });

            var worldData = {
              areas: areas,
              focusArea: 'ai-ml',
              mode: 'journey',
              worldLength: 18000,
              mediaCacheStale: false,
              assets: {
                brand: { logo: '' },
                character: {
                  idle: '/character_sit.svg',
                  walk: [
                    '/character_walk_01.svg',
                    '/character_walk_02.svg',
                    '/character_walk_03.svg',
                    '/character_walk_04.svg',
                    '/character_walk_05.svg',
                    '/character_walk_06.svg'
                  ],
                  sit: '/character_sit.svg',
                  sitChill: '/character_sit_chill.svg',
                  fishStand: '/character_sit.svg',
                  fishSit: '/character_sit_chill.svg',
                  fall: '/character_sit.svg',
                  braceLaunch: '/character_brace_launch.svg',
                  launch: '/character_launch.svg',
                  land: '/character_land.svg',
                  jump: '/character_jump.svg'
                },
                scripts: { atlas: '/scripts/home-atlas.js' }
              },
              links: { about: '#person', media: '#media', projects: '#projects', services: '#services', contact: '#footer' },
              locale: 'en',
              copy: {
                walkStatus: 'Walk with A or D, arrow keys, or on-screen controls to explore.',
                actionStatus: 'Explore this domain.',
                tiltEnable: 'Tilt phone to walk',
                tiltDisable: 'Stop tilt',
                tiltGuide: 'Tilt left or right',
                soundEnable: 'Sound on',
                soundDisable: 'Sound off',
                discoveryKicker: 'domain',
                openArticle: 'See project',
                nextArticle: 'Next project',
                returnWorld: 'Return to Act I',
                transitionEntering: 'Entering Act II \\u2014 Summary.',
                articleLanguage: ''
              }
            };

            var scriptNode = document.createElement('script');
            scriptNode.id = 'home-world-data';
            scriptNode.type = 'application/json';
            scriptNode.textContent = JSON.stringify(worldData);
            document.body.appendChild(scriptNode);
          })();
          `,
        }}
      />

      {/* Load Game Engine Scripts Sequentially */}
      <Script src="/scripts/home-runtime.js" strategy="afterInteractive" />
      <Script src="/scripts/home-engine.js" strategy="afterInteractive" />
      <Script src="/scripts/home-motion.js" strategy="afterInteractive" />
      <Script src="/scripts/home-journey.js" strategy="afterInteractive" />
      <Script src="/scripts/home-audio.js" strategy="afterInteractive" />
      <Script src="/scripts/home-game.js" strategy="afterInteractive" />
      <Script src="/scripts/home-atlas.js" strategy="afterInteractive" />
      <Script src="/scripts/home-reveal.js" strategy="afterInteractive" />
    </div>
  );
};
