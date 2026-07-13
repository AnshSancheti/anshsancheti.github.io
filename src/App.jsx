import { memo, useEffect, useRef, useState } from "react";

const PANEL_SIZE = 28;
const DISC_COUNT = PANEL_SIZE * PANEL_SIZE;
const GLYPH_HEIGHT = 7;
const GLYPH_SPACING = 1;
const TEXT_HEIGHT_MULTIPLIER = 2;
const PHRASE_INTERVAL_MS = 3000;
const FLIP_WAVE_MS = 1500;
const MAX_DIAGONAL = (PANEL_SIZE - 1) * 2;
const PHRASES = ["DONGS", "EARTH"];

const GLYPHS = {
  0: ["111", "101", "101", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "010", "010", "111"],
  2: ["111", "001", "001", "111", "100", "100", "111"],
  3: ["111", "001", "001", "111", "001", "001", "111"],
  4: ["101", "101", "101", "111", "001", "001", "001"],
  5: ["111", "100", "100", "111", "001", "001", "111"],
  6: ["111", "100", "100", "111", "101", "101", "111"],
  7: ["111", "001", "001", "001", "001", "001", "001"],
  8: ["111", "101", "101", "111", "101", "101", "111"],
  9: ["111", "101", "101", "111", "001", "001", "111"],
  ":": ["0", "0", "1", "0", "1", "0", "0"],
  " ": ["0", "0", "0", "0", "0", "0", "0"],
  A: ["010", "101", "101", "111", "101", "101", "101"],
  B: ["110", "101", "101", "110", "101", "101", "110"],
  C: ["111", "100", "100", "100", "100", "100", "111"],
  D: ["110", "101", "101", "101", "101", "101", "110"],
  E: ["111", "100", "100", "110", "100", "100", "111"],
  G: ["111", "100", "100", "101", "101", "101", "111"],
  H: ["101", "101", "101", "111", "101", "101", "101"],
  L: ["100", "100", "100", "100", "100", "100", "111"],
  N: ["101", "111", "111", "111", "111", "111", "101"],
  O: ["111", "101", "101", "101", "101", "101", "111"],
  R: ["110", "101", "101", "110", "101", "101", "101"],
  S: ["111", "100", "100", "111", "001", "001", "111"],
  T: ["111", "010", "010", "010", "010", "010", "010"],
  W: ["101", "101", "101", "101", "111", "111", "101"],
};

const DIAGONALS = Array.from({ length: MAX_DIAGONAL + 1 }, () => []);

Array.from({ length: DISC_COUNT }, (_, index) => index).forEach((index) => {
  const row = Math.floor(index / PANEL_SIZE);
  const column = index % PANEL_SIZE;

  DIAGONALS[row + column].push(index);
});

function seededNoise(index, salt) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;

  return value - Math.floor(value);
}

function randomBetween(index, salt, min, max) {
  return min + seededNoise(index, salt) * (max - min);
}

function buildDiscPath(index) {
  const points = Array.from({ length: 11 }, (_, pointIndex) => {
    const angle =
      (pointIndex / 11) * Math.PI * 2 +
      randomBetween(index, 20 + pointIndex, -0.13, 0.13);
    const radius = randomBetween(index, 40 + pointIndex, 34, 51);

    return {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    };
  });
  const tension = 0.95;
  const segment = (value) => value.toFixed(2);
  let path = `M ${segment(points[0].x)} ${segment(points[0].y)}`;

  points.forEach((point, pointIndex) => {
    const previous = points[(pointIndex - 1 + points.length) % points.length];
    const next = points[(pointIndex + 1) % points.length];
    const nextNext = points[(pointIndex + 2) % points.length];
    const controlOne = {
      x: point.x + ((next.x - previous.x) * tension) / 6,
      y: point.y + ((next.y - previous.y) * tension) / 6,
    };
    const controlTwo = {
      x: next.x - ((nextNext.x - point.x) * tension) / 6,
      y: next.y - ((nextNext.y - point.y) * tension) / 6,
    };

    path += ` C ${segment(controlOne.x)} ${segment(controlOne.y)}, ${segment(controlTwo.x)} ${segment(controlTwo.y)}, ${segment(next.x)} ${segment(next.y)}`;
  });

  return `${path} Z`;
}

