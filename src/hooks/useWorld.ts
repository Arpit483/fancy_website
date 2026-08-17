'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera } from '@/components/World/Camera';
import { Character } from '@/components/World/Character';
import { InputController } from '@/components/World/InputController';
import { ParticleSystem } from '@/components/World/ParticleSystem';
import { WorldObjectsManager } from '@/components/World/WorldObjects';
import { renderWorld } from '@/components/World/WorldRenderer';
import { createClock, createAdaptiveQualityController } from '@/lib/world/engine';
import { zoneAt } from '@/data/zones';
import type { Project, WorldObject, Zone } from '@/types/world';

interface UseWorldOptions {
  onProjectInteract?: (project: Project) => void;
}

export function useWorld({ onProjectInteract }: UseWorldOptions = {}) {
  const [canvas, setCanvasState] = useState<HTMLCanvasElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentZone, setCurrentZone] = useState<Zone>(zoneAt(0));
  const [nearObject, setNearObject] = useState<WorldObject | null>(null);
  const [progress, setProgress] = useState(0);

  const inputRef = useRef(new InputController());
  const cameraRef = useRef(new Camera(18000));
  const characterRef = useRef(new Character());
  const particlesRef = useRef(new ParticleSystem());
  const objectsRef = useRef(new WorldObjectsManager());
  const clockRef = useRef(createClock(34));
  const qualityRef = useRef(createAdaptiveQualityController());

  const animFrameIdRef = useRef<number | null>(null);
  const onProjectInteractRef = useRef(onProjectInteract);
  onProjectInteractRef.current = onProjectInteract;

  const setCanvas = useCallback((canvasNode: HTMLCanvasElement) => {
    setCanvasState(canvasNode);
  }, []);

  const setTouchMove = useCallback((dir: 'left' | 'right' | null) => {
    inputRef.current.setTouchMove(dir);
  }, []);

  const jumpTo = useCallback((x: number) => {
    characterRef.current.x = x;
    cameraRef.current.x = x - cameraRef.current.viewportWidth * 0.42;
  }, []);

  useEffect(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      cameraRef.current.updateViewport(w, h);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      inputRef.current.handleKeyDown(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      inputRef.current.handleKeyUp(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const initEngine = async () => {
      await characterRef.current.preloadAssets();
      particlesRef.current.buildWorldDots(18000);
      setIsLoaded(true);

      const clock = clockRef.current;
      let lastTime = performance.now();

      const gameLoop = (now: number) => {
        if (!isRunning) return;

        const dt = Math.min(34, now - lastTime);
        lastTime = now;
        clock.tick(now);

        const input = inputRef.current.input;
        const character = characterRef.current;
        const camera = cameraRef.current;
        const objects = objectsRef.current;
        const particles = particlesRef.current;

        character.update(input.left, input.right, dt, 550);

        const isMoving = input.left || input.right;
        camera.update(character.x, dt, isMoving);

        renderWorld(ctx, camera, character, particles, objects, now);

        const near = objects.getNearObject(character.x);
        setNearObject(near);

        if (input.interact && near && near.type === 'project' && near.data) {
          inputRef.current.resetInteract();
          onProjectInteractRef.current?.(near.data as Project);
        }

        const zone = zoneAt(character.x);
        setCurrentZone(zone);
        setProgress(Math.min(100, Math.round((character.x / 18000) * 100)));

        animFrameIdRef.current = requestAnimationFrame(gameLoop);
      };

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    initEngine();

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canvas]);

  return {
    setCanvas,
    isLoaded,
    currentZone,
    nearObject,
    progress,
    setTouchMove,
    jumpTo,
  };
}
