import React from 'react';
import now from './now.json';
import './portfolio.css';

export default function NowPage() {
  return (
    <div className="minimal-page">
      <header className="minimal-header">
        <a className="minimal-name" href="/" aria-label="Ansh Sancheti — Home">AS</a>
        <nav aria-label="Primary navigation">
          <a href="/now/" aria-current="page">Now</a>
        </nav>
      </header>

      <main className="minimal-now" aria-label="Now">
        <div className="minimal-now-copy">
          <p>
            {now.employment.prefix}
            <a href={now.employment.href}><strong>{now.employment.company}</strong></a>.
          </p>
          <p>
            {now.artificialTaste.prefix}<strong>{now.artificialTaste.title}</strong>.{' '}
            {now.artificialTaste.reflection}
          </p>
          <p>
            {now.forecastBench.prefix}
            <a href={now.forecastBench.href}>{now.forecastBench.title}</a>
            {now.forecastBench.suffix}
          </p>
          <span>Updated {now.updated}</span>
        </div>
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
