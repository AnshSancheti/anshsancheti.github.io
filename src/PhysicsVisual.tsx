import React, { useEffect, useRef, useState } from "react";

// Rotating circle with a gap; gravity-enabled balls bounce inside and with each other.
// When a ball escapes through the gap, it despawns and (optionally) spawns 2 new balls at center.
// Single-file React component. Tailwind is optional but used for layout cosmetics.

// ---- Simulation Types ----
type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  h?: number; // hue for styled rendering
  s?: number; // saturation %
  l?: number; // lightness %
  // Escape + fade lifecycle
  escapedAt?: number; // ms timestamp (performance.now)
  spawned?: boolean; // whether we've spawned replacements for this ball
  opacity?: number; // 0..1 for fade-out after delay
  trail?: { x: number; y: number; r: number }[]; // short-lived trail positions
  gapOutsideTicks?: number;
  exitGraceUntil?: number; // ms timestamp to ignore ring collisions briefly
};

// ---- Math helpers (with simple dev tests below) ----
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function wrapAngle(theta: number) {
  const t = theta % (Math.PI * 2);
  return t < 0 ? t + Math.PI * 2 : t;
}

function angleInArc(angle: number, arcStart: number, arcLen: number) {
  const a = wrapAngle(angle);
  const s = wrapAngle(arcStart);
  let e = s + arcLen;
  if (e < Math.PI * 2) {
    return a >= s && a <= e;
  } else {
    e -= Math.PI * 2; // wrapped end
    return a >= s || a <= e;
  }
}

// ---- Dev tests (run in dev only) ----
function devAssert(name: string, cond: boolean) {
  if (!cond) console.warn("[RotatingGateBalls test] FAIL:", name);
}
function runDevTests() {
  // wrapAngle range
  for (const ang of [-10 * Math.PI, -3.1, -0.1, 0, 0.1, 6.28, 10 * Math.PI]) {
    const w = wrapAngle(ang);
    devAssert(`wrapAngle(${ang}) in [0,2π)`, w >= 0 && w < Math.PI * 2);
  }
  // angleInArc simple, non-wrapping
  const start = 0, len = Math.PI / 2; // [0, 90°]
  devAssert("angleInArc(45°) true", angleInArc(Math.PI / 4, start, len) === true);
  devAssert("angleInArc(180°) false", angleInArc(Math.PI, start, len) === false);
  // wrapping arc e.g. [315°, 45°]
  const s2 = (7 * Math.PI) / 4; // 315°
  const l2 = Math.PI / 2; // 90° span -> wraps
  devAssert("angleInArc(350°) true", angleInArc((350 * Math.PI) / 180, s2, l2) === true);
  devAssert("angleInArc(10°) true", angleInArc((10 * Math.PI) / 180, s2, l2) === true);
  devAssert("angleInArc(180°) false (wrap)", angleInArc(Math.PI, s2, l2) === false);
}

let GLOBAL_ID = 1;

