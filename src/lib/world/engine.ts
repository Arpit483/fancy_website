import { clamp, finiteOr } from './utils';

const DEFAULT_THRESHOLDS = {
  highToMedium: { aboveMs: 10.5, durationMs: 700 },
  mediumToLow: { aboveMs: 15, durationMs: 900 },
  lowToMedium: { belowMs: 8.5, durationMs: 4500 },
  mediumToHigh: { belowMs: 6.5, durationMs: 8000 },
} as const;

export type QualityMode = 'high' | 'medium' | 'low';

export interface QualitySnapshot {
  mode: QualityMode;
  averageMs: number;
  sampleCount: number;
  slowTimeMs: number;
  fastTimeMs: number;
}

export function createAdaptiveQualityController(options: {
  initialMode?: QualityMode;
  smoothing?: number;
  onChange?: (next: QualityMode, prev: QualityMode, snap: QualitySnapshot) => void;
} = {}) {
  const thresholds = DEFAULT_THRESHOLDS;
  const onChange = options.onChange ?? (() => {});
  const smoothing = clamp(finiteOr(options.smoothing ?? 0.08), 0.01, 1);
  let mode: QualityMode = options.initialMode ?? 'high';
  let averageMs = 0;
  let sampleCount = 0;
  let slowTimeMs = 0;
  let fastTimeMs = 0;

  function snapshot(): QualitySnapshot {
    return { mode, averageMs, sampleCount, slowTimeMs, fastTimeMs };
  }

  function changeMode(nextMode: QualityMode) {
    if (nextMode === mode) return;
    const prev = mode;
    mode = nextMode;
    slowTimeMs = 0;
    fastTimeMs = 0;
    onChange(nextMode, prev, snapshot());
  }

  return {
    observe(workMs: number, elapsedMs = 16.67, state: { recoveryAllowed?: boolean } = {}) {
      const sample = clamp(finiteOr(workMs), 0, 80);
      const elapsed = clamp(finiteOr(elapsedMs) || 16.67, 1, 50);
      const recoveryAllowed = state.recoveryAllowed !== false;
      averageMs = sampleCount ? averageMs + (sample - averageMs) * smoothing : sample;
      sampleCount++;

      const downgrade =
        mode === 'high'
          ? thresholds.highToMedium
          : mode === 'medium'
          ? thresholds.mediumToLow
          : null;
      const upgrade =
        mode === 'low'
          ? thresholds.lowToMedium
          : mode === 'medium'
          ? thresholds.mediumToHigh
          : null;

      if (downgrade && averageMs > downgrade.aboveMs) slowTimeMs += elapsed;
      else slowTimeMs = Math.max(0, slowTimeMs - elapsed * 0.65);

      if (upgrade && recoveryAllowed && averageMs < upgrade.belowMs) fastTimeMs += elapsed;
      else fastTimeMs = Math.max(0, fastTimeMs - elapsed);

      if (mode === 'high' && slowTimeMs >= thresholds.highToMedium.durationMs) changeMode('medium');
      else if (mode === 'medium' && slowTimeMs >= thresholds.mediumToLow.durationMs) changeMode('low');
      else if (mode === 'low' && fastTimeMs >= thresholds.lowToMedium.durationMs) changeMode('medium');
      else if (mode === 'medium' && fastTimeMs >= thresholds.mediumToHigh.durationMs) changeMode('high');

      return snapshot();
    },
    setMode(nextMode: QualityMode) {
      if (['high', 'medium', 'low'].includes(nextMode)) changeMode(nextMode);
      return snapshot();
    },
    snapshot,
    get mode() { return mode; },
  };
}

export function createRenderScheduler(options: {
  activeFps?: number;
  idleFps?: number;
  maxStepMs?: number;
} = {}) {
  const configuredActiveFps = finiteOr(options.activeFps ?? 0);
  const activeFps = configuredActiveFps > 0 ? Math.max(1, configuredActiveFps) : 0;
  const idleFps = Math.max(1, finiteOr(options.idleFps ?? 30));
  const maxStepMs = Math.max(1, finiteOr(options.maxStepMs ?? 34));
  const toleranceMs = 0.75;
  const displayStepMs = 1000 / 60;
  let lastRenderAt = 0;
  let lastSampleAt = 0;
  let accumulatorMs = 0;
  let hasRendered = false;

  return {
    take(now: number, activity: 'active' | 'idle' = 'active', force = false) {
      const current = Math.max(0, finiteOr(now));
      const followsDisplay = activity !== 'idle' && activeFps === 0;
      const targetFps: number | 'display' = followsDisplay ? 'display' : activity === 'idle' ? idleFps : activeFps;
      const interval = followsDisplay ? 0 : typeof targetFps === 'number' ? 1000 / targetFps : 0;

      if (!hasRendered) {
        lastRenderAt = current;
        lastSampleAt = current;
        accumulatorMs = 0;
        hasRendered = true;
        return { render: true, dt: clamp(interval || displayStepMs, 1, maxStepMs), elapsed: interval || displayStepMs };
      }

      const sampleElapsed = Math.max(0, current - lastSampleAt);
      const elapsed = Math.max(0, current - lastRenderAt);
      lastSampleAt = current;
      accumulatorMs += sampleElapsed;

      if (!force && interval > 0 && accumulatorMs + toleranceMs < interval) {
        return { render: false, dt: 0, elapsed };
      }

      accumulatorMs = interval > 0 && !force ? (accumulatorMs >= interval ? accumulatorMs % interval : 0) : 0;
      lastRenderAt = current;
      return { render: true, dt: clamp(elapsed || interval || displayStepMs, 1, maxStepMs), elapsed };
    },
    reset(now = 0) {
      lastRenderAt = Math.max(0, finiteOr(now));
      lastSampleAt = lastRenderAt;
      accumulatorMs = 0;
      hasRendered = false;
    },
  };
}

export function createClock(maxStepMs = 34) {
  let gameTime = 0;
  let lastRealTime = 0;
  let simulationStep = 0;
  let paused = false;

  return {
    now: () => gameTime,
    step: () => simulationStep,
    tick(realNow = performance.now()): number {
      if (paused) { lastRealTime = realNow; simulationStep = 0; return gameTime; }
      if (!lastRealTime) { lastRealTime = realNow; simulationStep = 0; return gameTime; }
      const elapsed = Math.max(0, realNow - lastRealTime);
      simulationStep = Math.min(maxStepMs, elapsed);
      gameTime += elapsed;
      lastRealTime = realNow;
      return gameTime;
    },
    pause(realNow = performance.now()) {
      if (!paused) { this.tick(realNow); paused = true; simulationStep = 0; }
    },
    resume(realNow = performance.now()) {
      paused = false;
      lastRealTime = realNow;
      simulationStep = 0;
      return gameTime;
    },
    get paused() { return paused; },
  };
}

export type EffectHandler<T = unknown> = (payload: T) => void;

export function createEffectRegistry() {
  const effects = new Map<string, Set<EffectHandler>>();
  return {
    register<T>(id: string, handler: EffectHandler<T>) {
      const handlers = effects.get(id) ?? new Set<EffectHandler>();
      handlers.add(handler as EffectHandler);
      effects.set(id, handlers);
      return () => {
        handlers.delete(handler as EffectHandler);
        if (!handlers.size) effects.delete(id);
      };
    },
    emit<T>(id: string, payload: T) {
      const handlers = effects.get(id);
      if (!handlers?.size) return false;
      handlers.forEach((h) => h(payload));
      return true;
    },
    has: (id: string) => effects.has(id),
  };
}
