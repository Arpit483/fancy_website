import { projects } from '@/data/projects';
import type { WorldObject } from '@/types/world';

export class WorldObjectsManager {
  public objects: WorldObject[] = [];

  constructor() {
    this.initObjects();
  }

  private initObjects(): void {
    const list: WorldObject[] = [];

    // Intro Landmark
    list.push({
      id: 'intro-sign',
      type: 'landmark',
      x: 300,
      y: 650,
      label: 'ARPIT DEOSTHALE — Software Engineer',
    });

    // Project Landmarks
    for (const p of projects) {
      list.push({
        id: `project-${p.id}`,
        type: 'project',
        x: p.worldX,
        y: 650,
        label: `${p.title} — ${p.subtitle}`,
        data: p,
      });
    }

    // Zone Markers
    list.push({
      id: 'zone-experience',
      type: 'sign',
      x: 6500,
      y: 1040,
      label: 'ACT I / EXPERIENCE & RECOGNITIONS',
    });

    list.push({
      id: 'zone-skills',
      type: 'sign',
      x: 11200,
      y: 200,
      label: 'ACT II / SKILLS & ARCHITECTURE',
    });

    list.push({
      id: 'zone-contact',
      type: 'sign',
      x: 14100,
      y: 650,
      label: 'ACT III / CONTACT & SUMMARY',
    });

    this.objects = list;
  }

  public getNearObject(playerX: number, radius = 120): WorldObject | null {
    for (const obj of this.objects) {
      if (Math.abs(obj.x - playerX) <= radius) {
        return obj;
      }
    }
    return null;
  }
}
