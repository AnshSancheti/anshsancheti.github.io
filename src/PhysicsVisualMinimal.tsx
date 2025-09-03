import React, { useEffect, useRef, useState } from "react";

// Minimal physics visual - just the circle and balls without UI controls
type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  gapOutsideTicks?: number;
  exitGraceUntil?: number;
};

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
    e -= Math.PI * 2;
    return a >= s || a <= e;
  }
}

let GLOBAL_ID = 1;

export default function PhysicsVisualMinimal() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [running] = useState(true);

  // Tunables
  const gapPercent = 0.10;
  const rotationSpeed = 0.6;
  const gravity = 1400;
  const restitutionWall = 0.98;
  const restitutionBall = 0.96;
  const maxBalls = 300;
  const minBallRadius = 3;
  const initialRadius = 8;

  const spawnEnabledRef = useRef<boolean>(true);
  const ballsRef = useRef<Ball[]>([]);
  const gapStartRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const centerRef = useRef({ x: 0, y: 0, R: 0 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      const container = canvas.parentElement!;
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const cx = size / 2;
      const cy = size / 2;
      const padding = 16;
      const R = size / 2 - padding;
      centerRef.current = { x: cx, y: cy, R };
    }

    resize();

    const { x: cx, y: cy } = centerRef.current;
    ballsRef.current = [makeBall(cx, cy, initialRadius)];

    lastTRef.current = performance.now();
    const tick = () => {
      const now = performance.now();
      let dt = (now - lastTRef.current) / 1000;
      lastTRef.current = now;
      dt = clamp(dt, 0, 0.033);

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
  }, [running]);

  function makeBall(x: number, y: number, radius: number): Ball {
    const grays = ["#000", "#333", "#666", "#999"];
    const color = grays[Math.floor(Math.random() * grays.length)];
    return {
      id: GLOBAL_ID++,
      x,
      y,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.8) * 120,
      r: radius,
      color,
    };
  }

  function resolveWallCollision(b: Ball, cx: number, cy: number, R: number) {
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
      if (vn > 0) {
        const j = (1 + e) * vn;
        b.vx -= j * nx;
        b.vy -= j * ny;
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
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const correction = overlap / 2;
          a.x -= nx * correction;
          a.y -= ny * correction;
          b.x += nx * correction;
          b.y += ny * correction;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const relVelAlongN = rvx * nx + rvy * ny;
          if (relVelAlongN < 0) {
            const j = -(1 + restitutionBall) * relVelAlongN / (1 + 1);
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

    if (balls.length >= 20) spawnEnabledRef.current = false;
    if (balls.length <= 1) spawnEnabledRef.current = true;

    const gapLen = Math.PI * 2 * gapPercent;
    gapStartRef.current = wrapAngle(gapStartRef.current + rotationSpeed * dt);
    const gapStart = gapStartRef.current;

    const escapedIndices: number[] = [];
    const now = performance.now();

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];

      b.vy += gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      const dx = b.x - cx;
      const dy = b.y - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const padding = Math.atan2(b.r, R) + 0.02;
      const effectiveStart = gapStart + padding;
      const effectiveLen = Math.max(0, gapLen - 2 * padding);
      const inGap = angleInArc(angle, effectiveStart, effectiveLen);

      const nx = dx / (dist || 1e-6);
      const ny = dy / (dist || 1e-6);
      const vn = b.vx * nx + b.vy * ny;
      const fullyOutside = dist - b.r >= R + 0.5;

      if (inGap && fullyOutside && vn > 0) {
        b.gapOutsideTicks = (b.gapOutsideTicks || 0) + 1;
        if (b.gapOutsideTicks >= 2) {
          escapedIndices.push(i);
          continue;
        }
      } else {
        b.gapOutsideTicks = 0;
      }

      // Brief grace to allow clearing the boundary after entering gap
      const closeToExit = inGap && (dist - b.r >= R - 0.5);
      if (closeToExit) b.exitGraceUntil = Math.max(b.exitGraceUntil || 0, now + 180);
      const inExitGrace = (b.exitGraceUntil || 0) > now;

      if (!inGap && !inExitGrace && dist + b.r > R) {
        resolveWallCollision(b, cx, cy, R);
      }
    }

    resolveBallBallCollisions();

    if (escapedIndices.length) {
      escapedIndices.sort((a, b) => b - a);
      for (const idx of escapedIndices) {
        const removed = balls.splice(idx, 1)[0];
        if (spawnEnabledRef.current) {
          const newR = Math.max(minBallRadius, removed.r * 0.96);
          if (balls.length <= maxBalls && newR >= minBallRadius) {
            const { x: cx2, y: cy2 } = centerRef.current;
            const jx = (Math.random() - 0.5) * 0.5;
            const jy = (Math.random() - 0.5) * 0.5;
            balls.push(makeBall(cx2 + jx, cy2 + jy, newR));
            balls.push(makeBall(cx2 - jx, cy2 - jy, newR));
          }
        }
      }
    }
  }

  function draw() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x: cx, y: cy, R } = centerRef.current;
    const gapLen = Math.PI * 2 * gapPercent;
    const gapStart = gapStartRef.current;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx, cy, R, gapStart + gapLen, gapStart + Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      // Base fill
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();

      // Rim stroke (softer than pure black)
      ctx.strokeStyle = 'rgba(10, 12, 18, 0.22)';
      ctx.lineWidth = Math.max(0.5, Math.min(1.1, b.r * 0.10));
      ctx.stroke();

      // Soft specular highlight (cheap overlay)
      const hx = b.r * 0.36;
      const hy = b.r * 0.36;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(b.x - hx, b.y - hy, b.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} className="rounded-2xl" />
    </div>
  );
}
