const fs = require('fs');
const path = require('path');
const projects = require('../src/portfolio/projects.json');
const now = require('../src/portfolio/now.json');

const siteUrl = 'https://anshsancheti.github.io/';
const buildIndex = path.join(__dirname, '..', 'build', 'index.html');
const buildNowDirectory = path.join(__dirname, '..', 'build', 'now');

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const absoluteUrl = (href) => new URL(href, siteUrl).href;

const projectRows = projects.map((project) => `
            <a class="minimal-project" href="${escapeHtml(project.href)}" target="_blank" rel="noreferrer">
              <span class="minimal-project-copy">
                <strong>${escapeHtml(project.title)}</strong>
                <span>${escapeHtml(project.description)}</span>
              </span>
              <span class="minimal-tags">${escapeHtml(project.tags)}</span>
              <span class="minimal-arrow" aria-hidden="true"></span>
            </a>`).join('');

const staticPortfolio = `
    <div class="minimal-page">
      <header class="minimal-header">
        <a class="minimal-name" href="/" aria-label="Ansh Sancheti — Home">AS</a>
        <nav aria-label="Primary navigation">
          <a href="/now/">Now</a>
          <a href="mailto:ansh.sancheti@gmail.com">Email</a>
        </nav>
      </header>
      <main id="top">
        <section class="minimal-work" id="work" aria-labelledby="work-heading">
          <div class="minimal-section-title">
            <h2 id="work-heading">Selected work</h2>
            <span>Some projects take a few seconds to wake up.</span>
          </div>
          <div class="minimal-projects">${projectRows}
          </div>
        </section>
        <section class="minimal-secondary">
          <div class="minimal-column minimal-column-about" id="about">
            <h2>About</h2>
            <p>Committed to answering questions nobody's asked. Based in NYC.</p>
          </div>
          <div class="minimal-column">
            <h2>Artifacts</h2>
            <div class="minimal-links">
              <a href="/?door">Endless Door <span class="minimal-arrow" aria-hidden="true"></span></a>
              <a href="https://anshsancheti.github.io/nyc-tree-map/" target="_blank" rel="noreferrer">NYC Tree Foliage <span class="minimal-arrow" aria-hidden="true"></span></a>
              <a href="https://anshsancheti.github.io/us-voter-turnout/" target="_blank" rel="noreferrer">US Voter Turnout <span class="minimal-arrow" aria-hidden="true"></span></a>
            </div>
          </div>
        </section>
      </main>
      <footer class="minimal-footer">
        <span>Unsupervised</span>
        <div>
          <a href="https://github.com/AnshSancheti">GitHub</a>
          <a href="https://www.linkedin.com/in/ansh-sancheti-10b043aa">LinkedIn</a>
          <a href="mailto:ansh.sancheti@gmail.com">Email</a>
        </div>
      </footer>
    </div>`;

const nowItems = now.items.map((item) => `
          <article class="minimal-now-item">
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.description)}</p>
          </article>`).join('');

