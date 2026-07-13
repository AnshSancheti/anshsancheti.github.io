import React from 'react';
import projects from './projects.json';
import './portfolio.css';

export default function PortfolioPrototype() {
  return (
    <div className="minimal-page">
      <header className="minimal-header">
        <a className="minimal-name" href="/" aria-label="Ansh Sancheti — Home">AS</a>
        <nav aria-label="Primary navigation">
          <a href="/now/">Now</a>
          <a href="mailto:ansh.sancheti@gmail.com">Email</a>
        </nav>
      </header>

      <main id="top">
        <section className="minimal-work" id="work" aria-labelledby="work-heading">
          <div className="minimal-section-title">
            <h2 id="work-heading">Recent selected work</h2>
            <span>Some projects take a few seconds to wake up.</span>
          </div>

          <div className="minimal-projects">
            {projects.map((project) => (
              <a className="minimal-project" href={project.href} target="_blank" rel="noreferrer" key={project.title}>
                <span className="minimal-year">{project.year}</span>
                <span className="minimal-project-copy">
                  <strong>{project.title}</strong>
                  <span>{project.description}</span>
                </span>
                <span className="minimal-tags">{project.tags}</span>
                <span className="minimal-arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </section>

        <section className="minimal-secondary">
          <div className="minimal-column minimal-column-about" id="about">
            <h2>About</h2>
            <p>Committed to answering questions nobody's asked. Based in NYC.</p>
          </div>

          <div className="minimal-column">
            <h2>Artifacts</h2>
            <div className="minimal-links">
              <a href="/?door">Endless Door <span>↗</span></a>
              <a href="https://anshsancheti.github.io/nyc-tree-map/" target="_blank" rel="noreferrer">NYC Tree Foliage <span>↗</span></a>
              <a href="https://anshsancheti.github.io/us-voter-turnout/" target="_blank" rel="noreferrer">US Voter Turnout <span>↗</span></a>
            </div>
          </div>
        </section>

      </main>

      <footer className="minimal-footer">
        <span>Unsupervised</span>
        <div>
          <a href="https://github.com/AnshSancheti">GitHub</a>
          <a href="https://www.linkedin.com/in/ansh-sancheti-10b043aa">LinkedIn</a>
          <a href="mailto:ansh.sancheti@gmail.com">Email</a>
        </div>
      </footer>
    </div>
  );
}
