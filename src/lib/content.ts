import siteContent from '@/data/site-content.json';

export interface SiteContent {
  personal: {
    name: string;
    brandTitle: string;
    tagline: string;
    bio: string;
    location: string;
    email: string;
    github: string;
    linkedin: string;
  };
  uiCopy: {
    walkStatus: string;
    actionStatus: string;
    tiltEnable: string;
    tiltDisable: string;
    tiltPermission: string;
    tiltActive: string;
    tiltDenied: string;
    tiltUnsupported: string;
    soundEnable: string;
    soundDisable: string;
    discoveryKicker: string;
    openArticle: string;
    nextArticle: string;
    returnWorld: string;
    transitionEntering: string;
    touchLabels: Record<string, string>;
  };
  domainPaths: Array<{
    id: string;
    label: string;
    icon: string;
    borderStyle: string;
    fontWeight: string;
    description: string;
  }>;
  featuredProjects: Array<{
    id: string;
    title: string;
    subtitle: string;
    description: string;
    tags: string[];
    tech: string[];
    github: string | null;
    demo: string | null;
    worldX: number;
  }>;
  skills: Record<string, string[]>;
  experience: Array<{
    role: string;
    org: string;
    year: string;
    description: string;
  }>;
  achievements: string[];
}

export const getContent = (): SiteContent => siteContent as SiteContent;
