import type { Project } from '@/types/world';

export const projects: Project[] = [
  {
    id: 'vital-radar',
    title: 'VITAL Radar',
    subtitle: 'ML-Based Human Detection — SIH Finalist',
    description:
      'Owned the full product lifecycle end-to-end: problem framing, model training, real-time inference, and live demo. Selected for Smart India Hackathon Finals from thousands of entries. Trained and deployed ML classification models on Raspberry Pi behind a Flask REST backend for reliable real-time radar-based human detection under real-world conditions, with Firebase integration for remote monitoring.',
    technologies: ['Python', 'scikit-learn', 'Raspberry Pi', 'Flask', 'Firebase'],
    github: null,
    demo: null,
    worldX: 2600,
  },
  {
    id: 'wahan-mitra',
    title: 'Wahan Mitra',
    subtitle: 'Intelligent IoT Headlamp Automation',
    description:
      'Self-initiated IoT system on ESP32 with multi-sensor fusion (IR, ultrasonic, LDR) to solve a real low-visibility driving problem from scratch. Implements real-time environment classification and automated beam-switching logic — embedded AI and sensor-driven inference with no reference template. Patent filed.',
    technologies: ['ESP32', 'Embedded C', 'IR/Ultrasonic/LDR Sensors'],
    github: null,
    demo: null,
    worldX: 3400,
  },
  {
    id: 'autoattend',
    title: 'AutoAttend',
    subtitle: 'AI-Powered Facial Recognition Attendance',
    description:
      'Team-based, facial-recognition attendance system replacing manual, proxy-prone tracking, with a Java Android frontend and a Python/Flask backend. REST APIs handle real-time face detection, attendance marking, role-based access across student/teacher/admin roles, and Excel-based report exports. Patent filed.',
    technologies: ['Python', 'Flask', 'OpenCV', 'PostgreSQL', 'Firebase', 'Android'],
    github: null,
    demo: null,
    worldX: 4100,
  },
  {
    id: 'legal-doc-analyzer',
    title: 'Legal Document Analyzer',
    subtitle: 'LLM-Powered Document Intelligence',
    description:
      'AI platform that extracts, summarizes, and interprets legal documents using LLMs, reducing manual review effort on complex contracts and legal texts. Implements document ingestion, semantic search, and context-aware question answering via RAG.',
    technologies: ['Python', 'LangChain', 'NLP', 'RAG', 'Ollama'],
    github: null,
    demo: null,
    worldX: 9400,
  },
  {
    id: 'hack2hire',
    title: 'Hack2Hire',
    subtitle: 'AI-Powered Mock Interview Platform',
    description:
      'Hackathon build simulating realistic technical interviews with AI-generated questions and instant feedback. Built in 24 hours at a hackathon — demonstrates rapid prototyping and full-stack integration with modern LLMs.',
    technologies: ['React 18', 'Vite', 'Tailwind', 'Gemini API'],
    github: 'https://github.com/Arpit483/Hack2Hire',
    demo: null,
    worldX: 10200,
  },
  {
    id: 'odysseus',
    title: 'Odysseus — Open Source',
    subtitle: 'Confirmed Bugfix Contribution',
    description:
      'Diagnosed and fixed a Error in routes/chat_routes.py in the Odysseus open-source project, submitted as a PR to the dev branch. Worked on Windows with uv tooling. Demonstrates ability to read unfamiliar codebases and contribute cleanly.',
    technologies: ['Python', 'uv'],
    github: 'https://github.com/pewdiepie-archdaemon/odysseus',
    demo: null,
    worldX: 14500,
  },
];
