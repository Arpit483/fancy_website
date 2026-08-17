import { lerp, clamp } from '@/lib/world/utils';

export class Camera {
  public x = 0;
  public targetX = 0;
  public viewportWidth = 1440;
  public viewportHeight = 900;
  public worldLength = 18000;

  constructor(worldLength = 18000) {
    this.worldLength = worldLength;
  }

  public updateViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public update(playerX: number, dt: number, isMoving: boolean): void {
    const anchorRatio = 0.42;
    this.targetX = playerX - this.viewportWidth * anchorRatio;

    const minX = 0;
    const maxX = Math.max(0, this.worldLength - this.viewportWidth);
    this.targetX = clamp(this.targetX, minX, maxX);

    const followFactor = isMoving ? 0.12 : 0.08;
    const factor = 1 - Math.pow(1 - followFactor, dt / 16.67);
    this.x = lerp(this.x, this.targetX, factor);
  }

  public getScreenX(worldX: number, parallax = 1): number {
    return worldX - this.x * parallax;
  }

  public isVisible(worldX: number, margin = 200): boolean {
    return (
      worldX >= this.x - margin &&
      worldX <= this.x + this.viewportWidth + margin
    );
  }
}
