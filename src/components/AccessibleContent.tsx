import React from 'react';
import siteContent from '@/data/site-content.json';

export const AccessibleContent: React.FC = () => {
  const { personal, featuredProjects, skills, experience, achievements } = siteContent;

  return (
    <div className="sr-only">
      <header>
        <h1>{personal.name} — Interactive Portfolio &amp; Walkable Atlas</h1>
        <p>{personal.bio}</p>
      </header>

      <section>
        <h2>Featured Projects</h2>
        {featuredProjects.map((proj) => (
          <article key={proj.id}>
            <h3>{proj.title}</h3>
            <p>{proj.subtitle}</p>
            <p>{proj.description}</p>
            <p>Technologies: {proj.tech.join(', ')}</p>
            {proj.github && <a href={proj.github}>GitHub Repository</a>}
          </article>
        ))}
      </section>

      <section>
        <h2>Technical Skills</h2>
        {Object.entries(skills).map(([category, list]) => (
          <div key={category}>
            <h3>{category}</h3>
            <ul>
              {list.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h2>Honors &amp; Achievements</h2>
        <ul>
          {achievements.map((ach, idx) => (
            <li key={idx}>{ach}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Experience &amp; Leadership</h2>
        {experience.map((exp, idx) => (
          <article key={idx}>
            <h3>
              {exp.role} — {exp.org} ({exp.year})
            </h3>
            <p>{exp.description}</p>
          </article>
        ))}
      </section>

      <footer>
        <p>Location: {personal.location}</p>
        <p>Email: {personal.email}</p>
        <p>GitHub: {personal.github}</p>
        <p>LinkedIn: {personal.linkedin}</p>
      </footer>
    </div>
  );
};