function buildDiscShape(index) {
  return {
    path: buildDiscPath(index),
    style: {
      "--disc-scale-x": randomBetween(index, 9, 0.9, 1.1).toFixed(3),
      "--disc-scale-y": randomBetween(index, 10, 0.9, 1.1).toFixed(3),
      "--disc-shift-x": `${randomBetween(index, 11, -4.2, 4.2).toFixed(2)}%`,
      "--disc-shift-y": `${randomBetween(index, 12, -4.2, 4.2).toFixed(2)}%`,
      "--wobble": `${randomBetween(index, 13, -4.6, 4.6).toFixed(3)}deg`,
      "--chalk-scuff": randomBetween(index, 14, 0.24, 0.56).toFixed(3),
      "--chalk-off-scuff": randomBetween(index, 15, 0.12, 0.28).toFixed(3),
    },
  };
}

const DISC_SHAPES = Array.from({ length: DISC_COUNT }, (_, index) =>
  buildDiscShape(index),
);

function buildPhraseDiscs(phrase) {
  const grid = Array(DISC_COUNT).fill(false);
  const glyphs = [...phrase.toUpperCase()].map(
    (character) => GLYPHS[character] ?? GLYPHS[" "],
  );
  const phraseWidth =
    glyphs.reduce((width, glyph) => width + glyph[0].length, 0) +
    (glyphs.length - 1) * GLYPH_SPACING;
  const scaleX = Math.max(1, Math.floor(PANEL_SIZE / phraseWidth));
  const scaleY = Math.min(
    Math.floor(PANEL_SIZE / GLYPH_HEIGHT),
    scaleX * TEXT_HEIGHT_MULTIPLIER,
  );
  const startX = Math.floor((PANEL_SIZE - phraseWidth * scaleX) / 2);
  const startY = Math.floor((PANEL_SIZE - GLYPH_HEIGHT * scaleY) / 2);
  let cursorX = startX;

  glyphs.forEach((glyph) => {
    glyph.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell !== "1") {
          return;
        }

        for (let scaledY = 0; scaledY < scaleY; scaledY += 1) {
          for (let scaledX = 0; scaledX < scaleX; scaledX += 1) {
            const gridX = cursorX + x * scaleX + scaledX;
            const gridY = startY + y * scaleY + scaledY;
            grid[gridY * PANEL_SIZE + gridX] = true;
          }
        }
      });
    });

    cursorX += (glyph[0].length + GLYPH_SPACING) * scaleX;
  });

  return grid;
}

function createDiscGrid() {
  return Array(DISC_COUNT).fill(false);
}

function setGridDisc(grid, x, y, active = true) {
  if (x < 0 || x >= PANEL_SIZE || y < 0 || y >= PANEL_SIZE) {
    return;
  }

  grid[y * PANEL_SIZE + x] = active;
}

function drawRect(grid, x, y, width, height, active = true) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      setGridDisc(grid, column, row, active);
    }
  }
}

function drawRoundedRect(grid, x, y, width, height, radius, active = true) {
  const right = x + width - 1;
  const bottom = y + height - 1;

  for (let row = y; row <= bottom; row += 1) {
    for (let column = x; column <= right; column += 1) {
      const innerX = Math.max(x + radius, Math.min(right - radius, column));
      const innerY = Math.max(y + radius, Math.min(bottom - radius, row));

      if (Math.hypot(column - innerX, row - innerY) <= radius + 0.2) {
        setGridDisc(grid, column, row, active);
      }
    }
  }
}

function drawCircle(grid, centerX, centerY, radius, active = true) {
  const radiusSquared = radius * radius;

  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;

      if (dx * dx + dy * dy <= radiusSquared) {
        setGridDisc(grid, x, y, active);
      }
    }
  }
}

function drawLine(grid, startX, startY, endX, endY, thickness = 0.8, active = true) {
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  for (let y = 0; y < PANEL_SIZE; y += 1) {
    for (let x = 0; x < PANEL_SIZE; x += 1) {
      const t = lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, ((x - startX) * dx + (y - startY) * dy) / lengthSquared));
      const closestX = startX + t * dx;
      const closestY = startY + t * dy;

      if (Math.hypot(x - closestX, y - closestY) <= thickness) {
        setGridDisc(grid, x, y, active);
      }
    }
  }
}

function pointInTriangle(px, py, a, b, c) {
  const area =
    0.5 * (-b.y * c.x + a.y * (-b.x + c.x) + a.x * (b.y - c.y) + b.x * c.y);
  const sign = area < 0 ? -1 : 1;
  const s =
    (a.y * c.x - a.x * c.y + (c.y - a.y) * px + (a.x - c.x) * py) * sign;
  const t =
    (a.x * b.y - a.y * b.x + (a.y - b.y) * px + (b.x - a.x) * py) * sign;

  return s >= 0 && t >= 0 && s + t <= 2 * area * sign;
}

