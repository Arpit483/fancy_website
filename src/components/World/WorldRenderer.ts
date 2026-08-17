import type { Camera } from './Camera';
import type { Character } from './Character';
import type { ParticleSystem } from './ParticleSystem';
import type { WorldObjectsManager } from './WorldObjects';
import { zoneAt } from '@/data/zones';

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  character: Character,
  particles: ParticleSystem,
  objectsManager: WorldObjectsManager,
  timeMs: number
): void {
  const { viewportWidth: w, viewportHeight: h } = camera;

  // 1. Clear background
  ctx.clearRect(0, 0, w, h);

  // Determine current background theme based on camera position
  const currentZone = zoneAt(camera.x + w * 0.4);
  let bgGrad: CanvasGradient;

  if (currentZone.theme === 'dark') {
    bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#06080e');
    bgGrad.addColorStop(1, '#0e111a');
  } else if (currentZone.theme === 'space') {
    bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#050309');
    bgGrad.addColorStop(1, '#0f0a1c');
  } else if (currentZone.theme === 'warm') {
    bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#fcfaf6');
    bgGrad.addColorStop(1, '#f2ece0');
  } else {
    bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(1, '#f7f5ef');
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Render particle system dots (parallax & animated)
  particles.render(ctx, camera.x, w, h, timeMs);

  // 3. Render Ground Line
  const groundY = character.y + 160;
  const isDark = currentZone.theme === 'dark' || currentZone.theme === 'space';
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();

  // 4. Render World Objects & Landmarks
  for (const obj of objectsManager.objects) {
    if (!camera.isVisible(obj.x)) continue;
    const screenX = camera.getScreenX(obj.x);

    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

    if (obj.type === 'project') {
      // Draw project landmark structure
      ctx.beginPath();
      ctx.rect(screenX - 40, groundY - 80, 80, 80);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isDark ? '#ffffff' : '#111111';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label.split('—')[0].trim(), screenX, groundY - 95);

      // Press E indicator if character is nearby
      if (Math.abs(character.x - obj.x) < 120) {
        ctx.fillStyle = isDark ? '#f59e0b' : '#d97706';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText('[ Press E to view ]', screenX, groundY - 115);
      }
    } else if (obj.type === 'sign') {
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
      ctx.font = '500 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`— ${obj.label} —`, screenX, groundY - 30);
    }
  }

  // 5. Render Character
  const charScreenX = camera.getScreenX(character.x);
  const charImage = character.getCurrentImage();

  if (charImage) {
    ctx.save();
    ctx.translate(charScreenX, character.y);
    if (character.direction === -1) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      charImage,
      -character.width / 2,
      -character.height / 2,
      character.width,
      character.height
    );
    ctx.restore();
  }
}
