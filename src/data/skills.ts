export interface SkillGroup {
  label: string;
  skills: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    label: 'Languages',
    skills: ['Python', 'Java', 'C/C++', 'JavaScript', 'TypeScript'],
  },
  {
    label: 'ML & AI',
    skills: ['NumPy', 'Pandas', 'scikit-learn', 'TensorFlow/Keras', 'LangChain', 'Ollama', 'RAG Systems', 'Signal Processing'],
  },
  {
    label: 'Web Dev',
    skills: ['Node.js', 'Express.js', 'React', 'Next.js',],
  },
  {
    label: 'Databases',
    skills: ['MongoDB', 'Firebase', 'PostgreSQL', 'SQL'],
  },
  {
    label: 'Cloud & Tools',
    skills: ['AWS', 'Google Cloud', 'Git/GitHub', 'Linux', 'Raspberry Pi', 'ESP32'],
  },
];
