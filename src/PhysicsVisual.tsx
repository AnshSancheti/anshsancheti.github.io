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
  // Escape + fade lifecycle
  escapedAt?: number; // ms timestamp (performance.now)
  spawned?: boolean; // whether we've spawned replacements for this ball
  opacity?: number; // 0..1 for fade-out after delay
  trail?: { x: number; y: number; r: number }[]; // short-lived trail positions
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
  const [running, setRunning] = useState(true);
  const [ballCount, setBallCount] = useState(1);

  // Tunables
  const gapPercent = 0.10; // ~10% of circumference
  const rotationSpeed = 0.6; // rad/s
  const gravity = 1400; // px/s^2
  const restitutionWall = 1.02; // slightly >1 for a punchy push-off
  const restitutionBall = 0.96; // lively ball-ball
  const minBounceSpeed = 260; // stronger push off from the wall
  const airDrag = 0.000; // per frame linear drag (0..0.01)
  const maxBalls = 300; // safety cap to avoid browser meltdown
  const minBallRadius = 4; // slightly larger minimum
  const initialRadius = 12; // slightly larger starting size

  // Spawn throttling: when too many balls, disable splitting until one remains
  const spawnEnabledRef = useRef<boolean>(true);

  // Mutable simulation state kept in refs to avoid re-renders each tick
  const ballsRef = useRef<Ball[]>([]);
  const gapStartRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const centerRef = useRef({ x: 0, y: 0, R: 0 });

  // Mount: set up canvas sizing, tests, RAF loop, and initial ball
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // CSS size
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      // Backing store
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);

      // 1 CSS px units
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Circle on the right side, centered vertically
      const padding = 16;
      const circleDia = Math.min(vw, vh) * 0.8;
      const R = circleDia / 2 - padding;
      const cx = vw - (circleDia / 2) - 60; // right offset
      const cy = vh / 2;
      centerRef.current = { x: cx, y: cy, R };
    }

    // First layout + tests + initial state
    resize();
    if (process.env.NODE_ENV !== "production") runDevTests();

    // Initialize with a single ball at center (after we know center)
    const { x: cx, y: cy } = centerRef.current;
    ballsRef.current = [makeBall(cx, cy, initialRadius)];
    setBallCount(1);

    // Animation loop
    lastTRef.current = performance.now();
    const tick = () => {
      const now = performance.now();
      let dt = (now - lastTRef.current) / 1000; // seconds
      lastTRef.current = now;
      // clamp dt to avoid huge jumps when tab is inactive
      dt = clamp(dt, 0, 0.033); // ~30 FPS max step

      if (running) {
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
  }, [running]);

  function makeBall(x: number, y: number, radius: number): Ball {
    const hue = Math.floor(200 + Math.random() * 140); // bluish-green range
    return {
      id: GLOBAL_ID++,
      x,
      y,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.8) * 120, // slight initial upward bias
      r: radius,
      color: `hsl(${hue} 70% 55%)`,
      trail: [],
    };
  }

  function resolveWallCollision(b: Ball, cx: number, cy: number, R: number) {
    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const nx = dx / dist; // normal from center to ball
    const ny = dy / dist;

    const penetration = dist + b.r - R; // > 0 means outside solid arc (when not in gap)
    if (penetration > 0) {
      // Positional correction: push just inside with a slop so we "feel" the push
      const slop = 1.2; // stronger visible push off
      b.x -= (penetration + slop) * nx;
      b.y -= (penetration + slop) * ny;

      // Velocity response: reflect and guarantee an inward speed (push off)
      const vn = b.vx * nx + b.vy * ny; // outward component
      let desiredInward = Math.max(minBounceSpeed, Math.abs(vn) * restitutionWall);
      b.vx += (-vn - desiredInward) * nx;
      b.vy += (-vn - desiredInward) * ny;

      // small tangent damping
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

    // Integrate and wall interactions
    const now = performance.now();
    const toRemove: number[] = [];
    const toSpawn: Ball[] = [];

    const TRAIL_LEN = 20;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];

      // Gravity (sideways to the left)
      b.vx += -gravity * dt;

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
      const inGap = angleInArc(angle, gapStart, gapLen);

      // Detect first-time escape: fully outside and within the gap sector
      if (inGap && dist - b.r >= R && b.escapedAt === undefined) {
        b.escapedAt = now;
        b.opacity = 1;
        // Immediately spawn replacements
        if (spawnEnabledRef.current) {
          const newR = Math.max(minBallRadius, b.r * 0.96);
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

      // If NOT in gap, resolve collision with the solid arc (prevent tunneling)
      // Do not resolve against the ring once a ball has escaped.
      if (!inGap && dist + b.r > R && b.escapedAt === undefined) {
        resolveWallCollision(b, cx, cy, R);
      }

      // Floor collision at bottom of the screen
      // Left wall collision as the new "floor"
      if (b.x - b.r < 0) {
        b.x = b.r;
        if (b.vx < 0) b.vx = -b.vx * 0.55; // dampened bounce
        // small vertical friction
        b.vy *= 0.98;
        if (Math.abs(b.vx) < 5) b.vx = 0;
      }

      // Top and bottom bounds
      if (b.y - b.r < 0) {
        b.y = b.r;
        if (b.vy < 0) b.vy = -b.vy * 0.55;
        b.vx *= 0.99;
        if (Math.abs(b.vy) < 5) b.vy = 0;
      }
      if (b.y + b.r > cssH) {
        b.y = cssH - b.r;
        if (b.vy > 0) b.vy = -b.vy * 0.55;
        b.vx *= 0.99;
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

    // Keep UI count updated
    setBallCount(balls.length);
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

    // Draw the rotating ring (solid arc only) - crisp redraw each frame
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#9ab";
    ctx.beginPath();
    ctx.arc(cx, cy, R, gapStart + gapLen, gapStart + Math.PI * 2);
    ctx.stroke();

    // Optional: faint inner rim
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw gap indicator (subtle)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(gapStart + gapLen / 2);
    ctx.strokeStyle = "#cde";
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(R - 12, 0);
    ctx.lineTo(R + 12, 0);
    ctx.stroke();
    ctx.restore();

    // Draw balls with short procedural trails (no canvas accumulation)
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const baseAlpha = b.opacity !== undefined ? b.opacity : 1;
      const trail = b.trail || [];

      // Circular trail segments with subtle glow (classic comet dots)
      if (trail.length >= 2) {
        ctx.save();
        for (let t = 0; t < trail.length - 1; t++) {
          const seg = trail[t];
          const k = t / (trail.length - 1 || 1); // 0..1 old->new
          // Fade tail to a fine, dim point; brighter/softer near the head
          const a = baseAlpha * (0.01 + 0.06 * k);
          ctx.globalAlpha = a;
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 8 * k;
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, seg.r * (0.12 + 0.88 * k), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Ball (on top)
      ctx.globalAlpha = baseAlpha;
      // No glow halo
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function handleReset() {
    const { x: cx, y: cy } = centerRef.current;
    ballsRef.current = [makeBall(cx, cy, initialRadius)];
    spawnEnabledRef.current = true;
    setBallCount(1);
  }

  return (
    <div className="rtg-container" data-testid="hero-root">
      <div className="rtg-overlay">
        <h1 className="hero-title">Lorem Ipsum</h1>
        <p className="hero-subtitle">dolor sit amet.</p>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
}
