import type { CharacterPose } from '@/types/world';

export class Character {
  public x = 200;
  public y = 712;
  public vx = 0;
  public direction: 1 | -1 = 1;
  public pose: CharacterPose = 'idle';
  public width = 256;
  public height = 193;

  private walkFrame = 0;
  private walkTimer = 0;
  private idleTimer = 0;
  private images: Map<string, HTMLImageElement> = new Map();
  private loaded = false;

  private static readonly WALK_FRAMES = [
    '/characters/character_walk_01.svg',
    '/characters/character_walk_02.svg',
    '/characters/character_walk_03.svg',
    '/characters/character_walk_04.svg',
    '/characters/character_walk_05.svg',
    '/characters/character_walk_06.svg',
  ];

  private static readonly POSES: Record<string, string> = {
    idle: '/characters/character_sit.svg',
    sit: '/characters/character_sit.svg',
    'sit-chill': '/characters/character_sit_chill.svg',
    jump: '/characters/character_jump.svg',
    land: '/characters/character_land.svg',
    'brace-launch': '/characters/character_brace_launch.svg',
    launch: '/characters/character_launch.svg',
  };

  public async preloadAssets(): Promise<void> {
    const urls = [
      ...Character.WALK_FRAMES,
      ...Object.values(Character.POSES),
    ];
    const uniqueUrls = Array.from(new Set(urls));

    const promises = uniqueUrls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            this.images.set(url, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        })
    );

    await Promise.all(promises);
    this.loaded = true;
  }

  public update(
    inputLeft: boolean,
    inputRight: boolean,
    dt: number,
    groundY: number
  ): void {
    const speed = 0.42;
    this.y = groundY;

    let moveDir = 0;
    if (inputLeft) moveDir -= 1;
    if (inputRight) moveDir += 1;

    if (moveDir !== 0) {
      this.vx = moveDir * speed * dt;
      this.direction = moveDir > 0 ? 1 : -1;
      this.x = Math.max(100, Math.min(17800, this.x + this.vx));

      this.idleTimer = 0;
      this.walkTimer += dt;
      if (this.walkTimer >= 88) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % Character.WALK_FRAMES.length;
      }
      this.pose = 'walk';
    } else {
      this.vx = 0;
      this.idleTimer += dt;
      if (this.idleTimer >= 18000) {
        this.pose = 'sit-chill';
      } else if (this.idleTimer >= 8500) {
        this.pose = 'sit';
      } else {
        this.pose = 'idle';
      }
    }
  }

  public getCurrentImage(): HTMLImageElement | null {
    if (!this.loaded) return null;
    let url: string;
    if (this.pose === 'walk') {
      url = Character.WALK_FRAMES[this.walkFrame];
    } else {
      url = Character.POSES[this.pose] || Character.POSES.idle;
    }
    return this.images.get(url) || null;
  }
}