function drawTriangle(grid, a, b, c, active = true) {
  const minX = Math.floor(Math.min(a.x, b.x, c.x));
  const maxX = Math.ceil(Math.max(a.x, b.x, c.x));
  const minY = Math.floor(Math.min(a.y, b.y, c.y));
  const maxY = Math.ceil(Math.max(a.y, b.y, c.y));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInTriangle(x, y, a, b, c)) {
        setGridDisc(grid, x, y, active);
      }
    }
  }
}

function buildEmailIcon() {
  const grid = createDiscGrid();

  drawRect(grid, 4, 7, 20, 2);
  drawRect(grid, 4, 19, 20, 2);
  drawRect(grid, 4, 7, 2, 14);
  drawRect(grid, 22, 7, 2, 14);
  drawLine(grid, 5, 8, 14, 16, 0.9);
  drawLine(grid, 23, 8, 14, 16, 0.9);
  drawLine(grid, 5, 20, 12, 14, 0.7);
  drawLine(grid, 23, 20, 16, 14, 0.7);

  return grid;
}

function buildLinkedInIcon() {
  const grid = createDiscGrid();

  drawRoundedRect(grid, 5, 5, 18, 18, 3);
  drawRoundedRect(grid, 7, 7, 14, 14, 2, false);
  drawCircle(grid, 9, 9, 1.55);
  drawRect(grid, 8, 13, 3, 8);
  drawRect(grid, 12, 13, 3, 8);
  drawRect(grid, 15, 13, 3, 3);
  drawRect(grid, 17, 15, 3, 6);

  return grid;
}

function buildGitHubIcon() {
  const grid = createDiscGrid();

  drawCircle(grid, 14, 14, 8.2);
  drawTriangle(grid, { x: 7, y: 9 }, { x: 8, y: 4 }, { x: 12, y: 8 });
  drawTriangle(grid, { x: 16, y: 8 }, { x: 20, y: 4 }, { x: 21, y: 9 });
  drawCircle(grid, 11, 13, 1.1, false);
  drawCircle(grid, 17, 13, 1.1, false);
  drawRect(grid, 12, 17, 4, 2, false);
  drawRect(grid, 10, 21, 8, 3);
  drawRect(grid, 11, 23, 2, 3);
  drawRect(grid, 15, 23, 2, 3);

  return grid;
}

const LINK_TARGETS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/ansh-sancheti-10b043aa/",
    external: true,
    discs: buildLinkedInIcon(),
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/AnshSancheti",
    external: true,
    discs: buildGitHubIcon(),
  },
  {
    id: "email",
    label: "Email",
    href: "mailto:anshsancheti@gmail.com",
    external: false,
    discs: buildEmailIcon(),
  },
];

function buildTransitionSchedule(fromDiscs, toDiscs) {
  return DIAGONALS.reduce((schedule, discIndexes, diagonal) => {
    const changes = discIndexes
      .filter((index) => fromDiscs[index] !== toDiscs[index])
      .map((index) => ({ index, active: toDiscs[index] }));

    if (changes.length > 0) {
      schedule.push({
        delay: (diagonal / MAX_DIAGONAL) * FLIP_WAVE_MS,
        changes,
      });
    }

    return schedule;
  }, []);
}

const PHRASE_DISCS = PHRASES.map((phrase) => buildPhraseDiscs(phrase));

function getInitialLinkTarget() {
  if (typeof window === "undefined") {
    return null;
  }

  const previewId = new URLSearchParams(window.location.search).get("preview");

  return LINK_TARGETS.find((target) => target.id === previewId) ?? null;
}

const Disc = memo(function Disc({ active, shape }) {
  return (
    <span
      className={`disc${active ? " disc--active" : ""}`}
      aria-hidden="true"
      style={shape.style}
    >
      <span className="disc__rotor" aria-hidden="true">
        <span className="disc__face disc__face--off">
          <svg className="disc__blob" viewBox="0 0 100 100" aria-hidden="true">
            <path className="disc__blob-shape" d={shape.path} />
            <path className="disc__blob-scuff" d={shape.path} />
          </svg>
        </span>
        <span className="disc__face disc__face--on">
          <svg className="disc__blob" viewBox="0 0 100 100" aria-hidden="true">
            <path className="disc__blob-shape" d={shape.path} />
            <path className="disc__blob-scuff" d={shape.path} />
          </svg>
        </span>
      </span>
    </span>
  );
});

