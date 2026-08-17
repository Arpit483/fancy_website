(() => {
  const root = document.querySelector('[data-home-game]');
  const dataNode = document.getElementById('home-world-data');
  if (!root || !dataNode) {
    return;
  }

  let config;
  try {
    config = JSON.parse(dataNode.textContent || '{}');
  } catch (error) {
    console.error('Failed to initialize the home world.', error);
    return;
  }
  const isEnglish = true;
  const uiCopy = {
    walkStatus: config.copy?.walkStatus || 'Walk with A or D keys, arrow keys, or on-screen controls to explore.',
    actionStatus: config.copy?.actionStatus || 'Interactive landmark. Press E or tap to explore.',
    tiltEnable: config.copy?.tiltEnable || 'Tilt phone to walk',
    tiltDisable: config.copy?.tiltDisable || 'Stop tilt',
    tiltPermission: config.copy?.tiltPermission || 'Hold phone at a comfortable angle to calibrate.',
    tiltActive: config.copy?.tiltActive || 'Tilt control active. Tilt phone left or right to walk.',
    tiltDenied: config.copy?.tiltDenied || 'Tilt control permission denied. Use on-screen arrows.',
    tiltUnsupported: config.copy?.tiltUnsupported || 'Tilt control unsupported on this device. Use on-screen arrows.',
    soundEnable: config.copy?.soundEnable || 'Sound on',
    soundDisable: config.copy?.soundDisable || 'Sound off',
    discoveryKicker: config.copy?.discoveryKicker || 'domain landmark',
    openArticle: config.copy?.openArticle || 'View Project',
    nextArticle: config.copy?.nextArticle || 'Next Project',
    returnWorld: config.copy?.returnWorld || 'Return to Walkable World',
    transitionEntering: config.copy?.transitionEntering || 'Entering Act II — Summary Map.',
    articleLanguage: config.copy?.articleLanguage || '',
  };
  const journeySignalName = 'arpit:journey-signal';
  const emitJourneySignal = (event, parameters = {}) => {
    try {
      window.dispatchEvent(new CustomEvent(journeySignalName, {
        detail: { event, parameters },
      }));
    } catch (_error) {
      // Analytics is optional and must never block the journey.
    }
  };
  const openStaticFallback = () => {
    const fallbackLinks = document.getElementById('home-links');
    const stage = root.querySelector('.home-game__stage');
    root.dataset.gameReady = 'true';
    root.dataset.links = 'open';
    root.dataset.fallbackStatic = 'true';
    if (stage) {
      stage.inert = true;
    }
    if (fallbackLinks) {
      fallbackLinks.inert = false;
    }
    emitJourneySignal('atlas_enter', { entry_mode: 'direct' });
  };
  const runtime = window.HomeRuntime;
  const engine = window.HomeEngine;
  const motion = window.HomeMotion;
  const journey = window.HomeJourney;
  const atlas = window.HomeAtlas;
  const dependenciesReady = runtime?.homeDependenciesReady?.({
    runtime,
    engine,
    motion,
    journey,
    atlas,
  }) || false;
  if (!dependenciesReady) {
    openStaticFallback();
    return;
  }

  const debugParams = new URLSearchParams(window.location.search);
  const initialAtlasRequested = root.dataset.initialAtlas === 'true';
  const debugEnabled = runtime.debugModeAllowed(window.location.hostname)
    && debugParams.has('debug');
  const performanceHudEnabled = debugEnabled && debugParams.has('hud');
  if (debugEnabled) {
    root.dataset.debug = 'true';
  }
  const touchControlsQuery = window.matchMedia('(max-width: 1079px), (pointer: coarse)');
  const syncTouchControlsMode = () => {
    root.dataset.touchControls = touchControlsQuery.matches ? 'true' : 'false';
  };
  syncTouchControlsMode();
  const clock = runtime.createClock();
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fallback = document.getElementById('home-links');
  const stageNode = root.querySelector('.home-game__stage');
  const viewportNode = root.querySelector('.home-game__viewport');
  const skipLink = document.querySelector('.game-skip');
  const closeLinksButtons = fallback ? Array.from(fallback.querySelectorAll('[data-close-home-links]')) : [];
  const atlasRestartButton = fallback?.querySelector('[data-atlas-restart]');
  let motionReduced = motionQuery.matches;
  if (motionReduced) {
    root.dataset.motion = 'reduced';
    emitJourneySignal('atlas_enter', { entry_mode: 'direct' });
    motionQuery.addEventListener('change', (event) => {
      if (!event.matches) {
        window.location.reload();
      }
    }, { once: true });
    return;
  }

  const areas = config.areas || [];
  const focusArea = config.focusArea || null;
  const audio = window.HomeAudio?.createController?.() || null;
  const isJourneyMode = config.mode === 'journey' && Boolean(journey);
  const isFocusMode = Boolean(focusArea);
  const areaMap = new Map(areas.map((area) => [area.key, area]));
  const focusTargetArea = focusArea ? areaMap.get(focusArea) : null;
  const world = root.querySelector('[data-world]');
  const labelsLayer = root.querySelector('[data-world-labels]');
  const farLayer = root.querySelector('[data-layer="far"]');
  const midLayer = root.querySelector('[data-layer="mid"]');
  const nearLayer = root.querySelector('[data-layer="near"]');
  const atmosphereLayer = root.querySelector('[data-atmosphere]');
  const dotWorldFarCanvas = root.querySelector('[data-dot-world-far-canvas]');
  const dotWorldFarCtx = dotWorldFarCanvas?.getContext('2d') || null;
  const dotWorldCanvas = root.querySelector('[data-dot-world-canvas]');
  const dotWorldCtx = dotWorldCanvas?.getContext('2d') || null;
  const particleCanvas = root.querySelector('[data-particle-canvas]');
  const particleCtx = particleCanvas?.getContext('2d') || null;
  const character = root.querySelector('[data-character]');
  const characterImg = root.querySelector('[data-character-img]');
  const characterImages = new Map();
  const characterReadyPromises = new Map();
  let activeCharacterImg = characterImg;
  let characterTouchTimer = 0;
  const characterClearance = document.createElement('div');
  const progressLine = root.querySelector('[data-progress-line]');
  const progressDot = root.querySelector('[data-progress-dot]');
  const help = root.querySelector('[data-help]');
  const startHint = root.querySelector('[data-start-hint]');
  const card = root.querySelector('[data-event-card]');
  const cardKicker = root.querySelector('[data-card-kicker]');
  const cardTitle = root.querySelector('[data-card-title]');
  const cardDescription = root.querySelector('[data-card-description]');
  const cardList = root.querySelector('[data-card-list]');
  const cardLink = root.querySelector('[data-card-link]');
  const map = root.querySelector('[data-game-map]');
  const mapJumpButtons = map ? Array.from(map.querySelectorAll('[data-jump]')) : [];
  const gameStatus = root.querySelector('[data-game-status]');
  const soundButton = root.querySelector('[data-game-sound]');
  const soundIcon = soundButton?.querySelector('[aria-hidden="true"]');
  const keepsakeButton = root.querySelector('[data-journey-keepsake]');
  const atlasKeepsakeButton = fallback?.querySelector('[data-atlas-journey-keepsake]');
  const touchControls = root.querySelector('[data-touch-control-bar]');
  const touchMovementButtons = touchControls
    ? Array.from(touchControls.querySelectorAll('[data-touch-move]'))
    : [];
  const touchActionButton = touchControls?.querySelector('[data-touch-action]');
  const touchActionGlyph = touchActionButton?.querySelector('[data-touch-action-glyph]');
  const touchActionLabel = touchActionButton?.querySelector('[data-touch-action-label]');
  const tiltWalkButton = touchControls?.querySelector('[data-tilt-walk]');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const WORLD_LENGTH = isJourneyMode
    ? Number(config.worldLength || journey.WORLD_LENGTH || 18000)
    : isFocusMode ? (focusTargetArea?.xEnd || 2500) + 700 : 12000;
  const WORLD_PROGRESS_END = isJourneyMode
    ? WORLD_LENGTH - 520
    : isFocusMode ? focusTargetArea?.xEnd || 2500 : 11200;
  const LIVING_ATLAS_TRIGGER_X = isJourneyMode ? WORLD_LENGTH - 360 : Number.POSITIVE_INFINITY;
  const LIVING_ATLAS_CUE_X = isJourneyMode ? LIVING_ATLAS_TRIGGER_X - 760 : Number.POSITIVE_INFINITY;
  const WORLD_HEIGHT = 900;
  const CHARACTER_SCALE = 0.9;
  const CHARACTER_W = 285 * CHARACTER_SCALE;
  const CHARACTER_H = 214 * CHARACTER_SCALE;
  const CHARACTER_CLEARANCE_W = 116;
  const CHARACTER_CLEARANCE_H = 164;
  const CHARACTER_CLEARANCE_GROUND_LIFT = 2;
  const FISHING_ROD_TIP_OFFSET_X = CHARACTER_W * (922.7 / 1024 - 0.5);
  const FISHING_ROD_TIP_OFFSET_Y = CHARACTER_H * (78.4 / 768 - 1);
  const CATCH_PAPER_WIDTH = 430;
  const CATCH_PAPER_OFFSET_X = -145;
  const CATCH_PAPER_OFFSET_Y = -520;
  const CATCH_HOOK_OFFSET_X = 70;
  const WALK_FRAME_MS = 88;
  const INTRO_WALK_FRAME_MS = 132;
  const IDLE_SIT_AFTER_MS = 8500;
  const IDLE_CHILL_AFTER_MS = 18000;
  const ARTICLE_DISCOVERY_JUMP_MS = 840;
  const ARTICLE_DISCOVERY_LANDING_MS = 780;
  const ARTICLE_LANDING_PARTICLE_SCOPE = 'article-landing';
  const SECRET_PICKUP_DURATION_MS = 900;
  const FOCUS_GROUND_START = 1080;
  const INTRO_DURATION_MS = 3900;
  const INTRO_LOGO_MIN_MS = 1100;
  const INTRO_LOGO_REVEAL_MS = 620;
  const INTRO_LOGO_GATHER_MS = 720;
  const INTRO_LOAD_TIMEOUT_MS = 2600;
  const INTRO_LOGO_CENTER_Y_RATIO = 0.445;
  const INTRO_IDENTITY = 'ARPIT DEOSTHALE';
  const INTRO_SEED_DURATION_MS = 1800;
  const INTRO_GROUND_START_MS = 760;
  const INTRO_GROUND_END_MS = 3200;
  const INTRO_CHARACTER_START_MS = 1120;
  const GROUND_DOT_STEP = 7.5;
  const KINTSUGI_START_X = 560;
  const KINTSUGI_MOTE_INTERVAL_MS = Object.freeze({
    high: 300,
    medium: 460,
    low: 720,
  });
  const MOVEMENT_PULSE_MIN_SPEED = 0.12;
  const MOVEMENT_CODES = new Set(['ArrowRight', 'ArrowLeft', 'KeyA', 'KeyD']);
  const keys = new Set();
  const drawn = new Set();
  const touched = new Set();
  const lines = [];
  const shapes = [];
  const labels = [];
  const mediaSigns = [];
  let nextMediaSignUpdateAt = 0;
  let mediaAffordanceLearned = false;
  let mediaApproachAnnounced = false;
  const eventLines = [];
  const moodNodes = [];
  const dotWorld = {
    dots: [],
    cloudDots: [],
    buckets: new Map(),
    colors: new Map(),
    activeDots: [],
    activeBucketStart: Number.NaN,
    activeBucketEnd: Number.NaN,
    built: false,
    visibleCount: 0,
    reflectionCount: 0,
    logoCount: 0,
  };
  const DOT_BUCKET_SIZE = 640;
  const DOT_BUCKET_MARGIN = 1280;
  const DOT_CANVAS_OVERSCAN = 96;
  const particles = [];
  const particlePool = [];
  const particleSpawnQueue = [];
  const DISCOVERY_TITLE_PARTICLE_SCOPE = 'discovery-title';
  const splashFanCache = new Map();
  const titleGlyphCanvas = document.createElement('canvas');
  const titleGlyphCtx = titleGlyphCanvas.getContext('2d', { willReadFrequently: true });
  const transitionWarmupCanvas = document.createElement('canvas');
  transitionWarmupCanvas.width = 64;
  transitionWarmupCanvas.height = 64;
  const transitionWarmupCtx = transitionWarmupCanvas.getContext('2d');
  if (!runtime.homeCanvasContextsReady([
    dotWorldFarCtx,
    dotWorldCtx,
    particleCtx,
    titleGlyphCtx,
    transitionWarmupCtx,
  ])) {
    openStaticFallback();
    return;
  }
  let particleGeneration = 0;
  let particleEvictionCursor = 0;
  let discoveryTitleFormationSerial = 0;
  const particleRuntimeStats = {
    preallocated: 0,
    created: 0,
    reused: 0,
    recycled: 0,
    trimmed: 0,
    queuedParticles: 0,
    emittedFromQueue: 0,
    emittedThisFrame: 0,
    maxEmittedPerFrame: 0,
    queuePeak: 0,
  };
  // Keep particle values data-driven so future effects can be tuned without
  // threading new magic numbers through the game loop.
  const PARTICLE_CONFIG = {
    maxCount: isJourneyMode ? 1400 : 720,
    dotRender: {
      default: { sizeScale: 0.64, maxSize: 7.2, alphaScale: 0.74 },
      footstep: { sizeScale: 0.66, maxSize: 2.8, alphaScale: 0.68 },
      text: { sizeScale: 1, maxSize: Infinity, alphaScale: 1 },
    },
  };
  const PARTICLE_MORPH_DURATION_MS = 360;
  const WORLD_SHAPE_PARTICLE_TYPES = new Set([
    'bit',
    'dash',
    'dot',
    'footstep',
    'leaf',
    'ring',
    'spark',
  ]);
  const HUB_SHAPE_SEQUENCE = Object.freeze([
    'dot',
    'square',
    'dash',
    'cube',
    'petal',
    'tri',
  ]);
  const PARTICLE_EFFECTS = {
    footstepTrail: {
      startedInterval: 165,
      introInterval: 240,
      count: 5,
      sideOffset: 15,
      trailOffset: 18,
      yOffset: -2,
      spreadX: [-7, 7],
      spreadY: [-2, 2],
      vx: [-0.026, 0.026],
      trailVx: [0.014, 0.034],
      vy: [-0.058, -0.016],
      ay: 0.000055,
      size: [1.05, 2.55],
      life: [240, 430],
      palette: [
        [74, 82, 74],
        [88, 99, 85],
        [104, 96, 82],
        [118, 130, 112],
      ],
      alpha: [0.24, 0.38],
      spin: [-0.012, 0.012],
    },
    fishingCast: {
      count: 2,
      spreadX: [-18, 18],
      spreadY: [-12, 10],
      vx: [-0.16, 0.16],
      vy: [-0.2, -0.04],
      size: [2, 4],
      life: [520, 900],
      color: { r: 84, g: 164, b: 180, a: [0.42, 0.72] },
    },
    fishingWaitRing: {
      interval: 130,
      spreadX: [-28, 34],
      spreadY: [0, 16],
      vx: [-0.04, 0.04],
      vy: [-0.03, 0.03],
      size: [9, 18],
      life: [900, 1500],
      color: 'rgba(80, 170, 190, 0.28)',
    },
    fishingBite: {
      count: 4,
      spreadX: [-20, 20],
      spreadY: [-8, 16],
      vx: [-0.22, 0.22],
      vy: [-0.35, -0.08],
      ay: 0.00032,
      size: [2, 5],
      life: [420, 760],
      color: { r: 46, g: 124, b: 144, a: [0.48, 0.78] },
    },
    fishingCatchBit: {
      spreadX: [-18, 18],
      spreadY: [-18, 18],
      vx: [-0.18, 0.18],
      vy: [-0.22, 0.02],
      size: [2, 4.8],
      life: [620, 1040],
      color: { r: 34, g: 34, b: 34, a: [0.28, 0.58] },
    },
    fishingReveal: {
      count: 54,
      originSpread: [-22, 22],
      velocity: [-0.18, 0.18],
      size: [1.6, 4.2],
      life: [1100, 1780],
      palette: [
        [44, 48, 44],
        [70, 118, 112],
        [78, 150, 164],
        [116, 128, 108],
      ],
      alpha: [0.28, 0.62],
    },
  };
  const particleBurstState = {
    lastRain: 0,
    lastMossRain: 0,
    lastMossSplash: 0,
    lastFootstep: 0,
    footstepSide: -1,
    flashUntil: 0,
    shakeUntil: 0,
    catchTextCount: 0,
    lastJourneyAmbient: 0,
    lastKintsugiMote: 0,
    lastPaperTearAt: 0,
    lastPaperTearType: '',
    lastPaperTearCount: 0,
    lastTitleFormAt: 0,
    lastTitleFormCount: 0,
  };
  const particleLanguage = {
    serial: 0,
    lastFromWorld: 'moss',
    lastToWorld: 'moss',
    lastMorphAt: 0,
    transformedCount: 0,
  };
  const renderQuality = {
    mode: 'high',
    ...runtime.renderQualityProfile('high'),
    frameAverage: 0,
    sampleCount: 0,
    movingDotScale: 1,
  };
  const movingDotTargets = Object.freeze({
    high: Object.freeze({ travel: 0.44, cinematic: 0.36, squareMax: 2.2 }),
    medium: Object.freeze({ travel: 0.34, cinematic: 0.28, squareMax: 2.7 }),
    low: Object.freeze({ travel: 0.24, cinematic: 0.2, squareMax: 3.4 }),
  });
  const frameBudget = engine.createFrameBudgetMonitor({ capacity: 240, budgetMs: 16.67 });
  const renderFrameBudget = engine.createFrameBudgetMonitor({ capacity: 240, budgetMs: 16.67 });
  const frameCadence = engine.createFrameBudgetMonitor({ capacity: 240, budgetMs: 20 });
  const renderPhases = engine.createPhaseProfiler({ capacity: 180, budgetMs: 8 });
  const mainLoopScheduler = engine.createRenderScheduler({
    activeFps: 0,
    idleFps: 60,
    maxStepMs: 34,
  });
  const renderScheduler = engine.createRenderScheduler({
    activeFps: 30,
    idleFps: 30,
    maxStepMs: 34,
  });
  const particleRenderScheduler = engine.createRenderScheduler({
    activeFps: 30,
    idleFps: 30,
    maxStepMs: 34,
  });
  const particleMorphRenderScheduler = engine.createRenderScheduler({
    activeFps: 60,
    idleFps: 30,
    maxStepMs: 34,
  });
  const visualStyleScheduler = engine.createRenderScheduler({
    activeFps: 30,
    idleFps: 30,
    maxStepMs: 34,
  });
  const animationEffects = engine.createEffectRegistry();
  const dotMotion = motion.createDotMotionRegistry();
  const dotMotionFrame = { time: 0, scale: 1, waterFill: 1, pulse: 0 };
  const dotMotionOutput = { sx: 0, sy: 0, size: 0, alpha: 0 };
  const qualityController = engine.createAdaptiveQualityController({
    initialMode: renderQuality.mode,
    onChange: setRenderQuality,
  });
  let lastRenderDecision = {
    render: true,
    dt: runtime.FRAME_MS,
    elapsed: runtime.FRAME_MS,
    activity: 'active',
    targetFps: 60,
  };
  let renderedFrameCount = 0;
  let processedFrameCount = 0;
  let canvasResizePending = false;
  const dotCanvasBands = {
    far: {
      canvas: dotWorldFarCanvas,
      ctx: dotWorldFarCtx,
      defaultParallax: 0.76,
      representativeParallax: 0.76,
      renderCameraX: 0,
      renderCameraY: 0,
      offsetX: 0,
      offsetY: 0,
      weight: 0,
      weightedParallax: 0,
    },
    near: {
      canvas: dotWorldCanvas,
      ctx: dotWorldCtx,
      defaultParallax: 1,
      representativeParallax: 1,
      renderCameraX: 0,
      renderCameraY: 0,
      offsetX: 0,
      offsetY: 0,
      weight: 0,
      weightedParallax: 0,
    },
  };
  const dotCanvasBandList = [dotCanvasBands.far, dotCanvasBands.near];
  let particleFlashAnimation = null;
  let screenShakeAnimation = null;
  const canvasAllocationStats = {
    total: 0,
    whileMoving: 0,
  };
  root.dataset.renderQuality = renderQuality.mode;
  const accessibilityState = {
    status: gameStatus?.textContent || '',
    fishingHint: false,
    journeyHint: false,
    cinematic: false,
  };
  const interactionInput = {
    blockedMovementKeys: new Set(),
    touchPointers: new Map(),
    touchAction: 'none',
    movementPulse: null,
    introAcknowledgementTimer: 0,
    introAcknowledgementSerial: 0,
  };
  let firstMoveSignalSent = false;
  let pendingAtlasEntryMode = 'unknown';
  const tiltWalk = {
    supported: Boolean('DeviceOrientationEvent' in window && window.isSecureContext),
    enabled: false,
    listening: false,
    permission: 'unknown',
    baseline: null,
    calibrationSamples: [],
    filteredInput: 0,
    input: 0,
    blockedUntilNeutral: false,
    activeDirection: 0,
    coaching: false,
    viewportWidth: window.innerWidth,
  };
  let fallbackRequested = initialAtlasRequested;
  let livingAtlasVisited = false;
  let livingAtlasController = null;
  let livingAtlasLoadPromise = null;
  let pendingInitialAtlasOpen = initialAtlasRequested;
  let atlasEscapeSkipUntil = 0;
  let livingAtlasApproachPhase = 'hidden';
  const renderCache = {
    tone: '',
    background: '',
    pocketWorldX: '',
    pocketWorldY: '',
  };
  const memoryTrailColorCache = new Map();
  const worldCursorState = {
    node: null,
    frameRequest: 0,
    x: 0,
    y: 0,
    interactive: false,
    stage: '',
  };

  const state = {
    x: 560,
    y: 710,
    vx: 0,
    cameraX: 0,
    cameraY: 0,
    direction: 1,
    scale: 1,
    visibleW: window.innerWidth,
    activeKey: 'intro',
    isMoving: false,
    started: false,
    action: null,
    actionUntil: 0,
    lastTime: clock.now(),
    frameIndex: 0,
    frameElapsed: 0,
    frameCount: 0,
    journeyStage: '',
    lastMovementAt: clock.now(),
    wasMoving: false,
    maxVisitedX: KINTSUGI_START_X,
    visitTrackingSuspended: false,
  };
  const journeyTransition = {
    active: null,
    completed: new Set(),
  };
  const journeyMoment = {
    active: null,
    completed: new Set(),
    completedAt: new Map(),
    completedX: new Map(),
  };
  const journeyMemory = {
    collected: new Set(),
    finalized: false,
    finalizedAt: 0,
    complete: false,
    completionBurstDone: false,
    idleSince: 0,
    idleBloomed: false,
    replayStartedAt: 0,
    replayCount: 0,
    portalReady: false,
    portalReadyAt: 0,
    returnCount: 0,
  };
  const journeyEcho = {
    active: null,
    completed: new Set(),
  };
  const journeyMotion = {
    heldDirection: 0,
    heldSince: 0,
    charge: 0,
    visualTime: clock.now() * 0.001,
  };
  const journeyLanding = {
    active: null,
  };
  const journeyReturn = {
    active: null,
  };
  const journeyAwakening = {
    dawn: null,
    resonance: null,
    starDash: null,
    starDashCooldownUntil: 0,
    orchestra: null,
  };
  const journeySecrets = {
    wells: [
      { id: 'root-well', type: 'root', key: 'moss', x: 3300 },
      { id: 'signal-well', type: 'signal', key: 'taupe', x: 8580 },
      { id: 'orbit-well', type: 'orbit', key: 'ojicra', x: 11820 },
    ],
    captured: new Set(),
    fragments: new Set(),
    nearbyId: '',
    captureSince: 0,
    active: null,
    observatoryReadyAt: 0,
    observatory: null,
    observatorySeen: false,
    ascensionReadyAt: 0,
    ascension: null,
    ascensionSeen: false,
    worldSeedAwake: false,
    seedWake: [],
    lastSeedWakeAt: 0,
  };
  const journeyDiscovery = {
    areaKey: '',
    openedAtX: 0,
    openedAtTime: 0,
    returningKey: '',
    closedAtTime: 0,
    jumpUntil: 0,
    jumpImpactAt: 0,
    jumpImpactEmitted: false,
    indexes: new Map(),
    found: new Set(),
  };
  const journeyKeepsake = {
    readyAt: 0,
    available: false,
    exporting: false,
    exportedCount: 0,
    lastFileName: '',
  };
  const intro = {
    startedAt: clock.now(),
    seedStartedAt: isFocusMode ? 0 : clock.now(),
    logoReleaseAt: 0,
    assetsReady: !isFocusMode,
    loadTimedOut: false,
    logoPoints: [],
    identityPoints: [],
    complete: !isFocusMode,
    phase: isFocusMode ? 'logo' : 'complete',
  };
  root.dataset.intro = intro.complete ? 'complete' : 'active';
  root.dataset.introPhase = intro.phase;

  const articleMemoryVisual = {
    seedCount: 0,
    returnBloomCount: 0,
    lastReturnBloomAt: 0,
  };
  const articleReturn = {
    key: '',
    openedAt: 0,
    hiddenAt: 0,
  };
  const passingTraveler = {
    node: null,
    image: null,
    source: '',
    active: false,
    x: 0,
    direction: 1,
    speed: 0,
    startedAt: 0,
    durationMs: 0,
    nextAt: 0,
    stage: '',
    appearances: 0,
  };

  const assets = {
    idle: config.assets?.character?.idle,
    walk: config.assets?.character?.walk || [],
    sit: config.assets?.character?.sit,
    sitChill: config.assets?.character?.sitChill,
    fishStand: config.assets?.character?.fishStand,
    fishSit: config.assets?.character?.fishSit,
    fall: config.assets?.character?.fall,
    braceLaunch: config.assets?.character?.braceLaunch,
    launch: config.assets?.character?.launch,
    land: config.assets?.character?.land,
    jump: config.assets?.character?.jump,
  };
  const walkPoseShiftPercent = [0, 0.98, 0.98, 2.1, 0, 0];
  const PASSING_TRAVELER_STAGE_BOUNDS = Object.freeze({
    'ai-ml': [220, 5400],
    'fullstack': [9000, 10380],
    'iot-embedded': [11280, 13140],
    'open-source': [14100, 15020],
    'hackathons': [15200, 16280],
    moss: [220, 5400],
    taupe: [6460, 8140],
    islog: [9000, 10380],
    ojicra: [11280, 13140],
    monoomoi: [14100, 15020],
    monoerabi: [15200, 16280],
    hub: [16440, WORLD_LENGTH - 340],
  });

  function characterImageKey(src) {
    return src ? new URL(src, document.baseURI).href : '';
  }

  function registerCharacterImage(src, image = null) {
    const key = characterImageKey(src);
    if (!key || characterImages.has(key)) {
      return characterImages.get(key) || null;
    }
    const nextImage = image || new Image();
    nextImage.alt = '';
    nextImage.decoding = 'async';
    nextImage.loading = 'eager';
    nextImage.classList.add('game-character__pose-image');
    nextImage.hidden = false;
    const walkIndex = assets.walk.findIndex((src) => characterImageKey(src) === key);
    if (walkIndex >= 0) {
      nextImage.style.setProperty(
        '--character-pose-shift-x',
        `${walkPoseShiftPercent[walkIndex] || 0}%`
      );
    }
    if (!image) {
      nextImage.src = src;
      character.appendChild(nextImage);
    }
    characterImages.set(key, nextImage);
    const readyPromise = new Promise((resolve) => {
      if (nextImage.complete) {
        resolve();
        return;
      }
      const settle = () => {
        nextImage.removeEventListener('load', settle);
        nextImage.removeEventListener('error', settle);
        resolve();
      };
      nextImage.addEventListener('load', settle, { once: true });
      nextImage.addEventListener('error', settle, { once: true });
      if (typeof nextImage.decode === 'function') {
        nextImage.decode().then(settle).catch(() => {});
      }
    });
    characterReadyPromises.set(key, readyPromise);
    return nextImage;
  }

  if (characterImg) {
    characterImg.classList.add('game-character__pose-image', 'is-active');
    characterImg.hidden = false;
    registerCharacterImage(characterImg.getAttribute('src'), characterImg);
  }
  [assets.idle, ...assets.walk]
    .filter(Boolean)
    .forEach((src) => registerCharacterImage(src));
  const deferredCharacterSources = [
    assets.sit,
    assets.sitChill,
    assets.fishStand,
    assets.fishSit,
    assets.fall,
    assets.braceLaunch,
    assets.launch,
    assets.land,
    assets.jump,
  ].filter(Boolean);
  let deferredCharacterImagesRegistered = false;

  function registerDeferredCharacterImages() {
    if (deferredCharacterImagesRegistered) {
      return;
    }
    deferredCharacterImagesRegistered = true;
    deferredCharacterSources.forEach((src) => registerCharacterImage(src));
  }

  function scheduleDeferredCharacterImages() {
    const schedule = window.requestIdleCallback
      ? (callback) => window.requestIdleCallback(callback, { timeout: 1800 })
      : (callback) => window.setTimeout(callback, 240);
    schedule(registerDeferredCharacterImages);
  }

  characterClearance.className = 'character-clearance';
  characterClearance.setAttribute('aria-hidden', 'true');
  character.parentNode?.insertBefore(characterClearance, character);
  if (card) {
    card.inert = true;
  }

  function announceStatus(message) {
    if (!gameStatus || !message || accessibilityState.status === message) {
      return;
    }
    accessibilityState.status = message;
    gameStatus.textContent = message;
  }

  function touchInstructions(keyboardMessage, touchMessage) {
    return root.dataset.touchControls === 'true' ? touchMessage : keyboardMessage;
  }

  function syncArticleLinkAccessibility(link, title) {
    if (!link || !title) {
      return;
    }
    const touch = root.dataset.touchControls === 'true';
    const keyLabel = link.querySelector('[data-action-key-label]');
    if (keyLabel) {
      keyLabel.textContent = touch ? 'TAP' : 'ENTER';
    }
    if (touch) {
      link.setAttribute('aria-label',
        `${title} (opens in a new tab when tapped)`
      );

      link.removeAttribute('aria-keyshortcuts');
      return;
    }
    link.setAttribute('aria-label', isEnglish
      `${title} (opens in a new tab with Enter)`
    );
    link.setAttribute('aria-keyshortcuts', 'Enter');
  }

  function walkingStatus(area = '') {
    if (isEnglish) {
      const prefix = area ? `You are in the world of ${area}. ` : '';
      return root.dataset.touchControls === 'true'
        ? `${prefix}Use the left and right controls at the bottom to walk.`
        : `${prefix}Walk with A or D, or the arrow keys.`;
    }
    const prefix = area ? `${area}の世界です。` : '';
    return touchInstructions(`${prefix}AまたはDキーで歩けます。`, `${prefix}画面下の左右ボタンで歩けます。`);
  }

  function syncSoundButton() {
    if (!soundButton) {
      return;
    }
    if (!audio?.stats().supported) {
      soundButton.hidden = true;
      return;
    }
    const stats = audio.stats();
    const muted = audio.isMuted();
    const active = stats.unlocked && !muted;
    const state = active ? 'active' : muted ? 'muted' : 'ready';
    soundButton.hidden = false;
    soundButton.dataset.soundState = state;
    soundButton.dataset.muted = muted ? 'true' : 'false';
    soundButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    soundButton.setAttribute('aria-label', active ? uiCopy.soundDisable : uiCopy.soundEnable);
    soundButton.title = active ? uiCopy.soundDisable : uiCopy.soundEnable;
    if (soundIcon) {
      soundIcon.textContent = muted ? '×' : '♪';
    }
  }

  async function unlockAudio() {
    if (!audio || audio.stats().unlocked) {
      return;
    }
    if (await audio.unlock()) {
      syncSoundButton();
      if (!audio.isMuted()) {
        audio.note('hub', { duration: 0.38, gain: 0.026 });
      }
    }
  }

  function tiltOrientationAngle() {
    return runtime.finiteOr(
      window.screen?.orientation?.angle,
      runtime.finiteOr(window.orientation, 0)
    );
  }

  function syncTiltWalkButton() {
    if (!tiltWalkButton) {
      return;
    }
    const available = tiltWalk.supported && root.dataset.touchControls === 'true';
    tiltWalkButton.hidden = !available;
    if (!available) {
      return;
    }
    const stateName = tiltWalk.enabled
      ? tiltWalk.baseline === null ? 'calibrating' : 'active'
      : tiltWalk.permission === 'denied' ? 'denied' : 'off';
    tiltWalkButton.dataset.state = stateName;
    if (tiltWalk.enabled && tiltWalk.coaching) {
      tiltWalkButton.dataset.coaching = 'true';
    } else {
      tiltWalkButton.removeAttribute('data-coaching');
    }
    tiltWalkButton.setAttribute('aria-pressed', tiltWalk.enabled ? 'true' : 'false');
    const label = tiltWalk.enabled ? uiCopy.tiltDisable : uiCopy.tiltEnable;
    tiltWalkButton.setAttribute('aria-label', label);
    tiltWalkButton.title = label;
  }

  function resetTiltWalkCalibration() {
    tiltWalk.baseline = null;
    tiltWalk.calibrationSamples.length = 0;
    tiltWalk.filteredInput = 0;
    tiltWalk.input = 0;
    tiltWalk.blockedUntilNeutral = false;
    tiltWalk.activeDirection = 0;
    tiltWalkButton?.style.removeProperty('--tilt-angle');
    tiltWalkButton?.removeAttribute('data-direction');
    syncTiltWalkButton();
  }

  let tiltRecalibrationTimer = 0;

  function queueTiltWalkCalibration() {
    if (!tiltWalk.enabled) {
      return;
    }
    window.clearTimeout(tiltRecalibrationTimer);
    tiltRecalibrationTimer = window.setTimeout(() => {
      tiltRecalibrationTimer = 0;
      resetTiltWalkCalibration();
      announceStatus('Calibrating tilt controls for the new screen orientation.');
    }, 240);
  }

  function onDeviceOrientation(event) {
    if (!tiltWalk.enabled || document.hidden || root.dataset.links === 'open') {
      tiltWalk.input = 0;
      return;
    }
    if (event.beta == null && event.gamma == null) {
      return;
    }
    const relativeTilt = runtime.screenRelativeTilt({
      beta: event.beta,
      gamma: event.gamma,
      angle: tiltOrientationAngle(),
    });
    if (!Number.isFinite(relativeTilt)) {
      return;
    }
    if (tiltWalk.baseline === null) {
      tiltWalk.calibrationSamples.push(relativeTilt);
      if (tiltWalk.calibrationSamples.length < 5) {
        return;
      }
      tiltWalk.baseline = tiltWalk.calibrationSamples.reduce((sum, value) => sum + value, 0)
        / tiltWalk.calibrationSamples.length;
      tiltWalk.calibrationSamples.length = 0;
      syncTiltWalkButton();
      announceStatus(uiCopy.tiltActive);
      return;
    }
    const targetInput = runtime.tiltWalkInput({
      tilt: relativeTilt,
      baseline: tiltWalk.baseline,
      deadZone: 5,
      fullTilt: 18,
    });
    if (tiltWalk.blockedUntilNeutral) {
      if (Math.abs(targetInput) <= 0.025) {
        tiltWalk.blockedUntilNeutral = false;
      }
      tiltWalk.filteredInput = 0;
      tiltWalk.input = 0;
      tiltWalk.activeDirection = 0;
      tiltWalkButton?.removeAttribute('data-direction');
      return;
    }
    tiltWalk.filteredInput += (targetInput - tiltWalk.filteredInput) * 0.28;
    if (Math.abs(tiltWalk.filteredInput) < 0.025) {
      tiltWalk.filteredInput = 0;
    }
    tiltWalk.input = tiltWalk.filteredInput;
    const direction = Math.abs(tiltWalk.input) >= 0.055 ? Math.sign(tiltWalk.input) : 0;
    if (direction !== 0 && tiltWalk.activeDirection === 0) {
      if (tiltWalk.coaching) {
        tiltWalk.coaching = false;
        syncTiltWalkButton();
      }
      if (journeyDiscovery.areaKey) {
        closeJourneyDiscovery({ restoreFocus: false });
      }
      if (fishing.phase) {
        cancelFishing({ restoreFocus: false });
      }
    }
    tiltWalk.activeDirection = direction;
    tiltWalkButton?.style.setProperty(
      '--tilt-angle',
      `${Math.max(-13, Math.min(13, relativeTilt - tiltWalk.baseline)).toFixed(2)}deg`
    );
    if (tiltWalkButton) {
      if (direction === 0) {
        tiltWalkButton.removeAttribute('data-direction');
      } else {
        tiltWalkButton.dataset.direction = direction > 0 ? 'right' : 'left';
      }
    }
  }

  function disableTiltWalk(options = {}) {
    if (!tiltWalk.enabled && !tiltWalk.listening) {
      syncTiltWalkButton();
      return;
    }
    tiltWalk.enabled = false;
    tiltWalk.coaching = false;
    if (tiltWalk.listening) {
      window.removeEventListener('deviceorientation', onDeviceOrientation);
      tiltWalk.listening = false;
    }
    resetTiltWalkCalibration();
    delete root.dataset.tiltMode;
    syncTiltWalkButton();
    if (options.announce !== false) {
      announceStatus('Tilt controls are off. Use the left and right controls to walk.');
    }
  }

  async function toggleTiltWalk(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!tiltWalk.supported || root.dataset.touchControls !== 'true') {
      announceStatus(uiCopy.tiltUnsupported);
      return;
    }
    unlockAudio();
    if (tiltWalk.enabled) {
      disableTiltWalk();
      return;
    }
    try {
      const permissionRequest = window.DeviceOrientationEvent?.requestPermission;
      const permission = typeof permissionRequest === 'function'
        ? await permissionRequest.call(window.DeviceOrientationEvent)
        : 'granted';
      tiltWalk.permission = permission;
      if (permission !== 'granted') {
        tiltWalk.permission = 'denied';
        syncTiltWalkButton();
        announceStatus(uiCopy.tiltDenied);
        return;
      }
    } catch (error) {
      tiltWalk.permission = 'denied';
      syncTiltWalkButton();
      announceStatus(uiCopy.tiltUnsupported);
      return;
    }
    tiltWalk.enabled = true;
    tiltWalk.coaching = true;
    tiltWalk.viewportWidth = window.innerWidth;
    root.dataset.tiltMode = 'active';
    resetTiltWalkCalibration();
    if (!tiltWalk.listening) {
      window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
      tiltWalk.listening = true;
    }
    syncTiltWalkButton();
    announceStatus(uiCopy.tiltPermission);
  }

  async function toggleAudio(event) {
    event?.preventDefault();
    event?.stopPropagation();
    const wasUnlocked = Boolean(audio?.stats().unlocked);
    if (!audio || !(await audio.unlock())) {
      announceStatus('Sound is not available in this environment.');
      return;
    }
    const muted = !wasUnlocked || audio.isMuted() ? audio.setMuted(false) : audio.toggle();
    syncSoundButton();
    if (!muted) {
      audio.note('hub', { duration: 0.42, gain: 0.018 });
    }
    announceStatus(muted
      ? ('Sound is off.' )
      : ('Sound is on.'));
  }

  function lockMovementUntilRelease() {
    keys.forEach((code) => interactionInput.blockedMovementKeys.add(code));
    keys.clear();
    interactionInput.movementPulse = null;
    state.vx = 0;
    state.isMoving = false;
    if (tiltWalk.enabled && Math.abs(tiltWalk.input) > 0.025) {
      tiltWalk.blockedUntilNeutral = true;
      tiltWalk.input = 0;
      tiltWalk.filteredInput = 0;
      tiltWalk.activeDirection = 0;
      tiltWalkButton?.removeAttribute('data-direction');
    }
  }

  function releaseBlockedMovementKey(code) {
    interactionInput.blockedMovementKeys.delete(code);
  }

  function movementKeyIsBlocked(code) {
    return interactionInput.blockedMovementKeys.has(code);
  }

  function touchInputEnabled() {
    return root.dataset.touchControls === 'true'
      && root.dataset.links !== 'open'
      && !motionReduced
      && !livingAtlasController?.isEntering?.();
  }

  function movementDirectionForCode(code) {
    return code === 'ArrowRight' || code === 'KeyD' ? 1 : -1;
  }

  function queueMovementPulse(code, options = {}) {
    const now = clock.now();
    const introAcceptsInput = intro.complete
      || Boolean(intro.seedStartedAt && now >= intro.seedStartedAt);
    if (!runtime.movementPulseShouldQueue?.({
      enabled: MOVEMENT_CODES.has(code)
        && introAcceptsInput
        && !motionReduced
        && root.dataset.links !== 'open',
      repeat: options.repeat,
      blocked: movementKeyIsBlocked(code),
      cinematic: journeyInteractionIsCinematic(),
    })) {
      return false;
    }
    interactionInput.movementPulse = {
      direction: movementDirectionForCode(code),
      inputMode: options.inputMode === 'touch' ? 'touch' : 'keyboard',
    };
    scheduleFrame();
    return true;
  }

  function acknowledgeIntroMovement(code) {
    if (intro.complete || !MOVEMENT_CODES.has(code) || motionReduced) {
      return false;
    }
    const direction = movementDirectionForCode(code);
    interactionInput.introAcknowledgementSerial += 1;
    root.dataset.introInput = direction > 0 ? 'right' : 'left';
    root.dataset.introInputSerial = String(interactionInput.introAcknowledgementSerial);
    window.clearTimeout(interactionInput.introAcknowledgementTimer);
    interactionInput.introAcknowledgementTimer = window.setTimeout(() => {
      delete root.dataset.introInput;
    }, 420);
    return true;
  }

  function releaseTouchMovement(event) {
    const pointerId = event?.pointerId;
    const code = interactionInput.touchPointers.get(pointerId);
    if (!code) {
      return;
    }
    interactionInput.touchPointers.delete(pointerId);
    keys.delete(code);
    releaseBlockedMovementKey(code);
    event.currentTarget?.removeAttribute('data-pressed');
  }

  function beginTouchMovement(event) {
    const button = event.currentTarget;
    const code = button?.dataset.touchMove;
    if (!code || !MOVEMENT_CODES.has(code) || !touchInputEnabled()) {
      return;
    }
    event.preventDefault();
    unlockAudio();
    if (movementKeyIsBlocked(code)) {
      return;
    }
    if (journeyDiscovery.areaKey) {
      closeJourneyDiscovery({ restoreFocus: false });
    }
    if (fishing.phase) {
      cancelFishing({ restoreFocus: false });
    }
    interactionInput.touchPointers.set(event.pointerId, code);
    button.dataset.pressed = 'true';
    button.setPointerCapture?.(event.pointerId);
    keys.add(code);
    acknowledgeIntroMovement(code);
    queueMovementPulse(code, { inputMode: 'touch' });
  }

  function clearTouchMovement() {
    interactionInput.touchPointers.forEach((code) => {
      keys.delete(code);
      releaseBlockedMovementKey(code);
    });
    interactionInput.touchPointers.clear();
    touchMovementButtons.forEach((button) => button.removeAttribute('data-pressed'));
  }

  function activateTouchAction(event) {
    event?.preventDefault();
    if (!touchInputEnabled() || touchActionButton?.disabled) {
      return false;
    }
    unlockAudio();
    const action = interactionInput.touchAction;
    if (action === 'skip') {
      return fastForwardCinematic();
    }
    if (action === 'cancel-fishing') {
      cancelFishing({ restoreFocus: false });
      return true;
    }
    if (action === 'open-media') {
      const mediaSign = readableMediaSign();
      if (!mediaSign?.link) {
        return false;
      }
      mediaSign.link.click();
      announceStatus(
         `${mediaSign.name} opened in a new tab.`
        );
      return true;
    }
    if (action === 'discover' || action === 'interact') {
      const interactionTarget = runtime.touchInteractionTarget?.({
        action,
        journey: isJourneyMode,
        focus: isFocusMode,
        focusReady: Boolean(
          focusWorld.fx?.hint?.classList.contains('is-visible')
          || fishing.phase === 'hold'
        ),
      }) || (isJourneyMode ? 'journey' : isFocusMode ? 'focus' : 'default');
      const handled = interactionTarget === 'focus'
        ? focusInteract()
        : interactionTarget === 'journey' ? journeyInteract() : interact();
      if (handled !== false) {
        lockMovementUntilRelease();
        return true;
      }
    }
    return false;
  }

  function syncTouchActionState() {
    if (!touchActionButton) {
      return;
    }
    const mediaSign = readableMediaSign();
    const mediaSignApproach = Boolean(approachingMediaSign());
    const interactionVisible = Boolean(
      journeySpaceHint?.classList.contains('is-visible')
      || focusWorld.fx?.hint?.classList.contains('is-visible')
    );
    const nextState = runtime.touchActionState({
      enabled: root.dataset.touchControls === 'true',
      linksOpen: root.dataset.links === 'open',
      atlasEntering: Boolean(livingAtlasController?.isEntering?.()),
      cinematic: journeyInteractionIsCinematic(),
      fishing: fishing.phase,
      mediaSign: Boolean(mediaSign),
      discovery: Boolean(journeyDiscovery.areaKey),
      interaction: interactionVisible,
    });
    const showMediaSignApproach = mediaSignApproach && !nextState.available;
    if (
      interactionInput.touchAction === nextState.action
      && touchActionButton.disabled === !nextState.available
      && touchActionButton.dataset.approach === (showMediaSignApproach ? 'true' : 'false')
    ) {
      return;
    }
    touchActionButton.dataset.approach = showMediaSignApproach ? 'true' : 'false';
    interactionInput.touchAction = nextState.action;
    touchActionButton.disabled = !nextState.available;
    touchActionButton.dataset.action = nextState.action;
    const localizedActionLabels = isEnglish ? {
      none: 'Explore',
      skip: 'Advance transition',
      'cancel-fishing': 'Stop fishing',
      'open-media': 'Open site',
      discover: 'Next article',
      interact: fishing.phase === 'hold' ? 'Reel in' : 'Explore',
    } : null;
    const actionLabel = showMediaSignApproach
      ? (isEnglish ? 'Pause nearby' : '近くで立ち止まる')
      : localizedActionLabels?.[nextState.action] || nextState.label;
    touchActionButton.setAttribute('aria-label', actionLabel);
    const actionGlyph = showMediaSignApproach ? '?' : nextState.glyph;
    if (touchActionGlyph?.textContent !== actionGlyph) {
      touchActionGlyph.textContent = actionGlyph;
    }
    if (touchActionLabel?.textContent !== actionLabel) {
      touchActionLabel.textContent = actionLabel;
    }
  }

  function clearPocketWorldPosition() {
    renderCache.pocketWorldX = '';
    renderCache.pocketWorldY = '';
    root.style.removeProperty('--pocket-world-x');
    root.style.removeProperty('--pocket-world-y');
  }

  const journeyDiscoveryNode = document.createElement('article');
  journeyDiscoveryNode.className = 'journey-discovery';
  journeyDiscoveryNode.setAttribute('aria-hidden', 'true');
  journeyDiscoveryNode.inert = true;
  journeyDiscoveryNode.innerHTML = `
    <span class="journey-discovery__memory" data-journey-discovery-image aria-hidden="true">
      <img alt="" decoding="async">
    </span>
    <span class="journey-discovery__constellation" aria-hidden="true"></span>
    <small data-journey-discovery-kicker></small>
    <p class="journey-discovery__intro" data-journey-discovery-intro></p>
    <strong data-journey-discovery-title></strong>
    <a data-journey-discovery-link target="_blank" rel="noopener noreferrer" aria-keyshortcuts="Enter">
      <span class="journey-discovery__enter action-key-signal action-key-signal--article">
        ${actionKeySignalMarkup('ENTER')}
      </span>
      <span class="journey-discovery__link-label">${uiCopy.openArticle}</span><i aria-hidden="true"></i>
    </a>
    <p class="journey-discovery__cycle" aria-hidden="true">
      <span class="action-key-signal action-key-signal--cycle">
        ${actionKeySignalMarkup('Space')}
      </span>
      <i>${uiCopy.nextArticle}</i>
    </p>
  `;
  root.querySelector('.home-game__stage')?.appendChild(journeyDiscoveryNode);
  const journeyDiscoveryKicker = journeyDiscoveryNode.querySelector('[data-journey-discovery-kicker]');
  const journeyDiscoveryIntro = journeyDiscoveryNode.querySelector('[data-journey-discovery-intro]');
  const journeyDiscoveryTitle = journeyDiscoveryNode.querySelector('[data-journey-discovery-title]');
  const journeyDiscoveryLink = journeyDiscoveryNode.querySelector('[data-journey-discovery-link]');
  const journeyDiscoveryImage = journeyDiscoveryNode.querySelector('[data-journey-discovery-image] img');
  const journeyDiscoveryCycleKey = journeyDiscoveryNode.querySelector('.journey-discovery__cycle [data-action-key-label]');
  const journeyDiscoveryCycleLabel = journeyDiscoveryNode.querySelector('.journey-discovery__cycle i');

  function syncJourneyDiscoveryControlCopy() {
    const touch = root.dataset.touchControls === 'true';
    if (journeyDiscoveryCycleKey) {
      journeyDiscoveryCycleKey.textContent = touch ? '+' : 'Space';
    }
    if (journeyDiscoveryCycleLabel) {
      journeyDiscoveryCycleLabel.textContent = uiCopy.nextArticle;
    }
  }

  syncJourneyDiscoveryControlCopy();

  function prepareArticleMemoryImage(container, image, imageUrl) {
    const source = typeof imageUrl === 'string' ? imageUrl.trim() : '';
    container.classList.remove('has-image', 'is-image-ready');
    image.onload = null;
    image.onerror = null;

    if (!source) {
      image.removeAttribute('src');
      return;
    }

    container.classList.add('has-image');
    const markReady = () => {
      if (image.getAttribute('src') === source) {
        container.classList.add('is-image-ready');
      }
    };
    image.onload = markReady;
    image.onerror = () => {
      if (image.getAttribute('src') !== source) {
        return;
      }
      container.classList.remove('has-image', 'is-image-ready');
      image.removeAttribute('src');
    };
    image.src = source;
    if (image.complete && image.naturalWidth > 0) {
      markReady();
    }
  }

  function articleMemorySource(container) {
    if (!container?.classList.contains('is-image-ready')) {
      return '';
    }
    return container.querySelector('img')?.currentSrc || container.querySelector('img')?.src || '';
  }

  function emitArticleMemoryArrival(key) {
    const [r, g, b] = journeyMemoryColor(key);
    const origin = worldToScreen(state.x, state.y - 86);
    emitParticles(18, (index) => {
      const angle = (index / 18) * Math.PI * 2;
      return {
        x: origin.x + Math.cos(angle) * rand(7, 24),
        y: origin.y + Math.sin(angle) * rand(5, 18),
        vx: Math.cos(angle) * rand(0.012, 0.055),
        vy: Math.sin(angle) * rand(0.01, 0.045) - 0.018,
        size: rand(0.9, 2.6),
        life: rand(540, 940),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.34, 0.68).toFixed(2)})`,
        type: index % 7 === 0 ? 'ring' : 'spark',
      };
    });
    audio?.note(key, { duration: 0.44, gain: 0.018 });
  }

  function releaseArticleMemorySeed(container, key) {
    if (!container || !key || !container.classList.contains('is-visible')) {
      return false;
    }
    const sourceFrame = container.querySelector(
      '.journey-discovery__memory, .moss-catch__memory'
    );
    const sourceRect = sourceFrame?.getBoundingClientRect();
    const characterRect = character.getBoundingClientRect();
    if (!sourceRect?.width || !characterRect.width) {
      emitArticleMemoryArrival(key);
      return false;
    }
    const seed = document.createElement('span');
    seed.className = 'journey-article-seed';
    seed.dataset.world = key;
    seed.setAttribute('aria-hidden', 'true');
    const source = articleMemorySource(container);
    if (source) {
      seed.style.backgroundImage = `url("${source.replace(/["\\]/g, '\\$&')}")`;
      seed.classList.add('has-image');
    }
    const size = clamp(Math.min(sourceRect.width, sourceRect.height), 48, 84);
    const startX = sourceRect.left + sourceRect.width * 0.5 - size * 0.5;
    const startY = sourceRect.top + sourceRect.height * 0.5 - size * 0.5;
    const endX = characterRect.left + characterRect.width * 0.5 - size * 0.5;
    const endY = characterRect.top + characterRect.height * 0.48 - size * 0.5;
    seed.style.width = `${size}px`;
    seed.style.height = `${size}px`;
    seed.style.left = `${startX}px`;
    seed.style.top = `${startY}px`;
    document.body.appendChild(seed);
    articleMemoryVisual.seedCount += 1;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      seed.remove();
      emitArticleMemoryArrival(key);
    };
    if (typeof seed.animate !== 'function') {
      window.setTimeout(finish, 760);
      return true;
    }
    const dx = endX - startX;
    const dy = endY - startY;
    const animation = seed.animate([
      { opacity: 0.9, transform: 'translate3d(0, 0, 0) rotate(2deg) scale(1)' },
      {
        offset: 0.5,
        opacity: 0.82,
        transform: `translate3d(${(dx * 0.48).toFixed(1)}px, ${(dy * 0.3 - 72).toFixed(1)}px, 0) rotate(-11deg) scale(0.52)`,
      },
      {
        opacity: 0.08,
        transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(18deg) scale(0.08)`,
      },
    ], {
      duration: 920,
      easing: 'cubic-bezier(0.2, 0.84, 0.24, 1)',
      fill: 'forwards',
    });
    animation.finished.then(finish).catch(finish);
    window.setTimeout(finish, 1100);
    return true;
  }

  function noteArticleOpen(key) {
    if (!key) return;
    articleReturn.key = key;
    articleReturn.openedAt = Date.now();
    articleReturn.hiddenAt = 0;
  }

  function emitArticleReturnBloom() {
    const key = articleReturn.key;
    if (!key || Date.now() - articleReturn.openedAt < 700) {
      return false;
    }
    const [r, g, b] = journeyMemoryColor(key);
    const origin = worldToScreen(state.x, state.y - 78);
    emitParticles(22, (index) => {
      const angle = (index / 22) * Math.PI * 2;
      const radius = 26 + (index % 5) * 8;
      return {
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius * 0.56,
        targetX: origin.x + Math.cos(angle) * rand(8, 22),
        targetY: origin.y + Math.sin(angle) * rand(5, 14),
        targetAttract: 0.00018,
        targetDamping: 0.8,
        size: rand(1, 2.7),
        life: rand(680, 1120),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.28, 0.6).toFixed(2)})`,
        type: index % 6 === 0 ? 'ring' : 'bit',
      };
    });
    articleMemoryVisual.returnBloomCount += 1;
    articleMemoryVisual.lastReturnBloomAt = clock.now();
    audio?.note(key, { duration: 0.58, gain: 0.02 });
    articleReturn.key = '';
    articleReturn.openedAt = 0;
    articleReturn.hiddenAt = 0;
    return true;
  }

  function schedulePassingTraveler(now, initial = false) {
    passingTraveler.nextAt = now + rand(
      initial ? 14000 : 22000,
      initial ? 26000 : 44000
    );
  }

  function createPassingTravelerVisual() {
    if (!isJourneyMode || !viewportNode || !(assets.walk[0] || assets.idle)) {
      return;
    }
    const node = document.createElement('div');
    node.className = 'journey-passing-traveler';
    node.setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.src = assets.walk[0] || assets.idle;
    node.appendChild(image);
    viewportNode.appendChild(node);
    passingTraveler.node = node;
    passingTraveler.image = image;
    passingTraveler.source = characterImageKey(image.src);
    schedulePassingTraveler(clock.now(), true);
  }

  function passingTravelerSceneIsClear() {
    return Boolean(
      isJourneyMode
      && state.started
      && !fishing.phase
      && !journeyTransition.active
      && !journeyLanding.active
      && !journeyMoment.active
      && !journeyReturn.active
      && !journeyAwakening.orchestra
      && !journeySecrets.active
      && !journeySecrets.observatory
      && !journeySecrets.ascension
      && !journeyDiscovery.areaKey
      && root.dataset.links !== 'open'
    );
  }

  function stopPassingTraveler(now = clock.now()) {
    if (!passingTraveler.node) {
      return;
    }
    passingTraveler.active = false;
    passingTraveler.node.classList.remove('is-visible');
    delete root.dataset.passingTraveler;
    schedulePassingTraveler(now);
  }

  function startPassingTraveler(now, preferredDirection = 0) {
    if (!passingTraveler.node || passingTraveler.active || !passingTravelerSceneIsClear()) {
      return false;
    }
    const stage = journey.stageAt(state.x);
    const bounds = PASSING_TRAVELER_STAGE_BOUNDS[stage];
    if (!bounds) {
      schedulePassingTraveler(now);
      return false;
    }
    const direction = preferredDirection === -1 || preferredDirection === 1
      ? preferredDirection
      : Math.random() < 0.5 ? 1 : -1;
    const startX = direction > 0
      ? Math.max(bounds[0] + 40, state.x - rand(300, 460))
      : Math.min(bounds[1] - 40, state.x + rand(560, 760));
    const hasRoom = direction > 0
      ? state.x - startX >= 160
      : startX - state.x >= 280;
    if (!hasRoom) {
      schedulePassingTraveler(now);
      return false;
    }
    passingTraveler.active = true;
    passingTraveler.x = startX;
    passingTraveler.direction = direction;
    passingTraveler.speed = direction > 0 ? rand(0.68, 0.82) : -rand(0.26, 0.36);
    passingTraveler.startedAt = now;
    passingTraveler.durationMs = rand(5200, 7800);
    passingTraveler.stage = stage;
    passingTraveler.appearances += 1;
    passingTraveler.node.dataset.flow = direction > 0 ? 'ahead' : 'return';
    passingTraveler.node.dataset.variant = String(Math.floor(rand(0, 3)));
    passingTraveler.node.classList.add('is-visible');
    root.dataset.passingTraveler = passingTraveler.node.dataset.flow;
    return true;
  }

  function updatePassingTraveler(now, dt) {
    const node = passingTraveler.node;
    if (!node) {
      return;
    }
    if (!passingTraveler.active) {
      if (now >= passingTraveler.nextAt && passingTravelerSceneIsClear()) {
        startPassingTraveler(now);
      }
      return;
    }
    const bounds = PASSING_TRAVELER_STAGE_BOUNDS[passingTraveler.stage];
    if (
      !bounds
      || !passingTravelerSceneIsClear()
      || journey.stageAt(state.x) !== passingTraveler.stage
      || now - passingTraveler.startedAt >= passingTraveler.durationMs
    ) {
      stopPassingTraveler(now);
      return;
    }
    passingTraveler.x += passingTraveler.speed * dt;
    if (passingTraveler.x <= bounds[0] || passingTraveler.x >= bounds[1]) {
      stopPassingTraveler(now);
      return;
    }
    const point = worldToScreen(passingTraveler.x, terrainY(passingTraveler.x));
    const width = CHARACTER_W * state.scale * 0.92;
    const height = CHARACTER_H * state.scale * 0.92;
    const source = assets.walk.length
      ? assets.walk[Math.floor((now - passingTraveler.startedAt) / 138) % assets.walk.length]
      : assets.idle;
    const sourceKey = characterImageKey(source);
    if (sourceKey && passingTraveler.source !== sourceKey) {
      passingTraveler.image.src = source;
      passingTraveler.source = sourceKey;
    }
    const slope = Math.max(-3, Math.min(3, terrainSlope(passingTraveler.x) * 20));
    node.style.transform = `translate3d(${(point.x - width * 0.5).toFixed(2)}px, ${(point.y - height).toFixed(2)}px, 0) scaleX(${passingTraveler.direction}) rotate(${slope.toFixed(2)}deg)`;
  }

  const journeySpaceHint = document.createElement('div');
  journeySpaceHint.className = 'journey-space-hint';
  journeySpaceHint.setAttribute('aria-hidden', 'true');
  journeySpaceHint.innerHTML = '<i></i><i></i><i></i><span>Space</span><i></i><i></i>';
  root.querySelector('.home-game__stage')?.appendChild(journeySpaceHint);

  const characterActionAlert = document.createElement('div');
  characterActionAlert.className = 'character-action-alert';
  characterActionAlert.setAttribute('aria-hidden', 'true');
  characterActionAlert.innerHTML = `
    <i></i>
    <span data-character-action-glyph>!</span>
    <small data-character-action-guide>${'Pause nearby'}</small>
    <i></i>
  `;
  root.querySelector('.home-game__stage')?.appendChild(characterActionAlert);
  const characterActionGlyph = characterActionAlert.querySelector('[data-character-action-glyph]');

  function svgEl(name, attrs = {}) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        node.setAttribute(key, String(value));
      }
    });
    return node;
  }

  function prepareLine(line) {
    requestAnimationFrame(() => {
      const length = Math.max(1, line.getTotalLength ? line.getTotalLength() : 1);
      line.dataset.length = length.toFixed(2);
      line.style.setProperty('--dash', length.toFixed(2));
      if (!line.dataset.drawStart) {
        line.style.setProperty('--draw-ms', `${Math.round(Math.min(2400, Math.max(700, length * 0.85)))}ms`);
      }
    });
  }

  function registerLine(line, options = {}) {
    line.classList.add('ink-line');
    (options.classes || []).forEach((className) => line.classList.add(className));
    line.dataset.revealX = String(options.revealX || 0);
    if (options.drawStart !== undefined) {
      line.dataset.drawStart = String(options.drawStart);
    }
    if (options.drawEnd !== undefined) {
      line.dataset.drawEnd = String(options.drawEnd);
    }
    if (options.area) {
      line.dataset.area = options.area;
    }
    if (options.event) {
      line.dataset.eventLine = options.event;
      eventLines.push(line);
    }
    lines.push(line);
    prepareLine(line);
    return line;
  }

  function addPath(layer, d, options = {}) {
    const node = svgEl('path', { d });
    layer.appendChild(node);
    return registerLine(node, options);
  }

  function setStage(stage) {
    if (root.dataset.stage !== stage) {
      root.dataset.stage = stage;
    }
    syncParticleLanguageDataset(stage);
    syncWorldCursorTone(stage);
  }

  function focusStage(x) {
    if (isJourneyMode) {
      return journey.stageAt(x);
    }
    if (x < 740) {
      return 'void';
    }
    if (x < 1120) {
      return 'hush';
    }
    if (x < 1650) {
      return 'line';
    }
    if (x < 2350) {
      return 'cloud';
    }
    if (x < 3150) {
      return 'tree';
    }
    if (x < 4200) {
      return 'forest';
    }
    return 'moss';
  }

  function addShape(layer, name, attrs = {}, options = {}) {
    const node = svgEl(name, attrs);
    node.classList.add('ink-shape');
    (options.classes || []).forEach((className) => node.classList.add(className));
    node.dataset.revealX = String(options.revealX || 0);
    if (options.area) {
      node.dataset.area = options.area;
    }
    layer.appendChild(node);
    shapes.push(node);
    return node;
  }

  function addLabel(area, x, y) {
    const node = document.createElement('article');
    node.className = 'world-label';
    node.dataset.revealX = String(x + 120);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.innerHTML = `
      <span>${escapeHtml(area.label)}</span>
      <strong>${escapeHtml(area.name)}</strong>
      <p>${escapeHtml(area.title)}</p>
    `;
    labelsLayer.appendChild(node);
    labels.push(node);
    return node;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function actionKeySignalMarkup(label) {
    return `
      <i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>
      <i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>
      <span class="action-key-signal__label" data-action-key-label>${escapeHtml(label)}</span>
    `;
  }

  function mossTerrainY(x) {
    if (x < 900) {
      return 710 + Math.sin(x / 340) * 2;
    }
    if (x < 1900) {
      const t = (x - 900) / 1000;
      return 710 + smooth(t) * 22 + Math.sin(x / 260) * 3;
    }
    if (x < 3000) {
      const t = (x - 1900) / 1100;
      return 732 + smooth(t) * 12 + Math.sin(x / 220) * 4;
    }
    if (x < 4200) {
      const t = (x - 3000) / 1200;
      return 744 - smooth(t) * 10 + Math.sin(x / 260) * 3;
    }
    if (x < 5800) {
      const t = (x - 4200) / 1600;
      return 734 + Math.sin(t * Math.PI) * 12 + Math.sin(x / 280) * 3;
    }
    return 736 + Math.sin(x / 300) * 3;
  }

  function terrainY(x) {
    if (isJourneyMode) {
      return journey.terrainY(x, mossTerrainY);
    }
    if (isFocusMode) {
      return mossTerrainY(x);
    }
    if (x < 900) {
      return 710 + Math.sin(x / 260) * 4;
    }
    if (x < 2500) {
      const t = (x - 900) / 1600;
      return 710 + smooth(t) * 56 + Math.sin(x / 180) * 5;
    }
    if (x < 4100) {
      const t = (x - 2500) / 1600;
      return 766 - smooth(t) * 108 + Math.sin(x / 210) * 7;
    }
    if (x < 5850) {
      const t = (x - 4100) / 1750;
      const steps = Math.floor(t * 8) * 6;
      return 658 + steps + Math.sin(x / 130) * 8;
    }
    if (x < 7400) {
      const t = (x - 5850) / 1550;
      return 708 - Math.sin(t * Math.PI) * 20;
    }
    if (x < 9100) {
      const t = (x - 7400) / 1700;
      return 696 - Math.sin(t * Math.PI) * 54 + Math.sin(x / 260) * 8;
    }
    if (x < 10600) {
      const t = (x - 9100) / 1500;
      return 704 + smooth(t) * 24 - Math.sin(t * Math.PI) * 14;
    }
    const t = Math.min(1, (x - 10600) / 1400);
    return 726 - smooth(t) * 38;
  }

  function smooth(t) {
    const n = Math.max(0, Math.min(1, t));
    return n * n * (3 - 2 * n);
  }

  function fallbackLogoPoints() {
    const points = [];
    const addPoint = (x, y, seed) => {
      points.push({
        x,
        y,
        seed,
        order: ((seed * 47) % 101) / 100,
        size: 0.78 + ((seed * 29) % 17) / 28,
      });
    };
    for (let index = 0; index < 156; index += 1) {
      const angle = (index / 156) * Math.PI * 2;
      addPoint(Math.cos(angle) * 0.455, Math.sin(angle) * 0.455, index + 1);
    }
    const segments = [
      [-0.32, -0.31, 0.32, -0.31],
      [-0.12, -0.12, 0.29, -0.12],
      [-0.12, 0.06, 0.29, 0.06],
      [-0.3, -0.29, -0.3, 0.05],
      [-0.3, 0.17, -0.3, 0.34],
      [-0.08, -0.12, -0.08, 0.17],
      [0.29, -0.12, 0.29, 0.17],
      [-0.08, 0.22, -0.08, 0.36],
      [0.22, 0.22, 0.22, 0.36],
      [-0.3, 0.35, -0.18, 0.35],
    ];
    segments.forEach((segment, segmentIndex) => {
      const [x1, y1, x2, y2] = segment;
      const count = Math.max(8, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 68));
      for (let index = 0; index <= count; index += 1) {
        const progress = index / count;
        addPoint(
          x1 + (x2 - x1) * progress,
          y1 + (y2 - y1) * progress,
          200 + segmentIndex * 43 + index
        );
      }
    });
    return points;
  }

  function buildIntroIdentityPoints(text = INTRO_IDENTITY) {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 640;
    sampleCanvas.height = 80;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sampleCtx) {
      return [];
    }
    sampleCtx.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
    sampleCtx.fillStyle = '#000';
    sampleCtx.font = '500 26px "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';
    sampleCtx.textAlign = 'center';
    sampleCtx.textBaseline = 'middle';
    sampleCtx.fillText(text, sampleCanvas.width / 2, sampleCanvas.height / 2);
    const pixels = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
    const sampled = [];
    const step = 3;
    let minX = sampleCanvas.width;
    let maxX = 0;
    let minY = sampleCanvas.height;
    let maxY = 0;
    for (let y = 1; y < sampleCanvas.height; y += step) {
      for (let x = 1; x < sampleCanvas.width; x += step) {
        if (pixels[(y * sampleCanvas.width + x) * 4 + 3] < 88) {
          continue;
        }
        sampled.push({ x, y });
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    if (!sampled.length) {
      return [];
    }
    const inkWidth = Math.max(1, maxX - minX);
    const inkHeight = Math.max(1, maxY - minY);
    return sampled.map((point, index) => {
      const seed = point.x * 131 + point.y * 197 + index * 17;
      return {
        x: (point.x - minX) / inkWidth - 0.5,
        y: (point.y - minY) / inkHeight - 0.5,
        seed,
        order: ((seed * 47) % 101) / 100,
        size: 0.7 + ((seed * 29) % 17) / 32,
      };
    });
  }

  async function loadIntroLogoPoints(src) {
    if (!src) {
      return fallbackLogoPoints();
    }
    const image = new Image();
    image.alt = '';
    image.decoding = 'async';
    const loaded = new Promise((resolve) => {
      const settle = () => resolve(image.naturalWidth > 0);
      image.addEventListener('load', settle, { once: true });
      image.addEventListener('error', settle, { once: true });
    });
    image.src = src;
    if (typeof image.decode === 'function') {
      image.decode().catch(() => {});
    }
    if (!await loaded) {
      return fallbackLogoPoints();
    }
    const sampleSize = 180;
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleSize;
    sampleCanvas.height = sampleSize;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sampleCtx) {
      return fallbackLogoPoints();
    }
    sampleCtx.clearRect(0, 0, sampleSize, sampleSize);
    sampleCtx.drawImage(image, 0, 0, sampleSize, sampleSize);
    const pixels = sampleCtx.getImageData(0, 0, sampleSize, sampleSize).data;
    const sampled = [];
    const step = 5;
    for (let y = 2; y < sampleSize; y += step) {
      for (let x = 2; x < sampleSize; x += step) {
        const alpha = pixels[(y * sampleSize + x) * 4 + 3];
        if (alpha < 92) {
          continue;
        }
        const seed = x * 131 + y * 197;
        sampled.push({
          x: x / sampleSize - 0.5,
          y: y / sampleSize - 0.5,
          seed,
          order: ((seed * 47) % 101) / 100,
          size: 0.78 + ((seed * 29) % 17) / 28,
        });
      }
    }
    if (sampled.length <= 430) {
      return sampled.length ? sampled : fallbackLogoPoints();
    }
    const stride = sampled.length / 430;
    return Array.from({ length: 430 }, (_, index) => sampled[Math.floor(index * stride)]);
  }

  function introLogoGatherProgress(now) {
    if (!intro.logoReleaseAt) {
      return 0;
    }
    return smooth(clamp((now - intro.logoReleaseAt) / INTRO_LOGO_GATHER_MS, 0, 1));
  }

  function releaseIntroLogo(timedOut = false) {
    if (intro.complete || intro.logoReleaseAt) {
      return;
    }
    intro.assetsReady = !timedOut;
    intro.loadTimedOut = timedOut;
    intro.logoReleaseAt = clock.now();
    intro.seedStartedAt = intro.logoReleaseAt + INTRO_LOGO_GATHER_MS;
    root.dataset.introLoad = timedOut ? 'timeout' : 'ready';
    ensureLivingAtlasRuntime();
    scheduleFrame();
  }

  function beginIntroLoader() {
    if (intro.complete) {
      return;
    }
    intro.logoPoints = fallbackLogoPoints();
    intro.identityPoints = buildIntroIdentityPoints();
    root.dataset.introLoad = 'loading';
    const logoReady = loadIntroLogoPoints(config.assets?.brand?.logo)
      .then((points) => {
        if (!intro.logoReleaseAt && points.length) {
          intro.logoPoints = points;
        }
      });
    const criticalSources = [assets.idle, ...assets.walk].filter(Boolean);
    const criticalReady = criticalSources
      .map((src) => characterReadyPromises.get(characterImageKey(src)))
      .filter(Boolean);
    const allReady = Promise.allSettled([logoReady, ...criticalReady]).then(() => false);
    const timedOut = new Promise((resolve) => {
      window.setTimeout(() => resolve(true), INTRO_LOAD_TIMEOUT_MS);
    });
    Promise.race([allReady, timedOut]).then((didTimeout) => {
      const elapsed = clock.now() - intro.startedAt;
      const remaining = Math.max(0, INTRO_LOGO_MIN_MS - elapsed);
      window.setTimeout(() => releaseIntroLogo(Boolean(didTimeout)), remaining);
    });
  }

  function introElapsed(now) {
    if (!intro.seedStartedAt || now < intro.seedStartedAt) {
      return 0;
    }
    return Math.max(0, now - intro.seedStartedAt);
  }

  function introProgress(now) {
    if (intro.complete) {
      return 1;
    }
    return clamp(introElapsed(now) / INTRO_DURATION_MS, 0, 1);
  }

  function introSeedProgress(now) {
    return clamp(introElapsed(now) / INTRO_SEED_DURATION_MS, 0, 1);
  }

  function introGroundProgress(now) {
    const duration = INTRO_GROUND_END_MS - INTRO_GROUND_START_MS;
    return smooth(clamp((introElapsed(now) - INTRO_GROUND_START_MS) / duration, 0, 1));
  }

  function introCharacterProgress(now) {
    const duration = INTRO_DURATION_MS - INTRO_CHARACTER_START_MS;
    return smooth(clamp((introElapsed(now) - INTRO_CHARACTER_START_MS) / duration, 0, 1));
  }

  function syncIntroPhase(now) {
    if (intro.complete) {
      return;
    }
    if (!intro.seedStartedAt || now < intro.seedStartedAt) {
      const phase = intro.logoReleaseAt ? 'gather' : 'logo';
      if (intro.phase !== phase) {
        intro.phase = phase;
        root.dataset.introPhase = phase;
      }
      return;
    }
    const elapsed = introElapsed(now);
    const phase = elapsed < 710
      ? 'fall'
      : elapsed < 1160 ? 'ripple' : elapsed < INTRO_SEED_DURATION_MS ? 'line' : 'arrival';
    if (intro.phase !== phase) {
      intro.phase = phase;
      root.dataset.introPhase = phase;
    }
  }

  function finishIntro() {
    if (intro.complete) {
      return;
    }
    intro.complete = true;
    intro.phase = 'complete';
    root.dataset.intro = 'complete';
    root.dataset.introPhase = 'complete';
    delete root.dataset.introInput;
    scheduleDeferredCharacterImages();
    emitJourneySignal('act1_ready');
  }

  function terrainSlope(x) {
    return (terrainY(x + 8) - terrainY(x - 8)) / 16;
  }

  function buildGroundPath(untilX, fromX = 0) {
    const end = Math.max(260, Math.min(WORLD_LENGTH, untilX));
    const start = Math.max(0, Math.min(end - 1, fromX));
    const parts = [];
    for (let x = start; x <= end; x += 36) {
      const y = terrainY(x);
      parts.push(`${parts.length ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    parts.push(`L${end.toFixed(1)},${terrainY(end).toFixed(1)}`);
    return parts.join(' ');
  }

  const groundPath = svgEl('path', {
    class: 'ink-line ink-line--ground is-drawn',
    d: isFocusMode ? '' : buildGroundPath(340),
  });
  groundPath.style.setProperty('--line-opacity', '1');
  nearLayer.appendChild(groundPath);

  function buildWorld() {
    if (isFocusMode) {
      buildMossFocusWorld();
      if (isJourneyMode) {
        buildJourneyWorld();
      }
    } else {
      addPath(farLayer, 'M520 190 C640 128 810 122 940 198', { revealX: 160, classes: ['ink-line--thin'] });
      addPath(farLayer, 'M1120 152 C1220 94 1375 112 1470 178', { revealX: 520, classes: ['ink-line--thin'] });
      addPath(farLayer, 'M1860 210 C1980 150 2180 144 2310 226', { revealX: 980, classes: ['ink-line--thin'] });

      buildMoss();
      buildTaupe();
      buildOjicra();
      buildMonoerabi();
      buildIslog();
      buildMonoomoi();
      buildHub();
    }

    if (!isFocusMode) {
      areas.forEach((area) => {
        const labelY = area.key === 'moss' ? 420 : area.key === 'ojicra' ? 330 : area.key === 'monoomoi' ? 380 : 360;
        addLabel(area, area.xStart + 170, labelY);
      });
    }

    requestAnimationFrame(() => {
      lines.forEach((line) => {
        const length = Math.max(1, line.getTotalLength ? line.getTotalLength() : 1);
        line.dataset.length = length.toFixed(2);
        line.style.setProperty('--dash', length.toFixed(2));
        if (!line.dataset.drawStart) {
          line.style.setProperty('--draw-ms', `${Math.round(Math.min(2400, Math.max(700, length * 0.85)))}ms`);
        }
      });
    });
  }

  function addCloudMotif(x, y, scale = 1, drawStart = x - 320) {
    const d = [
      `M${x - 142 * scale} ${y + 22 * scale}`,
      `C${x - 136 * scale} ${y - 18 * scale} ${x - 92 * scale} ${y - 34 * scale} ${x - 58 * scale} ${y - 10 * scale}`,
      `C${x - 44 * scale} ${y - 62 * scale} ${x + 28 * scale} ${y - 70 * scale} ${x + 46 * scale} ${y - 18 * scale}`,
      `C${x + 80 * scale} ${y - 34 * scale} ${x + 132 * scale} ${y - 12 * scale} ${x + 128 * scale} ${y + 24 * scale}`,
      `M${x - 118 * scale} ${y + 24 * scale}`,
      `C${x - 64 * scale} ${y + 28 * scale} ${x + 52 * scale} ${y + 30 * scale} ${x + 132 * scale} ${y + 24 * scale}`,
      `M${x - 64 * scale} ${y + 35 * scale}`,
      `C${x - 20 * scale} ${y + 39 * scale} ${x + 36 * scale} ${y + 39 * scale} ${x + 84 * scale} ${y + 34 * scale}`,
    ].join(' ');

    return addPath(farLayer, d, {
      revealX: drawStart,
      drawStart,
      drawEnd: drawStart + 440 * scale,
      classes: ['ink-line--hair', 'ink-line--sky', 'ink-line--slow-drift'],
    });
  }

  function addGrassMotif(x, y, scale = 1, drawStart = x - 160) {
    const d = [
      `M${x - 52 * scale} ${y}`,
      `C${x - 28 * scale} ${y - 4 * scale} ${x - 14 * scale} ${y - 4 * scale} ${x + 8 * scale} ${y}`,
      `M${x - 14 * scale} ${y}`,
      `C${x - 18 * scale} ${y - 28 * scale} ${x - 6 * scale} ${y - 52 * scale} ${x + 6 * scale} ${y - 68 * scale}`,
      `M${x + 4 * scale} ${y}`,
      `C${x + 14 * scale} ${y - 30 * scale} ${x + 28 * scale} ${y - 46 * scale} ${x + 46 * scale} ${y - 58 * scale}`,
      `M${x + 16 * scale} ${y}`,
      `C${x + 32 * scale} ${y - 18 * scale} ${x + 52 * scale} ${y - 24 * scale} ${x + 76 * scale} ${y - 26 * scale}`,
    ].join(' ');

    return addPath(nearLayer, d, {
      revealX: drawStart,
      drawStart,
      drawEnd: drawStart + 260 * scale,
      classes: ['ink-line--moss-detail'],
    });
  }

  function addRockMotif(x, y, scale = 1, drawStart = x - 160, layer = midLayer) {
    const d = [
      `M${x - 74 * scale} ${y}`,
      `C${x - 52 * scale} ${y - 32 * scale} ${x - 12 * scale} ${y - 34 * scale} ${x + 8 * scale} ${y - 2 * scale}`,
      `C${x + 24 * scale} ${y - 24 * scale} ${x + 58 * scale} ${y - 20 * scale} ${x + 72 * scale} ${y}`,
      `M${x - 22 * scale} ${y - 4 * scale}`,
      `C${x - 10 * scale} ${y - 18 * scale} ${x + 4 * scale} ${y - 18 * scale} ${x + 14 * scale} ${y - 6 * scale}`,
    ].join(' ');

    return addPath(layer, d, {
      revealX: drawStart,
      drawStart,
      drawEnd: drawStart + 300 * scale,
      classes: ['ink-line--moss-detail'],
    });
  }

  function addBroadTreeMotif(x, y, scale = 1, drawStart = x - 260, layer = midLayer, isNear = false) {
    const d = [
      `M${x - 116 * scale} ${y - 74 * scale}`,
      `C${x - 112 * scale} ${y - 124 * scale} ${x - 64 * scale} ${y - 148 * scale} ${x - 30 * scale} ${y - 116 * scale}`,
      `C${x - 12 * scale} ${y - 176 * scale} ${x + 68 * scale} ${y - 182 * scale} ${x + 88 * scale} ${y - 120 * scale}`,
      `C${x + 132 * scale} ${y - 132 * scale} ${x + 176 * scale} ${y - 96 * scale} ${x + 160 * scale} ${y - 52 * scale}`,
      `C${x + 96 * scale} ${y - 40 * scale} ${x + 20 * scale} ${y - 34 * scale} ${x - 116 * scale} ${y - 54 * scale}`,
      `M${x - 30 * scale} ${y - 52 * scale}`,
      `C${x - 10 * scale} ${y - 32 * scale} ${x + 24 * scale} ${y - 30 * scale} ${x + 56 * scale} ${y - 52 * scale}`,
      `M${x - 18 * scale} ${y - 58 * scale}`,
      `C${x - 22 * scale} ${y - 32 * scale} ${x - 24 * scale} ${y - 12 * scale} ${x - 26 * scale} ${y}`,
      `M${x + 34 * scale} ${y - 56 * scale}`,
      `C${x + 28 * scale} ${y - 30 * scale} ${x + 24 * scale} ${y - 12 * scale} ${x + 20 * scale} ${y}`,
      `M${x - 78 * scale} ${y}`,
      `C${x - 38 * scale} ${y + 6 * scale} ${x + 54 * scale} ${y + 6 * scale} ${x + 104 * scale} ${y}`,
    ].join(' ');

    return addPath(layer, d, {
      revealX: drawStart,
      drawStart,
      drawEnd: drawStart + 460 * scale,
      classes: ['ink-line--tree', isNear ? 'ink-line--moss-tree-near' : 'ink-line--moss-tree'],
    });
  }

  function addPineMotif(x, y, scale = 1, drawStart = x - 220, layer = midLayer, isNear = false) {
    const w = 44 * scale;
    const h = 142 * scale;
    const d = [
      `M${x} ${y}`,
      `L${x} ${y - h}`,
      `M${x - w * 1.12} ${y - h * 0.34}`,
      `C${x - w * 0.78} ${y - h * 0.7} ${x - w * 0.36} ${y - h * 0.94} ${x} ${y - h * 1.08}`,
      `C${x + w * 0.42} ${y - h * 0.94} ${x + w * 0.82} ${y - h * 0.7} ${x + w * 1.12} ${y - h * 0.34}`,
      `M${x - w * 0.74} ${y - h * 0.56}`,
      `C${x - w * 0.38} ${y - h * 0.78} ${x - w * 0.12} ${y - h * 0.92} ${x} ${y - h}`,
      `C${x + w * 0.18} ${y - h * 0.9} ${x + w * 0.44} ${y - h * 0.78} ${x + w * 0.76} ${y - h * 0.56}`,
    ].join(' ');

    return addPath(layer, d, {
      revealX: drawStart,
      drawStart,
      drawEnd: drawStart + 380 * scale,
      classes: ['ink-line--tree', isNear ? 'ink-line--moss-tree-near' : 'ink-line--moss-tree'],
    });
  }

  function addLakeMotif() {
    addPath(midLayer, 'M4120 744 C4320 716 4680 720 4920 708 C5260 690 5620 704 5980 674 C6280 650 6480 660 6720 636', {
      revealX: 3880,
      drawStart: 3880,
      drawEnd: 5300,
      classes: ['ink-line--thin', 'ink-line--moss-water'],
    });
    addPath(midLayer, 'M4060 792 C4380 758 4660 790 4940 766 C5320 730 5700 760 6040 732 C6280 712 6500 724 6740 706', {
      revealX: 4020,
      drawStart: 4020,
      drawEnd: 5600,
      classes: ['ink-line--thin', 'ink-line--moss-water'],
    });
    addPath(nearLayer, 'M4720 770 C4860 748 5040 750 5200 768 M4920 792 C5100 770 5360 776 5570 792 M5780 732 C5880 716 6010 720 6120 736', {
      revealX: 4300,
      drawStart: 4300,
      drawEnd: 5400,
      classes: ['ink-line--water-detail'],
    });
    addPath(midLayer, 'M4440 720 C4484 686 4548 690 4590 722 M6320 682 C6360 654 6426 660 6468 688', {
      revealX: 4100,
      drawStart: 4100,
      drawEnd: 4880,
      classes: ['ink-line--moss-detail'],
    });
  }

  function addDockMotif() {
    addPath(nearLayer, 'M5480 748 L5788 722 L5908 746 L5602 774 Z M5576 740 L5708 730 M5688 732 L5820 728 M5800 728 L5886 744', {
      revealX: 4620,
      drawStart: 4620,
      drawEnd: 5520,
      classes: ['ink-line--dock'],
    });
    addPath(nearLayer, 'M5538 762 L5558 808 M5808 724 L5824 770 M5906 746 L5984 780 M5480 748 L5412 762', {
      revealX: 4860,
      drawStart: 4860,
      drawEnd: 5660,
      classes: ['ink-line--dock'],
    });
  }

  function addFishShadowMotif() {
    addPath(midLayer, 'M5940 710 C6006 680 6094 684 6156 716 C6086 742 6014 740 5940 710 Z M6138 716 C6190 696 6242 700 6282 724', {
      revealX: 5400,
      classes: ['ink-line--fish-shadow', 'ink-line--living'],
      area: 'moss',
      event: 'moss',
    });
  }

  // ---------------------------------------------------------------------
  // moss focus world
  // 手描き線画モチーフをコードで生成し、歩行に合わせて描き込んでいく。
  // far/mid レイヤーはパララックス係数ぶん座標を圧縮して配置する。
  // ---------------------------------------------------------------------

  const focusFishingRange = journey?.fishingRange?.() || {
    pierStart: 5140,
    pierEnd: 5550,
    bobberOffset: 430,
    waterClearance: 220,
    edgeMargin: 70,
    start: 5340,
    end: 5480,
  };
  const focusWorld = {
    farK: 0.86,
    midK: 0.5,
    waterY: 806,
    waterStart: 5140,
    pierStart: focusFishingRange.pierStart,
    pierEnd: focusFishingRange.pierEnd,
    fishZoneStart: focusFishingRange.start,
    fishZoneEnd: focusFishingRange.end,
    bobberOffset: focusFishingRange.bobberOffset,
    waterClearance: focusFishingRange.waterClearance,
    fx: null,
    hintPos: { x: focusFishingRange.start + 10, y: 510 },
  };

  const fishing = {
    phase: null,
    t0: 0,
    waitMs: 0,
    articleIndex: -1,
    tip: { x: 0, y: 0 },
    bobber: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    catchPos: { x: 0, y: 0 },
  };

  const nn = (v) => Math.round(v * 10) / 10;
  const pt = (x, y) => `${nn(x)} ${nn(y)}`;
  const M = (x, y) => `M${pt(x, y)}`;
  const L = (x, y) => `L${pt(x, y)}`;
  const C = (x1, y1, x2, y2, x, y) => `C${pt(x1, y1)} ${pt(x2, y2)} ${pt(x, y)}`;
  const Q = (x1, y1, x, y) => `Q${pt(x1, y1)} ${pt(x, y)}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function sampleRange(range) {
    return Array.isArray(range) ? rand(range[0], range[1]) : range;
  }

  function pickOne(list) {
    return list[Math.floor(rand(0, list.length))];
  }

  function particleColor(spec) {
    if (typeof spec === 'string') {
      return spec;
    }
    const r = Math.round(sampleRange(spec.r));
    const g = Math.round(sampleRange(spec.g));
    const b = Math.round(sampleRange(spec.b));
    const a = sampleRange(spec.a).toFixed(2);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function particleWorldAt(x = state.x) {
    const stage = isJourneyMode ? journey.stageAt(x) : focusStage(x);
    return runtime.particleWorldForStage(stage);
  }

  function activeParticleWorld(fallbackWorld = '') {
    return journeyTransition.active?.shapeWorld
      || fallbackWorld
      || particleWorldAt(state.x);
  }

  function syncParticleLanguageDataset(stage = root.dataset.stage || 'moss') {
    const world = activeParticleWorld(runtime.particleWorldForStage(stage));
    const shape = runtime.particleShapeForWorld(world, renderQuality.mode);
    if (root.dataset.particleWorld !== world) {
      root.dataset.particleWorld = world;
    }
    if (root.dataset.particleShape !== shape) {
      root.dataset.particleShape = shape;
    }
  }

  function resolveVocabularyShape(world, sample, sourceType = '', nearHubRing = false) {
    const baseShape = runtime.particleShapeForWorld(world, renderQuality.mode);
    if (baseShape === 'dot') {
      if (renderQuality.mode !== 'low' && world === 'moss' && sourceType === 'leaf') {
        return 'leaf';
      }
      return 'dot';
    }
    if (
      renderQuality.mode !== 'low'
      && world === 'ojicra'
      && (sourceType === 'spark' || sourceType === 'star')
      && sample > 0.7
    ) {
      return 'spark';
    }
    if (baseShape === 'mix') {
      if (nearHubRing) {
        return 'dot';
      }
      return HUB_SHAPE_SEQUENCE[
        Math.min(HUB_SHAPE_SEQUENCE.length - 1, Math.floor(sample * HUB_SHAPE_SEQUENCE.length))
      ];
    }
    return baseShape;
  }

  function shapeMorphScale(now, particle = null) {
    const morphAt = Math.max(
      particle?.shapeMorphAt || 0,
      journeyTransition.active?.shapeBurstAt || 0
    );
    return morphAt > 0
      ? runtime.particleMorphScale(now - morphAt, PARTICLE_MORPH_DURATION_MS)
      : 1;
  }

  function morphJourneyParticleLanguage(active, now) {
    active.shapeWorld = active.shapeToWorld;
    active.shapeBurstAt = now;
    particleLanguage.serial += 1;
    particleLanguage.lastFromWorld = active.shapeFromWorld;
    particleLanguage.lastToWorld = active.shapeToWorld;
    particleLanguage.lastMorphAt = now;
    particleMorphRenderScheduler.reset(now);
    let transformedCount = 0;
    particles.forEach((particle) => {
      if (!particle.shapeLanguage) {
        return;
      }
      particle.shapeWorld = active.shapeToWorld;
      particle.shapeMorphAt = now;
      transformedCount += 1;
    });
    particleLanguage.transformedCount = transformedCount;
    root.dataset.particleShapeMorph = `${active.shapeFromWorld}-to-${active.shapeToWorld}`;
    syncParticleLanguageDataset();
  }

  function emitParticles(count, factory, options = {}) {
    if (count <= 0) {
      return 0;
    }
    const qualityScale = options.qualityScale === false ? 1 : renderQuality.particleScale;
    const effectiveCount = Math.max(1, Math.round(count * qualityScale));
    const stride = count / effectiveCount;
    if (options.defer) {
      const batches = runtime.particleBurstBatches(effectiveCount, {
        maxPerFrame: options.maxPerFrame || 24,
        minimumFrames: options.minimumFrames || 1,
      });
      particleSpawnQueue.push({
        batches,
        batchIndex: 0,
        batchRemaining: batches[0] || 0,
        emitted: 0,
        sourceCount: count,
        stride,
        factory,
        scope: options.scope || '',
      });
      particleRuntimeStats.queuedParticles += effectiveCount;
      particleRuntimeStats.queuePeak = Math.max(
        particleRuntimeStats.queuePeak,
        particleSpawnQueue.length
      );
      return effectiveCount;
    }
    for (let i = 0; i < effectiveCount; i += 1) {
      addParticleFromFactory(
        factory,
        Math.min(count - 1, Math.floor(i * stride))
      );
    }
    return effectiveCount;
  }

  function cancelParticleSpawnScope(scope) {
    if (!scope) {
      return;
    }
    for (let index = particleSpawnQueue.length - 1; index >= 0; index -= 1) {
      if (particleSpawnQueue[index].scope !== scope) {
        continue;
      }
      particleSpawnQueue[index] = particleSpawnQueue[particleSpawnQueue.length - 1];
      particleSpawnQueue.pop();
    }
  }

  function cancelDiscoveryTitleTypography() {
    discoveryTitleFormationSerial += 1;
    cancelParticleSpawnScope(DISCOVERY_TITLE_PARTICLE_SCOPE);
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      if (particles[index].effectScope === DISCOVERY_TITLE_PARTICLE_SCOPE) {
        recycleParticleAt(index);
      }
    }
    journeyDiscoveryNode.classList.remove('is-forming-title');
  }

  function flushParticleSpawnQueue() {
    let frameBudget = 24;
    particleRuntimeStats.emittedThisFrame = 0;
    for (let queueIndex = 0; queueIndex < particleSpawnQueue.length && frameBudget > 0;) {
      const job = particleSpawnQueue[queueIndex];
      const emitCount = Math.min(frameBudget, job.batchRemaining);
      for (let index = 0; index < emitCount; index += 1) {
        const sourceIndex = Math.min(
          job.sourceCount - 1,
          Math.floor(job.emitted * job.stride)
        );
        addParticleFromFactory(job.factory, sourceIndex);
        job.emitted += 1;
      }
      frameBudget -= emitCount;
      job.batchRemaining -= emitCount;
      particleRuntimeStats.emittedFromQueue += emitCount;
      particleRuntimeStats.emittedThisFrame += emitCount;
      particleRuntimeStats.maxEmittedPerFrame = Math.max(
        particleRuntimeStats.maxEmittedPerFrame,
        particleRuntimeStats.emittedThisFrame
      );
      if (job.batchRemaining > 0) {
        queueIndex += 1;
        continue;
      }
      job.batchIndex += 1;
      if (job.batchIndex < job.batches.length) {
        job.batchRemaining = job.batches[job.batchIndex];
        queueIndex += 1;
        continue;
      }
      particleSpawnQueue[queueIndex] = particleSpawnQueue[particleSpawnQueue.length - 1];
      particleSpawnQueue.pop();
    }
  }

  function groundNoise(x, salt = 0) {
    const n = Math.sin(x * 12.9898 + salt * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function worldToScreen(x, y) {
    return {
      x: (x - state.cameraX) * state.scale,
      y: (y - state.cameraY) * state.scale,
    };
  }

  function setTimedDataset(name, value, until) {
    if (until > clock.now()) {
      if (root.dataset[name] !== value) {
        root.dataset[name] = value;
      }
    } else if (root.dataset[name] !== undefined) {
      delete root.dataset[name];
    }
  }

  function triggerParticleFlash(duration = 520) {
    particleBurstState.flashUntil = clock.now() + duration;
    particleFlashAnimation?.cancel();
    particleFlashAnimation = particleCanvas?.animate?.([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0.82, transform: 'scale(1.006)', offset: 0.34 },
      { opacity: 1, transform: 'scale(1)' },
    ], {
      duration,
      easing: 'ease-out',
    }) || null;
  }

  function triggerScreenShake(duration = 420) {
    particleBurstState.shakeUntil = clock.now() + duration;
    screenShakeAnimation?.cancel();
    screenShakeAnimation = viewportNode?.animate?.([
      { transform: 'translate3d(0, 0, 0)' },
      { transform: 'translate3d(-2px, 1px, 0)', offset: 0.18 },
      { transform: 'translate3d(2px, -1px, 0)', offset: 0.38 },
      { transform: 'translate3d(-1px, -1px, 0)', offset: 0.58 },
      { transform: 'translate3d(1px, 1px, 0)', offset: 0.78 },
      { transform: 'translate3d(0, 0, 0)' },
    ], {
      duration,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    }) || null;
  }

  function setRenderQuality(mode) {
    if (renderQuality.mode === mode) {
      return;
    }
    const profile = runtime.renderQualityProfile(mode);
    renderQuality.mode = mode;
    renderQuality.dprCap = profile.dprCap;
    renderQuality.particleScale = profile.particleScale;
    renderQuality.dotScale = profile.dotScale;
    root.dataset.renderQuality = mode;
    syncParticleLanguageDataset();
    canvasResizePending = true;
  }

  function updateRenderQuality(workMs, elapsedMs, targetFps = 60) {
    const recoveryAllowed = !state.isMoving
      && !journeyTransition.active
      && !journeyLanding.active
      && !journeyMoment.active
      && !journeyReturn.active
      && !journeyAwakening.dawn
      && !journeyAwakening.resonance
      && !journeyAwakening.starDash
      && !journeyAwakening.orchestra
      && !journeySecrets.active
      && !journeySecrets.observatory
      && !journeySecrets.ascension
      && !fishing.phase;
    const targetInterval = 1000 / Math.max(1, Number(targetFps) || 60);
    const missedDeadlineMs = Math.max(0, (elapsedMs || targetInterval) - targetInterval);
    const observedPressureMs = Math.max(workMs, missedDeadlineMs);
    const snapshot = qualityController.observe(
      observedPressureMs,
      elapsedMs,
      { recoveryAllowed }
    );
    renderQuality.frameAverage = snapshot.averageMs;
    renderQuality.sampleCount = snapshot.sampleCount;
  }

  function resizeCanvas(canvas, ctx, overscan = 0) {
    if (!canvas || !ctx) {
      return;
    }
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const width = viewportWidth + overscan * 2;
    const height = viewportHeight + overscan * 2;
    const dpr = runtime.canvasRenderScale(
      width,
      height,
      window.devicePixelRatio || 1,
      renderQuality.dprCap
    );
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvasAllocationStats.total += 1;
      if (state.isMoving) {
        canvasAllocationStats.whileMoving += 1;
      }
    }
    const cssWidth = `${width}px`;
    const cssHeight = `${height}px`;
    if (canvas.style.width !== cssWidth) {
      canvas.style.width = cssWidth;
    }
    if (canvas.style.height !== cssHeight) {
      canvas.style.height = cssHeight;
    }
    const cssOffset = `${-overscan}px`;
    if (canvas.style.left !== cssOffset) {
      canvas.style.left = cssOffset;
    }
    if (canvas.style.top !== cssOffset) {
      canvas.style.top = cssOffset;
    }
    ctx.setTransform(dpr, 0, 0, dpr, dpr * overscan, dpr * overscan);
  }

  function resizeParticles() {
    resizeCanvas(dotWorldFarCanvas, dotWorldFarCtx, DOT_CANVAS_OVERSCAN);
    resizeCanvas(dotWorldCanvas, dotWorldCtx, DOT_CANVAS_OVERSCAN);
    resizeCanvas(particleCanvas, particleCtx);
  }

  function recycleParticleAt(index) {
    if (index < 0 || index >= particles.length) {
      return null;
    }
    const particle = particles[index];
    const lastIndex = particles.length - 1;
    if (index !== lastIndex) {
      particles[index] = particles[lastIndex];
    }
    particles.pop();
    particle.clusterPoints = null;
    particle.targetX = undefined;
    particle.targetY = undefined;
    if (particlePool.length < PARTICLE_CONFIG.maxCount) {
      particlePool.push(particle);
      particleRuntimeStats.recycled += 1;
    }
    return particle;
  }

  function approximateOldestParticleIndex() {
    if (particles.length <= 1) {
      return 0;
    }
    const sampleCount = Math.min(8, particles.length);
    let oldestIndex = particleEvictionCursor % particles.length;
    let oldestGeneration = particles[oldestIndex].generation || 0;
    for (let sample = 1; sample < sampleCount; sample += 1) {
      const index = (particleEvictionCursor + sample * 97) % particles.length;
      const generation = particles[index].generation || 0;
      if (generation < oldestGeneration) {
        oldestIndex = index;
        oldestGeneration = generation;
      }
    }
    particleEvictionCursor = (particleEvictionCursor + 17) % particles.length;
    return oldestIndex;
  }

  function trimParticleOverflow(maxCount) {
    if (particles.length < maxCount) {
      return;
    }
    const overflow = particles.length - maxCount + 1;
    const trimCount = Math.max(overflow, Math.ceil(maxCount * 0.06));
    for (let index = 0; index < trimCount && particles.length; index += 1) {
      recycleParticleAt(approximateOldestParticleIndex());
      particleRuntimeStats.trimmed += 1;
    }
  }

  function resetParticleSlot(particle) {
    particle.x = undefined;
    particle.y = undefined;
    particle.vx = 0;
    particle.vy = 0;
    particle.ax = 0;
    particle.ay = 0;
    particle.targetX = undefined;
    particle.targetY = undefined;
    particle.targetAttract = undefined;
    particle.targetDamping = undefined;
    particle.size = undefined;
    particle.life = undefined;
    particle.maxLife = undefined;
    particle.createdAt = undefined;
    particle.color = undefined;
    particle.type = undefined;
    particle.variant = '';
    particle.clusterCount = 0;
    particle.clusterSeed = 0;
    particle.clusterStretch = 1;
    particle.clusterPoints = null;
    particle.spin = 0;
    particle.angle = undefined;
    particle.shapeLanguage = undefined;
    particle.shapeWorld = undefined;
    particle.shapeSample = undefined;
    particle.shapePhase = undefined;
    particle.shapeAmbient = false;
    particle.shapeMorphAt = 0;
    particle.paperWidth = 0;
    particle.paperHeight = 0;
    particle.paperCurlPhase = 0;
    particle.paperCurlSpeed = 0;
    particle.paperWobble = 0;
    particle.paperGravity = 0;
    particle.paperFallDelay = 0;
    particle.targetDelay = 0;
    particle.targetBornAt = 0;
    particle.textLockAfter = 0;
    particle.effectScope = '';
    particle.hubNear = false;
    return particle;
  }

  function preallocateParticlePool(count) {
    const target = Math.min(PARTICLE_CONFIG.maxCount, Math.max(0, Math.floor(count)));
    while (particlePool.length < target) {
      particlePool.push(resetParticleSlot({}));
      particleRuntimeStats.preallocated += 1;
    }
  }

  function acquireParticleSlot() {
    let particle = particlePool.pop();
    if (particle) {
      particleRuntimeStats.reused += 1;
    } else {
      particle = {};
      particleRuntimeStats.created += 1;
    }
    return resetParticleSlot(particle);
  }

  function enforceParticleLimit() {
    const maxCount = Math.max(
      260,
      Math.round(PARTICLE_CONFIG.maxCount * renderQuality.particleScale)
    );
    if (particles.length >= maxCount) {
      trimParticleOverflow(maxCount);
    }
  }

  function initializeParticle(particle, options = particle) {
    const type = options.type || 'dot';
    const shapeLanguage = options.shapeLanguage ?? WORLD_SHAPE_PARTICLE_TYPES.has(type);
    particle.x = options.x;
    particle.y = options.y;
    particle.vx = options.vx || 0;
    particle.vy = options.vy || 0;
    particle.ax = options.ax || 0;
    particle.ay = options.ay || 0;
    particle.targetX = options.targetX;
    particle.targetY = options.targetY;
    particle.targetAttract = options.targetAttract ?? 0.00007;
    particle.targetDamping = options.targetDamping ?? 0.86;
    particle.size = options.size || 3;
    particle.life = options.life || 900;
    particle.maxLife = options.life || 900;
    particle.createdAt = options.createdAt ?? clock.now();
    particle.color = options.color || 'rgba(70, 70, 70, 0.45)';
    particle.type = type;
    particle.variant = options.variant || '';
    particle.clusterCount = options.clusterCount || 0;
    particle.clusterSeed = options.clusterSeed || 0;
    particle.clusterStretch = options.clusterStretch || 1;
    particle.clusterPoints = options.clusterPoints || null;
    particle.spin = options.spin || 0;
    particle.angle = options.angle ?? rand(-Math.PI, Math.PI);
    particle.shapeLanguage = shapeLanguage;
    particle.shapeWorld = shapeLanguage
      ? (options.shapeWorld || activeParticleWorld())
      : '';
    particle.shapeSample = options.shapeSample ?? rand(0, 1);
    particle.shapePhase = options.shapePhase ?? rand(0, Math.PI * 2);
    particle.shapeAmbient = Boolean(options.shapeAmbient);
    particle.shapeMorphAt = options.shapeMorphAt || 0;
    particle.paperWidth = options.paperWidth || 0;
    particle.paperHeight = options.paperHeight || 0;
    particle.paperCurlPhase = options.paperCurlPhase || 0;
    particle.paperCurlSpeed = options.paperCurlSpeed || 0;
    particle.paperWobble = options.paperWobble || 0;
    particle.paperGravity = options.paperGravity || 0;
    particle.paperFallDelay = options.paperFallDelay || 0;
    particle.targetDelay = options.targetDelay || 0;
    particle.targetBornAt = options.targetBornAt || particle.createdAt;
    particle.textLockAfter = options.textLockAfter || 0;
    particle.effectScope = options.effectScope || particle.effectScope || '';
    particle.hubNear = false;
    particle.generation = ++particleGeneration;
    particles.push(particle);
  }

  function addParticleFromFactory(factory, sourceIndex) {
    if (!particleCtx) {
      return;
    }
    enforceParticleLimit();
    const particle = acquireParticleSlot();
    const options = factory(sourceIndex, particle) || particle;
    initializeParticle(particle, options);
  }

  function addParticle(options = {}) {
    if (!particleCtx) {
      return;
    }
    enforceParticleLimit();
    initializeParticle(acquireParticleSlot(), options);
  }

  function spawnFootstepParticles(now, characterScreenX, characterScreenY) {
    if (!state.isMoving || fishing.phase || journeyTransition.active) {
      return;
    }
    if (state.started && Math.abs(state.vx) < 0.08) {
      return;
    }
    const effect = PARTICLE_EFFECTS.footstepTrail;
    const stage = isJourneyMode ? (state.journeyStage || journey.stageAt(state.x)) : 'moss';
    const profiles = {
      taupe: {
        palette: [[79, 229, 219], [238, 93, 176], [231, 205, 81]],
        count: 4, size: [1.1, 2.8], life: [300, 560], alpha: [0.32, 0.56],
        vy: [-0.075, -0.025], ay: -0.000015,
      },
      'rise-islog': {
        palette: [[76, 145, 162], [181, 104, 92]],
        count: 4, size: [1, 2.5], life: [280, 500], alpha: [0.25, 0.46],
        vy: [-0.06, -0.018], ay: 0.00003,
      },
      islog: {
        palette: [[76, 145, 162], [181, 104, 92], [82, 88, 88]],
        count: 4, size: [1, 2.6], life: [260, 480], alpha: [0.24, 0.44],
        vy: [-0.05, -0.012], ay: 0.00004,
      },
      launch: {
        palette: [[137, 91, 157], [188, 194, 104], [215, 218, 142]],
        count: 5, size: [1.2, 3.1], life: [360, 620], alpha: [0.34, 0.58],
        vy: [-0.09, -0.03], ay: -0.00002,
      },
      ojicra: {
        palette: [[188, 194, 104], [137, 91, 157], [215, 218, 142]],
        count: 5, size: [1.1, 3], life: [420, 760], alpha: [0.28, 0.52],
        vy: [-0.045, 0.015], ay: -0.000025,
      },
      'fall-ground': {
        palette: [[127, 214, 229], [190, 116, 123], [193, 151, 83]],
        count: 5, size: [1.1, 3], life: [360, 650], alpha: [0.3, 0.52],
        vy: [-0.06, -0.015], ay: 0.00002,
      },
      monoomoi: {
        palette: [[190, 116, 123], [105, 154, 128], [193, 151, 83]],
        count: 5, size: [1, 2.8], life: [440, 760], alpha: [0.25, 0.46],
        vy: [-0.085, -0.025], ay: -0.000018,
      },
      monoerabi: {
        palette: [[79, 151, 171], [191, 145, 75], [176, 99, 93]],
        count: 4, size: [1.2, 3], life: [320, 560], alpha: [0.28, 0.5],
        vy: [-0.035, 0.005], ay: 0,
      },
      hub: {
        palette: [[80, 164, 180], [230, 112, 174], [117, 184, 143], [207, 166, 84]],
        count: 5, size: [1.2, 3.2], life: [420, 760], alpha: [0.28, 0.5],
        vy: [-0.055, 0.005], ay: -0.00001,
      },
    };
    const profile = profiles[stage] || effect;
    const interval = state.started ? effect.startedInterval : effect.introInterval;
    if (now - particleBurstState.lastFootstep < interval) {
      return;
    }
    particleBurstState.lastFootstep = now;
    particleBurstState.footstepSide *= -1;
    const side = particleBurstState.footstepSide || 1;
    const scale = state.scale;
    const footX = characterScreenX + side * effect.sideOffset * scale - state.direction * effect.trailOffset * scale;
    const footY = characterScreenY + effect.yOffset * scale;
    emitParticles(profile.count || effect.count, (index) => {
      const [r, g, b] = pickOne(profile.palette || effect.palette);
      return {
        x: footX + sampleRange(effect.spreadX) * scale,
        y: footY + sampleRange(effect.spreadY) * scale,
        vx: sampleRange(effect.vx) - state.direction * sampleRange(effect.trailVx),
        vy: sampleRange(profile.vy || effect.vy),
        ay: profile.ay ?? effect.ay,
        size: sampleRange(profile.size || effect.size) * scale,
        life: sampleRange(profile.life || effect.life),
        color: `rgba(${r}, ${g}, ${b}, ${sampleRange(profile.alpha || effect.alpha).toFixed(2)})`,
        type: 'footstep',
        variant: profile.variants ? profile.variants[index % profile.variants.length] : '',
        spin: sampleRange(effect.spin),
      };
    });
  }

  function spawnMossWeather(now) {
    if (!isFocusMode || !state.started) {
      return;
    }
    const rainIntensity = runtime.mossRainIntensity(state.x);
    const lakeFill = runtime.mossLakeFill(state.x);
    if (rainIntensity <= 0.01 || journeyTransition.active) {
      delete root.dataset.mossRain;
      return;
    }

    root.dataset.mossRain = rainIntensity > 0.72
      ? 'steady'
      : rainIntensity > 0.28 ? 'growing' : 'drizzle';
    const weather = runtime.MOSS_WEATHER;
    const spread = smooth(clamp(
      (state.x - weather.rainStartX) / Math.max(1, weather.rainFullX - weather.rainStartX),
      0,
      1
    ));
    const qualityScale = Math.max(0.45, renderQuality.particleScale);
    const rainInterval = Math.max(40, 176 - rainIntensity * 132) / qualityScale;
    if (now - particleBurstState.lastMossRain >= rainInterval) {
      particleBurstState.lastMossRain = now;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const leftEdge = width * (1 - spread) - 38;
      const count = Math.max(1, Math.round((1.4 + rainIntensity * 6.2) * qualityScale));
      emitParticles(count, (index) => ({
        x: rand(leftEdge, width + 44),
        y: rand(-74, height * (0.08 + spread * 0.13)),
        vx: rand(-0.085, -0.026),
        vy: rand(0.5, 0.88) * (0.84 + rainIntensity * 0.3),
        size: rand(5.4, 10.2),
        life: rand(980, 1580),
        color: index % 4 === 0
          ? `rgba(72, 151, 171, ${(0.28 + rainIntensity * 0.28).toFixed(3)})`
          : `rgba(106, 181, 195, ${(0.24 + rainIntensity * 0.24).toFixed(3)})`,
        type: 'moss-rain',
        angle: rand(-0.11, -0.035),
      }));
    }

    const splashInterval = Math.max(92, 270 - rainIntensity * 164) / qualityScale;
    if (now - particleBurstState.lastMossSplash < splashInterval) {
      return;
    }
    particleBurstState.lastMossSplash = now;
    const width = window.innerWidth;
    const leftEdge = width * (1 - spread) - 20;
    const screenX = rand(leftEdge, width + 12);
    const worldX = state.cameraX + screenX / Math.max(0.1, state.scale);
    const hitsLake = lakeFill > 0.08 && worldX >= focusWorld.waterStart;
    const impactY = hitsLake ? focusWorld.waterY + 4 : terrainY(worldX) - 1;
    const impact = worldToScreen(worldX, impactY);
    if (impact.y < -20 || impact.y > window.innerHeight + 24) {
      return;
    }
    addParticle({
      x: impact.x,
      y: impact.y,
      size: rand(4.5, 8.5) * (0.78 + rainIntensity * 0.28),
      life: rand(300, 480),
      color: hitsLake ? 'rgba(87, 165, 181, 0.34)' : 'rgba(108, 174, 184, 0.25)',
      type: 'moss-rain-splash',
      angle: 0,
    });
    emitParticles(Math.max(1, Math.round(2 * qualityScale)), () => ({
      x: impact.x + rand(-4, 4),
      y: impact.y - rand(0, 3),
      vx: rand(-0.075, 0.075),
      vy: rand(-0.16, -0.07),
      ay: 0.0003,
      size: rand(1.1, 2.1),
      life: rand(260, 430),
      color: 'rgba(94, 174, 188, 0.3)',
      type: 'water-spray',
      angle: rand(-0.24, 0.24),
    }));
  }

  function spawnFishingParticles(now) {
    if (!focusWorld.fx || !fishing.phase) {
      return;
    }
    const waterScreen = worldToScreen(fishing.bobber.x || state.x + 360, fishing.bobber.y || focusWorld.waterY);
    if (fishing.phase === 'cast') {
      const effect = PARTICLE_EFFECTS.fishingCast;
      emitParticles(effect.count, () => ({
        x: waterScreen.x + sampleRange(effect.spreadX),
        y: waterScreen.y + sampleRange(effect.spreadY),
        vx: sampleRange(effect.vx),
        vy: sampleRange(effect.vy),
        size: sampleRange(effect.size),
        life: sampleRange(effect.life),
        color: particleColor(effect.color),
        type: 'water',
      }));
    } else if (fishing.phase === 'wait') {
      const effect = PARTICLE_EFFECTS.fishingWaitRing;
      if (now - particleBurstState.lastRain <= effect.interval) {
        return;
      }
      particleBurstState.lastRain = now;
      addParticle({
        x: waterScreen.x + sampleRange(effect.spreadX),
        y: waterScreen.y + sampleRange(effect.spreadY),
        vx: sampleRange(effect.vx),
        vy: sampleRange(effect.vy),
        size: sampleRange(effect.size),
        life: sampleRange(effect.life),
        color: particleColor(effect.color),
        type: 'ring',
      });
    } else if (fishing.phase === 'bite') {
      const effect = PARTICLE_EFFECTS.fishingBite;
      emitParticles(effect.count, () => ({
        x: waterScreen.x + sampleRange(effect.spreadX),
        y: waterScreen.y + sampleRange(effect.spreadY),
        vx: sampleRange(effect.vx),
        vy: sampleRange(effect.vy),
        ay: effect.ay,
        size: sampleRange(effect.size),
        life: sampleRange(effect.life),
        color: particleColor(effect.color),
        type: 'spark',
      }));
    } else if (fishing.phase === 'catch') {
      const effect = PARTICLE_EFFECTS.fishingCatchBit;
      const source = fishing.catchPos.x ? fishing.catchPos : fishing.bobber;
      const end = worldToScreen(source.x, source.y);
      addParticle({
        x: end.x + sampleRange(effect.spreadX),
        y: end.y + sampleRange(effect.spreadY),
        vx: sampleRange(effect.vx),
        vy: sampleRange(effect.vy),
        size: sampleRange(effect.size),
        life: sampleRange(effect.life),
        color: particleColor(effect.color),
        type: 'bit',
      });
    }
  }

  function emitJourneyImpact(color, count = 80, defer = false) {
    const originX = (state.x - state.cameraX) * state.scale;
    const originY = (state.y - state.cameraY) * state.scale;
    emitParticles(count, (_index, particle) => {
      const angle = rand(Math.PI * 1.08, Math.PI * 1.92);
      const speed = rand(0.08, 0.42);
      particle.x = originX + rand(-12, 12);
      particle.y = originY + rand(-4, 6);
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.ay = 0.00032;
      particle.size = rand(1.2, 3.8) * state.scale;
      particle.life = rand(680, 1320);
      particle.color = color;
      particle.type = Math.random() > 0.82 ? 'ring' : 'bit';
      return particle;
    }, defer ? { defer: true, maxPerFrame: 24, minimumFrames: 3 } : undefined);
  }

  function createSplashFanPoints(count, seed) {
    const cacheKey = `${count}:${seed}`;
    const cached = splashFanCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const points = new Float32Array(count * 4);
    let value = seed >>> 0;
    const random = () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
    for (let index = 0; index < count; index += 1) {
      const offset = index * 4;
      const position = count <= 1 ? 0.5 : index / (count - 1);
      const radiusNoise = random();
      const liftNoise = random();
      const sizeNoise = random();
      points[offset] = -Math.PI + position * Math.PI + (liftNoise - 0.5) * 0.16;
      points[offset + 1] = 0.26 + radiusNoise * 0.76;
      points[offset + 2] = 0.02 + liftNoise * 0.08;
      points[offset + 3] = 0.0058 + sizeNoise * 0.0082;
    }
    splashFanCache.set(cacheKey, points);
    return points;
  }

  function emitMossWaterBreak() {
    const origin = worldToScreen(state.x, focusWorld.waterY + 4);
    const clusterScale = Math.max(0.68, renderQuality.particleScale);
    const sprayCount = 116;
    const wideSprayCount = 18;
    const palette = [
      'rgba(72, 151, 169, 0.78)',
      'rgba(109, 187, 200, 0.72)',
      'rgba(157, 211, 218, 0.64)',
      'rgba(224, 244, 246, 0.56)',
    ];
    emitParticles(sprayCount + wideSprayCount, (index, particle) => {
      if (index < sprayCount) {
        const side = index % 2 ? -1 : 1;
        const speed = rand(0.2, 0.86);
        particle.x = origin.x + rand(-112, 112) * state.scale;
        particle.y = origin.y + rand(-8, 18) * state.scale;
        particle.vx = side * speed * rand(0.46, 1.08);
        particle.vy = -speed * rand(0.82, 1.48);
        particle.ay = rand(0.00034, 0.00052);
        particle.size = rand(1.5, 5.4) * state.scale;
        particle.life = rand(720, 1420);
        particle.color = palette[index % palette.length];
        particle.type = 'water-spray';
        particle.angle = rand(-0.32, 0.32);
        return particle;
      }
      const wideIndex = index - sprayCount;
      particle.x = origin.x + rand(-window.innerWidth * 0.38, window.innerWidth * 0.38);
      particle.y = origin.y + rand(-5, 14);
      particle.vx = rand(-0.2, 0.2);
      particle.vy = rand(-0.34, -0.12);
      particle.ay = 0.00038;
      particle.size = rand(1, 2.8);
      particle.life = rand(620, 1100);
      particle.color = wideIndex % 3 === 0 ? palette[3] : palette[1];
      particle.type = 'water-spray';
      particle.angle = rand(-0.18, 0.18);
      return particle;
    }, { defer: true, maxPerFrame: 24, minimumFrames: 4 });
    [
      { x: -28, y: 8, size: 330, count: 96, life: 1060, seed: 41, stretch: 1.38, color: 'rgba(75, 169, 187, 0.78)' },
      { x: 30, y: 4, size: 300, count: 92, life: 980, seed: 73, stretch: 1.48, color: 'rgba(126, 199, 211, 0.72)' },
      { x: 0, y: 12, size: 220, count: 74, life: 850, seed: 109, stretch: 1.65, color: 'rgba(174, 221, 227, 0.68)' },
      { x: 5, y: 18, size: 162, count: 56, life: 690, seed: 137, stretch: 1.08, color: 'rgba(232, 248, 249, 0.62)' },
    ].forEach((fan) => {
      const clusterCount = Math.round(fan.count * clusterScale);
      addParticle({
        x: origin.x + fan.x * state.scale,
        y: origin.y + fan.y * state.scale,
        size: fan.size * state.scale,
        life: fan.life,
        color: fan.color,
        type: 'moss-splash-fan',
        clusterCount,
        clusterSeed: fan.seed,
        clusterStretch: fan.stretch,
        clusterPoints: createSplashFanPoints(clusterCount, fan.seed),
        angle: 0,
      });
    });
    for (let index = 0; index < 9; index += 1) {
      addParticle({
        x: origin.x + (index - 4) * 64 * state.scale,
        y: origin.y + rand(-4, 5),
        size: rand(9, 17) * state.scale,
        life: rand(480, 760),
        color: index % 2 ? 'rgba(101, 181, 195, 0.42)' : 'rgba(150, 210, 218, 0.34)',
        type: 'moss-rain-splash',
        angle: 0,
      });
    }
  }

  function emitJourneyPaperTear(active, now) {
    if (!active || !['drop', 'return-drop'].includes(active.type)) {
      return 0;
    }
    const count = runtime.paperFragmentCount(active.type, renderQuality.mode);
    const origin = worldToScreen(active.fromX, active.fromY + 4);
    const spread = Math.min(window.innerWidth * 0.42, 430);
    const paperScale = clamp(state.scale, 0.82, 1.12);
    emitParticles(count, (index, particle) => {
      const offsetX = rand(-spread, spread);
      const outward = spread > 0 ? offsetX / spread : 0;
      const lead = 1 - index / Math.max(1, count - 1);
      particle.x = origin.x + offsetX;
      particle.y = origin.y + rand(-12, 18) * paperScale;
      particle.vx = outward * rand(0.035, 0.11) * (1 + lead * 0.16) + rand(-0.055, 0.055);
      particle.vy = rand(-0.5, -0.2) * (1 + lead * 0.18);
      particle.size = rand(2.2, 3.8) * paperScale;
      particle.life = rand(1200, 2000);
      particle.color = 'rgba(252, 251, 247, 0.96)';
      particle.type = 'paper-fragment';
      particle.spin = rand(-0.0065, 0.0065);
      particle.angle = rand(-Math.PI, Math.PI);
      particle.paperWidth = rand(6, 14) * paperScale;
      particle.paperHeight = rand(4, 9) * paperScale;
      particle.paperCurlPhase = rand(0, Math.PI * 2);
      particle.paperCurlSpeed = rand(0.006, 0.012);
      particle.paperWobble = rand(0.000018, 0.000052);
      particle.paperGravity = rand(0.00028, 0.00046);
      particle.paperFallDelay = rand(180, 520);
      particle.shapeLanguage = false;
      return particle;
    }, {
      defer: true,
      maxPerFrame: 24,
      minimumFrames: 3,
      qualityScale: false,
    });
    particleBurstState.lastPaperTearAt = now;
    particleBurstState.lastPaperTearType = active.type;
    particleBurstState.lastPaperTearCount = count;
    return count;
  }

  animationEffects.register('journey-launch-impact', (payload = {}) => {
    emitJourneyImpact(payload.color || 'rgba(188, 194, 104, 0.64)', payload.count || 168, true);
    return true;
  });
  animationEffects.register('journey-moss-drop-splash', () => {
    emitMossWaterBreak();
    return true;
  });

  function beginJourneyTransition(definition, now, direction = 1) {
    const movingForward = direction > 0;
    if (
      !isJourneyMode
      || journeyTransition.active
      || journeyLandingBlocksTravel(now)
      || (movingForward && journeyTransition.completed.has(definition.id))
      || (!movingForward && !journeyTransition.completed.has(definition.id))
    ) {
      return false;
    }
    const fromX = movingForward ? definition.triggerX : definition.toX;
    const toX = movingForward ? definition.toX : definition.triggerX;
    const type = movingForward ? definition.type : journey.reverseTransitionType(definition.type);
    const shapeFromWorld = particleWorldAt(fromX);
    const shapeToWorld = particleWorldAt(toX);
    state.x = fromX;
    state.y = terrainY(fromX);
    state.vx = 0;
    state.direction = direction;
    state.isMoving = false;
    closeJourneyDiscovery({ announce: false });
    journeyAwakening.starDash = null;
    delete root.dataset.starDash;
    journeyTransition.active = {
      ...definition,
      type,
      originalType: definition.type,
      direction,
      startedAt: now,
      fromX,
      toX,
      fromY: terrainY(fromX),
      toY: terrainY(toX),
      burstDone: false,
      shapeFromWorld,
      shapeToWorld,
      shapeWorld: shapeFromWorld,
      shapeBurstAt: 0,
      destinationWarmSlices: 0,
    };
    root.dataset.cinematic = type;
    root.dataset.cinematicDirection = movingForward ? 'forward' : 'reverse';
    root.dataset.cinematicPhase = 'anticipation';
    root.dataset.particleShapeMorph = 'anticipation';
    syncParticleLanguageDataset();
    audio?.transition(type);
    if (type === 'drop') {
      emitJourneyImpact('rgba(84, 164, 180, 0.52)', 72, true);
      triggerScreenShake(520);
    } else if (type === 'launch') {
      emitJourneyImpact('rgba(137, 91, 157, 0.54)', 88, true);
      triggerScreenShake(360);
    } else {
      triggerParticleFlash(440);
    }
    return true;
  }

  function maybeBeginJourneyTransition(input, now) {
    if (!isJourneyMode || input === 0 || journeyTransition.active || journeyLandingBlocksTravel(now)) {
      return false;
    }
    const candidate = journey.transitionCandidate(
      journey.transitions,
      journeyTransition.completed,
      state.x,
      input
    );
    return candidate
      ? beginJourneyTransition(candidate.definition, now, candidate.direction)
      : false;
  }

  function updateJourneyTransition(now) {
    const active = journeyTransition.active;
    if (!active) {
      return false;
    }
    const elapsed = now - active.startedAt;
    if (elapsed < active.holdMs) {
      const anticipation = clamp(elapsed / active.holdMs, 0, 1);
      prewarmJourneyDestination(active, anticipation);
      const movingDotProfile = movingDotTargets[renderQuality.mode] || movingDotTargets.high;
      const anticipationDotScale = 1 - (1 - movingDotProfile.cinematic) * smooth(anticipation);
      renderQuality.movingDotScale = Math.min(
        renderQuality.movingDotScale,
        anticipationDotScale
      );
      state.x = active.fromX;
      if (active.type === 'launch') {
        state.y = active.fromY + Math.sin(anticipation * Math.PI) * 13;
      } else if (active.type === 'drop') {
        state.y = active.fromY + Math.sin(anticipation * Math.PI * 5) * 1.8;
      } else {
        state.y = active.fromY - Math.sin(anticipation * Math.PI) * 5;
      }
      return true;
    }

    if (!active.burstDone) {
      active.burstDone = true;
      root.dataset.cinematicPhase = 'motion';
      morphJourneyParticleLanguage(active, now);
      emitJourneyPaperTear(active, now);
      triggerParticleFlash(active.type === 'launch' ? 960 : 680);
      triggerScreenShake(active.type === 'launch' ? 900 : active.type === 'drop' ? 700 : 520);
      if (active.type === 'launch') {
        animationEffects.emit('journey-launch-impact');
      } else if (active.type === 'drop') {
        animationEffects.emit('journey-moss-drop-splash');
      }
    }

    const motionDuration = Math.max(1, active.durationMs - active.holdMs);
    const progress = clamp((elapsed - active.holdMs) / motionDuration, 0, 1);
    const travel = smooth(progress);
    state.x = active.fromX + (active.toX - active.fromX) * travel;

    if (active.type === 'launch') {
      const overshoot = active.launchOvershoot ?? 92;
      if (progress < 0.76) {
        const rise = 1 - Math.pow(1 - progress / 0.76, 3);
        state.y = active.fromY + (active.toY - overshoot - active.fromY) * rise;
      } else {
        const settle = smooth((progress - 0.76) / 0.24);
        state.y = active.toY - overshoot + overshoot * settle;
      }
    } else {
      const fall = active.type === 'drop'
        ? Math.pow(progress, 2.7)
        : Math.pow(progress, 2.15);
      state.y = active.fromY + (active.toY - active.fromY) * fall;
    }

    if (progress < 1) {
      return true;
    }

    state.x = active.toX;
    state.y = active.toY;
    state.vx = 0;
    state.direction = active.direction;
    if (active.direction > 0) {
      journeyTransition.completed.add(active.id);
    } else {
      journeyTransition.completed.delete(active.id);
    }
    beginJourneyLanding(active.type, now);
    journeyTransition.active = null;
    delete root.dataset.cinematic;
    delete root.dataset.cinematicDirection;
    delete root.dataset.cinematicPhase;
    delete root.dataset.particleShapeMorph;
    syncParticleLanguageDataset(journey.stageAt(state.x));
    return false;
  }

  function transitionCameraSubjectY(now) {
    const active = journeyTransition.active;
    if (!active) {
      return state.y;
    }
    const elapsed = now - active.startedAt;
    if (elapsed <= active.holdMs) {
      return active.fromY;
    }
    const duration = Math.max(1, active.durationMs - active.holdMs);
    const progress = clamp((elapsed - active.holdMs) / duration, 0, 1);
    const delay = active.cameraDelay ?? (active.type === 'launch' ? 0.2 : 0.27);
    const follow = smooth(clamp((progress - delay) / (1 - delay), 0, 1));
    return active.fromY + (active.toY - active.fromY) * follow;
  }

  function landingCameraOffset(now) {
    const active = journeyLanding.active;
    if (!active) {
      return 0;
    }
    const progress = clamp((now - active.startedAt) / Math.min(760, active.durationMs), 0, 1);
    const impact = Math.sin(progress * Math.PI) * (1 - progress * 0.38);
    return (active.type === 'launch' ? -9 : 16) * impact;
  }

  function emitJourneyArrival(stage) {
    const origin = worldToScreen(state.x, state.y - 76);
    const palettes = {
      taupe: [[79, 229, 219], [238, 93, 176], [231, 205, 81]],
      islog: [[76, 145, 162], [181, 104, 92], [82, 88, 88]],
      ojicra: [[188, 194, 104], [137, 91, 157], [215, 218, 142]],
      monoomoi: [[190, 116, 123], [105, 154, 128], [193, 151, 83]],
      monoerabi: [[79, 151, 171], [191, 145, 75], [176, 99, 93]],
    };
    const palette = palettes[stage];
    if (!palette) {
      return;
    }
    const count = stage === 'ojicra' ? 84 : stage === 'monoomoi' ? 62 : 48;
    emitParticles(count, (index) => {
      const [r, g, b] = palette[index % palette.length];
      const angle = rand(0, Math.PI * 2);
      const speed = stage === 'monoomoi' ? rand(0.025, 0.13) : rand(0.05, 0.24);
      return {
        x: origin.x + rand(-20, 20),
        y: origin.y + rand(-16, 16),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (stage === 'monoomoi' ? 0.06 : 0),
        ay: stage === 'monoomoi' ? -0.000015 : 0,
        size: rand(1.2, stage === 'ojicra' ? 4.8 : 3.8) * state.scale,
        life: rand(760, 1450),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.28, 0.62).toFixed(2)})`,
        type: index % 9 === 0 ? 'ring' : index % 7 === 0 ? 'spark' : 'bit',
        spin: rand(-0.005, 0.005),
      };
    });
    triggerParticleFlash(stage === 'ojicra' ? 760 : 520);
    emitParticles(stage === 'ojicra' ? 3 : 2, (index) => {
      const [r, g, b] = palette[index % palette.length];
      return {
        x: origin.x,
        y: origin.y + 18 * state.scale,
        vx: 0,
        vy: 0,
        size: (18 + index * 17) * state.scale,
        life: 900 + index * 180,
        color: `rgba(${r}, ${g}, ${b}, ${index === 0 ? 0.38 : 0.24})`,
        type: 'ring',
        shapeLanguage: false,
      };
    });
  }

  function addFormationLine(points, from, to, count, tone = null) {
    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      const point = [
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
      ];
      if (tone !== null) {
        point.push(tone);
      }
      points.push(point);
    }
  }

  function sampleMomentText(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 110;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return [];
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.font = '600 62px "Avenir Next", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const points = [];
    for (let y = 8; y < canvas.height - 8; y += 4) {
      for (let x = 8; x < canvas.width - 8; x += 4) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 96) {
          points.push([x - canvas.width / 2, y - canvas.height / 2]);
        }
      }
    }
    return points;
  }

  function journeyMomentShape(type) {
    const points = [];
    if (type === 'signal') {
      for (let i = 0; i < 112; i += 1) {
        const t = (i / 112) * Math.PI * 2;
        points.push([Math.sin(t) * 148, Math.sin(t * 2) * 54]);
      }
      [[-118, -42], [0, 0], [118, 42]].forEach(([x, y]) => {
        for (let i = 0; i < 18; i += 1) {
          const t = (i / 18) * Math.PI * 2;
          points.push([x + Math.cos(t) * 13, y + Math.sin(t) * 13]);
        }
      });
    } else if (type === 'memory') {
      const left = -168;
      const right = 168;
      const top = -88;
      const bottom = 88;
      const corner = 48;
      addFormationLine(points, [left, top + corner], [left, top], 10);
      addFormationLine(points, [left, top], [left + corner, top], 10);
      addFormationLine(points, [right - corner, top], [right, top], 10);
      addFormationLine(points, [right, top], [right, top + corner], 10);
      addFormationLine(points, [right, bottom - corner], [right, bottom], 10);
      addFormationLine(points, [right, bottom], [right - corner, bottom], 10);
      addFormationLine(points, [left + corner, bottom], [left, bottom], 10);
      addFormationLine(points, [left, bottom], [left, bottom - corner], 10);
      for (let i = 0; i < 54; i += 1) {
        const t = (i / 54) * Math.PI * 2;
        points.push([Math.cos(t) * 58, Math.sin(t) * 58]);
      }
    } else if (type === 'creeper') {
      return journey.creeperFacePoints();
    } else if (type === 'gift') {
      for (let i = 0; i < 132; i += 1) {
        const t = (i / 132) * Math.PI * 2;
        const x = 12 * Math.sin(t) ** 3;
        const y = -(10 * Math.cos(t) - 4 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        points.push([x * 11, y * 9]);
      }
      addFormationLine(points, [-54, 42], [54, 42], 24);
    } else if (type === 'scan') {
      [52, 106].forEach((radius) => {
        for (let i = 0; i < 64; i += 1) {
          const t = (i / 64) * Math.PI * 2;
          points.push([Math.cos(t) * radius, Math.sin(t) * radius]);
        }
      });
      addFormationLine(points, [-156, 0], [156, 0], 42);
      addFormationLine(points, [0, -126], [0, 126], 34);
    } else if (type === 'finale') {
      return sampleMomentText('ishikawa.co');
    }
    return points;
  }

  function journeyMomentPalette(type) {
    const palettes = {
      signal: [[79, 229, 219], [238, 93, 176], [231, 205, 81], [128, 122, 255]],
      memory: [[76, 145, 162], [181, 104, 92], [82, 88, 88]],
      creeper: [[55, 161, 67], [157, 220, 100], [35, 117, 49]],
      gift: [[190, 116, 123], [105, 154, 128], [193, 151, 83]],
      scan: [[79, 151, 171], [191, 145, 75], [176, 99, 93]],
      finale: [[80, 164, 180], [230, 112, 174], [117, 184, 143], [207, 166, 84], [104, 106, 116]],
    };
    return palettes[type] || palettes.finale;
  }

  function emitJourneyMoment(definition) {
    const points = journeyMomentShape(definition.type);
    const palette = journeyMomentPalette(definition.type);
    const centerX = window.innerWidth * (definition.type === 'creeper' ? 0.68 : 0.54);
    const centerY = window.innerHeight * (definition.type === 'finale' ? 0.34 : definition.type === 'creeper' ? 0.32 : 0.4);
    const scale = definition.type === 'finale'
      ? clamp(window.innerWidth / 1500, 0.82, 1.08)
      : definition.type === 'creeper'
        ? clamp(window.innerHeight / 840, 0.88, 1.12)
      : clamp(window.innerHeight / 900, 0.82, 1.08);
    const maxPoints = definition.type === 'finale' ? 320 : definition.type === 'creeper' ? 240 : 180;
    const stride = Math.max(1, Math.ceil(points.length / maxPoints));
    const formationPoints = points.filter((_, index) => index % stride === 0);
    emitParticles(formationPoints.length, (index) => {
      const [px, py, tone] = formationPoints[index];
      const [r, g, b] = palette[Number.isInteger(tone) ? tone % palette.length : index % palette.length];
      const angle = rand(0, Math.PI * 2);
      const radius = rand(180, Math.min(window.innerWidth * 0.48, 620));
      const isPixelFirework = definition.type === 'creeper';
      return {
        x: isPixelFirework ? centerX + rand(-12, 12) : centerX + Math.cos(angle) * radius,
        y: isPixelFirework ? window.innerHeight + rand(12, 52) : centerY + Math.sin(angle) * radius * 0.62,
        vx: isPixelFirework ? rand(-0.025, 0.025) : 0,
        vy: isPixelFirework ? rand(-0.92, -0.64) : 0,
        targetX: centerX + px * scale,
        targetY: centerY + py * scale,
        size: definition.type === 'finale' ? rand(1.9, 3.5) : isPixelFirework ? rand(2.8, 5.2) : rand(1.8, 4),
        life: definition.durationMs + rand(isPixelFirework ? 1180 : 280, isPixelFirework ? 1820 : 680),
        color: `rgba(${r}, ${g}, ${b}, ${rand(isPixelFirework ? 0.68 : 0.48, isPixelFirework ? 0.94 : 0.78).toFixed(2)})`,
        type: index % (isPixelFirework ? 8 : 17) === 0 ? 'spark' : 'bit',
        spin: rand(-0.002, 0.002),
        targetAttract: isPixelFirework ? 0.00042 : 0.00016,
        targetDamping: isPixelFirework ? 0.67 : 0.8,
      };
    });
    if (definition.type === 'creeper') {
      emitParticles(44, (index) => ({
        x: centerX + rand(-7, 7),
        y: window.innerHeight + rand(12, 80),
        vx: rand(-0.035, 0.035),
        vy: rand(-0.92, -0.58),
        size: rand(1.2, 3.2),
        life: rand(720, 1280),
        color: index % 3 === 0 ? 'rgba(157,220,100,0.76)' : 'rgba(55,161,67,0.68)',
        type: index % 5 === 0 ? 'spark' : 'bit',
      }));
    }
    triggerParticleFlash(definition.type === 'finale' ? 1100 : definition.type === 'creeper' ? 920 : 620);
    if (definition.type === 'memory' || definition.type === 'creeper' || definition.type === 'finale') {
      triggerScreenShake(definition.type === 'finale' ? 560 : definition.type === 'creeper' ? 260 : 240);
    }
  }

  function beginJourneyMoment(definition, now) {
    if (
      !definition
      || journeyMoment.active
      || journeyTransition.active
      || journeyLanding.active
      || journeyAwakening.orchestra
      || journeySecrets.active
      || journeySecrets.observatory
      || journeySecrets.ascension
      || journeyMoment.completed.has(definition.id)
    ) {
      return false;
    }
    closeJourneyDiscovery();
    journeyAwakening.starDash = null;
    delete root.dataset.starDash;
    journeyMoment.active = { ...definition, startedAt: now };
    journeyMoment.completed.add(definition.id);
    root.dataset.journeyMoment = definition.type;
    emitJourneyMoment(definition);
    beginJourneyResonance(definition, now);
    return true;
  }

  function maybeBeginJourneyMoment(input, now) {
    if (
      !isJourneyMode
      || input <= 0
      || journeyTransition.active
      || journeyLanding.active
      || journeyMoment.active
      || journeyAwakening.orchestra
      || journeySecrets.active
      || journeySecrets.observatory
      || journeySecrets.ascension
      || !journey.moments
    ) {
      return false;
    }
    const definition = journey.moments.find((item) => (
      !journeyMoment.completed.has(item.id)
      && state.x >= item.triggerX
      && state.x <= item.triggerX + 100
      && journey.stageAt(state.x) === item.stage
    ));
    return beginJourneyMoment(definition, now);
  }

  function updateJourneyMoment(now) {
    const active = journeyMoment.active;
    if (!active) {
      return { progress: 0, cameraX: 0, cameraY: 0, characterY: 0, angle: 0 };
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    const pulse = Math.sin(progress * Math.PI);
    let cameraX = 0;
    let cameraY = -10 * pulse;
    let characterY = 0;
    let angle = 0;
    if (active.type === 'signal') {
      cameraX = Math.sin(progress * Math.PI * 4) * 8 * pulse;
    } else if (active.type === 'memory') {
      cameraY = -18 * pulse;
    } else if (active.type === 'creeper') {
      cameraY = -18 * pulse;
      characterY = -10 * pulse;
      angle = Math.sin(progress * Math.PI * 2) * 1.2 * pulse;
    } else if (active.type === 'gift') {
      cameraY = -14 * pulse;
      characterY = -8 * pulse;
    } else if (active.type === 'scan') {
      cameraX = 16 * pulse;
    } else if (active.type === 'finale') {
      cameraY = -30 * pulse;
      characterY = -10 * pulse;
    }
    if (progress >= 1) {
      collectJourneyMemory(active.stage);
      journeyMoment.completedAt.set(active.id, now);
      journeyMoment.completedX.set(active.id, state.x);
      if (active.type === 'finale') {
        journeyMemory.finalized = true;
        journeyMemory.finalizedAt = now;
        root.dataset.journeyFinalized = 'true';
        journeyMemory.completionBurstDone = false;
        syncJourneyMemoryCompletion();
        audio?.note('hub', { duration: 0.86, gain: 0.03 });
        beginWorldOrchestra(now);
      }
      journeyMoment.active = null;
      delete root.dataset.journeyMoment;
    }
    return { progress, cameraX, cameraY, characterY, angle };
  }

  function journeyMemoryColor(key) {
    const colors = {
      'ai-ml': [40, 40, 40],
      'security': [70, 70, 70],
      'fullstack': [100, 100, 100],
      'iot-embedded': [130, 130, 130],
      'open-source': [50, 50, 50],
      'hackathons': [80, 80, 80],
      moss: [40, 40, 40],
      taupe: [70, 70, 70],
      islog: [100, 100, 100],
      ojicra: [130, 130, 130],
      monoomoi: [50, 50, 50],
      monoerabi: [80, 80, 80],
      hub: [60, 60, 60],
    };
    return colors[key] || colors.hub;
  }

  function memoryTrailColorForStage(stage, sample = 0, reverse = false, dark = false) {
    const world = runtime.particleWorldForStage(stage || 'moss');
    const normalized = clamp(sample, 0, 0.999999);
    const bucket = normalized < 0.68 ? 0 : normalized < 0.91 ? 1 : 2;
    const cacheKey = `${world}:${bucket}:${reverse ? 1 : 0}:${dark ? 1 : 0}`;
    const cached = memoryTrailColorCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const { color } = runtime.memoryTrailPalette(stage, normalized, reverse);
    const brightness = dark ? 0.72 : reverse ? 1 : 0.9;
    const rgb = color.map((channel) => Math.max(36, Math.min(244, Math.round(channel * brightness))));
    const value = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    memoryTrailColorCache.set(cacheKey, value);
    return value;
  }

  function memoryTrailColorAt(worldX, reverse = false, dark = false) {
    const stage = isJourneyMode ? journey.stageAt(worldX) : 'moss';
    return memoryTrailColorForStage(stage, groundNoise(worldX, 6), reverse, dark);
  }

  function syncWorldCursorTone(stage = state.journeyStage || 'moss') {
    const node = worldCursorState.node;
    if (!node || worldCursorState.stage === stage) {
      return;
    }
    const { world, color } = runtime.memoryTrailPalette(stage, 0.18, false);
    worldCursorState.stage = stage;
    node.dataset.world = world;
    node.style.setProperty('--world-cursor-rgb', color.join(' '));
  }

  function setupWorldCursor() {
    if (!stageNode || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }
    const node = document.createElement('div');
    node.className = 'world-cursor';
    node.dataset.worldCursor = '';
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = '<span></span><i></i><i></i><i></i><i></i><i></i><i></i>';
    root.appendChild(node);
    worldCursorState.node = node;
    root.dataset.worldCursor = 'active';
    syncWorldCursorTone(root.dataset.stage || 'moss');

    const commitPointer = () => {
      worldCursorState.frameRequest = 0;
      node.style.transform = `translate3d(${worldCursorState.x}px, ${worldCursorState.y}px, 0)`;
      node.dataset.interactive = worldCursorState.interactive ? 'true' : 'false';
      root.dataset.cursorVisible = 'true';
    };
    const movePointer = (event) => {
      worldCursorState.x = event.clientX;
      worldCursorState.y = event.clientY;
      worldCursorState.interactive = runtime.isInteractiveTarget(event.target);
      if (!worldCursorState.frameRequest) {
        worldCursorState.frameRequest = requestAnimationFrame(commitPointer);
      }
    };
    const hidePointer = () => {
      delete root.dataset.cursorVisible;
      delete node.dataset.pressed;
    };
    stageNode.addEventListener('pointermove', movePointer, { passive: true });
    stageNode.addEventListener('pointerenter', movePointer, { passive: true });
    stageNode.addEventListener('pointerleave', hidePointer, { passive: true });
    stageNode.addEventListener('pointerdown', () => {
      node.dataset.pressed = 'true';
    }, { passive: true });
    window.addEventListener('pointerup', () => {
      delete node.dataset.pressed;
    }, { passive: true });
    window.addEventListener('pointercancel', hidePointer, { passive: true });
  }

  function recordJourneyDiscovery(key) {
    if (key) {
      journeyDiscovery.found.add(key);
    }
  }

  function syncJourneyMemoryCompletion() {
    const result = journey.reconcileMemoryCompletion(
      journeyMemory,
      journeyMemory.collected,
      journeyDiscovery.found
    );
    root.dataset.memoryComplete = result.complete ? 'true' : 'partial';
    if (result.complete && journeyMemory.finalized && !journeyKeepsake.readyAt) {
      journeyKeepsake.readyAt = clock.now() + (journeyMoment.active?.type === 'finale' ? 2300 : 500);
    } else if (!result.complete) {
      journeyKeepsake.readyAt = 0;
      journeyKeepsake.available = false;
    }
    return result;
  }

  function journeyConstellationOrder() {
    const order = [];
    const append = (key) => {
      if (key && !order.includes(key)) {
        order.push(key);
      }
    };
    journeyDiscovery.found.forEach(append);
    journeyMemory.collected.forEach(append);
    if (journeyMemory.complete) {
      append('hub');
    }
    return order;
  }

  function livingAtlasJourneySnapshot() {
    const order = journeyConstellationOrder();
    return {
      complete: journeyMemory.complete,
      finalized: journeyMemory.finalized,
      exportable: journeyKeepsake.available,
      order,
      layout: order.length >= 2
        ? journey.buildConstellationLayout(order, { width: 430, height: 320, paddingRatio: 0.13 })
        : null,
    };
  }

  function updateKeepsakeAvailability(now = clock.now()) {
    if (!keepsakeButton || !isJourneyMode) {
      return;
    }
    const available = Boolean(
      journeyMemory.complete
      && journeyMemory.finalized
      && journeyKeepsake.readyAt
      && now >= journeyKeepsake.readyAt
      && !journeyReturn.active
    );
    if (journeyKeepsake.available === available) {
      return;
    }
    journeyKeepsake.available = available;
    keepsakeButton.hidden = !available;
    if (available) {
      root.dataset.keepsake = 'ready';
    } else {
      delete root.dataset.keepsake;
    }
    livingAtlasController?.syncJourneyEnding?.();
  }

  function keepsakeRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drawJourneyKeepsake(order) {
    const layout = journey.buildConstellationLayout(order, { width: 1200, height: 1200 });
    const canvas = document.createElement('canvas');
    canvas.width = layout.width;
    canvas.height = layout.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    const random = keepsakeRandom(layout.seed);
    context.fillStyle = '#fbfaf6';
    context.fillRect(0, 0, layout.width, layout.height);

    for (let index = 0; index < 220; index += 1) {
      const key = layout.keys[index % Math.max(1, layout.keys.length)] || 'hub';
      const [r, g, b] = journeyMemoryColor(key);
      context.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.025 + random() * 0.075).toFixed(3)})`;
      context.beginPath();
      context.arc(random() * layout.width, random() * layout.height, 0.7 + random() * 2.1, 0, Math.PI * 2);
      context.fill();
    }

    context.textAlign = 'center';
    context.fillStyle = 'rgba(44, 48, 44, 0.78)';
    context.font = '500 31px "Hiragino Sans", "Noto Sans JP", sans-serif';
    context.fillText(isEnglish ? 'MY WALK THROUGH ARPIT.CO' : '歩いてめぐった arpit.co', layout.width * 0.5, 88);
    context.fillStyle = 'rgba(44, 48, 44, 0.38)';
    context.font = '18px "Comic Sans MS", "Bradley Hand", "Hiragino Sans", sans-serif';
    context.fillText(isEnglish ? 'A CONSTELLATION FROM THE JOURNEY' : '旅の記憶から生まれた星座', layout.width * 0.5, 126);

    context.lineCap = 'round';
    context.lineJoin = 'round';
    layout.edges.forEach(([fromIndex, toIndex], edgeIndex) => {
      const from = layout.points[fromIndex];
      const to = layout.points[toIndex];
      if (!from || !to) {
        return;
      }
      const [r, g, b] = journeyMemoryColor(to.key);
      const midpointX = (from.x + to.x) * 0.5;
      const midpointY = (from.y + to.y) * 0.5;
      const normalX = -(to.y - from.y);
      const normalY = to.x - from.x;
      const normalLength = Math.max(1, Math.hypot(normalX, normalY));
      const bend = (random() - 0.5) * (34 + edgeIndex * 2);
      const controlX = midpointX + (normalX / normalLength) * bend;
      const controlY = midpointY + (normalY / normalLength) * bend;
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.31)`;
      context.lineWidth = 2.2;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.quadraticCurveTo(controlX, controlY, to.x, to.y);
      context.stroke();
      context.strokeStyle = 'rgba(55, 62, 58, 0.1)';
      context.lineWidth = 0.9;
      context.beginPath();
      context.moveTo(from.x + 2, from.y - 1);
      context.quadraticCurveTo(controlX - 3, controlY + 2, to.x - 1, to.y + 2);
      context.stroke();
    });

    layout.points.forEach((point, index) => {
      const [r, g, b] = journeyMemoryColor(point.key);
      const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.size * 5.4);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.38)`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(point.x, point.y, point.size * 5.4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      context.beginPath();
      context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(point.x, point.y, point.size + 7 + (index % 2) * 3, 0, Math.PI * 2);
      context.stroke();
      const label = areaMap.get(point.key)?.name || (point.key === 'hub' ? 'arpit.co' : point.key);
      context.fillStyle = 'rgba(42, 46, 43, 0.64)';
      context.font = '17px "Comic Sans MS", "Bradley Hand", "Hiragino Sans", sans-serif';
      context.textAlign = point.x > layout.width * 0.58 ? 'right' : 'left';
      context.fillText(
        label,
        point.x + (point.x > layout.width * 0.58 ? -18 : 18),
        point.y - 15
      );
    });

    const dateLabel = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date());
    context.textAlign = 'center';
    context.fillStyle = 'rgba(44, 48, 44, 0.36)';
    context.font = '16px "Hiragino Sans", "Noto Sans JP", sans-serif';
    context.fillText(
      isEnglish
        ? `${dateLabel} / ${layout.keys.length} MEMORIES`
        : `${dateLabel} / ${layout.keys.length}つの記憶`,
      layout.width * 0.5,
      layout.height - 74
    );
    return { canvas, layout };
  }

  function keepsakeFileName() {
    const date = new Date();
    const stamp = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('');
    return `arpit-journey-constellation-${stamp}.png`;
  }

  async function exportJourneyKeepsake(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!journeyKeepsake.available || journeyKeepsake.exporting) {
      return;
    }
    const audioReady = audio?.unlock();
    journeyKeepsake.exporting = true;
    [keepsakeButton, atlasKeepsakeButton].forEach((button) => {
      if (button) {
        button.disabled = true;
      }
    });
    try {
      const rendered = drawJourneyKeepsake(journeyConstellationOrder());
      if (!rendered) {
        throw new Error('Canvas is unavailable.');
      }
      const blob = await new Promise((resolve) => rendered.canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('Image encoding failed.');
      }
      const fileName = keepsakeFileName();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      journeyKeepsake.exportedCount += 1;
      journeyKeepsake.lastFileName = fileName;
      await audioReady;
      audio?.note('hub', { duration: 0.74, gain: 0.025 });
      announceStatus(isEnglish ? 'Your journey constellation is ready.' : '旅の星座を画像にしました。');
    } catch (error) {
      console.error('Failed to export the journey constellation.', error);
      announceStatus(isEnglish ? 'The constellation image could not be created.' : '星座の画像化に失敗しました。');
    } finally {
      journeyKeepsake.exporting = false;
      [keepsakeButton, atlasKeepsakeButton].forEach((button) => {
        if (button) {
          button.disabled = false;
        }
      });
    }
  }

  function quadraticPoint(start, control, end, progress) {
    const inverse = 1 - progress;
    return {
      x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x,
      y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y,
    };
  }

  function journeyEchoTarget(stage) {
    const targets = {
      taupe: [0.72, 0.42],
      islog: [0.7, 0.3],
      ojicra: [0.74, 0.22],
      monoomoi: [0.72, 0.56],
      monoerabi: [0.75, 0.46],
      hub: [0.54, 0.34],
    };
    const [x, y] = targets[stage] || targets.hub;
    return { x: window.innerWidth * x, y: window.innerHeight * y };
  }

  function beginJourneyEcho(stage, now = clock.now()) {
    if (!isJourneyMode || journeyEcho.completed.has(stage) || !journeyMemory.collected.size) {
      return;
    }
    const source = Array.from(journeyMemory.collected)
      .filter((key) => key !== stage && key !== 'hub')
      .at(-1);
    if (!source) {
      return;
    }
    const keys = Array.from(journeyMemory.collected);
    const sourceIndex = Math.max(0, keys.indexOf(source));
    const sourcePhase = (sourceIndex / Math.max(1, keys.length)) * Math.PI * 2;
    const origin = worldToScreen(state.x, state.y - 82);
    const start = {
      x: origin.x - state.direction * (52 + sourceIndex * 13) * state.scale,
      y: origin.y - (34 + Math.sin(now * 0.0014 + sourcePhase) * 15) * state.scale,
    };
    const end = journeyEchoTarget(stage);
    const control = {
      x: (start.x + end.x) * 0.5,
      y: Math.min(start.y, end.y) - window.innerHeight * 0.2,
    };
    journeyEcho.active = {
      stage,
      source,
      startedAt: now,
      durationMs: stage === 'hub' ? 1900 : 1550,
      start,
      control,
      end,
    };
    journeyEcho.completed.add(stage);
    root.dataset.journeyEcho = stage;
    const [r, g, b] = journeyMemoryColor(source);
    emitParticles(24, (index) => {
      const angle = (index / 24) * Math.PI * 2;
      return {
        x: origin.x + Math.cos(angle) * rand(10, 34),
        y: origin.y + Math.sin(angle) * rand(8, 26),
        vx: Math.cos(angle) * rand(0.02, 0.09),
        vy: Math.sin(angle) * rand(0.02, 0.08) - 0.03,
        size: rand(1.2, 3.4),
        life: rand(700, 1200),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.34, 0.66).toFixed(2)})`,
        type: index % 7 === 0 ? 'ring' : 'spark',
      };
    });
  }

  function canReplayJourneyMemory(now = clock.now()) {
    if (
      !journeyMemory.finalized
      || journeySecrets.observatoryReadyAt > 0
      || journeySecrets.observatory
      || journeySecrets.ascensionReadyAt > 0
      || journeySecrets.ascension
    ) {
      return false;
    }
    const delay = journeyMemory.complete ? 4400 : 1600;
    return now - journeyMemory.finalizedAt >= delay;
  }

  function replayJourneyMemory() {
    if (
      !canReplayJourneyMemory()
      || journeyMemory.replayStartedAt
      || journeyMemory.portalReady
      || journeyMoment.active
      || journeyTransition.active
      || journeyAwakening.orchestra
      || journeySecrets.observatory
      || journeySecrets.ascension
      || journeyReturn.active
    ) {
      return false;
    }
    journeyMemory.replayStartedAt = clock.now();
    journeyMemory.replayCount += 1;
    root.dataset.memoryReplay = 'true';
    const keys = Array.from(journeyMemory.collected);
    const origin = { x: window.innerWidth * 0.79, y: window.innerHeight * 0.3 };
    emitParticles(keys.length * 14, (index) => {
      const key = keys[index % keys.length];
      const phase = (index / Math.max(1, keys.length * 14)) * Math.PI * 5;
      const [r, g, b] = journeyMemoryColor(key);
      return {
        x: origin.x + rand(-18, 18),
        y: origin.y + rand(-14, 14),
        targetX: window.innerWidth * 0.52 + Math.cos(phase) * rand(110, 420),
        targetY: window.innerHeight * 0.46 + Math.sin(phase) * rand(70, 250),
        targetAttract: 0.00012,
        targetDamping: 0.82,
        size: rand(1.1, 3.6),
        life: rand(1500, 2400),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.28, 0.66).toFixed(2)})`,
        type: index % 11 === 0 ? 'ring' : 'bit',
      };
    });
    triggerParticleFlash(920);
    triggerScreenShake(260);
    return true;
  }

  function updateJourneyMotion(input, now, dt) {
    if (!isJourneyMode) {
      return;
    }
    const eligible = (
      state.started
      && input !== 0
      && !journeyTransition.active
      && !journeyMoment.active
      && !journeyReturn.active
      && !journeyAwakening.orchestra
      && !journeySecrets.active
      && !journeySecrets.observatory
      && !journeySecrets.ascension
      && !journeyDiscovery.areaKey
    );
    if (eligible) {
      if (journeyMotion.heldDirection !== input) {
        journeyMotion.heldDirection = input;
        journeyMotion.heldSince = now;
        journeyMotion.charge = 0;
      }
      const target = smooth(clamp((now - journeyMotion.heldSince - 520) / 1500, 0, 1));
      journeyMotion.charge += (target - journeyMotion.charge) * Math.min(1, dt * 0.012);
    } else {
      journeyMotion.charge += (0 - journeyMotion.charge) * Math.min(1, dt * 0.008);
      if (journeyMotion.charge < 0.015) {
        journeyMotion.charge = 0;
        journeyMotion.heldDirection = 0;
        journeyMotion.heldSince = 0;
      }
    }
    const rewinding = journeyMotion.heldDirection < 0 && journeyMotion.charge > 0.08;
    const timeDirection = rewinding ? -(0.3 + journeyMotion.charge * 0.85) : 1;
    journeyMotion.visualTime += dt * 0.001 * timeDirection;
    if (journeyMotion.charge > 0.08) {
      root.dataset.timeFlow = rewinding ? 'rewind' : 'forward';
    } else {
      delete root.dataset.timeFlow;
    }
    beginConstellationDash(now);
  }

  function drawJourneyTransitionGate(now, characterScreenX, characterScreenY) {
    const active = journeyTransition.active;
    if (!particleCtx || !active) {
      return;
    }
    const elapsed = now - active.startedAt;
    const anticipation = smooth(clamp(elapsed / active.holdMs, 0, 1));
    const motionFade = elapsed <= active.holdMs
      ? 1
      : 1 - smooth(clamp((elapsed - active.holdMs) / 520, 0, 1));
    const strength = anticipation * motionFade;
    if (strength <= 0.01) {
      return;
    }
    const keys = Array.from(journeyMemory.collected);
    const palette = keys.length ? keys : ['hub'];
    let centerX = characterScreenX;
    let centerY = characterScreenY;
    let radiusX = 42 + strength * 44;
    let radiusY = 12 + strength * 10;
    if (active.type === 'launch') {
      centerY -= 96;
      radiusX = 28 + strength * 28;
      radiusY = 68 + strength * 52;
    } else if (active.type === 'return-drop') {
      centerY -= 154;
      radiusX = 54 + strength * 46;
      radiusY = 20 + strength * 18;
    }

    particleCtx.save();
    particleCtx.lineWidth = 1;
    for (let ring = 0; ring < 3; ring += 1) {
      const key = palette[ring % palette.length];
      const [r, g, b] = journeyMemoryColor(key);
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(strength * (0.12 + ring * 0.05)).toFixed(3)})`;
      particleCtx.setLineDash([2 + ring, 7 + ring * 3]);
      particleCtx.lineDashOffset = (active.type === 'launch' ? -1 : 1) * now * 0.018 * (ring + 1);
      particleCtx.beginPath();
      particleCtx.ellipse(
        centerX,
        centerY,
        radiusX + ring * 15,
        radiusY + ring * 8,
        active.type === 'launch' ? 0.12 * Math.sin(now * 0.002) : 0,
        0,
        Math.PI * 2
      );
      particleCtx.stroke();
    }
    particleCtx.setLineDash([]);
    const pointCount = Math.max(7, keys.length || 7);
    for (let index = 0; index < pointCount; index += 1) {
      const key = palette[index % palette.length];
      const [r, g, b] = journeyMemoryColor(key);
      const phase = (index / pointCount) * Math.PI * 2 + now * 0.0012;
      const x = centerX + Math.cos(phase) * radiusX;
      const y = centerY + Math.sin(phase) * radiusY;
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(strength * 0.72).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(x, y, 1.5 + strength * 2.3, 0, Math.PI * 2);
      particleCtx.fill();
    }
    if (active.type === 'drop') {
      particleCtx.strokeStyle = `rgba(80, 92, 87, ${(strength * 0.24).toFixed(3)})`;
      for (let index = 0; index < 7; index += 1) {
        const angle = (index / 7) * Math.PI * 2;
        particleCtx.beginPath();
        particleCtx.moveTo(
          centerX + Math.cos(angle) * radiusX * 0.45,
          centerY + Math.sin(angle) * radiusY * 0.45
        );
        particleCtx.lineTo(
          centerX + Math.cos(angle) * radiusX * 1.35,
          centerY + Math.sin(angle) * radiusY * 1.8
        );
        particleCtx.stroke();
      }
    }
    particleCtx.restore();
  }

  function beginJourneyLanding(type, now = clock.now()) {
    journeyLanding.active = {
      type,
      startedAt: now,
      durationMs: 1100,
      poseUntil: now + 760,
      x: state.x,
      y: state.y,
    };
    root.dataset.journeyLanding = type;
    const origin = worldToScreen(state.x, state.y);
    const keys = Array.from(journeyMemory.collected);
    const palette = keys.length ? keys : ['hub'];
    emitParticles(58, (index) => {
      const key = palette[index % palette.length];
      const [r, g, b] = journeyMemoryColor(key);
      const angle = (index / 58) * Math.PI * 2;
      const horizontal = type === 'launch' ? 0.55 : 1;
      return {
        x: origin.x + rand(-8, 8),
        y: origin.y + rand(-4, 4),
        vx: Math.cos(angle) * rand(0.05, 0.26) * horizontal,
        vy: Math.sin(angle) * rand(0.025, 0.14) - (type === 'launch' ? 0.035 : 0),
        size: rand(1, 3.2),
        life: rand(760, 1400),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.26, 0.6).toFixed(2)})`,
        type: index % 12 === 0 ? 'ring' : 'spark',
      };
    });
  }

  function journeyLandingBlocksTravel(now = clock.now()) {
    const active = journeyLanding.active;
    if (!active) {
      return false;
    }
    const lockDuration = ['drop', 'return-drop', 'launch'].includes(active.type)
      ? active.durationMs
      : Math.min(760, active.durationMs);
    return now < active.startedAt + lockDuration;
  }

  function drawJourneyLanding(now) {
    const active = journeyLanding.active;
    if (!particleCtx || !active) {
      return;
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    if (progress >= 1) {
      journeyLanding.active = null;
      delete root.dataset.journeyLanding;
      return;
    }
    const bloom = Math.sin(progress * Math.PI);
    const center = worldToScreen(active.x, active.y + 1);
    const keys = Array.from(journeyMemory.collected);
    const palette = keys.length ? keys : ['hub'];
    particleCtx.save();
    particleCtx.lineWidth = 1.35;
    particleCtx.lineCap = 'round';
    const points = active.type === 'return-drop' ? 10 : active.type === 'launch' ? 6 : 8;
    const outer = 38 + smooth(progress) * 112;
    particleCtx.beginPath();
    for (let index = 0; index <= points; index += 1) {
      const phase = (index / points) * Math.PI * 2 - Math.PI / 2;
      const alternating = active.type === 'return-drop' && index % 2 ? 0.48 : 1;
      const radiusX = outer * alternating;
      const radiusY = outer * (active.type === 'launch' ? 0.42 : 0.28) * alternating;
      const x = center.x + Math.cos(phase) * radiusX;
      const y = center.y + Math.sin(phase) * radiusY;
      if (index === 0) particleCtx.moveTo(x, y);
      else particleCtx.lineTo(x, y);
    }
    particleCtx.closePath();
    const [strokeR, strokeG, strokeB] = journeyMemoryColor(palette[0]);
    particleCtx.strokeStyle = `rgba(${strokeR}, ${strokeG}, ${strokeB}, ${(bloom * 0.38).toFixed(3)})`;
    particleCtx.stroke();
    for (let index = 0; index < points; index += 1) {
      const key = palette[index % palette.length];
      const [r, g, b] = journeyMemoryColor(key);
      const phase = (index / points) * Math.PI * 2 - Math.PI / 2;
      const x = center.x + Math.cos(phase) * outer;
      const y = center.y + Math.sin(phase) * outer * (active.type === 'launch' ? 0.42 : 0.28);
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(bloom * 0.62).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(x, y, 1.4 + bloom * 2.4, 0, Math.PI * 2);
      particleCtx.fill();
    }
    particleCtx.restore();
  }

  function canEnterMemoryPortal(now = clock.now()) {
    return journeyMemory.portalReady
      && journeyMemory.complete
      && now - journeyMemory.portalReadyAt >= 1200
      && !journeyMemory.replayStartedAt
      && journeySecrets.observatoryReadyAt === 0
      && journeySecrets.ascensionReadyAt === 0
      && !journeyAwakening.orchestra
      && !journeySecrets.active
      && !journeySecrets.observatory
      && !journeySecrets.ascension
      && !journeyReturn.active;
  }

  function beginMemoryReturn(now = clock.now()) {
    if (!canEnterMemoryPortal(now)) {
      return false;
    }
    closeJourneyDiscovery();
    journeyDiscovery.returningKey = '';
    journeyAwakening.dawn = null;
    journeyAwakening.resonance = null;
    journeyAwakening.starDash = null;
    journeyAwakening.orchestra = null;
    journeySecrets.active = null;
    journeySecrets.nearbyId = '';
    journeySecrets.captureSince = 0;
    journeySecrets.observatory = null;
    journeySecrets.observatoryReadyAt = 0;
    journeySecrets.ascension = null;
    journeySecrets.ascensionReadyAt = 0;
    delete root.dataset.memoryDawn;
    delete root.dataset.memoryResonance;
    delete root.dataset.starDash;
    delete root.dataset.worldOrchestra;
    delete root.dataset.worldOrchestraPhase;
    delete root.dataset.echoGuide;
    delete root.dataset.worldFold;
    delete root.dataset.worldFoldPhase;
    delete root.dataset.secretWell;
    if (!journeySecrets.ascensionSeen) {
      delete root.dataset.secretAscension;
    }
    if (!journeySecrets.observatorySeen) {
      delete root.dataset.secretObservatory;
    }
    journeyReturn.active = {
      startedAt: now,
      durationMs: 4200,
      fromX: state.x,
      toX: 920,
    };
    journeyMemory.replayStartedAt = 0;
    state.vx = 0;
    state.isMoving = false;
    root.dataset.memoryReturn = 'true';
    root.dataset.memoryReturnPhase = 'departure';
    delete root.dataset.memoryReplay;
    audio?.arpeggio(journeyConstellationOrder(), { reverse: true });
    triggerParticleFlash(900);
    triggerScreenShake(320);
    return true;
  }

  function updateMemoryReturn(now) {
    const active = journeyReturn.active;
    if (!active) {
      return false;
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    if (progress < 0.18) {
      root.dataset.memoryReturnPhase = 'departure';
      state.x = active.fromX;
    } else if (progress < 0.84) {
      root.dataset.memoryReturnPhase = 'rewind';
      const travel = smooth((progress - 0.18) / 0.66);
      state.x = active.fromX + (active.toX - active.fromX) * travel;
    } else {
      root.dataset.memoryReturnPhase = 'arrival';
      state.x = active.toX;
    }
    state.y = terrainY(state.x);
    state.vx = 0;
    state.direction = progress < 0.9 ? -1 : 1;
    state.cameraX = Math.max(0, Math.min(
      WORLD_LENGTH - state.visibleW,
      state.x - state.visibleW * 0.42
    ));
    state.cameraY = Math.max(-520, Math.min(520, state.y - 710));

    if (progress < 1) {
      return true;
    }

    journeyReturn.active = null;
    journeyMemory.finalized = false;
    journeyMemory.finalizedAt = 0;
    journeyMemory.complete = false;
    journeyMemory.completionBurstDone = false;
    journeyMemory.replayStartedAt = 0;
    journeyMemory.replayCount = 0;
    journeyMemory.portalReady = false;
    journeyMemory.portalReadyAt = 0;
    journeyKeepsake.readyAt = 0;
    journeyKeepsake.available = false;
    if (keepsakeButton) {
      keepsakeButton.hidden = true;
    }
    delete root.dataset.keepsake;
    journeyMemory.returnCount += 1;
    journeyMemory.idleSince = 0;
    journeyMemory.idleBloomed = false;
    journeyTransition.active = null;
    delete root.dataset.particleShapeMorph;
    journeyTransition.completed.clear();
    journeyMoment.active = null;
    journeyMoment.completed.clear();
    journeyMoment.completedAt.clear();
    journeyMoment.completedX.clear();
    journeyEcho.active = null;
    journeyEcho.completed.clear();
    journeyLanding.active = null;
    journeyMotion.heldDirection = 0;
    journeyMotion.heldSince = 0;
    journeyMotion.charge = 0;
    journeyDiscovery.returningKey = '';
    journeyDiscovery.closedAtTime = 0;
    state.x = active.toX;
    state.y = terrainY(state.x);
    state.vx = 0;
    state.direction = 1;
    state.journeyStage = journey.stageAt(state.x);
    state.cameraX = 0;
    state.cameraY = Math.max(-520, Math.min(520, state.y - 710));
    delete root.dataset.memoryReturn;
    delete root.dataset.memoryReturnPhase;
    delete root.dataset.journeyFinalized;
    delete root.dataset.memoryComplete;
    delete root.dataset.memoryPortal;
    delete root.dataset.memoryReplay;
    delete root.dataset.memoryIdle;
    delete root.dataset.journeyEcho;
    delete root.dataset.journeyLanding;
    delete root.dataset.timeFlow;
    beginMemoryDawn(now);
    triggerParticleFlash(1200);
    triggerScreenShake(360);
    return false;
  }

  function drawMemoryReturn(now, characterScreenX, characterScreenY) {
    const active = journeyReturn.active;
    if (!particleCtx || !active) {
      return;
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    const strength = Math.sin(progress * Math.PI);
    const keys = Array.from(journeyMemory.collected);
    const palette = keys.length ? keys : ['hub'];
    particleCtx.save();
    particleCtx.lineCap = 'round';
    for (let index = 0; index < 22; index += 1) {
      const key = palette[index % palette.length];
      const [r, g, b] = journeyMemoryColor(key);
      const travel = (progress * 3.2 + index * 0.071) % 1;
      const x = window.innerWidth * (1 - travel);
      const y = window.innerHeight * (0.08 + (index / 22) * 0.84)
        + Math.sin(now * 0.003 + index) * 13;
      const length = 70 + strength * (150 + (index % 5) * 28);
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.04 + strength * 0.18).toFixed(3)})`;
      particleCtx.lineWidth = 0.8 + strength * 1.2;
      particleCtx.beginPath();
      particleCtx.moveTo(x, y);
      particleCtx.lineTo(x + length, y + Math.sin(index * 1.4) * 5);
      particleCtx.stroke();
    }
    const ringStrength = progress < 0.2
      ? smooth(progress / 0.2)
      : 1 - smooth(clamp((progress - 0.82) / 0.18, 0, 1));
    particleCtx.strokeStyle = `rgba(80, 164, 180, ${(ringStrength * 0.22).toFixed(3)})`;
    particleCtx.lineWidth = 1;
    particleCtx.setLineDash([3, 9]);
    particleCtx.lineDashOffset = -now * 0.02;
    particleCtx.beginPath();
    particleCtx.ellipse(
      characterScreenX,
      characterScreenY - 86,
      52 + strength * 34,
      104 + strength * 72,
      0,
      0,
      Math.PI * 2
    );
    particleCtx.stroke();
    particleCtx.restore();
  }

  function hasAwakenedJourney() {
    return journeyMemory.returnCount > 0 && journeyMemory.collected.size >= 6;
  }

  function memoryWeatherStage(stage) {
    const aliases = {
      brink: 'moss',
      'fall-taupe': 'taupe',
      'rise-islog': 'islog',
      launch: 'ojicra',
      'fall-ground': 'monoomoi',
    };
    return aliases[stage] || stage;
  }

  function beginMemoryDawn(now = clock.now()) {
    if (!hasAwakenedJourney()) {
      return false;
    }
    journeyAwakening.dawn = { startedAt: now, durationMs: 3600 };
    root.dataset.memoryDawn = 'true';
    const keys = Array.from(journeyMemory.collected);
    const originX = window.innerWidth * 0.42;
    const originY = window.innerHeight * 0.55;
    emitParticles(keys.length * 18, (index) => {
      const key = keys[index % keys.length];
      const lane = index % keys.length;
      const [r, g, b] = journeyMemoryColor(key);
      return {
        x: originX + rand(-18, 18),
        y: originY + rand(-24, 24),
        targetX: window.innerWidth * rand(0.72, 1.08),
        targetY: window.innerHeight * (0.16 + lane * 0.1) + rand(-34, 34),
        targetAttract: 0.0001,
        targetDamping: 0.86,
        size: rand(1.1, 3.4),
        life: rand(1700, 3100),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.28, 0.64).toFixed(2)})`,
        type: index % 13 === 0 ? 'ring' : 'spark',
      };
    });
    triggerParticleFlash(1300);
    triggerScreenShake(380);
    return true;
  }

  function beginJourneyResonance(definition, now = clock.now()) {
    if (!hasAwakenedJourney() || !definition || journeyAwakening.orchestra) {
      return false;
    }
    journeyAwakening.resonance = {
      type: definition.type,
      stage: definition.stage,
      startedAt: now,
      durationMs: definition.durationMs + 900,
    };
    root.dataset.memoryResonance = definition.type;
    const keys = Array.from(journeyMemory.collected);
    const origin = worldToScreen(state.x, state.y - 84);
    const center = { x: window.innerWidth * 0.54, y: window.innerHeight * 0.4 };
    emitParticles(keys.length * 8, (index) => {
      const key = keys[index % keys.length];
      const phase = (index / Math.max(1, keys.length * 8)) * Math.PI * 2;
      const [r, g, b] = journeyMemoryColor(key);
      return {
        x: origin.x + rand(-18, 18),
        y: origin.y + rand(-22, 16),
        targetX: center.x + Math.cos(phase) * rand(150, 230),
        targetY: center.y + Math.sin(phase) * rand(90, 150),
        targetAttract: 0.00013,
        targetDamping: 0.82,
        size: rand(1, 3.2),
        life: rand(definition.durationMs, definition.durationMs + 900),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.24, 0.58).toFixed(2)})`,
        type: index % 11 === 0 ? 'ring' : 'bit',
      };
    });
    return true;
  }

  function beginConstellationDash(now = clock.now()) {
    if (
      !hasAwakenedJourney()
      || journeyMotion.charge < 0.92
      || now < journeyAwakening.starDashCooldownUntil
      || journeyTransition.active
      || journeyMoment.active
      || journeyReturn.active
      || journeyAwakening.orchestra
      || journeyAwakening.resonance
      || journeySecrets.active
      || journeySecrets.observatory
      || journeySecrets.ascension
      || journeyDiscovery.areaKey
    ) {
      return false;
    }
    journeyAwakening.starDash = {
      startedAt: now,
      durationMs: 1450,
      direction: journeyMotion.heldDirection || state.direction,
    };
    journeyAwakening.starDashCooldownUntil = now + 3900;
    root.dataset.starDash = 'true';
    const origin = worldToScreen(state.x, state.y - 64);
    const keys = Array.from(journeyMemory.collected);
    emitParticles(keys.length * 10, (index) => {
      const key = keys[index % keys.length];
      const [r, g, b] = journeyMemoryColor(key);
      const direction = journeyAwakening.starDash.direction;
      return {
        x: origin.x + rand(-20, 20),
        y: origin.y + rand(-54, 36),
        vx: -direction * rand(0.18, 0.62),
        vy: rand(-0.08, 0.08),
        size: rand(1.1, 3.5),
        life: rand(620, 1300),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.32, 0.72).toFixed(2)})`,
        type: index % 9 === 0 ? 'spark' : 'bit',
      };
    });
    triggerParticleFlash(520);
    triggerScreenShake(220);
    return true;
  }

  function beginWorldOrchestra(now = clock.now()) {
    if (!hasAwakenedJourney() || !journeyMemory.complete || journeyAwakening.orchestra) {
      return false;
    }
    journeyAwakening.orchestra = {
      startedAt: now,
      durationMs: 5600,
      phase: '',
    };
    root.dataset.worldOrchestra = 'true';
    state.vx = 0;
    state.isMoving = false;
    const keys = Array.from(journeyMemory.collected);
    audio?.arpeggio(keys);
    const centerX = window.innerWidth * 0.54;
    const centerY = window.innerHeight * 0.38;
    emitParticles(keys.length * 20, (index) => {
      const key = keys[index % keys.length];
      const phase = (index / Math.max(1, keys.length * 20)) * Math.PI * 2;
      const [r, g, b] = journeyMemoryColor(key);
      const edge = index % 4;
      return {
        x: edge === 0 ? -30 : edge === 1 ? window.innerWidth + 30 : rand(0, window.innerWidth),
        y: edge === 2 ? -30 : edge === 3 ? window.innerHeight + 30 : rand(0, window.innerHeight),
        targetX: centerX + Math.cos(phase) * rand(110, 360),
        targetY: centerY + Math.sin(phase) * rand(70, 220),
        targetAttract: 0.00011,
        targetDamping: 0.83,
        size: rand(1.2, 3.8),
        life: rand(3600, 5400),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.3, 0.72).toFixed(2)})`,
        type: index % 15 === 0 ? 'ring' : 'spark',
      };
    });
    triggerParticleFlash(1100);
    triggerScreenShake(420);
    return true;
  }

  function updateJourneyAwakening(now) {
    if (!isJourneyMode) {
      return { cinematic: false, cameraX: 0, cameraY: 0, characterY: 0, angle: 0 };
    }
    if (hasAwakenedJourney()) {
      root.dataset.memoryWeather = memoryWeatherStage(state.journeyStage || journey.stageAt(state.x));
    } else {
      delete root.dataset.memoryWeather;
    }

    if (journeyAwakening.dawn) {
      const progress = (now - journeyAwakening.dawn.startedAt) / journeyAwakening.dawn.durationMs;
      if (progress >= 1) {
        journeyAwakening.dawn = null;
        delete root.dataset.memoryDawn;
      }
    }
    if (journeyAwakening.resonance) {
      const progress = (now - journeyAwakening.resonance.startedAt) / journeyAwakening.resonance.durationMs;
      if (progress >= 1) {
        journeyAwakening.resonance = null;
        delete root.dataset.memoryResonance;
      }
    }
    if (journeyAwakening.starDash) {
      const progress = (now - journeyAwakening.starDash.startedAt) / journeyAwakening.starDash.durationMs;
      if (progress >= 1) {
        journeyAwakening.starDash = null;
        delete root.dataset.starDash;
      }
    }

    const orchestra = journeyAwakening.orchestra;
    if (!orchestra) {
      return { cinematic: false, cameraX: 0, cameraY: 0, characterY: 0, angle: 0 };
    }
    const progress = clamp((now - orchestra.startedAt) / orchestra.durationMs, 0, 1);
    const phase = progress < 0.23 ? 'gathering' : progress < 0.72 ? 'chorus' : 'eclipse';
    if (orchestra.phase !== phase) {
      orchestra.phase = phase;
      root.dataset.worldOrchestraPhase = phase;
      if (phase !== 'gathering') {
        triggerParticleFlash(phase === 'eclipse' ? 1400 : 760);
        triggerScreenShake(phase === 'eclipse' ? 480 : 240);
      }
    }
    if (progress >= 1) {
      journeyAwakening.orchestra = null;
      delete root.dataset.worldOrchestra;
      delete root.dataset.worldOrchestraPhase;
      armSecretObservatory(now);
      triggerParticleFlash(900);
      return { cinematic: false, cameraX: 0, cameraY: 0, characterY: 0, angle: 0 };
    }
    const pulse = Math.sin(progress * Math.PI);
    return {
      cinematic: true,
      cameraX: Math.sin(progress * Math.PI * 6) * 5 * pulse,
      cameraY: -38 * pulse,
      characterY: -12 * pulse,
      angle: Math.sin(progress * Math.PI * 4) * 1.8 * pulse,
    };
  }

  function drawMemoryDawn(now, characterScreenX, characterScreenY) {
    const active = journeyAwakening.dawn;
    if (!particleCtx || !active) {
      return;
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    const sweep = smooth(clamp(progress / 0.82, 0, 1));
    const fade = 1 - smooth(clamp((progress - 0.68) / 0.32, 0, 1));
    const keys = Array.from(journeyMemory.collected);
    const startX = characterScreenX - 20;
    const frontX = startX + (window.innerWidth * 1.08 - startX) * sweep;
    particleCtx.save();
    particleCtx.lineCap = 'round';
    keys.forEach((key, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const laneY = window.innerHeight * (0.18 + index * 0.1);
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.11 + fade * 0.27).toFixed(3)})`;
      particleCtx.lineWidth = 1.15 + (index % 3) * 0.4;
      particleCtx.beginPath();
      for (let point = 0; point <= 28; point += 1) {
        const t = point / 28;
        const x = startX + (frontX - startX) * t;
        const y = characterScreenY - 84
          + (laneY - (characterScreenY - 84)) * t
          + Math.sin(t * Math.PI * 3 + index + now * 0.0014) * 14 * (1 - t * 0.4);
        if (point === 0) particleCtx.moveTo(x, y);
        else particleCtx.lineTo(x, y);
      }
      particleCtx.stroke();
      for (let point = 2; point < 28; point += 4) {
        const t = point / 28;
        const x = startX + (frontX - startX) * t;
        const y = characterScreenY - 84
          + (laneY - (characterScreenY - 84)) * t
          + Math.sin(t * Math.PI * 3 + index + now * 0.0014) * 14 * (1 - t * 0.4);
        particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(fade * 0.72).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.arc(x, y, 1.2 + (point % 3) * 0.35, 0, Math.PI * 2);
        particleCtx.fill();
      }
    });
    particleCtx.strokeStyle = `rgba(82, 100, 94, ${(fade * 0.22).toFixed(3)})`;
    particleCtx.lineWidth = 1;
    particleCtx.setLineDash([3, 9]);
    particleCtx.beginPath();
    particleCtx.ellipse(frontX, window.innerHeight * 0.5, 28 + sweep * 74, 92 + sweep * 210, 0, 0, Math.PI * 2);
    particleCtx.stroke();
    particleCtx.restore();
  }

  function drawLivingMemoryWeather(now) {
    if (!particleCtx || !hasAwakenedJourney() || journeyReturn.active) {
      return;
    }
    const stage = memoryWeatherStage(state.journeyStage || journey.stageAt(state.x));
    const keys = Array.from(journeyMemory.collected);
    const time = journeyMotion.visualTime;
    const dark = root.dataset.tone === 'dark';
    const baseAlpha = dark ? 0.24 : 0.13;
    const width = window.innerWidth;
    const height = window.innerHeight;
    particleCtx.save();
    particleCtx.lineCap = 'round';
    keys.forEach((key, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const phase = (index / Math.max(1, keys.length)) * Math.PI * 2;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(baseAlpha * (0.72 + (index % 3) * 0.12)).toFixed(3)})`;
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(baseAlpha * 1.7).toFixed(3)})`;
      particleCtx.lineWidth = 0.8 + (index % 2) * 0.35;
      if (stage === 'moss') {
        particleCtx.beginPath();
        for (let point = 0; point <= 24; point += 1) {
          const t = point / 24;
          const x = width * (0.04 + t * 0.92);
          const y = height * (0.25 + index * 0.018)
            + Math.sin(t * Math.PI * 2 + phase + time * 0.35) * (26 + index * 3);
          if (point === 0) particleCtx.moveTo(x, y);
          else particleCtx.lineTo(x, y);
        }
        particleCtx.stroke();
      } else if (stage === 'taupe') {
        const y = height * (0.16 + index * 0.055);
        const travel = ((time * 0.04 + index / keys.length) % 1) * width;
        particleCtx.beginPath();
        particleCtx.moveTo(width * 0.06, y);
        particleCtx.lineTo(width * 0.36, y);
        particleCtx.lineTo(width * 0.42, y + (index % 2 ? 18 : -18));
        particleCtx.lineTo(width * 0.78, y + (index % 2 ? 18 : -18));
        particleCtx.stroke();
        particleCtx.beginPath();
        particleCtx.arc(travel, y + Math.sin(time + index) * 7, 2.2 + (index % 3), 0, Math.PI * 2);
        particleCtx.fill();
      } else if (stage === 'islog') {
        const x = width * (0.14 + index * 0.115) + Math.sin(time * 0.3 + index) * 18;
        const y = height * (0.18 + (index % 3) * 0.11);
        particleCtx.beginPath();
        particleCtx.arc(x, y, 18 + index * 6, 0, Math.PI * 2);
        particleCtx.stroke();
        particleCtx.beginPath();
        particleCtx.arc(x + Math.cos(time + phase) * 7, y + Math.sin(time + phase) * 7, 2, 0, Math.PI * 2);
        particleCtx.fill();
      } else if (stage === 'ojicra') {
        const cx = width * 0.58;
        const cy = height * 0.34;
        particleCtx.beginPath();
        particleCtx.ellipse(cx, cy, 110 + index * 34, 44 + index * 18, phase * 0.42 + time * 0.025, 0, Math.PI * 2);
        particleCtx.stroke();
        const orbit = time * (0.16 + index * 0.012) + phase;
        particleCtx.beginPath();
        particleCtx.arc(cx + Math.cos(orbit) * (110 + index * 34), cy + Math.sin(orbit) * (44 + index * 18), 1.8 + index % 3, 0, Math.PI * 2);
        particleCtx.fill();
      } else if (stage === 'monoomoi') {
        for (let point = 0; point < 8; point += 1) {
          const t = ((time * 0.045 + point / 8 + index * 0.07) % 1);
          const x = width * (0.14 + index * 0.11) + Math.sin(t * Math.PI * 4 + phase) * 28;
          const y = height * (0.78 - t * 0.62);
          particleCtx.beginPath();
          particleCtx.arc(x, y, 1.2 + (point % 3) * 0.6, 0, Math.PI * 2);
          particleCtx.fill();
        }
      } else if (stage === 'monoerabi') {
        const scan = ((time * 0.07 + index * 0.12) % 1);
        const y = height * (0.17 + index * 0.065);
        particleCtx.beginPath();
        particleCtx.moveTo(width * 0.08, y);
        particleCtx.lineTo(width * (0.18 + scan * 0.72), y + Math.sin(time + index) * 4);
        particleCtx.stroke();
        particleCtx.beginPath();
        particleCtx.arc(width * (0.18 + scan * 0.72), y, 2.4, 0, Math.PI * 2);
        particleCtx.fill();
      } else if (stage === 'hub') {
        const cx = width * 0.54;
        const cy = height * 0.36;
        particleCtx.beginPath();
        particleCtx.arc(cx, cy, 78 + index * 28 + Math.sin(time * 0.5 + phase) * 6, phase, phase + Math.PI * 1.45);
        particleCtx.stroke();
      }
    });
    particleCtx.restore();
  }

  function drawJourneyResonance(now, characterScreenX, characterScreenY) {
    const active = journeyAwakening.resonance;
    if (!particleCtx || !active) {
      return;
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    const form = smooth(clamp(progress / 0.28, 0, 1));
    const fade = 1 - smooth(clamp((progress - 0.7) / 0.3, 0, 1));
    const pulse = Math.sin(progress * Math.PI);
    const keys = Array.from(journeyMemory.collected);
    const centerX = window.innerWidth * 0.54;
    const centerY = window.innerHeight * 0.4;
    const time = now * 0.001;
    particleCtx.save();
    particleCtx.lineCap = 'round';
    keys.forEach((key, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const phase = (index / Math.max(1, keys.length)) * Math.PI * 2 - Math.PI * 0.5;
      const radiusX = 196 + (index % 2) * 34;
      const radiusY = 118 + (index % 3) * 15;
      const crownX = centerX + Math.cos(phase + time * 0.08) * radiusX;
      const crownY = centerY + Math.sin(phase + time * 0.08) * radiusY - Math.abs(Math.cos(phase)) * 34;
      const startX = characterScreenX - state.direction * (48 + index * 10);
      const startY = characterScreenY - 108 - Math.sin(phase) * 18;
      const x = startX + (crownX - startX) * form;
      const y = startY + (crownY - startY) * form;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(fade * 0.24).toFixed(3)})`;
      particleCtx.lineWidth = 1;
      particleCtx.beginPath();
      particleCtx.moveTo(centerX, centerY);
      particleCtx.lineTo(x, y);
      particleCtx.stroke();
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(fade * 0.72).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(x, y, 2.6 + pulse * 2.2, 0, Math.PI * 2);
      particleCtx.fill();
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(fade * 0.34).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(x, y, 8 + pulse * 6, 0, Math.PI * 2);
      particleCtx.stroke();
    });
    particleCtx.strokeStyle = `rgba(104, 106, 116, ${(fade * 0.22).toFixed(3)})`;
    particleCtx.lineWidth = 1.2;
    particleCtx.setLineDash([3, 9]);
    particleCtx.lineDashOffset = -time * 18;
    particleCtx.beginPath();
    particleCtx.ellipse(centerX, centerY - 12, 226 + pulse * 22, 142 + pulse * 13, 0, Math.PI, Math.PI * 2);
    particleCtx.stroke();
    particleCtx.restore();
  }

  function drawConstellationDash(now, characterScreenX, characterScreenY) {
    const active = journeyAwakening.starDash;
    if (!particleCtx || !active) {
      return;
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    const strength = Math.sin(progress * Math.PI);
    const keys = Array.from(journeyMemory.collected);
    const time = now * 0.001;
    particleCtx.save();
    particleCtx.lineCap = 'round';
    keys.forEach((key, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const y = characterScreenY - 118 + index * 13 + Math.sin(time * 5 + index) * 5;
      const length = strength * (220 + index * 42);
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(strength * 0.58).toFixed(3)})`;
      particleCtx.lineWidth = 1.35 + (index % 3) * 0.58;
      particleCtx.beginPath();
      particleCtx.moveTo(characterScreenX - active.direction * 24, y);
      particleCtx.lineTo(characterScreenX - active.direction * length, y + Math.sin(index) * 8);
      particleCtx.stroke();
    });
    particleCtx.strokeStyle = `rgba(104, 106, 116, ${(strength * 0.46).toFixed(3)})`;
    particleCtx.lineWidth = 1.6;
    particleCtx.beginPath();
    particleCtx.ellipse(characterScreenX, characterScreenY - 84, 34 + progress * 118, 74 + progress * 54, 0, 0, Math.PI * 2);
    particleCtx.stroke();
    particleCtx.restore();
  }

  function drawWorldOrchestra(now) {
    const active = journeyAwakening.orchestra;
    if (!particleCtx || !active) {
      return;
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    const keys = Array.from(journeyMemory.collected);
    const centerX = window.innerWidth * 0.54;
    const centerY = window.innerHeight * 0.38;
    const time = now * 0.001;
    const gather = smooth(clamp(progress / 0.23, 0, 1));
    const chorus = smooth(clamp((progress - 0.18) / 0.4, 0, 1))
      * (1 - smooth(clamp((progress - 0.7) / 0.2, 0, 1)));
    const eclipse = smooth(clamp((progress - 0.68) / 0.2, 0, 1));
    particleCtx.save();
    particleCtx.lineCap = 'round';
    keys.forEach((key, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const phase = (index / Math.max(1, keys.length)) * Math.PI * 2;
      const startX = index % 2 ? window.innerWidth + 80 : -80;
      const startY = window.innerHeight * (0.12 + index * 0.11);
      const orbitRadiusX = 116 + index * 42;
      const orbitRadiusY = 54 + index * 23;
      const nodeAngle = time * (0.18 + index * 0.018) + phase;
      const nodeX = centerX + Math.cos(nodeAngle) * orbitRadiusX;
      const nodeY = centerY + Math.sin(nodeAngle) * orbitRadiusY;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.08 + chorus * 0.3 + eclipse * 0.08).toFixed(3)})`;
      particleCtx.lineWidth = 0.9 + (index % 3) * 0.35;
      particleCtx.beginPath();
      particleCtx.ellipse(centerX, centerY, orbitRadiusX, orbitRadiusY, phase * 0.23, 0, Math.PI * 2);
      particleCtx.stroke();
      if (gather < 1) {
        particleCtx.beginPath();
        particleCtx.moveTo(startX, startY);
        particleCtx.quadraticCurveTo(centerX, startY - 80, nodeX, nodeY);
        particleCtx.stroke();
      }
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.4 + chorus * 0.42).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(nodeX, nodeY, 2.2 + chorus * 3.4, 0, Math.PI * 2);
      particleCtx.fill();
      if (eclipse > 0) {
        const rayAngle = phase + time * 0.05;
        particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(eclipse * 0.26).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.moveTo(
          centerX + Math.cos(rayAngle) * (78 + eclipse * 16),
          centerY + Math.sin(rayAngle) * (78 + eclipse * 16)
        );
        particleCtx.lineTo(
          centerX + Math.cos(rayAngle) * (190 + index * 26),
          centerY + Math.sin(rayAngle) * (190 + index * 26)
        );
        particleCtx.stroke();
      }
    });
    if (eclipse > 0) {
      const darkFill = root.dataset.tone === 'dark'
        ? `rgba(2, 5, 12, ${(eclipse * 0.72).toFixed(3)})`
        : `rgba(248, 247, 243, ${(eclipse * 0.88).toFixed(3)})`;
      particleCtx.fillStyle = darkFill;
      particleCtx.beginPath();
      particleCtx.arc(centerX, centerY, 58 + eclipse * 22, 0, Math.PI * 2);
      particleCtx.fill();
      particleCtx.strokeStyle = `rgba(80, 164, 180, ${(eclipse * 0.52).toFixed(3)})`;
      particleCtx.lineWidth = 1.8;
      particleCtx.beginPath();
      particleCtx.arc(centerX, centerY, 72 + Math.sin(time * 1.4) * 5, 0, Math.PI * 2);
      particleCtx.stroke();
      particleCtx.strokeStyle = `rgba(230, 112, 174, ${(eclipse * 0.22).toFixed(3)})`;
      particleCtx.lineWidth = 1;
      particleCtx.beginPath();
      particleCtx.arc(centerX, centerY, 94 + Math.cos(time) * 7, 0, Math.PI * 2);
      particleCtx.stroke();
    }
    particleCtx.restore();
  }

  function drawJourneyAwakening(now, characterScreenX, characterScreenY) {
    drawMemoryDawn(now, characterScreenX, characterScreenY);
    drawJourneyResonance(now, characterScreenX, characterScreenY);
    drawConstellationDash(now, characterScreenX, characterScreenY);
    drawWorldOrchestra(now);
  }

  function hasAllSecretFragments() {
    return journeySecrets.wells.every((well) => journeySecrets.fragments.has(well.id));
  }

  function nearestSecretWell(maxDistance = 760) {
    if (!hasAwakenedJourney()) {
      return null;
    }
    return journeySecrets.wells
      .filter((well) => !journeySecrets.captured.has(well.id))
      .map((well) => ({ well, distance: Math.abs(state.x - well.x) }))
      .filter(({ distance }) => distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)[0]?.well || null;
  }

  function beginSecretWell(well, now = clock.now()) {
    if (!well || journeySecrets.active || journeySecrets.captured.has(well.id)) {
      return false;
    }
    closeJourneyDiscovery();
    journeyAwakening.starDash = null;
    journeyMotion.charge = 0;
    journeySecrets.active = {
      ...well,
      startedAt: now,
      durationMs: SECRET_PICKUP_DURATION_MS,
      phase: '',
    };
    journeySecrets.nearbyId = well.id;
    journeySecrets.captureSince = 0;
    root.dataset.worldFold = well.type;
    root.dataset.secretWell = well.id;
    delete root.dataset.starDash;
    const center = worldToScreen(well.x, terrainY(well.x) - 62);
    const keys = Array.from(journeyMemory.collected);
    const particlesPerMemory = renderQuality.mode === 'high' ? 6 : renderQuality.mode === 'medium' ? 5 : 4;
    const particleCount = Math.max(12, keys.length * particlesPerMemory);
    emitParticles(particleCount, (index) => {
      const key = keys[index % keys.length];
      const angle = (index / Math.max(1, particleCount)) * Math.PI * 2;
      const [r, g, b] = journeyMemoryColor(key);
      const edge = index % 4;
      return {
        x: edge === 0 ? -24 : edge === 1 ? window.innerWidth + 24 : rand(0, window.innerWidth),
        y: edge === 2 ? -24 : edge === 3 ? window.innerHeight + 24 : rand(0, window.innerHeight),
        targetX: center.x + Math.cos(angle) * rand(28, 142),
        targetY: center.y + Math.sin(angle) * rand(18, 98),
        targetAttract: 0.00014,
        targetDamping: 0.8,
        size: rand(1, 3),
        life: rand(1050, 1650),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.32, 0.72).toFixed(2)})`,
        type: index % 17 === 0 ? 'ring' : 'bit',
      };
    });
    triggerParticleFlash(460);
    triggerScreenShake(100);
    return true;
  }

  function emitSecretFragment(well) {
    const origin = worldToScreen(well.x, terrainY(well.x) - 76);
    const [r, g, b] = journeyMemoryColor(well.key);
    const particleCount = renderQuality.mode === 'high' ? 36 : renderQuality.mode === 'medium' ? 30 : 24;
    emitParticles(particleCount, (index) => {
      const angle = (index / particleCount) * Math.PI * 2;
      const speed = rand(0.04, 0.22);
      return {
        x: origin.x + Math.cos(angle) * rand(4, 26),
        y: origin.y + Math.sin(angle) * rand(4, 22),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.06,
        ay: 0.00002,
        size: rand(1.1, 3.4),
        life: rand(720, 1320),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.38, 0.78).toFixed(2)})`,
        type: index % 12 === 0 ? 'ring' : 'bit',
      };
    });
    triggerParticleFlash(620);
    triggerScreenShake(110);
  }

  function armSecretObservatory(now = clock.now()) {
    if (
      !hasAllSecretFragments()
      || journeySecrets.observatorySeen
      || journeySecrets.observatory
    ) {
      return false;
    }
    journeySecrets.observatoryReadyAt = now;
    root.dataset.secretObservatory = 'ready';
    return true;
  }

  function canBeginSecretObservatory(now = clock.now()) {
    return journeySecrets.observatoryReadyAt > 0
      && now - journeySecrets.observatoryReadyAt >= 900
      && hasAllSecretFragments()
      && journeyMemory.finalized
      && !journeySecrets.observatorySeen
      && !journeySecrets.observatory
      && !journeyAwakening.orchestra
      && !journeyAwakening.resonance
      && !journeyAwakening.starDash
      && !journeyMoment.active
      && !journeyTransition.active
      && !journeyReturn.active;
  }

  function beginSecretObservatory(now = clock.now()) {
    if (!canBeginSecretObservatory(now)) {
      return false;
    }
    journeySecrets.observatory = {
      startedAt: now,
      durationMs: 6400,
      phase: '',
    };
    journeyAwakening.starDash = null;
    delete root.dataset.starDash;
    state.vx = 0;
    state.isMoving = false;
    root.dataset.secretObservatory = 'active';
    const keys = Array.from(journeyMemory.collected);
    const centerX = window.innerWidth * 0.62;
    const centerY = window.innerHeight * 0.38;
    emitParticles(keys.length * 22, (index) => {
      const key = keys[index % keys.length];
      const angle = (index / Math.max(1, keys.length * 22)) * Math.PI * 2;
      const [r, g, b] = journeyMemoryColor(key);
      return {
        x: rand(0, window.innerWidth),
        y: rand(0, window.innerHeight),
        targetX: centerX + Math.cos(angle) * rand(84, 330),
        targetY: centerY + Math.sin(angle) * rand(52, 210),
        targetAttract: 0.00012,
        targetDamping: 0.82,
        size: rand(1.2, 4.2),
        life: rand(4300, 6200),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.36, 0.82).toFixed(2)})`,
        type: index % 14 === 0 ? 'ring' : 'spark',
      };
    });
    triggerParticleFlash(1200);
    triggerScreenShake(480);
    return true;
  }

  function armSecretAscension(now = clock.now()) {
    if (
      !journeySecrets.observatorySeen
      || journeySecrets.ascensionSeen
      || journeySecrets.ascension
      || journeySecrets.worldSeedAwake
    ) {
      return false;
    }
    journeySecrets.ascensionReadyAt = now;
    root.dataset.secretAscension = 'ready';
    return true;
  }

  function canBeginSecretAscension(now = clock.now()) {
    return journeySecrets.ascensionReadyAt > 0
      && now - journeySecrets.ascensionReadyAt >= 1100
      && journeySecrets.observatorySeen
      && hasAllSecretFragments()
      && journeyMemory.finalized
      && !journeySecrets.ascensionSeen
      && !journeySecrets.ascension
      && !journeyAwakening.orchestra
      && !journeyAwakening.resonance
      && !journeyAwakening.starDash
      && !journeyMoment.active
      && !journeyTransition.active
      && !journeyReturn.active;
  }

  function beginSecretAscension(now = clock.now()) {
    if (!canBeginSecretAscension(now)) {
      return false;
    }
    closeJourneyDiscovery();
    journeyAwakening.starDash = null;
    journeyMotion.charge = 0;
    journeySecrets.ascension = {
      startedAt: now,
      durationMs: 9200,
      phase: '',
      startX: state.x,
    };
    state.vx = 0;
    state.isMoving = false;
    root.dataset.secretAscension = 'active';
    delete root.dataset.starDash;
    const keys = Array.from(journeyMemory.collected);
    const centerX = window.innerWidth * 0.58;
    const centerY = window.innerHeight * 0.38;
    emitParticles(keys.length * 16, (index) => {
      const key = keys[index % keys.length];
      const angle = (index / Math.max(1, keys.length * 16)) * Math.PI * 2;
      const [r, g, b] = journeyMemoryColor(key);
      return {
        x: rand(0, window.innerWidth),
        y: rand(0, window.innerHeight),
        targetX: centerX + Math.cos(angle) * rand(28, 190),
        targetY: centerY + Math.sin(angle) * rand(18, 118),
        targetAttract: 0.00014,
        targetDamping: 0.8,
        size: rand(1.1, 3.8),
        life: rand(1800, 3200),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.34, 0.78).toFixed(2)})`,
        type: index % 12 === 0 ? 'ring' : 'spark',
      };
    });
    triggerParticleFlash(1100);
    triggerScreenShake(260);
    return true;
  }

  function emitSecretAscensionPhase(phase) {
    const keys = Array.from(journeyMemory.collected);
    const centerX = window.innerWidth * 0.58;
    const centerY = window.innerHeight * 0.38;
    const origin = worldToScreen(state.x, state.y - 86);
    const counts = { rupture: 84, launch: 126, world: 112, return: 154 };
    const count = counts[phase] || 54;
    emitParticles(count, (index) => {
      const key = keys[index % keys.length];
      const [r, g, b] = journeyMemoryColor(key);
      const angle = (index / count) * Math.PI * 2;
      if (phase === 'rupture') {
        const side = index % 2 ? -1 : 1;
        return {
          x: centerX + side * rand(90, window.innerWidth * 0.46),
          y: rand(-30, window.innerHeight + 30),
          targetX: centerX + side * rand(3, 22),
          targetY: centerY + Math.sin(angle) * rand(40, 320),
          targetAttract: 0.00017,
          targetDamping: 0.78,
          size: rand(1.2, 3.6),
          life: rand(1500, 2600),
          color: `rgba(${r}, ${g}, ${b}, ${rand(0.34, 0.72).toFixed(2)})`,
          type: index % 10 === 0 ? 'ring' : 'bit',
        };
      }
      if (phase === 'launch') {
        return {
          x: rand(0, window.innerWidth),
          y: rand(-120, window.innerHeight + 180),
          vx: rand(-0.025, 0.025),
          vy: rand(0.32, 0.9),
          size: rand(1, 3.4),
          life: rand(1200, 2400),
          color: `rgba(${r}, ${g}, ${b}, ${rand(0.3, 0.68).toFixed(2)})`,
          type: index % 8 === 0 ? 'spark' : 'bit',
        };
      }
      if (phase === 'world') {
        const radiusX = rand(92, 250);
        const radiusY = radiusX * rand(0.42, 0.68);
        return {
          x: origin.x + rand(-30, 30),
          y: origin.y + rand(-36, 24),
          targetX: centerX + Math.cos(angle) * radiusX,
          targetY: centerY + Math.sin(angle) * radiusY,
          targetAttract: 0.00013,
          targetDamping: 0.82,
          size: rand(1.2, 4.2),
          life: rand(2300, 3900),
          color: `rgba(${r}, ${g}, ${b}, ${rand(0.36, 0.8).toFixed(2)})`,
          type: index % 13 === 0 ? 'ring' : 'spark',
        };
      }
      return {
        x: window.innerWidth * rand(0.68, 1.08),
        y: window.innerHeight * rand(-0.08, 0.32),
        targetX: origin.x + Math.cos(angle) * rand(24, 160),
        targetY: origin.y + Math.sin(angle) * rand(12, 72),
        targetAttract: 0.00018,
        targetDamping: 0.76,
        size: rand(1.2, 4.6),
        life: rand(1400, 2700),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.4, 0.86).toFixed(2)})`,
        type: index % 9 === 0 ? 'ring' : 'spark',
      };
    });
  }

  function updateJourneySecrets(now, dt) {
    const emptyView = { cinematic: false, cameraX: 0, cameraY: 0, characterY: 0, angle: 0 };
    if (!isJourneyMode) {
      return emptyView;
    }

    const ascension = journeySecrets.ascension;
    if (ascension) {
      const progress = clamp((now - ascension.startedAt) / ascension.durationMs, 0, 1);
      const phase = progress < 0.15
        ? 'fusion'
        : progress < 0.3
          ? 'rupture'
          : progress < 0.53
            ? 'launch'
            : progress < 0.78 ? 'world' : 'return';
      if (ascension.phase !== phase) {
        ascension.phase = phase;
        root.dataset.secretAscensionPhase = phase;
        if (phase !== 'fusion') {
          emitSecretAscensionPhase(phase);
          triggerParticleFlash(phase === 'return' ? 1600 : phase === 'launch' ? 1100 : 760);
          triggerScreenShake(phase === 'return' ? 620 : phase === 'launch' ? 480 : 220);
        }
      }
      state.vx = 0;
      state.isMoving = false;
      if (phase === 'launch') {
        journeyMotion.visualTime += dt * 0.005;
      }
      if (progress >= 1) {
        journeySecrets.ascension = null;
        journeySecrets.ascensionReadyAt = 0;
        journeySecrets.ascensionSeen = true;
        journeySecrets.worldSeedAwake = true;
        journeySecrets.lastSeedWakeAt = now;
        root.dataset.secretAscension = 'complete';
        root.dataset.worldSeed = 'awake';
        delete root.dataset.secretAscensionPhase;
        clearPocketWorldPosition();
        journeyLanding.active = {
          type: 'seed-return',
          x: state.x,
          y: terrainY(state.x),
          startedAt: now,
          durationMs: 1900,
        };
        root.dataset.journeyLanding = 'seed-return';
        emitSecretAscensionPhase('return');
        triggerParticleFlash(1700);
        triggerScreenShake(760);
        return emptyView;
      }
      if (phase === 'fusion') {
        const amount = smooth(clamp(progress / 0.15, 0, 1));
        return {
          cinematic: true,
          cameraX: 18 * amount,
          cameraY: -16 * amount,
          characterY: -14 * amount,
          angle: Math.sin(progress * Math.PI * 8) * 1.5 * amount,
        };
      }
      if (phase === 'rupture') {
        const amount = smooth(clamp((progress - 0.15) / 0.15, 0, 1));
        return {
          cinematic: true,
          cameraX: 18 + Math.sin(progress * Math.PI * 18) * 5,
          cameraY: -16 - 28 * amount,
          characterY: -14 - 34 * amount,
          angle: Math.sin(progress * Math.PI * 14) * 3.2,
        };
      }
      if (phase === 'launch') {
        const amount = smooth(clamp((progress - 0.3) / 0.23, 0, 1));
        return {
          cinematic: true,
          cameraX: 18 + 102 * amount,
          cameraY: -44 - 88 * amount,
          characterY: -48 - 300 * amount,
          angle: Math.sin(amount * Math.PI * 2.5) * 8 * (1 - amount * 0.5),
        };
      }
      if (phase === 'world') {
        const amount = clamp((progress - 0.53) / 0.25, 0, 1);
        return {
          cinematic: true,
          cameraX: 120 + Math.sin(amount * Math.PI * 2) * 8,
          cameraY: -132 + Math.cos(amount * Math.PI * 2) * 7,
          characterY: -348 + Math.sin(amount * Math.PI * 2) * 12,
          angle: -4 + Math.sin(amount * Math.PI * 2) * 5,
        };
      }
      const amount = smooth(clamp((progress - 0.78) / 0.22, 0, 1));
      return {
        cinematic: true,
        cameraX: 120 * (1 - amount),
        cameraY: -132 * (1 - amount),
        characterY: -348 * (1 - amount),
        angle: -4 + Math.sin(amount * Math.PI) * 24,
      };
    }

    const observatory = journeySecrets.observatory;
    if (observatory) {
      const progress = clamp((now - observatory.startedAt) / observatory.durationMs, 0, 1);
      const phase = progress < 0.24 ? 'alignment' : progress < 0.72 ? 'aperture' : 'revelation';
      if (observatory.phase !== phase) {
        observatory.phase = phase;
        root.dataset.secretObservatoryPhase = phase;
        if (phase !== 'alignment') {
          triggerParticleFlash(phase === 'revelation' ? 1500 : 820);
          triggerScreenShake(phase === 'revelation' ? 520 : 220);
        }
      }
      state.vx = 0;
      state.isMoving = false;
      if (progress >= 1) {
        journeySecrets.observatory = null;
        journeySecrets.observatorySeen = true;
        journeySecrets.observatoryReadyAt = 0;
        root.dataset.secretObservatory = 'complete';
        delete root.dataset.secretObservatoryPhase;
        armSecretAscension(now);
        triggerParticleFlash(1000);
        return emptyView;
      }
      const pulse = Math.sin(progress * Math.PI);
      return {
        cinematic: true,
        cameraX: Math.sin(progress * Math.PI * 4) * 7 * pulse,
        cameraY: -48 * pulse,
        characterY: -10 * pulse,
        angle: Math.sin(progress * Math.PI * 3) * 1.4 * pulse,
      };
    }

    const active = journeySecrets.active;
    if (active) {
      const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
      const phase = progress < 0.2 ? 'capture' : progress < 0.76 ? 'fold' : 'release';
      if (active.phase !== phase) {
        active.phase = phase;
        root.dataset.worldFoldPhase = phase;
        if (phase !== 'capture') {
          triggerParticleFlash(phase === 'release' ? 520 : 320);
          triggerScreenShake(phase === 'release' ? 120 : 70);
        }
      }
      if (progress >= 1) {
        journeySecrets.captured.add(active.id);
        journeySecrets.fragments.add(active.id);
        root.dataset.secretCount = String(journeySecrets.fragments.size);
        journeySecrets.active = null;
        journeySecrets.nearbyId = '';
        journeySecrets.captureSince = 0;
        delete root.dataset.worldFold;
        delete root.dataset.worldFoldPhase;
        delete root.dataset.secretWell;
        emitSecretFragment(active);
        return emptyView;
      }
      return emptyView;
    }

    journeySecrets.seedWake = journeySecrets.seedWake.filter((item) => now - item.bornAt < 2400);
    if (
      journeySecrets.worldSeedAwake
      && state.isMoving
      && now - journeySecrets.lastSeedWakeAt >= 145
    ) {
      const keys = Array.from(journeyMemory.collected);
      const index = journeySecrets.seedWake.length;
      journeySecrets.seedWake.push({
        x: state.x - state.direction * rand(10, 28),
        bornAt: now,
        key: keys[index % keys.length] || 'hub',
        twist: rand(-1, 1),
      });
      journeySecrets.lastSeedWakeAt = now;
      if (journeySecrets.seedWake.length > 18) {
        journeySecrets.seedWake.splice(0, journeySecrets.seedWake.length - 18);
      }
    }

    const canSearch = hasAwakenedJourney()
      && !journeyTransition.active
      && !journeyMoment.active
      && !journeyReturn.active
      && !journeyAwakening.orchestra
      && !journeyDiscovery.areaKey;
    if (!canSearch) {
      journeySecrets.nearbyId = '';
      journeySecrets.captureSince = 0;
      delete root.dataset.echoGuide;
      return emptyView;
    }

    const well = nearestSecretWell();
    journeySecrets.nearbyId = well?.id || '';
    if (!well) {
      journeySecrets.captureSince = 0;
      delete root.dataset.echoGuide;
      return emptyView;
    }
    root.dataset.echoGuide = well.type;
    if (Math.abs(state.x - well.x) <= 84) {
      journeySecrets.captureSince ||= now;
      if (now - journeySecrets.captureSince >= 160) {
        beginSecretWell(well, now);
        return emptyView;
      }
    } else {
      journeySecrets.captureSince = 0;
    }
    return emptyView;
  }

  function drawSecretDottedLine(from, to, count, rgb, alpha, size = 1.3) {
    for (let index = 0; index <= count; index += 1) {
      const progress = index / Math.max(1, count);
      particleCtx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(
        from.x + (to.x - from.x) * progress,
        from.y + (to.y - from.y) * progress,
        size * (0.78 + (index % 3) * 0.12),
        0,
        Math.PI * 2
      );
      particleCtx.fill();
    }
  }

  function drawEchoGuide(now) {
    if (
      !particleCtx
      || journeySecrets.active
      || journeySecrets.observatory
      || journeySecrets.ascension
    ) {
      return;
    }
    const well = journeySecrets.wells.find((item) => item.id === journeySecrets.nearbyId);
    if (!well) {
      return;
    }
    const distance = Math.abs(state.x - well.x);
    const opacity = clamp(smooth(clamp(1 - distance / 760, 0, 1)) * 1.08, 0, 0.96);
    const direction = Math.sign(well.x - state.x) || 1;
    const ghostX = well.x - direction * 176 + Math.sin(now * 0.0012) * 7;
    const ghostGround = terrainY(ghostX) - 58;
    const ghost = worldToScreen(ghostX, ghostGround);
    const wellCenter = worldToScreen(well.x, terrainY(well.x) - 4);
    if (ghost.x < -100 || ghost.x > window.innerWidth + 100) {
      return;
    }
    const wellRgb = journeyMemoryColor(well.key);
    const rgb = root.dataset.tone === 'dark' ? [226, 236, 234] : [50, 56, 52];
    const scale = state.scale * 0.72;
    const head = { x: ghost.x, y: ghost.y - 108 * scale };
    particleCtx.save();
    particleCtx.lineCap = 'round';
    particleCtx.fillStyle = root.dataset.tone === 'dark'
      ? `rgba(3, 7, 18, ${(opacity * 0.58).toFixed(3)})`
      : `rgba(255, 255, 255, ${(opacity * 0.78).toFixed(3)})`;
    particleCtx.beginPath();
    particleCtx.ellipse(ghost.x, ghost.y - 62 * scale, 54 * scale, 96 * scale, 0, 0, Math.PI * 2);
    particleCtx.fill();
    for (let index = 0; index < 22; index += 1) {
      const angle = (index / 22) * Math.PI * 2;
      particleCtx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(opacity * 0.74).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(
        head.x + Math.cos(angle) * 15 * scale,
        head.y + Math.sin(angle) * 15 * scale,
        1.7,
        0,
        Math.PI * 2
      );
      particleCtx.fill();
    }
    drawSecretDottedLine(
      { x: ghost.x - 28 * scale, y: head.y - 8 * scale },
      { x: ghost.x + 34 * scale, y: head.y - 12 * scale },
      15,
      rgb,
      opacity * 0.68,
      1.65
    );
    drawSecretDottedLine(
      { x: ghost.x, y: head.y + 16 * scale },
      { x: ghost.x, y: ghost.y - 38 * scale },
      14,
      rgb,
      opacity * 0.7,
      1.7
    );
    drawSecretDottedLine(
      { x: ghost.x, y: ghost.y - 84 * scale },
      { x: ghost.x + direction * 36 * scale, y: ghost.y - 62 * scale },
      9,
      rgb,
      opacity * 0.62,
      1.55
    );
    drawSecretDottedLine(
      { x: ghost.x, y: ghost.y - 40 * scale },
      { x: ghost.x - 18 * scale, y: ghost.y },
      10,
      rgb,
      opacity * 0.68,
      1.65
    );
    drawSecretDottedLine(
      { x: ghost.x, y: ghost.y - 40 * scale },
      { x: ghost.x + 24 * scale, y: ghost.y },
      10,
      rgb,
      opacity * 0.68,
      1.65
    );
    particleCtx.strokeStyle = `rgba(${wellRgb[0]}, ${wellRgb[1]}, ${wellRgb[2]}, ${(opacity * 0.46).toFixed(3)})`;
    particleCtx.lineWidth = 1;
    particleCtx.setLineDash([2, 8]);
    particleCtx.lineDashOffset = -now * 0.012;
    particleCtx.beginPath();
    particleCtx.moveTo(ghost.x + direction * 34 * scale, ghost.y - 62 * scale);
    particleCtx.quadraticCurveTo(
      (ghost.x + wellCenter.x) * 0.5,
      Math.min(ghost.y, wellCenter.y) - 42,
      wellCenter.x,
      wellCenter.y - 18
    );
    particleCtx.stroke();
    particleCtx.setLineDash([]);
    particleCtx.beginPath();
    particleCtx.ellipse(
      wellCenter.x,
      wellCenter.y,
      28 + Math.sin(now * 0.002) * 4,
      9 + Math.cos(now * 0.0017) * 2,
      0,
      0,
      Math.PI * 2
    );
    particleCtx.stroke();
    particleCtx.restore();
  }

  function drawMemoryWell(now) {
    if (!particleCtx) {
      return;
    }
    const active = journeySecrets.active;
    const well = active || journeySecrets.wells.find((item) => item.id === journeySecrets.nearbyId);
    if (!well) {
      return;
    }
    const center = worldToScreen(well.x, terrainY(well.x) - 42);
    const progress = active
      ? clamp((now - active.startedAt) / active.durationMs, 0, 1)
      : 0;
    const strength = active ? Math.sin(progress * Math.PI) : 0.18;
    const keys = Array.from(journeyMemory.collected);
    const time = now * 0.001;
    particleCtx.save();
    particleCtx.lineCap = 'round';
    keys.forEach((key, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const radiusX = 30 + index * 18 + strength * 82;
      const radiusY = 10 + index * 7 + strength * 34;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.08 + strength * 0.32).toFixed(3)})`;
      particleCtx.lineWidth = 0.9 + (index % 3) * 0.3;
      particleCtx.beginPath();
      particleCtx.ellipse(
        center.x,
        center.y,
        radiusX,
        radiusY,
        time * (0.04 + index * 0.006) + index * 0.21,
        0,
        Math.PI * 2
      );
      particleCtx.stroke();
      const angle = -time * (0.42 + index * 0.025) + index;
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.28 + strength * 0.56).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(
        center.x + Math.cos(angle) * radiusX,
        center.y + Math.sin(angle) * radiusY,
        1.6 + strength * 2.6,
        0,
        Math.PI * 2
      );
      particleCtx.fill();
    });
    if (active) {
      particleCtx.strokeStyle = `rgba(104, 106, 116, ${(strength * 0.38).toFixed(3)})`;
      particleCtx.lineWidth = 1;
      for (let index = 0; index < 9; index += 1) {
        const angle = (index / 9) * Math.PI * 2 + time * 0.06;
        particleCtx.beginPath();
        particleCtx.moveTo(
          center.x + Math.cos(angle) * (36 + strength * 42),
          center.y + Math.sin(angle) * (20 + strength * 22)
        );
        particleCtx.lineTo(
          center.x + Math.cos(angle) * (180 + strength * 240),
          center.y + Math.sin(angle) * (82 + strength * 160)
        );
        particleCtx.stroke();
      }
    }
    particleCtx.restore();
  }

  function drawSecretFragments(now, characterScreenX, characterScreenY) {
    if (
      !particleCtx
      || !journeySecrets.fragments.size
      || journeySecrets.observatory
      || journeySecrets.ascension
      || journeySecrets.worldSeedAwake
    ) {
      return;
    }
    const fragments = journeySecrets.wells.filter((well) => journeySecrets.fragments.has(well.id));
    const time = now * 0.001;
    particleCtx.save();
    fragments.forEach((fragment, index) => {
      const [r, g, b] = journeyMemoryColor(fragment.key);
      const x = characterScreenX + state.direction * (54 + index * 22)
        + Math.sin(time * 1.1 + index) * 7;
      const y = characterScreenY - 82 - index * 25
        + Math.cos(time * 1.3 + index) * 6;
      const size = 8 + index * 1.5;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
      particleCtx.lineWidth = 1.4;
      particleCtx.beginPath();
      if (fragment.type === 'root') {
        particleCtx.moveTo(x, y - size);
        particleCtx.lineTo(x + size, y + size * 0.72);
        particleCtx.lineTo(x - size, y + size * 0.72);
        particleCtx.closePath();
      } else if (fragment.type === 'signal') {
        particleCtx.moveTo(x, y - size);
        particleCtx.lineTo(x + size, y);
        particleCtx.lineTo(x, y + size);
        particleCtx.lineTo(x - size, y);
        particleCtx.closePath();
      } else {
        particleCtx.arc(x, y, size, 0, Math.PI * 2);
      }
      particleCtx.stroke();
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.22)`;
      particleCtx.beginPath();
      particleCtx.arc(x, y, size + 6 + Math.sin(time * 1.8 + index) * 2, 0, Math.PI * 2);
      particleCtx.fill();
    });
    particleCtx.restore();
  }

  function drawSecretObservatory(now, characterScreenX, characterScreenY) {
    const active = journeySecrets.observatory;
    if (!particleCtx || !active) {
      return;
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    const align = smooth(clamp(progress / 0.25, 0, 1));
    const aperture = smooth(clamp((progress - 0.2) / 0.42, 0, 1));
    const revelation = smooth(clamp((progress - 0.68) / 0.22, 0, 1));
    const centerX = window.innerWidth * 0.62;
    const centerY = window.innerHeight * 0.38;
    const time = now * 0.001;
    const fragments = journeySecrets.wells.filter((well) => journeySecrets.fragments.has(well.id));
    const fragmentTargets = [
      { x: centerX, y: centerY - 104 },
      { x: centerX + 104, y: centerY + 72 },
      { x: centerX - 104, y: centerY + 72 },
    ];
    particleCtx.save();
    particleCtx.lineCap = 'round';
    fragments.forEach((fragment, index) => {
      const [r, g, b] = journeyMemoryColor(fragment.key);
      const origin = {
        x: characterScreenX + state.direction * (54 + index * 22),
        y: characterScreenY - 82 - index * 25,
      };
      const target = fragmentTargets[index % fragmentTargets.length];
      const x = origin.x + (target.x - origin.x) * align;
      const y = origin.y + (target.y - origin.y) * align;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.38 + aperture * 0.42).toFixed(3)})`;
      particleCtx.lineWidth = 1.6;
      particleCtx.beginPath();
      particleCtx.moveTo(centerX, centerY);
      particleCtx.lineTo(x, y);
      particleCtx.stroke();
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.82)`;
      particleCtx.beginPath();
      particleCtx.arc(x, y, 4 + aperture * 3, 0, Math.PI * 2);
      particleCtx.fill();
      particleCtx.beginPath();
      particleCtx.arc(x, y, 12 + aperture * 6, 0, Math.PI * 2);
      particleCtx.stroke();
    });

    const keys = Array.from(journeyMemory.collected);
    keys.forEach((key, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const phase = (index / Math.max(1, keys.length)) * Math.PI * 2;
      const radiusX = 136 + index * 34 * aperture;
      const radiusY = 62 + index * 18 * aperture;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(aperture * 0.32).toFixed(3)})`;
      particleCtx.lineWidth = 1;
      particleCtx.beginPath();
      particleCtx.ellipse(centerX, centerY, radiusX, radiusY, phase * 0.34 + time * 0.025, 0, Math.PI * 2);
      particleCtx.stroke();
      const orbit = time * (0.2 + index * 0.018) + phase;
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.36 + aperture * 0.5).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(
        centerX + Math.cos(orbit) * radiusX,
        centerY + Math.sin(orbit) * radiusY,
        2.2 + aperture * 2.8,
        0,
        Math.PI * 2
      );
      particleCtx.fill();
    });

    if (revelation > 0) {
      particleCtx.strokeStyle = `rgba(127, 214, 229, ${(revelation * 0.54).toFixed(3)})`;
      particleCtx.lineWidth = 1.8;
      particleCtx.beginPath();
      particleCtx.moveTo(characterScreenX + 24, characterScreenY - 112);
      particleCtx.lineTo(centerX, centerY);
      particleCtx.lineTo(window.innerWidth * 0.92, window.innerHeight * 0.08);
      particleCtx.stroke();
      for (let index = 0; index < 18; index += 1) {
        const angle = (index / 18) * Math.PI * 2 + time * 0.03;
        const radius = 84 + revelation * (70 + (index % 5) * 24);
        const key = keys[index % keys.length];
        const [r, g, b] = journeyMemoryColor(key);
        particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(revelation * 0.7).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.arc(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius * 0.58,
          1.4 + (index % 4) * 0.55,
          0,
          Math.PI * 2
        );
        particleCtx.fill();
      }
    }
    particleCtx.restore();
  }

  function traceSecretFragment(type, x, y, size) {
    particleCtx.beginPath();
    if (type === 'root') {
      particleCtx.moveTo(x, y - size);
      particleCtx.lineTo(x + size, y + size * 0.72);
      particleCtx.lineTo(x - size, y + size * 0.72);
      particleCtx.closePath();
    } else if (type === 'signal') {
      particleCtx.moveTo(x, y - size);
      particleCtx.lineTo(x + size, y);
      particleCtx.lineTo(x, y + size);
      particleCtx.lineTo(x - size, y);
      particleCtx.closePath();
    } else {
      particleCtx.arc(x, y, size, 0, Math.PI * 2);
    }
  }

  function drawSecretAscension(now, characterScreenX, characterScreenY) {
    const active = journeySecrets.ascension;
    if (!particleCtx || !active) {
      return;
    }
    const progress = clamp((now - active.startedAt) / active.durationMs, 0, 1);
    const time = now * 0.001;
    const keys = Array.from(journeyMemory.collected);
    const fragments = journeySecrets.wells.filter((well) => journeySecrets.fragments.has(well.id));
    const center = {
      x: window.innerWidth * 0.58,
      y: window.innerHeight * 0.38,
    };
    const characterCenterY = characterScreenY - CHARACTER_H * state.scale * 0.5;
    const pocketWorldGap = clamp(window.innerWidth * 0.25, 320, 440);
    const worldCenter = {
      x: clamp(characterScreenX + pocketWorldGap, window.innerWidth * 0.62, window.innerWidth * 0.8),
      y: clamp(
        characterCenterY - clamp(window.innerHeight * 0.11, 84, 120),
        window.innerHeight * 0.24,
        window.innerHeight * 0.4
      ),
    };
    const pocketWorldX = `${((worldCenter.x / Math.max(1, window.innerWidth)) * 100).toFixed(1)}%`;
    const pocketWorldY = `${((worldCenter.y / Math.max(1, window.innerHeight)) * 100).toFixed(1)}%`;
    if (renderCache.pocketWorldX !== pocketWorldX) {
      renderCache.pocketWorldX = pocketWorldX;
      root.style.setProperty('--pocket-world-x', pocketWorldX);
    }
    if (renderCache.pocketWorldY !== pocketWorldY) {
      renderCache.pocketWorldY = pocketWorldY;
      root.style.setProperty('--pocket-world-y', pocketWorldY);
    }
    const fusion = smooth(clamp(progress / 0.15, 0, 1));
    const rupture = smooth(clamp((progress - 0.12) / 0.18, 0, 1))
      * (1 - smooth(clamp((progress - 0.56) / 0.16, 0, 1)));
    const launch = smooth(clamp((progress - 0.28) / 0.2, 0, 1))
      * (1 - smooth(clamp((progress - 0.55) / 0.12, 0, 1)));
    const worldStrength = smooth(clamp((progress - 0.5) / 0.13, 0, 1))
      * (1 - smooth(clamp((progress - 0.79) / 0.13, 0, 1)));
    const returning = smooth(clamp((progress - 0.76) / 0.24, 0, 1));

    particleCtx.save();
    particleCtx.lineCap = 'round';
    particleCtx.lineJoin = 'round';

    const starStrength = clamp(rupture * 0.5 + launch + worldStrength + returning * 0.8, 0, 1);
    for (let index = 0; index < 72; index += 1) {
      const key = keys[index % keys.length];
      const [r, g, b] = journeyMemoryColor(key);
      const laneX = ((index * 137.3) % Math.max(1, window.innerWidth))
        + Math.sin(time * 0.4 + index) * 12;
      const drift = launch * time * (70 + (index % 7) * 18);
      const laneY = ((index * 83.7 + drift) % (window.innerHeight + 100)) - 50;
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(starStrength * (0.18 + (index % 5) * 0.055)).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(laneX, laneY, 0.8 + (index % 4) * 0.45, 0, Math.PI * 2);
      particleCtx.fill();
    }

    fragments.forEach((fragment, index) => {
      const [r, g, b] = journeyMemoryColor(fragment.key);
      const origin = {
        x: characterScreenX + state.direction * (54 + index * 22),
        y: characterScreenY - 82 - index * 25,
      };
      const targetAngle = -Math.PI / 2 + (index / Math.max(1, fragments.length)) * Math.PI * 2;
      const target = {
        x: center.x + Math.cos(targetAngle) * (42 - fusion * 24),
        y: center.y + Math.sin(targetAngle) * (42 - fusion * 24),
      };
      const x = origin.x + (target.x - origin.x) * fusion;
      const y = origin.y + (target.y - origin.y) * fusion;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.34 + fusion * 0.58).toFixed(3)})`;
      particleCtx.lineWidth = 1.5;
      traceSecretFragment(fragment.type, x, y, 9 + fusion * 3);
      particleCtx.stroke();
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(fusion * 0.3).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.moveTo(x, y);
      particleCtx.lineTo(center.x, center.y);
      particleCtx.stroke();
    });

    if (fusion > 0.4) {
      const pulse = 1 + Math.sin(time * 4.2) * 0.08;
      keys.forEach((key, index) => {
        const [r, g, b] = journeyMemoryColor(key);
        const angle = time * (0.32 + index * 0.025) + (index / keys.length) * Math.PI * 2;
        const radiusX = (24 + index * 7) * pulse;
        const radiusY = radiusX * 0.56;
        particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(fusion * 0.18).toFixed(3)})`;
        particleCtx.lineWidth = 0.8;
        particleCtx.beginPath();
        particleCtx.ellipse(center.x, center.y, radiusX, radiusY, angle * 0.14, 0, Math.PI * 2);
        particleCtx.stroke();
        particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(fusion * 0.82).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.arc(
          center.x + Math.cos(angle) * radiusX,
          center.y + Math.sin(angle) * radiusY,
          1.8 + (index % 3) * 0.55,
          0,
          Math.PI * 2
        );
        particleCtx.fill();
      });
      particleCtx.fillStyle = `rgba(246, 250, 248, ${(fusion * 0.9).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(center.x, center.y, 4 + fusion * 4, 0, Math.PI * 2);
      particleCtx.fill();
    }

    if (rupture > 0) {
      const slitHeight = window.innerHeight * (0.12 + rupture * 0.92);
      const slitWidth = 8 + rupture * 76;
      for (let index = 0; index < 7; index += 1) {
        const key = keys[index % keys.length];
        const [r, g, b] = journeyMemoryColor(key);
        const offset = (index - 3) * slitWidth * 0.12;
        particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(rupture * (0.28 + index * 0.045)).toFixed(3)})`;
        particleCtx.lineWidth = index === 3 ? 2.2 : 0.8;
        particleCtx.beginPath();
        particleCtx.moveTo(center.x + offset, center.y - slitHeight * 0.55);
        particleCtx.bezierCurveTo(
          center.x - offset * 0.5,
          center.y - slitHeight * 0.18,
          center.x + offset * 0.7,
          center.y + slitHeight * 0.2,
          center.x - offset,
          center.y + slitHeight * 0.55
        );
        particleCtx.stroke();
      }
      for (let index = 0; index < 30; index += 1) {
        const y = center.y - slitHeight * 0.5 + (index / 29) * slitHeight;
        const side = index % 2 ? -1 : 1;
        particleCtx.fillStyle = `rgba(235, 248, 247, ${(rupture * (0.42 + (index % 4) * 0.11)).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.arc(
          center.x + side * (2 + Math.sin(time * 2 + index) * slitWidth * 0.16),
          y,
          0.9 + (index % 3) * 0.45,
          0,
          Math.PI * 2
        );
        particleCtx.fill();
      }
    }

    if (launch > 0) {
      const tunnelCenterX = characterScreenX + (center.x - characterScreenX) * 0.28;
      for (let index = 0; index < 12; index += 1) {
        const travel = (time * (0.45 + launch * 1.3) + index / 12) % 1;
        const radiusX = 28 + travel * window.innerWidth * 0.34;
        const radiusY = 9 + travel * window.innerHeight * 0.16;
        const key = keys[index % keys.length];
        const [r, g, b] = journeyMemoryColor(key);
        particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(launch * (1 - travel) * 0.42).toFixed(3)})`;
        particleCtx.lineWidth = 0.8 + (1 - travel) * 1.2;
        particleCtx.beginPath();
        particleCtx.ellipse(tunnelCenterX, characterScreenY - 72, radiusX, radiusY, 0, 0, Math.PI * 2);
        particleCtx.stroke();
      }
      for (let index = 0; index < 26; index += 1) {
        const x = ((index * 97) % window.innerWidth) + Math.sin(index) * 18;
        const y = ((index * 59 + time * 520) % (window.innerHeight + 180)) - 90;
        particleCtx.strokeStyle = `rgba(230, 243, 242, ${(launch * (0.12 + (index % 5) * 0.045)).toFixed(3)})`;
        particleCtx.lineWidth = 0.8 + (index % 3) * 0.3;
        particleCtx.beginPath();
        particleCtx.moveTo(x, y - 18 - launch * 54);
        particleCtx.lineTo(x, y + 18 + launch * 54);
        particleCtx.stroke();
      }
    }

    if (worldStrength > 0) {
      const radius = 28 + worldStrength * 82;
      particleCtx.fillStyle = `rgba(3, 7, 18, ${(worldStrength * 0.7).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(worldCenter.x, worldCenter.y, radius + 7, 0, Math.PI * 2);
      particleCtx.fill();
      for (let index = 0; index < 104; index += 1) {
        const key = keys[index % keys.length];
        const [r, g, b] = journeyMemoryColor(key);
        const angle = index * 2.399963 + time * 0.025;
        const latitude = Math.sin(index * 1.73) * 0.72;
        const px = worldCenter.x + Math.cos(angle) * radius * Math.cos(latitude);
        const py = worldCenter.y + latitude * radius;
        const front = 0.46 + Math.cos(angle) * 0.34;
        particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(worldStrength * front).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.arc(px, py, 1 + (index % 5) * 0.38, 0, Math.PI * 2);
        particleCtx.fill();
      }
      keys.forEach((key, index) => {
        const [r, g, b] = journeyMemoryColor(key);
        const orbitX = radius + 38 + index * 20;
        const orbitY = orbitX * (0.32 + (index % 3) * 0.06);
        const angle = time * (0.22 + index * 0.018) + index * 0.8;
        particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(worldStrength * 0.2).toFixed(3)})`;
        particleCtx.lineWidth = 0.8;
        particleCtx.beginPath();
        particleCtx.ellipse(worldCenter.x, worldCenter.y, orbitX, orbitY, index * 0.18, 0, Math.PI * 2);
        particleCtx.stroke();
        particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(worldStrength * 0.82).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.arc(
          worldCenter.x + Math.cos(angle) * orbitX,
          worldCenter.y + Math.sin(angle) * orbitY,
          2 + (index % 3),
          0,
          Math.PI * 2
        );
        particleCtx.fill();
      });
      particleCtx.strokeStyle = `rgba(236, 248, 246, ${(worldStrength * 0.48).toFixed(3)})`;
      particleCtx.lineWidth = 1.3;
      particleCtx.beginPath();
      particleCtx.arc(worldCenter.x, worldCenter.y, radius, 0, Math.PI * 2);
      particleCtx.stroke();
    }

    if (returning > 0) {
      const target = { x: characterScreenX, y: characterScreenY - 58 };
      const start = { x: window.innerWidth * 1.05, y: -80 };
      const control = { x: window.innerWidth * 0.78, y: window.innerHeight * 0.16 };
      for (let index = 0; index < 32; index += 1) {
        const trail = clamp(returning - index * 0.018, 0, 1);
        const point = quadraticPoint(start, control, target, trail);
        const key = keys[index % keys.length];
        const [r, g, b] = journeyMemoryColor(key);
        particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(returning * (1 - index / 40) * 0.76).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.arc(
          point.x + Math.sin(index * 2.2) * (1 - trail) * 8,
          point.y + Math.cos(index * 1.7) * (1 - trail) * 6,
          1.2 + (1 - index / 32) * 4.2,
          0,
          Math.PI * 2
        );
        particleCtx.fill();
      }
      particleCtx.strokeStyle = `rgba(240, 250, 248, ${(returning * 0.58).toFixed(3)})`;
      particleCtx.lineWidth = 1.4;
      particleCtx.beginPath();
      particleCtx.moveTo(start.x, start.y);
      particleCtx.quadraticCurveTo(control.x, control.y, target.x, target.y);
      particleCtx.stroke();
    }
    particleCtx.restore();
  }

  function drawWorldSeed(now, characterScreenX, characterScreenY) {
    if (!particleCtx || !journeySecrets.worldSeedAwake || journeySecrets.ascension) {
      return;
    }
    const time = now * 0.001;
    const keys = Array.from(journeyMemory.collected);
    particleCtx.save();
    particleCtx.lineCap = 'round';
    particleCtx.lineJoin = 'round';

    journeySecrets.seedWake.forEach((wake, index) => {
      const progress = clamp((now - wake.bornAt) / 2400, 0, 1);
      const grow = smooth(clamp(progress / 0.24, 0, 1));
      const fade = 1 - smooth(clamp((progress - 0.58) / 0.42, 0, 1));
      const alpha = grow * fade;
      const point = worldToScreen(wake.x, terrainY(wake.x));
      const [r, g, b] = journeyMemoryColor(wake.key);
      const height = (12 + (index % 5) * 4) * grow;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.46).toFixed(3)})`;
      particleCtx.lineWidth = 1;
      particleCtx.beginPath();
      particleCtx.moveTo(point.x, point.y);
      particleCtx.lineTo(point.x + wake.twist * 3, point.y - height);
      if (index % 3 === 0) {
        particleCtx.lineTo(point.x - 5, point.y - height - 5);
        particleCtx.moveTo(point.x + wake.twist * 3, point.y - height);
        particleCtx.lineTo(point.x + 6, point.y - height - 3);
      } else if (index % 3 === 1) {
        particleCtx.lineTo(point.x + 7, point.y - height);
        particleCtx.lineTo(point.x + 7, point.y - height - 6);
      } else {
        particleCtx.arc(point.x + wake.twist * 3, point.y - height - 4, 5, 0, Math.PI * 2);
      }
      particleCtx.stroke();
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.68).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(point.x + wake.twist * 3, point.y - height, 1.3 + grow, 0, Math.PI * 2);
      particleCtx.fill();
    });

    const centerX = characterScreenX - state.direction * 62 + Math.sin(time * 1.4) * 6;
    const centerY = characterScreenY - 132 + Math.cos(time * 1.6) * 7;
    keys.forEach((key, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const angle = time * (0.4 + index * 0.025) + (index / keys.length) * Math.PI * 2;
      const radiusX = 17 + index * 3.4;
      const radiusY = radiusX * 0.52;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.13)`;
      particleCtx.lineWidth = 0.7;
      particleCtx.beginPath();
      particleCtx.ellipse(centerX, centerY, radiusX, radiusY, index * 0.08, 0, Math.PI * 2);
      particleCtx.stroke();
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.76)`;
      particleCtx.beginPath();
      particleCtx.arc(
        centerX + Math.cos(angle) * radiusX,
        centerY + Math.sin(angle) * radiusY,
        1.4 + (index % 3) * 0.45,
        0,
        Math.PI * 2
      );
      particleCtx.fill();
    });
    particleCtx.strokeStyle = root.dataset.tone === 'dark'
      ? 'rgba(242, 250, 248, 0.78)'
      : 'rgba(55, 68, 62, 0.64)';
    particleCtx.lineWidth = 1.2;
    traceSecretFragment('signal', centerX, centerY, 5.5);
    particleCtx.stroke();
    particleCtx.fillStyle = root.dataset.tone === 'dark'
      ? 'rgba(238, 250, 248, 0.74)'
      : 'rgba(255, 255, 255, 0.82)';
    particleCtx.beginPath();
    particleCtx.arc(centerX, centerY, 2.4, 0, Math.PI * 2);
    particleCtx.fill();
    particleCtx.restore();
  }

  function drawJourneySecrets(now, characterScreenX, characterScreenY) {
    drawEchoGuide(now);
    drawMemoryWell(now);
    drawSecretFragments(now, characterScreenX, characterScreenY);
    drawSecretObservatory(now, characterScreenX, characterScreenY);
    drawSecretAscension(now, characterScreenX, characterScreenY);
    drawWorldSeed(now, characterScreenX, characterScreenY);
  }

  function collectJourneyMemory(key) {
    if (!key || journeyMemory.collected.has(key)) {
      return;
    }
    journeyMemory.collected.add(key);
    root.dataset.memoryCount = String(journeyMemory.collected.size);
    const [r, g, b] = journeyMemoryColor(key);
    const origin = worldToScreen(state.x, state.y - 74);
    emitParticles(26, (index) => {
      const angle = (index / 26) * Math.PI * 2;
      return {
        x: origin.x + Math.cos(angle) * rand(12, 42),
        y: origin.y + Math.sin(angle) * rand(8, 34),
        vx: Math.cos(angle) * rand(0.025, 0.11),
        vy: Math.sin(angle) * rand(0.02, 0.09) - 0.04,
        size: rand(1.2, 3.2),
        life: rand(620, 1100),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.34, 0.62).toFixed(2)})`,
        type: index % 8 === 0 ? 'ring' : 'spark',
      };
    });
  }

  function emitArticleDiscoveryLanding(key) {
    if (motionReduced || !key || !particleCtx) {
      return 0;
    }
    const count = runtime.articleLandingParticleCount(renderQuality.mode);
    const [r, g, b] = journeyMemoryColor(key);
    const shapeWorld = runtime.particleWorldForStage(key);
    const origin = worldToScreen(state.x, state.y - 2);
    emitParticles(count, (index) => {
      const direction = index % 2 === 0 ? -1 : 1;
      return {
        x: origin.x + direction * rand(3, 12) * state.scale,
        y: origin.y - rand(0, 4) * state.scale,
        vx: direction * rand(0.075, 0.17) * state.scale,
        vy: -rand(0.035, 0.1) * state.scale,
        ay: rand(0.0002, 0.00032) * state.scale,
        size: rand(1.5, 3) * state.scale,
        life: rand(360, 500),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.56, 0.84).toFixed(2)})`,
        type: index % 7 === 0 ? 'spark' : 'bit',
        spin: rand(-0.006, 0.006),
        effectScope: ARTICLE_LANDING_PARTICLE_SCOPE,
        shapeWorld,
        shapeLanguage: true,
        shapeAmbient: false,
        shapeSample: index / count,
      };
    });
    return count;
  }

  function updateArticleDiscoveryLanding(now) {
    if (
      !journeyDiscovery.jumpUntil
      || journeyDiscovery.jumpImpactEmitted
      || now < journeyDiscovery.jumpImpactAt
    ) {
      return;
    }
    journeyDiscovery.jumpImpactEmitted = true;
    emitArticleDiscoveryLanding(journeyDiscovery.areaKey);
  }

  function journeyDiscoveryCandidate() {
    if (
      !isJourneyMode
      || journeyTransition.active
      || journeyMoment.active
      || journeyReturn.active
      || journeyAwakening.orchestra
      || journeySecrets.active
      || journeySecrets.observatory
      || journeySecrets.ascension
      || !journey?.moments
    ) {
      return null;
    }
    const stage = state.journeyStage || journey.stageAt(state.x);
    if (stage === 'moss' || stage === 'hub') {
      return null;
    }
    const moment = journey.moments.find((item) => item.stage === stage);
    const area = areaMap.get(stage);
    const completedAt = moment ? journeyMoment.completedAt.get(moment.id) : 0;
    const discoveryCenter = moment
      ? journeyMoment.completedX.get(moment.id) ?? moment.triggerX + 240
      : 0;
    if (
      !moment
      || !area
      || !completedAt
      || clock.now() - completedAt < 180
      || Math.abs(state.x - discoveryCenter) > 760
    ) {
      return null;
    }
    return { area, moment };
  }

  function closeJourneyDiscovery(options = {}) {
    const restoreFocus = options.restoreFocus === true;
    if (journeyDiscovery.areaKey) {
      if (options.memorySeed !== false) {
        releaseArticleMemorySeed(journeyDiscoveryNode, journeyDiscovery.areaKey);
      }
      journeyDiscovery.returningKey = journeyDiscovery.areaKey;
      journeyDiscovery.closedAtTime = clock.now();
    }
    journeyDiscovery.areaKey = '';
    journeyDiscovery.jumpUntil = 0;
    journeyDiscovery.jumpImpactAt = 0;
    journeyDiscovery.jumpImpactEmitted = false;
    cancelDiscoveryTitleTypography();
    journeyDiscoveryNode.classList.remove('is-visible');
    journeyDiscoveryNode.setAttribute('aria-hidden', 'true');
    journeyDiscoveryNode.inert = true;
    delete root.dataset.journeyDiscovery;
    if (options.announce !== false) {
      announceStatus(walkingStatus());
    }
    if (restoreFocus) {
      root.focus({ preventScroll: true });
    }
  }

  function emitJourneyDiscovery(area, moment) {
    const points = journeyMomentShape(moment.type);
    const palette = journeyMomentPalette(moment.type);
    const centerX = window.innerWidth * 0.7;
    const centerY = window.innerHeight * 0.28;
    const origin = worldToScreen(state.x, state.y - 72);
    const stride = Math.max(1, Math.ceil(points.length / 56));
    const formationPoints = points.filter((_, index) => index % stride === 0);
    emitParticles(formationPoints.length, (index) => {
      const [px, py] = formationPoints[index];
      const [r, g, b] = palette[index % palette.length];
      return {
        x: origin.x + rand(-24, 24),
        y: origin.y + rand(-24, 24),
        targetX: centerX + px * 0.48,
        targetY: centerY + py * 0.48,
        targetAttract: 0.00018,
        targetDamping: 0.79,
        size: rand(1.2, 2.8),
        life: rand(1300, 1800),
        color: `rgba(${r}, ${g}, ${b}, ${rand(0.32, 0.62).toFixed(2)})`,
        type: index % 13 === 0 ? 'spark' : 'bit',
      };
    });
  }

  function wrapTitleForCanvas(ctx, text, maxWidth) {
    const chars = Array.from(String(text || '').trim());
    const linesOut = [];
    let line = '';
    chars.forEach((char) => {
      const next = line + char;
      if (line && ctx.measureText(next).width > maxWidth) {
        linesOut.push(line);
        line = char;
      } else {
        line = next;
      }
    });
    if (line) {
      linesOut.push(line);
    }
    return linesOut.slice(0, 4);
  }

  function sampleDiscoveryTitleGlyphs(title, titleNode, options = {}) {
    if (!titleGlyphCtx || !title || !titleNode) {
      return [];
    }
    const rect = titleNode.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (width < 12 || height < 12) {
      return [];
    }
    const computed = window.getComputedStyle(titleNode);
    const fontSize = parseFloat(computed.fontSize) || 22;
    const lineHeight = parseFloat(computed.lineHeight) || fontSize * 1.48;
    const paddingX = 3;
    const paddingY = 4;
    titleGlyphCanvas.width = width + paddingX * 2;
    titleGlyphCanvas.height = height + paddingY * 2;
    titleGlyphCtx.clearRect(0, 0, titleGlyphCanvas.width, titleGlyphCanvas.height);
    titleGlyphCtx.fillStyle = '#000';
    titleGlyphCtx.font = computed.font || `${computed.fontWeight || 500} ${fontSize}px ${computed.fontFamily || 'sans-serif'}`;
    titleGlyphCtx.textBaseline = 'top';
    titleGlyphCtx.letterSpacing = computed.letterSpacing || '0px';
    const linesOut = wrapTitleForCanvas(titleGlyphCtx, title, width);
    linesOut.forEach((line, index) => {
      titleGlyphCtx.fillText(line, paddingX, paddingY + index * lineHeight);
    });

    const image = titleGlyphCtx.getImageData(0, 0, titleGlyphCanvas.width, titleGlyphCanvas.height).data;
    const step = options.step || 4;
    const allPoints = [];
    for (let y = paddingY; y < titleGlyphCanvas.height - paddingY; y += step) {
      for (let x = paddingX; x < titleGlyphCanvas.width - paddingX; x += step) {
        const alpha = image[(y * titleGlyphCanvas.width + x) * 4 + 3];
        if (alpha > 110) {
          allPoints.push({
            x: rect.left + x - paddingX,
            y: rect.top + y - paddingY,
            localX: x - paddingX,
            alpha: alpha / 255,
          });
        }
      }
    }
    const limit = Math.max(1, options.limit || allPoints.length);
    if (allPoints.length <= limit) {
      return allPoints;
    }
    const stride = allPoints.length / limit;
    return Array.from({ length: limit }, (_, index) => allPoints[Math.floor(index * stride)]);
  }

  function discoveryTitleOrigin(areaKey, point, origin) {
    const rectLeft = journeyDiscoveryTitle.getBoundingClientRect().left;
    if (areaKey === 'taupe') {
      const lane = Math.round(point.y / 18) * 18;
      return {
        x: rectLeft - rand(130, 320),
        y: lane + rand(-1.5, 1.5),
        vx: rand(0.09, 0.16),
        vy: rand(-0.012, 0.012),
      };
    }
    if (areaKey === 'ojicra') {
      return {
        x: point.x + rand(-190, 190),
        y: point.y - rand(140, 310),
        vx: rand(-0.02, 0.02),
        vy: rand(0.08, 0.16),
      };
    }
    if (areaKey === 'islog') {
      return {
        x: point.x - rand(90, 280),
        y: point.y + rand(-80, 70),
        vx: rand(0.05, 0.12),
        vy: rand(-0.04, 0.04),
      };
    }
    if (areaKey === 'monoomoi') {
      const angle = rand(Math.PI * 0.15, Math.PI * 0.85);
      return {
        x: point.x + Math.cos(angle) * rand(110, 260),
        y: point.y + Math.sin(angle) * rand(70, 190),
        vx: rand(-0.04, 0.04),
        vy: rand(-0.14, -0.06),
      };
    }
    return {
      x: origin.x + rand(-40, 44),
      y: origin.y + rand(-44, 22),
      vx: rand(-0.03, 0.03),
      vy: rand(-0.09, -0.02),
    };
  }

  function emitDiscoveryTitleTypography(area, article) {
    cancelDiscoveryTitleTypography();
    if (motionReduced || !particleCtx || !area || !article?.title) {
      return 0;
    }
    const limit = runtime.discoveryTitleParticleLimit(renderQuality.mode, article.title.length);
    const points = sampleDiscoveryTitleGlyphs(article.title, journeyDiscoveryTitle, {
      step: renderQuality.mode === 'high' ? 4 : renderQuality.mode === 'medium' ? 5 : 7,
      limit,
    });
    if (!points.length) {
      return 0;
    }
    const world = runtime.particleWorldForStage(area.key);
    const palette = journeyMemoryColor(area.key);
    const origin = worldToScreen(state.x, state.y - 86);
    const formationSerial = ++discoveryTitleFormationSerial;
    journeyDiscoveryNode.classList.add('is-forming-title');
    window.setTimeout(() => {
      if (
        journeyDiscovery.areaKey === area.key
        && discoveryTitleFormationSerial === formationSerial
      ) {
        journeyDiscoveryNode.classList.remove('is-forming-title');
      }
    }, renderQuality.mode === 'low' ? 460 : 980);

    emitParticles(points.length, (index, particle) => {
      const point = points[index];
      const start = discoveryTitleOrigin(area.key, point, origin);
      const delay = (point.localX / Math.max(1, journeyDiscoveryTitle.offsetWidth)) * 620 + rand(0, 250);
      const alpha = clamp(0.24 + point.alpha * 0.42, 0.24, 0.72);
      particle.x = start.x;
      particle.y = start.y;
      particle.vx = start.vx;
      particle.vy = start.vy;
      particle.targetX = point.x + rand(-0.8, 0.8);
      particle.targetY = point.y + rand(-0.8, 0.8);
      particle.targetAttract = area.key === 'taupe' ? 0.00028 : 0.00022;
      particle.targetDamping = area.key === 'taupe' ? 0.72 : 0.76;
      particle.targetDelay = delay;
      particle.targetBornAt = clock.now();
      particle.textLockAfter = delay + 680;
      particle.effectScope = DISCOVERY_TITLE_PARTICLE_SCOPE;
      particle.size = renderQuality.mode === 'low' ? rand(1.1, 1.8) : rand(1.2, 2.3);
      particle.life = delay + rand(1250, 1820);
      particle.color = `rgba(${palette[0]}, ${palette[1]}, ${palette[2]}, ${alpha.toFixed(2)})`;
      particle.type = area.key === 'islog' ? 'dash' : index % 11 === 0 ? 'spark' : 'bit';
      particle.shapeWorld = world;
      particle.shapeLanguage = true;
      particle.shapeAmbient = false;
      particle.shapeSample = (index % 97) / 97;
      particle.shapePhase = rand(0, Math.PI * 2);
      particle.spin = rand(-0.006, 0.006);
      return particle;
    }, {
      defer: true,
      maxPerFrame: 20,
      minimumFrames: renderQuality.mode === 'high' ? 6 : 4,
      qualityScale: false,
      scope: DISCOVERY_TITLE_PARTICLE_SCOPE,
    });
    particleBurstState.lastTitleFormAt = clock.now();
    particleBurstState.lastTitleFormCount = points.length;
    return points.length;
  }

  function showJourneyDiscovery(area, moment) {
    const articles = area.articles?.length
      ? area.articles
      : [{ title: isEnglish ? `Visit ${area.name}` : `${area.name}を見にいく`, url: area.url }];
    const index = journey.nextDiscoveryIndex(
      journeyDiscovery.indexes.get(area.key),
      articles.length
    );
    journeyDiscovery.indexes.set(area.key, index);
    const article = articles[index];
    journeyDiscovery.areaKey = area.key;
    journeyDiscovery.openedAtX = state.x;
    journeyDiscovery.openedAtTime = clock.now();
    journeyDiscovery.returningKey = '';
    journeyDiscovery.closedAtTime = 0;
    const firstDiscovery = !journeyDiscovery.found.has(area.key);
    const jumpStartedAt = clock.now();
    journeyDiscovery.jumpUntil = runtime.articleDiscoveryShouldJump({
      motionReduced,
      hasAsset: Boolean(assets.jump),
    })
      ? jumpStartedAt + ARTICLE_DISCOVERY_JUMP_MS
      : 0;
    journeyDiscovery.jumpImpactAt = journeyDiscovery.jumpUntil
      ? jumpStartedAt + ARTICLE_DISCOVERY_LANDING_MS
      : 0;
    journeyDiscovery.jumpImpactEmitted = false;
    const mediaIntro = firstDiscovery ? (area.role || area.title || '') : '';
    recordJourneyDiscovery(area.key);
    journeyDiscoveryKicker.textContent = `${area.name} / ${uiCopy.discoveryKicker} ${index + 1} / ${articles.length}`;
    journeyDiscoveryIntro.textContent = mediaIntro;
    journeyDiscoveryNode.classList.toggle('has-intro', Boolean(mediaIntro));
    journeyDiscoveryTitle.textContent = article.title;
    journeyDiscoveryTitle.lang = article.language || (isEnglish ? 'ja' : '');
    journeyDiscoveryLink.href = article.url || area.url;
    journeyDiscoveryLink.lang = article.language || (isEnglish ? 'ja' : '');
    prepareArticleMemoryImage(journeyDiscoveryNode, journeyDiscoveryImage, article.image);
    syncArticleLinkAccessibility(journeyDiscoveryLink, article.title);
    syncJourneyDiscoveryControlCopy();
    journeyDiscoveryNode.dataset.world = area.key;
    journeyDiscoveryNode.setAttribute('aria-hidden', 'false');
    journeyDiscoveryNode.inert = false;
    root.dataset.journeyDiscovery = area.key;
    journeyDiscoveryNode.classList.add('is-visible');
    announceStatus(isEnglish
      ? touchInstructions(
        `${mediaIntro ? `${area.name}. ${mediaIntro}. ` : ''}You found a Japanese-language article. Press Enter to open it, Space for another, or Escape to return to the world.`,
        `${mediaIntro ? `${area.name}. ${mediaIntro}. ` : ''}You found a Japanese-language article. Tap it to open, use the bottom-right control for another, or walk away to return to the world.`
      )
      : touchInstructions(
        `${mediaIntro ? `${area.name}。${mediaIntro}。` : ''}記事を発見しました。Enterキーで開き、Spaceキーでもう一件、Escapeキーで世界へ戻れます。`,
        `${mediaIntro ? `${area.name}。${mediaIntro}。` : ''}記事を発見しました。記事をタップして開くか、右下のボタンでもう一件表示できます。左右へ歩くと世界へ戻ります。`
      ));
    lockMovementUntilRelease();
    state.vx = 0;
    state.action = area.event;
    state.actionUntil = clock.now() + 1100;
    touched.add(area.key);
    if (journeyDiscovery.jumpUntil) {
      clearCharacterTouch();
    } else {
      triggerCharacterTouch();
    }
    collectJourneyMemory(area.key);
    if (journeyMemory.finalized) {
      syncJourneyMemoryCompletion();
    }
    emitJourneyDiscovery(area, moment);
    emitDiscoveryTitleTypography(area, article);
    audio?.note(area.key, { duration: 0.72, gain: 0.031 });
    triggerParticleFlash(520);
    requestAnimationFrame(() => journeyDiscoveryLink.focus({ preventScroll: true }));
  }

  function journeyInteract() {
    if (
      journeyAwakening.orchestra
      || journeySecrets.observatory
      || journeySecrets.ascension
    ) {
      return true;
    }
    const stage = state.journeyStage || journey.stageAt(state.x);
    if (stage === 'hub' && journeyMemory.finalized) {
      if (!livingAtlasVisited) {
        return true;
      } else if (canBeginSecretAscension()) {
        beginSecretAscension();
      } else if (journeySecrets.ascensionReadyAt > 0) {
        return true;
      } else if (canBeginSecretObservatory()) {
        beginSecretObservatory();
      } else if (journeySecrets.observatoryReadyAt > 0) {
        return true;
      } else if (journeyMemory.portalReady) {
        if (canEnterMemoryPortal()) {
          beginMemoryReturn();
        }
      } else if (canReplayJourneyMemory()) {
        replayJourneyMemory();
      }
      return true;
    }
    const candidate = journeyDiscoveryCandidate();
    if (!candidate) {
      return false;
    }
    showJourneyDiscovery(candidate.area, candidate.moment);
    return true;
  }

  function updateJourneyDiscoveryHint(screenX, screenY) {
    const candidate = journeyDiscoveryCandidate();
    const hubMemoryActionReady = livingAtlasVisited && (
      canBeginSecretAscension()
      || canBeginSecretObservatory()
      || (journeyMemory.portalReady ? canEnterMemoryPortal() : canReplayJourneyMemory())
    );
    const hubReplayVisible = (
      (state.journeyStage || journey.stageAt(state.x)) === 'hub'
      && hubMemoryActionReady
      && !journeyMemory.replayStartedAt
      && !journeyMoment.active
      && !journeyTransition.active
      && !journeyAwakening.orchestra
      && !journeySecrets.active
      && !journeySecrets.observatory
      && !journeySecrets.ascension
    );
    const visible = root.dataset.atlasApproach === 'hidden' && ((
      Boolean(candidate)
      && !journeyDiscovery.areaKey
      && !journeyMoment.active
      && !journeyInteractionIsCinematic()
    ) || hubReplayVisible);
    journeySpaceHint.classList.toggle('is-visible', visible);
    if (visible !== accessibilityState.journeyHint) {
      const wasVisible = accessibilityState.journeyHint;
      accessibilityState.journeyHint = visible;
      if (visible) {
        announceStatus(isEnglish
          ? touchInstructions('There is something to explore here. Press Space.', uiCopy.actionStatus)
          : touchInstructions('操作できる場所です。Spaceキーを押してください。', uiCopy.actionStatus));
      } else if (
        wasVisible
        && !journeyDiscovery.areaKey
        && !journeyInteractionIsCinematic()
      ) {
        announceStatus(walkingStatus());
      }
    }
    if (visible) {
      journeySpaceHint.style.transform = `translate3d(${screenX + 36 * state.scale}px, ${screenY - 214 * state.scale}px, 0)`;
    }
    if (
      journeyDiscovery.areaKey
      && (
        journeyTransition.active
        || journeyAwakening.orchestra
        || journeySecrets.active
        || journeySecrets.observatory
        || journeySecrets.ascension
        || Math.abs(state.x - journeyDiscovery.openedAtX) > 360
      )
    ) {
      closeJourneyDiscovery();
    }
  }

  function updateCharacterActionAlert(screenX, screenY) {
    const mediaSignApproach = approachingMediaSign();
    const cue = runtime.characterActionCue?.({
      linksOpen: root.dataset.links === 'open',
      atlasEntering: Boolean(livingAtlasController?.isEntering?.()),
      cinematic: journeyInteractionIsCinematic(),
      mediaSign: Boolean(readableMediaSign()),
      mediaSignApproach: Boolean(mediaSignApproach),
      discovery: Boolean(journeyDiscovery.areaKey),
      journeyHint: journeySpaceHint.classList.contains('is-visible'),
      focusHint: Boolean(focusWorld.fx?.hint?.classList.contains('is-visible')),
      fishingHold: fishing.phase === 'hold',
    }) || '';
    const visible = Boolean(cue);
    characterActionAlert.classList.toggle('is-visible', visible);
    if (!visible) {
      characterActionAlert.classList.remove('is-guided');
      characterActionAlert.removeAttribute('data-action');
      return;
    }
    characterActionAlert.dataset.action = cue;
    characterActionAlert.classList.toggle(
      'is-guided',
      cue === 'approach' && !mediaAffordanceLearned
    );
    if (characterActionGlyph) {
      characterActionGlyph.textContent = cue === 'approach' ? '?' : '!';
    }
    const alertX = screenX + 30 * state.scale;
    const alertY = screenY - CHARACTER_H * state.scale * 0.68;
    characterActionAlert.style.transform = `translate3d(${alertX.toFixed(2)}px, ${alertY.toFixed(2)}px, 0)`;
  }

  function updateMovementGuide(now) {
    if (!startHint || !state.started) {
      return;
    }
    const blocked = Boolean(
      root.dataset.links === 'open'
      || livingAtlasController?.isEntering?.()
      || journeyInteractionIsCinematic()
      || fishing.phase
      || journeyDiscovery.areaKey
      || journeySecrets.active
      || journeySecrets.observatory
      || journeySecrets.ascension
      || (state.action && state.actionUntil > now)
    );
    const visible = runtime.movementGuideShouldShow?.({
      started: state.started,
      moving: state.isMoving,
      blocked,
      actionAvailable: characterActionAlert.classList.contains('is-visible'),
      idleMs: now - state.lastMovementAt,
      delayMs: 900,
    });
    startHint.classList.add('is-recurrent');
    startHint.classList.toggle('is-hidden', !visible);
  }

  function drawTrailConstellationLift(now, keys, finaleProgress, settle) {
    if (!particleCtx || !keys.length) {
      return;
    }
    let strength = 0;
    if (finaleProgress > 0) {
      const lift = smooth(clamp(finaleProgress / 0.72, 0, 1));
      const handoff = 1 - smooth(clamp((finaleProgress - 0.72) / 0.28, 0, 1));
      strength = lift * (0.35 + handoff * 0.65);
    } else if (journeyMemory.finalized && settle < 1) {
      strength = (1 - settle) * 0.35;
    }
    if (strength <= 0.01) {
      return;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width * 0.54;
    const centerY = height * 0.34;
    const time = now * 0.001;
    const pointCount = renderQuality.mode === 'low' ? 7 : renderQuality.mode === 'medium' ? 10 : 13;
    particleCtx.save();
    particleCtx.lineCap = 'round';
    keys.forEach((key, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const lane = (index + 1) / (keys.length + 1);
      const start = {
        x: width * (0.04 + lane * 0.72),
        y: height * (0.82 + (index % 2) * 0.035),
      };
      const targetPhase = (index / Math.max(1, keys.length)) * Math.PI * 2 - Math.PI * 0.5;
      const target = {
        x: centerX + Math.cos(targetPhase) * (34 + index * 4),
        y: centerY + Math.sin(targetPhase) * (22 + index * 3),
      };
      const control = {
        x: start.x + (target.x - start.x) * 0.58 + Math.sin(index * 1.7) * 48,
        y: height * (0.65 - (index % 3) * 0.05),
      };
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(strength * 0.13).toFixed(3)})`;
      particleCtx.lineWidth = 0.8 + (index % 2) * 0.3;
      particleCtx.beginPath();
      particleCtx.moveTo(start.x, start.y);
      particleCtx.quadraticCurveTo(control.x, control.y, target.x, target.y);
      particleCtx.stroke();
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        const travel = (pointIndex / pointCount + time * (0.08 + index * 0.004)) % 1;
        const point = quadraticPoint(start, control, target, travel);
        const pulse = 0.64 + Math.sin(time * 2.2 + index + pointIndex) * 0.24;
        particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(strength * 0.58 * pulse).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.arc(point.x, point.y, 0.9 + (pointIndex % 3) * 0.42, 0, Math.PI * 2);
        particleCtx.fill();
      }
    });
    particleCtx.restore();
  }

  function drawJourneyMemory(now, characterScreenX, characterScreenY) {
    if (!particleCtx || !journeyMemory.collected.size || journeySecrets.ascension) {
      return;
    }
    const keys = Array.from(journeyMemory.collected);
    const time = now * 0.001;
    const canIdleBloom = (
      state.started
      && !state.isMoving
      && !journeyTransition.active
      && !journeyMoment.active
      && !journeyEcho.active
      && !journeyAwakening.orchestra
      && !journeySecrets.active
      && !journeySecrets.observatory
      && !journeySecrets.ascension
      && !journeyDiscovery.areaKey
      && !journeyMemory.finalized
    );
    if (canIdleBloom) {
      journeyMemory.idleSince ||= now;
    } else {
      journeyMemory.idleSince = 0;
      journeyMemory.idleBloomed = false;
      delete root.dataset.memoryIdle;
    }
    const idleProgress = journeyMemory.idleSince
      ? smooth(clamp((now - journeyMemory.idleSince - 620) / 920, 0, 1))
      : 0;
    if (idleProgress > 0.08) {
      root.dataset.memoryIdle = 'true';
    }
    if (idleProgress > 0.96 && !journeyMemory.idleBloomed) {
      journeyMemory.idleBloomed = true;
      emitParticles(keys.length * 5, (index) => {
        const key = keys[index % keys.length];
        const phase = (index / Math.max(1, keys.length * 5)) * Math.PI * 2;
        const [r, g, b] = journeyMemoryColor(key);
        return {
          x: characterScreenX + Math.cos(phase) * rand(34, 76),
          y: characterScreenY - 104 + Math.sin(phase) * rand(22, 48),
          vx: Math.cos(phase) * rand(0.01, 0.045),
          vy: Math.sin(phase) * rand(0.01, 0.04) - 0.015,
          size: rand(1, 2.5),
          life: rand(800, 1300),
          color: `rgba(${r}, ${g}, ${b}, ${rand(0.24, 0.5).toFixed(2)})`,
          type: index % 8 === 0 ? 'ring' : 'bit',
        };
      });
    }

    const finale = journeyMoment.active?.type === 'finale' ? journeyMoment.active : null;
    const finaleProgress = finale
      ? smooth(clamp((now - finale.startedAt) / finale.durationMs, 0, 1))
      : 0;
    const settle = journeyMemory.finalized
      ? smooth(clamp((now - journeyMemory.finalizedAt) / 1300, 0, 1))
      : 0;
    const finaleCenter = { x: window.innerWidth * 0.54, y: window.innerHeight * 0.34 };
    const chartCenter = { x: window.innerWidth * 0.79, y: window.innerHeight * 0.3 };
    const skyAnchors = [
      [0.1, 0.38],
      [0.27, 0.18],
      [0.46, 0.3],
      [0.65, 0.13],
      [0.87, 0.32],
      [0.73, 0.68],
      [0.42, 0.76],
    ];
    drawTrailConstellationLift(now, keys, finaleProgress, settle);

    let completionWave = 0;
    const completionElapsed = now - journeyMemory.finalizedAt - 1300;
    if (journeyMemory.finalized && journeyMemory.complete && completionElapsed >= 0) {
      const completionProgress = clamp(completionElapsed / 2700, 0, 1);
      completionWave = Math.sin(smooth(completionProgress) * Math.PI);
      if (!journeyMemory.completionBurstDone) {
        journeyMemory.completionBurstDone = true;
        emitParticles(keys.length * 14, (index) => {
          const keyIndex = index % keys.length;
          const key = keys[keyIndex];
          const target = skyAnchors[keyIndex % skyAnchors.length];
          const [r, g, b] = journeyMemoryColor(key);
          return {
            x: chartCenter.x + rand(-16, 16),
            y: chartCenter.y + rand(-12, 12),
            targetX: window.innerWidth * target[0] + rand(-34, 34),
            targetY: window.innerHeight * target[1] + rand(-28, 28),
            targetAttract: 0.00014,
            targetDamping: 0.81,
            size: rand(1.1, 3.4),
            life: rand(1700, 2600),
            color: `rgba(${r}, ${g}, ${b}, ${rand(0.3, 0.7).toFixed(2)})`,
            type: index % 12 === 0 ? 'ring' : 'spark',
          };
        });
        triggerParticleFlash(1100);
        triggerScreenShake(320);
      }
    }

    let replayProgress = 0;
    let replayWave = 0;
    if (journeyMemory.replayStartedAt) {
      replayProgress = clamp((now - journeyMemory.replayStartedAt) / 2600, 0, 1);
      replayWave = Math.sin(smooth(replayProgress) * Math.PI);
      if (replayProgress >= 1) {
        journeyMemory.replayStartedAt = 0;
        delete root.dataset.memoryReplay;
        if (
          journeyMemory.complete
          && journeyMemory.replayCount >= 2
          && !journeyMemory.portalReady
        ) {
          journeyMemory.portalReady = true;
          journeyMemory.portalReadyAt = now;
          root.dataset.memoryPortal = 'ready';
          const portalCenter = { x: window.innerWidth * 0.8, y: window.innerHeight * 0.51 };
          emitParticles(keys.length * 10, (index) => {
            const key = keys[index % keys.length];
            const phase = (index / Math.max(1, keys.length * 10)) * Math.PI * 2;
            const [r, g, b] = journeyMemoryColor(key);
            return {
              x: chartCenter.x + rand(-16, 16),
              y: chartCenter.y + rand(-12, 12),
              targetX: portalCenter.x + Math.cos(phase) * rand(48, 78),
              targetY: portalCenter.y + Math.sin(phase) * rand(88, 142),
              targetAttract: 0.00014,
              targetDamping: 0.81,
              size: rand(1, 3.2),
              life: rand(1300, 2100),
              color: `rgba(${r}, ${g}, ${b}, ${rand(0.28, 0.64).toFixed(2)})`,
              type: index % 12 === 0 ? 'ring' : 'bit',
            };
          });
          triggerParticleFlash(820);
          triggerScreenShake(240);
        }
      }
    }
    const portalProgress = journeyMemory.portalReady
      ? smooth(clamp((now - journeyMemory.portalReadyAt) / 1200, 0, 1))
      : 0;
    const memoryReturnProgress = journeyReturn.active
      ? clamp((now - journeyReturn.active.startedAt) / journeyReturn.active.durationMs, 0, 1)
      : 0;
    const memoryReturnWave = journeyReturn.active
      ? Math.sin(memoryReturnProgress * Math.PI)
      : 0;

    let echoData = null;
    if (journeyEcho.active) {
      const rawProgress = clamp(
        (now - journeyEcho.active.startedAt) / journeyEcho.active.durationMs,
        0,
        1
      );
      const { start, control, end } = journeyEcho.active;
      const progress = smooth(rawProgress);
      echoData = {
        ...journeyEcho.active,
        start,
        control,
        end,
        progress,
        point: quadraticPoint(start, control, end, progress),
      };
      if (rawProgress >= 1) {
        const [r, g, b] = journeyMemoryColor(journeyEcho.active.source);
        emitParticles(32, (index) => {
          const angle = (index / 32) * Math.PI * 2;
          return {
            x: end.x + Math.cos(angle) * rand(2, 18),
            y: end.y + Math.sin(angle) * rand(2, 16),
            vx: Math.cos(angle) * rand(0.025, 0.12),
            vy: Math.sin(angle) * rand(0.02, 0.1),
            size: rand(1.1, 3.1),
            life: rand(650, 1150),
            color: `rgba(${r}, ${g}, ${b}, ${rand(0.3, 0.66).toFixed(2)})`,
            type: index % 9 === 0 ? 'ring' : 'spark',
          };
        });
        journeyEcho.active = null;
        delete root.dataset.journeyEcho;
        echoData = null;
      }
    }

    const discoveryAnchor = { x: window.innerWidth * 0.65, y: window.innerHeight * 0.19 };
    const gateElapsed = journeyTransition.active
      ? now - journeyTransition.active.startedAt
      : 0;
    const gateProgress = journeyTransition.active
      ? smooth(clamp(gateElapsed / journeyTransition.active.holdMs, 0, 1))
        * (gateElapsed <= journeyTransition.active.holdMs
          ? 1
          : 1 - smooth(clamp((gateElapsed - journeyTransition.active.holdMs) / 480, 0, 1)))
      : 0;
    let tetherData = null;
    const positions = keys.map((key, index) => {
      const phase = (index / Math.max(1, keys.length)) * Math.PI * 2;
      const momentumSpacing = journeyMotion.charge * (22 + index * 20);
      const followerDirection = journeyMotion.heldDirection || state.direction;
      const follower = {
        x: characterScreenX - followerDirection * (52 + index * 13 + momentumSpacing) * state.scale,
        y: characterScreenY - (
          116
          + Math.sin(time * 1.4 + phase) * (15 + journeyMotion.charge * 22)
        ) * state.scale,
      };
      const idleOrbit = {
        x: characterScreenX + Math.cos(phase + time * 0.16) * (62 + (index % 2) * 18),
        y: characterScreenY - 104 + Math.sin(phase + time * 0.16) * (36 + (index % 2) * 9),
      };
      const chart = {
        x: chartCenter.x + Math.cos(phase + time * 0.12) * (74 + (index % 2) * 24),
        y: chartCenter.y + Math.sin(phase + time * 0.12) * (58 + (index % 2) * 18),
      };
      let x = follower.x + (idleOrbit.x - follower.x) * idleProgress;
      let y = follower.y + (idleOrbit.y - follower.y) * idleProgress;

      if (gateProgress > 0 && journeyTransition.active) {
        let gateCenterX = characterScreenX;
        let gateCenterY = characterScreenY;
        let gateRadiusX = 78;
        let gateRadiusY = 18;
        if (journeyTransition.active.type === 'launch') {
          gateCenterY -= 96;
          gateRadiusX = 48;
          gateRadiusY = 112;
        } else if (journeyTransition.active.type === 'return-drop') {
          gateCenterY -= 154;
          gateRadiusX = 92;
          gateRadiusY = 34;
        }
        const gate = {
          x: gateCenterX + Math.cos(phase + time * 0.7) * gateRadiusX,
          y: gateCenterY + Math.sin(phase + time * 0.7) * gateRadiusY,
        };
        x += (gate.x - x) * gateProgress;
        y += (gate.y - y) * gateProgress;
      }
      x += (finaleCenter.x - x) * finaleProgress;
      y += (finaleCenter.y - y) * finaleProgress;
      if (journeyMemory.finalized) {
        x = finaleCenter.x + (chart.x - finaleCenter.x) * settle;
        y = finaleCenter.y + (chart.y - finaleCenter.y) * settle;
      }

      if (completionWave > 0) {
        const sky = skyAnchors[index % skyAnchors.length];
        const skyX = window.innerWidth * sky[0];
        const skyY = window.innerHeight * sky[1];
        x += (skyX - x) * completionWave;
        y += (skyY - y) * completionWave;
      }

      if (replayWave > 0) {
        const replayAngle = phase + replayProgress * Math.PI * 5;
        const replayOrbit = {
          x: characterScreenX + Math.cos(replayAngle) * (116 + index * 24),
          y: characterScreenY - 112 + Math.sin(replayAngle) * (68 + index * 11),
        };
        x += (replayOrbit.x - x) * replayWave;
        y += (replayOrbit.y - y) * replayWave;
      }

      if (portalProgress > 0) {
        const portal = {
          x: window.innerWidth * 0.8 + Math.cos(phase) * (58 + (index % 2) * 17),
          y: window.innerHeight * 0.51 + Math.sin(phase) * (104 + (index % 2) * 24),
        };
        x += (portal.x - x) * portalProgress;
        y += (portal.y - y) * portalProgress;
      }

      if (memoryReturnWave > 0) {
        const travel = (memoryReturnProgress * 1.9 + index / Math.max(1, keys.length)) % 1;
        const stream = {
          x: window.innerWidth * (1 - travel),
          y: window.innerHeight * (0.16 + (index / Math.max(1, keys.length - 1)) * 0.68)
            + Math.sin(time * 3 + index) * 18,
        };
        x += (stream.x - x) * memoryReturnWave;
        y += (stream.y - y) * memoryReturnWave;
      }

      if (echoData?.source === key) {
        x = echoData.point.x;
        y = echoData.point.y;
      }

      if (journeyDiscovery.areaKey === key) {
        const progress = smooth(clamp((now - journeyDiscovery.openedAtTime) / 760, 0, 1));
        const control = {
          x: (follower.x + discoveryAnchor.x) * 0.5,
          y: Math.min(follower.y, discoveryAnchor.y) - 92,
        };
        const point = quadraticPoint(follower, control, discoveryAnchor, progress);
        tetherData = {
          key,
          start: follower,
          control,
          end: discoveryAnchor,
          progress,
          returning: false,
        };
        x = point.x;
        y = point.y;
      } else if (journeyDiscovery.returningKey === key) {
        const progress = smooth(clamp((now - journeyDiscovery.closedAtTime) / 680, 0, 1));
        const control = {
          x: (follower.x + discoveryAnchor.x) * 0.5,
          y: Math.min(follower.y, discoveryAnchor.y) - 92,
        };
        const point = quadraticPoint(discoveryAnchor, control, follower, progress);
        tetherData = {
          key,
          start: discoveryAnchor,
          control,
          end: follower,
          progress,
          returning: true,
        };
        x = point.x;
        y = point.y;
        if (progress >= 1) {
          journeyDiscovery.returningKey = '';
          journeyDiscovery.closedAtTime = 0;
        }
      }

      return { key, x, y, phase };
    });

    if (echoData) {
      const [r, g, b] = journeyMemoryColor(echoData.source);
      const trailStart = Math.max(0, echoData.progress - 0.34);
      particleCtx.save();
      particleCtx.lineWidth = 1.8;
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
      particleCtx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.38)`;
      particleCtx.shadowBlur = 8;
      particleCtx.beginPath();
      for (let index = 0; index <= 18; index += 1) {
        const t = trailStart + (echoData.progress - trailStart) * (index / 18);
        const point = quadraticPoint(echoData.start, echoData.control, echoData.end, t);
        if (index === 0) particleCtx.moveTo(point.x, point.y);
        else particleCtx.lineTo(point.x, point.y);
      }
      particleCtx.stroke();
      particleCtx.shadowBlur = 0;
      for (let index = 0; index < 7; index += 1) {
        const t = trailStart + (echoData.progress - trailStart) * (index / 7);
        const point = quadraticPoint(echoData.start, echoData.control, echoData.end, t);
        particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.1 + index * 0.06).toFixed(2)})`;
        particleCtx.beginPath();
        particleCtx.arc(point.x, point.y, 0.9 + index * 0.18, 0, Math.PI * 2);
        particleCtx.fill();
      }
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.74)`;
      particleCtx.beginPath();
      particleCtx.arc(echoData.point.x, echoData.point.y, 3.8, 0, Math.PI * 2);
      particleCtx.fill();
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.42)`;
      particleCtx.lineWidth = 1;
      particleCtx.beginPath();
      particleCtx.arc(echoData.point.x, echoData.point.y, 7.4, 0, Math.PI * 2);
      particleCtx.stroke();
      particleCtx.restore();
    }

    if (tetherData) {
      const [r, g, b] = journeyMemoryColor(tetherData.key);
      const opacity = tetherData.returning
        ? Math.max(0, 1 - tetherData.progress) * 0.42
        : tetherData.progress * 0.42;
      particleCtx.save();
      particleCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})`;
      particleCtx.lineWidth = 1;
      particleCtx.setLineDash([2, 8]);
      particleCtx.lineDashOffset = -time * 15;
      particleCtx.beginPath();
      particleCtx.moveTo(tetherData.start.x, tetherData.start.y);
      particleCtx.quadraticCurveTo(
        tetherData.control.x,
        tetherData.control.y,
        tetherData.end.x,
        tetherData.end.y
      );
      particleCtx.stroke();
      particleCtx.setLineDash([]);
      for (let index = 0; index < 7; index += 1) {
        const trailProgress = (time * 0.18 + index / 7) % 1;
        const point = quadraticPoint(
          tetherData.start,
          tetherData.control,
          tetherData.end,
          trailProgress
        );
        particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(opacity * 0.9).toFixed(3)})`;
        particleCtx.beginPath();
        particleCtx.arc(point.x, point.y, index % 3 === 0 ? 2 : 1.2, 0, Math.PI * 2);
        particleCtx.fill();
      }
      particleCtx.restore();
    }

    if (portalProgress > 0) {
      particleCtx.save();
      particleCtx.strokeStyle = `rgba(80, 164, 180, ${(portalProgress * 0.2).toFixed(3)})`;
      particleCtx.lineWidth = 1.2;
      particleCtx.setLineDash([3, 10]);
      particleCtx.lineDashOffset = -now * 0.018;
      particleCtx.beginPath();
      particleCtx.ellipse(
        window.innerWidth * 0.8,
        window.innerHeight * 0.51,
        82 + Math.sin(time * 1.1) * 4,
        146 + Math.cos(time * 0.9) * 6,
        0,
        0,
        Math.PI * 2
      );
      particleCtx.stroke();
      particleCtx.setLineDash([]);
      particleCtx.strokeStyle = `rgba(190, 116, 123, ${(portalProgress * 0.08).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.ellipse(
        window.innerWidth * 0.8,
        window.innerHeight * 0.51,
        66,
        126,
        0,
        0,
        Math.PI * 2
      );
      particleCtx.stroke();
      particleCtx.restore();
    }

    const connectionOpacity = journeyMemory.finalized
      ? 0.14 + completionWave * 0.18 + replayWave * 0.14 + portalProgress * 0.12
      : idleProgress * 0.16 + journeyMotion.charge * 0.11 + gateProgress * 0.16;
    if (connectionOpacity > 0.01 && positions.length > 1) {
      particleCtx.save();
      particleCtx.strokeStyle = `rgba(82, 88, 84, ${connectionOpacity.toFixed(3)})`;
      particleCtx.lineWidth = 1;
      particleCtx.beginPath();
      positions.forEach((position, index) => {
        if (index === 0) particleCtx.moveTo(position.x, position.y);
        else particleCtx.lineTo(position.x, position.y);
      });
      particleCtx.closePath();
      particleCtx.stroke();
      particleCtx.restore();
    }
    positions.forEach(({ key, x, y }, index) => {
      const [r, g, b] = journeyMemoryColor(key);
      const pulse = 0.72 + Math.sin(time * 1.6 + index) * 0.18;
      const expansion = completionWave * 3.2
        + replayWave * 2.4
        + idleProgress * 1.4
        + journeyMotion.charge * 1.2
        + gateProgress * 1.8
        + portalProgress * 2;
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.18 * pulse).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(x, y, 8 + pulse * 3 + expansion, 0, Math.PI * 2);
      particleCtx.fill();
      particleCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.68 * pulse).toFixed(3)})`;
      particleCtx.beginPath();
      particleCtx.arc(x, y, 2.2 + pulse, 0, Math.PI * 2);
      particleCtx.fill();
    });
  }

  function syncLivingAtlasApproach() {
    const approach = window.HomeAtlas?.atlasApproachState?.({
      x: state.x,
      startX: LIVING_ATLAS_CUE_X,
      triggerX: LIVING_ATLAS_TRIGGER_X,
      finalized: journeyMemory.finalized,
      active: livingAtlasController?.isActive?.(),
      entering: livingAtlasController?.isEntering?.(),
    }) || { phase: 'hidden', progress: 0 };
    root.dataset.atlasApproach = approach.phase;
    root.style.setProperty('--atlas-approach', approach.progress.toFixed(3));
    if (approach.phase === livingAtlasApproachPhase) {
      return;
    }
    livingAtlasApproachPhase = approach.phase;
    if (approach.phase === 'gathering') {
      announceStatus(isEnglish
        ? 'The six worlds have gathered into one. Keep walking right to enter Act II and the Living Atlas.'
        : '歩いてきた6つの世界がひとつに集まりました。右へ進むと、活動の現在をめぐる第二幕へ続きます。');
    } else if (approach.phase === 'threshold') {
      announceStatus(isEnglish
        ? 'The world comes apart just ahead. Keep walking right.'
        : 'この先で世界がほどけます。そのまま右へ進んでください。');
    }
  }

  function updateJourneyVisual() {
    if (!isJourneyMode) {
      return;
    }
    const stage = journey.stageAt(state.x);
    const visual = journey.visualAt(state.x);
    setStage(stage);
    syncLivingAtlasApproach();
    if (renderCache.tone !== visual.tone) {
      renderCache.tone = visual.tone;
      root.dataset.tone = visual.tone;
    }
    if (visualStyleScheduler.take(clock.now(), 'active').render) {
      const background = `rgb(${visual.background.map((channel) => Math.round(channel)).join(' ')})`;
      if (renderCache.background !== background) {
        renderCache.background = background;
        root.style.backgroundColor = background;
      }
    }
    if (stage === state.journeyStage) {
      return;
    }
    const previous = state.journeyStage;
    state.journeyStage = stage;
    if (journeyReturn.active) {
      return;
    }
    if (previous === 'moss' && stage === 'brink') {
      collectJourneyMemory('moss');
    }
    if (!journeyTransition.active && (stage === 'fall-taupe' || stage === 'launch' || stage === 'fall-ground')) {
      triggerScreenShake(stage === 'launch' ? 620 : 460);
      triggerParticleFlash(stage === 'launch' ? 820 : 620);
    }
    if (stage === 'monoomoi' && previous === 'fall-ground') {
      triggerScreenShake(560);
      emitJourneyImpact('rgba(112, 157, 132, 0.52)', 110);
    }
    if (previous && ['taupe', 'islog', 'ojicra', 'monoomoi', 'monoerabi'].includes(stage)) {
      emitJourneyArrival(stage);
      beginJourneyEcho(stage);
    }
    if (stage === 'hub') {
      emitJourneyImpact('rgba(92, 156, 150, 0.48)', 90);
      beginJourneyEcho(stage);
    }
  }

  function spawnJourneyAmbient(now) {
    if (!isJourneyMode || !state.started) {
      return;
    }
    const cinematic = journeyTransition.active;
    if (cinematic && root.dataset.cinematicPhase === 'anticipation') {
      const interval = cinematic.type === 'drop' ? 52 : 38;
      if (now - particleBurstState.lastJourneyAmbient < interval) {
        return;
      }
      particleBurstState.lastJourneyAmbient = now;
      const origin = worldToScreen(state.x, state.y - 8);
      if (cinematic.type === 'launch') {
        emitParticles(5, (index) => {
          const angle = rand(0, Math.PI * 2);
          const radius = rand(54, 128) * state.scale;
          return {
            x: origin.x + Math.cos(angle) * radius,
            y: origin.y + Math.sin(angle) * radius * 0.4,
            targetX: origin.x + rand(-10, 10),
            targetY: origin.y + rand(-12, 4),
            size: rand(1.2, 3.4) * state.scale,
            life: rand(420, 680),
            color: index % 3 === 0 ? 'rgba(215,218,142,0.66)' : 'rgba(137,91,157,0.54)',
            type: index % 4 === 0 ? 'ring' : 'bit',
            shapeAmbient: true,
          };
        });
      } else {
        emitParticles(cinematic.type === 'drop' ? 2 : 3, () => ({
          x: origin.x + rand(-42, 42) * state.scale,
          y: origin.y + rand(-5, 5) * state.scale,
          vx: rand(-0.12, 0.12),
          vy: rand(-0.18, -0.04),
          ay: 0.00024,
          size: rand(1.1, 3) * state.scale,
          life: rand(360, 620),
          color: cinematic.type === 'drop'
            ? 'rgba(92, 174, 188, 0.46)'
            : 'rgba(126, 198, 207, 0.4)',
          type: cinematic.type === 'drop' ? 'water-spray' : 'bit',
          angle: cinematic.type === 'drop' ? rand(-0.24, 0.24) : undefined,
          shapeAmbient: true,
        }));
      }
      return;
    }
    if (cinematic && root.dataset.cinematicPhase === 'motion') {
      const interval = cinematic.type === 'drop' ? 38 : 24;
      if (now - particleBurstState.lastJourneyAmbient < interval) {
        return;
      }
      particleBurstState.lastJourneyAmbient = now;
      const origin = worldToScreen(state.x, state.y - 76);
      const rising = cinematic.type === 'launch';
      emitParticles(rising ? 5 : cinematic.type === 'drop' ? 2 : 4, (index) => ({
        x: origin.x + rand(-18, 18) * state.scale,
        y: origin.y + rand(-34, 42) * state.scale,
        vx: rand(-0.06, 0.06),
        vy: rising ? rand(0.22, 0.58) : rand(-0.48, -0.18),
        size: rand(1.2, 4.2) * state.scale,
        life: rand(360, 720),
        color: rising
          ? (index % 2 ? 'rgba(188,194,104,0.46)' : 'rgba(137,91,157,0.58)')
          : (cinematic.type === 'drop' ? 'rgba(79,229,219,0.42)' : 'rgba(193,151,83,0.38)'),
        type: cinematic.type === 'drop'
          ? 'water-spray'
          : index % 4 === 0 ? 'ring' : 'dash',
        angle: cinematic.type === 'drop' ? rand(-0.18, 0.18) : rising ? 0 : Math.PI,
        shapeAmbient: true,
      }));
      return;
    }
    const stage = state.journeyStage || journey.stageAt(state.x);
    const intervals = {
      'fall-taupe': 34,
      taupe: 82,
      'rise-islog': 55,
      islog: 210,
      launch: 24,
      ojicra: 78,
      'fall-ground': 28,
      monoomoi: 175,
      monoerabi: 145,
      hub: 105,
    };
    const interval = intervals[stage];
    if (!interval || now - particleBurstState.lastJourneyAmbient < interval) {
      return;
    }
    particleBurstState.lastJourneyAmbient = now;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (stage === 'fall-taupe' || stage === 'fall-ground') {
      const returning = stage === 'fall-ground';
      emitParticles(5, () => ({
        x: rand(0, width),
        y: returning ? rand(height * 0.45, height + 30) : rand(-30, height * 0.55),
        vx: rand(-0.035, 0.035),
        vy: returning ? rand(-0.72, -0.32) : rand(0.34, 0.76),
        size: rand(2.5, 7),
        life: rand(520, 960),
        color: returning ? 'rgba(115, 186, 198, 0.38)' : 'rgba(126, 202, 211, 0.42)',
        type: returning ? 'dash' : 'water-spray',
        angle: returning ? rand(-0.12, 0.12) : rand(-0.18, 0.18),
        spin: rand(-0.002, 0.002),
        shapeAmbient: true,
      }));
    } else if (stage === 'launch') {
      emitParticles(6, () => ({
        x: rand(0, width),
        y: rand(-40, height),
        vx: rand(-0.02, 0.02),
        vy: rand(0.7, 1.35),
        size: rand(3, 9),
        life: rand(420, 820),
        color: Math.random() > 0.5 ? 'rgba(188,194,104,0.5)' : 'rgba(137,91,157,0.54)',
        type: 'dash',
        shapeAmbient: true,
      }));
    } else if (stage === 'taupe') {
      const palette = ['rgba(79,229,219,0.5)', 'rgba(238,93,176,0.48)', 'rgba(231,205,81,0.46)'];
      emitParticles(2, () => ({
        x: rand(0, width),
        y: rand(height * 0.18, height * 0.9),
        vx: rand(-0.04, 0.04),
        vy: rand(-0.05, 0.03),
        size: rand(2, 5),
        life: rand(1000, 1900),
        color: pickOne(palette),
        type: Math.random() > 0.7 ? 'ring' : 'spark',
        shapeAmbient: true,
      }));
    } else if (stage === 'rise-islog') {
      emitParticles(3, (index) => ({
        x: rand(0, width),
        y: rand(height * 0.38, height + 30),
        vx: rand(-0.035, 0.035),
        vy: rand(-0.28, -0.1),
        size: rand(1.4, 4.2),
        life: rand(720, 1320),
        color: index === 0 ? 'rgba(181, 104, 92, 0.22)' : 'rgba(102, 163, 175, 0.34)',
        type: index === 2 ? 'dash' : 'bit',
        shapeAmbient: true,
      }));
    } else if (stage === 'islog') {
      const y = rand(height * 0.42, height * 0.78);
      addParticle({
        x: -30, y,
        vx: rand(0.16, 0.28), vy: rand(-0.01, 0.01),
        size: rand(3, 7), life: rand(2200, 3400),
        color: Math.random() > 0.45 ? 'rgba(76,145,162,0.28)' : 'rgba(181,104,92,0.22)',
        type: 'dash', angle: Math.PI * 0.5,
        shapeAmbient: true,
      });
    } else if (stage === 'ojicra') {
      const endPalette = [
        'rgba(188,194,104,0.44)',
        'rgba(137,91,157,0.48)',
        'rgba(215,218,142,0.38)',
      ];
      addParticle({
        x: rand(0, width), y: rand(0, height),
        vx: rand(-0.02, 0.02), vy: rand(-0.026, 0.012),
        size: rand(1.4, 4.6), life: rand(1000, 2100),
        color: pickOne(endPalette),
        type: Math.random() > 0.78 ? 'ring' : Math.random() > 0.58 ? 'bit' : 'spark',
        shapeAmbient: true,
      });
    } else if (stage === 'monoomoi') {
      addParticle({
        x: rand(0, width), y: rand(-24, height * 0.72),
        vx: rand(-0.025, 0.025), vy: rand(0.025, 0.075),
        size: rand(1.2, 3.4), life: rand(4200, 6200),
        color: Math.random() > 0.5 ? 'rgba(190,116,123,0.24)' : 'rgba(105,154,128,0.24)',
        type: Math.random() > 0.82 ? 'ring' : 'bit',
        spin: rand(-0.0024, 0.0024),
        shapeAmbient: true,
      });
    } else if (stage === 'monoerabi') {
      addParticle({
        x: rand(-20, width * 0.28), y: rand(height * 0.46, height * 0.8),
        vx: rand(0.09, 0.18), vy: 0,
        size: rand(2.5, 5), life: rand(1800, 2800),
        color: Math.random() > 0.5 ? 'rgba(79,151,171,0.25)' : 'rgba(191,145,75,0.22)',
        type: 'ring',
        spin: rand(-0.0022, 0.0022),
        shapeAmbient: true,
      });
    } else if (stage === 'hub') {
      addParticle({
        x: width * 0.72 + rand(-120, 120), y: height * 0.52 + rand(-110, 110),
        vx: rand(-0.03, 0.03), vy: rand(-0.04, 0.02),
        size: rand(1.5, 4), life: rand(900, 1500),
        color: 'rgba(84, 153, 145, 0.34)', type: 'ring',
        shapeAmbient: true,
      });
    }
  }

  function spawnKintsugiMote(now) {
    if (
      !isJourneyMode
      || !state.started
      || state.maxVisitedX <= KINTSUGI_START_X + 80
      || journeyTransition.active
      || journeyReturn.active
    ) {
      return;
    }
    const interval = KINTSUGI_MOTE_INTERVAL_MS[renderQuality.mode]
      || KINTSUGI_MOTE_INTERVAL_MS.high;
    if (now - particleBurstState.lastKintsugiMote < interval) {
      return;
    }
    const scale = Math.max(0.1, state.scale);
    const visibleStart = Math.max(KINTSUGI_START_X, state.cameraX - 36 / scale);
    const visibleEnd = Math.min(
      state.maxVisitedX - 24,
      state.x - 16,
      state.cameraX + (window.innerWidth + 36) / scale
    );
    if (visibleEnd <= visibleStart) {
      return;
    }
    let worldX = 0;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = rand(visibleStart, visibleEnd);
      if (journey.groundVisible(candidate)) {
        worldX = candidate;
        break;
      }
    }
    if (!worldX) {
      return;
    }
    const point = worldToScreen(worldX, terrainY(worldX) - 2);
    const dark = journey.visualAt(worldX).tone === 'dark';
    const color = memoryTrailColorAt(worldX, false, dark).replace('rgb(', 'rgba(').replace(')', dark ? ', 0.64)' : ', 0.72)');
    addParticle({
      x: point.x + rand(-2, 2),
      y: point.y,
      vx: rand(-0.012, 0.012),
      vy: rand(-0.075, -0.038),
      ay: rand(0.000055, 0.00009),
      size: rand(1.05, 1.75) * scale,
      life: rand(520, 820),
      color,
      type: 'kintsugi-mote',
      shapeLanguage: false,
    });
    particleBurstState.lastKintsugiMote = now;
  }

  function emitCatchRevealParticles() {
    const effect = PARTICLE_EFFECTS.fishingReveal;
    const origin = worldToScreen(fishing.end.x, fishing.end.y);
    const paperTopLeft = worldToScreen(
      state.x + CATCH_PAPER_OFFSET_X,
      state.y + CATCH_PAPER_OFFSET_Y
    );
    const paperWidth = CATCH_PAPER_WIDTH * state.scale;
    const paperHeight = focusWorld.fx.paper.offsetHeight * state.scale;
    emitParticles(effect.count, (index) => {
      const edge = index % 4;
      const along = Math.random();
      const inset = rand(-12, 12) * state.scale;
      let targetX = paperTopLeft.x;
      let targetY = paperTopLeft.y;
      if (edge === 0) {
        targetX += paperWidth * along;
        targetY += inset;
      } else if (edge === 1) {
        targetX += paperWidth + inset;
        targetY += paperHeight * along;
      } else if (edge === 2) {
        targetX += paperWidth * along;
        targetY += paperHeight + inset;
      } else {
        targetX += inset;
        targetY += paperHeight * along;
      }
      const [r, g, b] = pickOne(effect.palette);
      return {
        x: origin.x + sampleRange(effect.originSpread),
        y: origin.y + sampleRange(effect.originSpread),
        vx: sampleRange(effect.velocity),
        vy: sampleRange(effect.velocity),
        targetX,
        targetY,
        size: sampleRange(effect.size) * state.scale,
        life: sampleRange(effect.life),
        color: `rgba(${r}, ${g}, ${b}, ${sampleRange(effect.alpha).toFixed(2)})`,
        type: index % 11 === 0 ? 'spark' : 'bit',
        spin: sampleRange([-0.009, 0.009]),
      };
    });
  }

  function drawVocabularyShape(
    ctx,
    shape,
    x,
    y,
    size,
    angle,
    phase,
    alpha,
    time,
    colorCss
  ) {
    const safeAlpha = clamp(alpha, 0, 0.94);
    if (colorCss) {
      ctx.fillStyle = colorCss;
    }
    ctx.globalAlpha = safeAlpha;
    if (shape === 'square') {
      const s = clamp(size * 1.05, 2, 3.5);
      const gx = Math.round(x / 12) * 12;
      const gy = Math.round(y / 12) * 12;
      ctx.globalAlpha = safeAlpha * (0.55 + 0.45 * Math.sin(time * 3 + phase));
      ctx.fillRect(gx - s, gy - s, s * 2, s * 2);
      return;
    }
    if (shape === 'dash') {
      const width = clamp(size * 4.8, 8, 14);
      const flicker = 0.78 + Math.sin(time * 7.4 + phase) * 0.12;
      ctx.globalAlpha = safeAlpha * flicker;
      ctx.fillRect(x - width * 0.5, y - 0.8, width, 1.6);
      return;
    }
    if (shape === 'tri') {
      const s = clamp(size, 1.4, 5);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x + sin * s * 1.3, y - cos * s * 1.3);
      ctx.lineTo(x + cos * s * 1.2 - sin * s, y + sin * s * 1.2 + cos * s);
      ctx.lineTo(x - cos * s * 1.2 - sin * s, y - sin * s * 1.2 + cos * s);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (shape === 'petal') {
      const s = clamp(size, 1.4, 5);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.6);
      ctx.bezierCurveTo(s * 1.3, -s * 0.4, s * 0.8, s * 1.2, 0, s * 1.6);
      ctx.bezierCurveTo(-s * 0.8, s * 1.2, -s * 1.3, -s * 0.4, 0, -s * 1.6);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (shape === 'cube') {
      const cs = clamp(size * 1.2, 1.8, 5.2);
      const c = 0.87 * cs;
      const h = 0.5 * cs;
      ctx.beginPath();
      ctx.moveTo(x, y - cs);
      ctx.lineTo(x + c, y - h);
      ctx.lineTo(x, y);
      ctx.lineTo(x - c, y - h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.moveTo(x - c, y - h);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + cs);
      ctx.lineTo(x - c, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + c, y - h);
      ctx.lineTo(x + c, y + h);
      ctx.lineTo(x, y + cs);
      ctx.closePath();
      ctx.fill();
      if (colorCss) {
        ctx.fillStyle = colorCss;
      }
      return;
    }
    if (shape === 'spark') {
      const s = clamp(size, 1.2, 4.8);
      const center = Math.max(0.7, s * 0.42);
      ctx.beginPath();
      ctx.arc(x, y, center, 0, Math.PI * 2);
      for (let index = 0; index < 4; index += 1) {
        const sparkAngle = index * Math.PI * 0.5;
        const sx = x + Math.cos(sparkAngle) * s * 1.35;
        const sy = y + Math.sin(sparkAngle) * s * 1.35;
        ctx.moveTo(sx + center * 0.56, sy);
        ctx.arc(sx, sy, center * 0.56, 0, Math.PI * 2);
      }
      ctx.fill();
      return;
    }
    if (shape === 'leaf') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.8, size * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.7, size), 0, Math.PI * 2);
    ctx.fill();
  }

  function prewarmJourneyDestination(active, anticipation) {
    if (!active || !transitionWarmupCtx || !dotWorld.built) {
      return;
    }
    const slice = runtime.transitionWarmupSlice?.(
      anticipation,
      active.destinationWarmSlices,
      4
    ) ?? -1;
    if (slice < 0) {
      return;
    }
    const targetCameraX = clamp(
      active.toX - state.visibleW * 0.42,
      0,
      Math.max(0, WORLD_LENGTH - state.visibleW)
    );
    const startBucket = Math.floor((targetCameraX - DOT_BUCKET_MARGIN) / DOT_BUCKET_SIZE);
    const endBucket = Math.floor(
      (targetCameraX + state.visibleW + DOT_BUCKET_MARGIN) / DOT_BUCKET_SIZE
    );
    transitionWarmupCtx.clearRect(0, 0, 64, 64);
    let pointIndex = 0;
    for (let bucketIndex = startBucket; bucketIndex <= endBucket; bucketIndex += 1) {
      const bucket = dotWorld.buckets.get(bucketIndex);
      if (!bucket) {
        continue;
      }
      for (const dot of bucket) {
        const currentIndex = pointIndex;
        pointIndex += 1;
        if (currentIndex % 4 !== slice) {
          continue;
        }
        const shape = resolveVocabularyShape(
          active.shapeToWorld,
          dot.sample,
          dot.kind,
          false
        );
        if (dot.motionHandler) {
          dotMotionFrame.time = anticipation;
          dotMotionFrame.scale = 1;
          dotMotionFrame.waterFill = 1;
          dotMotionFrame.pulse = 0.5;
          dotMotionOutput.sx = currentIndex % 64;
          dotMotionOutput.sy = Math.floor(currentIndex / 64) % 64;
          dotMotionOutput.size = 2;
          dotMotionOutput.alpha = 0.5;
          dot.motionHandler(dot, dotMotionOutput, dotMotionFrame);
        }
        drawVocabularyShape(
          transitionWarmupCtx,
          shape,
          currentIndex % 64,
          Math.floor(currentIndex / 64) % 64,
          2,
          dot.shapeAngle,
          dot.shapePhase,
          0.5,
          anticipation,
          dot.colorCss
        );
      }
    }
    transitionWarmupCtx.globalAlpha = 1;
    active.destinationWarmSlices += 1;
  }

  function updateParticleLanguageMotion(particle, dt, now, width, height) {
    if (!particle.shapeLanguage || !particle.shapeAmbient) {
      return;
    }
    if (particle.shapeWorld === 'monoomoi') {
      particle.x += Math.sin(now * 0.0014 + particle.shapePhase) * 0.012 * dt;
      if (particle.y > height + 22) {
        particle.x = rand(0, width);
        particle.y = -22;
        particle.createdAt = now;
        particle.life = particle.maxLife;
      }
      return;
    }
    if (particle.shapeWorld !== 'hub') {
      return;
    }
    const centerX = width * 0.72;
    const centerY = height * 0.52;
    const dx = centerX - particle.x;
    const dy = centerY - particle.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const ringRadius = 72;
    if (distance > ringRadius + 4) {
      const pull = runtime.frameLerp(0.022, dt);
      particle.x += dx * pull;
      particle.y += dy * pull;
      particle.hubNear = false;
      return;
    }
    const orbit = Math.atan2(particle.y - centerY, particle.x - centerX) + dt * 0.00042;
    particle.x = centerX + Math.cos(orbit) * ringRadius;
    particle.y = centerY + Math.sin(orbit) * ringRadius;
    particle.vx *= runtime.frameDamping(0.92, dt);
    particle.vy *= runtime.frameDamping(0.92, dt);
    particle.hubNear = true;
  }

  function drawParticle(particle, alpha, now) {
    if (!particleCtx) {
      return;
    }
    particleCtx.save();
    if (root.dataset.render === 'dots' && particle.shapeLanguage) {
      const shapeWorld = particle.shapeWorld || activeParticleWorld();
      const nearHubRing = shapeWorld === 'hub' && (
        particle.hubNear
        || Math.abs(Math.hypot(
          particle.x - window.innerWidth * 0.72,
          particle.y - window.innerHeight * 0.52
        ) - 72) < 10
      );
      const shape = resolveVocabularyShape(
        shapeWorld,
        particle.shapeSample,
        particle.type,
        nearHubRing
      );
      drawVocabularyShape(
        particleCtx,
        shape,
        particle.x,
        particle.y,
        particle.size * shapeMorphScale(now, particle),
        particle.angle,
        particle.shapePhase,
        alpha,
        now * 0.001,
        particle.color
      );
      particleCtx.restore();
      return;
    }
    particleCtx.globalAlpha = alpha;
    particleCtx.translate(particle.x, particle.y);
    particleCtx.rotate(particle.angle);
    particleCtx.fillStyle = particle.color;
    particleCtx.strokeStyle = particle.color;
    if (particle.type === 'paper-fragment') {
      const width = particle.paperWidth || particle.size * 3;
      const height = particle.paperHeight || particle.size * 2;
      if (renderQuality.mode === 'low') {
        particleCtx.fillStyle = 'rgba(250, 249, 245, 0.94)';
        particleCtx.strokeStyle = 'rgba(58, 54, 48, 0.16)';
        particleCtx.lineWidth = 0.7;
        particleCtx.beginPath();
        particleCtx.arc(0, 0, Math.max(1.2, width * 0.24), 0, Math.PI * 2);
        particleCtx.fill();
        particleCtx.stroke();
        particleCtx.restore();
        return;
      }
      const curl = Math.cos(now * particle.paperCurlSpeed + particle.paperCurlPhase);
      particleCtx.scale(1, 0.22 + Math.abs(curl) * 0.78);
      particleCtx.fillStyle = 'rgba(252, 251, 247, 0.96)';
      particleCtx.fillRect(-width * 0.5, -height * 0.5, width, height);
      particleCtx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      particleCtx.fillRect(curl >= 0 ? 0 : -width * 0.5, -height * 0.5, width * 0.5, height);
      particleCtx.strokeStyle = 'rgba(58, 54, 48, 0.15)';
      particleCtx.lineWidth = 0.65;
      particleCtx.strokeRect(-width * 0.5, -height * 0.5, width, height);
      particleCtx.restore();
      return;
    }
    if (particle.type === 'moss-rain') {
      const bead = Math.max(0.7, particle.size * 0.16);
      const highQuality = renderQuality.mode === 'high';
      const beadCount = highQuality ? 3 : 2;
      for (let index = 0; index < beadCount; index += 1) {
        const offset = index === 0 ? 0 : highQuality ? (index === 1 ? 0.72 : 1.42) : 1.08;
        particleCtx.globalAlpha = alpha * (1 - index * 0.18);
        particleCtx.beginPath();
        particleCtx.arc(0, -particle.size * offset, bead * (1 - index * 0.12), 0, Math.PI * 2);
        particleCtx.fill();
      }
      particleCtx.restore();
      return;
    }
    if (particle.type === 'moss-rain-splash') {
      const progress = 1 - particle.life / Math.max(1, particle.maxLife);
      const radiusX = particle.size * (0.42 + progress * 1.72);
      const radiusY = Math.max(1.2, radiusX * 0.22);
      const count = 10;
      particleCtx.beginPath();
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2;
        const dotX = Math.cos(angle) * radiusX;
        const dotY = Math.sin(angle) * radiusY;
        const dotSize = Math.max(0.55, particle.size * 0.09);
        particleCtx.moveTo(dotX + dotSize, dotY);
        particleCtx.arc(
          dotX,
          dotY,
          dotSize,
          0,
          Math.PI * 2
        );
      }
      particleCtx.fill();
      particleCtx.restore();
      return;
    }
    if (particle.type === 'water-spray') {
      const bead = Math.max(0.65, particle.size * 0.34);
      const highQuality = renderQuality.mode === 'high';
      const beadCount = highQuality ? 3 : 2;
      for (let index = 0; index < beadCount; index += 1) {
        const offset = index === 0 ? 0 : highQuality ? (index === 1 ? 0.9 : 1.65) : 1.25;
        particleCtx.globalAlpha = alpha * (1 - index * 0.2);
        particleCtx.beginPath();
        particleCtx.arc(0, -particle.size * offset, bead * (1 - index * 0.16), 0, Math.PI * 2);
        particleCtx.fill();
      }
      particleCtx.restore();
      return;
    }
    if (particle.type === 'moss-splash-fan') {
      const progress = clamp(1 - particle.life / Math.max(1, particle.maxLife), 0, 1);
      const spread = 1 - Math.pow(1 - progress, 4.6);
      const points = particle.clusterPoints;
      const count = points ? points.length / 4 : Math.max(8, particle.clusterCount);
      particleCtx.globalAlpha = alpha * 0.82;
      particleCtx.beginPath();
      for (let index = 0; index < count; index += 1) {
        const offset = index * 4;
        const angle = points?.[offset]
          ?? (-Math.PI + (index / Math.max(1, count - 1)) * Math.PI);
        const radius = particle.size * (points?.[offset + 1] ?? 0.58) * spread;
        const gravity = particle.size * (points?.[offset + 2] ?? 0.05) * progress * progress;
        const dotSize = Math.max(0.76, particle.size * (points?.[offset + 3] ?? 0.009));
        const dotX = Math.cos(angle) * radius;
        const dotY = Math.sin(angle) * radius * particle.clusterStretch + gravity;
        particleCtx.moveTo(dotX + dotSize, dotY);
        particleCtx.arc(
          dotX,
          dotY,
          dotSize,
          0,
          Math.PI * 2
        );
      }
      particleCtx.fill();
      particleCtx.restore();
      return;
    }
    if (root.dataset.render === 'dots') {
      const renderType = particle.variant || particle.type;
      const renderStyle = PARTICLE_CONFIG.dotRender[particle.type] || PARTICLE_CONFIG.dotRender.default;
      const dotSize = particle.type === 'text'
        ? particle.size
        : Math.min(renderStyle.maxSize, particle.size * renderStyle.sizeScale);
      particleCtx.globalAlpha = alpha * renderStyle.alphaScale;
      if (renderType === 'ring') {
        const count = 14;
        for (let i = 0; i < count; i += 1) {
          const t = (i / count) * Math.PI * 2;
          particleCtx.beginPath();
          particleCtx.arc(
            Math.cos(t) * dotSize * 2.2,
            Math.sin(t) * dotSize * 0.72,
            Math.max(1, dotSize * 0.18),
            0,
            Math.PI * 2
          );
          particleCtx.fill();
        }
      } else if (renderType === 'spark') {
        [
          [0, 0, 1],
          [-1, 0, 0.52],
          [1, 0, 0.52],
          [0, -1, 0.52],
          [0, 1, 0.52],
        ].forEach(([x, y, s]) => {
          particleCtx.beginPath();
          particleCtx.arc(x * dotSize, y * dotSize, Math.max(1, dotSize * s * 0.42), 0, Math.PI * 2);
          particleCtx.fill();
        });
      } else if (renderType === 'dash') {
        particleCtx.lineWidth = Math.max(1, dotSize * 0.28);
        particleCtx.lineCap = 'round';
        particleCtx.beginPath();
        particleCtx.moveTo(0, -dotSize * 2.4);
        particleCtx.lineTo(0, dotSize * 2.4);
        particleCtx.stroke();
      } else {
        particleCtx.beginPath();
        particleCtx.arc(0, 0, dotSize, 0, Math.PI * 2);
        particleCtx.fill();
      }
      particleCtx.restore();
      return;
    }
    if (particle.type === 'leaf') {
      particleCtx.beginPath();
      particleCtx.ellipse(0, 0, particle.size * 1.8, particle.size * 0.48, 0, 0, Math.PI * 2);
      particleCtx.fill();
    } else if (particle.type === 'dash') {
      particleCtx.lineWidth = Math.max(1, particle.size * 0.28);
      particleCtx.lineCap = 'round';
      particleCtx.beginPath();
      particleCtx.moveTo(-particle.size, 0);
      particleCtx.lineTo(particle.size * 1.8, 0);
      particleCtx.stroke();
    } else if (particle.type === 'ring') {
      particleCtx.lineWidth = 1.4;
      particleCtx.beginPath();
      particleCtx.ellipse(0, 0, particle.size * 2.4, particle.size * 0.76, 0, 0, Math.PI * 2);
      particleCtx.stroke();
    } else if (particle.type === 'water') {
      particleCtx.beginPath();
      particleCtx.arc(0, 0, particle.size, 0, Math.PI * 2);
      particleCtx.fill();
      particleCtx.fillStyle = 'rgba(255,255,255,0.42)';
      particleCtx.beginPath();
      particleCtx.arc(-particle.size * 0.25, -particle.size * 0.25, particle.size * 0.35, 0, Math.PI * 2);
      particleCtx.fill();
    } else if (particle.type === 'spark') {
      particleCtx.lineWidth = 1.3;
      particleCtx.beginPath();
      particleCtx.moveTo(-particle.size, 0);
      particleCtx.lineTo(particle.size, 0);
      particleCtx.moveTo(0, -particle.size);
      particleCtx.lineTo(0, particle.size);
      particleCtx.stroke();
    } else {
      particleCtx.beginPath();
      particleCtx.arc(0, 0, particle.size, 0, Math.PI * 2);
      particleCtx.fill();
    }
    particleCtx.restore();
  }

  function updateParticles(dt, now, characterScreenX, characterScreenY) {
    if (!particleCanvas || !particleCtx) {
      return;
    }
    setTimedDataset('particleFlash', '1', particleBurstState.flashUntil);
    setTimedDataset('screenShake', '1', particleBurstState.shakeUntil);
    flushParticleSpawnQueue();

    spawnFootstepParticles(now, characterScreenX, characterScreenY);
    spawnMossWeather(now);
    spawnJourneyAmbient(now);
    spawnKintsugiMote(now);
    const particleMode = state.started || particles.length ? 'active' : 'idle';
    if (root.dataset.particles !== particleMode) {
      root.dataset.particles = particleMode;
    }

    if (state.started) {
      spawnFishingParticles(now);
    }

    const dpr = Math.max(0.1, particleCanvas.width / Math.max(1, window.innerWidth));
    const width = particleCanvas.width / dpr;
    const height = particleCanvas.height / dpr;
    particleCtx.clearRect(0, 0, width, height);
    drawLivingMemoryWeather(now);
    drawMemoryReturn(now, characterScreenX, characterScreenY);
    drawJourneyTransitionGate(now, characterScreenX, characterScreenY);
    drawJourneyLanding(now);
    drawJourneyAwakening(now, characterScreenX, characterScreenY);
    drawJourneySecrets(now, characterScreenX, characterScreenY);
    drawJourneyMemory(now, characterScreenX, characterScreenY);
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      const t = dt;
      const elapsedLife = Math.max(0, now - particle.createdAt);
      updateParticleLanguageMotion(particle, dt, now, width, height);
      if (particle.type === 'paper-fragment') {
        particle.vx += Math.sin(
          elapsedLife * particle.paperCurlSpeed + particle.paperCurlPhase
        ) * particle.paperWobble * t;
        if (elapsedLife >= particle.paperFallDelay) {
          particle.vy += particle.paperGravity * t;
        }
      }
      if (
        particle.targetX !== undefined
        && particle.targetY !== undefined
        && elapsedLife >= particle.targetDelay
      ) {
        const targetProgress = particle.textLockAfter > 0
          ? clamp((elapsedLife - particle.targetDelay) / Math.max(1, particle.textLockAfter - particle.targetDelay), 0, 1)
          : 1;
        const attractScale = particle.textLockAfter > 0
          ? 0.55 + smooth(targetProgress) * 0.72
          : 1;
        particle.vx += (particle.targetX - particle.x) * particle.targetAttract * t * attractScale;
        particle.vy += (particle.targetY - particle.y) * particle.targetAttract * t * attractScale;
        const damping = runtime.frameDamping(particle.targetDamping, dt);
        particle.vx *= damping;
        particle.vy *= damping;
      }
      particle.vx += particle.ax * t;
      particle.vy += particle.ay * t;
      particle.x += particle.vx * t;
      particle.y += particle.vy * t;
      particle.angle += particle.spin * t;
      particle.life = Math.max(0, particle.maxLife - elapsedLife);
      const age = clamp(elapsedLife / particle.maxLife, 0, 1);
      const alpha = clamp(Math.sin(Math.PI * clamp(1 - age, 0, 1)) * (particle.type === 'text' ? 1.1 : 0.95), 0, 1);
      drawParticle(particle, alpha, now);
      if (elapsedLife >= particle.maxLife || particle.x < -180 || particle.x > width + 220 || particle.y < -180 || particle.y > height + 220) {
        recycleParticleAt(i);
      }
    }
  }

  function addMoodNode(className, options = {}) {
    if (!atmosphereLayer) {
      return null;
    }
    const node = document.createElement('div');
    node.className = `mood ${className}`;
    node.dataset.revealX = String(options.revealX || 0);
    node.style.left = `${nn(options.x || 0)}px`;
    node.style.top = `${nn(options.y || 0)}px`;
    if (options.width !== undefined) {
      node.style.width = `${nn(options.width)}px`;
    }
    if (options.height !== undefined) {
      node.style.height = `${nn(options.height)}px`;
    }
    Object.entries(options.vars || {}).forEach(([key, value]) => {
      node.style.setProperty(key, String(value));
    });
    atmosphereLayer.appendChild(node);
    moodNodes.push(node);
    return node;
  }

  function addMoodLeaf(x, y, revealX, seed) {
    const r = focusRng(seed);
    return addMoodNode('mood-leaf', {
      x,
      y,
      width: 18 + r() * 18,
      height: 4 + r() * 4,
      revealX,
      vars: {
        '--leaf-rotate': `${Math.round(-28 + r() * 56)}deg`,
        '--leaf-delay': `${Math.round(r() * 1800)}ms`,
        '--leaf-drift': `${Math.round(42 + r() * 76)}px`,
      },
    });
  }

  function addMoodGrassCluster(x, bottomY, width, height, revealX, seed) {
    const r = focusRng(seed);
    const cluster = addMoodNode('mood-grass-cluster', {
      x,
      y: bottomY - height,
      width,
      height,
      revealX,
      vars: {
        '--grass-sway': `${Math.round(8 + r() * 10)}px`,
      },
    });
    if (!cluster) {
      return null;
    }

    const bladeCount = Math.max(7, Math.round(width / 8));
    for (let i = 0; i < bladeCount; i += 1) {
      const blade = document.createElement('i');
      const bx = (i / Math.max(1, bladeCount - 1)) * width + (r() - 0.5) * 12;
      const bh = height * (0.35 + r() * 0.65);
      blade.style.left = `${nn(Math.max(0, bx))}px`;
      blade.style.height = `${nn(bh)}px`;
      blade.style.setProperty('--blade-tilt', `${Math.round(-24 + r() * 48)}deg`);
      blade.style.setProperty('--blade-delay', `${Math.round(r() * 900)}ms`);
      cluster.appendChild(blade);
    }
    return cluster;
  }

  function addMoodForestColumn(x, bottomY, width, height, revealX, seed, isNear = false) {
    const r = focusRng(seed);
    const node = addMoodNode(isNear ? 'mood-forest-column mood-forest-column--near' : 'mood-forest-column', {
      x,
      y: bottomY - height,
      width,
      height,
      revealX,
      vars: {
        '--column-delay': `${Math.round(r() * 700)}ms`,
        '--column-hue': `${Math.round(82 + r() * 18)}`,
      },
    });
    if (!node) {
      return null;
    }
    const cap = document.createElement('b');
    node.appendChild(cap);
    return node;
  }

  function addMoodLake() {
    const lake = addMoodNode('mood-lake', {
      x: focusWorld.waterStart,
      y: 676,
      width: 1600,
      height: 250,
      revealX: 4070,
    });
    if (!lake) {
      return;
    }
    for (let i = 0; i < 7; i += 1) {
      const wave = document.createElement('i');
      wave.className = 'mood-wave';
      wave.style.top = `${22 + i * 22}px`;
      wave.style.left = `${(i % 2) * 110}px`;
      wave.style.width = `${820 + i * 100}px`;
      wave.style.setProperty('--wave-delay', `${i * 260}ms`);
      lake.appendChild(wave);
    }
    [
      [280, 92, 0],
      [580, 118, 1],
      [940, 78, 2],
      [1320, 132, 3],
    ].forEach(([left, top, index]) => {
      const ripple = document.createElement('span');
      ripple.className = 'mood-ripple';
      ripple.style.left = `${left}px`;
      ripple.style.top = `${top}px`;
      ripple.style.setProperty('--ripple-delay', `${index * 650}ms`);
      lake.appendChild(ripple);
    });
    addMoodNode('mood-lake-shine', {
      x: focusWorld.waterStart + 120,
      y: 708,
      width: 1120,
      height: 92,
      revealX: 4380,
    });
  }

  function buildMossMoodWorld() {
    addMoodNode('mood-ground-band', {
      x: 1020,
      y: 676,
      width: 4640,
      height: 190,
      revealX: 1040,
    });

    [1180, 1440, 1740, 2180, 2550, 2960, 3370, 3820, 4210, 4620].forEach((x, index) => {
      addMoodGrassCluster(x, terrainY(x) + 18, 76 + (index % 3) * 28, 78 + (index % 4) * 20, x - 230, 100 + index);
    });

    for (let i = 0; i < 22; i += 1) {
      const x = 1320 + i * 155;
      addMoodLeaf(x, 324 + Math.sin(i * 0.7) * 42, x - 300, 250 + i);
    }

    addMoodNode('mood-sky-wash', {
      x: 960,
      y: 80,
      width: 4600,
      height: 430,
      revealX: 1680,
    });

    [
      [2470, 704, 76, 240, 2180],
      [2650, 708, 108, 302, 2300],
      [2860, 706, 88, 260, 2440],
      [3080, 710, 130, 330, 2600],
      [3330, 708, 104, 292, 2800],
      [3610, 706, 150, 360, 3040],
      [3940, 708, 132, 326, 3320],
      [4280, 706, 168, 370, 3620],
    ].forEach(([x, bottomY, width, height, revealX], index) => {
      addMoodForestColumn(x, bottomY, width, height, revealX, 330 + index, index > 4);
    });

    addMoodNode('mood-forest-haze', {
      x: 2240,
      y: 424,
      width: 2600,
      height: 340,
      revealX: 2700,
    });

    addMoodLake();
  }

  function focusRng(seed) {
    let a = (Math.floor(seed * 1000003) >>> 0) || 7;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function addWorldDot(x, y, options = {}) {
    const rgb = options.rgb || [76, 88, 78];
    const red = clamp(Math.round(rgb[0]), 0, 255);
    const green = clamp(Math.round(rgb[1]), 0, 255);
    const blue = clamp(Math.round(rgb[2]), 0, 255);
    const colorKey = (red << 16) | (green << 8) | blue;
    let colorCss = dotWorld.colors.get(colorKey);
    if (!colorCss) {
      colorCss = `rgb(${red}, ${green}, ${blue})`;
      dotWorld.colors.set(colorKey, colorCss);
    }
    const kind = options.kind || 'world';
    const sample = runtime.stablePointSample(
      x,
      y,
      (options.phase || 0) * 1000 + kind.length * 37
    );
    const dot = {
      x,
      y,
      kind,
      colorCss,
      motionHandler: dotMotion.resolve(kind),
      alpha: options.alpha ?? 0.34,
      size: options.size || 2,
      revealX: options.revealX ?? x - 280,
      parallax: options.parallax ?? 1,
      sway: options.sway || 0,
      bob: options.bob || 0,
      speed: options.speed || 1,
      phase: options.phase || 0,
      glow: options.glow || 0,
      waterDepth: options.waterDepth ?? 0,
      depthAnchor: options.depthAnchor ?? 0,
      driftSpeed: options.driftSpeed || 0,
      driftOffset: options.driftOffset || 0,
      wrapPad: options.wrapPad || 0,
      anchorX: options.anchorX ?? x,
      entryPad: options.entryPad || 0,
      scrollRate: options.scrollRate || 0,
      route: options.route || null,
      routeLength: options.routeLength || 0,
      routeOffset: options.routeOffset || 0,
      routeSpeed: options.routeSpeed || 0,
      routePoint: options.route ? { x, y } : null,
      motionRadius: options.motionRadius || 0,
      signalTail: options.signalTail || 0,
      rainSpan: options.rainSpan || 0,
      rainSpeed: options.rainSpeed || 0,
      rainOffset: options.rainOffset || 0,
      rainRouteTravel: options.rainRouteTravel || 0,
      sample,
      shapeWorld: options.shapeWorld || particleWorldAt(x),
      shapePhase: options.shapePhase ?? sample * Math.PI * 2,
      shapeAngle: options.shapeAngle ?? sample * Math.PI * 2,
    };
    dotWorld.dots.push(dot);
    if (dot.kind === 'cloud') {
      dotWorld.cloudDots.push(dot);
      return;
    }
    const bucketIndex = Math.floor(dot.x / DOT_BUCKET_SIZE);
    const bucket = dotWorld.buckets.get(bucketIndex) || [];
    bucket.push(dot);
    dotWorld.buckets.set(bucketIndex, bucket);
    dotWorld.activeBucketStart = Number.NaN;
    dotWorld.activeBucketEnd = Number.NaN;
  }

  function activeWorldDots() {
    const start = Math.floor((state.cameraX - DOT_BUCKET_MARGIN) / DOT_BUCKET_SIZE);
    const end = Math.floor((state.cameraX + state.visibleW + DOT_BUCKET_MARGIN) / DOT_BUCKET_SIZE);
    if (start === dotWorld.activeBucketStart && end === dotWorld.activeBucketEnd) {
      return dotWorld.activeDots;
    }
    dotWorld.activeBucketStart = start;
    dotWorld.activeBucketEnd = end;
    dotWorld.activeDots.length = 0;
    for (let bucketIndex = start; bucketIndex <= end; bucketIndex += 1) {
      const bucket = dotWorld.buckets.get(bucketIndex);
      if (bucket) {
        dotWorld.activeDots.push(...bucket);
      }
    }
    return dotWorld.activeDots;
  }

  function addDotLine(x1, y1, x2, y2, options = {}) {
    const r = options.rng || Math.random;
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const count = Math.max(2, Math.ceil(distance / (options.step || 9)));
    const nx = distance ? -(y2 - y1) / distance : 0;
    const ny = distance ? (x2 - x1) / distance : 0;
    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      const jitter = (r() - 0.5) * (options.jitter || 2.4);
      addWorldDot(
        x1 + (x2 - x1) * t + nx * jitter,
        y1 + (y2 - y1) * t + ny * jitter,
        {
          kind: options.kind || 'world',
          rgb: options.rgb || [68, 67, 62],
          alpha: options.alpha ?? 0.5,
          size: (options.size || 2.2) * (0.76 + r() * 0.42),
          revealX: options.revealX ?? Math.min(x1, x2) - 260,
          parallax: options.parallax ?? 1,
          sway: options.sway || 0,
          bob: options.bob || 0,
          speed: options.speed || 1,
          phase: r() * Math.PI * 2,
          glow: options.glow || 0,
          waterDepth: options.waterDepth ?? 0,
          depthAnchor: options.depthAnchor ?? 0,
        }
      );
    }
  }

  function forestClearingStrength(x, y, seed = 0) {
    const aboveGround = terrainY(x) - y;
    if (aboveGround < -16 || aboveGround > 255) {
      return 0;
    }
    const rootFill = clamp((aboveGround - 24) / 76, 0, 1);
    const pathBand = rootFill * clamp((210 - aboveGround) / 150, 0, 1);
    const lightBand = clamp((aboveGround - 48) / 110, 0, 1) * clamp((258 - aboveGround) / 140, 0, 1);
    const waveringEdge = 0.86 + Math.sin(x / 240 + seed * 0.37) * 0.1 + Math.sin(x / 510 + seed) * 0.06;
    return clamp(Math.max(pathBand * 0.9, lightBand * 0.58) * waveringEdge, 0, 0.9);
  }

  function forestPathDot(x, y, seed, alpha, size, isTrunk = false) {
    const clearing = forestClearingStrength(x, y, seed);
    if (clearing <= 0.01) {
      return { alpha, size };
    }
    const holeChance = clearing * (isTrunk ? 0.3 : 0.46);
    if (groundNoise(x * 0.73 + y * 0.19, seed + (isTrunk ? 11 : 7)) < holeChance) {
      return null;
    }
    return {
      alpha: alpha * (1 - clearing * (isTrunk ? 0.56 : 0.74)),
      size: size * (1 - clearing * (isTrunk ? 0.2 : 0.3)),
    };
  }

  function buildDotTreeRootFlare(x, width, seed, options = {}) {
    const r = focusRng(seed + 97);
    const revealX = options.revealX ?? x - 330;
    const parallax = options.parallax ?? 1;
    const count = Math.round(width * 0.24);
    for (let i = 0; i < count; i += 1) {
      const side = (r() - 0.5) * width * 0.28;
      const px = x + side;
      const groundY = terrainY(px);
      const py = groundY - r() * 12 + Math.abs(side) / Math.max(1, width) * 8;
      addWorldDot(px, py, {
        kind: 'trunk',
        rgb: [90 + r() * 22, 76 + r() * 16, 58 + r() * 12],
        alpha: 0.24 + r() * 0.28,
        size: 1.6 + r() * 2.6,
        revealX,
        parallax,
        sway: 0.16,
        speed: 0.28 + r() * 0.24,
        phase: r() * Math.PI * 2,
      });
    }
  }

  function buildDotLowerFoliage(x, baseY, width, seed, options = {}) {
    const r = focusRng(seed + 211);
    const revealX = options.revealX ?? x - 330;
    const parallax = options.parallax ?? 1;
    const density = options.density || 1;
    const count = Math.round(width * 1.05 * density);
    for (let i = 0; i < count; i += 1) {
      const side = (r() - 0.5) * width * (0.82 + r() * 0.48);
      const lift = 10 + r() * 58 + Math.abs(side) / Math.max(1, width) * 28;
      const px = x + side;
      const py = baseY - lift + (r() - 0.5) * 8;
      const adjusted = forestPathDot(px, py, seed + 3, 0.22 + r() * 0.22, 1.8 + r() * 2.7);
      if (!adjusted) {
        continue;
      }
      addWorldDot(px, py, {
        kind: 'forest',
        rgb: [72 + r() * 28, 118 + r() * 34, 92 + r() * 22],
        alpha: adjusted.alpha,
        size: adjusted.size,
        revealX,
        parallax,
        sway: 0.9 + r() * 1.6,
        bob: 0.22 + r() * 0.42,
        speed: 0.32 + r() * 0.42,
        phase: r() * Math.PI * 2,
      });
    }
  }

  function buildDotForestTree(x, baseY, width, height, seed, options = {}) {
    const r = focusRng(seed);
    const parallax = options.parallax ?? 1;
    const revealX = options.revealX ?? x - 330;
    const density = options.density || 1;
    const trunkBaseY = options.trunkBaseY ?? terrainY(x) + 2;
    const canopyCount = Math.round((width * height) / 54 * density);
    for (let i = 0; i < canopyCount; i += 1) {
      const t = Math.pow(r(), 0.74);
      const y = baseY - height * t;
      const tier = 0.72 + Math.sin(t * Math.PI * 7) * 0.18;
      const half = Math.max(4, width * (1 - t) * tier);
      const px = x + (r() - 0.5) * half * 2;
      const py = y + (r() - 0.5) * 10;
      const shade = 70 + r() * 34 - t * 12;
      const alpha = (options.alpha ?? 0.28) + r() * 0.18;
      const size = (options.size || 2.3) + (1 - t) * 2.1 + r() * 1.4;
      const adjusted = forestPathDot(px, py, seed, alpha, size);
      if (!adjusted) {
        continue;
      }
      addWorldDot(px, py, {
        kind: 'forest',
        rgb: [shade, 104 + r() * 30, 82 + r() * 28],
        alpha: adjusted.alpha,
        size: adjusted.size,
        revealX,
        parallax,
        sway: (options.sway || 1.4) * t,
        bob: 0.4 * t,
        speed: 0.38 + r() * 0.5,
        phase: r() * Math.PI * 2,
      });
    }

    buildDotLowerFoliage(x, baseY, width, seed, options);

    const trunkCount = Math.round(height * 0.52 * density);
    for (let i = 0; i < trunkCount; i += 1) {
      const t = r();
      const y = trunkBaseY - height * 0.54 * t;
      const trunkHalf = Math.max(3, width * 0.08 * (1 - t * 0.35));
      const px = x + (r() - 0.5) * trunkHalf * 2;
      const alpha = (options.alpha ?? 0.3) + 0.18;
      const size = (options.size || 2.4) + r() * 1.2;
      const adjusted = forestPathDot(px, y, seed, alpha, size, true);
      if (!adjusted) {
        continue;
      }
      addWorldDot(px, y, {
        kind: 'trunk',
        rgb: [86 + r() * 18, 78 + r() * 14, 66 + r() * 12],
        alpha: adjusted.alpha,
        size: adjusted.size,
        revealX,
        parallax,
        sway: 0.2,
        speed: 0.3,
        phase: r() * Math.PI * 2,
      });
    }
    buildDotTreeRootFlare(x, width, seed, options);
  }

  function buildDotPier() {
    const r = focusRng(913);
    const K = focusWorld;
    const deckTop = [];
    const deckBottom = [];
    for (let x = K.pierStart; x <= 5550; x += 50) {
      deckTop.push([x, terrainY(x) + 8]);
      deckBottom.push([x, terrainY(x) + 23]);
    }
    [deckTop, deckBottom].forEach((points) => {
      for (let i = 1; i < points.length; i += 1) {
        addDotLine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], {
          rng: r,
          rgb: [58, 59, 56],
          alpha: 0.58,
          size: 2.4,
          step: 7,
          jitter: 1.2,
          revealX: 4840,
        });
      }
    });
    for (let x = K.pierStart + 32; x < 5550; x += 56) {
      addDotLine(x, terrainY(x) + 8, x - 4, terrainY(x) + 26, {
        rng: r,
        rgb: [62, 63, 60],
        alpha: 0.52,
        size: 2.1,
        step: 5.5,
        jitter: 0.9,
        revealX: 5000,
      });
    }
    [5188, 5342, 5498].forEach((x, index) => {
      addDotLine(x, terrainY(x) + 24, x - 4, K.waterY + 6 + index * 2, {
        rng: r,
        rgb: [56, 58, 56],
        alpha: 0.55,
        size: 2.2,
        step: 7,
        jitter: 1,
        revealX: 4980,
      });
      addDotLine(x - 22, K.waterY + 4, x + 36, K.waterY + 4, {
        rng: r,
        rgb: [84, 164, 180],
        alpha: 0.24,
        size: 1.7,
        step: 8,
        jitter: 2,
        revealX: 5020,
        sway: 4,
        bob: 1,
      });
    });
    const bucketX = 5210;
    const bucketY = terrainY(bucketX) + 8;
    addDotLine(bucketX - 22, bucketY - 34, bucketX - 15, bucketY, { rng: r, rgb: [55, 56, 53], alpha: 0.55, size: 2, step: 5, revealX: 5080 });
    addDotLine(bucketX + 22, bucketY - 34, bucketX + 17, bucketY, { rng: r, rgb: [55, 56, 53], alpha: 0.55, size: 2, step: 5, revealX: 5080 });
    addDotLine(bucketX - 15, bucketY, bucketX + 17, bucketY, { rng: r, rgb: [55, 56, 53], alpha: 0.55, size: 2, step: 5, revealX: 5080 });
  }

  function buildDotLake() {
    const r = focusRng(887);
    const K = focusWorld;
    const shoreX = K.waterStart;
    const lakeEnd = 6640;
    const colors = [
      [92, 166, 178],
      [118, 187, 198],
      [76, 145, 160],
      [151, 205, 212],
    ];
    addDotLine(shoreX, K.waterY + 4, lakeEnd, K.waterY + 4, {
      rng: r,
      kind: 'water',
      rgb: [82, 156, 170],
      alpha: 0.56,
      size: 2.15,
      step: 4.2,
      jitter: 1.35,
      revealX: 4070,
      sway: 5.6,
      bob: 1.35,
      speed: 0.46,
      parallax: 0.98,
      waterDepth: 0,
    });
    addDotLine(shoreX + 12, K.waterY + 19, lakeEnd - 20, K.waterY + 19, {
      rng: r,
      kind: 'water',
      rgb: [110, 183, 194],
      alpha: 0.38,
      size: 1.8,
      step: 6.1,
      jitter: 1.9,
      revealX: 4110,
      sway: 6,
      bob: 1.6,
      speed: 0.4,
      parallax: 0.97,
      waterDepth: 0.08,
    });
    for (let lane = 0; lane < 12; lane += 1) {
      const depth = lane / 11;
      const baseY = K.waterY + 7 + lane * 12.4;
      const laneOffset = lane % 2 ? 44 : 10;
      for (let x = shoreX + laneOffset; x < lakeEnd - 24; x += 145 + r() * 48) {
        const length = 92 + r() * 108;
        const y = baseY + Math.sin(x * 0.013 + lane * 0.82) * (3.5 + depth * 2.4);
        addDotLine(x, y, Math.min(lakeEnd, x + length), y + (r() - 0.5) * 3.4, {
          rng: r,
          kind: 'water',
          rgb: colors[lane % colors.length],
          alpha: 0.23 + (1 - depth) * 0.14,
          size: 1.28 + r() * 0.96 + (1 - depth) * 0.28,
          step: 6.2 + depth * 2,
          jitter: 2.4 + depth * 0.8,
          revealX: 4130 + lane * 22,
          sway: 4.4 + lane * 0.36,
          bob: 1.25 + lane * 0.16,
          speed: 0.32 + lane * 0.04,
          parallax: 0.98,
          waterDepth: depth,
        });
      }
    }
    [5240, 5450, 5700, 6000, 6290, 6520].forEach((centerX, rippleIndex) => {
      const radiusX = 40 + rippleIndex * 6;
      const radiusY = 7 + rippleIndex * 1.15;
      const count = 36;
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2;
        addWorldDot(
          centerX + Math.cos(angle) * radiusX,
          K.waterY + 10 + rippleIndex * 20 + Math.sin(angle) * radiusY,
          {
            kind: 'water',
            rgb: colors[(rippleIndex + 1) % colors.length],
            alpha: 0.28,
            size: 1.55 + r() * 0.6,
            revealX: centerX - 460,
            sway: 3.2,
            bob: 1,
            speed: 0.42 + rippleIndex * 0.08,
            phase: r() * Math.PI * 2,
            waterDepth: 0.04 + rippleIndex * 0.03,
          }
        );
      }
    });
  }

  function buildDotSky() {
    const r = focusRng(714);
    [
      [860, 190, 210, 55, 1480],
      [2350, 170, 310, 65, 2320],
      [3900, 230, 380, 75, 3440],
    ].forEach(([cx, cy, width, height, revealX], groupIndex) => {
      const driftSpeed = 7 + groupIndex * 1.8;
      for (let i = 0; i < 125; i += 1) {
        const dx = (r() - 0.5) * width;
        const dy = (r() - 0.5) * height;
        const inside = (dx * dx) / ((width * 0.52) ** 2) + (dy * dy) / ((height * 0.52) ** 2);
        if (inside > 1) {
          continue;
        }
        addWorldDot(cx + dx, cy + dy, {
          kind: 'cloud',
          rgb: groupIndex > 1 ? [126, 188, 198] : [130, 154, 146],
          alpha: 0.055 + r() * 0.095,
          size: 0.9 + r() * 2.1,
          revealX,
          parallax: 0.42,
          sway: 1.2 + r() * 3.8,
          bob: 0.8 + r() * 1.4,
          speed: 0.14 + r() * 0.24,
          phase: r() * Math.PI * 2,
          driftSpeed,
          wrapPad: 420,
          anchorX: cx,
          entryPad: width * 0.62,
          scrollRate: 0.56,
        });
      }
    });
  }

  function buildMossDotWorld() {
    if (dotWorld.built) {
      return;
    }
    dotWorld.built = true;
    buildDotSky();
    [
      [2480, 86, 260, 501, 0.78, 0.48],
      [2740, 118, 320, 502, 0.82, 0.55],
      [3060, 142, 360, 503, 0.86, 0.68],
      [3420, 126, 330, 504, 0.9, 0.72],
      [3840, 176, 390, 505, 0.94, 0.84],
      [4240, 190, 410, 506, 1, 0.95],
    ].forEach(([x, width, height, seed, parallax, density]) => {
      const groundY = terrainY(x) + 2;
      buildDotForestTree(x, groundY - Math.max(48, width * 0.42), width, height, seed, {
        trunkBaseY: groundY,
        parallax,
        density,
        alpha: 0.19 + density * 0.18,
        size: 1.7 + density,
        sway: 1 + density * 2,
      });
    });
    buildDotLake();
    buildDotPier();
  }

  function mediaSignDecoration(key) {
    if (key === 'taupe') {
      return '<span class="media-sign__circuit" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
    }
    if (key === 'islog') {
      return `<span class="media-sign__neighbors" aria-hidden="true"><i>← taupe</i><i>${isEnglish ? 'Ojicra' : 'おじクラ'} →</i></span>`;
    }
    if (key === 'ojicra') {
      return '<span class="media-sign__blocks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
    }
    if (key === 'monoomoi') {
      return '<span class="media-sign__tag-hole" aria-hidden="true"></span>';
    }
    if (key === 'monoerabi') {
      return '<span class="media-sign__tabs" aria-hidden="true"><i></i><i></i><i></i></span>';
    }
    return '';
  }

  function mediaEmblemPointMotion(blueprint, point, index) {
    const angle = ((index * 137.508 + blueprint.key.length * 19) % 360) * (Math.PI / 180);
    const jitter = 5 + (index % 4) * 2;
    let fromX = Math.cos(angle) * jitter;
    let fromY = Math.sin(angle) * jitter;
    if (blueprint.verb === 'walk') {
      fromX += (50 - point.x) * 0.28;
      fromY += (44 - point.y) * 0.22;
    } else if (blueprint.verb === 'connect') {
      fromX -= 34 + (index % 4) * 4;
      fromY *= 0.35;
    } else if (blueprint.verb === 'capture') {
      fromX = 0;
      fromY = 0;
    } else if (blueprint.verb === 'build') {
      fromX *= 0.3;
      fromY = 28 + (index % 3) * 4;
    } else if (blueprint.verb === 'unwrap') {
      fromX = (50 - point.x) * 0.54;
      fromY = (48 - point.y) * 0.48;
    } else if (blueprint.verb === 'choose') {
      fromX *= 0.45;
      fromY = point.tone === 2 ? -18 : -8 - (index % 3) * 4;
    }
    return {
      x: fromX,
      y: fromY,
      rotation: Math.round((Math.sin(index * 2.17) * 42) * 10) / 10,
      delay: point.group * 86 + (index % 5) * 19,
    };
  }

  function mediaEmblemPointMarkup(blueprint, point, index) {
    const motion = mediaEmblemPointMotion(blueprint, point, index);
    return `<i data-shape="${blueprint.shape}" data-tone="${point.tone}" data-role="${point.role}" style="--point-x:${point.x.toFixed(2)};--point-y:${point.y.toFixed(2)};--from-x:${motion.x.toFixed(2)}px;--from-y:${motion.y.toFixed(2)}px;--point-rotation:${motion.rotation}deg;--point-delay:${motion.delay}ms"></i>`;
  }

  function mediaEmblemPointsMarkup(key) {
    const blueprint = runtime.mediaEmblemBlueprint?.(key);
    return blueprint
      ? blueprint.points.map((point, index) => mediaEmblemPointMarkup(blueprint, point, index)).join('')
      : '';
  }

  function mediaEmblemMarkup(key, context = 'sign') {
    const blueprint = runtime.mediaEmblemBlueprint?.(key);
    if (!blueprint) {
      return '';
    }
    return `
      <span class="media-emblem media-emblem--${key}" data-media-emblem="${key}" data-emblem-context="${context}" data-emblem-verb="${blueprint.verb}" aria-hidden="true">
        <span class="media-emblem__field"></span>
      </span>
    `;
  }

  function hydrateMediaEmblem(node, options = {}) {
    if (!node || node.dataset.emblemReady === 'true' || node.dataset.emblemHydrating === 'true') {
      return node;
    }
    const key = node.dataset.mediaEmblem || '';
    const blueprint = runtime.mediaEmblemBlueprint?.(key);
    if (!blueprint) {
      node.hidden = true;
      return null;
    }
    node.classList.add('media-emblem', `media-emblem--${key}`);
    node.dataset.emblemVerb = blueprint.verb;
    const shouldAssemble = options.assembled || node.dataset.emblemContext === 'atlas' || motionReduced;
    if (options.defer && !motionReduced) {
      node.dataset.emblemHydrating = 'true';
      node.innerHTML = '<span class="media-emblem__field"></span>';
      const field = node.firstElementChild;
      let pointIndex = 0;
      const appendBatch = () => {
        const end = Math.min(blueprint.points.length, pointIndex + 18);
        let markup = '';
        for (; pointIndex < end; pointIndex += 1) {
          markup += mediaEmblemPointMarkup(blueprint, blueprint.points[pointIndex], pointIndex);
        }
        field?.insertAdjacentHTML('beforeend', markup);
        if (pointIndex < blueprint.points.length) {
          requestAnimationFrame(appendBatch);
          return;
        }
        delete node.dataset.emblemHydrating;
        node.dataset.emblemReady = 'true';
        if (shouldAssemble || node.dataset.emblemAssemblePending === 'true') {
          delete node.dataset.emblemAssemblePending;
          node.classList.add('is-assembled');
        }
      };
      requestAnimationFrame(appendBatch);
      return node;
    }
    node.dataset.emblemReady = 'true';
    node.innerHTML = `<span class="media-emblem__field">${mediaEmblemPointsMarkup(key)}</span>`;
    if (shouldAssemble) {
      node.classList.add('is-assembled');
    }
    return node;
  }

  function hydrateMediaEmblems(context = 'atlas') {
    document.querySelectorAll(
      `[data-media-emblem][data-emblem-context="${context}"]:not([data-emblem-ready="true"])`
    ).forEach((node) => hydrateMediaEmblem(node, { assembled: context === 'atlas' }));
  }

  function mediaSignCopyMarkup(area, flavor = '', options = {}) {
    const showName = options.showName !== false;
    return `
      ${flavor ? `<span class="media-sign__flavor">${escapeHtml(flavor)}</span>` : ''}
      ${showName ? `<strong class="media-sign__name">${escapeHtml(area.name)}</strong>` : ''}
      <b class="media-sign__role">${escapeHtml(area.role || area.title || '')}</b>
      <p class="media-sign__description">${escapeHtml(area.description || '')}</p>
    `;
  }

  function mediaSignActionMarkup(area) {
    return `
      <span class="media-sign__enter" aria-hidden="true">
        <kbd class="action-key-signal action-key-signal--sign">${actionKeySignalMarkup('ENTER')}</kbd>
        <span>${isEnglish ? 'Open media' : 'メディアを開く'}</span>
      </span>
      <a class="media-sign__destination" data-media-sign-link href="${escapeHtml(area.url)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true" aria-keyshortcuts="Enter"></a>
    `;
  }

  function buildJourneyWorld() {
    if (!journey) {
      return;
    }
    journey.build({
      addDot: addWorldDot,
      addLine: addDotLine,
      rng: focusRng,
      mossTerrain: mossTerrainY,
    });
    journey.landmarks.forEach((landmark) => {
      const area = areaMap.get(landmark.key);
      const node = document.createElement('div');
      node.className = `journey-marker journey-marker--${landmark.key}`;
      node.inert = true;
      node.dataset.revealX = String(landmark.x - 420);
      node.style.left = `${landmark.x}px`;
      node.style.top = `${landmark.y}px`;
      const hubLinks = landmark.key === 'hub' ? `
        <div class="journey-hub-threshold" aria-hidden="true">
          <span class="journey-hub-threshold__threads"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="journey-hub-threshold__copy">
            <small>ACT II / LIVING ATLAS</small>
            <b></b>
            <span class="journey-hub-threshold__direction">${isEnglish ? 'Keep walking right' : '右へ、その'}</span>
          </span>
        </div>
      ` : '';
      if (area) {
        node.classList.add('media-sign', `media-sign--${area.key}`);
        node.setAttribute('aria-hidden', 'true');
        node.dataset.signX = String(landmark.x);
        node.innerHTML = `
          <span class="media-sign__surface">
            ${mediaSignDecoration(area.key)}
            ${mediaEmblemMarkup(area.key)}
            ${mediaSignCopyMarkup(area, isEnglish ? area.label : landmark.eyebrow)}
            ${mediaSignActionMarkup(area)}
          </span>
        `;
        mediaSigns.push({
          node,
          surface: node.querySelector('.media-sign__surface'),
          emblem: node.querySelector('[data-media-emblem]'),
          key: area.key,
          name: area.name,
          x: landmark.x,
          radius: 340,
          assembled: motionReduced,
          approaching: false,
          reading: false,
          announced: false,
          viewportShift: 0,
          link: node.querySelector('[data-media-sign-link]'),
        });
      } else {
        node.innerHTML = `
          <span>${escapeHtml(isEnglish ? 'Six worlds become one' : landmark.eyebrow)}</span>
          <strong>${escapeHtml(landmark.title)}</strong>
          ${hubLinks}
        `;
      }
      labelsLayer.appendChild(node);
      labels.push(node);
    });
  }

  function resetDotCanvasBands() {
    dotCanvasBandList.forEach((band) => {
      band.weight = 0;
      band.weightedParallax = 0;
      band.activeColor = '';
    });
  }

  function recordDotBandParallax(parallax, weight = 1) {
    const value = clamp(Number(parallax) || 0, 0, 1);
    const band = value < 0.95 ? dotCanvasBands.far : dotCanvasBands.near;
    const visibleWeight = Math.max(0.01, Number(weight) || 0.01);
    band.weight += visibleWeight;
    band.weightedParallax += value * visibleWeight;
    return band;
  }

  function finalizeDotCanvasBands() {
    dotCanvasBandList.forEach((band) => {
      if (band.weight <= 0) {
        band.representativeParallax = band.defaultParallax;
        return;
      }
      const average = band.weightedParallax / band.weight;
      band.representativeParallax = band === dotCanvasBands.far
        ? clamp(average, 0.4, 0.949)
        : clamp(average, 0.95, 1);
    });
  }

  function drawDotWorld(now) {
    if (!dotWorldCanvas || !dotWorldCtx || !dotWorldFarCanvas || !dotWorldFarCtx || !dotWorld.built) {
      return;
    }
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    dotCanvasBandList.forEach((band) => {
      band.ctx.clearRect(
        -DOT_CANVAS_OVERSCAN,
        -DOT_CANVAS_OVERSCAN,
        width + DOT_CANVAS_OVERSCAN * 2,
        height + DOT_CANVAS_OVERSCAN * 2
      );
    });
    resetDotCanvasBands();
    dotWorld.visibleCount = 0;
    dotWorld.reflectionCount = 0;
    dotWorld.logoCount = 0;

    drawCloudDots(now, width, height, dotWorldFarCtx);
    drawOriginLogo(now, width, height, dotWorldCtx);
    drawFocusGround(now, width, state.started ? 1 : introGroundProgress(now), dotWorldCtx);
    drawOriginSeed(now, width, dotWorldCtx);

    if (!state.started) {
      finalizeDotCanvasBands();
      return;
    }

    if (root.dataset.dotWorld !== 'active') {
      root.dataset.dotWorld = 'active';
    }
    const revealEdge = state.x + 250;
    const revealDistance = 440;
    const time = isJourneyMode ? journeyMotion.visualTime : now * 0.001;
    const dotShapeWorldOverride = journeyTransition.active?.shapeWorld || '';
    const dotMorphScale = shapeMorphScale(now);
    const lakeFill = runtime.mossLakeFill(state.x);
    const hideMossWater = isJourneyMode && !journeyTransition.active && state.x >= 6380;
    const dropWaterScale = journeyTransition.active?.type === 'drop'
      && root.dataset.cinematicPhase === 'motion'
      ? 0.56
      : 1;
    const travelerX = (state.x - state.cameraX) * state.scale;
    const travelerY = (state.y - state.cameraY) * state.scale - 92 * state.scale;
    const dotWorldInMotion = Boolean(
      state.isMoving
      || journeyTransition.active
      || journeyLanding.active
      || journeyReturn.active
    );
    const movingDotProfile = movingDotTargets[renderQuality.mode] || movingDotTargets.high;
    const movingDotTarget = journeyTransition.active || journeyLanding.active || journeyReturn.active
      ? movingDotProfile.cinematic
      : state.isMoving ? movingDotProfile.travel : 1;
    renderQuality.movingDotScale += (
      movingDotTarget - renderQuality.movingDotScale
    ) * runtime.frameLerp(dotWorldInMotion ? 0.24 : 0.12, lastRenderDecision.dt);
    const baseDotScale = renderQuality.dotScale * renderQuality.movingDotScale;
    const waterDotScale = baseDotScale * dropWaterScale;
    const activeDots = activeWorldDots();
    for (const dot of activeDots) {
      if (dot.kind === 'water' && hideMossWater) {
        continue;
      }
      const effectiveDotScale = dot.kind === 'water'
        ? waterDotScale
        : baseDotScale;
      if (effectiveDotScale < 1) {
        if (dot.sample >= effectiveDotScale) {
          continue;
        }
      }
      if (dot.revealX > revealEdge + 80) {
        continue;
      }
      const reveal = clamp((revealEdge - dot.revealX) / revealDistance, 0, 1);
      if (reveal <= 0.01) {
        continue;
      }
      const waterFill = dot.kind === 'water'
        ? smooth(clamp((lakeFill - dot.waterDepth * 0.36) / 0.64, 0, 1))
        : 1;
      if (waterFill <= 0.006) {
        continue;
      }
      const anchorSx = dot.depthAnchor && dot.parallax < 1
        ? (
          dot.x
          - state.cameraX
          + (state.cameraX - dot.depthAnchor) * (1 - dot.parallax)
        ) * state.scale
        : (dot.x - state.cameraX * dot.parallax) * state.scale;
      const motionPadding = (Math.abs(dot.sway) + dot.motionRadius + 42) * state.scale;
      if (
        anchorSx < -DOT_CANVAS_OVERSCAN - motionPadding
        || anchorSx > width + DOT_CANVAS_OVERSCAN + motionPadding
      ) {
        continue;
      }
      let px = dot.x;
      let py = dot.y;
      if (dot.sway) {
        px += Math.sin(time * dot.speed + dot.phase) * dot.sway;
      }
      if (dot.bob) {
        py += Math.cos(time * dot.speed * 0.7 + dot.phase) * dot.bob;
      }
      let sx = dot.depthAnchor && dot.parallax < 1
        ? (px - state.cameraX + (state.cameraX - dot.depthAnchor) * (1 - dot.parallax)) * state.scale
        : (px - state.cameraX * dot.parallax) * state.scale;
      let sy = (py - state.cameraY) * state.scale;
      if (
        sx < -DOT_CANVAS_OVERSCAN - 24
        || sx > width + DOT_CANVAS_OVERSCAN + 24
        || sy < -DOT_CANVAS_OVERSCAN - 24
        || sy > height + DOT_CANVAS_OVERSCAN + 24
      ) {
        continue;
      }
      let size = Math.max(0.75, dot.size * state.scale * (0.72 + reveal * 0.28));
      let alpha = clamp(dot.alpha * reveal * waterFill, 0, 0.82);
      if (dot.motionHandler) {
        dotMotionFrame.time = time;
        dotMotionFrame.scale = state.scale;
        dotMotionFrame.waterFill = waterFill;
        dotMotionFrame.pulse = 0.5 + Math.sin(time * dot.speed * 1.8 + dot.phase) * 0.5;
        dotMotionOutput.sx = sx;
        dotMotionOutput.sy = sy;
        dotMotionOutput.size = size;
        dotMotionOutput.alpha = alpha;
        dot.motionHandler(dot, dotMotionOutput, dotMotionFrame);
        sx = dotMotionOutput.sx;
        sy = dotMotionOutput.sy;
        size = dotMotionOutput.size;
        alpha = dotMotionOutput.alpha;
      }
      if (dot.kind !== 'forest' && dot.kind !== 'trunk') {
        const rawDx = sx - travelerX;
        const rawDy = sy - travelerY;
        const reactionX = rawDx / Math.max(1, 78 * state.scale);
        const reactionY = rawDy / Math.max(1, 126 * state.scale);
        const reaction = clamp(1 - (reactionX * reactionX + reactionY * reactionY), 0, 1);
        if (reaction > 0) {
          const distance = Math.max(1, Math.hypot(rawDx, rawDy));
          const push = reaction * 22 * state.scale;
          sx += (rawDx / distance) * push;
          sy += (rawDy / distance) * push * 0.72;
          alpha *= 1 - reaction * (root.dataset.tone === 'dark' ? 0.68 : 0.56);
          size *= 1 - reaction * 0.12;
        }
      }
      if (dot.kind === 'forest' || dot.kind === 'trunk') {
        const dx = (sx - travelerX) / (112 * state.scale);
        const dy = (sy - travelerY) / (164 * state.scale);
        const clearing = clamp(1 - (dx * dx + dy * dy), 0, 1);
        alpha *= 1 - clearing * (dot.kind === 'trunk' ? 0.52 : 0.66);
        size *= 1 - clearing * 0.16;
      }
      const shapeWorld = dotShapeWorldOverride || dot.shapeWorld;
      const nearHubRing = shapeWorld === 'hub' && dot.kind === 'hub';
      const vocabularyShape = resolveVocabularyShape(
        shapeWorld,
        dot.sample,
        dot.kind,
        nearHubRing
      );
      const shapeAngle = dot.shapeAngle + (
        shapeWorld === 'monoomoi'
          ? time * (0.32 + dot.speed * 0.12)
          : shapeWorld === 'monoerabi'
            ? time * (0.24 + dot.speed * 0.1)
            : 0
      );
      const band = recordDotBandParallax(dot.parallax, alpha * size);
      const drawCtx = band.ctx;
      if (dot.colorCss !== band.activeColor) {
        band.activeColor = dot.colorCss;
        drawCtx.fillStyle = band.activeColor;
      }
      if (dot.glow > 0 && alpha > 0.08) {
        drawCtx.globalAlpha = alpha * 0.13;
        drawCtx.beginPath();
        drawCtx.arc(sx, sy, size + dot.glow * state.scale, 0, Math.PI * 2);
        drawCtx.fill();
      }
      drawCtx.globalAlpha = clamp(alpha, 0, 0.92);
      drawVocabularyShape(
        drawCtx,
        vocabularyShape,
        sx,
        sy,
        size * dotMorphScale,
        shapeAngle,
        dot.shapePhase,
        alpha,
        time,
        vocabularyShape === 'cube' ? band.activeColor : ''
      );
      dotWorld.visibleCount += 1;
    }
    drawMossWaterReflection(now, width, height, dotWorldCtx);
    dotCanvasBandList.forEach((band) => {
      band.ctx.globalAlpha = 1;
    });
    finalizeDotCanvasBands();
  }

  function drawMossWaterReflection(now, width, height, ctx = dotWorldCtx) {
    if (!ctx || !isJourneyMode || journeyTransition.active || journeyLanding.active || journeyReturn.active) {
      return;
    }
    const stage = state.journeyStage || journey.stageAt(state.x);
    if (stage !== 'moss' && stage !== 'brink') {
      return;
    }
    const lakeFill = runtime.mossLakeFill(state.x);
    if (lakeFill <= 0.16 || state.x < focusWorld.waterStart - 280 || state.x > focusWorld.pierEnd + 420) {
      return;
    }
    const baseX = (state.x - state.cameraX) * state.scale;
    const waterY = (focusWorld.waterY + 9 - state.cameraY) * state.scale;
    if (baseX < -90 || baseX > width + 90 || waterY < -40 || waterY > height + 120) {
      return;
    }
    const reveal = smooth(clamp((state.x - (focusWorld.waterStart - 280)) / 520, 0, 1)) * lakeFill;
    const count = renderQuality.mode === 'low' ? 9 : renderQuality.mode === 'medium' ? 15 : 23;
    const reflectionHeight = 62 * state.scale;
    const sway = Math.sin(now * 0.0017) * 2.4 * state.scale;

    ctx.save();
    ctx.fillStyle = 'rgb(89, 168, 182)';
    for (let i = 0; i < count; i += 1) {
      const t = count <= 1 ? 0 : i / (count - 1);
      const body = t < 0.58;
      const mirrorWidth = (body ? 15 : 29) * state.scale * (0.5 + Math.sin(t * Math.PI) * 0.72);
      const side = i % 2 === 0 ? -1 : 1;
      const sx = baseX
        + side * mirrorWidth
        + Math.sin(i * 1.93 + now * 0.002) * 2.6 * state.scale
        + sway * (0.2 + t);
      const sy = waterY
        + 7 * state.scale
        + t * reflectionHeight
        + Math.sin(i * 1.37 + now * 0.003) * 1.9 * state.scale;
      const fade = Math.max(0, 1 - t * 0.95);
      const alpha = clamp(0.08 * reveal * fade, 0, 0.12);
      if (alpha <= 0.004) {
        continue;
      }
      const size = (body ? 1.8 : 1.25) * state.scale * (0.72 + fade * 0.38);
      ctx.globalAlpha = alpha * 0.75;
      ctx.beginPath();
      ctx.arc(sx, sy, size + 2.4 * state.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
      recordDotBandParallax(1, alpha * size);
      dotWorld.visibleCount += 1;
      dotWorld.reflectionCount += 1;
    }
    ctx.restore();
  }

  function drawCloudDots(now, width, height, ctx = dotWorldFarCtx) {
    if (root.dataset.dotWorld !== 'active') {
      root.dataset.dotWorld = 'active';
    }
    if (!state.started) {
      return;
    }
    const revealEdge = state.x + 420;
    const revealDistance = 520;
    const time = now * 0.001;
    let activeColor = '';
    for (const dot of dotWorld.cloudDots) {
      const reveal = clamp((revealEdge - dot.revealX) / revealDistance, 0, 1);
      if (reveal <= 0.01) {
        continue;
      }
      const wave = Math.sin(time * dot.speed + dot.phase);
      const localX = (dot.x - dot.anchorX) + wave * dot.sway;
      const py = dot.y + Math.cos(time * dot.speed * 0.7 + dot.phase) * dot.bob;
      const pad = Math.max(260, dot.wrapPad * state.scale);
      const walkShift = Math.max(0, state.x - dot.revealX) * dot.scrollRate * state.scale;
      const drift = time * dot.driftSpeed * state.scale;
      const entryCenterX = width + Math.max(120, dot.entryPad * state.scale);
      const sx = entryCenterX - walkShift - drift + localX * state.scale;
      const sy = (py - state.cameraY) * state.scale;
      if (
        sx < -DOT_CANVAS_OVERSCAN - 42
        || sx > width + DOT_CANVAS_OVERSCAN + 42
        || sy < -DOT_CANVAS_OVERSCAN - 42
        || sy > height + DOT_CANVAS_OVERSCAN + 42
      ) {
        continue;
      }
      const size = Math.max(0.62, dot.size * state.scale * (0.78 + reveal * 0.22));
      const edgeFade = Math.min(
        clamp((width + DOT_CANVAS_OVERSCAN + 42 - sx) / 90, 0, 1),
        clamp((sx + DOT_CANVAS_OVERSCAN + 42) / 90, 0, 1)
      );
      const alpha = clamp(dot.alpha * edgeFade, 0, 0.42);
      recordDotBandParallax(dot.scrollRate || dot.parallax || 0.56, alpha * size);
      if (dot.colorCss !== activeColor) {
        activeColor = dot.colorCss;
        ctx.fillStyle = activeColor;
      }
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
      dotWorld.visibleCount += 1;
    }
    ctx.globalAlpha = 1;
  }

  function drawOriginLogo(now, width, height, ctx = dotWorldCtx) {
    if (
      state.started
      || intro.complete
      || !ctx
      || !intro.logoPoints.length
      || (intro.seedStartedAt && now >= intro.seedStartedAt)
    ) {
      return;
    }
    const elapsed = Math.max(0, now - intro.startedAt);
    const reveal = smooth(clamp(elapsed / INTRO_LOGO_REVEAL_MS, 0, 1));
    const gather = introLogoGatherProgress(now);
    const centerX = width * 0.5;
    const seedY = height * INTRO_LOGO_CENTER_Y_RATIO;
    const logoSize = clamp(height * 0.255, 164, 230);
    const breathe = intro.logoReleaseAt
      ? 1
      : 1 + Math.sin(elapsed * 0.0028) * 0.012;
    const qualityLimit = renderQuality.mode === 'low'
      ? 170
      : renderQuality.mode === 'medium' ? 290 : 430;
    const pointStride = Math.max(1, Math.ceil(intro.logoPoints.length / qualityLimit));
    const identityLimit = runtime.introIdentityPointLimit(renderQuality.mode);
    const identityStride = Math.max(1, Math.ceil(intro.identityPoints.length / identityLimit));
    const identityReveal = smooth(clamp((elapsed - 90) / 500, 0, 1));
    const identityWidth = runtime.introIdentityWidth(logoSize, width, false);
    const identityHeight = clamp(logoSize * 0.085, 16, 20);
    const identityY = seedY + logoSize * 0.59;
    const fade = 1 - smooth(clamp((gather - 0.78) / 0.22, 0, 1));
    ctx.save();
    ctx.fillStyle = 'rgb(55, 73, 68)';
    for (let index = 0; index < intro.logoPoints.length; index += pointStride) {
      const point = intro.logoPoints[index];
      const localReveal = smooth(clamp(reveal * 1.22 - point.order * 0.22, 0, 1));
      if (localReveal <= 0.01) {
        continue;
      }
      const sourceX = centerX + point.x * logoSize * breathe;
      const sourceY = seedY + point.y * logoSize * breathe;
      const arc = Math.sin(gather * Math.PI) * (7 + (point.seed % 13));
      const angle = point.seed * 0.017;
      const x = sourceX + (centerX - sourceX) * gather + Math.cos(angle) * arc;
      const y = sourceY + (seedY - sourceY) * gather + Math.sin(angle) * arc * 0.68;
      const alpha = localReveal * fade * (0.46 + ((point.seed * 11) % 29) / 80);
      const size = Math.max(0.66, point.size * state.scale * (1 - gather * 0.34));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      dotWorld.logoCount += 1;
    }
    ctx.fillStyle = 'rgb(55, 73, 68)';
    for (let index = 0; index < intro.identityPoints.length; index += identityStride) {
      const point = intro.identityPoints[index];
      const localReveal = smooth(clamp(identityReveal * 1.18 - point.order * 0.18, 0, 1));
      if (localReveal <= 0.01) {
        continue;
      }
      const sourceX = centerX + point.x * identityWidth;
      const sourceY = identityY + point.y * identityHeight;
      const arc = Math.sin(gather * Math.PI) * (5 + (point.seed % 9));
      const angle = point.seed * 0.019;
      const x = sourceX + (centerX - sourceX) * gather + Math.cos(angle) * arc;
      const y = sourceY + (seedY - sourceY) * gather + Math.sin(angle) * arc * 0.64;
      ctx.globalAlpha = localReveal * fade * (0.48 + ((point.seed * 7) % 17) / 64);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.58, point.size * state.scale * (1 - gather * 0.32)), 0, Math.PI * 2);
      ctx.fill();
      dotWorld.logoCount += 1;
    }
    const accents = [
      'rgb(80, 164, 180)',
      'rgb(190, 116, 123)',
      'rgb(191, 145, 75)',
      'rgb(108, 157, 124)',
    ];
    accents.forEach((color, colorIndex) => {
      ctx.fillStyle = color;
      for (
        let index = 11 + colorIndex * 7;
        index < intro.logoPoints.length;
        index += Math.max(41, pointStride * 41)
      ) {
        const point = intro.logoPoints[index];
        const localReveal = smooth(clamp(reveal * 1.22 - point.order * 0.22, 0, 1));
        if (localReveal <= 0.01) {
          continue;
        }
        const sourceX = centerX + point.x * logoSize * breathe;
        const sourceY = seedY + point.y * logoSize * breathe;
        const arc = Math.sin(gather * Math.PI) * (7 + (point.seed % 13));
        const angle = point.seed * 0.017;
        const x = sourceX + (centerX - sourceX) * gather + Math.cos(angle) * arc;
        const y = sourceY + (seedY - sourceY) * gather + Math.sin(angle) * arc * 0.68;
        ctx.globalAlpha = localReveal * fade * 0.42;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.82, point.size * state.scale * 1.12), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    if (gather > 0.58) {
      const seedAlpha = smooth(clamp((gather - 0.58) / 0.3, 0, 1));
      const glow = ctx.createRadialGradient(centerX, seedY, 0, centerX, seedY, 12 * state.scale);
      glow.addColorStop(0, `rgba(73, 123, 116, ${(seedAlpha * 0.58).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(111, 184, 198, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, seedY, 12 * state.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(49, 75, 68, ${(seedAlpha * 0.86).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(centerX, seedY, Math.max(1.5, 2.4 * state.scale), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    recordDotBandParallax(1, Math.max(1, dotWorld.logoCount * 0.08));
    dotWorld.visibleCount += dotWorld.logoCount;
  }

  function drawOriginSeed(now, width, ctx = dotWorldCtx) {
    if (state.started || intro.complete || !ctx) {
      return;
    }
    const progress = introSeedProgress(now);
    if (progress >= 1) {
      return;
    }
    const impactAt = 0.42;
    const centerX = width * 0.5;
    const centerWorldX = state.cameraX + centerX / state.scale;
    const groundY = (terrainY(centerWorldX) - state.cameraY) * state.scale;
    const seedY = window.innerHeight * INTRO_LOGO_CENTER_Y_RATIO;
    const fall = smooth(clamp(progress / impactAt, 0, 1));
    const dropY = seedY + (groundY - seedY) * fall;
    const fallAlpha = 1 - smooth(clamp((progress - impactAt * 0.86) / (impactAt * 0.18), 0, 1));
    ctx.save();
    if (fallAlpha > 0.01) {
      const glow = ctx.createRadialGradient(centerX, dropY, 0, centerX, dropY, 14 * state.scale);
      glow.addColorStop(0, `rgba(73, 123, 116, ${(fallAlpha * 0.68).toFixed(3)})`);
      glow.addColorStop(0.2, `rgba(111, 184, 198, ${(fallAlpha * 0.32).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(111, 184, 198, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, dropY, 14 * state.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(49, 75, 68, ${(fallAlpha * 0.78).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(centerX, dropY, Math.max(1.5, 2.5 * state.scale), 0, Math.PI * 2);
      ctx.fill();
      recordDotBandParallax(1, fallAlpha * 14);
      dotWorld.visibleCount += 1;
    }
    const ripple = smooth(clamp((progress - impactAt) / (1 - impactAt), 0, 1));
    if (ripple > 0) {
      for (let ring = 0; ring < 3; ring += 1) {
        const local = clamp(ripple * 1.32 - ring * 0.18, 0, 1);
        if (local <= 0) {
          continue;
        }
        const fade = Math.sin(local * Math.PI) * (1 - ring * 0.19);
        const radiusX = (18 + local * (82 + ring * 24)) * state.scale;
        const radiusY = (4 + local * (12 + ring * 3)) * state.scale;
        const points = 18 + ring * 6;
        ctx.fillStyle = `rgba(91, 159, 153, ${(fade * 0.48).toFixed(3)})`;
        for (let point = 0; point < points; point += 1) {
          const angle = (point / points) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * radiusX;
          const y = groundY + Math.sin(angle) * radiusY;
          const size = Math.max(0.65, (1.05 + (point % 4) * 0.16) * state.scale);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        dotWorld.visibleCount += points;
      }
    }
    ctx.restore();
  }

  function drawFocusGround(now, width, progress = 1, ctx = dotWorldCtx) {
    if (root.dataset.dotWorld !== 'active') {
      root.dataset.dotWorld = 'active';
    }
    const p = clamp(progress, 0, 1);
    if (!state.started && !intro.complete && p <= 0.001) {
      return;
    }
    const leftScreen = -DOT_CANVAS_OVERSCAN - 70 * state.scale;
    const rightScreen = width + DOT_CANVAS_OVERSCAN + 70 * state.scale;
    const introReveal = !state.started && !intro.complete;
    const centerScreen = width * 0.5;
    const maxSpan = Math.max(centerScreen - leftScreen, rightScreen - centerScreen);
    const startScreen = introReveal ? centerScreen - maxSpan * p : leftScreen;
    const endScreen = introReveal ? centerScreen + maxSpan * p : rightScreen;
    const startWorld = state.cameraX + startScreen / state.scale;
    const endWorldLimit = isJourneyMode ? WORLD_LENGTH : focusWorld.pierStart - 14;
    const endWorld = Math.min(endWorldLimit, state.cameraX + endScreen / state.scale);
    const firstWorld = Math.floor(startWorld / GROUND_DOT_STEP) * GROUND_DOT_STEP;
    let activeColor = '';

    for (let worldX = firstWorld; worldX <= endWorld; worldX += GROUND_DOT_STEP) {
      if (worldX < startWorld - GROUND_DOT_STEP * 0.4) {
        continue;
      }
      if (isJourneyMode && !journey.groundVisible(worldX)) {
        continue;
      }
      const jitterX = (groundNoise(worldX, 1) - 0.5) * 2.6;
      const jitterY = (groundNoise(worldX, 2) - 0.5) * 2.2;
      const screenX = (worldX + jitterX - state.cameraX) * state.scale;
      const screenY = (terrainY(worldX) + jitterY - state.cameraY) * state.scale;
      if (screenX < -96 || screenX > width + 96) {
        continue;
      }
      const frontFade = introReveal
        ? Math.min(
          clamp((worldX - startWorld) / 120, 0, 1),
          clamp((endWorld - worldX) / 120, 0, 1)
        )
        : clamp((worldX - startWorld) / 120, 0, 1);
      const size = (1.4 + groundNoise(worldX, 3) * 1.6) * state.scale;
      const alpha = (0.34 + groundNoise(worldX, 4) * 0.22) * (0.3 + frontFade * 0.7);
      const stage = isJourneyMode ? journey.stageAt(worldX) : 'moss';
      const darkGround = isJourneyMode && journey.visualAt(worldX).tone === 'dark';
      const kintsugi = isJourneyMode
        && worldX >= KINTSUGI_START_X
        && worldX < state.maxVisitedX;
      const reverseMemory = kintsugi
        && state.isMoving
        && state.vx < -0.08
        && Math.abs(worldX - state.x) <= 380;
      const color = kintsugi
        ? memoryTrailColorForStage(stage, groundNoise(worldX, 6), reverseMemory, darkGround)
        : (darkGround ? 'rgb(138, 220, 216)' : 'rgb(44, 48, 44)');
      if (color !== activeColor) {
        activeColor = color;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
      }
      const memoryAlpha = darkGround
        ? 0.42 + groundNoise(worldX, 5) * 0.18
        : 0.64 + groundNoise(worldX, 5) * 0.24;
      ctx.globalAlpha = kintsugi
        ? memoryAlpha * (0.3 + frontFade * 0.7)
        : (darkGround ? alpha * 0.86 : alpha);
      ctx.beginPath();
      ctx.arc(
        screenX,
        screenY,
        kintsugi ? size + 0.35 * state.scale : size,
        0,
        Math.PI * 2
      );
      ctx.fill();
      if (reverseMemory && groundNoise(worldX, 7) > 0.58) {
        ctx.globalAlpha *= 0.34;
        ctx.lineWidth = Math.max(0.7, 0.82 * state.scale);
        ctx.beginPath();
        ctx.arc(screenX, screenY, size + 2.2 * state.scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      recordDotBandParallax(1, size * alpha);
      dotWorld.visibleCount += 1;
    }
    ctx.globalAlpha = 1;
  }

  function addFocusText(x, y, content, options = {}) {
    const node = svgEl('text', { x: nn(x), y: nn(y) });
    node.classList.add('ink-text');
    (options.classes || []).forEach((className) => node.classList.add(className));
    node.textContent = content;
    node.dataset.revealX = String(options.revealX || 0);
    (options.layer || nearLayer).appendChild(node);
    shapes.push(node);
    return node;
  }

  function addMossGuideSign() {
    if (!labelsLayer) {
      return;
    }
    const x = 4620;
    const groundY = terrainY(x);
    const area = areaMap.get('moss');
    const node = document.createElement('div');
    node.className = 'journey-marker journey-marker--moss moss-guide-sign media-sign media-sign--moss';
    node.setAttribute('aria-hidden', 'true');
    node.dataset.revealX = '4140';
    node.dataset.signX = String(x);
    node.style.left = `${x}px`;
    node.style.top = `${groundY - 248}px`;
    node.innerHTML = `
      <span class="media-sign__surface">
        <span class="moss-guide-sign__binding" aria-hidden="true"><i></i><i></i><i></i></span>
        ${mediaEmblemMarkup('moss')}
        ${area ? mediaSignCopyMarkup(area, 'Intro') : ''}
        ${area ? mediaSignActionMarkup(area) : ''}
      </span>
    `;
    labelsLayer.appendChild(node);
    moodNodes.push(node);
    if (area) {
      mediaSigns.push({
        node,
        surface: node.querySelector('.media-sign__surface'),
        emblem: node.querySelector('[data-media-emblem]'),
        key: area.key,
        name: area.name,
        x,
        radius: 330,
        assembled: motionReduced,
        approaching: false,
        reading: false,
        announced: false,
        viewportShift: 0,
        link: node.querySelector('[data-media-sign-link]'),
      });
    }
  }

  function mossCloud(x, y, s, revealX, seed) {
    const r = focusRng(seed);
    const j = (amp) => (r() - 0.5) * amp * s;
    const d = [
      M(x - 146 * s, y + 22 * s),
      C(x - 140 * s + j(12), y - 16 * s + j(8), x - 96 * s + j(10), y - 38 * s + j(8), x - 58 * s, y - 14 * s + j(6)),
      C(x - 46 * s + j(8), y - 66 * s + j(10), x + 24 * s + j(8), y - 74 * s + j(10), x + 46 * s, y - 20 * s + j(6)),
      C(x + 84 * s + j(8), y - 40 * s + j(8), x + 138 * s + j(10), y - 14 * s + j(6), x + 130 * s, y + 22 * s),
      M(x - 168 * s, y + 24 * s),
      C(x - 90 * s, y + 30 * s + j(4), x + 70 * s, y + 30 * s + j(4), x + 152 * s, y + 22 * s),
      M(x - 60 * s, y + 38 * s),
      C(x - 10 * s, y + 42 * s, x + 40 * s, y + 42 * s, x + 86 * s, y + 37 * s),
    ].join(' ');
    const node = addPath(farLayer, d, { revealX, classes: ['ink-line--hair', 'ink-line--sky', 'ink-line--cloud'] });
    node.style.setProperty('--drift-dur', `${nn(11 + r() * 7)}s`);
    return node;
  }

  function mossBirds(x, y, count, revealX, seed, dur) {
    const r = focusRng(seed);
    const parts = [];
    for (let i = 0; i < count; i += 1) {
      const bx = x + i * 58 + (r() - 0.5) * 30;
      const by = y + (r() - 0.5) * 44;
      const w = 17 + r() * 6;
      parts.push(
        M(bx - w, by),
        C(bx - w * 0.55, by - 11, bx - w * 0.2, by - 11, bx, by),
        C(bx + w * 0.2, by - 11, bx + w * 0.55, by - 11, bx + w, by)
      );
    }
    const node = addPath(farLayer, parts.join(' '), { revealX, classes: ['ink-line--bird'] });
    node.style.setProperty('--bird-dur', `${dur}s`);
    return node;
  }

  function mossMountain(x, y, w, h, revealX, seed) {
    const r = focusRng(seed);
    const peakX = x - w * 0.06 + (r() - 0.5) * w * 0.08;
    const d = [
      M(x - w, y),
      C(x - w * 0.55, y - h * 0.5, x - w * 0.3, y - h * 0.9, peakX, y - h),
      C(x + w * 0.12, y - h * 0.92, x + w * 0.45, y - h * 0.48, x + w, y),
      M(peakX + w * 0.02, y - h * 0.96),
      C(peakX + w * 0.05, y - h * 0.82, peakX + w * 0.1, y - h * 0.74, peakX + w * 0.16, y - h * 0.66),
    ].join(' ');
    return addPath(farLayer, d, { revealX, classes: ['ink-line--hair', 'ink-line--faint'] });
  }

  function mossRidge(x, span, y, revealX, seed) {
    const r = focusRng(seed);
    const parts = [M(x - span / 2, y)];
    for (let bx = x - span / 2; bx < x + span / 2; bx += 52) {
      const h = 16 + r() * 22;
      parts.push(C(bx + 12, y - h, bx + 40, y - h, bx + 52, y - r() * 4));
    }
    return addPath(farLayer, parts.join(' '), { revealX, classes: ['ink-line--hair', 'ink-line--faint'] });
  }

  function mossBackTree(x, baseY, s, revealX, seed) {
    const r = focusRng(seed);
    const j = (amp) => (r() - 0.5) * amp * s;
    const cy = baseY - 96 * s;
    const d = [
      M(x - 54 * s, cy + 26 * s),
      C(x - 74 * s + j(10), cy - 16 * s + j(8), x - 40 * s + j(10), cy - 52 * s + j(8), x - 6 * s, cy - 40 * s + j(6)),
      C(x + 10 * s + j(8), cy - 66 * s + j(8), x + 54 * s + j(8), cy - 40 * s + j(8), x + 50 * s, cy - 6 * s),
      C(x + 74 * s + j(8), cy + 10 * s, x + 42 * s, cy + 34 * s, x + 8 * s, cy + 26 * s),
      C(x - 18 * s, cy + 38 * s, x - 48 * s, cy + 40 * s, x - 54 * s, cy + 26 * s),
      M(x - 2 * s, cy + 34 * s),
      L(x + 2 * s, baseY),
    ].join(' ');
    return addPath(midLayer, d, { revealX, classes: ['ink-line--back-tree'] });
  }

  function mossMidDash(x, w, y, revealX) {
    return addPath(midLayer, `${M(x - w / 2, y)} ${L(x + w / 2, y)}`, {
      revealX,
      classes: ['ink-line--back-tree', 'ink-line--faint'],
    });
  }

  function mossGrass(x, y, s, revealX, seed) {
    const r = focusRng(seed);
    const j = (amp) => (r() - 0.5) * amp * s;
    const d = [
      M(x - 34 * s, y),
      C(x - 30 * s, y - 26 * s + j(8), x - 20 * s, y - 44 * s + j(8), x - 8 * s + j(6), y - 58 * s),
      M(x - 6 * s, y),
      C(x - 4 * s, y - 30 * s, x + 2 * s + j(4), y - 48 * s, x + 8 * s, y - 66 * s + j(10)),
      M(x + 10 * s, y),
      C(x + 18 * s, y - 24 * s, x + 30 * s + j(6), y - 38 * s, x + 42 * s, y - 48 * s + j(8)),
      M(x + 20 * s, y + 2 * s),
      C(x + 32 * s, y - 10 * s, x + 46 * s, y - 16 * s, x + 60 * s, y - 18 * s),
    ].join(' ');
    return addPath(nearLayer, d, { revealX, classes: ['ink-line--moss-detail'] });
  }

  function mossReed(x, y, s, revealX, seed, layer = nearLayer, classes = ['ink-line--moss-detail']) {
    const r = focusRng(seed);
    const j = (amp) => (r() - 0.5) * amp * s;
    const headX = x + 6 * s + j(4);
    const headY = y - 96 * s + j(10);
    const d = [
      M(x - 18 * s, y),
      C(x - 16 * s, y - 40 * s, x - 10 * s + j(6), y - 62 * s, x - 2 * s, y - 78 * s),
      M(x + 12 * s, y),
      C(x + 12 * s, y - 44 * s, x + 9 * s, y - 72 * s, headX, headY),
      M(headX - 4 * s, headY - 2 * s),
      C(headX - 6 * s, headY - 16 * s, headX + 4 * s, headY - 20 * s, headX + 6 * s, headY - 6 * s),
      C(headX + 7 * s, headY + 2 * s, headX - 2 * s, headY + 4 * s, headX - 4 * s, headY - 2 * s),
      M(x + 30 * s, y),
      C(x + 34 * s, y - 30 * s, x + 42 * s + j(6), y - 48 * s, x + 52 * s, y - 62 * s),
    ].join(' ');
    return addPath(layer, d, { revealX, classes });
  }

  function mossRock(x, y, s, revealX, seed) {
    const r = focusRng(seed);
    const j = (amp) => (r() - 0.5) * amp * s;
    const d = [
      M(x - 56 * s, y),
      C(x - 60 * s + j(8), y - 26 * s + j(6), x - 28 * s + j(8), y - 44 * s + j(6), x + 4 * s, y - 40 * s),
      C(x + 34 * s + j(8), y - 44 * s, x + 58 * s, y - 22 * s + j(6), x + 54 * s, y),
      M(x - 18 * s, y - 34 * s),
      C(x - 8 * s, y - 26 * s, x - 2 * s, y - 16 * s, x - 2 * s, y - 4 * s),
    ].join(' ');
    return addPath(nearLayer, d, { revealX, classes: ['ink-line--moss-detail'] });
  }

  function mossPebbles(x, y, revealX, seed) {
    const r = focusRng(seed);
    const parts = [];
    for (let i = 0; i < 3; i += 1) {
      const px = x + i * 26 + (r() - 0.5) * 14;
      const py = y + (r() - 0.5) * 5;
      const w = 8 + r() * 7;
      parts.push(M(px - w, py), C(px - w * 0.6, py - w * 0.9, px + w * 0.6, py - w * 0.9, px + w, py));
    }
    return addPath(nearLayer, parts.join(' '), { revealX, classes: ['ink-line--moss-detail'] });
  }

  function mossSign(x, revealX) {
    const y = terrainY(x);
    const d = [
      M(x, y),
      L(x - 3, y - 118),
      M(x - 72, y - 140),
      L(x + 46, y - 146),
      L(x + 82, y - 124),
      L(x + 48, y - 104),
      L(x - 70, y - 108),
      L(x - 72, y - 140),
      M(x - 26, y - 104),
      L(x - 28, y - 88),
    ].join(' ');
    addPath(nearLayer, d, { revealX, classes: ['ink-line--thin'] });
    addFocusText(x - 58, y - 118, 'moss.fish', { revealX: revealX + 60, classes: ['ink-text--sign'] });
  }

  function mossTreeBroad(x, y, s, options = {}) {
    const r = focusRng(options.seed || x);
    const j = (amp) => (r() - 0.5) * amp * s;
    const cy = y - 258 * s;
    const canopy = [
      M(x - 148 * s, cy + 40 * s),
      C(x - 172 * s + j(12), cy - 22 * s + j(10), x - 118 * s + j(12), cy - 68 * s + j(10), x - 66 * s, cy - 48 * s + j(8)),
      C(x - 58 * s + j(10), cy - 102 * s + j(12), x + 24 * s + j(12), cy - 114 * s + j(10), x + 48 * s, cy - 62 * s + j(8)),
      C(x + 98 * s + j(12), cy - 88 * s + j(10), x + 156 * s + j(12), cy - 52 * s + j(8), x + 144 * s, cy - 2 * s + j(6)),
      C(x + 188 * s + j(10), cy + 24 * s, x + 158 * s, cy + 66 * s + j(8), x + 112 * s, cy + 58 * s),
      C(x + 86 * s, cy + 92 * s + j(8), x + 16 * s, cy + 98 * s, x - 18 * s, cy + 72 * s),
      C(x - 64 * s, cy + 100 * s + j(8), x - 140 * s, cy + 84 * s, x - 148 * s, cy + 40 * s),
      M(x - 66 * s, cy - 6 * s),
      C(x - 34 * s + j(8), cy + 12 * s, x + 16 * s + j(8), cy + 12 * s, x + 46 * s, cy - 10 * s),
      M(x - 24 * s, cy - 56 * s),
      C(x + 4 * s, cy - 42 * s, x + 42 * s + j(8), cy - 44 * s, x + 66 * s, cy - 60 * s),
    ].join(' ');
    const trunk = [
      M(x - 18 * s, cy + 88 * s),
      C(x - 14 * s, y - 96 * s, x - 18 * s + j(6), y - 44 * s, x - 26 * s, y),
      M(x + 14 * s, cy + 92 * s),
      C(x + 16 * s, y - 88 * s, x + 20 * s + j(6), y - 40 * s, x + 28 * s, y),
      M(x - 16 * s, y - 118 * s),
      C(x - 2 * s, y - 138 * s, x + 6 * s, y - 154 * s, x + 8 * s, y - 172 * s),
      M(x - 52 * s, y),
      C(x - 34 * s, y - 8 * s, x + 40 * s, y - 8 * s, x + 58 * s, y),
    ].join(' ');
    const opts = { classes: ['ink-line--tree-near'] };
    if (options.drawStart !== undefined) {
      addPath(nearLayer, `${canopy} ${trunk}`, {
        ...opts,
        revealX: options.drawStart,
        drawStart: options.drawStart,
        drawEnd: options.drawEnd,
      });
      return;
    }
    const canopyNode = addPath(nearLayer, canopy, { ...opts, revealX: options.revealX });
    const trunkNode = addPath(nearLayer, trunk, { ...opts, revealX: options.revealX });
    const delay = options.delay || 0;
    if (delay) {
      canopyNode.style.setProperty('--draw-delay', `${delay}ms`);
    }
    trunkNode.style.setProperty('--draw-delay', `${delay + 260}ms`);
  }

  function mossTreePine(x, y, s, options = {}) {
    const r = focusRng(options.seed || x + 17);
    const j = (amp) => (r() - 0.5) * amp * s;
    const h = 300 * s;
    const tiers = [
      { ty: y - h * 0.3, w: 108 * s },
      { ty: y - h * 0.55, w: 78 * s },
      { ty: y - h * 0.78, w: 50 * s },
    ];
    const parts = [
      M(x - 24 * s, y),
      C(x - 10 * s, y - 6 * s, x + 12 * s, y - 6 * s, x + 24 * s, y),
      M(x + j(3), y),
      L(x - 2 * s + j(3), y - h * 0.88),
    ];
    tiers.forEach((tier) => {
      parts.push(
        M(x - tier.w + j(8), tier.ty),
        C(x - tier.w * 0.5, tier.ty - 26 * s + j(6), x - tier.w * 0.16, tier.ty - 44 * s, x + j(4), tier.ty - 56 * s),
        C(x + tier.w * 0.2, tier.ty - 42 * s, x + tier.w * 0.55, tier.ty - 24 * s + j(6), x + tier.w + j(8), tier.ty)
      );
    });
    parts.push(
      M(x - 16 * s, y - h * 0.9),
      C(x - 6 * s, y - h * 0.99, x + 6 * s, y - h * 0.99, x + 14 * s, y - h * 0.88)
    );
    const node = addPath(nearLayer, parts.join(' '), { revealX: options.revealX, classes: ['ink-line--tree-near'] });
    if (options.delay) {
      node.style.setProperty('--draw-delay', `${options.delay}ms`);
    }
  }

  function mossHut(x, revealX) {
    const y = terrainY(x) + 2;
    const g1 = [
      M(x - 138, y),
      L(x - 140, y - 152),
      M(x + 138, y),
      L(x + 140, y - 148),
      M(x - 170, y - 140),
      L(x, y - 246),
      L(x + 172, y - 138),
      M(x - 146, y - 148),
      L(x, y - 236),
      L(x + 148, y - 144),
      M(x - 152, y + 4),
      L(x + 156, y + 4),
    ].join(' ');
    const g2 = [
      M(x + 34, y),
      L(x + 32, y - 82),
      C(x + 32, y - 108, x + 100, y - 108, x + 100, y - 80),
      L(x + 102, y),
      M(x + 84, y - 54),
      C(x + 88, y - 58, x + 92, y - 58, x + 94, y - 54),
      M(x - 92, y - 96),
      C(x - 92, y - 130, x - 34, y - 130, x - 34, y - 96),
      C(x - 34, y - 62, x - 92, y - 62, x - 92, y - 96),
      M(x - 63, y - 126),
      L(x - 63, y - 66),
      M(x - 88, y - 96),
      L(x - 38, y - 96),
    ].join(' ');
    const g3 = [
      M(x - 66, y - 198),
      L(x - 68, y - 244),
      L(x - 34, y - 244),
      L(x - 32, y - 186),
      M(x - 74, y - 244),
      L(x - 26, y - 244),
      M(x + 28, y - 134),
      L(x + 106, y - 136),
      L(x + 106, y - 108),
      L(x + 28, y - 106),
      L(x + 28, y - 134),
      M(x + 44, y - 121),
      C(x + 52, y - 129, x + 68, y - 129, x + 78, y - 121),
      C(x + 68, y - 113, x + 52, y - 113, x + 44, y - 121),
      M(x + 78, y - 121),
      L(x + 88, y - 114),
      L(x + 88, y - 128),
      L(x + 78, y - 121),
    ].join(' ');
    const smoke = [
      M(x - 50, y - 252),
      C(x - 72, y - 282, x - 30, y - 302, x - 54, y - 330),
      C(x - 72, y - 352, x - 36, y - 366, x - 46, y - 392),
    ].join(' ');
    const a = addPath(nearLayer, g1, { revealX, classes: ['ink-line--tree-near'] });
    const b = addPath(nearLayer, g2, { revealX, classes: ['ink-line--thin'] });
    const c = addPath(nearLayer, g3, { revealX, classes: ['ink-line--thin'] });
    b.style.setProperty('--draw-delay', '300ms');
    c.style.setProperty('--draw-delay', '620ms');
    addPath(nearLayer, smoke, { revealX: revealX + 160, classes: ['ink-line--smoke'] });
  }

  function waveD(x0, x1, y, amp, seg, seed) {
    const r = focusRng(seed);
    const parts = [M(x0, y + (r() - 0.5) * 4)];
    for (let x = x0; x < x1; x += seg) {
      const step = Math.min(seg, x1 - x);
      parts.push(C(x + step * 0.32, y - amp + (r() - 0.5) * 3, x + step * 0.68, y + amp + (r() - 0.5) * 3, x + step, y + (r() - 0.5) * 3));
    }
    return parts.join(' ');
  }

  function mossLake() {
    const w = focusWorld.waterY;
    addPath(nearLayer, `${M(4560, terrainY(4560) + 4)} ${C(4680, 758, 4760, 782, 4830, 796)} ${C(4880, 805, 4940, 810, 5010, 811)}`, {
      revealX: 4280,
      classes: ['ink-line--thin'],
    });
    const w1 = addPath(nearLayer, waveD(4850, 6360, w + 6, 5, 120, 41), {
      revealX: 4450,
      drawStart: 4450,
      drawEnd: 5260,
      classes: ['ink-line--thin', 'ink-line--moss-water'],
    });
    const w2 = addPath(nearLayer, waveD(4980, 6320, w + 40, 6, 140, 42), {
      revealX: 4600,
      drawStart: 4600,
      drawEnd: 5430,
      classes: ['ink-line--thin', 'ink-line--moss-water'],
    });
    const w3 = addPath(nearLayer, waveD(5140, 6270, w + 74, 5, 150, 43), {
      revealX: 4780,
      drawStart: 4780,
      drawEnd: 5600,
      classes: ['ink-line--water-detail'],
    });
    [w1, w2, w3].forEach((node, i) => {
      node.style.setProperty('--shimmer-dur', `${7 + i * 2.3}s`);
      node.style.setProperty('--draw-ms', '420ms');
    });
    [
      [5080, w + 20, 4750],
      [5620, w + 34, 5080],
      [6060, w + 16, 5260],
    ].forEach(([rx, ry, reveal]) => {
      addPath(nearLayer, `${M(rx - 26, ry)} ${C(rx - 12, ry - 7, rx + 12, ry - 7, rx + 26, ry)} ${M(rx + 40, ry + 10)} ${C(rx + 50, ry + 5, rx + 62, ry + 5, rx + 72, ry + 10)}`, {
        revealX: reveal,
        classes: ['ink-line--water-detail'],
      });
    });
  }

  function mossPier() {
    const K = focusWorld;
    const deckTop = [];
    const deckBottom = [];
    for (let x = K.pierStart; x <= 5548; x += 44) {
      deckTop.push(deckTop.length ? L(x, terrainY(x) + 8) : M(x, terrainY(x) + 8));
      deckBottom.push(deckBottom.length ? L(x, terrainY(x) + 22) : M(x, terrainY(x) + 22));
    }
    const planks = [];
    for (let x = K.pierStart + 30; x < 5548; x += 58) {
      planks.push(M(x, terrainY(x) + 9), L(x - 2, terrainY(x) + 21));
    }
    const legs = [];
    [5188, 5342, 5498].forEach((lx, i) => {
      legs.push(M(lx, terrainY(lx) + 22), L(lx - 3, K.waterY + 6 + i * 2));
      legs.push(M(lx + 16, terrainY(lx) + 22), L(lx + 15, K.waterY + 2 + i * 2));
    });
    legs.push(M(5206, 798), L(5338, 772));
    const postY = terrainY(5540);
    const post = [
      M(5544, postY + 8),
      L(5546, postY - 40),
      M(5536, postY - 40),
      L(5556, postY - 42),
      M(5546, postY - 22),
      C(5576, postY - 12, 5584, 782, 5578, 796),
    ].join(' ');
    const deckNode = addPath(nearLayer, `${deckTop.join(' ')} ${deckBottom.join(' ')}`, {
      revealX: 4820,
      drawStart: 4820,
      drawEnd: 5220,
      classes: ['ink-line--dock'],
    });
    deckNode.style.setProperty('--draw-ms', '420ms');
    addPath(nearLayer, planks.join(' '), { revealX: 4980, classes: ['ink-line--moss-detail'] });
    const legNode = addPath(nearLayer, legs.join(' '), { revealX: 4900, classes: ['ink-line--dock'] });
    legNode.style.setProperty('--draw-delay', '220ms');
    addPath(nearLayer, post, { revealX: 5060, classes: ['ink-line--dock'] });
    [5188, 5342, 5498].forEach((lx, i) => {
      const node = addPath(nearLayer, `${M(lx - 20, K.waterY + 3)} ${C(lx - 8, K.waterY - 3, lx + 22, K.waterY - 3, lx + 34, K.waterY + 3)}`, {
        revealX: 5000,
        classes: ['ink-line--water-detail', 'ink-line--ripple'],
      });
      node.style.setProperty('--ripple-delay', `${i * 900}ms`);
    });
    const bx = 5210;
    const by = terrainY(5210) + 8;
    addPath(nearLayer, [
      M(bx - 20, by - 34),
      L(bx - 15, by),
      L(bx + 17, by),
      L(bx + 22, by - 34),
      M(bx - 24, by - 34),
      C(bx - 14, by - 40, bx + 16, by - 40, bx + 26, by - 34),
      M(bx - 18, by - 36),
      C(bx - 10, by - 52, bx + 12, by - 52, bx + 20, by - 36),
    ].join(' '), { revealX: 5080, classes: ['ink-line--thin'] });
  }

  function mossPatrolFish() {
    const x = 5920;
    const y = focusWorld.waterY + 52;
    const d = [
      M(x - 52, y),
      C(x - 34, y - 13, x + 12, y - 15, x + 36, y - 2),
      C(x + 12, y + 11, x - 32, y + 12, x - 52, y),
      'Z',
      M(x - 52, y),
      L(x - 70, y - 10),
      C(x - 66, y - 3, x - 66, y + 5, x - 70, y + 11),
      'Z',
    ].join(' ');
    addPath(nearLayer, d, { revealX: 5150, classes: ['ink-line--fish-shadow', 'ink-line--patrol'] });
  }

  function mossCircuitTease() {
    const y = focusWorld.waterY + 6;
    addPath(nearLayer, [
      M(6170, y),
      L(6290, y),
      L(6290, y - 48),
      L(6404, y - 48),
      M(6290, y - 48),
      L(6290, y - 96),
    ].join(' '), { revealX: 5200, classes: ['ink-line--hair', 'ink-line--accent-yellow'] });
    addShape(nearLayer, 'circle', { cx: 6404, cy: y - 48, r: 7 }, { revealX: 5260, classes: ['ink-line--accent-yellow'] });
    addShape(nearLayer, 'circle', { cx: 6290, cy: y - 96, r: 7 }, { revealX: 5300, classes: ['ink-line--accent-yellow'] });
  }

  function buildFishingRig() {
    const line = svgEl('path', { class: 'fishing-line', d: '' });
    nearLayer.appendChild(line);

    const bobberG = svgEl('g', { class: 'fishing-bobber' });
    const dip = svgEl('g', { class: 'fishing-bobber__dip' });
    dip.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 6.5 }));
    dip.appendChild(svgEl('path', { d: 'M0 -6 L0 -15 L8 -12 L0 -9', class: 'fishing-bobber__flag' }));
    const plop = svgEl('path', { d: 'M-24 4 C-12 -3 12 -3 24 4', class: 'fishing-plop' });
    const splash = svgEl('path', { d: 'M-14 -6 L-22 -18 M0 -9 L0 -24 M14 -6 L22 -18 M-6 -8 L-10 -20 M6 -8 L10 -20', class: 'fishing-splash' });
    bobberG.appendChild(plop);
    bobberG.appendChild(splash);
    bobberG.appendChild(dip);
    nearLayer.appendChild(bobberG);

    const fish = svgEl('path', {
      class: 'event-fish',
      d: 'M-52 0 C-34 -14 10 -16 34 -2 C12 12 -32 12 -52 0 Z M-52 0 L-70 -10 C-66 -3 -66 5 -70 12 Z',
    });
    nearLayer.appendChild(fish);

    // アクションヒント: 何が起きるかを説明せず、Spaceだけを粒子の気配で示す。
    const hint = document.createElement('div');
    hint.className = 'action-hint';
    const thoughtParticles = [
      [12, 108, 3, 'dot', 0, 0.26, -2, -5, 3000],
      [24, 94, 4, 'dot', 70, 0.32, 2, -7, 3400],
      [37, 77, 7, 'ring', 130, 0.34, -3, -5, 3800],
      [50, 54, 3, 'dot', 180, 0.42, 2, -8, 3200],
      [62, 35, 9, 'ring', 240, 0.38, -4, -5, 4100],
      [82, 22, 4, 'dot', 300, 0.4, 3, -6, 3500],
      [105, 17, 13, 'ring', 350, 0.34, -2, -7, 4300],
      [131, 24, 3, 'dot', 410, 0.38, 4, -4, 3300],
      [152, 37, 8, 'ring', 470, 0.32, 2, -7, 3900],
      [172, 55, 4, 'dot', 520, 0.4, -3, -5, 3600],
      [160, 75, 11, 'ring', 580, 0.34, 4, -6, 4400],
      [139, 91, 3, 'dot', 630, 0.36, -2, -8, 3200],
      [111, 100, 7, 'ring', 690, 0.3, 3, -5, 4000],
      [82, 92, 4, 'dot', 740, 0.38, -4, -6, 3500],
      [60, 77, 12, 'ring', 790, 0.32, 2, -7, 4200],
      [97, 57, 2.5, 'dot', 460, 0.28, -2, -4, 3000],
      [137, 57, 3, 'dot', 560, 0.3, 3, -5, 3700],
      [48, 29, 2, 'dot', 670, 0.26, -3, -7, 3900],
      [178, 25, 2, 'dot', 820, 0.24, 2, -4, 3400],
    ].map(([x, y, size, type, delay, alpha, driftX, driftY, duration]) => (
      `<span class="action-hint__particle action-hint__particle--${type}" style="--x:${x}px; --y:${y}px; --s:${size}px; --d:${delay}ms; --a:${alpha}; --fx:${driftX}px; --fy:${driftY}px; --dur:${duration}ms;"></span>`
    )).join('');
    hint.innerHTML = [
      '<div class="action-hint__bubble">',
      `<div class="action-hint__particles" aria-hidden="true">${thoughtParticles}</div>`,
      '<div class="action-hint__content">',
      '<span class="action-hint__key">Space</span>',
      '</div>',
      '</div>',
    ].join('');
    labelsLayer.appendChild(hint);

    const paper = document.createElement('article');
    paper.className = 'moss-catch';
    paper.setAttribute('aria-hidden', 'true');
    paper.inert = true;
    const paperParticles = [
      [4, 16, 3, 0], [14, 2, 5, 80], [31, 7, 2, 160], [48, -2, 4, 220],
      [66, 5, 3, 300], [84, 0, 6, 360], [98, 18, 2, 430], [101, 43, 4, 500],
      [96, 71, 3, 570], [86, 91, 5, 640], [67, 96, 2, 710], [49, 101, 4, 780],
      [29, 94, 3, 850], [11, 84, 5, 920], [-1, 64, 2, 990], [3, 41, 4, 1060],
    ].map(([x, y, size, delay], index) => (
      `<i class="moss-catch__particle${index % 4 === 1 ? ' moss-catch__particle--ring' : ''}" style="--px:${x}%;--py:${y}%;--ps:${size}px;--pd:${delay}ms;"></i>`
    )).join('');
    paper.innerHTML = [
      '<span class="moss-catch__wash" aria-hidden="true"></span>',
      `<span class="moss-catch__aura" aria-hidden="true">${paperParticles}</span>`,
      '<span class="moss-catch__memory" data-fish-image-frame aria-hidden="true"><img data-fish-image alt="" decoding="async"></span>',
      '<div class="moss-catch__note">',
      '<span class="moss-catch__kicker" data-fish-kicker></span>',
      '<p class="moss-catch__intro" data-fish-intro></p>',
      '<strong data-fish-title></strong>',
      `<a data-fish-link href="#" target="_blank" rel="noopener noreferrer" aria-keyshortcuts="Enter"><span class="moss-catch__enter action-key-signal action-key-signal--article">${actionKeySignalMarkup('ENTER')}</span><span class="moss-catch__link-label">${uiCopy.openArticle}</span><i aria-hidden="true"></i></a>`,
      '</div>',
    ].join('');
    labelsLayer.appendChild(paper);

    focusWorld.fx = {
      line,
      bobberG,
      dip,
      plop,
      splash,
      fish,
      hint,
      paper,
      paperKicker: paper.querySelector('[data-fish-kicker]'),
      paperIntro: paper.querySelector('[data-fish-intro]'),
      paperTitle: paper.querySelector('[data-fish-title]'),
      paperLink: paper.querySelector('[data-fish-link]'),
      paperImage: paper.querySelector('[data-fish-image]'),
    };
  }

  function restartAnim(node, className) {
    node.classList.remove(className);
    void node.getBoundingClientRect();
    node.classList.add(className);
  }

  function articlesForMoss() {
    const area = areaMap.get('moss') || areas[0];
    const list = area && area.articles && area.articles.length ? area.articles : null;
    return list || [{
      title: isEnglish ? 'Visit moss.fish' : 'moss.fish をみにいく',
      url: (area && area.url) || '/',
      language: isEnglish ? 'en' : 'ja',
    }];
  }

  function canFishHere() {
    return state.x >= focusWorld.fishZoneStart && state.x <= focusWorld.fishZoneEnd;
  }

  function focusInteract() {
    if (!isFocusMode || !focusWorld.fx) {
      return false;
    }
    if (fishing.phase === 'hold') {
      if (canFishHere()) {
        startCast();
        return true;
      }
      return false;
    }
    if (fishing.phase) {
      return true;
    }
    if (canFishHere()) {
      startCast();
      return true;
    }
    return false;
  }

  function startCast() {
    const fx = focusWorld.fx;
    hideCatchPaper();
    lockMovementUntilRelease();
    state.direction = 1;
    state.vx = 0;
    fishing.phase = 'cast';
    fishing.t0 = clock.now();
    fishing.waitMs = 1500 + Math.random() * 1700;
    announceStatus(isEnglish
      ? touchInstructions('Fishing started. Press Escape to stop.', 'Fishing started. Use the bottom-right control to stop.')
      : touchInstructions('釣りを始めました。Escapeキーでやめられます。', '釣りを始めました。右下のボタンでやめられます。'));
    fishing.tip = {
      x: state.x + FISHING_ROD_TIP_OFFSET_X,
      y: state.y + FISHING_ROD_TIP_OFFSET_Y,
    };
    fishing.bobber = {
      x: Math.min(state.x + focusWorld.bobberOffset, 6150),
      y: focusWorld.waterY - 5,
    };
    fx.line.classList.add('is-active');
    fx.bobberG.classList.add('is-active');
    fx.fish.classList.remove('is-active');
    fx.dip.classList.remove('is-biting');
  }

  function cancelFishing(options = {}) {
    const fx = focusWorld.fx;
    if (!fx) {
      return;
    }
    fishing.phase = null;
    fx.line.classList.remove('is-active');
    fx.bobberG.classList.remove('is-active');
    fx.dip.classList.remove('is-biting');
    fx.fish.classList.remove('is-active');
    hideCatchPaper();
    if (options.announce !== false) {
      announceStatus(isEnglish ? `Fishing ended. ${walkingStatus()}` : `釣りを終えました。${walkingStatus()}`);
    }
    if (options.restoreFocus !== false) {
      root.focus({ preventScroll: true });
    }
  }

  function hideCatchPaper() {
    const fx = focusWorld.fx;
    if (!fx) {
      return;
    }
    if (fx.paper.classList.contains('is-visible')) {
      releaseArticleMemorySeed(fx.paper, 'moss');
    }
    fx.paper.classList.remove('is-visible');
    fx.paper.setAttribute('aria-hidden', 'true');
    fx.paper.inert = true;
  }

  function prepareCatchPaper() {
    const fx = focusWorld.fx;
    const area = areaMap.get('moss');
    const list = articlesForMoss();
    fishing.articleIndex = (fishing.articleIndex + 1) % list.length;
    const article = list[fishing.articleIndex];
    const firstDiscovery = !journeyDiscovery.found.has('moss');
    const mediaIntro = firstDiscovery ? (area?.role || area?.title || '') : '';
    fx.paperKicker.textContent = `moss.fish / ${isEnglish ? 'catch' : '釣果'} ${fishing.articleIndex + 1} / ${list.length}`;
    fx.paperIntro.textContent = mediaIntro;
    fx.paper.classList.toggle('has-intro', Boolean(mediaIntro));
    fx.paperTitle.textContent = article.title;
    fx.paperTitle.lang = article.language || (isEnglish ? 'ja' : '');
    fx.paperLink.href = article.url;
    fx.paperLink.lang = article.language || (isEnglish ? 'ja' : '');
    syncArticleLinkAccessibility(fx.paperLink, article.title);
    prepareArticleMemoryImage(fx.paper, fx.paperImage, article.image);
    fx.paper.style.left = `${nn(state.x + CATCH_PAPER_OFFSET_X)}px`;
    fx.paper.style.top = `${nn(state.y + CATCH_PAPER_OFFSET_Y)}px`;
    fx.paper.classList.remove('is-visible');
    fx.paper.setAttribute('aria-hidden', 'true');
    fx.paper.inert = true;
    fishing.end = {
      x: state.x + CATCH_HOOK_OFFSET_X,
      y: state.y + CATCH_PAPER_OFFSET_Y + fx.paper.offsetHeight + 6,
    };
  }

  function showCatchPaper() {
    const fx = focusWorld.fx;
    const mediaIntro = fx.paperIntro.textContent;
    recordJourneyDiscovery('moss');
    fx.paper.setAttribute('aria-hidden', 'false');
    fx.paper.inert = false;
    fx.paper.classList.add('is-visible');
    particleBurstState.catchTextCount += 1;
    audio?.note('moss', { duration: 0.78, gain: 0.032 });
    announceStatus(isEnglish
      ? touchInstructions(
        `${mediaIntro ? `moss.fish. ${mediaIntro}. ` : ''}You caught a Japanese-language article. Press Enter to open it or Escape to return to the world.`,
        `${mediaIntro ? `moss.fish. ${mediaIntro}. ` : ''}You caught a Japanese-language article. Tap it to open, or walk away to return to the world.`
      )
      : touchInstructions(
        `${mediaIntro ? `moss.fish。${mediaIntro}。` : ''}記事を釣り上げました。Enterキーで開くか、Escapeキーで世界へ戻れます。`,
        `${mediaIntro ? `moss.fish。${mediaIntro}。` : ''}記事を釣り上げました。記事をタップして開くか、左右へ歩くと世界へ戻れます。`
      ));
    requestAnimationFrame(() => fx.paperLink.focus({ preventScroll: true }));
  }

  function castPoint(tipP, target, t) {
    const p1 = { x: tipP.x + 90, y: tipP.y - 150 };
    const p2 = { x: target.x - 60, y: target.y - 240 };
    const u = 1 - t;
    return {
      x: u * u * u * tipP.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * target.x,
      y: u * u * u * tipP.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * target.y,
    };
  }

  function catchPoint(start, target, t) {
    const p1 = { x: start.x - 30, y: start.y - 270 };
    const p2 = { x: target.x + 170, y: target.y - 120 };
    const u = 1 - t;
    return {
      x: u * u * u * start.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * target.x,
      y: u * u * u * start.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * target.y,
    };
  }

  function drawFishLine(tipP, endP, sag) {
    const dx = endP.x - tipP.x;
    const dy = endP.y - tipP.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const midX = (tipP.x + endP.x) / 2;
    const midY = (tipP.y + endP.y) / 2 + sag * dist;
    focusWorld.fx.line.setAttribute('d', `${M(tipP.x, tipP.y)} ${Q(midX, midY, endP.x, endP.y)}`);
  }

  function placeBobber(x, y) {
    focusWorld.fx.bobberG.setAttribute('transform', `translate(${nn(x)} ${nn(y)})`);
  }

  function updateFishing(now, dt) {
    const fx = focusWorld.fx;
    if (!fx) {
      return;
    }
    const hintVisible = !fishing.phase && state.started && canFishHere();
    fx.hint.classList.toggle('is-visible', hintVisible);
    if (hintVisible !== accessibilityState.fishingHint) {
      const wasVisible = accessibilityState.fishingHint;
      accessibilityState.fishingHint = hintVisible;
      if (hintVisible) {
        announceStatus(isEnglish
          ? touchInstructions('There is something to explore here. Press Space.', uiCopy.actionStatus)
          : touchInstructions('操作できる場所です。Spaceキーを押してください。', uiCopy.actionStatus));
      } else if (wasVisible && !fishing.phase && !journeyInteractionIsCinematic()) {
        announceStatus(walkingStatus());
      }
    }
    if (hintVisible) {
      const pos = focusWorld.hintPos;
      const follow = runtime.frameLerp(0.16, dt);
      pos.x += (state.x + 4 - pos.x) * follow;
      pos.y += (state.y - 216 - pos.y) * follow;
      fx.hint.style.left = `${nn(pos.x)}px`;
      fx.hint.style.top = `${nn(pos.y)}px`;
    }
    if (!fishing.phase) {
      return;
    }
    const tip = fishing.tip;
    const B = fishing.bobber;
    for (let step = 0; step < 6; step += 1) {
      const t = Math.max(0, now - fishing.t0);
      if (fishing.phase === 'cast') {
        const p = Math.min(1, t / 520);
        const e = 1 - Math.pow(1 - p, 3);
        const end = castPoint(tip, B, e);
        drawFishLine(tip, end, 0.35 * e);
        placeBobber(end.x, end.y);
        if (p < 1) {
          return;
        }
        fishing.phase = 'wait';
        fishing.t0 += 520;
        restartAnim(fx.plop, 'is-rippling');
        fx.fish.classList.add('is-active');
        fx.fish.style.transition = 'none';
        fx.fish.setAttribute('transform', `translate(${nn(B.x - 300)} ${nn(B.y + 52)})`);
        requestAnimationFrame(() => {
          fx.fish.style.transition = `transform ${Math.max(600, fishing.waitMs - 200)}ms ease-in-out, opacity 500ms ease`;
          fx.fish.setAttribute('transform', `translate(${nn(B.x - 26)} ${nn(B.y + 34)})`);
        });
        continue;
      }
      if (fishing.phase === 'wait') {
        drawFishLine(tip, B, 0.4);
        placeBobber(B.x, B.y);
        if (t < fishing.waitMs) {
          return;
        }
        fishing.phase = 'bite';
        fishing.t0 += fishing.waitMs;
        fx.dip.classList.add('is-biting');
        triggerScreenShake(300);
        triggerParticleFlash(360);
        continue;
      }
      if (fishing.phase === 'bite') {
        const wob = Math.sin(t / 34) * 3.4;
        const bxw = B.x + wob * 0.4;
        const byw = B.y + Math.abs(wob);
        drawFishLine(tip, { x: bxw, y: byw }, 0.42);
        placeBobber(bxw, byw);
        if (t < 620) {
          return;
        }
        fishing.phase = 'catch';
        fishing.t0 += 620;
        fx.dip.classList.remove('is-biting');
        restartAnim(fx.splash, 'is-splashing');
        fx.fish.style.transition = 'transform 360ms ease-in, opacity 360ms ease';
        fx.fish.setAttribute('transform', `translate(${nn(B.x + 330)} ${nn(B.y + 66)})`);
        fx.fish.classList.remove('is-active');
        prepareCatchPaper();
        fishing.catchPos = { x: B.x, y: B.y };
        triggerScreenShake(420);
        triggerParticleFlash(520);
        continue;
      }
      if (fishing.phase === 'catch') {
        const p = Math.min(1, t / 760);
        const e = 1 - Math.pow(1 - p, 3);
        const caught = catchPoint(B, fishing.end, e);
        fishing.catchPos = caught;
        drawFishLine(tip, caught, 0.18 * (1 - p));
        fx.bobberG.classList.remove('is-active');
        if (p < 1) {
          return;
        }
        fishing.phase = 'reveal';
        fishing.t0 += 760;
        fishing.catchPos = { ...fishing.end };
        emitCatchRevealParticles();
        showCatchPaper();
        triggerScreenShake(520);
        triggerParticleFlash(760);
        continue;
      }
      if (fishing.phase === 'reveal') {
        drawFishLine(tip, fishing.end, 0.06);
        if (t < 1120) {
          return;
        }
        fishing.phase = 'hold';
        fishing.t0 += 1120;
        continue;
      }
      if (fishing.phase === 'hold') {
        drawFishLine(tip, fishing.end, 0.08);
        return;
      }
      return;
    }
  }

  function buildMossFocusWorld() {
    if (root.dataset.render === 'dots') {
      buildMossDotWorld();
    } else {
      buildMossMoodWorld();
    }
    mossPier();
    addMossGuideSign();
    buildFishingRig();
  }

  function buildMoss() {
    addPath(farLayer, 'M900 438 C1210 404 1490 430 1780 412 C2020 396 2240 430 2490 406', {
      revealX: 740,
      classes: ['ink-line--hair', 'ink-line--accent-blue'],
    });
    addPath(midLayer, 'M1120 746 C1240 730 1360 748 1480 734 C1630 716 1800 746 1980 730 C2110 720 2240 724 2380 710', {
      revealX: 880,
      classes: ['ink-line--thin', 'ink-line--accent-blue'],
    });
    addPath(midLayer, 'M1090 780 C1250 758 1430 782 1580 762 C1770 738 1980 772 2180 750 C2310 736 2400 742 2490 736', {
      revealX: 980,
      classes: ['ink-line--thin', 'ink-line--accent-blue'],
    });
    addPath(nearLayer, 'M1840 718 L2070 690 M1880 732 L2110 704 M1960 702 L1980 762 M2070 690 L2130 720', {
      revealX: 1480,
      classes: ['ink-line--thin'],
    });
    addPath(midLayer, 'M1420 705 C1470 678 1532 676 1580 702 C1526 720 1474 720 1420 705Z', {
      revealX: 1180,
      classes: ['ink-line--hair'],
    });
    addPath(midLayer, 'M2210 678 C2250 648 2324 646 2370 674 C2314 694 2262 694 2210 678Z', {
      revealX: 1700,
      classes: ['ink-line--hair'],
    });
    addPath(nearLayer, 'M1780 560 C1890 370 2060 256 2310 206', {
      revealX: 1900,
      classes: ['ink-line--thin'],
      area: 'moss',
      event: 'moss',
    });
  }

  function buildTaupe() {
    addPath(farLayer, 'M2650 332 L3040 332 L3040 250 L3420 250 L3420 362 L3910 362', {
      revealX: 2380,
      classes: ['ink-line--thin', 'ink-line--accent-yellow'],
    });
    addPath(midLayer, 'M2720 640 L2960 640 L2960 552 L3260 552 L3260 490 L3650 490 L3650 612 L4020 612', {
      revealX: 2550,
      classes: ['ink-line--thin'],
    });
    addPath(midLayer, 'M2830 710 L2830 590 M3050 640 L3050 720 M3440 490 L3440 420 M3760 612 L3910 690', {
      revealX: 2840,
      classes: ['ink-line--hair'],
    });
    [2960, 3260, 3650, 3910].forEach((x, index) => {
      addShape(midLayer, 'circle', { cx: x, cy: index % 2 ? 552 : 640, r: 16 }, {
        revealX: x - 420,
        classes: ['ink-line--accent-yellow'],
      });
    });
    addPath(nearLayer, 'M3180 288 L3880 288 M3180 330 L3740 330 M3180 372 L3920 372', {
      revealX: 3000,
      classes: ['ink-line--hair'],
      area: 'taupe',
      event: 'taupe',
    });
  }

  function buildOjicra() {
    for (let i = 0; i < 8; i += 1) {
      const x = 4240 + i * 175;
      const y = 660 - (i % 3) * 18;
      addShape(midLayer, 'rect', { x, y, width: 132, height: 92, rx: 2 }, {
        revealX: x - 260,
        classes: i % 2 ? ['ink-line--accent-green'] : [],
      });
    }
    addPath(midLayer, 'M4350 540 L4520 430 L4690 540 L4690 690 L4350 690Z M4520 430 L4520 690', {
      revealX: 4160,
      classes: ['ink-line--thin'],
    });
    addPath(midLayer, 'M4890 520 L5050 428 L5210 520 L5210 684 L4890 684Z M4970 684 L4970 585 L5070 585 L5070 684', {
      revealX: 4560,
      classes: ['ink-line--thin'],
    });
    addPath(farLayer, 'M4300 365 L4420 300 L4540 365 M4810 350 L4930 284 L5050 350 M5260 378 L5380 310 L5500 378', {
      revealX: 4240,
      classes: ['ink-line--hair'],
    });
    addPath(nearLayer, 'M4620 654 L4620 570 M4590 586 L4650 586 M4598 610 L4642 610 M4588 636 L4652 636', {
      revealX: 4860,
      classes: ['ink-line--accent-yellow'],
      area: 'ojicra',
      event: 'ojicra',
    });
  }

  function buildMonoerabi() {
    addPath(midLayer, 'M5960 520 L7210 520 M5960 620 L7210 620 M5960 720 L7210 720 M6030 470 L6030 744 M6350 470 L6350 744 M6680 470 L6680 744 M7040 470 L7040 744', {
      revealX: 5740,
      classes: ['ink-line--thin'],
    });
    [6100, 6250, 6460, 6810, 6980].forEach((x, index) => {
      addShape(midLayer, 'rect', { x, y: index % 2 ? 552 : 648, width: 125, height: 54, rx: 4 }, {
        revealX: x - 300,
      });
    });
    addPath(nearLayer, 'M6380 430 C6520 392 6760 392 6900 432 M6420 452 C6560 420 6720 420 6860 454', {
      revealX: 6180,
      classes: ['ink-line--hair', 'ink-line--accent-red'],
      area: 'monoerabi',
      event: 'monoerabi',
    });
    addPath(nearLayer, 'M6550 570 L6800 525 L7080 568 M6600 612 L6840 570 L7120 610', {
      revealX: 6480,
      classes: ['ink-line--hair'],
      area: 'monoerabi',
      event: 'monoerabi',
    });
  }

  function buildIslog() {
    addPath(farLayer, 'M7460 318 C7750 276 8120 290 8420 342 C8670 384 8890 360 9080 320', {
      revealX: 7180,
      classes: ['ink-line--hair'],
    });
    addPath(midLayer, 'M7600 728 C7920 612 8240 560 8640 592 C8840 608 9000 690 9180 760', {
      revealX: 7360,
      classes: ['ink-line--thin'],
    });
    addPath(midLayer, 'M7820 590 L8170 520 L8500 590 M7950 590 L7950 720 M8350 590 L8350 720', {
      revealX: 7680,
      classes: ['ink-line--thin'],
    });
    addPath(midLayer, 'M8620 504 L8950 504 L8950 640 L8620 640Z M8680 540 L8890 540 M8680 586 L8890 586', {
      revealX: 8300,
      classes: ['ink-line--thin'],
    });
    addPath(nearLayer, 'M8110 430 L8400 430 L8400 612 L8110 612Z M8185 430 C8230 370 8280 370 8325 430 M8238 520 A56 56 0 1 0 8239 520', {
      revealX: 8000,
      classes: ['ink-line--accent-blue'],
      area: 'islog',
      event: 'islog',
    });
  }

  function buildMonoomoi() {
    addPath(midLayer, 'M9220 660 L10220 660 M9380 610 L9840 610 M9460 552 L9940 552', {
      revealX: 9020,
      classes: ['ink-line--thin'],
    });
    addPath(midLayer, 'M9570 456 L9900 456 L9900 640 L9570 640Z M9570 520 L9900 520 M9735 456 L9735 640', {
      revealX: 9300,
      classes: ['ink-line--thin', 'ink-line--accent-red'],
    });
    addPath(midLayer, 'M9350 690 C9490 620 9750 620 9970 690', {
      revealX: 9200,
      classes: ['ink-line--hair'],
    });
    addPath(nearLayer, 'M9460 416 C9640 350 9810 360 10040 436 C9800 472 9630 470 9460 416Z', {
      revealX: 9340,
      classes: ['ink-line--accent-red'],
      area: 'monoomoi',
      event: 'monoomoi',
    });
  }

  function buildHub() {
    addPath(farLayer, 'M10380 320 C10720 210 11120 230 11420 360', {
      revealX: 10100,
      classes: ['ink-line--hair'],
    });
    addPath(midLayer, 'M10560 640 C10800 500 11100 500 11430 640 C11120 760 10820 760 10560 640Z', {
      revealX: 10320,
      classes: ['ink-line--thin'],
    });
    addPath(nearLayer, 'M10740 638 L11250 638 M10995 392 L10995 760 M10795 486 L11195 486 M10840 560 L11150 560', {
      revealX: 10440,
      classes: ['ink-line--thin'],
    });
    areas.forEach((area, index) => {
      const y = 430 + index * 42;
      addPath(nearLayer, `M${area.xEnd - 180} ${terrainY(area.xEnd - 180) - 35} C${10200 + index * 50} ${y} 10600 ${y} 10995 ${560}`, {
        revealX: 10440,
        classes: ['ink-line--hair'],
      });
    });
  }

  function resize() {
    const viewportWidth = runtime.finiteOr(window.innerWidth, 1440);
    const viewportHeight = runtime.finiteOr(window.innerHeight, WORLD_HEIGHT);
    state.scale = runtime.finiteOr(viewportHeight / WORLD_HEIGHT, 1);
    if (state.scale <= 0) {
      state.scale = 1;
    }
    state.visibleW = runtime.finiteOr(viewportWidth / state.scale, viewportWidth);
    character.style.width = `${CHARACTER_W * state.scale}px`;
    character.style.height = `${CHARACTER_H * state.scale}px`;
    if (passingTraveler.node) {
      passingTraveler.node.style.width = `${CHARACTER_W * state.scale * 0.92}px`;
      passingTraveler.node.style.height = `${CHARACTER_H * state.scale * 0.92}px`;
    }
    mediaSigns.forEach((sign) => {
      sign.approaching = false;
      sign.reading = false;
      sign.viewportShift = 0;
      sign.node.style.removeProperty('--media-sign-screen-shift');
    });
    resizeParticles();
  }

  let resizeTimer = 0;

  function queueResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = 0;
      requestAnimationFrame(resize);
      if (tiltWalk.enabled && Math.abs(window.innerWidth - tiltWalk.viewportWidth) >= 40) {
        tiltWalk.viewportWidth = window.innerWidth;
        queueTiltWalkCalibration();
      }
    }, 120);
  }

  function updateCharacterClearance(screenX, screenY, angle) {
    const width = CHARACTER_CLEARANCE_W * state.scale;
    const height = CHARACTER_CLEARANCE_H * state.scale;
    const x = screenX - width * 0.5;
    const y = screenY - height + CHARACTER_CLEARANCE_GROUND_LIFT * state.scale;
    characterClearance.style.width = `${width}px`;
    characterClearance.style.height = `${height}px`;
    characterClearance.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
  }

  function activeArea() {
    return areas.find((area) => state.x >= area.xStart && state.x < area.xEnd) || null;
  }

  function setCharacterImage(src) {
    if (!src) {
      return;
    }
    const key = characterImageKey(src);
    const nextImage = characterImages.get(key) || registerCharacterImage(src);
    if (!nextImage || nextImage === activeCharacterImg) {
      return;
    }
    if (activeCharacterImg) {
      activeCharacterImg.classList.remove('is-active');
      activeCharacterImg.removeAttribute('data-character-img');
    }
    nextImage.classList.add('is-active');
    nextImage.setAttribute('data-character-img', '');
    activeCharacterImg = nextImage;
  }

  function setCharacterPose(pose, src) {
    setCharacterImage(src);
    if (character.dataset.pose !== pose) {
      character.dataset.pose = pose;
    }
  }

  function setCharacterRestMode(mode = '') {
    if (mode) {
      if (character.dataset.rest !== mode) {
        character.dataset.rest = mode;
      }
      return;
    }
    if (character.dataset.rest) {
      delete character.dataset.rest;
    }
  }

  function clearCharacterTouch() {
    window.clearTimeout(characterTouchTimer);
    characterTouchTimer = 0;
    character.classList.remove('is-touching');
  }

  function triggerCharacterTouch() {
    clearCharacterTouch();
    void character.offsetWidth;
    character.classList.add('is-touching');
    characterTouchTimer = window.setTimeout(clearCharacterTouch, 920);
  }

  function interact() {
    if (isFocusMode) {
      return;
    }

    const area = activeArea();
    if (!area) {
      showCard({
        label: 'hub / start',
        name: 'ishikawa.co',
        title: isEnglish ? 'The world draws itself as you walk.' : '歩くと、世界が描かれていきます。',
        description: isEnglish
          ? 'Walk with A or D, or the arrow keys. Press Space near a point of interest to discover a media memory.'
          : 'A / D または左右キーで進んでください。近くの場所で Space を押すと、そのメディアの記録が開きます。',
        url: config.links?.media || '/',
        articles: [],
      });
      return;
    }

    touched.add(area.key);
    state.action = area.event;
    state.actionUntil = clock.now() + 1450;
    triggerCharacterTouch();
    eventLines
      .filter((line) => line.dataset.area === area.key || line.dataset.eventLine === area.key)
      .forEach((line) => drawLine(line));
    showCard(area);
  }

  function showCard(area) {
    if (isFocusMode) {
      return;
    }
    cardKicker.textContent = area.label || 'area';
    cardTitle.textContent = area.name || area.title || 'ishikawa.co';
    cardDescription.textContent = area.description || area.title || '';
    cardLink.href = area.url || config.links?.media || '/';
    cardLink.textContent = area.url ? `open ${area.name || 'site'}` : 'open media';
    cardList.innerHTML = '';
    (area.articles || []).forEach((article) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = article.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = article.title;
      item.appendChild(link);
      cardList.appendChild(item);
    });
    card.classList.add('is-visible');
    card.setAttribute('aria-hidden', 'false');
    card.inert = false;
  }

  function hideCard() {
    if (!card) {
      return;
    }
    card.classList.remove('is-visible');
    card.setAttribute('aria-hidden', 'true');
    card.inert = true;
  }

  function drawLine(line) {
    if (!drawn.has(line)) {
      drawn.add(line);
      line.classList.add('is-drawn');
    }
  }

  function readableMediaSign() {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const sign of mediaSigns) {
      if (!sign.reading || !sign.link) {
        continue;
      }
      const distance = Math.abs(state.x - sign.x);
      if (distance < nearestDistance) {
        nearest = sign;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function approachingMediaSign() {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const sign of mediaSigns) {
      if (!sign.approaching || sign.reading) {
        continue;
      }
      const distance = Math.abs(state.x - sign.x);
      if (distance < nearestDistance) {
        nearest = sign;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function updateMediaSigns(now) {
    if (now < nextMediaSignUpdateAt) {
      return;
    }
    nextMediaSignUpdateAt = now + (state.isMoving ? 80 : 34);
    const blocked = Boolean(
      fishing.phase
      || journeyDiscovery.areaKey
      || journeyInteractionIsCinematic()
      || journeySecrets.active
      || (state.action && state.actionUntil > now)
    );
    const idleMs = Math.max(0, now - state.lastMovementAt);
    mediaSigns.forEach((sign) => {
      const visible = sign.node.classList.contains('is-visible');
      const distance = Math.abs(state.x - sign.x);
      const interactionPhase = runtime.mediaSignInteractionPhase?.({
        visible,
        moving: state.isMoving,
        blocked,
        distance,
        radius: sign.radius,
        idleMs,
        delayMs: 520,
        approachRatio: 1,
      }) || 'far';
      const reading = interactionPhase === 'ready';
      const approaching = interactionPhase === 'approach';
      const becameReading = runtime.mediaSignShouldSound?.({
        reading,
        wasReading: sign.reading,
      }) ?? (reading && !sign.reading);
      if (
        root.dataset.touchControls === 'true'
        && visible
        && distance <= sign.radius * 2
        && becameReading
      ) {
        const rect = (sign.surface || sign.node).getBoundingClientRect();
        const viewportShift = Math.round(runtime.mediaSignViewportShift({
          left: rect.left,
          right: rect.right,
          viewportWidth: window.innerWidth,
          inset: 18,
          appliedShift: sign.viewportShift,
        }));
        if (Math.abs(viewportShift - sign.viewportShift) > 0.25) {
          sign.viewportShift = viewportShift;
          sign.node.style.setProperty(
            '--media-sign-screen-shift',
            `${viewportShift / Math.max(0.1, state.scale)}px`
          );
        }
      } else if (sign.viewportShift && (!visible || distance > sign.radius * 2)) {
        sign.viewportShift = 0;
        sign.node.style.removeProperty('--media-sign-screen-shift');
      }
      const nearby = visible && !blocked && distance <= sign.radius;
      if (
        visible
        && distance <= sign.radius * 2
        && sign.emblem?.dataset.emblemReady !== 'true'
        && sign.emblem?.dataset.emblemHydrating !== 'true'
      ) {
        hydrateMediaEmblem(sign.emblem, { defer: true });
      }
      const assemble = runtime.mediaEmblemShouldAssemble?.({
        assembled: sign.assembled,
        visible,
        settled: reading,
        blocked,
      });
      if (assemble) {
        sign.assembled = true;
        const emblem = hydrateMediaEmblem(sign.emblem);
        if (emblem && !motionReduced) {
          if (emblem.dataset.emblemReady === 'true') {
            requestAnimationFrame(() => emblem.classList.add('is-assembled'));
          } else {
            emblem.dataset.emblemAssemblePending = 'true';
          }
        }
      }
      if (becameReading) {
        audio?.note(sign.key, { duration: 0.4, gain: 0.016, waveform: 'sine' });
      }
      sign.reading = reading;
      sign.approaching = approaching;
      if (approaching && !mediaApproachAnnounced) {
        mediaApproachAnnounced = true;
        announceStatus(isEnglish
          ? 'A media sign is nearby. Pause to reveal its guide.'
          : 'メディアの看板が近くにあります。立ち止まると案内がひらきます。');
      }
      if (reading && !sign.announced) {
        mediaAffordanceLearned = true;
        sign.announced = true;
        announceStatus(isEnglish
          ? touchInstructions(
            `You are at the ${sign.name} sign. Press Enter to open the media site in a new tab.`,
            `You are at the ${sign.name} sign. Use the bottom-right control to open the media site in a new tab.`
          )
          : touchInstructions(
            `${sign.name}の案内です。Enterキーでメディアのトップページを新しいタブで開けます。`,
            `${sign.name}の案内です。画面右下のボタンでメディアのトップページを新しいタブで開けます。`
          ));
      }
      sign.node.classList.toggle('is-approaching', approaching);
      sign.node.classList.toggle('is-nearby', nearby);
      sign.node.classList.toggle('is-reading', reading);
    });
  }

  function updateReveal() {
    const revealEdge = state.x + 80;
    if (root.dataset.render === 'dots') {
      labels.forEach((label) => {
        const revealX = Number(label.dataset.revealX || 0);
        const visible = state.started && revealEdge >= revealX && state.x < revealX + 2100;
        label.classList.toggle('is-visible', visible);
        label.inert = !visible;
      });
      moodNodes.forEach((node) => {
        const revealX = Number(node.dataset.revealX || 0);
        node.classList.toggle('is-visible', state.started && revealEdge >= revealX);
      });
      return;
    }
    if (!state.started) {
      lines.forEach((line) => {
        if (!line.dataset.eventLine) {
          line.classList.remove('is-drawn');
          line.style.removeProperty('stroke-dashoffset');
        }
      });
      shapes.forEach((shape) => shape.classList.remove('is-drawn'));
      labels.forEach((label) => {
        label.classList.remove('is-visible');
        label.inert = true;
      });
      moodNodes.forEach((node) => node.classList.remove('is-visible'));
      return;
    }
    lines.forEach((line) => {
      const revealX = Number(line.dataset.revealX || 0);
      if (line.dataset.eventLine && !touched.has(line.dataset.area || line.dataset.eventLine)) {
        return;
      }
      if (line.dataset.drawStart && line.dataset.drawEnd) {
        const length = Number(line.dataset.length || 1);
        const drawStart = Number(line.dataset.drawStart);
        const drawEnd = Number(line.dataset.drawEnd);
        const progress = Math.max(0, Math.min(1, (state.x - drawStart) / Math.max(1, drawEnd - drawStart)));
        if (progress <= 0) {
          drawn.delete(line);
          line.classList.remove('is-drawn');
          line.style.setProperty('stroke-dashoffset', length.toFixed(2));
          return;
        }
        drawn.add(line);
        line.classList.add('is-drawn');
        line.style.setProperty('stroke-dashoffset', (length * (1 - progress)).toFixed(2));
        return;
      }
      if (revealEdge >= revealX) {
        line.style.removeProperty('stroke-dashoffset');
        drawLine(line);
      }
    });
    shapes.forEach((shape) => {
      const revealX = Number(shape.dataset.revealX || 0);
      if (revealEdge >= revealX) {
        shape.classList.add('is-drawn');
      }
    });
    labels.forEach((label) => {
      const revealX = Number(label.dataset.revealX || 0);
      const visible = revealEdge >= revealX && state.x < revealX + 2100;
      label.classList.toggle('is-visible', visible);
      label.inert = !visible;
    });
    moodNodes.forEach((node) => {
      const revealX = Number(node.dataset.revealX || 0);
      node.classList.toggle('is-visible', revealEdge >= revealX);
    });
  }

  function updateMap(area) {
    mapJumpButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.jump === area?.key);
    });
  }

  function updateCharacter(dt, now) {
    if (isFocusMode && fishing.phase) {
      setCharacterRestMode();
      setCharacterPose('fish', assets.fishStand || assets.idle);
      character.classList.remove('is-walking');
      return;
    }
    const transition = journeyTransition.active;
    if (transition) {
      setCharacterRestMode();
      const phase = root.dataset.cinematicPhase;
      if (transition.type === 'launch') {
        setCharacterPose(
          phase === 'anticipation' ? 'brace-launch' : 'launch',
          phase === 'anticipation'
            ? assets.braceLaunch || assets.idle
            : assets.launch || assets.idle
        );
      } else if (phase === 'motion') {
        setCharacterPose('fall', assets.fall || assets.idle);
      } else {
        setCharacterPose('idle', assets.idle);
      }
      character.classList.remove('is-walking');
      return;
    }
    if (
      journeyLanding.active
      && ['drop', 'return-drop', 'launch'].includes(journeyLanding.active.type)
      && now < (journeyLanding.active.poseUntil || journeyLanding.active.startedAt + 760)
    ) {
      setCharacterRestMode();
      setCharacterPose('land', assets.land || assets.idle);
      character.classList.remove('is-walking');
      return;
    }
    if (
      journeyReturn.active
      || journeyAwakening.orchestra
      || journeySecrets.observatory
      || journeySecrets.ascension
    ) {
      setCharacterRestMode();
      setCharacterPose('idle', assets.idle);
      character.classList.remove('is-walking');
      return;
    }
    if (journeyDiscovery.jumpUntil > now && assets.jump) {
      setCharacterRestMode();
      setCharacterPose('jump', assets.jump);
      character.classList.remove('is-walking');
      return;
    }
    const isAction = state.action && now < state.actionUntil;

    const restPose = !isAction && !journeyDiscovery.areaKey && intro.complete
      ? runtime.idleRestPose(now - state.lastMovementAt, {
        sitAfterMs: IDLE_SIT_AFTER_MS,
        chillAfterMs: IDLE_CHILL_AFTER_MS,
      })
      : 'idle';

    if (state.isMoving && assets.walk.length) {
      if (character.classList.contains('is-touching')) {
        clearCharacterTouch();
      }
      setCharacterRestMode();
      const frameMs = isFocusMode && !state.started && !intro.complete
        ? INTRO_WALK_FRAME_MS
        : WALK_FRAME_MS;
      state.frameElapsed += dt;
      if (state.frameElapsed > frameMs) {
        state.frameElapsed = 0;
        state.frameIndex = (state.frameIndex + 1) % assets.walk.length;
      }
      setCharacterPose('walk', assets.walk[state.frameIndex]);
    } else if (restPose === 'sit-chill') {
      setCharacterRestMode('chill');
      setCharacterPose('sit-chill', assets.sitChill || assets.sit || assets.idle);
    } else if (restPose === 'sit') {
      setCharacterRestMode('sit');
      setCharacterPose('sit', assets.sit || assets.idle);
    } else {
      setCharacterRestMode();
      setCharacterPose('idle', assets.idle);
    }

    character.classList.toggle('is-walking', state.isMoving && !isAction);
  }

  function heavyRenderIsActive(now, cinematicActive) {
    return Boolean(
      cinematicActive
      || fishing.phase
      || journeyTransition.active
      || journeyLanding.active
      || journeyMoment.active
      || journeyEcho.active
      || journeyReturn.active
      || journeyAwakening.dawn
      || journeyAwakening.resonance
      || journeyAwakening.starDash
      || journeyAwakening.orchestra
      || journeySecrets.active
      || journeySecrets.observatory
      || journeySecrets.ascension
      || journeyMemory.replayStartedAt
      || (state.action && state.actionUntil > now)
      || particleBurstState.flashUntil > now
      || particleBurstState.shakeUntil > now
    );
  }

  function journeyInteractionIsCinematic() {
    return Boolean(
      journeyTransition.active
      || journeyLanding.active
      || journeyMoment.active
      || journeyReturn.active
      || journeyAwakening.dawn
      || journeyAwakening.resonance
      || journeyAwakening.starDash
      || journeyAwakening.orchestra
      || journeySecrets.observatory
      || journeySecrets.ascension
      || livingAtlasController?.isEntering?.()
    );
  }

  function syncDotCanvasBandCamera(band, rendered) {
    if (!band.canvas) {
      return;
    }
    if (rendered) {
      band.renderCameraX = state.cameraX;
      band.renderCameraY = state.cameraY;
      band.offsetX = 0;
      band.offsetY = 0;
      if (band.canvas.style.transform !== 'translate3d(0px, 0px, 0px)') {
        band.canvas.style.transform = 'translate3d(0px, 0px, 0px)';
      }
      return;
    }
    const offsetX = runtime.parallaxCanvasOffset(
      state.cameraX,
      band.renderCameraX,
      state.scale,
      band.representativeParallax
    );
    const offsetY = runtime.parallaxCanvasOffset(
      state.cameraY,
      band.renderCameraY,
      state.scale,
      1
    );
    band.offsetX = offsetX;
    band.offsetY = offsetY;
    const transform = `translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, 0)`;
    if (band.canvas.style.transform !== transform) {
      band.canvas.style.transform = transform;
    }
  }

  function syncDotCanvasCamera(rendered) {
    dotCanvasBandList.forEach((band) => syncDotCanvasBandCamera(band, rendered));
  }

  function dotCanvasNeedsImmediateRender() {
    return dotCanvasBandList.some((band) => {
      const offsetX = Math.abs(runtime.parallaxCanvasOffset(
        state.cameraX,
        band.renderCameraX,
        state.scale,
        band.representativeParallax
      ));
      const offsetY = Math.abs(runtime.parallaxCanvasOffset(
        state.cameraY,
        band.renderCameraY,
        state.scale,
        1
      ));
      return Math.max(offsetX, offsetY) >= DOT_CANVAS_OVERSCAN * 0.72;
    });
  }

  function particleRenderNeedsFullRate(now, cinematicActive) {
    return Boolean(
      cinematicActive
      || fishing.phase
      || journeyTransition.active
      || journeyLanding.active
      || journeyMoment.active
      || journeyReturn.active
      || journeyAwakening.dawn
      || journeyAwakening.resonance
      || journeyAwakening.starDash
      || journeyAwakening.orchestra
      || journeySecrets.active
      || journeySecrets.observatory
      || journeySecrets.ascension
      || journeyMemory.replayStartedAt
      || particleBurstState.flashUntil > now
      || particleBurstState.shakeUntil > now
    );
  }

  let frameRequest = 0;

  function scheduleFrame() {
    if (
      frameRequest
      || motionReduced
      || document.hidden
      || root.dataset.links === 'open'
    ) {
      return;
    }
    frameRequest = requestAnimationFrame(tick);
  }

  function tick(realNow) {
    frameRequest = 0;
    const loopDecision = mainLoopScheduler.take(realNow, 'active');
    if (!loopDecision.render) {
      scheduleFrame();
      return;
    }
    const workStartedAt = performance.now();
    const now = clock.tick(realNow);
    const frameMs = clock.elapsed() || runtime.FRAME_MS;
    const dt = clock.step() || runtime.FRAME_MS;
    syncIntroPhase(now);
    if (!state.started && !intro.complete && introProgress(now) >= 1) {
      finishIntro();
    }
    frameCadence.record(frameMs);
    state.lastTime = now;
    state.frameCount += 1;
    processedFrameCount += 1;
    const awakeningView = updateJourneyAwakening(now);

    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const manualInput = (right ? 1 : 0) - (left ? 1 : 0);
    const movementPulse = interactionInput.movementPulse;
    const pulseInput = movementPulse?.direction || 0;
    const tiltInput = tiltWalk.enabled && touchInputEnabled() && tiltWalk.baseline !== null
      ? tiltWalk.input
      : 0;
    const requestedInput = manualInput || pulseInput || tiltInput;
    const journeyInputMode = tiltInput !== 0
      ? 'tilt'
      : interactionInput.touchPointers.size > 0 || movementPulse?.inputMode === 'touch'
        ? 'touch'
        : manualInput !== 0 || pulseInput !== 0 ? 'keyboard' : 'unknown';
    const input = !intro.complete && (!intro.seedStartedAt || now < intro.seedStartedAt)
      ? 0
      : requestedInput;
    const inputDirection = input === 0 ? 0 : Math.sign(input);
    const secretView = updateJourneySecrets(now, dt);
    const landingTravelLock = journeyLandingBlocksTravel(now);
    const atlasEnteringAtFrameStart = Boolean(livingAtlasController?.isEntering?.());
    const maxSpeed = 0.48;
    const acceleration = 0.0018 * dt;
    const friction = Math.pow(0.82, dt / 16.67);

    const cinematicAtFrameStart = Boolean(
      journeyTransition.active
      || journeyReturn.active
      || landingTravelLock
      || atlasEnteringAtFrameStart
      || awakeningView.cinematic
      || secretView.cinematic
    );
    if (input !== 0 && !cinematicAtFrameStart) {
      finishIntro();
      state.started = true;
      if (movementPulse && pulseInput === inputDirection) {
        state.vx = runtime.movementPulseVelocity({
          currentVelocity: state.vx,
          direction: inputDirection,
          minSpeed: MOVEMENT_PULSE_MIN_SPEED,
          maxSpeed,
        });
        interactionInput.movementPulse = null;
      }
      state.vx += input * acceleration;
      state.direction = input > 0 ? 1 : -1;
      help?.classList.add('is-muted');
      startHint?.classList.add('is-hidden');
    } else if (!cinematicAtFrameStart) {
      state.vx *= friction;
    } else {
      interactionInput.movementPulse = null;
      state.vx = 0;
    }

    state.vx = Math.max(-maxSpeed, Math.min(maxSpeed, state.vx));
    if (journeyMoment.active && !journeyTransition.active) {
      const momentMaxSpeed = journeyMoment.active.type === 'finale' ? 0.28 : 0.36;
      state.vx = clamp(state.vx, -momentMaxSpeed, momentMaxSpeed);
    }
    if (Math.abs(state.vx) < 0.015) {
      state.vx = 0;
    }

    let memoryReturnActive = updateMemoryReturn(now);
    let cinematicActive = memoryReturnActive
      || atlasEnteringAtFrameStart
      || awakeningView.cinematic
      || secretView.cinematic;
    if (!memoryReturnActive && !awakeningView.cinematic && !secretView.cinematic) {
      cinematicActive = updateJourneyTransition(now);
    }
    cinematicActive = cinematicActive || journeyLandingBlocksTravel(now);
    if (!cinematicActive) {
      const maxX = isJourneyMode
        ? WORLD_LENGTH - 300
        : isFocusMode ? focusWorld.pierEnd : WORLD_LENGTH - 420;
      const previousX = state.x;
      state.x = Math.max(160, Math.min(maxX, state.x + state.vx * dt));
      state.y = terrainY(state.x);
      if (!firstMoveSignalSent && Math.abs(state.x - previousX) > 0.01) {
        firstMoveSignalSent = true;
        emitJourneySignal('first_move', { input_mode: journeyInputMode });
      }
      if (isJourneyMode) {
        if (state.visitTrackingSuspended && state.x <= state.maxVisitedX + 90) {
          state.visitTrackingSuspended = false;
        }
        state.maxVisitedX = runtime.advanceMaxVisitedX(
          state.maxVisitedX,
          previousX,
          state.x,
          !state.visitTrackingSuspended && state.vx > 0
        );
      }
      if (maybeBeginLivingAtlasFromWalk(inputDirection)) {
        cinematicActive = true;
      } else if (maybeBeginJourneyTransition(inputDirection, now)) {
        cinematicActive = updateJourneyTransition(now);
      }
    }
    let momentView = { progress: 0, cameraX: 0, cameraY: 0, characterY: 0, angle: 0 };
    if (!memoryReturnActive && !awakeningView.cinematic && !secretView.cinematic) {
      maybeBeginJourneyMoment(inputDirection, now);
      momentView = updateJourneyMoment(now);
    }
    updateKeepsakeAvailability(now);
    const statusCinematic = journeyInteractionIsCinematic();
    if (accessibilityState.cinematic !== statusCinematic) {
      accessibilityState.cinematic = statusCinematic;
      announceStatus(statusCinematic
        ? (isEnglish
          ? touchInstructions('A transition is playing. Press Escape to continue.', 'A transition is playing. Use the bottom-right control to continue.')
          : touchInstructions('演出中です。Escapeキーで先へ進めます。', '演出中です。画面右下のボタンで先へ進めます。'))
        : walkingStatus());
    }
    momentView.cameraX += awakeningView.cameraX;
    momentView.cameraY += awakeningView.cameraY;
    momentView.characterY += awakeningView.characterY;
    momentView.angle += awakeningView.angle;
    momentView.cameraX += secretView.cameraX;
    momentView.cameraY += secretView.cameraY;
    momentView.characterY += secretView.characterY;
    momentView.angle += secretView.angle;
    momentView.cameraX = runtime.finiteOr(momentView.cameraX);
    momentView.cameraY = runtime.finiteOr(momentView.cameraY);
    momentView.characterY = runtime.finiteOr(momentView.characterY);
    momentView.angle = runtime.finiteOr(momentView.angle);
    updateJourneyVisual();
    const introCharacter = introCharacterProgress(now);
    const introMoving = isFocusMode
      && !state.started
      && !intro.complete
      && introCharacter > 0.001;
    state.isMoving = introMoving || (!cinematicActive && Math.abs(state.vx) > 0.08);
    if (
      input !== 0
      || state.isMoving
      || cinematicActive
      || fishing.phase
      || journeyMoment.active
      || journeyDiscovery.areaKey
      || (state.action && now < state.actionUntil)
    ) {
      state.lastMovementAt = now;
    }
    if (state.isMoving !== state.wasMoving) {
      state.frameElapsed = 0;
      if (state.isMoving) {
        state.frameIndex = 0;
      }
      state.wasMoving = state.isMoving;
    }
    const movingMode = state.isMoving ? '1' : '0';
    if (root.dataset.moving !== movingMode) {
      root.dataset.moving = movingMode;
    }
    const trailDirection = state.isMoving && state.vx < -0.08 ? 'return' : 'forward';
    if (root.dataset.trailDirection !== trailDirection) {
      root.dataset.trailDirection = trailDirection;
    }
    updateJourneyMotion(inputDirection, now, dt);
    if (introMoving) {
      root.dataset.intro = 'active';
      state.direction = 1;
      startHint?.classList.add('is-hidden');
    } else if (!state.started) {
      startHint?.classList.remove('is-hidden');
    }
    if (isFocusMode) {
      setStage(focusStage(state.x));
    }

    const cameraProfile = runtime.journeyCameraProfile?.({
      touch: root.dataset.touchControls === 'true',
      cinematic: cinematicActive,
      moving: input !== 0 || Math.abs(state.vx) > 0.08,
    }) || { anchorRatio: 0.42, follow: cinematicActive ? 0.11 : 0.075 };
    const targetCameraX = runtime.finiteOr(Math.max(0, Math.min(
      WORLD_LENGTH - state.visibleW,
      state.x - state.visibleW * cameraProfile.anchorRatio + momentView.cameraX
    )), 0);
    const cameraSubjectY = transitionCameraSubjectY(now);
    const targetCameraY = isJourneyMode
      ? Math.max(-520, Math.min(520, cameraSubjectY - 710 + momentView.cameraY + landingCameraOffset(now)))
      : Math.max(-85, Math.min(85, state.y - 710));
    state.cameraX = runtime.finiteOr(state.cameraX, targetCameraX);
    state.cameraY = runtime.finiteOr(state.cameraY, targetCameraY);
    state.cameraX = runtime.finiteOr(
      state.cameraX + (targetCameraX - state.cameraX) * runtime.frameLerp(cameraProfile.follow, dt),
      targetCameraX
    );
    const cameraYFollow = cinematicActive
      ? 0.13
      : (state.isMoving || input !== 0) ? 0.34 : 0.095;
    state.cameraY = runtime.finiteOr(
      state.cameraY + (targetCameraY - state.cameraY) * runtime.frameLerp(cameraYFollow, dt),
      targetCameraY
    );

    const heavyRenderActive = heavyRenderIsActive(now, cinematicActive);
    const renderActivity = heavyRenderActive ? 'active' : 'idle';
    const particleMorphFullRate = renderQuality.mode !== 'low'
      && particleLanguage.lastMorphAt > 0
      && now - particleLanguage.lastMorphAt < PARTICLE_MORPH_DURATION_MS;
    const resizeForQuality = canvasResizePending
      && !state.isMoving
      && !heavyRenderActive;
    if (resizeForQuality) {
      resizeParticles();
      canvasResizePending = false;
    }
    const forceDotRender = isFocusMode && dotCanvasNeedsImmediateRender();
    lastRenderDecision = particleMorphFullRate
      ? particleMorphRenderScheduler.take(now, 'active')
      : renderScheduler.take(now, renderActivity, resizeForQuality || forceDotRender);
    if (root.dataset.renderCadence !== renderActivity) {
      root.dataset.renderCadence = renderActivity;
    }

    const stageOffsetY = 0;
    world.style.transform = `translate3d(${-state.cameraX * state.scale}px, ${(-state.cameraY * state.scale) + stageOffsetY}px, 0) scale(${state.scale})`;
    if (isFocusMode) {
      if (root.dataset.render !== 'dots') {
        farLayer.setAttribute('transform', `translate(${(state.cameraX * focusWorld.farK).toFixed(1)} 0)`);
        midLayer.setAttribute('transform', `translate(${(state.cameraX * focusWorld.midK).toFixed(1)} 0)`);
      }
      syncDotCanvasCamera(lastRenderDecision.render);
      if (lastRenderDecision.render) {
        const dotWorldStartedAt = performance.now();
        drawDotWorld(now);
        renderPhases.record('dotWorld', performance.now() - dotWorldStartedAt);
      }
    }

    const screenX = (state.x - state.cameraX) * state.scale;
    const screenY = (state.y - state.cameraY) * state.scale;
    const slope = cinematicActive ? 0 : terrainSlope(state.x);
    const angle = cinematicActive ? 0 : Math.max(-4, Math.min(4, slope * 24));
    const introVisual = isFocusMode && !state.started && !intro.complete;
    const introStartX = -CHARACTER_W * state.scale * 0.42;
    const displayScreenX = introVisual
      ? introStartX + (screenX - introStartX) * introCharacter
      : screenX;
    const displayScreenY = screenY + momentView.characterY;
    const displayAngle = (introVisual ? angle * introCharacter : angle) + momentView.angle;
    const stableScreenY = Math.round(displayScreenY * 4) / 4;
    const stableAngle = Math.round(displayAngle * 20) / 20;
    updateCharacterClearance(displayScreenX, stableScreenY, stableAngle);
    character.style.transform = `translate3d(${displayScreenX - (CHARACTER_W * state.scale * 0.5)}px, ${stableScreenY - (CHARACTER_H * state.scale)}px, 0) scaleX(${state.direction}) rotate(${stableAngle}deg)`;
    updatePassingTraveler(now, dt);
    updateJourneyDiscoveryHint(displayScreenX, stableScreenY);

    if (root.dataset.render !== 'dots') {
      if (isFocusMode) {
        groundPath.setAttribute(
          'd',
          state.started && state.x >= FOCUS_GROUND_START
            ? buildGroundPath(Math.min(state.x + 320, focusWorld.pierStart + 26), FOCUS_GROUND_START - 100)
            : ''
        );
      } else {
        groundPath.setAttribute(
          'd',
          state.started
            ? buildGroundPath(state.x + 360)
            : buildGroundPath(state.x + 145, state.x - 150)
        );
      }
    }
    updateReveal();
    updateMediaSigns(now);
    updateArticleDiscoveryLanding(now);
    updateCharacter(dt, now);
    if (isFocusMode) {
      updateFishing(now, dt);
      const particleActivity = particleRenderNeedsFullRate(now, cinematicActive)
        ? 'active'
        : 'idle';
      const particleDecision = particleMorphFullRate
        ? lastRenderDecision
        : particleRenderScheduler.take(now, particleActivity);
      if (particleDecision.render) {
        const particlesStartedAt = performance.now();
        updateParticles(particleDecision.dt, now, displayScreenX, stableScreenY);
        renderPhases.record('particles', performance.now() - particlesStartedAt);
      }
    }
    updateCharacterActionAlert(displayScreenX, stableScreenY);
    updateMovementGuide(now);
    syncTouchActionState();

    const area = activeArea();
    if (area && area.key !== state.activeKey) {
      state.activeKey = area.key;
      updateMap(area);
      if (!fishing.phase && !journeyDiscovery.areaKey && !accessibilityState.cinematic) {
        announceStatus(walkingStatus(area.name));
      }
      if (!isFocusMode && !card.classList.contains('is-visible')) {
        showCard(area);
      }
    } else if (!area && state.activeKey !== 'intro') {
      state.activeKey = 'intro';
      updateMap(null);
    }

    if (root.dataset.render !== 'dots' && state.frameCount % 4 === 0) {
      const progress = Math.max(0, Math.min(1, state.x / WORLD_PROGRESS_END));
      const progressText = `${(progress * 100).toFixed(2)}%`;
      progressLine?.style.setProperty('--game-progress', progressText);
      progressDot?.style.setProperty('--game-progress', progressText);
    }
    const workMs = performance.now() - workStartedAt;
    frameBudget.record(workMs);
    if (lastRenderDecision.render) {
      renderedFrameCount += 1;
      renderFrameBudget.record(workMs);
    }
    updateRenderQuality(workMs, frameMs, 60);
    scheduleFrame();
  }

  function releaseInput() {
    keys.clear();
    interactionInput.blockedMovementKeys.clear();
    interactionInput.movementPulse = null;
    clearTouchMovement();
    state.vx = 0;
    state.isMoving = false;
    if (tiltWalk.enabled) {
      resetTiltWalkCalibration();
    }
  }

  function pauseLoop(realNow = performance.now()) {
    clock.pause(realNow);
    mainLoopScheduler.reset(realNow);
    renderScheduler.reset(clock.now(realNow));
    particleRenderScheduler.reset(clock.now(realNow));
    particleMorphRenderScheduler.reset(clock.now(realNow));
    visualStyleScheduler.reset(clock.now(realNow));
    if (frameRequest) {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
    }
    releaseInput();
    state.lastTime = clock.now(realNow);
  }

  function resumeLoop(realNow = performance.now()) {
    if (motionReduced || document.hidden || root.dataset.links === 'open') {
      return;
    }
    state.lastTime = clock.resume(realNow);
    mainLoopScheduler.reset(realNow);
    renderScheduler.reset(state.lastTime);
    particleRenderScheduler.reset(state.lastTime);
    particleMorphRenderScheduler.reset(state.lastTime);
    visualStyleScheduler.reset(state.lastTime);
    scheduleFrame();
  }

  function syncAtlasInteractivity(open = motionReduced || fallbackRequested) {
    if (!fallback || !stageNode) {
      return;
    }
    const interaction = window.HomeAtlas?.atlasInteractionState?.({
      linksOpen: open,
      inputLocked: root.dataset.atlasInputLocked === 'true',
      entering: livingAtlasController?.isEntering?.(),
    }) || {
      stageInert: open || root.dataset.atlasInputLocked === 'true',
      fallbackInert: !open || root.dataset.atlasInputLocked === 'true',
    };
    stageNode.inert = interaction.stageInert;
    fallback.inert = interaction.fallbackInert;
  }

  function setAtlasInputLocked(locked) {
    if (locked) {
      root.dataset.atlasInputLocked = 'true';
    } else {
      delete root.dataset.atlasInputLocked;
    }
    syncAtlasInteractivity();
  }

  function syncFallbackMode(options = {}) {
    if (!fallback || !stageNode) {
      return;
    }
    const open = motionReduced || fallbackRequested;
    if (open) {
      hydrateMediaEmblems('atlas');
      root.dataset.links = 'open';
      syncAtlasInteractivity(true);
      pauseLoop();
      if (options.focus !== false && !fallback.inert) {
        fallback.focus({ preventScroll: true });
        fallback.scrollIntoView({ block: 'start' });
      }
      return;
    }
    delete root.dataset.links;
    syncAtlasInteractivity(false);
    if (options.focus !== false) {
      root.focus({ preventScroll: true });
    }
    resumeLoop();
  }

  function beginLivingAtlas(options = {}) {
    if (livingAtlasController?.isActive?.() || livingAtlasController?.isEntering?.()) {
      return true;
    }
    const entryModes = {
      walk: 'journey',
      history: 'revisit',
      shortcut: 'revisit',
      query: 'direct',
      fallback: 'direct',
      'static-fallback': 'direct',
    };
    pendingAtlasEntryMode = entryModes[options.cause] || 'unknown';
    livingAtlasVisited = true;
    hydrateMediaEmblems('atlas');
    disableTiltWalk({ announce: false });
    releaseInput();
    setAtlasInputLocked(true);
    if (journeyDiscovery.areaKey) {
      closeJourneyDiscovery({ announce: false, restoreFocus: false });
    }
    if (fishing.phase) {
      cancelFishing({ announce: false, restoreFocus: false });
    }
    announceStatus(uiCopy.transitionEntering);
    if (!options.immediate) {
      audio?.arpeggio(['moss', 'taupe', 'islog', 'ojicra', 'monoomoi', 'monoerabi']);
    }
    const sourceRect = character?.getBoundingClientRect?.();
    if (!livingAtlasController) {
      fallbackRequested = true;
      setAtlasInputLocked(false);
      syncFallbackMode();
      emitJourneySignal('atlas_enter', { entry_mode: pendingAtlasEntryMode });
      return true;
    }
    const entered = livingAtlasController.enter({
      sourceRect,
      immediate: Boolean(options.immediate),
    });
    if (!entered) {
      setAtlasInputLocked(false);
    }
    return entered;
  }

  function maybeBeginLivingAtlasFromWalk(input) {
    const shouldEnter = window.HomeAtlas?.shouldAutoEnterAtlas?.({
      input,
      x: state.x,
      triggerX: LIVING_ATLAS_TRIGGER_X,
      finalized: journeyMemory.finalized,
      visited: livingAtlasVisited,
      reentryEnabled: true,
      active: livingAtlasController?.isActive?.(),
      entering: livingAtlasController?.isEntering?.(),
    });
    if (!shouldEnter) {
      return false;
    }
    state.x = LIVING_ATLAS_TRIGGER_X;
    state.vx = 0;
    return beginLivingAtlas({ cause: 'walk' });
  }

  function openFallbackLinks(event) {
    event?.preventDefault();
    if (livingAtlasController?.isEntering?.() || root.dataset.atlasInputLocked === 'true') {
      return false;
    }
    livingAtlasVisited = true;
    fallbackRequested = true;
    disableTiltWalk({ announce: false });
    if (journeyDiscovery.areaKey) {
      closeJourneyDiscovery({ announce: false });
    }
    if (fishing.phase) {
      cancelFishing({ announce: false, restoreFocus: false });
    }
    livingAtlasController?.openImmediate?.();
    syncFallbackMode();
    emitJourneySignal('atlas_enter', { entry_mode: 'direct' });
    return true;
  }

  function closeFallbackLinks() {
    if (livingAtlasController?.isEntering?.() || root.dataset.atlasInputLocked === 'true') {
      return false;
    }
    livingAtlasController?.close?.();
    fallbackRequested = false;
    setAtlasInputLocked(false);
    syncFallbackMode();
    return true;
  }

  function restartLivingAtlas() {
    if (!livingAtlasController?.beginReturn) {
      closeFallbackLinks();
      return;
    }
    if (!livingAtlasController.beginReturn()) {
      return;
    }
    announceStatus(isEnglish ? 'The constellation comes apart as you return to the worlds you walked.' : '旅の星座がほどけ、歩いてきた世界へ戻ります。');
  }

  function fastForwardCinematic(now = clock.now()) {
    const candidates = [
      journeyTransition.active,
      journeyReturn.active,
      journeySecrets.observatory,
      journeySecrets.ascension,
      journeyAwakening.orchestra,
      journeyAwakening.starDash,
      journeyAwakening.dawn,
      journeyMoment.active,
      journeyAwakening.resonance,
    ];
    const active = candidates.find((candidate) => candidate?.startedAt && candidate?.durationMs);
    if (!active) {
      return false;
    }
    active.startedAt = now - active.durationMs;
    announceStatus(isEnglish ? 'The transition was advanced.' : '演出を早送りしました。');
    return true;
  }

  function onKeyDown(event) {
    if (runtime.keyboardShouldUnlockAudio(event.code, {
      repeat: event.repeat,
      interactiveTarget: runtime.isInteractiveTarget(event.target),
      motionReduced,
    })) {
      unlockAudio();
    }
    if (event.code === 'Escape' && performance.now() < atlasEscapeSkipUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (livingAtlasController?.isEntering?.()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === 'Escape') {
        atlasEscapeSkipUntil = performance.now() + 360;
        livingAtlasController.seekTransition?.(1);
      }
      return;
    }
    if (root.dataset.links === 'open') {
      if (event.code === 'Escape' && !motionReduced) {
        event.preventDefault();
        closeFallbackLinks();
      }
      return;
    }
    if (motionReduced) {
      return;
    }
    if (event.code === 'Escape') {
      if (journeyDiscovery.areaKey) {
        event.preventDefault();
        closeJourneyDiscovery({ restoreFocus: true });
        return;
      }
      if (fishing.phase) {
        event.preventDefault();
        cancelFishing({ restoreFocus: true });
        return;
      }
      if (fastForwardCinematic()) {
        event.preventDefault();
        return;
      }
      if (card?.classList.contains('is-visible')) {
        event.preventDefault();
        hideCard();
      }
      return;
    }

    if (event.code === 'Enter') {
      const articleLink = journeyDiscovery.areaKey
        ? journeyDiscoveryLink
        : focusWorld.fx?.paper?.classList.contains('is-visible')
          ? focusWorld.fx.paperLink
          : null;
      if (runtime.shouldActivateArticleShortcut(
        event.code,
        Boolean(articleLink),
        runtime.isInteractiveTarget(event.target)
      )) {
        event.preventDefault();
        if (!event.repeat) {
          articleLink.click();
        }
        return;
      }
      const mediaSign = readableMediaSign();
      if (runtime.mediaSignShouldOpen?.(event.code, {
        reading: Boolean(mediaSign),
        hasLink: Boolean(mediaSign?.link),
        repeat: event.repeat,
        interactiveTarget: runtime.isInteractiveTarget(event.target),
      })) {
        event.preventDefault();
        mediaSign.link.click();
        announceStatus(isEnglish ? `${mediaSign.name} opened in a new tab.` : `${mediaSign.name}を新しいタブで開きました。`);
        return;
      }
    }

    if (event.code === 'Tab') {
      lockMovementUntilRelease();
      return;
    }

    if (MOVEMENT_CODES.has(event.code)) {
      event.preventDefault();
      if (movementKeyIsBlocked(event.code)) {
        return;
      }
      if (journeyDiscovery.areaKey) {
        closeJourneyDiscovery({ restoreFocus: true });
      }
      if (fishing.phase) {
        cancelFishing({ restoreFocus: true });
      }
      keys.add(event.code);
      acknowledgeIntroMovement(event.code);
      queueMovementPulse(event.code, { repeat: event.repeat, inputMode: 'keyboard' });
      return;
    }

    if (event.code === 'Space' && journeyDiscovery.areaKey) {
      event.preventDefault();
      if (!event.repeat && journeyInteract()) {
        lockMovementUntilRelease();
      }
      return;
    }

    if (event.code === 'Space' && fishing.phase === 'hold') {
      event.preventDefault();
      if (!event.repeat && focusInteract()) {
        lockMovementUntilRelease();
      }
      return;
    }

    if (runtime.isInteractiveTarget(event.target)) {
      return;
    }

    if (event.code === 'Space' || event.code === 'Enter') {
      if (event.repeat) {
        event.preventDefault();
        return;
      }
      if (isJourneyMode && journeyInteract()) {
        event.preventDefault();
        lockMovementUntilRelease();
      } else if (isFocusMode) {
        event.preventDefault();
        if (focusInteract()) {
          lockMovementUntilRelease();
        }
      } else {
        interact();
      }
    }
  }

  function onKeyUp(event) {
    if (motionReduced) {
      return;
    }
    if (MOVEMENT_CODES.has(event.code)) {
      keys.delete(event.code);
      releaseBlockedMovementKey(event.code);
    }
  }

  function jumpTo(key) {
    const area = areaMap.get(key);
    const debugAtlasThreshold = debugEnabled && isJourneyMode && key === 'atlas-threshold';
    if (!area && !debugAtlasThreshold) {
      return;
    }
    finishIntro();
    state.started = true;
    state.x = debugAtlasThreshold ? LIVING_ATLAS_TRIGGER_X - 100 : area.xStart + 180;
    state.visitTrackingSuspended = isJourneyMode && state.x > state.maxVisitedX + 90;
    state.vx = 0;
    state.direction = 1;
    if (debugAtlasThreshold) {
      journeyMemory.finalized = true;
      journeyMemory.finalizedAt = clock.now();
      root.dataset.journeyFinalized = 'true';
    }
    state.cameraX = Math.max(0, Math.min(WORLD_LENGTH - state.visibleW, state.x - state.visibleW * 0.42));
    state.cameraY = Math.max(-85, Math.min(85, terrainY(state.x) - 710));
    if (area) {
      showCard(area);
    }
  }

  function bindInteractionEvents() {
    window.addEventListener('resize', queueResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseInput);
    window.addEventListener('pagehide', () => {
      pauseLoop();
      pausePerformanceHud();
    });
    window.addEventListener('pageshow', () => {
      resumeLoop();
      resumePerformanceHud();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (articleReturn.key) {
          articleReturn.hiddenAt = Date.now();
        }
        if (tiltWalk.enabled) {
          resetTiltWalkCalibration();
        }
        pauseLoop();
      } else {
        resumeLoop();
        if (articleReturn.key && articleReturn.hiddenAt) {
          requestAnimationFrame(emitArticleReturnBloom);
        }
      }
    });
    motionQuery.addEventListener('change', (event) => {
      motionReduced = event.matches;
      root.dataset.motion = motionReduced ? 'reduced' : 'full';
      if (motionReduced && fishing.phase) {
        cancelFishing({ announce: false, restoreFocus: false });
      }
      if (motionReduced && journeyDiscovery.areaKey) {
        closeJourneyDiscovery({ announce: false, restoreFocus: false });
      }
      if (motionReduced) {
        disableTiltWalk({ announce: false });
      }
      syncFallbackMode();
    });
    touchControlsQuery.addEventListener('change', () => {
      syncTouchControlsMode();
      if (root.dataset.touchControls !== 'true') {
        disableTiltWalk({ announce: false });
      } else {
        syncTiltWalkButton();
      }
      syncJourneyDiscoveryControlCopy();
      if (journeyDiscovery.areaKey) {
        syncArticleLinkAccessibility(journeyDiscoveryLink, journeyDiscoveryTitle.textContent || (isEnglish ? 'article' : '記事'));
      }
      if (focusWorld.fx?.paper?.classList.contains('is-visible')) {
        syncArticleLinkAccessibility(focusWorld.fx.paperLink, focusWorld.fx.paperTitle.textContent || (isEnglish ? 'article' : '記事'));
      }
      releaseInput();
      syncTouchActionState();
      announceStatus(walkingStatus());
    });
    tiltWalkButton?.addEventListener('click', toggleTiltWalk);
    window.addEventListener('orientationchange', queueTiltWalkCalibration, { passive: true });
    window.screen?.orientation?.addEventListener?.('change', queueTiltWalkCalibration);
    touchMovementButtons.forEach((button) => {
      button.addEventListener('pointerdown', beginTouchMovement);
      button.addEventListener('pointerup', releaseTouchMovement);
      button.addEventListener('pointercancel', releaseTouchMovement);
      button.addEventListener('lostpointercapture', releaseTouchMovement);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    });
    touchActionButton?.addEventListener('click', activateTouchAction);
    skipLink?.addEventListener('click', openFallbackLinks);
    closeLinksButtons.forEach((button) => {
      button.addEventListener('click', button === atlasRestartButton ? restartLivingAtlas : closeFallbackLinks);
    });
    soundButton?.addEventListener('click', toggleAudio);
    keepsakeButton?.addEventListener('click', exportJourneyKeepsake);
    journeyDiscoveryLink?.addEventListener('click', () => {
      noteArticleOpen(journeyDiscovery.areaKey || journeyDiscoveryNode.dataset.world);
    });
    focusWorld.fx?.paperLink?.addEventListener('click', () => noteArticleOpen('moss'));
    map?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-jump]');
      if (button) {
        jumpTo(button.dataset.jump);
      }
    });
  }

  function dotCanvasBandSnapshot() {
    const bands = {};
    let memoryBytes = 0;
    dotCanvasBandList.forEach((band) => {
      const id = band === dotCanvasBands.far ? 'far' : 'near';
      const canvasBytes = (band.canvas?.width || 0) * (band.canvas?.height || 0) * 4;
      memoryBytes += canvasBytes;
      bands[id] = {
        parallax: Number(band.representativeParallax.toFixed(3)),
        offsetX: Number(band.offsetX.toFixed(2)),
        offsetY: Number(band.offsetY.toFixed(2)),
        width: band.canvas?.width || 0,
        height: band.canvas?.height || 0,
      };
    });
    return {
      bands,
      memoryMb: Number((memoryBytes / 1048576).toFixed(2)),
    };
  }

  function performanceSnapshot() {
    const budget = frameBudget.snapshot();
    const renderFrame = renderFrameBudget.snapshot();
    const cadence = frameCadence.snapshot();
    const quality = qualityController.snapshot();
    const phases = Object.fromEntries(
      Object.entries(renderPhases.snapshot()).map(([id, stats]) => [id, {
        averageMs: Number(stats.averageMs.toFixed(2)),
        p95Ms: Number(stats.p95Ms.toFixed(2)),
        maxMs: Number(stats.maxMs.toFixed(2)),
      }])
    );
    return {
      sampleCount: budget.sampleCount,
      averageMs: Number(budget.averageMs.toFixed(2)),
      p95Ms: Number(budget.p95Ms.toFixed(2)),
      p99Ms: Number(budget.p99Ms.toFixed(2)),
      maxMs: Number(budget.maxMs.toFixed(2)),
      overBudget: budget.overBudget,
      budgetMs: budget.budgetMs,
      renderFrameSampleCount: renderFrame.sampleCount,
      renderFrameAverageMs: Number(renderFrame.averageMs.toFixed(2)),
      renderFrameP95Ms: Number(renderFrame.p95Ms.toFixed(2)),
      renderFrameMaxMs: Number(renderFrame.maxMs.toFixed(2)),
      quality: quality.mode,
      qualityAverageMs: Number(quality.averageMs.toFixed(2)),
      movingDotScale: Number(renderQuality.movingDotScale.toFixed(3)),
      renderActivity: lastRenderDecision.activity,
      targetFps: lastRenderDecision.targetFps,
      frameIntervalAverageMs: Number(cadence.averageMs.toFixed(2)),
      frameIntervalP95Ms: Number(cadence.p95Ms.toFixed(2)),
      frameIntervalMaxMs: Number(cadence.maxMs.toFixed(2)),
      renderRatio: processedFrameCount
        ? Number((renderedFrameCount / processedFrameCount).toFixed(3))
        : 1,
      canvasAllocations: { ...canvasAllocationStats },
      dotCanvasBands: dotCanvasBandSnapshot(),
      effectIds: animationEffects.ids(),
      motionKinds: dotMotion.kinds().length,
      phases,
    };
  }

  let performanceHudSnapshot = null;
  let performanceHudTimer = 0;
  let performanceHudDraw = null;

  function pausePerformanceHud() {
    if (performanceHudTimer) {
      window.clearInterval(performanceHudTimer);
      performanceHudTimer = 0;
    }
  }

  function resumePerformanceHud() {
    if (!performanceHudEnabled || !performanceHudDraw || performanceHudTimer) {
      return;
    }
    performanceHudDraw();
    performanceHudTimer = window.setInterval(performanceHudDraw, 1000);
  }

  function setupPerformanceHud() {
    if (!performanceHudEnabled || document.querySelector('[data-performance-hud]')) {
      return;
    }
    const hud = document.createElement('aside');
    hud.className = 'performance-hud';
    hud.dataset.performanceHud = 'active';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = `
      <div class="performance-hud__title">PERF / 1Hz</div>
      <canvas class="performance-hud__graph" width="180" height="46"></canvas>
      <pre class="performance-hud__values"></pre>
    `;
    root.appendChild(hud);
    root.dataset.performanceHud = 'active';
    const graph = hud.querySelector('.performance-hud__graph');
    const graphCtx = graph?.getContext('2d');
    const values = hud.querySelector('.performance-hud__values');
    const history = [];
    const draw = () => {
      if (document.hidden) {
        return;
      }
      const stats = performanceSnapshot();
      const heapBytes = performance.memory?.usedJSHeapSize || 0;
      const heapMb = heapBytes ? heapBytes / 1048576 : null;
      history.push(stats.frameIntervalP95Ms);
      if (history.length > 60) {
        history.shift();
      }
      performanceHudSnapshot = {
        sampledAt: performance.now(),
        stage: root.dataset.stage || '',
        frameIntervalP95Ms: stats.frameIntervalP95Ms,
        jsP95Ms: stats.p95Ms,
        renderFrameP95Ms: stats.renderFrameP95Ms,
        quality: stats.quality,
        heapMb: heapMb === null ? null : Number(heapMb.toFixed(1)),
        canvasAllocationsWhileMoving: stats.canvasAllocations.whileMoving,
        farParallax: stats.dotCanvasBands.bands.far.parallax,
        nearParallax: stats.dotCanvasBands.bands.near.parallax,
      };
      values.textContent = [
        `${performanceHudSnapshot.stage || 'intro'} / ${stats.quality}`,
        `frame p95  ${stats.frameIntervalP95Ms.toFixed(1)} ms`,
        `js p95     ${stats.p95Ms.toFixed(1)} ms`,
        `render p95 ${stats.renderFrameP95Ms.toFixed(1)} ms`,
        `heap       ${heapMb === null ? '--' : heapMb.toFixed(1)} MB`,
        `realloc/m  ${stats.canvasAllocations.whileMoving}`,
        `bands      ${performanceHudSnapshot.farParallax.toFixed(2)} / ${performanceHudSnapshot.nearParallax.toFixed(2)}`,
      ].join('\n');
      if (!graphCtx) {
        return;
      }
      const width = graph.width;
      const height = graph.height;
      const maxMs = 40;
      graphCtx.clearRect(0, 0, width, height);
      graphCtx.strokeStyle = 'rgba(207, 166, 84, 0.48)';
      graphCtx.lineWidth = 1;
      const budgetY = height - (16.67 / maxMs) * height;
      graphCtx.beginPath();
      graphCtx.moveTo(0, budgetY);
      graphCtx.lineTo(width, budgetY);
      graphCtx.stroke();
      graphCtx.strokeStyle = stats.frameIntervalP95Ms > 17
        ? 'rgba(229, 116, 139, 0.94)'
        : 'rgba(111, 196, 190, 0.94)';
      graphCtx.beginPath();
      history.forEach((value, index) => {
        const x = history.length <= 1 ? width : index * (width / (history.length - 1));
        const y = height - clamp(value / maxMs, 0, 1) * height;
        if (index === 0) {
          graphCtx.moveTo(x, y);
        } else {
          graphCtx.lineTo(x, y);
        }
      });
      graphCtx.stroke();
    };
    performanceHudDraw = draw;
    resumePerformanceHud();
  }

  function clearAtlasHistorySnapshot() {
    const historyKey = window.HomeAtlas?.ATLAS_HISTORY_KEY || 'ishikawaAtlas';
    const currentState = window.history.state;
    if (!currentState || typeof currentState !== 'object' || !(historyKey in currentState)) {
      return;
    }
    const nextState = { ...currentState };
    delete nextState[historyKey];
    try {
      window.history.replaceState(nextState, '', window.location.href);
    } catch (_error) {
      // Reload still falls back to ACT I when history state cannot be rewritten.
    }
  }

  function restoreAtlasFromHistory(options = {}) {
    const historyKey = window.HomeAtlas?.ATLAS_HISTORY_KEY || 'ishikawaAtlas';
    const snapshot = window.history.state?.[historyKey];
    if (!snapshot?.active) {
      return false;
    }
    if (
      options.allowReload !== true
      && runtime.pageNavigationType?.(window.performance) === 'reload'
    ) {
      clearAtlasHistorySnapshot();
      return false;
    }
    if (!livingAtlasController) {
      pendingInitialAtlasOpen = true;
      ensureLivingAtlasRuntime();
      return true;
    }
    beginLivingAtlas({ immediate: true, cause: 'history' });
    window.requestAnimationFrame(() => livingAtlasController?.restorePosition?.(snapshot));
    return true;
  }

  function clearAtlasQuery() {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('atlas') !== '1') {
      return;
    }
    const currentState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {};
    currentUrl.searchParams.delete('atlas');
    window.history.replaceState(
      currentState,
      '',
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );
  }

  function openAtlasFromQuery() {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('atlas') !== '1') {
      return false;
    }
    if (!livingAtlasController) {
      pendingInitialAtlasOpen = true;
      ensureLivingAtlasRuntime();
      return true;
    }
    beginLivingAtlas({ immediate: true, cause: 'query' });
    clearAtlasQuery();
    return true;
  }

  function initializeLivingAtlasController() {
    if (livingAtlasController || !window.HomeAtlas?.createController) {
      return livingAtlasController;
    }
    livingAtlasController = window.HomeAtlas.createController({
      root,
      fallback,
      characterAssets: config.assets?.character || {},
      motionReduced,
      onCommit: ({ immediate = false } = {}) => {
        fallbackRequested = true;
        syncFallbackMode({ focus: false });
        if (!immediate) {
          audio?.note('hub', {
            duration: 1.18,
            gain: 0.026,
            fromFrequency: 392,
            toFrequency: 659.25,
          });
        }
      },
      onComplete: () => {
        setAtlasInputLocked(false);
        emitJourneySignal('atlas_enter', { entry_mode: pendingAtlasEntryMode });
        pendingAtlasEntryMode = 'unknown';
        const atlasHeading = fallback?.querySelector('h1');
        if (atlasHeading) {
          atlasHeading.focus({ preventScroll: true });
        } else {
          fallback?.focus({ preventScroll: true });
        }
        announceStatus(isEnglish ? 'The Living Atlas is open. Scroll to explore the work.' : 'Living Atlasを開きました。スクロールで活動をめぐれます。');
      },
      onCancel: () => {
        fallbackRequested = false;
        setAtlasInputLocked(false);
        syncFallbackMode({ focus: false });
      },
      onScrollCueNudge: () => {
        announceStatus(isEnglish ? 'From here, scroll down to explore the work.' : 'ここからは、下へスクロールして活動をめぐります。');
      },
      onChapterChange: ({ section } = {}) => {
        const notes = {
          media: 'islog',
          projects: 'taupe',
          person: 'monoomoi',
          services: 'moss',
          footer: 'hub',
        };
        const note = notes[section];
        if (note) {
          audio?.note(note, { duration: 0.54, gain: 0.016, waveform: 'sine' });
        }
      },
      onReturnStart: () => {
        audio?.arpeggio(['moss', 'taupe', 'islog', 'ojicra', 'monoomoi', 'monoerabi'], { reverse: true });
      },
      onReturnComplete: () => {
        closeFallbackLinks();
        announceStatus(isEnglish ? `You returned to the worlds you walked. ${walkingStatus()}` : `歩いてきた世界へ戻りました。${walkingStatus()}`);
      },
      getJourneySnapshot: livingAtlasJourneySnapshot,
      onJourneyKeepsake: exportJourneyKeepsake,
      onShortcut: () => beginLivingAtlas({ cause: 'shortcut' }),
    }) || null;
    if (!livingAtlasController) {
      return null;
    }
    syncAtlasInteractivity();
    if (fallbackRequested) {
      livingAtlasController.openImmediate?.();
    }
    if (pendingInitialAtlasOpen) {
      pendingInitialAtlasOpen = false;
      if (!restoreAtlasFromHistory()) {
        openAtlasFromQuery();
      }
    }
    return livingAtlasController;
  }

  function ensureLivingAtlasRuntime() {
    if (window.HomeAtlas) {
      initializeLivingAtlasController();
      return Promise.resolve(window.HomeAtlas);
    }
    if (livingAtlasLoadPromise) {
      return livingAtlasLoadPromise;
    }
    const source = config.assets?.scripts?.atlas;
    if (!source) {
      root.dataset.atlasRuntime = 'unavailable';
      if (pendingInitialAtlasOpen) {
        pendingInitialAtlasOpen = false;
        beginLivingAtlas({ immediate: true, cause: 'static-fallback' });
        clearAtlasQuery();
      }
      return Promise.resolve(null);
    }
    root.dataset.atlasRuntime = 'loading';
    livingAtlasLoadPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = true;
      script.dataset.homeAtlasRuntime = 'true';
      script.addEventListener('load', () => {
        root.dataset.atlasRuntime = 'ready';
        initializeLivingAtlasController();
        resolve(window.HomeAtlas || null);
      }, { once: true });
      script.addEventListener('error', () => {
        root.dataset.atlasRuntime = 'failed';
        if (pendingInitialAtlasOpen) {
          pendingInitialAtlasOpen = false;
          beginLivingAtlas({ immediate: true, cause: 'static-fallback' });
          clearAtlasQuery();
        }
        resolve(null);
      }, { once: true });
      document.head.appendChild(script);
    });
    return livingAtlasLoadPromise;
  }

  if (debugEnabled) {
    window.__homeGame = {
      state,
      fishing,
      particles,
      particleBurstState,
      particleConfig: PARTICLE_CONFIG,
      particleEffects: PARTICLE_EFFECTS,
      particleStats() {
        const shapeCounts = particles.reduce((counts, particle) => {
          if (particle.shapeLanguage) {
            const shape = resolveVocabularyShape(
              particle.shapeWorld,
              particle.shapeSample,
              particle.type,
              particle.hubNear
            );
            counts[shape] = (counts[shape] || 0) + 1;
          }
          return counts;
        }, {});
        return {
          count: particles.length,
          maxCount: PARTICLE_CONFIG.maxCount,
          effectiveMaxCount: Math.max(260, Math.round(PARTICLE_CONFIG.maxCount * renderQuality.particleScale)),
          dotScale: renderQuality.dotScale,
          quality: renderQuality.mode,
          frameAverage: Number(renderQuality.frameAverage.toFixed(2)),
          stage: root.dataset.stage,
          particlesMode: root.dataset.particles,
          flash: root.dataset.particleFlash || '',
          shake: root.dataset.screenShake || '',
          catchTextCount: particleBurstState.catchTextCount,
          titleFormCount: particleBurstState.lastTitleFormCount,
          activeTitleFormations: particles.filter((particle) => particle.textLockAfter > 0).length,
          articleLandingCount: particles.filter(
            (particle) => particle.effectScope === ARTICLE_LANDING_PARTICLE_SCOPE
          ).length,
          shapeWorld: root.dataset.particleWorld || 'moss',
          shape: root.dataset.particleShape || 'dot',
          shapeMorph: root.dataset.particleShapeMorph || '',
          shapeMorphSerial: particleLanguage.serial,
          shapeMorphAt: particleLanguage.lastMorphAt,
          transformedCount: particleLanguage.transformedCount,
          shapeCounts,
          pool: {
            size: particlePool.length,
            queueLength: particleSpawnQueue.length,
            ...particleRuntimeStats,
          },
        };
      },
      paperTearStats() {
        return {
          activeCount: particles.filter((particle) => particle.type === 'paper-fragment').length,
          lastAt: particleBurstState.lastPaperTearAt,
          lastType: particleBurstState.lastPaperTearType,
          lastCount: particleBurstState.lastPaperTearCount,
          quality: renderQuality.mode,
        };
      },
      kintsugiStats() {
        return {
          mode: 'world-memory-color',
          startX: KINTSUGI_START_X,
          maxVisitedX: Number(state.maxVisitedX.toFixed(1)),
          distance: Math.max(0, Math.round(state.maxVisitedX - KINTSUGI_START_X)),
          trackingSuspended: state.visitTrackingSuspended,
          direction: root.dataset.trailDirection || 'forward',
          activeMotes: particles.filter((particle) => particle.type === 'kintsugi-mote').length,
          lastMoteAt: particleBurstState.lastKintsugiMote,
        };
      },
      worldCursorStats() {
        return {
          enabled: root.dataset.worldCursor === 'active',
          visible: root.dataset.cursorVisible === 'true',
          world: worldCursorState.node?.dataset.world || '',
          interactive: worldCursorState.node?.dataset.interactive === 'true',
        };
      },
      tiltWalkStats() {
        return {
          supported: tiltWalk.supported,
          enabled: tiltWalk.enabled,
          permission: tiltWalk.permission,
          calibrated: tiltWalk.baseline !== null,
          coaching: tiltWalk.coaching,
          input: Number(tiltWalk.input.toFixed(3)),
          blockedUntilNeutral: tiltWalk.blockedUntilNeutral,
          orientationAngle: tiltOrientationAngle(),
        };
      },
      performanceStats() {
        return performanceSnapshot();
      },
      performanceHudStats() {
        return performanceHudSnapshot ? { ...performanceHudSnapshot } : null;
      },
      livingAtlasStats() {
        return {
          active: Boolean(livingAtlasController?.isActive?.()),
          entering: Boolean(livingAtlasController?.isEntering?.()),
          unlocked: Boolean(livingAtlasController?.isUnlocked?.()),
          transition: livingAtlasController?.transitionStats?.() || null,
          runtime: livingAtlasController?.runtimeStats?.() || null,
          phase: root.dataset.atlasTransitionPhase || null,
        };
      },
      previewLivingAtlas() {
        if (livingAtlasController?.isActive?.()) {
          closeFallbackLinks();
        }
        return beginLivingAtlas();
      },
      seekLivingAtlas(progress = 0) {
        return livingAtlasController?.seekTransition?.(progress) || false;
      },
      previewLivingAtlasProgress(progress = 0, sourceRect = null) {
        if (!livingAtlasController) {
          return false;
        }
        if (livingAtlasController.isActive?.()) {
          livingAtlasController.close?.();
          fallbackRequested = false;
          syncFallbackMode({ focus: false });
        }
        if (!livingAtlasController.isEntering?.()) {
          livingAtlasVisited = true;
          releaseInput();
          livingAtlasController.enter({
            sourceRect: sourceRect || character?.getBoundingClientRect?.(),
          });
        }
        return livingAtlasController.seekTransition?.(progress) || false;
      },
      dotCanvasBandStats() {
        return dotCanvasBandSnapshot();
      },
      resetPerformanceStats() {
        frameBudget.reset();
        renderFrameBudget.reset();
        frameCadence.reset();
        renderPhases.reset();
        renderedFrameCount = 0;
        processedFrameCount = 0;
        canvasAllocationStats.total = 0;
        canvasAllocationStats.whileMoving = 0;
        Object.keys(particleRuntimeStats).forEach((key) => {
          if (key === 'preallocated') {
            return;
          }
          particleRuntimeStats[key] = 0;
        });
      },
      setQuality(mode) {
        return qualityController.setMode(mode);
      },
      mossWeatherStats() {
        const waterDots = dotWorld.dots.filter((dot) => dot.kind === 'water');
        return {
          rainIntensity: Number(runtime.mossRainIntensity(state.x).toFixed(3)),
          lakeFill: Number(runtime.mossLakeFill(state.x).toFixed(3)),
          rainMode: root.dataset.mossRain || null,
          rainParticles: particles.filter((particle) => particle.type === 'moss-rain').length,
          splashParticles: particles.filter((particle) => (
            particle.type === 'moss-rain-splash' || particle.type === 'water-spray'
          )).length,
          waterDots: waterDots.length,
          reflectionDots: dotWorld.reflectionCount,
          firstWaterX: waterDots.length ? Math.min(...waterDots.map((dot) => dot.x)) : null,
        };
      },
      fishingZoneStats() {
        return {
          start: focusWorld.fishZoneStart,
          end: focusWorld.fishZoneEnd,
          pierEnd: focusWorld.pierEnd,
          bobberOffset: focusWorld.bobberOffset,
          waterClearance: focusWorld.waterClearance,
          canFish: canFishHere(),
          playerX: Number(state.x.toFixed(1)),
          projectedBobberX: Number((state.x + focusWorld.bobberOffset).toFixed(1)),
        };
      },
      dotWorldStats() {
        return {
          count: dotWorld.dots.length,
          visibleCount: dotWorld.visibleCount,
          reflectionCount: dotWorld.reflectionCount,
          logoCount: dotWorld.logoCount,
          activeCount: activeWorldDots().length,
          cloudCount: dotWorld.cloudDots.length,
          dataRainCount: dotWorld.dots.filter((dot) => dot.kind === 'data-rain').length,
          bucketCount: dotWorld.buckets.size,
          colorCount: dotWorld.colors.size,
          mode: root.dataset.dotWorld || '',
          shapeWorld: root.dataset.particleWorld || 'moss',
          shape: root.dataset.particleShape || 'dot',
          shapeMorph: root.dataset.particleShapeMorph || '',
        };
      },
      circuitSignalStats() {
        const signals = dotWorld.dots.filter((dot) => dot.kind === 'circuit-signal');
        const dataRain = dotWorld.dots.filter((dot) => dot.kind === 'data-rain');
        return {
          count: signals.length,
          dataRain: dataRain.length,
          forward: signals.filter((dot) => dot.routeSpeed > 0).length,
          reverse: signals.filter((dot) => dot.routeSpeed < 0).length,
          sample: signals.slice(0, 6).map((dot) => ({
            x: Number((dot.routePoint?.x ?? dot.x).toFixed(1)),
            y: Number((dot.routePoint?.y ?? dot.y).toFixed(1)),
            speed: Number(dot.routeSpeed.toFixed(1)),
            tail: dot.signalTail,
          })),
        };
      },
      characterRestStats() {
        const idleForMs = Math.max(0, clock.now() - state.lastMovementAt);
        return {
          idleForMs: Math.round(idleForMs),
          expected: runtime.idleRestPose(idleForMs, {
            sitAfterMs: IDLE_SIT_AFTER_MS,
            chillAfterMs: IDLE_CHILL_AFTER_MS,
          }),
          pose: character.dataset.pose || '',
          rest: character.dataset.rest || '',
          moving: state.isMoving,
        };
      },
      previewCharacterRest(elapsedMs = IDLE_SIT_AFTER_MS + 500) {
        finishIntro();
        state.started = true;
        state.vx = 0;
        state.isMoving = false;
        state.wasMoving = false;
        state.frameElapsed = 0;
        state.lastMovementAt = clock.now() - Math.max(0, Number(elapsedMs) || 0);
        return this.characterRestStats();
      },
      introStats() {
        return {
          complete: intro.complete,
          progress: Number(introProgress(clock.now()).toFixed(3)),
          logoProgress: Number(clamp(
            (clock.now() - intro.startedAt) / INTRO_LOGO_REVEAL_MS,
            0,
            1
          ).toFixed(3)),
          logoGather: Number(introLogoGatherProgress(clock.now()).toFixed(3)),
          logoPoints: intro.logoPoints.length,
          identityPoints: intro.identityPoints.length,
          assetsReady: intro.assetsReady,
          loadTimedOut: intro.loadTimedOut,
          seedProgress: Number(introSeedProgress(clock.now()).toFixed(3)),
          groundProgress: Number(introGroundProgress(clock.now()).toFixed(3)),
          characterProgress: Number(introCharacterProgress(clock.now()).toFixed(3)),
          phase: intro.phase,
          mode: root.dataset.intro || '',
        };
      },
      articleMemoryStats() {
        return {
          seedCount: articleMemoryVisual.seedCount,
          returnBloomCount: articleMemoryVisual.returnBloomCount,
          lastReturnBloomAt: articleMemoryVisual.lastReturnBloomAt,
        };
      },
      passingTravelerStats() {
        return {
          present: Boolean(passingTraveler.node),
          active: passingTraveler.active,
          flow: passingTraveler.node?.dataset.flow || '',
          direction: passingTraveler.direction,
          x: Number(passingTraveler.x.toFixed(1)),
          speed: Number(passingTraveler.speed.toFixed(3)),
          stage: passingTraveler.stage,
          appearances: passingTraveler.appearances,
          nextInMs: Math.max(0, Math.round(passingTraveler.nextAt - clock.now())),
        };
      },
      previewPassingTraveler(direction = 1) {
        finishIntro();
        state.started = true;
        if (passingTraveler.active) {
          stopPassingTraveler(clock.now());
        }
        passingTraveler.nextAt = clock.now();
        return startPassingTraveler(clock.now(), Number(direction) < 0 ? -1 : 1)
          ? this.passingTravelerStats()
          : null;
      },
      previewIntro(elapsedMs = 860) {
        state.started = false;
        state.x = 560;
        state.y = terrainY(state.x);
        state.vx = 0;
        state.isMoving = false;
        state.wasMoving = false;
        state.lastMovementAt = clock.now();
        state.frameElapsed = 0;
        state.cameraX = 0;
        state.cameraY = 0;
        state.maxVisitedX = KINTSUGI_START_X;
        state.visitTrackingSuspended = false;
        intro.complete = false;
        intro.phase = '';
        intro.assetsReady = true;
        intro.loadTimedOut = false;
        intro.logoReleaseAt = clock.now() - INTRO_LOGO_GATHER_MS;
        intro.seedStartedAt = clock.now() - clamp(Number(elapsedMs) || 0, 0, INTRO_DURATION_MS - 1);
        intro.startedAt = intro.logoReleaseAt - INTRO_LOGO_MIN_MS;
        root.dataset.intro = 'active';
        root.dataset.introLoad = 'ready';
        syncIntroPhase(clock.now());
        return this.introStats();
      },
      previewIntroLogo(revealProgress = 1, gatherProgress = 0) {
        state.started = false;
        state.x = 560;
        state.y = terrainY(state.x);
        state.vx = 0;
        state.isMoving = false;
        state.wasMoving = false;
        state.cameraX = 0;
        state.cameraY = 0;
        intro.complete = false;
        intro.assetsReady = gatherProgress > 0;
        intro.loadTimedOut = false;
        intro.seedStartedAt = 0;
        intro.startedAt = clock.now()
          - clamp(Number(revealProgress) || 0, 0, 1) * INTRO_LOGO_REVEAL_MS;
        intro.logoReleaseAt = gatherProgress > 0
          ? clock.now() - clamp(Number(gatherProgress) || 0, 0, 0.98) * INTRO_LOGO_GATHER_MS
          : 0;
        if (intro.logoReleaseAt) {
          intro.seedStartedAt = intro.logoReleaseAt + INTRO_LOGO_GATHER_MS;
        }
        root.dataset.intro = 'active';
        root.dataset.introLoad = intro.logoReleaseAt ? 'ready' : 'loading';
        syncIntroPhase(clock.now());
        return this.introStats();
      },
      audioStats() {
        return audio?.stats() || { supported: false };
      },
      warp(x) {
        journeyTransition.active = null;
        journeyMoment.active = null;
        closeJourneyDiscovery();
        journeyDiscovery.returningKey = '';
        journeyDiscovery.closedAtTime = 0;
        journeyEcho.active = null;
        journeyLanding.active = null;
        journeyReturn.active = null;
        journeyAwakening.dawn = null;
        journeyAwakening.resonance = null;
        journeyAwakening.starDash = null;
        journeyAwakening.starDashCooldownUntil = 0;
        journeyAwakening.orchestra = null;
        journeySecrets.active = null;
        journeySecrets.nearbyId = '';
        journeySecrets.captureSince = 0;
        journeySecrets.observatory = null;
        journeySecrets.observatoryReadyAt = 0;
        journeySecrets.ascension = null;
        journeySecrets.ascensionReadyAt = 0;
        journeyMemory.idleSince = 0;
        journeyMemory.idleBloomed = false;
        journeyMemory.replayStartedAt = 0;
        journeyMemory.portalReady = false;
        journeyMemory.portalReadyAt = 0;
        journeyMotion.heldDirection = 0;
        journeyMotion.heldSince = 0;
        journeyMotion.charge = 0;
        delete root.dataset.cinematic;
        delete root.dataset.cinematicDirection;
        delete root.dataset.cinematicPhase;
        delete root.dataset.particleShapeMorph;
        delete root.dataset.journeyMoment;
        delete root.dataset.journeyEcho;
        delete root.dataset.memoryIdle;
        delete root.dataset.memoryReplay;
        delete root.dataset.memoryPortal;
        delete root.dataset.memoryReturn;
        delete root.dataset.memoryReturnPhase;
        delete root.dataset.journeyLanding;
        delete root.dataset.timeFlow;
        delete root.dataset.memoryDawn;
        delete root.dataset.memoryResonance;
        delete root.dataset.starDash;
        delete root.dataset.worldOrchestra;
        delete root.dataset.worldOrchestraPhase;
        delete root.dataset.echoGuide;
        delete root.dataset.worldFold;
        delete root.dataset.worldFoldPhase;
        delete root.dataset.secretWell;
        delete root.dataset.secretObservatory;
        delete root.dataset.secretObservatoryPhase;
        delete root.dataset.secretAscension;
        delete root.dataset.secretAscensionPhase;
        clearPocketWorldPosition();
        finishIntro();
        state.started = true;
        state.x = Math.max(160, Math.min(
          isJourneyMode ? WORLD_LENGTH - 300 : isFocusMode ? focusWorld.pierEnd : WORLD_LENGTH - 420,
          x
        ));
        state.visitTrackingSuspended = isJourneyMode && state.x > state.maxVisitedX + 90;
        state.vx = 0;
        state.isMoving = false;
        state.wasMoving = false;
        state.lastMovementAt = clock.now();
        state.frameElapsed = 0;
        state.cameraX = Math.max(0, Math.min(WORLD_LENGTH - state.visibleW, state.x - state.visibleW * 0.42));
        state.cameraY = isJourneyMode
          ? Math.max(-520, Math.min(520, terrainY(state.x) - 710))
          : Math.max(-85, Math.min(85, terrainY(state.x) - 710));
        state.journeyStage = isJourneyMode ? journey.stageAt(state.x) : focusStage(state.x);
        setStage(state.journeyStage);
        help?.classList.add('is-muted');
        startHint?.classList.add('is-hidden');
      },
      cast() {
        focusInteract();
      },
      journey: isJourneyMode ? {
        worldLength: WORLD_LENGTH,
        stageAt: journey.stageAt,
        visualAt: journey.visualAt,
        transitionStats() {
          return {
            active: journeyTransition.active?.id || null,
            phase: root.dataset.cinematicPhase || null,
            shapeFromWorld: journeyTransition.active?.shapeFromWorld || null,
            shapeToWorld: journeyTransition.active?.shapeToWorld || null,
            shapeWorld: journeyTransition.active?.shapeWorld || root.dataset.particleWorld || null,
            shapeMorphAt: journeyTransition.active?.shapeBurstAt || particleLanguage.lastMorphAt || 0,
            completed: Array.from(journeyTransition.completed),
          };
        },
        resetTransitions() {
          journeyTransition.active = null;
          journeyTransition.completed.clear();
          journeyLanding.active = null;
          delete root.dataset.cinematic;
          delete root.dataset.cinematicDirection;
          delete root.dataset.cinematicPhase;
          delete root.dataset.particleShapeMorph;
          delete root.dataset.journeyLanding;
          syncParticleLanguageDataset(state.journeyStage || journey.stageAt(state.x));
        },
        previewTransition(id = 'drop-to-taupe', direction = 1) {
          const definition = journey.transitions.find((item) => item.id === id);
          if (!definition) {
            return null;
          }
          this.resetTransitions();
          if (direction < 0) {
            journeyTransition.completed.add(definition.id);
          }
          window.__homeGame.warp(direction < 0 ? definition.toX : definition.triggerX);
          beginJourneyTransition(definition, clock.now(), direction < 0 ? -1 : 1);
          return this.transitionStats();
        },
        previewKintsugi(maxX = state.x) {
          state.maxVisitedX = clamp(
            Number(maxX) || KINTSUGI_START_X,
            KINTSUGI_START_X,
            WORLD_LENGTH - 300
          );
          state.visitTrackingSuspended = false;
          return window.__homeGame.kintsugiStats();
        },
        momentStats() {
          return {
            active: journeyMoment.active?.id || null,
            type: root.dataset.journeyMoment || null,
            completed: Array.from(journeyMoment.completed),
            formations: particles.filter((particle) => particle.targetX !== undefined).length,
          };
        },
        resetMoments() {
          journeyMoment.active = null;
          journeyMoment.completed.clear();
          journeyMoment.completedAt.clear();
          journeyMoment.completedX.clear();
          journeyAwakening.resonance = null;
          journeyAwakening.orchestra = null;
          delete root.dataset.journeyMoment;
          delete root.dataset.memoryResonance;
          delete root.dataset.worldOrchestra;
          delete root.dataset.worldOrchestraPhase;
        },
        previewMoment(type = 'creeper') {
          const definition = journey.moments.find((item) => item.type === type);
          if (!definition) {
            return null;
          }
          this.resetMoments();
          window.__homeGame.warp(definition.triggerX - 40);
          beginJourneyMoment(definition, clock.now());
          return this.momentStats();
        },
        previewDiscovery(key = 'taupe', articleIndex = 0) {
          const area = areaMap.get(key);
          const moment = journey.moments.find((item) => item.stage === key);
          if (!area || !moment || ['moss', 'hub'].includes(key)) {
            return null;
          }

          const articles = area.articles?.length
            ? area.articles
            : [{ title: isEnglish ? `Visit ${area.name}` : `${area.name}を見にいく`, url: area.url }];
          const index = clamp(Math.floor(Number(articleIndex) || 0), 0, articles.length - 1);
          window.__homeGame.warp(moment.triggerX + 240);
          journeyMoment.completed.add(moment.id);
          journeyMoment.completedAt.set(moment.id, clock.now() - 1000);
          journeyMoment.completedX.set(moment.id, state.x);
          journeyDiscovery.indexes.set(key, index - 1);
          showJourneyDiscovery(area, moment);
          return {
            key,
            index,
            image: articles[index]?.image || '',
          };
        },
        memoryStats() {
          return {
            collected: Array.from(journeyMemory.collected),
            finalized: journeyMemory.finalized,
            complete: journeyMemory.complete,
            completionBurstDone: journeyMemory.completionBurstDone,
            discoveries: Array.from(journeyDiscovery.found),
            discoveryOpen: journeyDiscovery.areaKey || null,
            discoveryReturning: journeyDiscovery.returningKey || null,
            echoActive: journeyEcho.active?.stage || null,
            idleBloom: root.dataset.memoryIdle === 'true',
            replayActive: Boolean(journeyMemory.replayStartedAt),
            replayCount: journeyMemory.replayCount,
            portalReady: journeyMemory.portalReady,
            returnActive: Boolean(journeyReturn.active),
            returnCount: journeyMemory.returnCount,
            motionCharge: Number(journeyMotion.charge.toFixed(3)),
            timeFlow: root.dataset.timeFlow || null,
            landingActive: journeyLanding.active?.type || null,
          };
        },
        keepsakeStats() {
          const order = journeyConstellationOrder();
          const layout = journey.buildConstellationLayout(order, { width: 1200, height: 1200 });
          return {
            available: journeyKeepsake.available,
            readyAt: journeyKeepsake.readyAt,
            order,
            seed: layout.seed,
            points: layout.points.length,
            edges: layout.edges.length,
            exportedCount: journeyKeepsake.exportedCount,
            lastFileName: journeyKeepsake.lastFileName,
          };
        },
        previewKeepsake(order = ['moss', 'islog', 'taupe', 'monoomoi', 'ojicra', 'monoerabi', 'hub']) {
          journeyDiscovery.found.clear();
          journeyMemory.collected.clear();
          order.forEach((key) => {
            recordJourneyDiscovery(key);
            journeyMemory.collected.add(key);
          });
          journeyMemory.finalized = true;
          journeyMemory.finalizedAt = clock.now();
          journeyMemory.complete = true;
          journeyKeepsake.readyAt = clock.now();
          root.dataset.memoryCount = String(journeyMemory.collected.size);
          root.dataset.memoryComplete = 'true';
          updateKeepsakeAvailability(clock.now());
          return this.keepsakeStats();
        },
        keepsakePreviewDataUrl() {
          return drawJourneyKeepsake(journeyConstellationOrder())?.canvas.toDataURL('image/png') || '';
        },
        awakeningStats() {
          return {
            dawn: Boolean(journeyAwakening.dawn),
            weather: root.dataset.memoryWeather || null,
            resonance: journeyAwakening.resonance?.type || null,
            starDash: Boolean(journeyAwakening.starDash),
            orchestra: Boolean(journeyAwakening.orchestra),
            orchestraPhase: journeyAwakening.orchestra?.phase || null,
          };
        },
        previewAwakening(type = 'dawn') {
          const memoryKeys = ['moss', 'taupe', 'islog', 'ojicra', 'monoomoi', 'monoerabi', 'hub'];
          const discoveryKeys = ['taupe', 'islog', 'ojicra', 'monoomoi', 'monoerabi'];
          memoryKeys.forEach((key) => journeyMemory.collected.add(key));
          discoveryKeys.forEach((key) => journeyDiscovery.found.add(key));
          journeyMemory.returnCount = Math.max(1, journeyMemory.returnCount);
          journeyMemory.complete = true;
          root.dataset.memoryCount = String(journeyMemory.collected.size);
          const now = clock.now();
          if (type === 'resonance') {
            const definition = journey.moments.find((item) => item.stage === memoryWeatherStage(state.journeyStage))
              || journey.moments[0];
            beginJourneyResonance(definition, now);
          } else if (type === 'dash') {
            journeyMotion.charge = 1;
            journeyMotion.heldDirection = state.direction || 1;
            journeyAwakening.starDashCooldownUntil = 0;
            beginConstellationDash(now);
          } else if (type === 'orchestra') {
            journeyMemory.finalized = true;
            journeyMemory.finalizedAt = now;
            root.dataset.memoryComplete = 'true';
            beginWorldOrchestra(now);
          } else {
            beginMemoryDawn(now);
          }
          return this.awakeningStats();
        },
        secretStats() {
          return {
            nearby: journeySecrets.nearbyId || null,
            active: journeySecrets.active?.id || null,
            phase: journeySecrets.active?.phase || null,
            captured: Array.from(journeySecrets.captured),
            fragments: Array.from(journeySecrets.fragments),
            observatoryReady: journeySecrets.observatoryReadyAt > 0,
            observatoryActive: Boolean(journeySecrets.observatory),
            observatoryPhase: journeySecrets.observatory?.phase || null,
            observatorySeen: journeySecrets.observatorySeen,
            ascensionReady: journeySecrets.ascensionReadyAt > 0,
            ascensionActive: Boolean(journeySecrets.ascension),
            ascensionPhase: journeySecrets.ascension?.phase || null,
            ascensionProgress: journeySecrets.ascension
              ? Number(clamp(
                (clock.now() - journeySecrets.ascension.startedAt)
                  / journeySecrets.ascension.durationMs,
                0,
                1
              ).toFixed(3))
              : null,
            ascensionSeen: journeySecrets.ascensionSeen,
            worldSeedAwake: journeySecrets.worldSeedAwake,
            seedWakeCount: journeySecrets.seedWake.length,
          };
        },
        previewSecret(type = 'root-well') {
          const memoryKeys = ['moss', 'taupe', 'islog', 'ojicra', 'monoomoi', 'monoerabi', 'hub'];
          const discoveryKeys = ['taupe', 'islog', 'ojicra', 'monoomoi', 'monoerabi'];
          memoryKeys.forEach((key) => journeyMemory.collected.add(key));
          discoveryKeys.forEach((key) => journeyDiscovery.found.add(key));
          journeyMemory.returnCount = Math.max(1, journeyMemory.returnCount);
          journeyMemory.complete = true;
          root.dataset.memoryCount = String(journeyMemory.collected.size);
          const now = clock.now();
          if (['ascension', 'seed', 'observatory'].includes(type)) {
            const hub = journey.landmarks.find((landmark) => landmark.key === 'hub');
            finishIntro();
            state.started = true;
            state.x = Math.min(WORLD_LENGTH - 300, (hub?.x || WORLD_LENGTH - 900) - 260);
            state.y = terrainY(state.x);
            state.vx = 0;
            state.direction = 1;
            state.journeyStage = journey.stageAt(state.x);
            state.cameraX = Math.max(0, Math.min(WORLD_LENGTH - state.visibleW, state.x - state.visibleW * 0.42));
            state.cameraY = Math.max(-520, Math.min(520, state.y - 710));
          }
          if (type === 'ascension' || type === 'seed') {
            journeySecrets.wells.forEach((well) => {
              journeySecrets.captured.add(well.id);
              journeySecrets.fragments.add(well.id);
            });
            root.dataset.secretCount = String(journeySecrets.fragments.size);
            journeyMemory.finalized = true;
            journeyMemory.finalizedAt = now;
            root.dataset.memoryComplete = 'true';
            journeySecrets.observatorySeen = true;
            root.dataset.secretObservatory = 'complete';
            if (type === 'seed') {
              journeySecrets.ascensionSeen = true;
              journeySecrets.worldSeedAwake = true;
              journeySecrets.ascensionReadyAt = 0;
              root.dataset.secretAscension = 'complete';
              root.dataset.worldSeed = 'awake';
            } else {
              journeySecrets.ascensionReadyAt = 1;
              root.dataset.secretAscension = 'ready';
              beginSecretAscension(Math.max(now, 1102));
            }
          } else if (type === 'observatory') {
            journeySecrets.wells.forEach((well) => {
              journeySecrets.captured.add(well.id);
              journeySecrets.fragments.add(well.id);
            });
            root.dataset.secretCount = String(journeySecrets.fragments.size);
            journeyMemory.finalized = true;
            journeyMemory.finalizedAt = now;
            root.dataset.memoryComplete = 'true';
            journeySecrets.observatoryReadyAt = 1;
            root.dataset.secretObservatory = 'ready';
            beginSecretObservatory(Math.max(now, 902));
          } else if (type === 'fragments') {
            journeySecrets.wells.forEach((well) => {
              journeySecrets.captured.add(well.id);
              journeySecrets.fragments.add(well.id);
            });
            root.dataset.secretCount = String(journeySecrets.fragments.size);
          } else {
            const well = journeySecrets.wells.find((item) => item.id === type)
              || journeySecrets.wells[0];
            state.x = well.x;
            state.y = terrainY(state.x);
            state.vx = 0;
            state.journeyStage = journey.stageAt(state.x);
            state.cameraX = Math.max(0, Math.min(WORLD_LENGTH - state.visibleW, state.x - state.visibleW * 0.42));
            state.cameraY = Math.max(-520, Math.min(520, state.y - 710));
            beginSecretWell(well, now);
          }
          return this.secretStats();
        },
        previewAscensionPhase(phase = 'fusion') {
          const positions = {
            fusion: 0.08,
            rupture: 0.22,
            launch: 0.4,
            world: 0.65,
            return: 0.88,
          };
          this.resetSecrets();
          this.previewSecret('ascension');
          if (journeySecrets.ascension) {
            journeySecrets.ascension.startedAt = clock.now()
              - journeySecrets.ascension.durationMs * (positions[phase] ?? positions.fusion);
            journeySecrets.ascension.phase = '';
          }
          return this.secretStats();
        },
        previewSeedTrail() {
          this.resetSecrets();
          this.previewSecret('seed');
          const now = clock.now();
          const memoryKeys = Array.from(journeyMemory.collected);
          journeySecrets.seedWake = Array.from({ length: 9 }, (_, index) => ({
            x: state.x - state.direction * (20 + index * 24),
            bornAt: now - index * 110,
            key: memoryKeys[index % memoryKeys.length] || 'hub',
            twist: Math.sin(index * 1.7),
          }));
          journeySecrets.lastSeedWakeAt = now;
          return this.secretStats();
        },
        resetSecrets() {
          journeySecrets.captured.clear();
          journeySecrets.fragments.clear();
          journeySecrets.nearbyId = '';
          journeySecrets.captureSince = 0;
          journeySecrets.active = null;
          journeySecrets.observatoryReadyAt = 0;
          journeySecrets.observatory = null;
          journeySecrets.observatorySeen = false;
          journeySecrets.ascensionReadyAt = 0;
          journeySecrets.ascension = null;
          journeySecrets.ascensionSeen = false;
          journeySecrets.worldSeedAwake = false;
          journeySecrets.seedWake = [];
          journeySecrets.lastSeedWakeAt = 0;
          delete root.dataset.echoGuide;
          delete root.dataset.worldFold;
          delete root.dataset.worldFoldPhase;
          delete root.dataset.secretWell;
          delete root.dataset.secretCount;
          delete root.dataset.secretObservatory;
          delete root.dataset.secretObservatoryPhase;
          delete root.dataset.secretAscension;
          delete root.dataset.secretAscensionPhase;
          delete root.dataset.worldSeed;
          clearPocketWorldPosition();
        },
        resetMemories() {
          journeyMemory.collected.clear();
          journeyMemory.finalized = false;
          journeyMemory.finalizedAt = 0;
          journeyMemory.complete = false;
          journeyMemory.completionBurstDone = false;
          journeyMemory.idleSince = 0;
          journeyMemory.idleBloomed = false;
          journeyMemory.replayStartedAt = 0;
          journeyMemory.replayCount = 0;
          journeyMemory.portalReady = false;
          journeyMemory.portalReadyAt = 0;
          journeyMemory.returnCount = 0;
          journeyKeepsake.readyAt = 0;
          journeyKeepsake.available = false;
          journeyKeepsake.exporting = false;
          journeyKeepsake.lastFileName = '';
          if (keepsakeButton) {
            keepsakeButton.hidden = true;
            keepsakeButton.disabled = false;
          }
          journeyEcho.active = null;
          journeyEcho.completed.clear();
          journeyLanding.active = null;
          journeyReturn.active = null;
          journeyAwakening.dawn = null;
          journeyAwakening.resonance = null;
          journeyAwakening.starDash = null;
          journeyAwakening.starDashCooldownUntil = 0;
          journeyAwakening.orchestra = null;
          journeySecrets.captured.clear();
          journeySecrets.fragments.clear();
          journeySecrets.nearbyId = '';
          journeySecrets.captureSince = 0;
          journeySecrets.active = null;
          journeySecrets.observatoryReadyAt = 0;
          journeySecrets.observatory = null;
          journeySecrets.observatorySeen = false;
          journeySecrets.ascensionReadyAt = 0;
          journeySecrets.ascension = null;
          journeySecrets.ascensionSeen = false;
          journeySecrets.worldSeedAwake = false;
          journeySecrets.seedWake = [];
          journeySecrets.lastSeedWakeAt = 0;
          journeyMotion.heldDirection = 0;
          journeyMotion.heldSince = 0;
          journeyMotion.charge = 0;
          journeyDiscovery.found.clear();
          journeyDiscovery.indexes.clear();
          closeJourneyDiscovery();
          journeyDiscovery.returningKey = '';
          journeyDiscovery.closedAtTime = 0;
          delete root.dataset.memoryCount;
          delete root.dataset.memoryComplete;
          delete root.dataset.journeyFinalized;
          delete root.dataset.memoryIdle;
          delete root.dataset.memoryReplay;
          delete root.dataset.memoryPortal;
          delete root.dataset.keepsake;
          delete root.dataset.memoryReturn;
          delete root.dataset.memoryReturnPhase;
          delete root.dataset.journeyEcho;
          delete root.dataset.journeyLanding;
          delete root.dataset.timeFlow;
          delete root.dataset.memoryDawn;
          delete root.dataset.memoryWeather;
          delete root.dataset.memoryResonance;
          delete root.dataset.starDash;
          delete root.dataset.worldOrchestra;
          delete root.dataset.worldOrchestraPhase;
          delete root.dataset.echoGuide;
          delete root.dataset.worldFold;
          delete root.dataset.worldFoldPhase;
          delete root.dataset.secretWell;
          delete root.dataset.secretCount;
          delete root.dataset.secretObservatory;
          delete root.dataset.secretObservatoryPhase;
          delete root.dataset.secretAscension;
          delete root.dataset.secretAscensionPhase;
          delete root.dataset.worldSeed;
          clearPocketWorldPosition();
        },
      } : null,
    };
  }

  try {
    root.dataset.motion = 'full';
    resize();
    preallocateParticlePool(isJourneyMode ? 420 : 180);
    buildWorld();
    createPassingTravelerVisual();
    setupWorldCursor();
    resize();
    if (initialAtlasRequested) {
      clearAtlasQuery();
      root.dataset.introLoad = 'ready';
      finishIntro();
      ensureLivingAtlasRuntime();
    } else {
      beginIntroLoader();
    }
    if (isFocusMode) {
      setStage(focusStage(state.x));
    }
    syncSoundButton();
    updateKeepsakeAvailability(clock.now());
    root.dataset.gameReady = 'true';
    initializeLivingAtlasController();
    syncAtlasInteractivity(fallbackRequested);
    syncTiltWalkButton();
    bindInteractionEvents();
    announceStatus(walkingStatus());
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        restoreAtlasFromHistory({ allowReload: true });
      }
    });
    window.addEventListener('popstate', () => restoreAtlasFromHistory({ allowReload: true }));
    if (!restoreAtlasFromHistory() && !openAtlasFromQuery() && window.HomeAtlas) {
      initializeLivingAtlasController();
    }
    setupPerformanceHud();
    scheduleFrame();
  } catch (error) {
    console.error('Failed to build the home world.', error);
    releaseInput();
    openStaticFallback();
  }
})();