const staticNow = `
    <div class="minimal-page">
      <header class="minimal-header">
        <a class="minimal-name" href="/" aria-label="Ansh Sancheti — Home">AS</a>
        <nav aria-label="Primary navigation">
          <a href="/now/" aria-current="page">Now</a>
          <a href="mailto:ansh.sancheti@gmail.com">Email</a>
        </nav>
      </header>
      <main class="minimal-now">
        <section class="minimal-now-intro" aria-labelledby="now-heading">
          <h1 id="now-heading">Now</h1>
          <div>
            <p>${escapeHtml(now.intro)}</p>
            <span>Updated ${escapeHtml(now.updated)}</span>
          </div>
        </section>
        <section class="minimal-now-items" aria-label="Current projects">${nowItems}
        </section>
      </main>
      <footer class="minimal-footer">
        <span>Unsupervised</span>
        <div>
          <a href="https://github.com/AnshSancheti">GitHub</a>
          <a href="https://www.linkedin.com/in/ansh-sancheti-10b043aa">LinkedIn</a>
          <a href="mailto:ansh.sancheti@gmail.com">Email</a>
        </div>
      </footer>
    </div>`;

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}#website`,
      url: siteUrl,
      name: 'Ansh Sancheti — Projects',
      description: 'Projects and experiments by Ansh Sancheti, a software engineer in New York.',
      author: { '@id': `${siteUrl}#ansh` },
    },
    {
      '@type': 'Person',
      '@id': `${siteUrl}#ansh`,
      name: 'Ansh Sancheti',
      url: siteUrl,
      jobTitle: 'Software engineer',
      homeLocation: { '@type': 'Place', name: 'New York, NY' },
      sameAs: [
        'https://github.com/AnshSancheti',
        'https://www.linkedin.com/in/ansh-sancheti-10b043aa',
      ],
    },
    {
      '@type': 'ItemList',
      '@id': `${siteUrl}#selected-work`,
      name: 'Selected work by Ansh Sancheti',
      numberOfItems: projects.length,
      itemListElement: projects.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': ['CreativeWork', 'SoftwareApplication'],
          name: project.title,
          description: project.description,
          url: absoluteUrl(project.href),
          dateCreated: project.year,
          keywords: project.tags.split(',').map((tag) => tag.trim()),
          creator: { '@id': `${siteUrl}#ansh` },
        },
      })),
    },
  ],
};

const nowStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  '@id': `${siteUrl}now/#page`,
  url: `${siteUrl}now/`,
  name: 'Now — Ansh Sancheti',
  description: now.intro,
  dateModified: '2026-07-13',
  mainEntity: {
    '@type': 'Person',
    '@id': `${siteUrl}#ansh`,
    name: 'Ansh Sancheti',
    url: siteUrl,
  },
};

const template = fs.readFileSync(buildIndex, 'utf8');

if (!template.includes('<div id="root"></div>')) {
  throw new Error('Could not find the empty React root in build/index.html.');
}

const structuredDataMarker = /<script id="portfolio-structured-data"[^>]*>.*?<\/script>/;

if (!structuredDataMarker.test(template)) {
  throw new Error('Could not find the structured-data marker in build/index.html.');
}

const injectPage = (content, data) => template
  .replace('<div id="root"></div>', `<div id="root">${content}\n  </div>`)
  .replace(
    structuredDataMarker,
    `<script id="portfolio-structured-data" type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`,
  );

const homeHtml = injectPage(staticPortfolio, structuredData);
const nowDescription = 'What Ansh Sancheti is building and thinking about now.';
const nowHtml = injectPage(staticNow, nowStructuredData)
  .replace('<title>Ansh Sancheti — Projects</title>', '<title>Now — Ansh Sancheti</title>')
  .replace(
    'content="Projects and experiments by Ansh Sancheti, a software engineer in New York: AI agents, large-scale data maps, games, archives, and tools."',
    `content="${nowDescription}"`,
  )
  .replace('href="https://anshsancheti.github.io/"', 'href="https://anshsancheti.github.io/now/"')
  .replace('content="Ansh Sancheti — Projects"', 'content="Now — Ansh Sancheti"')
  .replace(
    'content="AI agents, large-scale data maps, games, archives, and other experiments by Ansh Sancheti."',
    `content="${nowDescription}"`,
  )
  .replace('content="https://anshsancheti.github.io/"', 'content="https://anshsancheti.github.io/now/"')
  .replace('content="Ansh Sancheti — Projects"', 'content="Now — Ansh Sancheti"')
  .replace(
    'content="AI agents, large-scale data maps, games, archives, and other experiments by Ansh Sancheti."',
    `content="${nowDescription}"`,
  );

fs.writeFileSync(buildIndex, homeHtml);
fs.mkdirSync(buildNowDirectory, { recursive: true });
fs.writeFileSync(path.join(buildNowDirectory, 'index.html'), nowHtml);