export default function RotatingGateBalls() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const isRunningRef = useRef(true);
  // Ball count state removed (unused in UI)
  const overlayRef = useRef<HTMLDivElement | null>(null);
  // Simulation clock (ms), advances only while running
  const simNowMsRef = useRef<number>(0);

  // Tunables
  const gapPercent = 0.15; // ~15% of circumference
  const rotationSpeed = 0.6; // rad/s
  const gravity = 1400; // px/s^2
  const restitutionWall = 1.00; // slightly more elastic wall collisions
  const restitutionBall = 0.98; // slightly more elastic ball-ball
  // const minBounceSpeed = 260; // stronger push off from the wall (unused)
  const airDrag = 0.000; // per frame linear drag (0..0.01)
  const maxBalls = 300; // safety cap to avoid browser meltdown
  const minBallRadius = 10; // keep balls a bit larger overall
  const initialRadius = 10; // start slightly larger

  // Spawn throttling: when too many balls, disable splitting until one remains
  const spawnEnabledRef = useRef<boolean>(true);

  // Mutable simulation state kept in refs to avoid re-renders each tick
  const ballsRef = useRef<Ball[]>([]);
  const gapStartRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const centerRef = useRef({ x: 0, y: 0, R: 0 });
  const isMobileRef = useRef<boolean>(false);
  const ringGlowRef = useRef<number>(0); // 0..1 visual glow intensity

  // Mount: set up canvas sizing, tests, RAF loop, and initial ball
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw <= 768; // basic mobile breakpoint
      isMobileRef.current = isMobile;

      // CSS size
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      // Backing store
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);

      // 1 CSS px units
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Circle positioning: desktop on the right; mobile centered above text
      const padding = 16;
      let circleDia: number;
      if (isMobile) {
        circleDia = Math.min(vw, vh) * 0.86;
      } else {
        // Constrain by available width after reserving space for the text block
        const sidePadRight = 60; // visual offset from right edge
        const leftMargin = Math.min(vw * 0.07, 80);
        const textWidth = Math.min(560, vw * 0.45); // responsive text column width
        const gutter = 32; // breathing room between text and circle
        const baseDia = Math.min(vw, vh) * 0.8;
        const widthCap = vw - (leftMargin + textWidth + gutter) - sidePadRight + padding;
        const heightCap = vh - 2 * padding;
        circleDia = Math.max(120, Math.min(baseDia, widthCap, heightCap));
      }

      const R = Math.max(8, circleDia / 2 - padding);
      const cx = isMobile ? vw / 2 : vw - circleDia / 2 - 60;
      const cy = isMobile ? Math.max(R + padding + 12, vh * 0.38) : vh / 2;
      centerRef.current = { x: cx, y: cy, R };

      // Position the overlay on mobile: centered between circle bottom and viewport bottom
      const ov = overlayRef.current;
      if (ov) {
        if (isMobile) {
          const circleBottom = cy + R;
          // Ensure layout is up to date before measuring height
          // Use rAF to avoid thrashing; schedule immediately
          requestAnimationFrame(() => {
            const h = ov.offsetHeight || 0;
            const gutter = 12; // space between circle and overlay, and overlay and bottom
            const targetCenter = Math.max(circleBottom + gutter, (circleBottom + vh) / 2);
            let top = Math.round(targetCenter - h / 2);
            const minTop = Math.round(circleBottom + gutter);
            const maxTop = Math.round(vh - h - gutter);
            if (!Number.isNaN(top)) {
              top = Math.max(minTop, Math.min(maxTop, top));
              ov.style.left = '50%';
              ov.style.transform = 'translateX(-50%)';
              ov.style.top = `${top}px`;
              ov.style.bottom = 'auto';
            }
          });
        } else {
          // Clear overrides to use desktop CSS positioning
          ov.style.top = '';
          ov.style.bottom = '';
          ov.style.left = '';
          ov.style.transform = '';
        }
      }
    }

    // First layout + tests + initial state
    resize();
    if (process.env.NODE_ENV !== "production") runDevTests();

    // Initialize with a single ball at center (after we know center)
    const { x: cx, y: cy } = centerRef.current;
    ballsRef.current = [makeBall(cx, cy, initialRadius)];
    // initial ball already seeded; no UI counter to update

    // Animation loop
    lastTRef.current = performance.now();
    const tick = () => {
      const now = performance.now();
      let dt = (now - lastTRef.current) / 1000; // seconds
      lastTRef.current = now;
      // clamp dt to avoid huge jumps when tab is inactive
      dt = clamp(dt, 0, 0.033); // ~30 FPS max step

      if (isRunningRef.current) {
        // Advance simulation clock only when running
        simNowMsRef.current += dt * 1000;
        stepSimulation(dt);
        draw();
      } else {
        draw();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function makeBall(x: number, y: number, radius: number): Ball {
    // Curated but more varied palette around the ring’s blue/cyan
    // Slight variance in hue, saturation, and lightness for visual richness
    const hue = Math.floor(185 + Math.random() * 50); // 185..235 (teal → blue → periwinkle)
    const sat = 64 + Math.floor(Math.random() * 16); // 64..79 %
    const light = 52 + Math.floor(Math.random() * 12); // 52..63 %
    return {
      id: GLOBAL_ID++,
      x,
      y,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.8) * 120, // slight initial upward bias
      r: radius,
      color: `hsl(${hue} ${sat}% ${light}%)`,
      h: hue,
      s: sat,
      l: light,
      trail: [],
    };
  }

  // Ring collision: clamp inside; reflect only when approaching outward
  function resolveRingCollision(b: Ball, cx: number, cy: number, R: number) {
    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const nx = dx / dist;
    const ny = dy / dist;
    const e = Math.min(1.0, restitutionWall);
    const eps = 0.8;

    const target = R - b.r - eps;
    if (dist > target) {
      b.x = cx + nx * target;
      b.y = cy + ny * target;

      const vn = b.vx * nx + b.vy * ny;
      // Minimal outward speed threshold to avoid micro-bounces at the gap boundary
      if (vn > 5) {
        const j = (1 + e) * vn;
        b.vx -= j * nx;
        b.vy -= j * ny;
        // Kick up the ring glow on impact (stronger burst)
        ringGlowRef.current = Math.min(1, ringGlowRef.current + 0.6);
      }

      b.vx *= 0.999;
      b.vy *= 0.999;
    }
  }

  function resolveBallBallCollisions() {
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const minDist = a.r + b.r;
        if (dist < minDist) {
          // Positional correction (equal mass): split the overlap
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const correction = overlap / 2;
          a.x -= nx * correction;
          a.y -= ny * correction;
          b.x += nx * correction;
          b.y += ny * correction;

          // Velocity impulse (equal mass)
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const relVelAlongN = rvx * nx + rvy * ny;
          if (relVelAlongN < 0) {
            const j = -(1 + restitutionBall) * relVelAlongN / (1 + 1); // m=1 each
            const jx = j * nx;
            const jy = j * ny;
            a.vx -= jx;
            a.vy -= jy;
            b.vx += jx;
            b.vy += jy;
          }
        }
      }
    }
  }

  // Axis-aligned rectangle collision (against the text overlay)
  // Note: rectangle collision helper removed (unused after overlay became non-colliding)

  function stepSimulation(dt: number) {
    const balls = ballsRef.current;
    const { x: cx, y: cy, R } = centerRef.current;

    // Toggle spawn policy based on current population
    if (balls.length >= 20) spawnEnabledRef.current = false;
    if (balls.length <= 1) spawnEnabledRef.current = true;

    // Rotate the gap
    const gapLen = Math.PI * 2 * gapPercent; // radians
    gapStartRef.current = wrapAngle(gapStartRef.current + rotationSpeed * dt);
    const gapStart = gapStartRef.current;

    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    // We no longer collide with the overlay; it's purely visual glass

    // Integrate and wall interactions
    const now = simNowMsRef.current;
    const toRemove: number[] = [];
    const toSpawn: Ball[] = [];

    const TRAIL_LEN = 20;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];

      // Gravity: desktop pushes left; mobile pushes downward
      if (isMobileRef.current) {
        b.vy += gravity * dt;
      } else {
        b.vx += -gravity * dt;
      }

      // Integrate position
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Update trail (short-lived, no permanent ghosting)
      (b.trail ||= []).push({ x: b.x, y: b.y, r: b.r });
      if (b.trail.length > TRAIL_LEN) b.trail.shift();

      // Air drag (very light)
      if (airDrag > 0) {
        b.vx *= 1 - airDrag;
        b.vy *= 1 - airDrag;
      }

      // Circle collision or escape through gap
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      // Core gap definition (strict)
      const basePad = Math.atan2(b.r, R) + 0.02;
      const coreStart = gapStart + basePad;
      const coreLen = Math.max(0, gapLen - 2 * basePad);
      const inGapCore = angleInArc(angle, coreStart, coreLen);

      const nx = dx / (dist || 1e-6);
      const ny = dy / (dist || 1e-6);
      const vn = b.vx * nx + b.vy * ny;
      // Near-gap region: very small fixed angular margin around the core gap.
      // This only suppresses collisions right at the rim to avoid one-frame jitter.
      const nearMargin = Math.max(0.0025, Math.atan2(b.r * 0.3 + 0.5, R));
      const nearStart = coreStart - nearMargin;
      const nearLen = coreLen + 2 * nearMargin;
      const inGapNear = angleInArc(angle, nearStart, nearLen);
      const fullyOutside = dist - b.r >= R + 0.5;

      if (inGapCore && fullyOutside && vn > 0 && b.escapedAt === undefined) {
        b.gapOutsideTicks = (b.gapOutsideTicks || 0) + 1;
        if (b.gapOutsideTicks >= 2) {
          b.escapedAt = now;
          b.opacity = 1;
          if (spawnEnabledRef.current) {
            const newR = Math.max(minBallRadius, b.r * 0.98);
            if (balls.length <= maxBalls && newR >= minBallRadius) {
              const { x: cx2, y: cy2 } = centerRef.current;
              const jx = (Math.random() - 0.5) * 0.5;
              const jy = (Math.random() - 0.5) * 0.5;
              toSpawn.push(makeBall(cx2 + jx, cy2 + jy, newR));
              toSpawn.push(makeBall(cx2 - jx, cy2 - jy, newR));
            }
          }
          b.spawned = true;
        }
      } else {
        b.gapOutsideTicks = 0;
      }

      // If NOT in gap, resolve collision with the solid ring
      // Skip when ball is escaped or within a brief grace window after crossing the gap
      const closeToExit = inGapNear && (dist - b.r >= R - 0.6);
      if (closeToExit) b.exitGraceUntil = Math.max(b.exitGraceUntil || 0, now + 180);
      const inExitGrace = (b.exitGraceUntil || 0) > now;
      // Only suppress collisions if actually in the gap core, or in the near-gap band and right at the rim
      const suppressCollision = inGapCore || (inGapNear && closeToExit);
      if (!suppressCollision && b.escapedAt === undefined && !inExitGrace) {
        resolveRingCollision(b, cx, cy, R);
      }

      // No collision with overlay: balls pass visually behind the glass

      // Floor/wall handling based on gravity direction
      // Desktop: left wall is the "floor"; Mobile: bottom is the floor
      if (!isMobileRef.current) {
        // Left wall as floor
        if (b.x - b.r < 0) {
          b.x = b.r;
          if (b.vx < 0) b.vx = -b.vx * 0.7;
          b.vy *= 0.99; // small vertical friction
          if (Math.abs(b.vx) < 5) b.vx = 0;
        }
      }

      // Side walls
      if (isMobileRef.current) {
        // Mobile: both left and right behave as walls
        if (b.x - b.r < 0) {
          b.x = b.r;
          if (b.vx < 0) b.vx = -b.vx * 0.7;
          b.vy *= 0.995;
          if (Math.abs(b.vx) < 5) b.vx = 0;
        }
        if (b.x + b.r > cssW) {
          b.x = cssW - b.r;
          if (b.vx > 0) b.vx = -b.vx * 0.7;
          b.vy *= 0.995;
          if (Math.abs(b.vx) < 5) b.vx = 0;
        }
      } else {
        // Desktop: still bounce on right wall as a boundary
        if (b.x + b.r > cssW) {
          b.x = cssW - b.r;
          if (b.vx > 0) b.vx = -b.vx * 0.7;
          b.vy *= 0.995;
          if (Math.abs(b.vx) < 5) b.vx = 0;
        }
      }

      // Top and bottom bounds
      if (b.y - b.r < 0) {
        b.y = b.r;
        if (b.vy < 0) b.vy = -b.vy * 0.65;
        b.vx *= 0.995;
        if (Math.abs(b.vy) < 5) b.vy = 0;
      }
      if (b.y + b.r > cssH) {
        b.y = cssH - b.r;
        if (b.vy > 0) b.vy = -b.vy * (isMobileRef.current ? 0.72 : 0.68);
        b.vx *= isMobileRef.current ? 0.992 : 0.995; // slightly reduced friction
        if (Math.abs(b.vy) < 5) b.vy = 0;
      }

      // Fade out ~1s after escape, then remove
      if (b.escapedAt !== undefined) {
        const elapsed = now - b.escapedAt;
        if (elapsed > 1000) {
          const fadeDur = 400; // ms
          const t = (elapsed - 1000) / fadeDur;
          b.opacity = Math.max(0, 1 - t);
          if (b.opacity <= 0) toRemove.push(i);
        }
      }
    }

    // Lightly decay the ring glow each step (slower decay for more presence)
    ringGlowRef.current = Math.max(0, ringGlowRef.current - dt * 1.0);

    // Ball-ball collisions after wall/floor resolution (single pass is usually enough visually)
    resolveBallBallCollisions();

    // Apply any queued spawns after physics
    if (toSpawn.length) {
      for (const nb of toSpawn) balls.push(nb);
    }

    // Remove fully faded balls (from end to start)
    if (toRemove.length) {
      toRemove.sort((a, b) => b - a);
      for (const idx of toRemove) balls.splice(idx, 1);
    }

    // Safety: never let population drop to zero
    if (balls.length === 0) {
      const { x: cx2, y: cy2 } = centerRef.current;
      balls.push(makeBall(cx2, cy2, initialRadius));
    }

    // UI counter removed; no-op
  }

  function draw() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x: cx, y: cy, R } = centerRef.current;
    const gapLen = Math.PI * 2 * gapPercent;
    const gapStart = gapStartRef.current;

    // Canvas CSS dimensions for overlay
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    // Full clear to avoid permanent ghosting; background is provided by CSS behind the canvas
    ctx.clearRect(0, 0, cssW, cssH);

    // Draw the rotating ring with gradient and optional glow
    ctx.save();
    const grad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    grad.addColorStop(0, '#7aa2ff');
    grad.addColorStop(1, '#9ff0ff');

    const glow = ringGlowRef.current;
    if (glow > 0.001) {
      // Inner glow (subtle)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32 + 0.56 * glow;
      ctx.shadowColor = 'rgba(122, 162, 255, 0.88)';
      ctx.shadowBlur = 26 + 38 * glow;
      ctx.lineWidth = 7 + 3.0 * glow;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, gapStart + gapLen, gapStart + Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Soft outer halo
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12 + 0.26 * glow;
      ctx.shadowColor = 'rgba(122, 162, 255, 0.84)';
      ctx.shadowBlur = 34 + 56 * glow;
      ctx.lineWidth = 9 + 4.0 * glow;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, gapStart + gapLen, gapStart + Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Base ring stroke on top for crisp edge
    ctx.lineWidth = 6;
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, gapStart + gapLen, gapStart + Math.PI * 2);
    ctx.stroke();

    // Inner rim and gap indicator removed for cleaner look

    // Draw balls with short procedural trails (no canvas accumulation)
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const baseAlpha = b.opacity !== undefined ? b.opacity : 1;
      const trail = b.trail || [];

      // Circular trail segments: flatter, color-matched, no glow
      if (trail.length >= 2) {
        ctx.save();
        for (let t = 0; t < trail.length - 1; t++) {
          const seg = trail[t];
          const k = t / (trail.length - 1 || 1); // 0..1 old->new
          // Fade tail to a fine, dim point; slightly denser near the head
          const a = baseAlpha * (0.02 + 0.08 * k);
          ctx.globalAlpha = a;
          ctx.fillStyle = b.color;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, seg.r * (0.10 + 0.75 * k), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Ball (flat 2D style with defined dual border)
      ctx.save();
      ctx.globalAlpha = baseAlpha;
      // Keep per-ball color for fill, for variety
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      // First, darker stroke (inner) derived from fill color
      const h = (b.h ?? 210);
      const s = (b.s ?? 70);
      const l = (b.l ?? 56);
      const darkL = Math.max(20, l - 14);
      ctx.lineWidth = Math.max(2.0, Math.min(3.0, b.r * 0.22));
      ctx.strokeStyle = `hsl(${h} ${s}% ${darkL}%)`;
      ctx.stroke();
      // Second, thin accent stroke to echo the ring palette
      ctx.lineWidth = Math.max(1.0, Math.min(1.8, b.r * 0.12));
      ctx.strokeStyle = '#9ff0ff';
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // Note: reset handler removed (unused)

  return (
    <div className="rtg-container" data-testid="hero-root">
      <div className="rtg-social" aria-label="Social links">
        <a
          className="icon-link"
          href="https://www.linkedin.com/in/ansh-sancheti-10b043aa/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          title="LinkedIn"
        >
          {/* LinkedIn icon */}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.024-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.944v5.662H9.35V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.368-1.85 3.602 0 4.269 2.371 4.269 5.455v6.286zM5.337 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126zM7.114 20.452H3.556V9h3.558v11.452z" />
          </svg>
        </a>
        <a
          className="icon-link"
          href="https://github.com/AnshSancheti"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          title="GitHub"
        >
          {/* GitHub icon */}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .5C5.73.5.98 5.24.98 11.5c0 4.85 3.15 8.96 7.52 10.41.55.1.75-.24.75-.53 0-.26-.01-1.12-.02-2.03-3.06.66-3.71-1.31-3.71-1.31-.5-1.27-1.22-1.6-1.22-1.6-.99-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.97 1.66 2.54 1.18 3.16.9.1-.7.38-1.18.69-1.45-2.44-.28-5.01-1.22-5.01-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.91 0 0 .92-.29 3.02 1.13a10.5 10.5 0 0 1 5.5 0c2.1-1.42 3.02-1.13 3.02-1.13.6 1.51.22 2.63.11 2.91.7.77 1.13 1.75 1.13 2.95 0 4.22-2.58 5.14-5.03 5.41.39.34.74 1.01.74 2.04 0 1.47-.01 2.65-.01 3.01 0 .29.19.64.76.53A10.52 10.52 0 0 0 23.02 11.5C23.02 5.24 18.27.5 12 .5z"/>
          </svg>
        </a>
        <button
          type="button"
          className="icon-link"
          aria-label={isRunning ? "Pause animation" : "Start animation"}
          title={isRunning ? "Stop" : "Start"}
          onClick={() => {
            const next = !isRunningRef.current;
            isRunningRef.current = next;
            setIsRunning(next);
          }}
        >
          {isRunning ? (
            // Pause icon
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            // Play icon
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
      <div className="rtg-overlay" ref={overlayRef}>
        <h1 className="hero-title">Ansh Sancheti</h1>
        <p className="hero-subtitle">software engineer.</p>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
}
