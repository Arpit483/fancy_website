(() => {
  const STORAGE_KEY = 'arpit.co:living-atlas:v1';
  const TRANSITION_MS = 4400;
  const COMMIT_AT_MS = 2280;
  const CHAPTER_MORPH_MS = 1120;
  const ATLAS_DEPART_MS = 760;
  const ATLAS_RETURN_MS = 1280;
  const ATLAS_ARRIVAL_KEY = 'arpit.co:atlas-arrival:v1';
  const ATLAS_HISTORY_KEY = 'arpitAtlas';
  const MAX_ATLAS_PARTICLES = 240;
  const MAX_TRANSITION_RAIN_PARTICLES = 240;
  const POINTER_TRAIL_SIZE = 48;
  const ATLAS_IDLE_FPS = 20;
  const ATLAS_ACTIVE_FPS = 60;
  const ATLAS_INTERNAL_PATHS = new Set(['/media/', '/projects/', '/services/', '/about/', '/making-of/', '/contact/', '/privacy/']);
  const WORLD_KEYS = Object.freeze(['ai-ml', 'fullstack', 'iot-embedded', 'open-source', 'hackathons', 'moss', 'taupe', 'islog', 'ojicra', 'monoomoi', 'monoerabi']);
  const FRAGMENT_KEYS = Object.freeze(['person', 'media', 'projects', 'services', 'recognition', 'footer']);
  const FINAL_CONSTELLATION_POINTS = Object.freeze([
    Object.freeze([-92, 0.36]),
    Object.freeze([24, 0.28]),
    Object.freeze([104, 0.43]),
    Object.freeze([72, 0.63]),
    Object.freeze([-20, 0.7]),
    Object.freeze([-112, 0.57]),
  ]);
  const isEnglish = true;
  const CHAPTERS = Object.freeze({
    origin: ['00', 'entrance'],
    person: ['01', 'about arpit'],
    media: ['02', 'domain paths'],
    projects: ['03', 'featured projects'],
    services: ['04', 'services & work'],
    recognition: ['05', 'honors & achievements'],
    footer: ['06', 'contact & activity'],
  });
  const PALETTES = Object.freeze({
    origin: [80, 80, 80],
    media: [40, 40, 40],
    'ai-ml': [30, 30, 30],
    'fullstack': [110, 110, 110],
    'iot-embedded': [140, 140, 140],
    'open-source': [50, 50, 50],
    'hackathons': [90, 90, 90],
    moss: [30, 30, 30],
    taupe: [70, 70, 70],
    islog: [110, 110, 110],
    ojicra: [140, 140, 140],
    monoomoi: [50, 50, 50],
    monoerabi: [90, 90, 90],
    projects: [40, 40, 40],
    services: [80, 80, 80],
    person: [30, 30, 30],
    recognition: [70, 70, 70],
    footer: [20, 20, 20],
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smooth(value) {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function atlasTransitionState(elapsedMs = 0, durationMs = TRANSITION_MS, out = {}) {
    const duration = Math.max(1, Number(durationMs) || TRANSITION_MS);
    const progress = clamp((Number(elapsedMs) || 0) / duration, 0, 1);
    out.progress = progress;
    out.edge = smooth(clamp(progress / 0.07, 0, 1));
    out.fracture = smooth(clamp((progress - 0.055) / 0.19, 0, 1));
    out.fall = smooth(clamp((progress - 0.13) / 0.43, 0, 1));
    out.rain = smooth(clamp((progress - 0.035) / 0.22, 0, 1))
      * (1 - smooth(clamp((progress - 0.58) / 0.18, 0, 1)));
    out.plunge = smooth(clamp((progress - 0.12) / 0.34, 0, 1));
    out.reform = smooth(clamp((progress - 0.51) / 0.32, 0, 1));
    out.settle = smooth(clamp((progress - 0.82) / 0.18, 0, 1));
    out.phase = progress < 0.055
      ? 'edge'
      : progress < 0.245
        ? 'fracture'
        : progress < 0.51
          ? 'freefall'
          : progress < 0.82
            ? 'reform'
            : 'settle';
    return out;
  }

  function shouldAutoEnterAtlas(options = {}) {
    return Boolean(
      Number(options.input) > 0
      && Number(options.x) >= Number(options.triggerX)
      && options.finalized
      && (!options.visited || options.reentryEnabled)
      && !options.active
      && !options.entering
    );
  }

  function atlasInteractionState(options = {}) {
    const linksOpen = Boolean(options.linksOpen);
    const inputLocked = Boolean(options.inputLocked || options.entering);
    return {
      stageInert: linksOpen || inputLocked,
      fallbackInert: !linksOpen || inputLocked,
    };
  }

  function atlasJourneyEndingState(snapshot = {}) {
    const allowed = new Set([...WORLD_KEYS, 'hub']);
    const order = Array.from(new Set(Array.isArray(snapshot.order) ? snapshot.order : []))
      .filter((key) => allowed.has(key));
    const visible = Boolean(snapshot.complete && snapshot.finalized && order.length >= 2);
    return {
      visible,
      order,
      count: order.length,
      exportable: visible && Boolean(snapshot.exportable),
    };
  }

  function atlasJourneyEntranceState(snapshot = {}) {
    const allowed = new Set(WORLD_KEYS);
    const order = Array.from(new Set(Array.isArray(snapshot.order) ? snapshot.order : []))
      .filter((key) => allowed.has(key));
    return {
      state: order.length === 0 ? 'empty' : order.length === WORLD_KEYS.length ? 'complete' : 'partial',
      order,
      count: order.length,
      complete: order.length === WORLD_KEYS.length,
    };
  }

  function atlasApproachState(options = {}) {
    const x = Number(options.x) || 0;
    const startX = Number(options.startX) || 0;
    const triggerX = Math.max(startX + 1, Number(options.triggerX) || startX + 1);
    if (!options.finalized || options.active || options.entering || x < startX) {
      return { phase: 'hidden', progress: 0 };
    }
    const progress = clamp((x - startX) / (triggerX - startX), 0, 1);
    return {
      phase: progress < 0.46 ? 'gathering' : progress < 0.84 ? 'near' : 'threshold',
      progress,
    };
  }

  function atlasScrollCueVisible(options = {}) {
    const maxScrollTop = Number.isFinite(Number(options.maxScrollTop))
      ? Math.max(0, Number(options.maxScrollTop))
      : Number.POSITIVE_INFINITY;
    return Boolean(
      options.active
      && options.idle !== false
      && (Number(options.scrollTop) || 0) < maxScrollTop - 24
    );
  }

  function atlasKeyboardScrollDirection(code = '') {
    if (code === 'KeyW' || code === 'ArrowUp') {
      return -1;
    }
    if (code === 'KeyS' || code === 'ArrowDown') {
      return 1;
    }
    return 0;
  }

  function atlasHistoryRestoreState(state = {}, snapshot = {}) {
    return {
      ...state,
      active: true,
      entering: false,
      departing: false,
      returning: false,
      departureUrl: '',
      scrollTop: Math.max(0, Number(snapshot.scrollTop) || 0),
      focusPath: typeof snapshot.focusPath === 'string' ? snapshot.focusPath : '',
    };
  }

  function atlasTransitionRainCount(quality = 'high') {
    if (quality === 'low') {
      return 72;
    }
    if (quality === 'medium') {
      return 152;
    }
    return MAX_TRANSITION_RAIN_PARTICLES;
  }

  function atlasTransitionTargetRect(source = {}, target = {}, viewport = {}) {
    const sourceWidth = Math.max(1, Number(source.width) || 1);
    const sourceHeight = Math.max(1, Number(source.height) || 1);
    const viewportWidth = Math.max(1, Number(viewport.width) || 1);
    const viewportHeight = Math.max(1, Number(viewport.height) || 1);
    const targetWidth = Number(target.width) > 0 ? Number(target.width) : 184;
    const targetHeight = Number(target.height) > 0 ? Number(target.height) : 138;
    const targetLeft = Number.isFinite(Number(target.left))
      ? Number(target.left)
      : Math.max(38, viewportWidth * 0.5 - 548);
    const targetTop = Number.isFinite(Number(target.top))
      ? Number(target.top)
      : viewportHeight * 0.5 - 58;
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return {
      x: targetLeft + (targetWidth - width) * 0.5,
      y: targetTop + targetHeight - height,
      width,
      height,
      scale,
    };
  }

  function atlasReturnState(elapsedMs = 0, durationMs = ATLAS_RETURN_MS, out = {}) {
    const duration = Math.max(1, Number(durationMs) || ATLAS_RETURN_MS);
    const progress = clamp((Number(elapsedMs) || 0) / duration, 0, 1);
    out.progress = progress;
    out.gather = smooth(clamp((progress - 0.04) / 0.46, 0, 1));
    out.release = smooth(clamp((progress - 0.46) / 0.36, 0, 1));
    out.settle = smooth(clamp((progress - 0.8) / 0.2, 0, 1));
    return out;
  }

  function atlasRestPose(idleMs, moving) {
    if (moving || idleMs < 2600) {
      return moving ? 'walk' : 'idle';
    }
    return idleMs >= 9200 ? 'chill' : 'sit';
  }

  function atlasParticleCount(quality = 'high') {
    if (quality === 'low') {
      return 112;
    }
    if (quality === 'medium') {
      return 176;
    }
    return MAX_ATLAS_PARTICLES;
  }

  function atlasSectionKind(section = 'origin') {
    return WORLD_KEYS.includes(section) ? 'media' : section;
  }

  function atlasGlyphType(section = 'origin', quality = 'high') {
    if (quality === 'low') {
      return 'circle';
    }
    return {
      moss: 'circle',
      taupe: 'square',
      islog: 'dash',
      ojicra: 'diamond',
      monoomoi: 'petal',
      monoerabi: 'triangle',
      projects: 'square',
      services: 'circle',
      person: 'dash',
      recognition: 'diamond',
      footer: 'diamond',
    }[section] || 'circle';
  }

  function isAtlasInternalPath(pathname = '') {
    const normalized = `/${String(pathname).replace(/^\/+|\/+$/g, '')}/`;
    const localeNeutral = normalized.replace(/^\/en\//, '/');
    return ATLAS_INTERNAL_PATHS.has(localeNeutral);
  }

  function atlasFocusPath(href = '', origin = '') {
    try {
      const url = new URL(href, origin);
      if (url.origin !== origin || !isAtlasInternalPath(url.pathname)) {
        return '';
      }
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (_error) {
      return '';
    }
  }

  function atlasDebugModeAllowed(locationLike = {}, runtime = globalThis.HomeRuntime) {
    const hostname = String(locationLike.hostname || '');
    const search = String(locationLike.search || '');
    return Boolean(
      runtime?.debugModeAllowed?.(hostname)
      && new URLSearchParams(search).has('debug')
    );
  }

  function atlasFormationTarget(section = 'origin', index = 0, width = 1200, height = 800, lineX = 140) {
    const kind = atlasSectionKind(section);
    const safeWidth = Math.max(320, width);
    const safeHeight = Math.max(240, height);
    const slot = Math.max(0, Math.floor(index));
    if (kind === 'media') {
      const world = slot % WORLD_KEYS.length;
      const orbitSlot = Math.floor(slot / WORLD_KEYS.length);
      const angle = orbitSlot * 2.3999632297 + world * 0.38;
      const radius = 12 + (orbitSlot % 6) * 4.8;
      return {
        x: lineX + 48 + (world % 2) * 68 + Math.cos(angle) * radius,
        y: safeHeight * (0.18 + Math.floor(world / 2) * 0.31) + Math.sin(angle) * radius,
      };
    }
    if (kind === 'projects') {
      const lane = slot % 4;
      const laneSlot = Math.floor(slot / 4);
      const progress = (laneSlot % 60) / 59;
      const span = Math.min(460, safeWidth * 0.46);
      const bendAt = 0.36;
      const startY = safeHeight * (0.29 + lane * 0.14);
      const bend = lane % 2 ? 38 : -38;
      return {
        x: lineX + progress * span,
        y: startY + (progress > bendAt ? bend : 0),
      };
    }
    if (kind === 'services') {
      const lane = slot % 4;
      const laneSlot = Math.floor(slot / 4);
      const progress = (laneSlot % 60) / 59;
      const startY = safeHeight * (0.27 + lane * 0.15);
      const targetX = Math.min(safeWidth - 90, lineX + Math.min(480, safeWidth * 0.48));
      const targetY = safeHeight * 0.5;
      return {
        x: lineX + (targetX - lineX) * progress,
        y: startY + (targetY - startY) * progress + Math.sin(progress * Math.PI) * (lane - 1.5) * 11,
      };
    }
    if (kind === 'person') {
      const progress = (slot % MAX_ATLAS_PARTICLES) / MAX_ATLAS_PARTICLES;
      const turns = progress * Math.PI * 7.6;
      const radiusX = 18 + progress * 96;
      const radiusY = 12 + progress * 130;
      return {
        x: lineX + 112 + Math.cos(turns) * radiusX,
        y: safeHeight * 0.5 + Math.sin(turns) * radiusY,
      };
    }
    if (kind === 'recognition') {
      const centers = [
        [lineX + 66, safeHeight * 0.28],
        [lineX + 172, safeHeight * 0.39],
        [lineX + 82, safeHeight * 0.59],
        [lineX + 188, safeHeight * 0.7],
      ];
      const center = centers[slot % centers.length];
      const orbitSlot = Math.floor(slot / centers.length);
      const angle = orbitSlot * 2.3999632297 + slot * 0.17;
      const radius = 7 + (orbitSlot % 7) * 3.6;
      return {
        x: Math.min(safeWidth - 30, center[0] + Math.cos(angle) * radius),
        y: center[1] + Math.sin(angle) * radius,
      };
    }
    if (kind === 'footer') {
      const points = [
        [lineX - 92, safeHeight * 0.36],
        [lineX + 24, safeHeight * 0.28],
        [lineX + 92, safeHeight * 0.48],
        [lineX + 12, safeHeight * 0.64],
        [lineX - 112, safeHeight * 0.57],
      ];
      const segmentProgress = (slot % MAX_ATLAS_PARTICLES) / MAX_ATLAS_PARTICLES * points.length;
      const segment = Math.floor(segmentProgress) % points.length;
      const local = segmentProgress - Math.floor(segmentProgress);
      const from = points[segment];
      const to = points[(segment + 1) % points.length];
      return { x: from[0] + (to[0] - from[0]) * local, y: from[1] + (to[1] - from[1]) * local };
    }
    const progress = (slot % MAX_ATLAS_PARTICLES) / MAX_ATLAS_PARTICLES;
    return {
      x: lineX + Math.sin(slot * 0.83) * (14 + (slot % 5) * 4),
      y: -20 + progress * (safeHeight + 40),
    };
  }

  function storageUnlocked() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_error) {
      return false;
    }
  }

  function rememberUnlock() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (_error) {
      // The atlas remains usable when storage is unavailable.
    }
  }

  function createController(options = {}) {
    const runtime = globalThis.HomeRuntime || {};
    const root = options.root;
    const fallback = options.fallback;
    const transition = root?.querySelector('[data-living-atlas-transition]');
    const transitionCanvas = transition?.querySelector('[data-living-atlas-transition-canvas]');
    const transitionCtx = transitionCanvas?.getContext('2d') || null;
    const transitionCharacter = transition?.querySelector('[data-living-atlas-transition-character]');
    const transitionCharacterImg = transitionCharacter?.querySelector('img');
    const entryUtilities = root?.parentElement?.querySelector('.home-entry-utilities');
    const atlasCanvas = fallback?.querySelector('[data-living-atlas-canvas]');
    const atlasCtx = atlasCanvas?.getContext('2d') || null;
    const guide = fallback?.querySelector('[data-living-atlas-guide]');
    const guideImg = guide?.querySelector('img');
    const scrollCue = fallback?.querySelector('[data-atlas-scroll-cue]');
    const content = fallback?.querySelector('[data-living-atlas-content]');
    const shortcut = root?.querySelector('[data-living-atlas-shortcut]');
    const sections = fallback ? Array.from(fallback.querySelectorAll('[data-atlas-section]')) : [];
    const worldRows = fallback ? Array.from(fallback.querySelectorAll('[data-atlas-world]')) : [];
    const projectRows = fallback ? Array.from(fallback.querySelectorAll('[data-atlas-project]')) : [];
    const serviceRows = fallback ? Array.from(fallback.querySelectorAll('[data-atlas-service]')) : [];
    const fragmentMarkers = fallback ? Array.from(fallback.querySelectorAll('[data-atlas-fragment]')) : [];
    const chapterIndex = fallback?.querySelector('[data-atlas-chapter-index]');
    const chapterName = fallback?.querySelector('[data-atlas-chapter-name]');
    const currentMark = fallback?.querySelector('[data-atlas-current-mark]');
    const journeyArrival = fallback?.querySelector('[data-atlas-journey-arrival]');
    const journeyArrivalCount = journeyArrival?.querySelector('[data-atlas-journey-arrival-count]');
    const journeyArrivalCopy = journeyArrival?.querySelector('[data-atlas-journey-arrival-copy]');
    const journeyArrivalWorlds = journeyArrival
      ? Array.from(journeyArrival.querySelectorAll('[data-atlas-journey-world]'))
      : [];
    const journeyEnding = fallback?.querySelector('[data-atlas-journey-ending]');
    const journeyCanvas = currentMark?.querySelector('[data-atlas-journey-constellation]');
    const journeyCtx = journeyCanvas?.getContext('2d') || null;
    const journeyCount = journeyEnding?.querySelector('[data-atlas-journey-count]');
    const journeyKeepsake = journeyEnding?.querySelector('[data-atlas-journey-keepsake]');
    const assets = options.characterAssets || {};
    const walkFrames = Array.isArray(assets.walk) && assets.walk.length ? assets.walk : [assets.idle].filter(Boolean);
    const particles = Array.from({ length: MAX_ATLAS_PARTICLES }, (_, index) => ({
      x: ((index * 67) % 239) / 239,
      y: ((index * 109) % 251) / 251,
      drift: 0.5 + ((index * 17) % 31) / 31,
      phase: ((index * 41) % 97) / 97 * Math.PI * 2,
      size: 0.7 + ((index * 13) % 19) / 19 * 1.8,
      colorIndex: index % 6,
    }));
    const colorSequence = [
      PALETTES.moss,
      PALETTES.taupe,
      PALETTES.islog,
      PALETTES.ojicra,
      PALETTES.monoomoi,
      PALETTES.monoerabi,
    ];
    let active = false;
    let entering = false;
    let transitionFrame = 0;
    let atlasFrame = 0;
    let transitionStartedAt = 0;
    let transitionCommitted = false;
    let atlasStartedDuringTransition = false;
    let sourceRect = null;
    let lastScrollTop = 0;
    let observedScrollTop = 0;
    let scrollDirty = false;
    let lastScrollAt = performance.now();
    let lastAtlasDrawAt = 0;
    let sectionLayoutDirty = true;
    let sectionMetrics = [];
    let lastFrameAt = 0;
    let walkFrame = 0;
    let currentPose = '';
    let activeSection = 'origin';
    let visibleSection = 'origin';
    let visibleChapter = 'origin';
    let sectionProgress = 0;
    let sectionChangedAt = 0;
    let chapterChangedFrom = 'origin';
    let focusedWorld = '';
    let pointerX = -1000;
    let pointerY = -1000;
    let lastPointerAt = 0;
    let trailCursor = 0;
    let trailCount = 0;
    let lastTrailAt = 0;
    let lastTrailX = -1000;
    let lastTrailY = -1000;
    const trailX = new Float32Array(POINTER_TRAIL_SIZE);
    const trailY = new Float32Array(POINTER_TRAIL_SIZE);
    const trailTime = new Float64Array(POINTER_TRAIL_SIZE);
    let departing = false;
    let departureStartedAt = 0;
    let departureUrl = '';
    let departureX = 0;
    let departureY = 0;
    let returning = false;
    let returnStartedAt = 0;
    let discoveryTimer = 0;
    const collectedFragments = new Set();
    const fragmentBursts = [];
    const transitionState = {};
    const returnState = {};
    const transitionDrawCosts = new Float32Array(120);
    let transitionDrawCursor = 0;
    let transitionDrawCount = 0;
    let atlasDrawCount = 0;
    let sectionMeasureCount = 0;
    let scrollCueNudgeTimer = 0;
    let scrollCueIdleTimer = 0;
    let scrollCueAnnounced = false;

    function resizeCanvas(canvas, ctx, dprCap = 1) {
      if (!canvas || !ctx) {
        return;
      }
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const dpr = typeof runtime.canvasRenderScale === 'function'
        ? runtime.canvasRenderScale(width, height, window.devicePixelRatio || 1, dprCap)
        : Math.min(dprCap, window.devicePixelRatio || 1, Math.sqrt(3200000 / (width * height)));
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function atlasDprCap() {
      const quality = root.dataset.renderQuality || 'high';
      return typeof runtime.renderQualityProfile === 'function'
        ? runtime.renderQualityProfile(quality).dprCap
        : quality === 'low' ? 0.7 : quality === 'medium' ? 0.85 : 1;
    }

    function drawJourneyEnding(snapshot = {}) {
      const ending = atlasJourneyEndingState(snapshot);
      const layout = snapshot.layout;
      const layoutReady = Boolean(
        layout
        && Number.isFinite(layout.width)
        && Number.isFinite(layout.height)
        && Array.isArray(layout.points)
        && Array.isArray(layout.edges)
        && layout.points.length === ending.count
      );
      const visible = ending.visible && layoutReady && journeyCanvas && journeyCtx;
      if (journeyEnding) {
        journeyEnding.hidden = !visible;
      }
      if (journeyKeepsake) {
        journeyKeepsake.hidden = !visible || !ending.exportable;
      }
      if (journeyCount) {
        journeyCount.textContent = String(ending.count);
      }
      if (!visible) {
        currentMark?.removeAttribute('data-personal');
        if (journeyCanvas) {
          journeyCanvas.hidden = true;
        }
        return ending;
      }

      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const width = Math.max(1, Number(layout.width));
      const height = Math.max(1, Number(layout.height));
      journeyCanvas.width = Math.round(width * dpr);
      journeyCanvas.height = Math.round(height * dpr);
      journeyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      journeyCtx.clearRect(0, 0, width, height);
      journeyCtx.lineCap = 'round';
      journeyCtx.lineJoin = 'round';
      layout.edges.forEach(([fromIndex, toIndex]) => {
        const from = layout.points[fromIndex];
        const to = layout.points[toIndex];
        if (!from || !to) {
          return;
        }
        const rgb = PALETTES[to.key] || PALETTES.footer;
        journeyCtx.strokeStyle = rgba(rgb, 0.28);
        journeyCtx.lineWidth = 1;
        journeyCtx.beginPath();
        journeyCtx.moveTo(from.x, from.y);
        journeyCtx.lineTo(to.x, to.y);
        journeyCtx.stroke();
      });
      layout.points.forEach((point, index) => {
        const rgb = PALETTES[point.key] || PALETTES.footer;
        const radius = Math.max(3, Math.min(6.5, Number(point.size) * 0.58));
        const glow = journeyCtx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 5.2);
        glow.addColorStop(0, rgba(rgb, 0.32));
        glow.addColorStop(1, rgba(rgb, 0));
        journeyCtx.fillStyle = glow;
        journeyCtx.beginPath();
        journeyCtx.arc(point.x, point.y, radius * 5.2, 0, Math.PI * 2);
        journeyCtx.fill();
        journeyCtx.fillStyle = rgba(rgb, 0.88);
        journeyCtx.beginPath();
        journeyCtx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        journeyCtx.fill();
        journeyCtx.strokeStyle = rgba(rgb, 0.38);
        journeyCtx.lineWidth = 1;
        journeyCtx.beginPath();
        journeyCtx.arc(point.x, point.y, radius + 5 + index % 2 * 2, 0, Math.PI * 2);
        journeyCtx.stroke();
      });
      journeyCanvas.hidden = false;
      currentMark.dataset.personal = 'true';
      return ending;
    }

    function syncJourneyEnding() {
      let snapshot = {};
      try {
        snapshot = options.getJourneySnapshot?.() || {};
      } catch (_error) {
        snapshot = {};
      }
      return drawJourneyEnding(snapshot);
    }

    function drawJourneyEntrance(snapshot = {}) {
      const entrance = atlasJourneyEntranceState(snapshot);
      const found = new Map(entrance.order.map((key, index) => [key, index]));
      journeyArrivalWorlds.forEach((marker, index) => {
        const key = marker.dataset.atlasJourneyWorld || '';
        const discoveryIndex = found.get(key);
        const isFound = Number.isInteger(discoveryIndex);
        marker.classList.toggle('is-found', isFound);
        marker.style.order = String(isFound ? discoveryIndex : entrance.count + index);
        marker.style.setProperty('--journey-order', String(isFound ? discoveryIndex : entrance.count + index));
      });
      if (journeyArrival) {
        journeyArrival.dataset.state = entrance.state;
      }
      if (journeyArrivalCount) {
        journeyArrivalCount.textContent = `${entrance.count} / ${WORLD_KEYS.length}`;
        journeyArrivalCount.hidden = false;
      }
      if (journeyArrivalCopy) {
        const labels = entrance.order
          .map((key) => journeyArrivalWorlds.find((marker) => marker.dataset.atlasJourneyWorld === key)?.dataset.label || key);
        if (entrance.count === 0) {
          journeyArrivalCopy.textContent = 'Worlds not yet walked remain as quiet space. The atlas is still open.'
        } else if (entrance.complete) {
          journeyArrivalCopy.textContent = 'All six colors continue here in the order you found them.';

        } else {
          journeyArrivalCopy.textContent =
            `${labels.join(', ')} ${entrance.count === 1 ? 'continues' : 'continue'} here in the order you found them.`
            ;
        }
      }
      return entrance;
    }

    function syncJourneyEntrance() {
      let snapshot = {};
      try {
        snapshot = options.getJourneySnapshot?.() || {};
      } catch (_error) {
        snapshot = {};
      }
      return drawJourneyEntrance(snapshot);
    }

    function spineX() {
      if (window.innerWidth <= 900) {
        return window.innerWidth <= 420 ? 16 : 22;
      }
      const contentWidth = Math.min(1180, Math.max(984, window.innerWidth - 96));
      return Math.max(126, (window.innerWidth - contentWidth) / 2 + 138);
    }

    function setCharacterImage(node, source) {
      if (node && source && node.getAttribute('src') !== source) {
        node.setAttribute('src', source);
      }
    }

    function unlock() {
      rememberUnlock();
      root.dataset.atlasUnlocked = 'true';
      if (shortcut) {
        shortcut.hidden = false;
      }
    }

    function drawTransitionBackdrop(state, elapsed, width, height) {
      const reveal = transitionCommitted ? state.reform : 0;
      const veilAlpha = clamp(state.fracture * 0.985 * (1 - reveal * 0.96), 0, 0.985);
      if (veilAlpha > 0.001) {
        transitionCtx.fillStyle = `rgba(255,255,255,${veilAlpha.toFixed(3)})`;
        transitionCtx.fillRect(0, 0, width, height);
      }

      if (state.fall <= 0 || state.reform >= 0.92) {
        return;
      }
      const streakAlpha = state.fall * (1 - state.reform) * 0.2;
      transitionCtx.save();
      transitionCtx.lineCap = 'round';
      for (let index = 0; index < 24; index += 1) {
        const x = ((index * 83) % 997) / 997 * width;
        const lane = (elapsed * (0.34 + (index % 5) * 0.07) + index * 71) % (height + 180) - 90;
        const rgb = colorSequence[index % colorSequence.length];
        transitionCtx.strokeStyle = rgba(rgb, streakAlpha * (0.35 + (index % 4) * 0.16));
        transitionCtx.lineWidth = 0.7 + (index % 3) * 0.35;
        transitionCtx.beginPath();
        transitionCtx.moveTo(x, lane + 54 + state.fall * 96);
        transitionCtx.lineTo(x + Math.sin(index * 4.7) * 5, lane - 26 - state.fall * 72);
        transitionCtx.stroke();
      }
      transitionCtx.restore();
    }

    function drawCollapsingGround(state, elapsed, width, height, groundY, startX) {
      const count = Math.ceil(width / 12) + 8;
      for (let index = 0; index < count; index += 1) {
        const x = index * 12 - 30;
        const distance = Math.abs(x - startX) / Math.max(1, width);
        const local = smooth(clamp((state.fracture - distance * 0.24) / 0.78, 0, 1));
        const drop = local * (0.12 + state.fall * 0.88);
        const drift = Math.sin(index * 9.71) * drop * (12 + (index % 5) * 3);
        const y = groundY + drop * drop * (height * 0.62 + (index % 7) * 19);
        const rgb = colorSequence[index % colorSequence.length];
        const alpha = clamp((0.18 + state.edge * 0.28) * (1 - state.reform), 0, 0.5);
        drawGlyph(
          transitionCtx,
          atlasGlyphType(WORLD_KEYS[index % WORLD_KEYS.length], root.dataset.renderQuality || 'high'),
          x + drift,
          y,
          1.15 + (index % 3) * 0.38,
          local * (index % 2 ? 1.6 : -1.3) + elapsed * 0.0002,
          rgb,
          alpha
        );
      }
    }

    function drawTransitionParticles(state, elapsed, width, height, groundY, startX) {
      const quality = root.dataset.renderQuality || 'high';
      const limit = quality === 'low' ? 112 : quality === 'medium' ? 176 : MAX_ATLAS_PARTICLES;
      const targetSpineX = spineX();
      for (let index = 0; index < limit; index += 1) {
        const particle = particles[index];
        const angle = particle.phase + index * 0.19 + elapsed * 0.0014;
        const worldX = particle.x * width;
        const worldY = groundY - 34 - particle.y * Math.min(height * 0.62, 460) + Math.sin(angle) * 8;
        const distance = Math.abs(worldX - startX) / Math.max(1, width);
        const localFracture = smooth(clamp((state.fracture - distance * 0.16 - (index % 11) * 0.006) / 0.72, 0, 1));
        const drop = localFracture * (0.08 + state.fall * 0.92);
        const fallDistance = drop * drop * (height * (0.55 + particle.drift * 0.62) + (index % 13) * 9);
        const fracturedX = worldX + Math.sin(particle.phase * 3.1) * drop * (24 + (index % 7) * 8);
        const fracturedY = worldY + fallDistance;
        const atlasX = targetSpineX + Math.sin(particle.phase * 1.7 + elapsed * 0.001) * (8 + particle.size * 3);
        const atlasY = -50 + particle.y * (height + 100);
        const x = fracturedX + (atlasX - fracturedX) * state.reform;
        const y = fracturedY + (atlasY - fracturedY) * state.reform;
        const rgb = colorSequence[particle.colorIndex];
        const alpha = clamp(0.04 + state.edge * 0.1 + state.fracture * 0.58, 0, 0.72) * (1 - state.settle * 0.9);
        const glyph = atlasGlyphType(WORLD_KEYS[particle.colorIndex], quality);
        if (quality !== 'low' && state.fall > 0.08 && state.reform < 0.78) {
          drawGlyph(
            transitionCtx,
            glyph,
            x - Math.sin(particle.phase * 3.1) * state.fall * 5,
            y - 8 - state.fall * (14 + (index % 4) * 4),
            particle.size * 0.62,
            angle + localFracture * 2.2,
            rgb,
            alpha * 0.22
          );
        }
        drawGlyph(
          transitionCtx,
          glyph,
          x,
          y,
          particle.size * (0.78 + state.fracture * 0.5),
          angle + localFracture * 2.4,
          rgb,
          alpha
        );
      }
    }

    function drawTransitionRain(state, elapsed, width, height) {
      if (state.rain <= 0.001) {
        return;
      }
      const quality = root.dataset.renderQuality || 'high';
      const limit = atlasTransitionRainCount(quality);
      const speed = 0.42 + state.plunge * 0.88;
      for (let index = 0; index < limit; index += 1) {
        const particle = particles[index];
        const lane = ((index * 71) % 257) / 257;
        const fallRange = height + 300;
        const y = ((particle.y * fallRange + elapsed * speed * particle.drift + index * 17) % fallRange) - 220;
        const sway = Math.sin(particle.phase + elapsed * 0.0022) * (8 + particle.drift * 18);
        const x = lane * width + sway;
        const rgb = colorSequence[particle.colorIndex];
        const glyph = atlasGlyphType(WORLD_KEYS[particle.colorIndex], quality);
        const alpha = state.rain * (0.18 + particle.drift * 0.36);
        if (quality !== 'low' && state.plunge > 0.18) {
          drawGlyph(
            transitionCtx,
            glyph,
            x - sway * 0.14,
            y - 18 - particle.drift * 24,
            particle.size * 0.58,
            particle.phase + elapsed * 0.0008,
            rgb,
            alpha * 0.2
          );
        }
        drawGlyph(
          transitionCtx,
          glyph,
          x,
          y,
          particle.size * (0.92 + state.plunge * 0.5),
          particle.phase + elapsed * 0.0011,
          rgb,
          alpha
        );
      }
    }

    function positionTransitionCharacter(state, elapsed, width, height) {
      if (!transitionCharacter || !sourceRect) {
        return;
      }
      const guideRect = guide?.getBoundingClientRect?.();
      const target = atlasTransitionTargetRect(sourceRect, guideRect, { width, height });
      const fallX = width * 0.5 - sourceRect.width * 0.5 + Math.sin(elapsed * 0.007) * 12;
      const worldFallY = sourceRect.top + state.plunge * height * 1.06 + Math.sin(elapsed * 0.012) * 5;
      const xBeforeReform = sourceRect.left + (fallX - sourceRect.left) * state.fall;
      const atlasFallY = target.y - (1 - state.reform) * height * 0.48;
      const reformingIntoAtlas = state.reform > 0.055;
      const x = reformingIntoAtlas
        ? xBeforeReform + (target.x - xBeforeReform) * state.reform
        : xBeforeReform;
      const y = reformingIntoAtlas ? atlasFallY : worldFallY;
      const depthScale = 1 - Math.sin(state.fall * Math.PI) * 0.11;
      const scale = depthScale + (target.scale - depthScale) * state.reform;
      transitionCharacter.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;

      if (!transitionCharacterImg) {
        return;
      }
      let pose = 'idle';
      if (state.phase === 'edge' && walkFrames.length) {
        pose = 'walk';
        setCharacterImage(transitionCharacterImg, walkFrames[Math.floor(elapsed / 112) % walkFrames.length]);
      } else if (state.phase === 'fracture' && state.fall < 0.32) {
        const bracing = state.fracture < 0.5;
        pose = bracing ? 'brace-launch' : 'fall';
        setCharacterImage(
          transitionCharacterImg,
          bracing
            ? assets.braceLaunch || assets.fall || assets.idle || walkFrames[0]
            : assets.fall || assets.braceLaunch || assets.idle || walkFrames[0]
        );
      } else if (state.phase === 'freefall' || state.reform < 0.68) {
        pose = 'fall';
        setCharacterImage(transitionCharacterImg, assets.fall || assets.idle || walkFrames[0]);
      } else if (state.settle < 0.66) {
        pose = 'land';
        setCharacterImage(transitionCharacterImg, assets.land || assets.idle || walkFrames[0]);
      } else {
        setCharacterImage(transitionCharacterImg, assets.idle || walkFrames[0]);
      }
      transitionCharacter.dataset.pose = pose;
    }

    function recordTransitionDraw(startedAt) {
      const cost = Math.max(0, performance.now() - startedAt);
      transitionDrawCosts[transitionDrawCursor] = cost;
      transitionDrawCursor = (transitionDrawCursor + 1) % transitionDrawCosts.length;
      transitionDrawCount = Math.min(transitionDrawCosts.length, transitionDrawCount + 1);
    }

    function drawTransition(now) {
      if (!entering || !transitionCtx || !transitionCanvas || !sourceRect) {
        return;
      }
      const drawStartedAt = performance.now();
      resizeCanvas(transitionCanvas, transitionCtx, 1.25);
      const elapsed = now - transitionStartedAt;
      const state = atlasTransitionState(elapsed, TRANSITION_MS, transitionState);
      const width = window.innerWidth;
      const height = window.innerHeight;
      const startX = sourceRect.left + sourceRect.width * 0.5;
      const groundY = sourceRect.bottom - 2;

      transitionCtx.clearRect(0, 0, width, height);
      drawTransitionBackdrop(state, elapsed, width, height);
      drawTransitionRain(state, elapsed, width, height);
      drawCollapsingGround(state, elapsed, width, height, groundY, startX);
      drawTransitionParticles(state, elapsed, width, height, groundY, startX);
      positionTransitionCharacter(state, elapsed, width, height);

      transition.style.setProperty('--atlas-transition-progress', state.progress.toFixed(3));
      transition.style.setProperty('--atlas-transition-fracture', state.fracture.toFixed(3));
      transition.style.setProperty('--atlas-transition-fall', state.fall.toFixed(3));
      transition.style.setProperty('--atlas-transition-reform', state.reform.toFixed(3));
      transition.style.setProperty(
        '--atlas-transition-title-opacity',
        (smooth(clamp((state.reform - 0.28) / 0.34, 0, 1)) * (1 - state.settle)).toFixed(3)
      );
      root.style.setProperty('--atlas-transition-fracture', state.fracture.toFixed(3));
      root.style.setProperty('--atlas-transition-fall', state.fall.toFixed(3));
      root.style.setProperty('--atlas-transition-reform', state.reform.toFixed(3));
      if (root.dataset.atlasTransitionPhase !== state.phase) {
        root.dataset.atlasTransitionPhase = state.phase;
      }

      if (!transitionCommitted && elapsed >= COMMIT_AT_MS) {
        transitionCommitted = true;
        active = true;
        root.dataset.atlas = 'active';
        atlasStartedDuringTransition = true;
        startAtlas();
        options.onCommit?.({ immediate: false });
      }
      recordTransitionDraw(drawStartedAt);
      if (state.progress >= 1) {
        entering = false;
        active = true;
        transition.setAttribute('aria-hidden', 'true');
        root.dataset.atlas = 'active';
        delete root.dataset.atlasTransitioning;
        delete root.dataset.atlasTransitionPhase;
        root.style.removeProperty('--atlas-transition-fracture');
        root.style.removeProperty('--atlas-transition-fall');
        root.style.removeProperty('--atlas-transition-reform');
        if (entryUtilities) {
          entryUtilities.inert = false;
        }
        unlock();
        if (!atlasStartedDuringTransition) {
          startAtlas();
        }
        deferScrollCue();
        requestAnimationFrame(() => {
          const heading = fallback?.querySelector('h1');
          if (heading) {
            heading.focus({ preventScroll: true });
          } else {
            fallback?.focus({ preventScroll: true });
          }
        });
        options.onComplete?.({ immediate: false });
        return;
      }
      transitionFrame = requestAnimationFrame(drawTransition);
    }

    function currentScrollTop() {
      return root?.scrollTop || 0;
    }

    function syncScrollCue(scrollTop = currentScrollTop(), idle = true) {
      if (!scrollCue) {
        return;
      }
      const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
      const visible = atlasScrollCueVisible({
        active,
        scrollTop,
        maxScrollTop,
        idle,
      });
      scrollCue.classList.toggle('is-hidden', !visible);
      if (!visible) {
        scrollCue.classList.remove('is-nudged');
      }
    }

    function nudgeScrollCue() {
      if (!atlasScrollCueVisible({
        active,
        scrollTop: currentScrollTop(),
        maxScrollTop: Math.max(0, root.scrollHeight - root.clientHeight),
      }) || !scrollCue) {
        return;
      }
      scrollCue.classList.remove('is-nudged');
      requestAnimationFrame(() => scrollCue.classList.add('is-nudged'));
      window.clearTimeout(scrollCueNudgeTimer);
      scrollCueNudgeTimer = window.setTimeout(() => scrollCue.classList.remove('is-nudged'), 920);
      if (!scrollCueAnnounced) {
        scrollCueAnnounced = true;
        options.onScrollCueNudge?.();
      }
    }

    function deferScrollCue() {
      syncScrollCue(currentScrollTop(), false);
      window.clearTimeout(scrollCueIdleTimer);
      scrollCueIdleTimer = window.setTimeout(() => syncScrollCue(currentScrollTop(), true), 680);
    }

    function rgba(rgb, alpha) {
      return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(alpha, 0, 1).toFixed(3)})`;
    }

    function drawGlyph(ctx, type, x, y, size, rotation, rgb, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = rgba(rgb, alpha);
      ctx.strokeStyle = rgba(rgb, alpha);
      ctx.lineWidth = Math.max(0.7, size * 0.18);
      ctx.beginPath();
      if (type === 'square') {
        ctx.rect(-size * 0.55, -size * 0.55, size * 1.1, size * 1.1);
        ctx.fill();
      } else if (type === 'dash') {
        ctx.moveTo(-size * 1.2, 0);
        ctx.lineTo(size * 1.2, 0);
        ctx.stroke();
      } else if (type === 'diamond') {
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.stroke();
      } else if (type === 'petal') {
        ctx.moveTo(0, -size * 1.25);
        ctx.bezierCurveTo(size, -size * 0.7, size * 0.8, size * 0.7, 0, size * 1.2);
        ctx.bezierCurveTo(-size * 0.8, size * 0.7, -size, -size * 0.7, 0, -size * 1.25);
        ctx.fill();
      } else if (type === 'triangle') {
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.94, size * 0.72);
        ctx.lineTo(-size * 0.94, size * 0.72);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function collectFragment(section, now = performance.now()) {
      const key = atlasSectionKind(section);
      if (!FRAGMENT_KEYS.includes(key) || collectedFragments.has(key)) {
        return;
      }
      collectedFragments.add(key);
      fragmentMarkers.find((marker) => marker.dataset.atlasFragment === key)?.classList.add('is-found');
      const rgb = PALETTES[key] || PALETTES.origin;
      fragmentBursts.push({ key, startedAt: now, rgb, phase: collectedFragments.size * 1.37 });
      root.dataset.atlasFragments = String(collectedFragments.size);
      if (guide) {
        guide.dataset.discovering = 'true';
        window.clearTimeout(discoveryTimer);
        discoveryTimer = window.setTimeout(() => delete guide.dataset.discovering, 760);
      }
      if (collectedFragments.size === FRAGMENT_KEYS.length) {
        root.dataset.atlasComplete = 'true';
        currentMark?.classList.add('is-complete');
      }
    }

    function syncChapterLabel(section) {
      const key = atlasSectionKind(section);
      const chapter = CHAPTERS[key] || CHAPTERS.origin;
      if (chapterIndex) {
        chapterIndex.textContent = chapter[0];
      }
      if (chapterName) {
        chapterName.textContent = chapter[1];
      }
    }

    function drawBraid(ctx, now, lineX, height, alpha = 1) {
      colorSequence.forEach((rgb, index) => {
        ctx.strokeStyle = rgba(rgb, 0.13 * alpha);
        ctx.lineWidth = index % 2 ? 1 : 1.25;
        ctx.beginPath();
        for (let y = -30; y <= height + 30; y += 18) {
          const x = lineX + Math.sin(y * 0.012 + now * 0.00045 + index * 1.04) * (18 + index * 3);
          if (y === -30) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });
    }

    function drawMediaPhenomenon(ctx, now, lineX, height, quality) {
      const centerY = height * 0.5;
      const world = WORLD_KEYS.includes(activeSection) ? activeSection : '';
      const count = quality === 'low' ? 30 : 66;
      for (let index = 0; index < count; index += 1) {
        const worldIndex = world ? WORLD_KEYS.indexOf(world) : index % WORLD_KEYS.length;
        const key = world || WORLD_KEYS[worldIndex];
        const rgb = PALETTES[key];
        const orbit = world ? 56 + (index % 5) * 13 : 42 + worldIndex * 12;
        const angle = now * (0.00022 + (index % 3) * 0.000025) + index * 2.399 + worldIndex * 0.62;
        const x = lineX + Math.cos(angle) * orbit + (world ? 0 : (worldIndex - 2.5) * 3);
        const y = centerY + Math.sin(angle * 1.17) * (orbit * 0.72);
        const lift = Math.sin(now * 0.001 + index) * 2;
        drawGlyph(ctx, atlasGlyphType(key, quality), x, y + lift, 1.4 + (index % 4) * 0.55, angle, rgb, world ? 0.3 : 0.18);
      }
    }

    function drawProjectPhenomenon(ctx, now, lineX, height, quality) {
      const lanes = quality === 'low' ? 2 : 4;
      const span = Math.min(430, window.innerWidth * 0.34);
      for (let lane = 0; lane < lanes; lane += 1) {
        const y = height * (0.32 + lane * 0.13);
        const rgb = lane % 2 ? PALETTES.taupe : PALETTES.projects;
        ctx.strokeStyle = rgba(rgb, 0.16);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lineX, y);
        ctx.lineTo(lineX + span * 0.32, y);
        ctx.lineTo(lineX + span * 0.32, y + (lane % 2 ? 42 : -42));
        ctx.lineTo(lineX + span, y + (lane % 2 ? 42 : -42));
        ctx.stroke();
        const travel = ((now * 0.00018 + lane * 0.23) % 1);
        const x = lineX + span * travel;
        const bend = travel > 0.32 ? (lane % 2 ? 42 : -42) : 0;
        drawGlyph(ctx, atlasGlyphType('projects', quality), x, y + bend, 2.2 + lane * 0.2, 0, rgb, 0.52);
      }
    }

    function drawServicePhenomenon(ctx, now, lineX, height) {
      const targetX = pointerX > 0 ? clamp(pointerX, lineX + 30, window.innerWidth - 80) : window.innerWidth * 0.56;
      const targetY = pointerY > 0 ? clamp(pointerY, 90, height - 90) : height * 0.5;
      colorSequence.slice(0, 4).forEach((rgb, index) => {
        const startY = height * (0.29 + index * 0.14);
        const sway = Math.sin(now * 0.0007 + index) * 10;
        ctx.strokeStyle = rgba(rgb, 0.16);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lineX, startY);
        ctx.bezierCurveTo(lineX + 110, startY + sway, targetX - 120, targetY - sway, targetX, targetY);
        ctx.stroke();
        drawGlyph(ctx, 'circle', lineX, startY, 2.1, 0, rgb, 0.58);
      });
      drawGlyph(ctx, 'circle', targetX, targetY, 4.2, 0, PALETTES.services, 0.28);
    }

    function drawPersonPhenomenon(ctx, now, lineX, height, quality) {
      const targetY = height * 0.5;
      colorSequence.forEach((rgb, index) => {
        const fromY = height * (0.15 + index * 0.14);
        ctx.strokeStyle = rgba(rgb, 0.15);
        ctx.beginPath();
        ctx.moveTo(lineX - 126 - index * 6, fromY);
        ctx.bezierCurveTo(lineX - 70, fromY, lineX - 52, targetY, lineX, targetY);
        ctx.stroke();
        const p = (now * 0.00014 + index * 0.15) % 1;
        drawGlyph(ctx, atlasGlyphType(WORLD_KEYS[index], quality), lineX - (1 - p) * (126 + index * 6), fromY + (targetY - fromY) * p, 1.8, p, rgb, 0.42);
      });
    }

    function drawRecognitionPhenomenon(ctx, now, lineX, height, quality) {
      const seals = [
        { x: lineX + 66, y: height * 0.28, rgb: [241, 188, 23] },
        { x: lineX + 172, y: height * 0.39, rgb: [96, 101, 174] },
        { x: lineX + 82, y: height * 0.59, rgb: [226, 91, 66] },
        { x: lineX + 188, y: height * 0.7, rgb: [100, 151, 80] },
      ];
      seals.forEach((seal, sealIndex) => {
        const radius = quality === 'low' ? 20 : 27;
        const pulse = 1 + Math.sin(now * 0.0014 + sealIndex * 1.3) * 0.035;
        ctx.strokeStyle = rgba(seal.rgb, 0.16);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(seal.x, seal.y, radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        const count = quality === 'low' ? 5 : 9;
        for (let index = 0; index < count; index += 1) {
          const angle = now * 0.00018 * (sealIndex % 2 ? -1 : 1) + index / count * Math.PI * 2;
          drawGlyph(
            ctx,
            sealIndex === 0 ? 'dash' : atlasGlyphType('recognition', quality),
            seal.x + Math.cos(angle) * radius,
            seal.y + Math.sin(angle) * radius,
            1.2 + (index % 3) * 0.32,
            angle,
            seal.rgb,
            0.38
          );
        }
        drawGlyph(ctx, 'diamond', seal.x, seal.y, 3.4, now * 0.0002, seal.rgb, 0.52);
      });
    }

    function drawFinalConstellation(ctx, now, lineX, height, quality) {
      const points = FINAL_CONSTELLATION_POINTS.map(([offsetX, offsetY]) => [
        lineX + offsetX,
        height * offsetY,
      ]);
      ctx.strokeStyle = rgba(PALETTES.footer, collectedFragments.size === FRAGMENT_KEYS.length ? 0.34 : 0.14);
      ctx.lineWidth = 1;
      ctx.beginPath();
      points.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      points.forEach(([x, y], index) => {
        const found = index < collectedFragments.size;
        const rgb = colorSequence[index % colorSequence.length];
        const pulse = found ? 1 + Math.sin(now * 0.002 + index) * 0.22 : 0.72;
        drawGlyph(ctx, found ? atlasGlyphType('footer', quality) : 'circle', x, y, (found ? 4 : 2) * pulse, now * 0.0002, rgb, found ? 0.68 : 0.16);
      });
    }

    function drawFragmentBursts(ctx, now, lineX, height, quality) {
      for (let burstIndex = fragmentBursts.length - 1; burstIndex >= 0; burstIndex -= 1) {
        const burst = fragmentBursts[burstIndex];
        const age = now - burst.startedAt;
        if (age > 1050) {
          fragmentBursts.splice(burstIndex, 1);
          continue;
        }
        const progress = smooth(age / 1050);
        const count = quality === 'low' ? 10 : 24;
        for (let index = 0; index < count; index += 1) {
          const angle = burst.phase + index / count * Math.PI * 2;
          const radius = progress * (26 + (index % 5) * 7);
          drawGlyph(ctx, atlasGlyphType(burst.key, quality), lineX + Math.cos(angle) * radius, height * 0.5 + Math.sin(angle) * radius, 1.1 + index % 3, angle, burst.rgb, (1 - progress) * 0.64);
        }
      }
    }

    function drawPointerTrail(ctx, now, quality) {
      if (!trailCount) {
        return;
      }
      const rgb = PALETTES[activeSection] || PALETTES[atlasSectionKind(activeSection)] || PALETTES.origin;
      const step = quality === 'low' ? 4 : 2;
      let hasPath = false;
      ctx.beginPath();
      for (let order = 0; order < trailCount; order += 1) {
        const index = (trailCursor - trailCount + order + POINTER_TRAIL_SIZE) % POINTER_TRAIL_SIZE;
        const age = now - trailTime[index];
        if (age < 0 || age > 860) {
          continue;
        }
        if (!hasPath) {
          ctx.moveTo(trailX[index], trailY[index]);
          hasPath = true;
        } else {
          ctx.lineTo(trailX[index], trailY[index]);
        }
      }
      if (hasPath) {
        ctx.strokeStyle = rgba(rgb, quality === 'low' ? 0.1 : 0.16);
        ctx.lineWidth = quality === 'low' ? 0.7 : 1;
        ctx.stroke();
      }
      for (let order = 0; order < trailCount; order += step) {
        const index = (trailCursor - trailCount + order + POINTER_TRAIL_SIZE) % POINTER_TRAIL_SIZE;
        const age = now - trailTime[index];
        if (age < 0 || age > 860) {
          continue;
        }
        const life = 1 - age / 860;
        drawGlyph(
          ctx,
          atlasGlyphType(activeSection, quality),
          trailX[index],
          trailY[index],
          0.8 + life * 1.4,
          order * 0.21,
          rgb,
          life * (quality === 'low' ? 0.18 : 0.34)
        );
      }
    }

    function drawChapterPulse(ctx, now, width, height, lineX, quality) {
      if (!sectionChangedAt) {
        return 0;
      }
      const age = now - sectionChangedAt;
      if (age >= CHAPTER_MORPH_MS) {
        delete root.dataset.atlasTransforming;
        return 0;
      }
      const progress = clamp(age / CHAPTER_MORPH_MS, 0, 1);
      const strength = Math.sin(progress * Math.PI);
      const rgb = PALETTES[visibleChapter] || PALETTES.origin;
      const radius = 18 + smooth(progress) * Math.min(width, height) * 0.62;
      ctx.strokeStyle = rgba(rgb, (1 - progress) * (quality === 'low' ? 0.11 : 0.22));
      ctx.lineWidth = quality === 'low' ? 0.8 : 1.2;
      ctx.beginPath();
      ctx.arc(lineX, height * 0.5, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba(rgb, strength * (quality === 'low' ? 0.12 : 0.26));
      ctx.beginPath();
      ctx.moveTo(lineX, -20);
      ctx.bezierCurveTo(lineX - 5, height * 0.3, lineX + 6, height * 0.7, lineX, height + 20);
      ctx.stroke();
      return strength;
    }

    function drawChapterFootfall(ctx, now, width, height, lineX, quality) {
      if (!sectionChangedAt) {
        return;
      }
      const age = now - sectionChangedAt;
      if (age < 0 || age >= CHAPTER_MORPH_MS) {
        return;
      }
      const progress = smooth(clamp(age / CHAPTER_MORPH_MS, 0, 1));
      const life = Math.sin(progress * Math.PI);
      const count = quality === 'low' ? 1 : 3;
      const footX = width <= 900 ? 40 : lineX - 38;
      const footY = width <= 900 ? height - 30 : height * 0.5 + 76;
      const rgb = PALETTES[visibleChapter] || PALETTES.origin;
      for (let index = 0; index < count; index += 1) {
        const direction = index - (count - 1) * 0.5;
        const x = footX + direction * (11 + progress * 16);
        const y = footY - progress * (8 + index * 5) + Math.sin(now * 0.006 + index) * 1.8;
        drawGlyph(
          ctx,
          atlasGlyphType(visibleChapter, quality),
          x,
          y,
          1.4 + index * 0.42,
          progress * (index % 2 ? 1.4 : -1.1),
          rgb,
          life * (quality === 'low' ? 0.28 : 0.58)
        );
      }
    }

    function updateSectionMetrics(scrollTop = observedScrollTop) {
      sectionMeasureCount += 1;
      const rootRect = root.getBoundingClientRect();
      sectionMetrics = sections.map((section) => {
        const rect = section.getBoundingClientRect();
        return {
          section,
          top: rect.top - rootRect.top + scrollTop,
          height: Math.max(1, rect.height),
        };
      });
      sectionLayoutDirty = false;
    }

    function syncActiveSection(scrollTop = observedScrollTop) {
      if (sectionLayoutDirty || sectionMetrics.length !== sections.length) {
        updateSectionMetrics(scrollTop);
      }
      const probe = scrollTop + window.innerHeight * 0.46;
      let activeMetric = sectionMetrics[0] || null;
      sectionMetrics.forEach((metric) => {
        if (metric.top <= probe) {
          activeMetric = metric;
        }
      });
      const activeElement = activeMetric?.section || sections[0] || null;
      const next = activeElement?.dataset.atlasSection || 'origin';
      visibleSection = next;
      sectionProgress = activeMetric ? clamp((probe - activeMetric.top) / activeMetric.height, 0, 1) : 0;
      const resolved = next === 'media' && focusedWorld ? focusedWorld : next;
      const nextChapter = atlasSectionKind(next);
      if (nextChapter !== visibleChapter) {
        chapterChangedFrom = visibleChapter;
        visibleChapter = nextChapter;
        sectionChangedAt = performance.now();
        root.dataset.atlasTransforming = `${chapterChangedFrom}:${visibleChapter}`;
        options.onChapterChange?.({ section: visibleChapter, from: chapterChangedFrom });
      }
      if (resolved !== activeSection) {
        activeSection = resolved;
        root.dataset.atlasSection = resolved;
        syncChapterLabel(resolved);
      }
      collectFragment(next);
    }

    function drawAtlas(now) {
      if (!active || !atlasCtx || !atlasCanvas) {
        return;
      }
      if (document.hidden) {
        atlasFrame = requestAnimationFrame(drawAtlas);
        return;
      }
      const scrollTop = observedScrollTop;
      const scrollDelta = scrollTop - lastScrollTop;
      const scrollChanged = scrollDirty || Math.abs(scrollDelta) > 0.2;
      scrollDirty = false;
      if (scrollChanged) {
        lastScrollAt = now;
      }
      const moving = scrollChanged || now - lastScrollAt < 220;
      lastScrollTop = scrollTop;
      const pointerActive = now - lastPointerAt < 900;
      const transforming = sectionChangedAt > 0 && now - sectionChangedAt < CHAPTER_MORPH_MS;
      const activeMotion = moving || departing || returning || transforming || fragmentBursts.length > 0 || pointerActive;
      const frameInterval = 1000 / (activeMotion ? ATLAS_ACTIVE_FPS : ATLAS_IDLE_FPS);
      if (lastAtlasDrawAt && now - lastAtlasDrawAt < frameInterval) {
        atlasFrame = requestAnimationFrame(drawAtlas);
        return;
      }
      lastAtlasDrawAt = now;
      atlasDrawCount += 1;
      resizeCanvas(atlasCanvas, atlasCtx, atlasDprCap());
      const width = window.innerWidth;
      const height = window.innerHeight;
      syncActiveSection(scrollTop);
      const idleMs = now - lastScrollAt;
      const pose = atlasRestPose(idleMs, moving);
      if (pose !== currentPose || (pose === 'walk' && now - lastFrameAt > 92)) {
        currentPose = pose;
        if (pose === 'walk' && walkFrames.length) {
          walkFrame = (walkFrame + 1) % walkFrames.length;
          setCharacterImage(guideImg, walkFrames[walkFrame]);
          lastFrameAt = now;
        } else if (pose === 'sit') {
          setCharacterImage(guideImg, assets.sit || assets.idle);
        } else if (pose === 'chill') {
          setCharacterImage(guideImg, assets.sitChill || assets.sit || assets.idle);
        } else {
          setCharacterImage(guideImg, assets.idle || walkFrames[0]);
        }
        if (guide) {
          guide.dataset.pose = pose;
        }
      }

      const quality = root.dataset.renderQuality || 'high';
      const particleLimit = atlasParticleCount(quality);
      const palette = PALETTES[activeSection] || PALETTES[atlasSectionKind(activeSection)] || PALETTES.origin;
      const lineX = spineX();
      atlasCtx.clearRect(0, 0, width, height);
      atlasCtx.lineWidth = 1;
      const lineGradient = atlasCtx.createLinearGradient(0, 0, 0, height);
      colorSequence.forEach((rgb, index) => {
        lineGradient.addColorStop(index / (colorSequence.length - 1), `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.42)`);
      });
      atlasCtx.strokeStyle = lineGradient;
      atlasCtx.beginPath();
      atlasCtx.moveTo(lineX, -40);
      atlasCtx.bezierCurveTo(lineX - 7, height * 0.3, lineX + 8, height * 0.68, lineX, height + 40);
      atlasCtx.stroke();

      const morphStrength = drawChapterPulse(atlasCtx, now, width, height, lineX, quality);
      drawChapterFootfall(atlasCtx, now, width, height, lineX, quality);

      if (visibleSection === 'origin') {
        drawBraid(atlasCtx, now, lineX, height, 0.7 + sectionProgress * 0.3);
      } else if (visibleSection === 'media') {
        drawMediaPhenomenon(atlasCtx, now, lineX, height, quality);
      } else if (visibleSection === 'projects') {
        drawProjectPhenomenon(atlasCtx, now, lineX, height, quality);
      } else if (visibleSection === 'services') {
        drawServicePhenomenon(atlasCtx, now, lineX, height);
      } else if (visibleSection === 'person') {
        drawPersonPhenomenon(atlasCtx, now, lineX, height, quality);
      } else if (visibleSection === 'recognition') {
        drawRecognitionPhenomenon(atlasCtx, now, lineX, height, quality);
      } else if (visibleSection === 'footer') {
        drawFinalConstellation(atlasCtx, now, lineX, height, quality);
      }

      const t = now * 0.00016;
      const departureProgress = departing ? smooth(clamp((now - departureStartedAt) / ATLAS_DEPART_MS, 0, 1)) : 0;
      const returnMotion = returning
        ? atlasReturnState(now - returnStartedAt, ATLAS_RETURN_MS, returnState)
        : atlasReturnState(0, ATLAS_RETURN_MS, returnState);
      const returnTargetX = width <= 900 ? 40 : lineX - 38;
      const returnTargetY = width <= 900 ? height - 30 : height * 0.5 + 76;
      for (let index = 0; index < particleLimit; index += 1) {
        const particle = particles[index];
        const y = ((particle.y * (height + 180) + scrollTop * (0.06 + particle.drift * 0.035) + t * 520 * particle.drift) % (height + 180)) - 90;
        const wave = Math.sin(particle.phase + t * (7 + particle.drift * 4) + y * 0.006) * (18 + particle.x * 48);
        const baseX = lineX + wave + (particle.x - 0.5) * 90;
        const formation = morphStrength > 0 ? atlasFormationTarget(visibleChapter, index, width, height, lineX) : null;
        let renderX = formation ? baseX + (formation.x - baseX) * morphStrength : baseX;
        let renderY = formation ? y + (formation.y - y) * morphStrength : y;
        if (departureProgress > 0) {
          const spiral = Math.sin(particle.phase + departureProgress * Math.PI * 4) * (1 - departureProgress) * 36;
          renderX += (departureX + spiral - renderX) * departureProgress;
          renderY += (departureY - renderY) * departureProgress;
        }
        if (returning) {
          renderX += (returnTargetX - renderX) * returnMotion.gather;
          renderY += (returnTargetY - renderY) * returnMotion.gather;
          if (returnMotion.release > 0) {
            const releaseAngle = particle.phase + index * 2.3999632297;
            const releaseRadius = returnMotion.release * (48 + particle.drift * 150);
            renderX += Math.cos(releaseAngle) * releaseRadius;
            renderY += Math.sin(releaseAngle) * releaseRadius * 0.62 - returnMotion.release * 28;
          }
        }
        const pointerDistance = Math.hypot(renderX - pointerX, renderY - pointerY);
        const pointerLift = pointerDistance < 130 ? (1 - pointerDistance / 130) * 34 : 0;
        const rgb = index % 5 === 0 ? colorSequence[particle.colorIndex] : palette;
        const alpha = 0.08 + particle.drift * 0.18 + pointerLift * 0.006;
        const glyph = atlasGlyphType(activeSection, quality);
        drawGlyph(
          atlasCtx,
          glyph,
          renderX + pointerLift,
          renderY,
          particle.size + pointerLift * 0.018,
          particle.phase + t * 2,
          rgb,
          Math.min(0.64, alpha) * (1 - departureProgress * 0.86) * (1 - returnMotion.settle)
        );
      }
      drawPointerTrail(atlasCtx, now, quality);
      drawFragmentBursts(atlasCtx, now, lineX, height, quality);
      if (departing) {
        atlasCtx.strokeStyle = rgba(palette, (1 - departureProgress) * 0.48);
        atlasCtx.lineWidth = 1;
        atlasCtx.beginPath();
        atlasCtx.arc(departureX, departureY, 10 + departureProgress * 90, 0, Math.PI * 2);
        atlasCtx.stroke();
        if (departureProgress >= 1 && departureUrl) {
          window.location.assign(departureUrl);
          return;
        }
      }
      if (returning) {
        root.style.setProperty('--atlas-return-progress', returnMotion.progress.toFixed(3));
        root.style.setProperty('--atlas-return-gather', returnMotion.gather.toFixed(3));
        root.style.setProperty('--atlas-return-release', returnMotion.release.toFixed(3));
        if (returnMotion.progress >= 1) {
          returning = false;
          options.onReturnComplete?.();
          return;
        }
      }
      atlasFrame = requestAnimationFrame(drawAtlas);
    }

    function startAtlas() {
      if (!active) {
        return;
      }
      root.scrollTop = 0;
      lastScrollTop = 0;
      observedScrollTop = 0;
      scrollDirty = false;
      lastScrollAt = performance.now();
      lastAtlasDrawAt = 0;
      sectionLayoutDirty = true;
      sectionChangedAt = performance.now();
      visibleChapter = 'origin';
      activeSection = 'origin';
      visibleSection = 'origin';
      root.dataset.atlasSection = 'origin';
      root.dataset.atlasTransforming = 'origin:origin';
      scrollCueAnnounced = false;
      syncScrollCue(0);
      syncChapterLabel('origin');
      try {
        window.sessionStorage.removeItem(ATLAS_ARRIVAL_KEY);
      } catch (_error) {
        // The atlas does not require session storage.
      }
      resizeCanvas(atlasCanvas, atlasCtx, atlasDprCap());
      syncJourneyEntrance();
      syncJourneyEnding();
      cancelAnimationFrame(atlasFrame);
      atlasFrame = requestAnimationFrame(drawAtlas);
    }

    function openImmediate() {
      cancelAnimationFrame(transitionFrame);
      entering = false;
      active = true;
      transition?.setAttribute('aria-hidden', 'true');
      root.dataset.atlas = 'active';
      delete root.dataset.atlasTransitioning;
      delete root.dataset.atlasTransitionPhase;
      root.style.removeProperty('--atlas-transition-fracture');
      root.style.removeProperty('--atlas-transition-fall');
      root.style.removeProperty('--atlas-transition-reform');
      if (entryUtilities) {
        entryUtilities.inert = false;
      }
      unlock();
      startAtlas();
      requestAnimationFrame(deferScrollCue);
    }

    function restorePosition(snapshot = {}) {
      if (!active) {
        openImmediate();
      }
      const restored = atlasHistoryRestoreState({
        active,
        entering,
        departing,
        returning,
        departureUrl,
      }, snapshot);
      active = restored.active;
      entering = restored.entering;
      departing = restored.departing;
      returning = restored.returning;
      departureUrl = restored.departureUrl;
      delete root.dataset.atlasDeparting;
      delete root.dataset.atlasReturning;
      root.style.removeProperty('--atlas-return-progress');
      root.style.removeProperty('--atlas-return-gather');
      root.style.removeProperty('--atlas-return-release');
      const scrollTop = restored.scrollTop;
      root.scrollTop = scrollTop;
      lastScrollTop = scrollTop;
      observedScrollTop = scrollTop;
      scrollDirty = true;
      lastScrollAt = performance.now();
      syncActiveSection(scrollTop);
      syncScrollCue(scrollTop);
      lastAtlasDrawAt = 0;
      cancelAnimationFrame(atlasFrame);
      atlasFrame = requestAnimationFrame(drawAtlas);
      if (restored.focusPath) {
        window.requestAnimationFrame(() => {
          const target = Array.from(fallback?.querySelectorAll('a[href]') || [])
            .find((anchor) => atlasFocusPath(anchor.href, window.location.origin) === restored.focusPath);
          target?.focus({ preventScroll: true });
        });
      }
    }

    function enter(entryOptions = {}) {
      if (active || entering) {
        return false;
      }
      sourceRect = entryOptions.sourceRect || {
        left: window.innerWidth * 0.42,
        top: window.innerHeight * 0.64,
        width: 90,
        height: 72,
        bottom: window.innerHeight * 0.64 + 72,
      };
      if (entryOptions.immediate || options.motionReduced || !transitionCtx) {
        options.onCommit?.({ immediate: true });
        openImmediate();
        options.onComplete?.({ immediate: true });
        return true;
      }
      active = false;
      entering = true;
      transitionCommitted = false;
      atlasStartedDuringTransition = false;
      transitionStartedAt = performance.now();
      root.dataset.atlas = 'entering';
      root.dataset.atlasTransitioning = 'true';
      root.dataset.atlasTransitionPhase = 'edge';
      transition?.setAttribute('aria-hidden', 'false');
      if (entryUtilities) {
        entryUtilities.inert = true;
      }
      if (transitionCharacter) {
        transitionCharacter.style.width = `${sourceRect.width}px`;
        transitionCharacter.style.height = `${sourceRect.height}px`;
      }
      cancelAnimationFrame(transitionFrame);
      transitionFrame = requestAnimationFrame(drawTransition);
      return true;
    }

    function seekTransition(progress = 0) {
      if (!entering) {
        return false;
      }
      const safeProgress = clamp(Number(progress) || 0, 0, 1);
      cancelAnimationFrame(transitionFrame);
      transitionStartedAt = performance.now() - safeProgress * TRANSITION_MS;
      drawTransition(performance.now());
      cancelAnimationFrame(transitionFrame);
      transitionFrame = 0;
      return true;
    }

    function close() {
      const wasEntering = entering;
      cancelAnimationFrame(transitionFrame);
      cancelAnimationFrame(atlasFrame);
      entering = false;
      active = false;
      transition?.setAttribute('aria-hidden', 'true');
      delete root.dataset.atlas;
      delete root.dataset.atlasSection;
      delete root.dataset.atlasFocus;
      delete root.dataset.atlasTransforming;
      delete root.dataset.atlasDeparting;
      delete root.dataset.atlasTransitioning;
      delete root.dataset.atlasTransitionPhase;
      root.style.removeProperty('--atlas-transition-fracture');
      root.style.removeProperty('--atlas-transition-fall');
      root.style.removeProperty('--atlas-transition-reform');
      if (entryUtilities) {
        entryUtilities.inert = false;
      }
      pointerX = -1000;
      pointerY = -1000;
      focusedWorld = '';
      departing = false;
      returning = false;
      departureUrl = '';
      trailCount = 0;
      if (guide) {
        delete guide.dataset.observing;
        delete guide.dataset.discovering;
      }
      window.clearTimeout(discoveryTimer);
      window.clearTimeout(scrollCueIdleTimer);
      delete root.dataset.atlasReturning;
      root.style.removeProperty('--atlas-return-progress');
      root.style.removeProperty('--atlas-return-gather');
      root.style.removeProperty('--atlas-return-release');
      if (wasEntering) {
        options.onCancel?.();
      }
    }

    function beginReturn() {
      if (!active || entering || departing || returning) {
        return false;
      }
      if (options.motionReduced) {
        options.onReturnComplete?.();
        return true;
      }
      returning = true;
      returnStartedAt = performance.now();
      lastScrollAt = returnStartedAt;
      root.dataset.atlasReturning = 'true';
      options.onReturnStart?.();
      return true;
    }

    function onPointerMove(event) {
      if (!active) {
        return;
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      const now = performance.now();
      lastPointerAt = now;
      if (now - lastTrailAt >= 16 && Math.hypot(pointerX - lastTrailX, pointerY - lastTrailY) >= 3) {
        trailX[trailCursor] = pointerX;
        trailY[trailCursor] = pointerY;
        trailTime[trailCursor] = now;
        trailCursor = (trailCursor + 1) % POINTER_TRAIL_SIZE;
        trailCount = Math.min(POINTER_TRAIL_SIZE, trailCount + 1);
        lastTrailAt = now;
        lastTrailX = pointerX;
        lastTrailY = pointerY;
      }
    }

    function beginDeparture(anchor, event) {
      if (!active || departing || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !isAtlasInternalPath(url.pathname)) {
        return;
      }
      event.preventDefault();
      const rect = anchor.getBoundingClientRect();
      departureX = clamp(rect.left + rect.width * 0.5, 40, window.innerWidth - 40);
      departureY = clamp(rect.top + rect.height * 0.5, 40, window.innerHeight - 40);
      departureUrl = url.href;
      departureStartedAt = performance.now();
      departing = true;
      lastScrollAt = departureStartedAt;
      currentPose = '';
      root.dataset.atlasDeparting = 'true';
      try {
        const currentState = window.history.state && typeof window.history.state === 'object'
          ? window.history.state
          : {};
        window.history.replaceState({
          ...currentState,
          [ATLAS_HISTORY_KEY]: {
            active: true,
            scrollTop: Math.round(currentScrollTop()),
            section: visibleSection,
            focusPath: atlasFocusPath(url.href, window.location.origin),
          },
        }, '', window.location.href);
      } catch (_error) {
        // Browser back still works without enhanced Atlas restoration.
      }
      try {
        window.sessionStorage.setItem(ATLAS_ARRIVAL_KEY, JSON.stringify({
          from: 'atlas',
          path: url.pathname,
          x: departureX,
          y: departureY,
          at: Date.now(),
        }));
      } catch (_error) {
        // Navigation remains available when session storage is blocked.
      }
    }

    function setFocusedWorld(key = '') {
      focusedWorld = key;
      if (visibleSection === 'media') {
        activeSection = key || 'media';
        root.dataset.atlasSection = activeSection;
      }
      if (guide) {
        if (key) {
          guide.dataset.observing = key;
        } else {
          delete guide.dataset.observing;
        }
      }
    }

    if (storageUnlocked()) {
      root.dataset.atlasUnlocked = 'true';
      if (shortcut) {
        shortcut.hidden = false;
      }
    }
    shortcut?.addEventListener('click', () => options.onShortcut?.());
    journeyKeepsake?.addEventListener('click', (event) => options.onJourneyKeepsake?.(event));
    fallback?.addEventListener('pointermove', onPointerMove, { passive: true });
    fallback?.addEventListener('click', (event) => {
      const anchor = event.target.closest?.('a[href]');
      if (anchor) {
        beginDeparture(anchor, event);
      }
    });
    fallback?.addEventListener('pointerleave', () => {
      pointerX = -1000;
      pointerY = -1000;
      setFocusedWorld('');
    }, { passive: true });
    worldRows.forEach((row) => {
      row.addEventListener('pointerenter', () => {
        const key = row.dataset.atlasWorld;
        if (key) {
          setFocusedWorld(key);
        }
      });
      row.addEventListener('pointerleave', () => setFocusedWorld(''));
      row.addEventListener('focusin', () => setFocusedWorld(row.dataset.atlasWorld || ''));
      row.addEventListener('focusout', (event) => {
        if (!row.contains(event.relatedTarget)) {
          setFocusedWorld('');
        }
      });
    });
    [...projectRows, ...serviceRows].forEach((row) => {
      row.addEventListener('pointerenter', () => {
        root.dataset.atlasFocus = row.dataset.atlasProject || row.dataset.atlasService || '';
      });
      row.addEventListener('pointerleave', () => delete root.dataset.atlasFocus);
    });
    root.addEventListener('scroll', () => {
      observedScrollTop = root.scrollTop;
      scrollDirty = true;
      lastScrollAt = performance.now();
      deferScrollCue();
    }, { passive: true });
    window.addEventListener('keydown', (event) => {
      if (
        !active
        || event.metaKey
        || event.ctrlKey
        || event.altKey
        || event.target?.closest?.('a, button, input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      const scrollDirection = atlasKeyboardScrollDirection(event.code);
      if (scrollDirection !== 0) {
        event.preventDefault();
        const distance = event.repeat ? 58 : Math.min(320, window.innerHeight * 0.38);
        if (event.repeat) {
          root.scrollTop += scrollDirection * distance;
        } else {
          root.scrollTo({
            top: root.scrollTop + scrollDirection * distance,
            behavior: 'smooth',
          });
        }
        deferScrollCue();
        return;
      }
      if (event.repeat) {
        return;
      }
      if (event.code === 'ArrowRight' || event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'KeyD') {
        nudgeScrollCue();
      }
    });
    window.addEventListener('resize', () => {
      resizeCanvas(transitionCanvas, transitionCtx, 1.25);
      sectionLayoutDirty = true;
      resizeCanvas(atlasCanvas, atlasCtx, atlasDprCap());
      syncJourneyEntrance();
      syncJourneyEnding();
    }, { passive: true });
    content?.querySelectorAll('img').forEach((image) => {
      const memory = image.closest('[data-atlas-memory]');
      const syncImageState = () => {
        if (memory) {
          memory.classList.toggle('is-loaded', image.naturalWidth > 0);
          memory.classList.toggle('is-fallback', image.complete && image.naturalWidth === 0);
        }
        sectionLayoutDirty = true;
      };
      if (image.complete) {
        syncImageState();
      } else {
        image.addEventListener('load', syncImageState, { once: true, passive: true });
        image.addEventListener('error', syncImageState, { once: true, passive: true });
      }
    });

    const controller = Object.freeze({
      enter,
      seekTransition,
      openImmediate,
      restorePosition,
      beginReturn,
      close,
      unlock,
      isActive: () => active,
      isEntering: () => entering,
      isUnlocked: storageUnlocked,
      transitionStats: () => {
        const samples = Array.from(transitionDrawCosts.slice(0, transitionDrawCount)).sort((a, b) => a - b);
        const percentile = (ratio) => samples.length
          ? samples[Math.min(samples.length - 1, Math.floor((samples.length - 1) * ratio))]
          : 0;
        return {
          samples: samples.length,
          median: percentile(0.5),
          p95: percentile(0.95),
          max: samples[samples.length - 1] || 0,
        };
      },
      runtimeStats: () => ({
        atlasDrawCount,
        sectionMeasureCount,
        sectionLayoutDirty,
        dprCap: atlasDprCap(),
      }),
      syncJourneyEntrance,
      syncJourneyEnding,
      destroy: () => {},
    });
    if (atlasDebugModeAllowed(window.location)) {
      globalThis.__homeAtlasStats = controller.runtimeStats;
    }
    return controller;
  }

  globalThis.HomeAtlas = Object.freeze({
    STORAGE_KEY,
    ATLAS_ARRIVAL_KEY,
    ATLAS_HISTORY_KEY,
    TRANSITION_MS,
    CHAPTER_MORPH_MS,
    ATLAS_DEPART_MS,
    ATLAS_RETURN_MS,
    MAX_ATLAS_PARTICLES,
    MAX_TRANSITION_RAIN_PARTICLES,
    WORLD_KEYS,
    FRAGMENT_KEYS,
    FINAL_CONSTELLATION_POINTS,
    atlasRestPose,
    atlasParticleCount,
    atlasSectionKind,
    atlasGlyphType,
    atlasFormationTarget,
    atlasTransitionState,
    atlasReturnState,
    shouldAutoEnterAtlas,
    atlasInteractionState,
    atlasJourneyEntranceState,
    atlasJourneyEndingState,
    atlasApproachState,
    atlasScrollCueVisible,
    atlasKeyboardScrollDirection,
    atlasHistoryRestoreState,
    atlasTransitionRainCount,
    atlasTransitionTargetRect,
    isAtlasInternalPath,
    atlasFocusPath,
    atlasDebugModeAllowed,
    createController,
  });
})();