function App() {
  const initialLinkTargetRef = useRef(getInitialLinkTarget());
  const initialDisplayedDiscs = initialLinkTargetRef.current?.discs ?? PHRASE_DISCS[0];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedDiscs, setDisplayedDiscs] = useState(initialDisplayedDiscs);
  const [activeLinkId, setActiveLinkId] = useState(
    initialLinkTargetRef.current?.id ?? null,
  );
  const phrase = PHRASES[phraseIndex];
  const activeLink = LINK_TARGETS.find((target) => target.id === activeLinkId);
  const displayLabel = activeLink ? `${activeLink.label} icon` : phrase;
  const displayedDiscsRef = useRef(initialDisplayedDiscs);
  const phraseIndexRef = useRef(0);
  const activeLinkIdRef = useRef(initialLinkTargetRef.current?.id ?? null);
  const waveTimeoutIdRef = useRef(null);

  function setDisplay(nextDiscs) {
    displayedDiscsRef.current = nextDiscs;
    setDisplayedDiscs(nextDiscs);
  }

  function clearWaveTimeout() {
    window.clearTimeout(waveTimeoutIdRef.current);
    waveTimeoutIdRef.current = null;
  }

  function runWaveTo(targetDiscs) {
    clearWaveTimeout();

    const transition = {
      toDiscs: targetDiscs,
      steps: buildTransitionSchedule(displayedDiscsRef.current, targetDiscs),
    };

    function runStep(stepIndex = 0) {
      if (stepIndex >= transition.steps.length) {
        setDisplay(transition.toDiscs);
        return;
      }

      const step = transition.steps[stepIndex];
      const previousDelay =
        stepIndex > 0 ? transition.steps[stepIndex - 1].delay : 0;
      const waitTime = Math.max(0, step.delay - previousDelay);

      waveTimeoutIdRef.current = window.setTimeout(() => {
        const nextDiscs = [...displayedDiscsRef.current];

        step.changes.forEach(({ index, active }) => {
          nextDiscs[index] = active;
        });

        setDisplay(nextDiscs);
        runStep(stepIndex + 1);
      }, waitTime);
    }

    runStep();
  }

  function showLinkIcon(linkId) {
    const linkTarget = LINK_TARGETS.find((target) => target.id === linkId);

    if (!linkTarget) {
      return;
    }

    activeLinkIdRef.current = linkId;
    setActiveLinkId(linkId);
    runWaveTo(linkTarget.discs);
  }

  function hideLinkIcon(linkId) {
    if (activeLinkIdRef.current !== linkId) {
      return;
    }

    activeLinkIdRef.current = null;
    setActiveLinkId(null);
    runWaveTo(PHRASE_DISCS[phraseIndexRef.current]);
  }

  useEffect(() => {
    function showNextPhrase() {
      if (activeLinkIdRef.current) {
        return;
      }

      const nextPhraseIndex = (phraseIndexRef.current + 1) % PHRASES.length;

      phraseIndexRef.current = nextPhraseIndex;
      setPhraseIndex(nextPhraseIndex);
      runWaveTo(PHRASE_DISCS[nextPhraseIndex]);
    }

    const intervalId = window.setInterval(showNextPhrase, PHRASE_INTERVAL_MS);

    return () => {
      clearWaveTimeout();
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <main
      className="screen"
      aria-label={`${PANEL_SIZE} by ${PANEL_SIZE} flip-disc phrase panel`}
      style={{
        "--panel-cells": PANEL_SIZE,
      }}
    >
      <section
        className="chalk-object"
        aria-label={`Flip-disc panel showing ${displayLabel}`}
      >
        <div className="panel" aria-hidden="true">
          {displayedDiscs.map((active, index) => (
            <Disc key={index} active={active} shape={DISC_SHAPES[index]} />
          ))}
        </div>
      </section>
      <nav className="social-links" aria-label="Contact links">
        {LINK_TARGETS.map((target) => (
          <a
            key={target.id}
            className={`social-link${activeLinkId === target.id ? " social-link--active" : ""}`}
            href={target.href}
            onBlur={() => hideLinkIcon(target.id)}
            onFocus={() => showLinkIcon(target.id)}
            onMouseEnter={() => showLinkIcon(target.id)}
            onMouseLeave={() => hideLinkIcon(target.id)}
            rel={target.external ? "noopener noreferrer" : undefined}
            target={target.external ? "_blank" : undefined}
          >
            {target.label}
          </a>
        ))}
      </nav>
    </main>
  );
}

export default App;
