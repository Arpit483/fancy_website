(() => {
  const WORLD_LENGTH = 18000;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smooth = (value) => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const CREEPER_FACE_MASK = Object.freeze([
    '11111111',
    '11111111',
    '10011001',
    '10011001',
    '11100111',
    '11000011',
    '11011011',
    '11011011',
  ]);
  const mix = (from, to, progress) => from.map((value, index) => (
    Math.round(value + (to[index] - value) * smooth(progress))
  ));

  function creeperFacePoints(options = {}) {
    const cellSize = Math.max(12, Number(options.cellSize) || 29);
    const clusterOffset = Math.max(2, Number(options.clusterOffset) || cellSize * 0.24);
    const origin = -((CREEPER_FACE_MASK.length - 1) * cellSize) / 2;
    const offsets = [
      [-clusterOffset, -clusterOffset],
      [clusterOffset, -clusterOffset],
      [-clusterOffset, clusterOffset],
      [clusterOffset, clusterOffset],
      [0, 0],
    ];
    const points = [];
    CREEPER_FACE_MASK.forEach((row, rowIndex) => {
      Array.from(row).forEach((cell, columnIndex) => {
        if (cell !== '1') {
          return;
        }
        const centerX = origin + columnIndex * cellSize;
        const centerY = origin + rowIndex * cellSize;
        const tone = (rowIndex * 3 + columnIndex * 5) % 3;
        offsets.forEach(([offsetX, offsetY]) => {
          points.push([
            centerX + offsetX,
            centerY + offsetY,
            tone,
            rowIndex,
            columnIndex,
          ]);
        });
      });
    });
    return points;
  }

  function stageAt(x) {
    if (x < 5600) return 'ai-ml';
    if (x < 6020) return 'brink';
    if (x < 6380) return 'fall-taupe';
    if (x < 8920) return 'rise-islog';
    if (x < 10480) return 'fullstack';
    if (x < 11180) return 'launch';
    if (x < 13280) return 'iot-embedded';
    if (x < 14020) return 'fall-ground';
    if (x < 15120) return 'open-source';
    if (x < 16360) return 'hackathons';
    return 'hub';
  }

  function terrainY(x, mossTerrain) {
    if (x < 5800) {
      return mossTerrain(x);
    }
    if (x < 6020) {
      return 738 + Math.sin(x / 92) * 3;
    }
    if (x < 6380) {
      const t = (x - 6020) / 360;
      return 738 + smooth(t) * 376;
    }
    if (x < 8240) {
      return 1114 + Math.sin(x / 210) * 8 + Math.sin(x / 67) * 3;
    }
    if (x < 8920) {
      const t = (x - 8240) / 680;
      return 1114 - smooth(t) * 402 + Math.sin(x / 120) * 5;
    }
    if (x < 10480) {
      const t = (x - 8920) / 1560;
      return 712 - Math.sin(t * Math.PI) * 34 + Math.sin(x / 210) * 5;
    }
    if (x < 11180) {
      const t = (x - 10480) / 700;
      return 710 - smooth(t) * 454;
    }
    if (x < 13280) {
      const step = Math.floor((x - 11180) / 260) % 3;
      return 256 + step * 10 + Math.sin(x / 170) * 5;
    }
    if (x < 14020) {
      const t = (x - 13280) / 740;
      return 264 + smooth(t) * 448;
    }
    if (x < 16360) {
      return 712 + Math.sin(x / 250) * 7 + Math.sin(x / 83) * 2;
    }
    const t = clamp((x - 16360) / 1200, 0, 1);
    return 712 - smooth(t) * 46 + Math.sin(x / 260) * 3;
  }

  function groundVisible(x) {
    if (x < 5140) return true;
    if (x < 6380) return false;
    if (x < 10520) return true;
    if (x < 14020) return false;
    return true;
  }

  function fishingRange(options = {}) {
    const finite = (value, fallback) => (
      Number.isFinite(Number(value)) ? Number(value) : fallback
    );
    const pierStart = finite(options.pierStart, 5140);
    const pierEnd = Math.max(pierStart, finite(options.pierEnd, 5550));
    const bobberOffset = Math.max(1, finite(options.bobberOffset, 430));
    const waterClearance = Math.max(0, finite(options.waterClearance, 220));
    const edgeMargin = Math.max(0, finite(options.edgeMargin, 70));
    const start = clamp(
      pierEnd + waterClearance - bobberOffset,
      pierStart,
      pierEnd
    );
    const end = clamp(pierEnd - edgeMargin, start, pierEnd);
    return {
      pierStart,
      pierEnd,
      bobberOffset,
      waterClearance,
      edgeMargin,
      start,
      end,
    };
  }

  function reverseTransitionType(type) {
    return type === 'launch' ? 'return-drop' : 'launch';
  }

  function nextDiscoveryIndex(previousIndex, itemCount) {
    if (!Number.isInteger(itemCount) || itemCount <= 0) {
      return 0;
    }
    if (!Number.isInteger(previousIndex)) {
      return 0;
    }
    return (previousIndex + 1) % itemCount;
  }

  function reconcileMemoryCompletion(memory, collected, discoveries) {
    const memoryKeys = ['ai-ml', 'fullstack', 'iot-embedded', 'open-source', 'hackathons'];
    const discoveryKeys = ['fullstack', 'iot-embedded', 'open-source', 'hackathons'];
    const complete = memoryKeys.every((key) => collected.has(key) || collected.has(key.replace('ai-ml', 'moss')))
      && discoveryKeys.every((key) => discoveries.has(key) || discoveries.has(key.replace('security', 'taupe')));
    const becameComplete = complete && !memory.complete;
    memory.complete = complete;
    if (becameComplete) {
      memory.completionBurstDone = false;
    }
    return { complete, becameComplete };
  }

  function transitionCandidate(transitions, completed, x, input, threshold = 90) {
    if (input > 0) {
      const definition = transitions.find((item) => (
        !completed.has(item.id)
        && x >= item.triggerX
        && x <= item.triggerX + threshold
      ));
      return definition ? { definition, direction: 1 } : null;
    }
    if (input < 0) {
      const definition = transitions.find((item) => (
        completed.has(item.id)
        && x <= item.toX
        && x >= item.toX - threshold
      ));
      return definition ? { definition, direction: -1 } : null;
    }
    return null;
  }

  function visualAt(x) {
    const white = [255, 255, 255];
    const warm = [252, 250, 246];
    const taupeDark = [6, 8, 14];
    const spaceDark = [5, 3, 9];
    let background = white;
    if (x >= 5900 && x < 6380) {
      background = mix(white, taupeDark, (x - 5900) / 480);
    } else if (x >= 6380 && x < 8240) {
      background = taupeDark;
    } else if (x >= 8240 && x < 8920) {
      background = mix(taupeDark, white, (x - 8240) / 680);
    } else if (x >= 10380 && x < 11180) {
      background = mix(white, spaceDark, (x - 10380) / 800);
    } else if (x >= 11180 && x < 13280) {
      background = spaceDark;
    } else if (x >= 13280 && x < 14020) {
      background = mix(spaceDark, warm, (x - 13280) / 740);
    } else if (x >= 14020) {
      background = warm;
    }
    const luminance = background[0] * 0.299 + background[1] * 0.587 + background[2] * 0.114;
    return {
      background,
      tone: luminance < 124 ? 'dark' : 'light',
      darkness: clamp((255 - luminance) / 249, 0, 1),
    };
  }

  function constellationSeed(order) {
    const source = Array.from(order || []).join('>') || 'arpit.co';
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildConstellationLayout(order, options = {}) {
    const keys = Array.from(new Set(order || [])).filter(Boolean);
    const width = Math.max(320, Number(options.width || 1200));
    const height = Math.max(320, Number(options.height || 1200));
    const padding = Math.max(48, Math.min(width, height) * Number(options.paddingRatio || 0.16));
    const seed = constellationSeed(keys);
    const random = seededRandom(seed);
    const centerX = width * 0.5;
    const centerY = height * 0.51;
    const radiusX = Math.max(80, width * 0.5 - padding);
    const radiusY = Math.max(80, height * 0.5 - padding * 1.2);
    const count = Math.max(1, keys.length);
    const rotation = -Math.PI / 2 + (random() - 0.5) * 0.62;
    const points = keys.map((key, index) => {
      const slot = index / count;
      const angle = rotation
        + slot * Math.PI * 2
        + (random() - 0.5) * (0.38 + 0.26 / count);
      const orbit = 0.58 + random() * 0.34;
      const branch = index % 3 === 1 ? 0.84 : index % 3 === 2 ? 1.08 : 1;
      return {
        key,
        index,
        x: clamp(centerX + Math.cos(angle) * radiusX * orbit * branch, padding, width - padding),
        y: clamp(centerY + Math.sin(angle) * radiusY * orbit / branch, padding, height - padding),
        size: 6 + random() * 5,
      };
    });
    const edges = [];
    for (let index = 1; index < points.length; index += 1) {
      edges.push([index - 1, index]);
    }
    if (points.length > 3) {
      edges.push([points.length - 1, 0]);
    }
    if (points.length > 5) {
      const branchStart = seed % (points.length - 2);
      const branchEnd = (branchStart + 3 + (seed % 2)) % points.length;
      if (Math.abs(branchStart - branchEnd) > 1) {
        edges.push([branchStart, branchEnd]);
      }
    }
    return { width, height, padding, seed, keys, points, edges };
  }

  const landmarks = [
    { key: 'fullstack',    x: 9300,  y: 430,  eyebrow: 'Full-Stack Engineering',     title: '[DEV] Full-Stack' },
    { key: 'iot-embedded', x: 11680, y: -8,   eyebrow: 'IoT & Embedded Systems',    title: '[IOT] IoT & Embedded' },
    { key: 'open-source',  x: 14280, y: 410,  eyebrow: 'Open Source',               title: '[SRC] Open Source' },
    { key: 'hackathons',   x: 15360, y: 400,  eyebrow: 'Hackathons & Competitions', title: '[HACK] Hackathons' },
    { key: 'hub',          x: 17180, y: 338,  eyebrow: 'Summary awaits',            title: 'ARPIT.CO' },
  ];

  const transitions = [
    {
      id: 'drop-to-taupe',
      type: 'drop',
      triggerX: 5550,
      toX: 6480,
      holdMs: 190,
      durationMs: 1080,
      cameraDelay: 0.68,
    },
    {
      id: 'launch-to-ojicra',
      type: 'launch',
      triggerX: 10420,
      toX: 11320,
      holdMs: 220,
      durationMs: 1240,
      cameraDelay: 0.62,
      launchOvershoot: 184,
    },
    {
      id: 'drop-to-ground',
      type: 'return-drop',
      triggerX: 13220,
      toX: 14080,
      holdMs: 180,
      durationMs: 1120,
    },
  ];

  const moments = [
    { id: 'fullstack-memory',  type: 'memory',  stage: 'fullstack',    triggerX: 9740,  durationMs: 1000 },
    { id: 'iot-creeper',       type: 'creeper', stage: 'iot-embedded', triggerX: 12380, durationMs: 1900 },
    { id: 'opensource-gift',   type: 'gift',    stage: 'open-source',  triggerX: 14540, durationMs: 950  },
    { id: 'hackathons-scan',   type: 'scan',    stage: 'hackathons',   triggerX: 15720, durationMs: 900  },
    { id: 'hub-finale',        type: 'finale',  stage: 'hub',          triggerX: 16920, durationMs: 1800 },
  ];

  function build(api) {
    const { addDot, addLine, rng } = api;
    const line = (x1, y1, x2, y2, options = {}) => addLine(x1, y1, x2, y2, options);
    const polyline = (points, options = {}) => {
      for (let i = 1; i < points.length; i += 1) {
        line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], options);
      }
    };
    const ring = (cx, cy, radius, options = {}) => {
      const r = options.rng || rng(cx + cy + radius);
      const count = Math.max(16, Math.round(radius * 0.9));
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        addDot(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, {
          ...options,
          rng: undefined,
          phase: r() * Math.PI * 2,
          size: (options.size || 2) * (0.72 + r() * 0.5),
        });
      }
    };
    const common = (rgb, revealX, seed, extra = {}) => ({
      rng: rng(seed), rgb, revealX, step: 8, jitter: 1.8, size: 2.1, alpha: 0.54, ...extra,
    });

    // The ground tears open. Sparse vertical walls make the drop readable
    // before the background has fully turned dark.
    const holeRng = rng(6011);
    for (let y = 740; y <= 1110; y += 13) {
      const spread = (y - 740) * 0.34;
      addDot(6008 - spread + (holeRng() - 0.5) * 10, y, {
        kind: 'chasm', rgb: [66, 74, 76], alpha: 0.2 + holeRng() * 0.32,
        size: 1.4 + holeRng() * 2.5, revealX: 5660, sway: 0.4, speed: 0.4,
      });
      addDot(6032 + spread + (holeRng() - 0.5) * 10, y, {
        kind: 'chasm', rgb: [84, 112, 118], alpha: 0.16 + holeRng() * 0.28,
        size: 1.2 + holeRng() * 2.2, revealX: 5700, sway: 0.5, speed: 0.5,
      });
    }
    ring(6018, 741, 54, { kind: 'chasm', rgb: [66, 70, 68], alpha: 0.34, size: 2, revealX: 5600, rng: holeRng });

    // taupe: circuit streets and signal towers emerge from black.
    const neon = [[85, 229, 220], [238, 93, 176], [232, 210, 85], [128, 122, 255]];
    const taupeRng = rng(7101);
    for (let row = 0; row < 7; row += 1) {
      const y = 1090 - row * 74;
      const start = 6420 + (row % 2) * 90;
      const end = 8340 - ((row + 1) % 2) * 120;
      const color = neon[row % neon.length];
      const route = [
        [start, y], [start + 260, y], [start + 260, y - 34],
        [start + 620, y - 34], [start + 620, y + 18], [end, y + 18],
      ];
      polyline(route, common(color, start - 340, 7200 + row, {
        kind: 'neon-line', glow: 1.4,
        alpha: 0.42 + row * 0.025, size: 1.8 + row * 0.12, step: 9,
        sway: 0.3, bob: 0.3, speed: 0.6,
      }));
      const routeDistance = globalThis.HomeMotion.routeLength(route);
      const routeAnchor = globalThis.HomeMotion.pointOnRoute(
        route,
        routeDistance * 0.5,
        { x: 0, y: 0 },
        routeDistance
      );
      const pulseCount = 2 + (row % 2);
      for (let pulseIndex = 0; pulseIndex < pulseCount; pulseIndex += 1) {
        const direction = taupeRng() > 0.24 ? 1 : -1;
        const routeSpeed = direction * (150 + taupeRng() * 120);
        const routeOffset = taupeRng() * routeDistance;
        for (let tail = 0; tail < 3; tail += 1) {
          addDot(routeAnchor.x, routeAnchor.y, {
            kind: 'circuit-signal', rgb: color,
            alpha: 0.92 - tail * 0.2,
            size: 3.5 - tail * 0.65,
            glow: 4.6 - tail * 1.1,
            revealX: start - 420,
            route,
            routeLength: routeDistance,
            routeOffset: routeOffset - direction * tail * 18,
            routeSpeed,
            motionRadius: routeDistance * 0.58 + 80,
            signalTail: tail,
            phase: taupeRng() * Math.PI * 2,
          });
        }
      }
      const rainCount = row % 2 ? 4 : 3;
      for (let rainIndex = 0; rainIndex < rainCount; rainIndex += 1) {
        const distance = routeDistance * (0.08 + taupeRng() * 0.78);
        const anchor = globalThis.HomeMotion.pointOnRoute(
          route,
          distance,
          { x: 0, y: 0 },
          routeDistance
        );
        addDot(anchor.x, anchor.y - 58 - taupeRng() * 116, {
          kind: 'data-rain', rgb: color,
          alpha: 0.34 + taupeRng() * 0.28,
          size: 1.25 + taupeRng() * 1.2,
          glow: 2.4,
          revealX: start - 460,
          route,
          routeLength: routeDistance,
          routeOffset: distance,
          routeSpeed: 0,
          motionRadius: 210,
          rainSpan: 78 + taupeRng() * 86,
          rainSpeed: 20 + taupeRng() * 34,
          rainOffset: taupeRng() * 220,
          rainRouteTravel: 120 + taupeRng() * 260,
          phase: taupeRng() * Math.PI * 2,
        });
      }
      [start + 260, start + 620, end].forEach((x, index) => {
        ring(x, index === 1 ? y - 34 : y + (index === 2 ? 18 : 0), 11 + index * 3, {
          kind: 'neon', rgb: color, alpha: 0.68, size: 1.8, glow: 3.2,
          revealX: x - 360, sway: 0.5, bob: 0.5, speed: 0.7,
          rng: taupeRng,
        });
      });
    }
    for (let i = 0; i < 140; i += 1) {
      const x = 6460 + taupeRng() * 1850;
      const y = 590 + taupeRng() * 500;
      const color = neon[Math.floor(taupeRng() * neon.length)];
      addDot(x, y, {
        kind: 'neon', rgb: color, alpha: 0.18 + taupeRng() * 0.42, glow: 1.8,
        size: 1.1 + taupeRng() * 3.3, revealX: x - 420,
        sway: 1 + taupeRng() * 3, bob: 1 + taupeRng() * 4,
        speed: 0.35 + taupeRng() * 0.8, phase: taupeRng() * Math.PI * 2,
      });
    }

    // Circuit signals loosen from the floor and become the light of the city above.
    const riseRng = rng(8424);
    for (let i = 0; i < 150; i += 1) {
      const x = 8040 + riseRng() * 980;
      const t = clamp((x - 8040) / 980, 0, 1);
      const ground = terrainY(x, api.mossTerrain);
      addDot(x, ground - 38 - riseRng() * (80 + t * 330), {
        kind: 'signal-rise', rgb: neon[i % neon.length],
        alpha: 0.12 + riseRng() * 0.34, glow: riseRng() > 0.82 ? 1.5 : 0,
        size: 1 + riseRng() * 2.8, revealX: x - 430,
        parallax: 0.88, depthAnchor: 8500,
        sway: 1 + riseRng() * 4, bob: 1 + riseRng() * 3,
        speed: 0.4 + riseRng() * 0.7, phase: riseRng() * Math.PI * 2,
      });
    }

    // isLog: the returning road opens into a harbor town between mountains and sea.
    const city = [67, 74, 76];
    const cityBlue = [76, 145, 162];
    const cityRed = [181, 104, 92];
    const seaBlue = [93, 165, 184];
    const mountainBlue = [91, 121, 128];
    const harborWarm = [195, 146, 96];
    for (let x = 8270; x < 9000; x += 44) {
      line(x, terrainY(x, api.mossTerrain) + 3, x + 38, terrainY(x + 38, api.mossTerrain) + 3,
        common(cityBlue, x - 330, x, { kind: 'islog-path', alpha: 0.38, step: 7, size: 1.8 }));
    }

    const mountains = [
      {
        color: mountainBlue,
        alpha: 0.2,
        parallax: 0.56,
        points: [[8720, 558], [8890, 414], [8995, 510], [9140, 344], [9300, 542], [9450, 426], [9585, 552]],
      },
      {
        color: [116, 139, 140],
        alpha: 0.16,
        parallax: 0.68,
        points: [[9240, 556], [9420, 454], [9530, 522], [9710, 382], [9860, 536], [10040, 432], [10230, 558], [10460, 468]],
      },
    ];
    mountains.forEach((layer, index) => {
      polyline(layer.points, common(layer.color, 8460 + index * 260, 9000 + index, {
        kind: 'islog-mountain', alpha: layer.alpha, step: 12, size: 1.55,
        parallax: layer.parallax, depthAnchor: 9680, jitter: 2.8,
      }));
      line(layer.points[0][0], 558, layer.points[layer.points.length - 1][0], 558,
        common(layer.color, 8500 + index * 240, 9030 + index, {
          kind: 'islog-mountain', alpha: layer.alpha * 0.56, step: 15, size: 1.25,
          parallax: layer.parallax, depthAnchor: 9680, jitter: 1.2,
        }));
    });

    for (let band = 0; band < 4; band += 1) {
      const wave = [];
      for (let x = 8840; x <= 10480; x += 34) {
        wave.push([
          x,
          574 + band * 18
            + Math.sin(x / (72 + band * 12) + band * 1.7) * (3 + band * 0.6),
        ]);
      }
      polyline(wave, common(band % 2 ? cityBlue : seaBlue, 8520 + band * 70, 9300 + band, {
        kind: 'islog-water', alpha: 0.16 + band * 0.025,
        step: 12, size: 1.35 + band * 0.08, jitter: 0.7,
        parallax: 0.8, depthAnchor: 9720,
        phase: band * 1.4, speed: 0.48,
      }));
    }

    const harborHouse = (x, width, height, roofHeight, color, index) => {
      const base = terrainY(x + width * 0.5, api.mossTerrain) - 5;
      const top = base - height;
      const revealX = x - 390;
      polyline([
        [x, base], [x, top], [x + width * 0.5, top - roofHeight],
        [x + width, top], [x + width, base],
      ], common(color, revealX, x + index, {
        kind: 'islog-house', alpha: 0.48, step: 7, size: 1.8, jitter: 1.3,
      }));
      line(x + width * 0.5, base, x + width * 0.5, base - 42,
        common(city, revealX, x + index + 30, {
          kind: 'islog-house', alpha: 0.36, step: 6, size: 1.45, jitter: 1,
        }));
      [0.28, 0.7].forEach((ratio, windowIndex) => {
        ring(x + width * ratio, top + height * 0.45, 4.6, {
          kind: 'islog-light',
          rgb: (index + windowIndex) % 3 === 0 ? harborWarm : index % 2 ? cityRed : cityBlue,
          alpha: 0.44, size: 1.3, glow: 1.45,
          revealX, rng: rng(x + windowIndex * 47),
        });
      });
      if (index % 3 === 1) {
        const chimneyX = x + width * 0.72;
        line(chimneyX, top - 8, chimneyX, top - 34,
          common(city, revealX, chimneyX, {
            kind: 'islog-house', alpha: 0.34, step: 5, size: 1.35, jitter: 0.8,
          }));
        for (let smoke = 0; smoke < 4; smoke += 1) {
          addDot(chimneyX + smoke * 3, top - 42 - smoke * 13, {
            kind: 'islog-smoke', rgb: mountainBlue,
            alpha: 0.18 + smoke * 0.025, size: 1.6 + smoke * 0.35,
            revealX, phase: smoke * 0.9 + index,
          });
        }
      }
    };

    [
      [8930, 116, 76, 28, city],
      [9085, 96, 62, 24, cityBlue],
      [9215, 132, 88, 34, city],
      [9390, 106, 68, 26, cityRed],
      [9810, 118, 82, 31, cityBlue],
      [9965, 102, 66, 25, city],
      [10260, 126, 84, 32, cityRed],
    ].forEach((house, index) => harborHouse(...house, index));

    // A small fishing boat gives the harbor a destination rather than a business skyline.
    polyline([[9540, 604], [9584, 622], [9680, 620], [9726, 600], [9540, 604]],
      common(cityBlue, 9180, 9580, {
        kind: 'islog-boat', alpha: 0.48, step: 6, size: 1.7,
        parallax: 0.9, depthAnchor: 9660, bob: 0.8, speed: 0.4,
      }));
    line(9630, 604, 9630, 492, common(city, 9200, 9630, {
      kind: 'islog-boat', alpha: 0.44, step: 6, size: 1.55,
      parallax: 0.9, depthAnchor: 9660, bob: 0.8, speed: 0.4,
    }));
    polyline([[9632, 500], [9700, 552], [9632, 558]], common(cityRed, 9220, 9632, {
      kind: 'islog-boat', alpha: 0.4, step: 7, size: 1.5,
      parallax: 0.9, depthAnchor: 9660, bob: 0.8, speed: 0.4,
    }));

    // The lighthouse is the final landmark before the town lights become stars.
    const lighthouseX = 10152;
    const lighthouseBase = terrainY(lighthouseX, api.mossTerrain) - 8;
    polyline([
      [lighthouseX - 34, lighthouseBase],
      [lighthouseX - 20, lighthouseBase - 210],
      [lighthouseX + 20, lighthouseBase - 210],
      [lighthouseX + 34, lighthouseBase],
    ], common(city, 9750, lighthouseX, {
      kind: 'islog-lighthouse', alpha: 0.52, step: 7, size: 1.8, jitter: 1.1,
    }));
    polyline([
      [lighthouseX - 32, lighthouseBase - 210],
      [lighthouseX, lighthouseBase - 240],
      [lighthouseX + 32, lighthouseBase - 210],
    ], common(cityRed, 9760, lighthouseX + 1, {
      kind: 'islog-lighthouse', alpha: 0.5, step: 6, size: 1.7, jitter: 1,
    }));
    ring(lighthouseX, lighthouseBase - 202, 13, {
      kind: 'islog-beacon', rgb: harborWarm, alpha: 0.66, size: 1.75,
      glow: 3.2, revealX: 9770, rng: rng(lighthouseX),
    });
    line(lighthouseX + 16, lighthouseBase - 202, lighthouseX + 152, lighthouseBase - 228,
      common(harborWarm, 9800, lighthouseX + 2, {
        kind: 'islog-beacon', alpha: 0.18, step: 12, size: 1.25, jitter: 2.4,
      }));

    [[9060, 382, 1], [9910, 350, -1], [10320, 418, 1]].forEach(([x, y, direction], index) => {
      polyline([
        [x - 22 * direction, y + 4], [x, y - 5], [x + 22 * direction, y + 4],
      ], common(index % 2 ? cityRed : cityBlue, x - 350, x + y, {
        kind: 'islog-gull', alpha: 0.3, step: 5, size: 1.3,
        parallax: 0.76, depthAnchor: 9680, bob: 0.8, speed: 0.38,
      }));
    });

    // The last harbor lights detach from the coast before the launch.
    const cityStarRng = rng(10270);
    for (let i = 0; i < 110; i += 1) {
      const x = 9940 + cityStarRng() * 820;
      const t = clamp((x - 9940) / 820, 0, 1);
      addDot(x, 660 - cityStarRng() * (120 + t * 430), {
        kind: 'harbor-star', rgb: cityStarRng() > 0.44 ? cityBlue : cityRed,
        alpha: 0.13 + cityStarRng() * 0.32, glow: cityStarRng() > 0.86 ? 1.4 : 0,
        size: 1 + cityStarRng() * 2.7, revealX: x - 420,
        parallax: 0.84, depthAnchor: 10340,
        sway: 1 + cityStarRng() * 3, bob: 1 + cityStarRng() * 3,
        speed: 0.35 + cityStarRng() * 0.72, phase: cityStarRng() * Math.PI * 2,
      });
    }

    // Launch tunnel and stars. Vertical streaks begin before the sky turns dark.
    const starRng = rng(11021);
    for (let i = 0; i < 720; i += 1) {
      const x = 10400 + starRng() * 3300;
      const y = -140 + starRng() * 920;
      const palette = [[235, 231, 190], [178, 145, 190], [206, 209, 126], [128, 86, 145]];
      const color = palette[Math.floor(starRng() * palette.length)];
      addDot(x, y, {
        kind: 'star', rgb: color, alpha: 0.18 + starRng() * 0.62, glow: starRng() > 0.86 ? 1.5 : 0,
        size: 0.8 + starRng() * 2.8, revealX: x - 560,
        parallax: 0.82, depthAnchor: 12120,
        sway: 0.5 + starRng() * 2.5, bob: 0.5 + starRng() * 2,
        speed: 0.3 + starRng() * 0.8, phase: starRng() * Math.PI * 2,
      });
    }
    for (let x = 10520; x < 11180; x += 90) {
      const y = terrainY(x, api.mossTerrain);
      line(x - 26, y + 150, x + 12, y - 170,
        common([160, 215, 232], x - 340, x + 2, { kind: 'launch-line', glow: 1, alpha: 0.28, step: 15, size: 1.5, jitter: 4 }));
    }

    // ojicra: pale islands and violet structures float in a black voxel void.
    const endRng = rng(12120);
    const endStone = [188, 194, 104];
    const endStoneLight = [215, 218, 142];
    const endPurple = [137, 91, 157];
    const endPurpleDark = [80, 55, 98];
    const endIsland = (cx, topY, width, thickness, revealX, parallax = 1) => {
      const top = [
        [cx - width * 0.5, topY],
        [cx - width * 0.28, topY - 14],
        [cx - width * 0.02, topY - 8],
        [cx + width * 0.24, topY - 19],
        [cx + width * 0.5, topY - 2],
      ];
      const underside = [
        [cx + width * 0.38, topY + thickness * 0.34],
        [cx + width * 0.18, topY + thickness * 0.72],
        [cx, topY + thickness],
        [cx - width * 0.2, topY + thickness * 0.68],
        [cx - width * 0.4, topY + thickness * 0.3],
      ];
      polyline(top, common(endStoneLight, revealX, cx, {
        kind: 'end-island', alpha: 0.7, step: 7, size: 2.15, glow: 0.5,
        bob: 1.2, speed: 0.34, parallax, depthAnchor: cx,
      }));
      polyline([top[4], ...underside, top[0]], common(endPurpleDark, revealX, cx + 1, {
        kind: 'end-island', alpha: 0.58, step: 8, size: 1.9,
        bob: 1.2, speed: 0.34, parallax, depthAnchor: cx,
      }));
      for (let layer = 1; layer <= 3; layer += 1) {
        const y = topY + thickness * (layer / 4);
        const inset = width * layer * 0.055;
        line(cx - width * 0.42 + inset, y, cx + width * 0.4 - inset, y + 3,
          common(endPurple, revealX, cx + layer, {
            kind: 'end-island', alpha: 0.26, step: 10, size: 1.45,
            bob: 1.2, speed: 0.34, parallax, depthAnchor: cx,
          }));
      }
      const fillCount = Math.round(width * 0.24);
      for (let i = 0; i < fillCount; i += 1) {
        const dx = (endRng() - 0.5) * width * 0.92;
        const normalized = Math.abs(dx) / (width * 0.46);
        const dy = endRng() * Math.max(8, thickness * 0.34 * (1 - normalized));
        addDot(cx + dx, topY + dy, {
          kind: 'end-island', rgb: endRng() > 0.7 ? endStoneLight : endStone,
          alpha: 0.18 + endRng() * 0.34, size: 1.1 + endRng() * 2.4,
          revealX, parallax, depthAnchor: cx,
          bob: 1.2, speed: 0.34, phase: endRng() * Math.PI * 2,
        });
      }
    };
    const endTower = (x, baseY, height, levels, revealX, scale = 1) => {
      const topY = baseY - height;
      const half = 19 * scale;
      polyline([[x - half, baseY], [x - half, topY], [x + half, topY], [x + half, baseY]],
        common(endPurple, revealX, x, {
          kind: 'end-city', alpha: 0.64, step: 6, size: 1.9, glow: 0.55,
          bob: 0.8, speed: 0.28,
        }));
      for (let level = 0; level < levels; level += 1) {
        const y = baseY - height * ((level + 1) / (levels + 1));
        const platform = (46 + (level % 2) * 18) * scale;
        polyline([
          [x - platform, y], [x - platform * 0.68, y - 16 * scale],
          [x + platform * 0.68, y - 16 * scale], [x + platform, y],
          [x + platform * 0.72, y + 14 * scale], [x - platform * 0.72, y + 14 * scale],
          [x - platform, y],
        ], common(endPurple, revealX, x + level, {
          kind: 'end-city', alpha: 0.72, step: 6, size: 1.95, glow: 0.8,
          bob: 0.8, speed: 0.28,
        }));
        line(x - platform * 0.46, y - 2, x + platform * 0.46, y - 2,
          common(endStoneLight, revealX, x + level + 20, {
            kind: 'end-city', alpha: 0.58, step: 7, size: 1.7, glow: 1.1,
            bob: 0.8, speed: 0.28,
          }));
      }
      polyline([[x - 42 * scale, topY], [x, topY - 28 * scale], [x + 42 * scale, topY]],
        common(endPurple, revealX, x + 40, {
          kind: 'end-city', alpha: 0.72, step: 6, size: 1.9, glow: 0.7,
          bob: 0.8, speed: 0.28,
        }));
    };
    const chorusPlant = (x, baseY, height, revealX) => {
      const topY = baseY - height;
      line(x, baseY, x, topY, common(endPurpleDark, revealX, x, {
        kind: 'end-chorus', alpha: 0.56, step: 7, size: 1.7,
        sway: 2.8, speed: 0.46,
      }));
      [-0.62, -0.34, -0.08].forEach((ratio, index) => {
        const y = baseY + height * ratio;
        const direction = index % 2 ? 1 : -1;
        line(x, y, x + direction * (24 + index * 10), y - 24,
          common(endPurple, revealX, x + index, {
            kind: 'end-chorus', alpha: 0.48, step: 6, size: 1.55,
            sway: 3.4, speed: 0.46,
          }));
        ring(x + direction * (24 + index * 10), y - 25, 6, {
          kind: 'end-chorus', rgb: endStoneLight, alpha: 0.58, size: 1.5,
          glow: 1.2, revealX, sway: 3.4, speed: 0.46, rng: endRng,
        });
      });
    };

    [
      [11360, 266, 510, 138, 10930, 1],
      [11840, 250, 720, 178, 11330, 1],
      [12520, 270, 840, 210, 11980, 1],
      [13110, 260, 520, 150, 12600, 1],
      [12180, 40, 430, 116, 11620, 0.72],
    ].forEach((island) => endIsland(...island));

    endTower(12140, 246, 410, 3, 11610, 1);
    endTower(12420, 250, 520, 4, 11820, 1.08);
    line(12190, 44, 12368, 18, common(endPurple, 11720, 12240, {
      kind: 'end-city', alpha: 0.56, step: 7, size: 1.7, glow: 0.7,
      bob: 0.8, speed: 0.28,
    }));

    // A distant floating ship silhouette appears after the city towers.
    polyline([
      [12760, -86], [13020, -86], [12968, -34], [12816, -22], [12760, -86],
    ], common(endPurple, 12320, 12840, {
      kind: 'end-ship', alpha: 0.58, step: 7, size: 1.85, glow: 0.65,
      parallax: 0.82, depthAnchor: 12900, bob: 2.2, speed: 0.32,
    }));
    line(12904, -88, 12904, -230, common(endPurple, 12340, 12904, {
      kind: 'end-ship', alpha: 0.52, step: 7, size: 1.7,
      parallax: 0.82, depthAnchor: 12900, bob: 2.2, speed: 0.32,
    }));
    polyline([[12904, -214], [12972, -174], [12904, -148]], common(endStoneLight, 12360, 12910, {
      kind: 'end-ship', alpha: 0.5, step: 7, size: 1.65, glow: 0.8,
      parallax: 0.82, depthAnchor: 12900, bob: 2.2, speed: 0.32,
    }));

    [11420, 11680, 11920, 12630, 12840, 13030, 13220].forEach((x, index) => {
      chorusPlant(x, 262 + (index % 3) * 8, 94 + (index % 4) * 32, x - 430);
    });

    for (let i = 0; i < 180; i += 1) {
      const x = 11220 + endRng() * 2080;
      addDot(x, -110 + endRng() * 620, {
        kind: 'end-dust', rgb: endRng() > 0.74 ? endStoneLight : endPurple,
        alpha: 0.12 + endRng() * 0.32, glow: endRng() > 0.9 ? 1.3 : 0,
        size: 1 + endRng() * 2.6, revealX: x - 520,
        parallax: 0.86, depthAnchor: 12240,
        sway: 1 + endRng() * 3, bob: 1 + endRng() * 3,
        speed: 0.28 + endRng() * 0.48, phase: endRng() * Math.PI * 2,
      });
    }

    // Return fall: fragments point toward the quiet ground below.
    const fallRng = rng(13550);
    for (let i = 0; i < 180; i += 1) {
      const x = 13230 + fallRng() * 900;
      const y = 140 + fallRng() * 760;
      addDot(x, y, {
        kind: 'fall-dust', rgb: [133, 177, 180], alpha: 0.12 + fallRng() * 0.34,
        size: 1 + fallRng() * 3.2, revealX: x - 500,
        sway: 1 + fallRng() * 4, bob: 2 + fallRng() * 5,
        speed: 0.4 + fallRng() * 0.8, phase: fallRng() * Math.PI * 2,
      });
    }

    // Cold stars warm into the first seeds of the gift garden while falling.
    const starGiftRng = rng(13710);
    const starGiftPalette = [[127, 214, 229], [190, 116, 123], [193, 151, 83], [105, 154, 128]];
    for (let i = 0; i < 130; i += 1) {
      const x = 13080 + starGiftRng() * 1160;
      const t = clamp((x - 13080) / 1160, 0, 1);
      const color = starGiftPalette[Math.min(3, Math.floor(t * 4))];
      addDot(x, 170 + starGiftRng() * (520 + t * 120), {
        kind: 'star-gift', rgb: color, alpha: 0.12 + starGiftRng() * 0.28,
        glow: starGiftRng() > 0.9 ? 1.2 : 0, size: 1 + starGiftRng() * 2.8,
        revealX: x - 480, parallax: 0.88, depthAnchor: 13620,
        sway: 1 + starGiftRng() * 4, bob: 1 + starGiftRng() * 4,
        speed: 0.34 + starGiftRng() * 0.66, phase: starGiftRng() * Math.PI * 2,
      });
    }

    // monoomoi: a quiet gift garden.
    const gift = (x, y, width, height, color, revealX) => {
      polyline([[x, y], [x + width, y], [x + width, y - height], [x, y - height], [x, y]],
        common(color, revealX, x, { kind: 'gift-line', alpha: 0.46, step: 7, size: 1.9 }));
      line(x + width * 0.5, y, x + width * 0.5, y - height,
        common(color, revealX, x + 1, { kind: 'gift-line', alpha: 0.4, step: 7, size: 1.7 }));
      line(x, y - height * 0.58, x + width, y - height * 0.58,
        common(color, revealX, x + 2, { kind: 'gift-line', alpha: 0.4, step: 7, size: 1.7 }));
      ring(x + width * 0.38, y - height - 18, 22, { kind: 'ribbon', rgb: color, alpha: 0.45, size: 1.7, glow: 0.8, revealX, rng: rng(x + 3) });
      ring(x + width * 0.62, y - height - 18, 22, { kind: 'ribbon', rgb: color, alpha: 0.45, size: 1.7, glow: 0.8, revealX, rng: rng(x + 4) });
    };
    gift(14160, 708, 148, 120, [184, 105, 112], 13760);
    gift(14410, 710, 112, 88, [100, 155, 128], 14020);
    gift(14620, 708, 176, 142, [193, 151, 83], 14240);
    const gardenRng = rng(14400);
    for (let i = 0; i < 190; i += 1) {
      const x = 14020 + gardenRng() * 1050;
      const ground = terrainY(x, api.mossTerrain);
      addDot(x, ground - 10 - gardenRng() * 95, {
        kind: 'garden', rgb: gardenRng() > 0.42 ? [105, 154, 128] : [190, 116, 123],
        alpha: 0.14 + gardenRng() * 0.32, size: 1.2 + gardenRng() * 3.4,
        revealX: x - 360, sway: 1 + gardenRng() * 2.5, bob: 0.4,
        speed: 0.35 + gardenRng() * 0.5, phase: gardenRng() * Math.PI * 2,
      });
    }

    // monoerabi: shelves become an editorial instrument panel.
    const shelf = [70, 76, 74];
    [15180, 15540, 15900].forEach((x, column) => {
      polyline([[x, 706], [x, 442], [x + 300, 442], [x + 300, 706]],
        common(shelf, x - 380, x, { kind: 'shelf-line', alpha: 0.5, step: 7, size: 1.9 }));
      [516, 594, 670].forEach((y) => {
        line(x, y, x + 300, y, common(shelf, x - 360, x + y, { kind: 'shelf-line', alpha: 0.44, step: 7, size: 1.7 }));
      });
      const swatches = [[79, 151, 171], [191, 145, 75], [176, 99, 93]];
      for (let row = 0; row < 3; row += 1) {
        for (let item = 0; item < 3; item += 1) {
          const ox = x + 46 + item * 82;
          const oy = 500 + row * 77;
          ring(ox, oy, 10 + ((column + row + item) % 3) * 3, {
            kind: 'tool', rgb: swatches[(column + row + item) % swatches.length],
            alpha: 0.5, size: 1.6, glow: 0.6, revealX: x - 320, rng: rng(ox + oy),
          });
        }
      }
    });

    // Selected objects leave the shelves as colored coordinates bound for the hub.
    const hubTrailRng = rng(16280);
    const hubTrailColors = [[79, 151, 171], [191, 145, 75], [176, 99, 93], [105, 154, 128]];
    for (let i = 0; i < 120; i += 1) {
      const x = 15940 + hubTrailRng() * 960;
      const t = clamp((x - 15940) / 960, 0, 1);
      addDot(x, 610 - t * 110 + (hubTrailRng() - 0.5) * (90 + t * 180), {
        kind: 'shelf-hub', rgb: hubTrailColors[i % hubTrailColors.length],
        alpha: 0.12 + hubTrailRng() * 0.3, glow: hubTrailRng() > 0.86 ? 1.2 : 0,
        size: 1.1 + hubTrailRng() * 2.8, revealX: x - 420,
        parallax: 0.9, depthAnchor: 16420,
        sway: 1 + hubTrailRng() * 3, bob: 1 + hubTrailRng() * 3,
        speed: 0.4 + hubTrailRng() * 0.7, phase: hubTrailRng() * Math.PI * 2,
      });
    }

    // Hub: every palette bends into one calm point.
    const hubColors = [[80, 164, 180], [230, 112, 174], [117, 184, 143], [207, 166, 84], [104, 106, 116]];
    hubColors.forEach((color, index) => {
      const startX = 16220 + index * 42;
      const startY = 260 + index * 92;
      const endX = 17120;
      const endY = 540;
      const points = [];
      for (let step = 0; step <= 18; step += 1) {
        const t = step / 18;
        points.push([
          startX + (endX - startX) * t,
          startY + (endY - startY) * smooth(t) + Math.sin(t * Math.PI) * (index - 2) * 18,
        ]);
      }
      polyline(points, common(color, 15940, 16600 + index, { kind: 'hub-line', glow: 0.9, alpha: 0.48, step: 8, size: 2 }));
    });
    ring(17120, 540, 112, { kind: 'hub', rgb: [72, 78, 76], alpha: 0.5, size: 2.1, glow: 1, revealX: 16500, rng: rng(17120) });
    ring(17120, 540, 64, { kind: 'hub', rgb: [95, 164, 153], alpha: 0.42, size: 1.9, glow: 1.5, revealX: 16540, rng: rng(17121) });
  }

  window.HomeJourney = {
    WORLD_LENGTH,
    CREEPER_FACE_MASK,
    landmarks,
    transitions,
    moments,
    stageAt,
    terrainY,
    groundVisible,
    fishingRange,
    reverseTransitionType,
    nextDiscoveryIndex,
    reconcileMemoryCompletion,
    transitionCandidate,
    visualAt,
    constellationSeed,
    buildConstellationLayout,
    creeperFacePoints,
    build,
  };
})();
