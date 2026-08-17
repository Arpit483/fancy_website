(() => {
  const STORAGE_KEY = 'ishikawa-home-sound-muted';
  const WORLD_NOTES = Object.freeze({
    moss: 293.66,
    taupe: 329.63,
    islog: 392,
    ojicra: 440,
    monoomoi: 493.88,
    monoerabi: 587.33,
    hub: 659.25,
  });

  function storedMuted(storage) {
    try {
      return storage?.getItem(STORAGE_KEY) === 'true';
    } catch (_error) {
      return false;
    }
  }

  function createController(options = {}) {
    const scope = options.scope || window;
    let storage = options.storage || null;
    if (!storage) {
      try {
        storage = scope.localStorage;
      } catch (_error) {
        storage = null;
      }
    }
    const AudioContextClass = options.AudioContextClass
      || scope.AudioContext
      || scope.webkitAudioContext;
    let context = null;
    let master = null;
    let unlocked = false;
    let primed = false;
    let muted = storedMuted(storage);
    let played = 0;

    function persistMuted() {
      try {
        storage?.setItem(STORAGE_KEY, muted ? 'true' : 'false');
      } catch (_error) {
        // Sound remains usable when storage is unavailable.
      }
    }

    function ensureContext() {
      if (!AudioContextClass) {
        return null;
      }
      if (!context) {
        context = new AudioContextClass();
        master = context.createGain();
        master.gain.setValueAtTime(0.72, context.currentTime);
        master.connect(context.destination);
      }
      return context;
    }

    function primeContext(nextContext) {
      if (
        primed
        || typeof nextContext.createBuffer !== 'function'
        || typeof nextContext.createBufferSource !== 'function'
      ) {
        return;
      }
      try {
        const buffer = nextContext.createBuffer(1, 1, nextContext.sampleRate || 44100);
        const source = nextContext.createBufferSource();
        source.buffer = buffer;
        source.connect(nextContext.destination);
        source.addEventListener?.('ended', () => source.disconnect(), { once: true });
        source.start(0);
        primed = true;
      } catch (_error) {
        // A silent prime is an iOS compatibility aid; tones can still work without it.
      }
    }

    async function unlock() {
      if (context?.state === 'running') {
        unlocked = true;
        return true;
      }
      const userActivation = scope.navigator?.userActivation;
      if (userActivation && !userActivation.isActive) {
        return false;
      }
      const nextContext = ensureContext();
      if (!nextContext) {
        return false;
      }
      try {
        if (nextContext.state !== 'running' && nextContext.state !== 'closed') {
          await nextContext.resume();
        }
        unlocked = nextContext.state === 'running';
        if (unlocked) {
          primeContext(nextContext);
        }
      } catch (_error) {
        unlocked = false;
      }
      return unlocked;
    }

    function tone(frequency, optionsForTone = {}) {
      if (muted || !unlocked || !Number.isFinite(frequency)) {
        return false;
      }
      const nextContext = ensureContext();
      if (!nextContext || !master) {
        return false;
      }
      const delay = Math.max(0, Number(optionsForTone.delay || 0));
      const duration = Math.max(0.16, Number(optionsForTone.duration || 0.72));
      const gainValue = Math.min(0.075, Math.max(0.008, Number(optionsForTone.gain || 0.032)));
      const startFrequency = Math.max(40, Number(optionsForTone.fromFrequency || frequency));
      const endFrequency = Math.max(40, Number(optionsForTone.toFrequency || frequency));
      const start = nextContext.currentTime + delay;
      const stop = start + duration;
      const oscillator = nextContext.createOscillator();
      const gain = nextContext.createGain();
      oscillator.type = optionsForTone.waveform || 'sine';
      oscillator.frequency.setValueAtTime(startFrequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, stop);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainValue, start + Math.min(0.045, duration * 0.16));
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(stop + 0.03);
      oscillator.addEventListener('ended', () => {
        oscillator.disconnect();
        gain.disconnect();
      }, { once: true });
      played += 1;
      return true;
    }

    function note(key, optionsForNote = {}) {
      return tone(WORLD_NOTES[key] || WORLD_NOTES.hub, optionsForNote);
    }

    function transition(type) {
      if (type === 'launch') {
        return tone(WORLD_NOTES.taupe, {
          duration: 0.9,
          gain: 0.037,
          fromFrequency: WORLD_NOTES.taupe * 0.66,
          toFrequency: WORLD_NOTES.ojicra * 1.5,
        });
      }
      if (type === 'drop') {
        return tone(WORLD_NOTES.moss, {
          duration: 0.82,
          gain: 0.038,
          fromFrequency: WORLD_NOTES.moss * 1.55,
          toFrequency: WORLD_NOTES.taupe * 0.58,
        });
      }
      return tone(WORLD_NOTES.ojicra, {
        duration: 0.76,
        gain: 0.032,
        fromFrequency: WORLD_NOTES.ojicra * 1.35,
        toFrequency: WORLD_NOTES.monoerabi * 0.72,
      });
    }

    function arpeggio(order, optionsForArpeggio = {}) {
      const keys = Array.from(new Set(order || [])).filter((key) => WORLD_NOTES[key]);
      const sequence = optionsForArpeggio.reverse ? keys.reverse() : keys;
      return sequence.reduce((count, key, index) => (
        note(key, {
          delay: index * 0.16,
          duration: 0.64,
          gain: 0.022,
          waveform: index % 3 === 1 ? 'triangle' : 'sine',
        }) ? count + 1 : count
      ), 0);
    }

    function setMuted(nextMuted) {
      muted = Boolean(nextMuted);
      persistMuted();
      if (master && context) {
        const now = context.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(muted ? 0.0001 : 0.72, now, 0.025);
      }
      return muted;
    }

    function toggle() {
      return setMuted(!muted);
    }

    function stats() {
      return {
        supported: Boolean(AudioContextClass),
        unlocked,
        muted,
        state: context?.state || 'idle',
        played,
      };
    }

    return {
      unlock,
      note,
      transition,
      arpeggio,
      setMuted,
      toggle,
      isMuted: () => muted,
      stats,
    };
  }

  window.HomeAudio = {
    STORAGE_KEY,
    WORLD_NOTES,
    createController,
  };
})();
