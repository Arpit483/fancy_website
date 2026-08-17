import type { Zone } from '@/types/world';

export const zones: Zone[] = [
  {
    id: 'home',
    label: 'Home',
    xStart: 0,
    xEnd: 2000,
    theme: 'space',
    particleStyle: 'moss',
  },
  {
    id: 'projects',
    label: 'Projects',
    xStart: 2000,
    xEnd: 5600,
    theme: 'light',
    particleStyle: 'moss',
  },
  {
    id: 'fall-taupe',
    label: '',
    xStart: 5600,
    xEnd: 6400,
    theme: 'dark',
    particleStyle: 'taupe',
  },
  {
    id: 'experience',
    label: 'Experience',
    xStart: 6400,
    xEnd: 10480,
    theme: 'dark',
    particleStyle: 'islog',
  },
  {
    id: 'launch',
    label: '',
    xStart: 10480,
    xEnd: 11180,
    theme: 'space',
    particleStyle: 'ojicra',
  },
  {
    id: 'skills',
    label: 'Skills',
    xStart: 11180,
    xEnd: 13280,
    theme: 'space',
    particleStyle: 'ojicra',
  },
  {
    id: 'fall-ground',
    label: '',
    xStart: 13280,
    xEnd: 14020,
    theme: 'warm',
    particleStyle: 'monoomoi',
  },
  {
    id: 'open-source',
    label: 'Open Source',
    xStart: 14020,
    xEnd: 15120,
    theme: 'warm',
    particleStyle: 'monoomoi',
  },
  {
    id: 'hackathons',
    label: 'Hackathons',
    xStart: 15120,
    xEnd: 16360,
    theme: 'warm',
    particleStyle: 'monoerabi',
  },
  {
    id: 'hub',
    label: 'Contact',
    xStart: 16360,
    xEnd: 18000,
    theme: 'warm',
    particleStyle: 'hub',
  },
];

export function zoneAt(x: number): Zone {
  return zones.find((z) => x >= z.xStart && x < z.xEnd) ?? zones[zones.length - 1];
}
