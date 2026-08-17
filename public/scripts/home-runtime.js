(() => {
  const FRAME_MS = 1000 / 60;
  const CANVAS_MAX_PIXELS = 3200000;
  const RENDER_QUALITY_PROFILES = Object.freeze({
    high: Object.freeze({ dprCap: 1, particleScale: 1, dotScale: 1 }),
    medium: Object.freeze({ dprCap: 0.85, particleScale: 0.78, dotScale: 0.8 }),
    low: Object.freeze({ dprCap: 0.7, particleScale: 0.58, dotScale: 0.62 }),
  });
  const MOSS_WEATHER = Object.freeze({
    rainStartX: 3300,
    rainFullX: 4550,
    rainFadeStartX: 5150,
    rainEndX: 5950,
    lakeFillStartX: 3950,
    lakeFillEndX: 5100,
  });
  const PARTICLE_WORLD_BY_STAGE = Object.freeze({
    'ai-ml': 'moss',
    moss: 'moss',
    brink: 'moss',
    'fall-taupe': 'taupe',
    security: 'taupe',
    taupe: 'taupe',
    'rise-islog': 'islog',
    fullstack: 'islog',
    islog: 'islog',
    launch: 'ojicra',
    'iot-embedded': 'ojicra',
    ojicra: 'ojicra',
    'fall-ground': 'monoomoi',
    'open-source': 'monoomoi',
    monoomoi: 'monoomoi',
    hackathons: 'monoerabi',
    monoerabi: 'monoerabi',
    hub: 'hub',
  });
  const PARTICLE_SHAPE_BY_WORLD = Object.freeze({
    moss: 'dot',
    taupe: 'square',
    islog: 'dash',
    ojicra: 'cube',
    monoomoi: 'petal',
    monoerabi: 'tri',
    hub: 'mix',
  });
  const MEMORY_TRAIL_PALETTE_BY_WORLD = Object.freeze({
    moss: Object.freeze([[88, 132, 104], [106, 181, 195], [143, 169, 132]]),
    taupe: Object.freeze([[79, 229, 219], [238, 93, 176], [231, 205, 81]]),
    islog: Object.freeze([[76, 145, 162], [181, 104, 92], [112, 166, 174]]),
    ojicra: Object.freeze([[188, 194, 104], [137, 91, 157], [104, 183, 164]]),
    monoomoi: Object.freeze([[190, 116, 123], [105, 154, 128], [193, 151, 83]]),
    monoerabi: Object.freeze([[79, 151, 171], [191, 145, 75], [176, 99, 93]]),
    hub: Object.freeze([[80, 164, 180], [230, 112, 174], [117, 184, 143], [207, 166, 84]]),
  });
  const MEDIA_EMBLEM_SPECS = Object.freeze({
    moss: Object.freeze({
      verb: 'walk',
      shape: 'dot',
      rows: Object.freeze([
        '.................',
        '......11.........',
        '...1111211..1....',
        '..111111111.11...',
        '...1111111..1....',
        '......11.........',
        '.................',
        '..222222222222...',
        '...2..2..2..2....',
        '.....3.3.3.......',
        '....3..3..3......',
      ]),
    }),
    taupe: Object.freeze({
      verb: 'connect',
      shape: 'square',
      rows: Object.freeze([
        '..22222222222....',
        '..2.........2....',
        '..2..11111..2....',
        '..2..1...1..2....',
        '..2..11111..2....',
        '..2.........2....',
        '..22222222222....',
        '.......2.........',
        '.....22222.......',
        '..111111111111...',
        '...........3.....',
        '...........333...',
      ]),
    }),
    islog: Object.freeze({
      verb: 'capture',
      shape: 'dash',
      rows: Object.freeze([
        '...3.............',
        '..111......111....',
        '..121....1111111..',
        '..111....1.....1..',
        '...1.....1..1..1..',
        '...1.....1111111..',
        '...1..............',
        '...1..222222222...',
        '..111.............',
        '111111111111111...',
        '...2..2..2..2.....',
      ]),
    }),
    ojicra: Object.freeze({
      verb: 'build',
      shape: 'cube',
      rows: Object.freeze([
        '........333......',
        '.......33........',
        '........3........',
        '.................',
        '.....2222........',
        '....211112.......',
        '...21111112......',
        '...21122112......',
        '...21111112......',
        '...22222222......',
        '.....1..1........',
        '....11..11.......',
      ]),
    }),
    monoomoi: Object.freeze({
      verb: 'unwrap',
      shape: 'petal',
      rows: Object.freeze([
        '......3.3........',
        '.......3.........',
        '.....22222.......',
        '...111121111.....',
        '...1...2...1.....',
        '...1...2...1.....',
        '...1...2...1.....',
        '...111121111.....',
        '.......3.........',
        '.....3...3.......',
        '...3.......3.....',
      ]),
    }),
    monoerabi: Object.freeze({
      verb: 'choose',
      shape: 'tri',
      rows: Object.freeze([
        '..1......1......1',
        '.1.1....1.1....1.1',
        '11111..1...1..1...1',
        '.......1...1..1...1',
        '........111....11111',
        '...................',
        '....2..............',
        '.....2.........3...',
        '......2.......33...',
        '.......2.2...33....',
        '........2...3......',
      ]),
    }),
  });
  const MEDIA_EMBLEM_BLUEPRINTS = new Map();

  function mediaEmblemGroup(verb, column, row, width, height, tone) {
    if (verb === 'connect') {
      return Math.min(6, Math.floor((column / Math.max(1, width - 1)) * 6));
    }
    if (verb === 'capture') {
      return (column + row) % 4;
    }
    if (verb === 'build') {
      return Math.min(6, Math.floor(((height - row - 1) / Math.max(1, height - 1)) * 6));
    }
    if (verb === 'unwrap') {
      const distance = Math.hypot(column - (width - 1) * 0.5, row - (height - 1) * 0.5);
      return Math.min(6, Math.floor(distance * 0.8));
    }
    if (verb === 'choose') {
      return tone === 2 ? 6 : Math.min(5, Math.floor((column / Math.max(1, width - 1)) * 5));
    }
    const distance = Math.hypot(column - (width - 1) * 0.5, row - (height - 1) * 0.46);
    return Math.min(6, Math.floor(distance * 0.72));
  }

  function mediaEmblemBlueprint(key) {
    const spec = MEDIA_EMBLEM_SPECS[key];
    if (!spec) {
      return null;
    }
    if (MEDIA_EMBLEM_BLUEPRINTS.has(key)) {
      return MEDIA_EMBLEM_BLUEPRINTS.get(key);
    }
    const height = spec.rows.length;
    const width = Math.max(...spec.rows.map((row) => row.length));
    const points = [];
    spec.rows.forEach((row, rowIndex) => {
      Array.from(row).forEach((token, columnIndex) => {
        if (token === '.') {
          return;
        }
        const tone = Math.max(0, Math.min(2, Number(token) - 1));
        points.push(Object.freeze({
          x: (columnIndex / Math.max(1, width - 1)) * 100,
          y: (rowIndex / Math.max(1, height - 1)) * 100,
          tone,
          role: tone === 2 ? 'ambient' : 'form',
          group: mediaEmblemGroup(spec.verb, columnIndex, rowIndex, width, height, tone),
        }));
      });
    });
    const blueprint = Object.freeze({
      key,
      verb: spec.verb,
      shape: spec.shape,
      points: Object.freeze(points),
    });
    MEDIA_EMBLEM_BLUEPRINTS.set(key, blueprint);
    return blueprint;
  }

  function mediaEmblemShouldAssemble(options = {}) {
    return Boolean(
      !options.assembled
      && options.visible
      && options.settled
      && !options.blocked
    );
  }

  function createClock(options = {}) {
    const maxStepMs = options.maxStepMs || 34;
    let gameTime = 0;
    let lastRealTime = 0;
    let simulationStep = 0;
    let visibleElapsed = 0;
    let paused = false;

    return {
      now() {
        return gameTime;
      },
      tick(realNow = performance.now()) {
        if (paused) {
          lastRealTime = realNow;
          simulationStep = 0;
          visibleElapsed = 0;
          return gameTime;
        }
        if (!lastRealTime) {
          lastRealTime = realNow;
          simulationStep = 0;
          visibleElapsed = 0;
          return gameTime;
        }
        const elapsed = Math.max(0, realNow - lastRealTime);
        visibleElapsed = elapsed;
        simulationStep = Math.min(maxStepMs, elapsed);
        gameTime += elapsed;
        lastRealTime = realNow;
        return gameTime;
      },
      step() {
        return simulationStep;
      },
      elapsed() {
        return visibleElapsed;
      },
      pause(realNow = performance.now()) {
        if (!paused) {
          this.tick(realNow);
          paused = true;
          simulationStep = 0;
          visibleElapsed = 0;
        }
      },
      resume(realNow = performance.now()) {
        paused = false;
        lastRealTime = realNow;
        simulationStep = 0;
        visibleElapsed = 0;
        return gameTime;
      },
      get paused() {
        return paused;
      },
    };
  }

  function frameLerp(factor, dt) {
    const normalized = Math.max(0, dt) / FRAME_MS;
    return 1 - Math.pow(1 - factor, normalized);
  }

  function frameDamping(retention, dt) {
    return Math.pow(retention, Math.max(0, dt) / FRAME_MS);
  }

  function finiteOr(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function smoothProgress(value, start, end) {
    const distance = Math.max(1, end - start);
    const progress = Math.max(0, Math.min(1, (finiteOr(value) - start) / distance));
    return progress * progress * (3 - 2 * progress);
  }

  function mossRainIntensity(x) {
    const arrival = smoothProgress(x, MOSS_WEATHER.rainStartX, MOSS_WEATHER.rainFullX);
    const departure = 1 - smoothProgress(x, MOSS_WEATHER.rainFadeStartX, MOSS_WEATHER.rainEndX);
    return arrival * departure;
  }

  function mossLakeFill(x) {
    return smoothProgress(x, MOSS_WEATHER.lakeFillStartX, MOSS_WEATHER.lakeFillEndX);
  }

  function stablePointSample(x, y, salt = 0) {
    const qx = Math.round(finiteOr(x) * 8);
    const qy = Math.round(finiteOr(y) * 8);
    let hash = Math.imul(qx, 374761393)
      ^ Math.imul(qy, 668265263)
      ^ Math.imul(Math.round(finiteOr(salt)), 1442695041);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  }

  function renderQualityProfile(mode = 'high') {
    const profile = RENDER_QUALITY_PROFILES[mode] || RENDER_QUALITY_PROFILES.high;
    return { ...profile };
  }

  function particleWorldForStage(stage = 'moss') {
    return PARTICLE_WORLD_BY_STAGE[stage] || 'moss';
  }

  function particleShapeForWorld(world = 'moss', quality = 'high') {
    if (quality === 'low') {
      return 'dot';
    }
    return PARTICLE_SHAPE_BY_WORLD[world] || 'dot';
  }

  function particleShapeForStage(stage = 'moss', quality = 'high') {
    return particleShapeForWorld(particleWorldForStage(stage), quality);
  }

  function memoryTrailPalette(stage = 'moss', sample = 0, reverse = false) {
    const world = particleWorldForStage(stage);
    const palette = MEMORY_TRAIL_PALETTE_BY_WORLD[world] || MEMORY_TRAIL_PALETTE_BY_WORLD.moss;
    const normalized = Math.max(0, Math.min(0.999999, finiteOr(sample)));
    let index = normalized < 0.68 ? 0 : normalized < 0.91 ? 1 : 2;
    index = Math.min(index, palette.length - 1);
    if (reverse) {
      index = (index + 1) % palette.length;
    }
    return { world, color: palette[index], index };
  }

  function particleMorphScale(elapsedMs, durationMs = 360) {
    const duration = Math.max(1, finiteOr(durationMs, 360));
    const progress = Math.max(0, Math.min(1, finiteOr(elapsedMs) / duration));
    if (progress <= 0 || progress >= 1) {
      return 1;
    }
    return 1 + Math.sin(progress * Math.PI) * 0.46;
  }

  function paperFragmentCount(type = 'drop', quality = 'high') {
    const baseCount = type === 'return-drop' ? 36 : 72;
    if (quality === 'low') {
      return Math.round(baseCount / 3);
    }
    if (quality === 'medium') {
      return Math.round(baseCount * 0.72);
    }
    return baseCount;
  }

  function discoveryTitleParticleLimit(quality = 'high', textLength = 0) {
    const length = Math.max(0, Math.floor(finiteOr(textLength)));
    const base = quality === 'low' ? 28 : quality === 'medium' ? 58 : 84;
    const boostCap = quality === 'low' ? 8 : quality === 'medium' ? 18 : 24;
    const boostRate = quality === 'low' ? 0.45 : quality === 'medium' ? 0.8 : 1.1;
    const lengthBoost = Math.min(boostCap, Math.floor(length * boostRate));
    return Math.max(36, base + lengthBoost);
  }

  function introIdentityPointLimit(quality = 'high') {
    if (quality === 'low') {
      return 84;
    }
    if (quality === 'medium') {
      return 146;
    }
    return 220;
  }

  function introIdentityWidth(logoSize = 230, viewportWidth = 1440, english = false) {
    const size = Math.max(0, finiteOr(logoSize, 230));
    const width = Math.max(0, finiteOr(viewportWidth, 1440));
    if (!english) {
      return Math.max(190, Math.min(242, size * 1.04));
    }
    const maxWidth = Math.min(330, Math.max(190, width - 40));
    const minWidth = Math.min(260, maxWidth);
    return Math.max(minWidth, Math.min(maxWidth, size * 1.42));
  }

  function particleBurstBatches(count, options = {}) {
    const total = Math.max(0, Math.floor(finiteOr(count)));
    if (total === 0) {
      return [];
    }
    const maxPerFrame = Math.max(1, Math.floor(finiteOr(options.maxPerFrame, 24)));
    const minimumFrames = Math.max(1, Math.floor(finiteOr(options.minimumFrames, 1)));
    const frameCount = Math.max(minimumFrames, Math.ceil(total / maxPerFrame));
    const base = Math.floor(total / frameCount);
    const remainder = total % frameCount;
    return Array.from({ length: frameCount }, (_, index) => (
      base + (index < remainder ? 1 : 0)
    )).filter((batch) => batch > 0);
  }

  function advanceMaxVisitedX(maxVisitedX, previousX, nextX, walkingForward = true) {
    const currentMax = finiteOr(maxVisitedX, finiteOr(previousX));
    const from = finiteOr(previousX, currentMax);
    const to = finiteOr(nextX, from);
    if (!walkingForward || to <= from) {
      return currentMax;
    }
    return Math.max(currentMax, to);
  }

  function parallaxCanvasOffset(currentCamera, renderedCamera, scale, parallax = 1) {
    return -(
      finiteOr(currentCamera) - finiteOr(renderedCamera)
    ) * finiteOr(scale, 1) * Math.max(0, finiteOr(parallax, 1));
  }

  function canvasRenderScale(width, height, deviceDpr = 1, dprCap = 1, maxPixels = CANVAS_MAX_PIXELS) {
    const safeWidth = Math.max(1, finiteOr(width, 1));
    const safeHeight = Math.max(1, finiteOr(height, 1));
    const safeDeviceDpr = Math.max(0.1, finiteOr(deviceDpr, 1));
    const safeDprCap = Math.max(0.1, finiteOr(dprCap, 1));
    const safeMaxPixels = Math.max(1, finiteOr(maxPixels, CANVAS_MAX_PIXELS));
    const pixelLimitedScale = Math.sqrt(safeMaxPixels / (safeWidth * safeHeight));
    return Math.min(safeDeviceDpr, safeDprCap, pixelLimitedScale);
  }

  function isInteractiveTarget(target) {
    return Boolean(
      target
      && typeof target.closest === 'function'
      && target.closest('a, button, input, textarea, select, summary, [contenteditable="true"], [role="button"]')
    );
  }

  function shouldActivateArticleShortcut(code, hasArticleLink, interactiveTarget = false) {
    return code === 'Enter' && Boolean(hasArticleLink) && !interactiveTarget;
  }

  function idleRestPose(elapsedMs, options = {}) {
    const sitAfterMs = Math.max(0, finiteOr(options.sitAfterMs, 8500));
    const chillAfterMs = Math.max(sitAfterMs, finiteOr(options.chillAfterMs, 18000));
    const elapsed = Math.max(0, finiteOr(elapsedMs));
    if (elapsed >= chillAfterMs) {
      return 'sit-chill';
    }
    if (elapsed >= sitAfterMs) {
      return 'sit';
    }
    return 'idle';
  }

  function movementGuideShouldShow(options = {}) {
    const idleMs = Math.max(0, finiteOr(options.idleMs));
    const delayMs = Math.max(0, finiteOr(options.delayMs, 900));
    return Boolean(
      options.started
      && !options.moving
      && !options.blocked
      && !options.actionAvailable
      && idleMs >= delayMs
    );
  }

  function homeDependenciesReady(dependencies = {}, required = ['runtime', 'engine', 'motion', 'journey']) {
    return required
      .every((key) => Boolean(dependencies[key]));
  }

  function homeCanvasContextsReady(contexts = []) {
    return Array.isArray(contexts)
      && contexts.length > 0
      && contexts.every((context) => Boolean(context));
  }

  function debugModeAllowed(hostname = '') {
    const normalized = String(hostname).trim().toLowerCase();
    return normalized === 'localhost'
      || normalized === '127.0.0.1'
      || normalized === '::1'
      || normalized.endsWith('.localhost');
  }

  function transitionWarmupSlice(progress, completedSlices = 0, totalSlices = 4) {
    const slices = Math.max(1, Math.floor(finiteOr(totalSlices, 4)));
    const completed = Math.max(0, Math.floor(finiteOr(completedSlices)));
    const normalized = Math.max(0, Math.min(1, finiteOr(progress)));
    const desired = Math.min(slices, Math.floor(normalized * (slices + 1)));
    return completed < desired ? completed : -1;
  }

  function mediaSignShouldRead(options = {}) {
    const distance = Math.abs(finiteOr(options.distance, Number.POSITIVE_INFINITY));
    const radius = Math.max(0, finiteOr(options.radius, 320));
    const idleMs = Math.max(0, finiteOr(options.idleMs));
    const delayMs = Math.max(0, finiteOr(options.delayMs, 520));
    return Boolean(
      options.visible
      && !options.moving
      && !options.blocked
      && distance <= radius
      && idleMs >= delayMs
    );
  }

  function mediaSignInteractionPhase(options = {}) {
    const distance = Math.abs(finiteOr(options.distance, Number.POSITIVE_INFINITY));
    const radius = Math.max(0, finiteOr(options.radius, 320));
    const approachRatio = Math.max(1, finiteOr(options.approachRatio, 1));
    if (
      !options.visible
      || options.blocked
      || distance > radius * approachRatio
    ) {
      return 'far';
    }
    return mediaSignShouldRead(options) ? 'ready' : 'approach';
  }

  function mediaSignShouldSound(options = {}) {
    return Boolean(options.reading && !options.wasReading);
  }

  function mediaSignViewportShift(options = {}) {
    const viewportWidth = Math.max(0, finiteOr(options.viewportWidth));
    const inset = Math.max(0, finiteOr(options.inset, 16));
    const appliedShift = finiteOr(options.appliedShift);
    const baseLeft = finiteOr(options.left) - appliedShift;
    const baseRight = finiteOr(options.right) - appliedShift;
    const availableRight = Math.max(inset, viewportWidth - inset);
    const width = Math.max(0, baseRight - baseLeft);

    if (!viewportWidth || width <= 0) {
      return 0;
    }
    if (width >= availableRight - inset) {
      return inset - baseLeft;
    }
    if (baseLeft < inset) {
      return inset - baseLeft;
    }
    if (baseRight > availableRight) {
      return availableRight - baseRight;
    }
    return 0;
  }

  function journeyCameraProfile(options = {}) {
    const touch = Boolean(options.touch);
    const cinematic = Boolean(options.cinematic);
    const moving = Boolean(options.moving);
    return {
      anchorRatio: touch ? 0.43 : 0.42,
      follow: cinematic ? 0.11 : touch ? (moving ? 0.15 : 0.105) : 0.075,
    };
  }

  function movementPulseShouldQueue(options = {}) {
    return Boolean(
      options.enabled
      && !options.repeat
      && !options.blocked
      && !options.cinematic
    );
  }

  function movementPulseVelocity(options = {}) {
    const direction = Math.sign(finiteOr(Number(options.direction)));
    const currentVelocity = finiteOr(Number(options.currentVelocity));
    if (!direction) {
      return currentVelocity;
    }
    const minSpeed = Math.max(0, finiteOr(Number(options.minSpeed), 0.12));
    const maxSpeed = Math.max(minSpeed, finiteOr(Number(options.maxSpeed), 0.48));
    const speed = Math.max(minSpeed, currentVelocity * direction);
    return direction * Math.min(maxSpeed, speed);
  }

  function mediaSignShouldOpen(code, options = {}) {
    return Boolean(
      code === 'Enter'
      && options.reading
      && options.hasLink
      && !options.repeat
      && !options.interactiveTarget
    );
  }

  function keyboardShouldUnlockAudio(code, options = {}) {
    if (options.repeat || options.interactiveTarget || options.motionReduced) {
      return false;
    }
    return code === 'ArrowRight'
      || code === 'ArrowLeft'
      || code === 'KeyA'
      || code === 'KeyD'
      || code === 'Enter'
      || code === 'Space';
  }

  function pageNavigationType(performanceApi = {}) {
    try {
      const entry = performanceApi.getEntriesByType?.('navigation')?.[0];
      if (typeof entry?.type === 'string' && entry.type) {
        return entry.type;
      }
    } catch (_error) {
      // Fall through to the legacy navigation type.
    }
    const legacyType = Number(performanceApi.navigation?.type);
    if (legacyType === 1) {
      return 'reload';
    }
    if (legacyType === 2) {
      return 'back_forward';
    }
    return 'navigate';
  }

  function characterActionCue(options = {}) {
    if (options.linksOpen || options.atlasEntering || options.cinematic) {
      return '';
    }
    if (options.mediaSign) {
      return 'enter';
    }
    if (
      options.discovery
      || options.journeyHint
      || options.focusHint
      || options.fishingHold
    ) {
      return 'space';
    }
    if (options.mediaSignApproach) {
      return 'approach';
    }
    return '';
  }

  function articleDiscoveryShouldJump(options = {}) {
    return Boolean(
      !options.motionReduced
      && options.hasAsset
    );
  }

  function articleLandingParticleCount(quality = 'high') {
    if (quality === 'low') {
      return 9;
    }
    if (quality === 'medium') {
      return 14;
    }
    return 18;
  }

  const TOUCH_ACTION_STATES = Object.freeze({
    none: Object.freeze({ available: false, action: 'none', label: 'Inspect', glyph: '○' }),
    skip: Object.freeze({ available: true, action: 'skip', label: 'Skip Scene', glyph: '≫' }),
    cancelFishing: Object.freeze({ available: true, action: 'cancel-fishing', label: 'Cancel', glyph: '×' }),
    openMedia: Object.freeze({ available: true, action: 'open-media', label: 'Open Link', glyph: '↗' }),
    discover: Object.freeze({ available: true, action: 'discover', label: 'Next Project', glyph: '+' }),
    interact: Object.freeze({ available: true, action: 'interact', label: 'Inspect', glyph: '○' }),
    reel: Object.freeze({ available: true, action: 'interact', label: 'Reel In', glyph: '○' }),
  });

  function touchActionState(options = {}) {
    if (!options.enabled || options.linksOpen || options.atlasEntering) {
      return TOUCH_ACTION_STATES.none;
    }
    if (options.cinematic) {
      return TOUCH_ACTION_STATES.skip;
    }
    if (options.fishing && options.fishing !== 'hold') {
      return TOUCH_ACTION_STATES.cancelFishing;
    }
    if (options.mediaSign) {
      return TOUCH_ACTION_STATES.openMedia;
    }
    if (options.discovery) {
      return TOUCH_ACTION_STATES.discover;
    }
    if (options.fishing === 'hold') {
      return TOUCH_ACTION_STATES.reel;
    }
    if (options.interaction) {
      return TOUCH_ACTION_STATES.interact;
    }
    return TOUCH_ACTION_STATES.none;
  }

  function touchInteractionTarget(options = {}) {
    if (options.action === 'interact' && options.focus && options.focusReady) {
      return 'focus';
    }
    if (options.journey) {
      return 'journey';
    }
    if (options.focus) {
      return 'focus';
    }
    return 'default';
  }

  function screenRelativeTilt(options = {}) {
    const beta = finiteOr(Number(options.beta));
    const gamma = finiteOr(Number(options.gamma));
    const rawAngle = finiteOr(Number(options.angle));
    const angle = ((Math.round(rawAngle / 90) * 90) % 360 + 360) % 360;
    if (angle === 90) {
      return beta;
    }
    if (angle === 180) {
      return -gamma;
    }
    if (angle === 270) {
      return -beta;
    }
    return gamma;
  }

  function tiltWalkInput(options = {}) {
    const tilt = finiteOr(Number(options.tilt));
    const baseline = finiteOr(Number(options.baseline));
    const deadZone = Math.max(0, finiteOr(Number(options.deadZone), 5));
    const fullTilt = Math.max(deadZone + 1, finiteOr(Number(options.fullTilt), 18));
    const delta = tilt - baseline;
    const magnitude = Math.abs(delta);
    if (magnitude <= deadZone) {
      return 0;
    }
    const strength = Math.min(1, (magnitude - deadZone) / (fullTilt - deadZone));
    return delta < 0 ? -strength : strength;
  }

  globalThis.HomeRuntime = Object.freeze({
    FRAME_MS,
    MOSS_WEATHER,
    PARTICLE_SHAPE_BY_WORLD,
    createClock,
    frameLerp,
    frameDamping,
    finiteOr,
    mossRainIntensity,
    mossLakeFill,
    stablePointSample,
    renderQualityProfile,
    particleWorldForStage,
    particleShapeForWorld,
    particleShapeForStage,
    memoryTrailPalette,
    particleMorphScale,
    paperFragmentCount,
    discoveryTitleParticleLimit,
    introIdentityPointLimit,
    introIdentityWidth,
    particleBurstBatches,
    advanceMaxVisitedX,
    parallaxCanvasOffset,
    canvasRenderScale,
    isInteractiveTarget,
    shouldActivateArticleShortcut,
    idleRestPose,
    movementGuideShouldShow,
    homeDependenciesReady,
    homeCanvasContextsReady,
    debugModeAllowed,
    transitionWarmupSlice,
    mediaSignShouldRead,
    mediaSignInteractionPhase,
    mediaSignShouldSound,
    mediaSignViewportShift,
    journeyCameraProfile,
    movementPulseShouldQueue,
    movementPulseVelocity,
    mediaSignShouldOpen,
    keyboardShouldUnlockAudio,
    pageNavigationType,
    characterActionCue,
    articleDiscoveryShouldJump,
    articleLandingParticleCount,
    touchActionState,
    touchInteractionTarget,
    screenRelativeTilt,
    tiltWalkInput,
    mediaEmblemBlueprint,
    mediaEmblemShouldAssemble,
  });
})();
