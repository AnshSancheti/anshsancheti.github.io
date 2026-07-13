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
          <a href="mailto:ansh.sancheti@gmail.com">Email</a>
        </nav>
      </header>

      <main className="minimal-now">
        <section className="minimal-now-intro" aria-labelledby="now-heading">
          <h1 id="now-heading">Now</h1>
          <div>
            <p>{now.intro}</p>
            <span>Updated {now.updated}</span>
          </div>
        </section>

        <section className="minimal-now-items" aria-label="Current projects">
          {now.items.map((item) => (
            <article className="minimal-now-item" key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
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
