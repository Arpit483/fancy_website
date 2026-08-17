export interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  technologies: string[];
  github: string | null;
  demo: string | null;
  worldX: number;
}

export interface Zone {
  id: string;
  label: string;
  xStart: number;
  xEnd: number;
  theme: 'light' | 'dark' | 'space' | 'warm';
  particleStyle: ParticleStyle;
}

export type ParticleStyle = 'moss' | 'taupe' | 'islog' | 'ojicra' | 'monoomoi' | 'monoerabi' | 'hub';

export interface InputState {
  left: boolean;
  right: boolean;
  interact: boolean;
}

export type CharacterPose =
  | 'idle'
  | 'sit'
  | 'sit-chill'
  | 'walk'
  | 'jump'
  | 'land'
  | 'brace-launch'
  | 'launch'
  | 'fall';

export type QualityMode = 'high' | 'medium' | 'low';

export interface Dot {
  x: number;
  y: number;
  kind: string;
  rgb: [number, number, number];
  alpha: number;
  size: number;
  glow?: number;
  revealX?: number;
  parallax?: number;
  depthAnchor?: number;
  phase?: number;
  sway?: number;
  bob?: number;
  speed?: number;
  route?: [number, number][];
  routeLength?: number;
  routeOffset?: number;
  routeSpeed?: number;
  routePoint?: { x: number; y: number };
  signalTail?: number;
  rainSpan?: number;
  rainSpeed?: number;
  rainOffset?: number;
  rainRouteTravel?: number;
  waterDepth?: number;
}

export interface WorldObject {
  id: string;
  type: 'project' | 'sign' | 'landmark';
  x: number;
  y: number;
  label: string;
  data?: unknown;
}

export interface WorldState {
  x: number;
  vx: number;
  cameraX: number;
  direction: number;
  isMoving: boolean;
  started: boolean;
  idleMs: number;
  maxVisitedX: number;
}
