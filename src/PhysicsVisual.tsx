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
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Tunables
  const gapPercent = 0.10; // ~10% of circumference
  const rotationSpeed = 0.6; // rad/s
  const gravity = 1400; // px/s^2
  const restitutionWall = 1.02; // slightly >1 for a punchy push-off
  const restitutionBall = 0.98; // slightly bouncier ball-ball
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
  const isMobileRef = useRef<boolean>(false);

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

  // Ring collision from either side (inside or outside), except at the gap
  function resolveRingCollision(b: Ball, cx: number, cy: number, R: number) {
    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const nx = dx / dist; // outward normal from center
    const ny = dy / dist;

    // Velocity along outward normal
    const vn = b.vx * nx + b.vy * ny;
    const eps = 0.5; // small separation to avoid re-penetration
    const e = Math.min(1.02, restitutionWall); // a touch more lively

    if (dist < R) {
      // Ball center is inside the ring radius
      const overlap = dist + b.r - R;
      if (overlap >= 0 && vn > 0) {
        // Moving outward into the ring
        // Snap to just inside the boundary
        const target = R - b.r - eps;
        b.x = cx + nx * target;
        b.y = cy + ny * target;
        // Reflect outward component to inward
        const j = (1 + e) * vn;
        b.vx -= j * nx;
        b.vy -= j * ny;
      }
    } else {
      // Ball center is outside the ring radius
      const overlap = R - (dist - b.r);
      if (overlap >= 0 && vn < 0) {
        // Moving inward into the ring
        // Snap to just outside the boundary
        const target = R + b.r + eps;
        b.x = cx + nx * target;
        b.y = cy + ny * target;
        // Reflect inward component to outward
        const j = (1 + e) * (-vn);
        b.vx += j * nx;
        b.vy += j * ny;
      }
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
  function resolveRectCollision(
    b: Ball,
    rect: { left: number; top: number; right: number; bottom: number },
    restitution = 0.7
  ) {
    // Find closest point on rect to ball center
    const cx = clamp(b.x, rect.left, rect.right);
    const cy = clamp(b.y, rect.top, rect.bottom);
    let dx = b.x - cx;
    let dy = b.y - cy;
    let dist2 = dx * dx + dy * dy;

    if (dist2 > b.r * b.r) return; // no overlap

    let nx = 0;
    let ny = 0;
    let pen = 0;

    if (dist2 === 0) {
      // Center is inside rect; choose the shallowest push to nearest edge
      const leftPen = Math.abs(b.x - rect.left);
      const rightPen = Math.abs(rect.right - b.x);
      const topPen = Math.abs(b.y - rect.top);
      const bottomPen = Math.abs(rect.bottom - b.y);
      const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
      if (minPen === leftPen) {
        nx = -1; ny = 0; pen = b.r - leftPen;
      } else if (minPen === rightPen) {
        nx = 1; ny = 0; pen = b.r - rightPen;
      } else if (minPen === topPen) {
        nx = 0; ny = -1; pen = b.r - topPen;
      } else {
        nx = 0; ny = 1; pen = b.r - bottomPen;
      }
    } else {
      const dist = Math.sqrt(dist2);
      nx = dx / dist;
      ny = dy / dist;
      pen = b.r - dist;
    }

    if (pen > 0) {
      const eps = 0.5;
      // Positional correction
      b.x += (pen + eps) * nx;
      b.y += (pen + eps) * ny;
      // Velocity reflection along normal only if approaching
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        const j = -(1 + restitution) * vn;
        b.vx += j * nx;
        b.vy += j * ny;
      }
      // tiny tangent damping
      b.vx *= 0.998;
      b.vy *= 0.998;
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

    // Measure overlay rect (text block) in CSS px
    const overlayEl = overlayRef.current;
    let overlayRect: { left: number; top: number; right: number; bottom: number } | null = null;
    if (overlayEl) {
      const r = overlayEl.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      // Convert overlay rect from viewport coords to canvas-local coords (CSS px)
      overlayRect = {
        left: r.left - cr.left,
        top: r.top - cr.top,
        right: r.right - cr.left,
        bottom: r.bottom - cr.top,
      };
    }

    // Integrate and wall interactions
    const now = performance.now();
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

      // If NOT in gap, resolve collision with the solid ring from either side
      if (!inGap) {
        resolveRingCollision(b, cx, cy, R);
      }

      // Collide with the text overlay rectangle
      if (overlayRect) {
        resolveRectCollision(b, overlayRect, 0.75);
      }

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

    // Inner rim and gap indicator removed for cleaner look

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
      <div className="rtg-overlay" ref={overlayRef}>
        <h1 className="hero-title">Lorem Ipsum</h1>
        <p className="hero-subtitle">dolor sit amet.</p>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
}
