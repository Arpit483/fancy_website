import { applyDotMotion } from '@/lib/world/motion';
import type { Dot } from '@/types/world';

export class ParticleSystem {
  public dots: Dot[] = [];

  public buildWorldDots(worldLength = 18000): void {
    const dots: Dot[] = [];

    // Home / Moss Zone (0 - 5600)
    for (let x = 100; x < 5600; x += 32) {
      dots.push({
        x,
        y: 730 + Math.sin(x / 140) * 8,
        kind: 'neon',
        rgb: [88, 132, 104],
        alpha: 0.4 + Math.random() * 0.3,
        size: 1.5 + Math.random() * 2,
        revealX: Math.max(0, x - 300),
        sway: Math.random() * 2,
        speed: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Taupe / Underground Neon Circuit Zone (6400 - 8300)
    const neonColors: [number, number, number][] = [
      [85, 229, 220],
      [238, 93, 176],
      [232, 210, 85],
      [128, 122, 255],
    ];

    for (let row = 0; row < 6; row++) {
      const y = 1080 - row * 70;
      const color = neonColors[row % neonColors.length];
      const startX = 6420 + (row % 2) * 90;
      const endX = 8340;

      for (let x = startX; x < endX; x += 40) {
        dots.push({
          x,
          y: y + Math.sin(x / 120) * 4,
          kind: 'neon-line',
          rgb: color,
          alpha: 0.45 + Math.random() * 0.2,
          size: 1.8 + Math.random() * 1.5,
          revealX: x - 400,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Islog / Harbor Zone (8900 - 10480)
    for (let x = 8900; x < 10480; x += 45) {
      dots.push({
        x,
        y: 712 + Math.sin(x / 200) * 6,
        kind: 'islog-water',
        rgb: [76, 145, 162],
        alpha: 0.35 + Math.random() * 0.3,
        size: 1.4 + Math.random() * 1.8,
        revealX: x - 350,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Ojicra / Space Realm (11180 - 13280) - Floating Island Stars
    const starColors: [number, number, number][] = [
      [235, 231, 190],
      [178, 145, 190],
      [206, 209, 126],
      [128, 86, 145],
    ];

    for (let i = 0; i < 400; i++) {
      const x = 11180 + Math.random() * 2100;
      const y = -100 + Math.random() * 800;
      const color = starColors[i % starColors.length];
      dots.push({
        x,
        y,
        kind: 'star',
        rgb: color,
        alpha: 0.2 + Math.random() * 0.6,
        size: 1 + Math.random() * 2.5,
        revealX: x - 500,
        parallax: 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Hub / Contact Zone (14000 - 18000)
    const hubColors: [number, number, number][] = [
      [80, 164, 180],
      [230, 112, 174],
      [117, 184, 143],
      [207, 166, 84],
    ];

    for (let x = 14000; x < 17800; x += 36) {
      dots.push({
        x,
        y: 712 + Math.sin(x / 180) * 5,
        kind: 'hub-line',
        rgb: hubColors[Math.floor(Math.random() * hubColors.length)],
        alpha: 0.35 + Math.random() * 0.35,
        size: 1.6 + Math.random() * 1.8,
        revealX: x - 350,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.dots = dots;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    viewportW: number,
    viewportH: number,
    timeMs: number
  ): void {
    const timeSec = timeMs / 1000;
    const pulse = 0.5 + Math.sin(timeSec * 2) * 0.5;
    const frame = { time: timeSec, pulse, scale: 1, waterFill: 1 };

    const minX = cameraX - 200;
    const maxX = cameraX + viewportW + 200;

    for (const dot of this.dots) {
      if (dot.x < minX || dot.x > maxX) continue;

      const output = {
        sx: dot.x - cameraX * (dot.parallax ?? 1),
        sy: dot.y,
        size: dot.size,
        alpha: dot.alpha,
      };

      applyDotMotion(dot, output, frame);

      if (output.alpha <= 0.01) continue;

      ctx.fillStyle = `rgba(${dot.rgb[0]}, ${dot.rgb[1]}, ${dot.rgb[2]}, ${output.alpha})`;
      ctx.beginPath();
      ctx.arc(output.sx, output.sy, Math.max(0.5, output.size), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
