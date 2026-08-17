(() => {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function routeLength(points) {
    if (!Array.isArray(points) || points.length < 2) {
      return 0;
    }
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      total += Math.hypot(
        points[index][0] - points[index - 1][0],
        points[index][1] - points[index - 1][1]
      );
    }
    return total;
  }

  function pointOnRoute(points, distance, target = { x: 0, y: 0 }, knownLength = 0) {
    if (!Array.isArray(points) || points.length === 0) {
      target.x = 0;
      target.y = 0;
      return target;
    }
    const total = knownLength || routeLength(points);
    if (points.length === 1 || total <= 0) {
      target.x = points[0][0];
      target.y = points[0][1];
      return target;
    }
    let remaining = ((distance % total) + total) % total;
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      const segment = Math.hypot(to[0] - from[0], to[1] - from[1]);
      if (remaining <= segment || index === points.length - 1) {
        const progress = segment ? Math.min(1, remaining / segment) : 0;
        target.x = from[0] + (to[0] - from[0]) * progress;
        target.y = from[1] + (to[1] - from[1]) * progress;
        return target;
      }
      remaining -= segment;
    }
    target.x = points[points.length - 1][0];
    target.y = points[points.length - 1][1];
    return target;
  }

  function createDotMotionRegistry() {
    const handlers = new Map();

    function register(kinds, handler) {
      const names = Array.isArray(kinds) ? kinds : [kinds];
      names.forEach((kind) => {
        if (!kind || typeof handler !== 'function') {
          throw new TypeError('Dot motion registration requires a kind and handler.');
        }
        handlers.set(kind, handler);
      });
      return () => names.forEach((kind) => handlers.delete(kind));
    }

    register(['neon', 'neon-line'], (_dot, output, frame) => {
      output.alpha *= 0.72 + frame.pulse * 0.42;
      output.size *= 0.92 + frame.pulse * 0.2;
    });

    register('circuit-signal', (dot, output, frame) => {
      if (!dot.route?.length || !dot.routePoint || !dot.routeLength) {
        return;
      }
      pointOnRoute(
        dot.route,
        frame.time * dot.routeSpeed + dot.routeOffset,
        dot.routePoint,
        dot.routeLength
      );
      output.sx += (dot.routePoint.x - dot.x) * frame.scale;
      output.sy += (dot.routePoint.y - dot.y) * frame.scale;
      const tail = Math.max(0, dot.signalTail || 0);
      const charge = 0.72 + frame.pulse * 0.42;
      output.alpha *= charge * Math.max(0.34, 1 - tail * 0.24);
      output.size *= (1.12 + frame.pulse * 0.22) * Math.max(0.58, 1 - tail * 0.16);
    });

    register('data-rain', (dot, output, frame) => {
      if (!dot.route?.length || !dot.routePoint || !dot.routeLength) {
        return;
      }
      const dropSpan = Math.max(24, dot.rainSpan || 118);
      const cycle = Math.max(0, (frame.time * Math.max(8, dot.rainSpeed || 34) + (dot.rainOffset || 0)) % (dropSpan + 1));
      const hitProgress = clamp(cycle / dropSpan, 0, 1);
      const hit = hitProgress >= 0.78;
      if (hit) {
        const routeProgress = (hitProgress - 0.78) / 0.22;
        pointOnRoute(
          dot.route,
          dot.routeOffset + routeProgress * Math.max(80, dot.rainRouteTravel || 220),
          dot.routePoint,
          dot.routeLength
        );
        output.sx += (dot.routePoint.x - dot.x) * frame.scale;
        output.sy += (dot.routePoint.y - dot.y) * frame.scale;
        output.alpha *= 0.74 + frame.pulse * 0.5;
        output.size *= 1.12 + frame.pulse * 0.3;
        return;
      }
      output.sy += (hitProgress - 0.5) * dropSpan * frame.scale;
      output.sx += Math.sin(frame.time * 1.4 + dot.phase) * 1.8 * frame.scale;
      output.alpha *= clamp(0.22 + hitProgress * 0.92, 0.2, 0.9);
      output.size *= 0.72 + hitProgress * 0.36;
    });

    register('star', (_dot, output, frame) => {
      output.alpha *= 0.48 + frame.pulse * 0.78;
      output.size *= 0.76 + frame.pulse * 0.46;
    });

    register(['block-line', 'block-dust'], (dot, output, frame) => {
      output.sy += Math.sin(frame.time * 0.72 + dot.x * 0.012) * 3.4 * frame.scale;
      output.alpha *= 0.82 + frame.pulse * 0.24;
    });

    register('end-island', (dot, output, frame) => {
      output.sy += Math.sin(frame.time * 0.34 + dot.phase) * 1.5 * frame.scale;
      output.alpha *= 0.86 + frame.pulse * 0.16;
    });

    register(['end-city', 'end-ship'], (dot, output, frame) => {
      output.sy += Math.sin(frame.time * 0.28 + dot.phase) * 2 * frame.scale;
      output.alpha *= 0.72 + frame.pulse * 0.38;
      output.size *= 0.92 + frame.pulse * 0.16;
    });

    register('end-chorus', (dot, output, frame) => {
      output.sx += Math.sin(frame.time * 0.46 + dot.phase) * 2.4 * frame.scale;
      output.alpha *= 0.7 + frame.pulse * 0.34;
    });

    register('end-dust', (dot, output, frame) => {
      output.sy -= ((frame.time * 7 + dot.phase * 10) % 34) * frame.scale;
      output.alpha *= 0.56 + frame.pulse * 0.52;
    });

    register(['window', 'islog-light', 'islog-beacon'], (_dot, output, frame) => {
      output.alpha *= 0.68 + frame.pulse * 0.46;
    });

    register('islog-water', (dot, output, frame) => {
      const ripple = Math.sin(frame.time * 0.54 - dot.x * 0.018 + dot.phase);
      output.sx += ripple * 3.6 * frame.scale;
      output.sy += Math.cos(frame.time * 0.42 + dot.phase) * 0.8 * frame.scale;
      output.alpha *= 0.7 + (ripple + 1) * 0.16;
    });

    register(['islog-boat', 'islog-gull'], (dot, output, frame) => {
      output.sy += Math.sin(frame.time * 0.46 + dot.phase) * 2.2 * frame.scale;
      output.alpha *= 0.78 + frame.pulse * 0.24;
    });

    register('islog-smoke', (dot, output, frame) => {
      const rise = (frame.time * 9 + dot.phase * 7) % 42;
      output.sx += Math.sin(frame.time * 0.38 + dot.phase) * 4.2 * frame.scale;
      output.sy -= rise * frame.scale;
      output.alpha *= clamp(1 - rise / 46, 0.08, 0.7);
      output.size *= 0.82 + rise / 56;
    });

    register('water', (dot, output, frame) => {
      const crest = 0.5 + Math.sin(frame.time * 0.82 - dot.x * 0.024 + dot.phase) * 0.5;
      output.sx += Math.sin(frame.time * 0.46 + dot.phase)
        * (3.8 + dot.waterDepth * 2.4) * frame.scale;
      output.sy += (1 - frame.waterFill) * (5 + dot.waterDepth * 16) * frame.scale;
      output.sy += Math.sin(frame.time * 0.72 + dot.x * 0.018 + dot.phase)
        * (0.8 + dot.waterDepth * 1.2) * frame.scale;
      output.alpha *= 0.64 + crest * 0.46;
      output.size *= 0.84 + crest * 0.18;
    });

    register(['gift-line', 'ribbon', 'garden'], (_dot, output, frame) => {
      output.size *= 0.94 + frame.pulse * 0.12;
      output.alpha *= 0.78 + frame.pulse * 0.3;
    });

    register(['shelf-line', 'tool'], (dot, output, frame) => {
      const scan = 0.5 + Math.sin(frame.time * 1.05 - dot.x * 0.018) * 0.5;
      output.alpha *= 0.68 + scan * 0.42;
      output.size *= 0.92 + scan * 0.14;
    });

    register(['hub-line', 'hub'], (dot, output, frame) => {
      const gather = 0.5 + Math.sin(frame.time * 0.9 - dot.x * 0.008 + dot.phase) * 0.5;
      output.alpha *= 0.72 + gather * 0.38;
      output.size *= 0.9 + gather * 0.2;
    });

    register('signal-rise', (dot, output, frame) => {
      const lift = (frame.time * 22 + dot.phase * 14) % 76;
      output.sy -= lift * frame.scale;
      output.alpha *= clamp(1 - lift / 80, 0.1, 1) * (0.7 + frame.pulse * 0.4);
    });

    register('harbor-star', (dot, output, frame) => {
      const becomingStar = clamp((dot.x - 10040) / 640, 0, 1);
      output.sy -= becomingStar * (8 + frame.pulse * 12) * frame.scale;
      output.alpha *= 0.62 + becomingStar * 0.5 + frame.pulse * 0.2;
      output.size *= 0.84 + becomingStar * 0.36;
    });

    register('star-gift', (dot, output, frame) => {
      const warmth = clamp((dot.x - 13220) / 760, 0, 1);
      output.sy += Math.sin(frame.time * 0.7 + dot.phase) * (3 + warmth * 7) * frame.scale;
      output.alpha *= 0.7 + frame.pulse * 0.26;
    });

    register('shelf-hub', (dot, output, frame) => {
      const pull = 0.5 + Math.sin(frame.time * 1.1 - dot.x * 0.012) * 0.5;
      output.sx += pull * 8 * frame.scale;
      output.alpha *= 0.66 + pull * 0.46;
      output.size *= 0.9 + pull * 0.18;
    });

    return {
      register,
      apply(dot, output, frame) {
        const handler = handlers.get(dot.kind);
        if (handler) {
          handler(dot, output, frame);
        }
        return output;
      },
      resolve(kind) {
        return handlers.get(kind) || null;
      },
      has(kind) {
        return handlers.has(kind);
      },
      kinds() {
        return Array.from(handlers.keys());
      },
    };
  }

  globalThis.HomeMotion = Object.freeze({
    createDotMotionRegistry,
    routeLength,
    pointOnRoute,
  });
})();
