(() => {
  const DEFAULT_THRESHOLDS = Object.freeze({
    highToMedium: Object.freeze({ aboveMs: 10.5, durationMs: 700 }),
    mediumToLow: Object.freeze({ aboveMs: 15, durationMs: 900 }),
    lowToMedium: Object.freeze({ belowMs: 8.5, durationMs: 4500 }),
    mediumToHigh: Object.freeze({ belowMs: 6.5, durationMs: 8000 }),
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finiteOr = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

  function percentile(sortedValues, ratio) {
    if (!sortedValues.length) {
      return 0;
    }
    const index = Math.min(
      sortedValues.length - 1,
      Math.max(0, Math.ceil(sortedValues.length * ratio) - 1)
    );
    return sortedValues[index];
  }

  function createFrameBudgetMonitor(options = {}) {
    const capacity = Math.max(30, Math.round(options.capacity || 240));
    const budgetMs = Math.max(1, finiteOr(options.budgetMs, 16.67));
    const samples = new Array(capacity);
    let count = 0;
    let cursor = 0;
    let total = 0;
    let overBudget = 0;

    return {
      record(value) {
        const sample = clamp(finiteOr(value), 0, 200);
        if (count < capacity) {
          count += 1;
        } else {
          total -= samples[cursor];
          if (samples[cursor] > budgetMs) {
            overBudget -= 1;
          }
        }
        samples[cursor] = sample;
        cursor = (cursor + 1) % capacity;
        total += sample;
        if (sample > budgetMs) {
          overBudget += 1;
        }
        return sample;
      },
      snapshot() {
        const values = samples.slice(0, count).sort((a, b) => a - b);
        return {
          sampleCount: count,
          averageMs: count ? total / count : 0,
          p95Ms: percentile(values, 0.95),
          p99Ms: percentile(values, 0.99),
          maxMs: values.length ? values[values.length - 1] : 0,
          overBudget,
          budgetMs,
        };
      },
      reset() {
        samples.fill(undefined);
        count = 0;
        cursor = 0;
        total = 0;
        overBudget = 0;
      },
    };
  }

  function createAdaptiveQualityController(options = {}) {
    const configuredThresholds = options.thresholds || {};
    const thresholds = Object.fromEntries(
      Object.entries(DEFAULT_THRESHOLDS).map(([key, defaults]) => [
        key,
        { ...defaults, ...(configuredThresholds[key] || {}) },
      ])
    );
    const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    const smoothing = clamp(finiteOr(options.smoothing, 0.08), 0.01, 1);
    let mode = ['high', 'medium', 'low'].includes(options.initialMode)
      ? options.initialMode
      : 'high';
    let averageMs = 0;
    let sampleCount = 0;
    let slowTimeMs = 0;
    let fastTimeMs = 0;

    function snapshot() {
      return {
        mode,
        averageMs,
        sampleCount,
        slowTimeMs,
        fastTimeMs,
      };
    }

    function changeMode(nextMode) {
      if (nextMode === mode) {
        return;
      }
      const previousMode = mode;
      mode = nextMode;
      slowTimeMs = 0;
      fastTimeMs = 0;
      onChange(nextMode, previousMode, snapshot());
    }

    return {
      observe(workMs, elapsedMs = 16.67, state = {}) {
        const sample = clamp(finiteOr(workMs), 0, 80);
        const elapsed = clamp(finiteOr(elapsedMs, 16.67), 1, 50);
        const recoveryAllowed = state.recoveryAllowed !== false;
        averageMs = sampleCount
          ? averageMs + (sample - averageMs) * smoothing
          : sample;
        sampleCount += 1;

        const downgrade = mode === 'high'
          ? thresholds.highToMedium
          : mode === 'medium' ? thresholds.mediumToLow : null;
        const upgrade = mode === 'low'
          ? thresholds.lowToMedium
          : mode === 'medium' ? thresholds.mediumToHigh : null;

        if (downgrade && averageMs > downgrade.aboveMs) {
          slowTimeMs += elapsed;
        } else {
          slowTimeMs = Math.max(0, slowTimeMs - elapsed * 0.65);
        }

        if (upgrade && recoveryAllowed && averageMs < upgrade.belowMs) {
          fastTimeMs += elapsed;
        } else {
          fastTimeMs = Math.max(0, fastTimeMs - elapsed);
        }

        if (mode === 'high' && slowTimeMs >= thresholds.highToMedium.durationMs) {
          changeMode('medium');
        } else if (mode === 'medium' && slowTimeMs >= thresholds.mediumToLow.durationMs) {
          changeMode('low');
        } else if (mode === 'low' && fastTimeMs >= thresholds.lowToMedium.durationMs) {
          changeMode('medium');
        } else if (mode === 'medium' && fastTimeMs >= thresholds.mediumToHigh.durationMs) {
          changeMode('high');
        }
        return snapshot();
      },
      setMode(nextMode) {
        if (['high', 'medium', 'low'].includes(nextMode)) {
          changeMode(nextMode);
        }
        return snapshot();
      },
      snapshot,
    };
  }

  function createRenderScheduler(options = {}) {
    const configuredActiveFps = finiteOr(options.activeFps, 0);
    const activeFps = configuredActiveFps > 0 ? Math.max(1, configuredActiveFps) : 0;
    const idleFps = Math.max(1, finiteOr(options.idleFps, 30));
    const maxStepMs = Math.max(1, finiteOr(options.maxStepMs, 34));
    const toleranceMs = clamp(finiteOr(options.toleranceMs, 0.75), 0, 4);
    const displayStepMs = Math.max(1, finiteOr(options.displayStepMs, 1000 / 60));
    let lastRenderAt = 0;
    let lastSampleAt = 0;
    let accumulatorMs = 0;
    let hasRendered = false;

    return {
      take(now, activity = 'active', force = false) {
        const current = Math.max(0, finiteOr(now));
        const followsDisplay = activity !== 'idle' && activeFps === 0;
        const targetFps = followsDisplay ? 'display' : activity === 'idle' ? idleFps : activeFps;
        const interval = followsDisplay ? 0 : 1000 / targetFps;
        if (!hasRendered) {
          lastRenderAt = current;
          lastSampleAt = current;
          accumulatorMs = 0;
          hasRendered = true;
          return {
            render: true,
            dt: clamp(interval || displayStepMs, 1, maxStepMs),
            elapsed: interval || displayStepMs,
            activity,
            targetFps,
          };
        }

        const sampleElapsed = Math.max(0, current - lastSampleAt);
        const elapsed = Math.max(0, current - lastRenderAt);
        lastSampleAt = current;
        accumulatorMs += sampleElapsed;
        if (!force && interval > 0 && accumulatorMs + toleranceMs < interval) {
          return { render: false, dt: 0, elapsed, activity, targetFps };
        }

        accumulatorMs = interval > 0 && !force
          ? (accumulatorMs >= interval ? accumulatorMs % interval : 0)
          : 0;
        lastRenderAt = current;
        return {
          render: true,
          dt: clamp(elapsed || interval || displayStepMs, 1, maxStepMs),
          elapsed,
          activity,
          targetFps,
        };
      },
      reset(now = 0) {
        lastRenderAt = Math.max(0, finiteOr(now));
        lastSampleAt = lastRenderAt;
        accumulatorMs = 0;
        hasRendered = false;
      },
      snapshot() {
        return {
          activeFps,
          idleFps,
          displayStepMs,
          lastRenderAt,
          lastSampleAt,
          accumulatorMs,
          hasRendered,
        };
      },
    };
  }

  function createEffectRegistry() {
    const effects = new Map();

    return {
      register(id, handler) {
        if (!id || typeof handler !== 'function') {
          throw new TypeError('Effect registration requires an id and handler.');
        }
        const handlers = effects.get(id) || new Set();
        handlers.add(handler);
        effects.set(id, handlers);
        return () => {
          handlers.delete(handler);
          if (!handlers.size) {
            effects.delete(id);
          }
        };
      },
      emit(id, payload) {
        const handlers = effects.get(id);
        if (!handlers?.size) {
          return false;
        }
        let result = true;
        handlers.forEach((handler) => {
          result = handler(payload);
        });
        return result;
      },
      has(id) {
        return effects.has(id);
      },
      ids() {
        return Array.from(effects.keys());
      },
    };
  }

  function createPhaseProfiler(options = {}) {
    const monitorOptions = {
      capacity: options.capacity || 180,
      budgetMs: options.budgetMs || 16.67,
    };
    const phases = new Map();

    function phase(id) {
      if (!phases.has(id)) {
        phases.set(id, createFrameBudgetMonitor(monitorOptions));
      }
      return phases.get(id);
    }

    return {
      record(id, durationMs) {
        return phase(id).record(durationMs);
      },
      snapshot() {
        return Object.fromEntries(
          Array.from(phases, ([id, monitor]) => [id, monitor.snapshot()])
        );
      },
      reset(id) {
        if (id) {
          phases.get(id)?.reset();
          return;
        }
        phases.forEach((monitor) => monitor.reset());
      },
    };
  }

  globalThis.HomeEngine = Object.freeze({
    createAdaptiveQualityController,
    createEffectRegistry,
    createFrameBudgetMonitor,
    createPhaseProfiler,
    createRenderScheduler,
  });
})();
