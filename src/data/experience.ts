export interface Experience {
  role: string;
  org: string;
  year: string;
  description: string;
  type: 'work' | 'event' | 'achievement';
}

export const experiences: Experience[] = [
  {
    role: 'EPM Lead & Event Organizer',
    org: 'TEDx DYPIT',
    year: '2025',
    description:
      'Led the Event Production and Management team, coordinating volunteers and ensuring seamless execution of the event.',
    type: 'event',
  },
  {
    role: 'Technical Event Organizer',
    org: 'Accunetix 13.0 DSA Contest',
    year: '2025',
    description:
      'Co-organized a large-scale technical symposium, managing contest logistics, coordination, and problem-setting for the coding competition.',
    type: 'event',
  },
];

export const achievements = [
  'Smart India Hackathon Finalist — selected from thousands of teams with an independently built ML prototype',
  '20+ Hackathons & CTFs — consistent competitor across domains',
  'AWS & Google Cloud Certified (via Credly, ongoing)',
  'Two patents filed: AutoAttend (facial recognition attendance) and Wahan Mitra (IoT sensor fusion)',
];
