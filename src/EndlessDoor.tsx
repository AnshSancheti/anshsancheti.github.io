import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const OPEN_ANGLE = 180;
const SETTLE_EPSILON = 0.6;
const DRAG_DEGREES_PER_PIXEL = 0.38;

type DoorMode = 'idle' | 'opening' | 'closing';

type PointerSession = {
  id: number;
  startX: number;
  startY: number;
  startAngle: number;
  moved: boolean;
  mode: DoorMode | null;
};

type DoorDrawingProps = {
  idSuffix: string;
};

type DoorDepthProps = {
  idSuffix: string;
  side: 'hinge' | 'latch';
};

type DoorBodyProps = {
  idSuffix: string;
};

const KNOB_SLICE_ANGLES = [-70, -42, -18, 18, 42, 70];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function DoorDepth({ idSuffix, side }: DoorDepthProps) {
  const wobbleId = `door-depth-wobble-${idSuffix}`;
  const scratches = useMemo(
    () => [
      'M9 34 C14 31 19 34 24 31',
      'M8 119 C13 116 20 119 26 116',
      'M7 248 C13 245 20 248 27 246',
      'M8 386 C14 383 20 386 26 384',
      'M7 521 C12 518 19 521 27 519',
      'M8 653 C14 650 21 653 26 651',
    ],
    []
  );

  return (
    <svg
      aria-hidden="true"
      className={`door-depth-art door-depth-art-${side}`}
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 34 704"
    >
      <defs>
        <filter id={wobbleId} x="-8%" y="-4%" width="116%" height="108%">
          <feTurbulence baseFrequency="0.026" numOctaves="2" result="noise" seed="13" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.72" />
        </filter>
      </defs>

      <g filter={`url(#${wobbleId})`}>
        <path className="door-depth-fill" d="M2 2 C12 3 22 2 32 3 L31 701 C21 703 13 700 2 702 Z" />
        <path className="door-depth-line" d="M3 3 C12 4 22 3 31 4 L31 700 C21 702 13 699 3 701 Z" />
        <path className="door-depth-edge" d="M4 7 C7 143 4 263 6 354 C4 468 7 582 5 698" />
        <path className="door-depth-edge" d="M29 8 C26 143 30 265 28 357 C30 465 27 583 29 697" />
        <path className="door-depth-highlight" d="M10 14 C13 155 10 296 12 424 C10 534 13 620 11 691" />
        {scratches.map((scratch) => (
          <path className="door-depth-scratch" d={scratch} key={scratch} />
        ))}
      </g>
    </svg>
  );
}

function DoorBody({ idSuffix }: DoorBodyProps) {
  return (
    <>
      <div className="door-face door-face-front">
        <DoorDrawing idSuffix={`${idSuffix}-front`} />
      </div>
      <div className="door-face door-face-back">
        <DoorDrawing idSuffix={`${idSuffix}-back`} />
      </div>
      <DoorKnobAssembly />
      <DoorDepth idSuffix={`${idSuffix}-hinge`} side="hinge" />
      <DoorDepth idSuffix={`${idSuffix}-latch`} side="latch" />
    </>
  );
}

function DoorKnobAssembly() {
  return (
    <div aria-hidden="true" className="door-knob-assembly">
      <div className="door-knob-bridge" />
      {KNOB_SLICE_ANGLES.map((sliceAngle) => (
        <span
          className="door-knob-orb door-knob-orb-front"
          key={`front-${sliceAngle}`}
          style={{ '--knob-slice-angle': `${sliceAngle}deg` } as React.CSSProperties}
        />
      ))}
      {KNOB_SLICE_ANGLES.map((sliceAngle) => (
        <span
          className="door-knob-orb door-knob-orb-back"
          key={`back-${sliceAngle}`}
          style={{ '--knob-slice-angle': `${sliceAngle}deg` } as React.CSSProperties}
        />
      ))}
      <div className="door-knob-neck door-knob-neck-front" />
      <div className="door-knob-neck door-knob-neck-back" />
      <svg
        className="door-knob-cap door-knob-cap-front"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 42 42"
      >
        <path className="door-knob-cap-fill" d="M21 4 C31 3 39 12 38 22 C37 32 29 39 19 38 C9 37 3 29 4 20 C5 10 12 5 21 4 Z" />
        <path className="door-knob-cap-line" d="M21 4 C31 3 39 12 38 22 C37 32 29 39 19 38 C9 37 3 29 4 20 C5 10 12 5 21 4 Z" />
        <path className="door-knob-cap-ring" d="M21 8 C29 7 35 14 34 22 C33 29 27 35 19 34 C12 33 8 27 8 20 C9 13 14 9 21 8 Z" />
        <path className="door-knob-cap-shadow" d="M11 25 C16 34 29 34 34 24" />
        <path className="door-knob-cap-highlight" d="M13 15 C16 11 23 10 28 13" />
        <circle className="door-knob-cap-scratch" cx="16" cy="15" r="2.6" />
      </svg>
      <svg
        className="door-knob-cap door-knob-cap-back"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 42 42"
      >
        <path className="door-knob-cap-fill" d="M21 4 C31 3 39 12 38 22 C37 32 29 39 19 38 C9 37 3 29 4 20 C5 10 12 5 21 4 Z" />
        <path className="door-knob-cap-line" d="M21 4 C31 3 39 12 38 22 C37 32 29 39 19 38 C9 37 3 29 4 20 C5 10 12 5 21 4 Z" />
        <path className="door-knob-cap-ring" d="M21 8 C29 7 35 14 34 22 C33 29 27 35 19 34 C12 33 8 27 8 20 C9 13 14 9 21 8 Z" />
        <path className="door-knob-cap-shadow" d="M11 25 C16 34 29 34 34 24" />
        <path className="door-knob-cap-highlight" d="M13 15 C16 11 23 10 28 13" />
        <circle className="door-knob-cap-scratch" cx="16" cy="15" r="2.6" />
      </svg>
    </div>
  );
}

function DoorDrawing({ idSuffix }: DoorDrawingProps) {
  const wobbleId = `door-wobble-${idSuffix}`;
  const panels = useMemo(
    () => [
      {
        face: 'M56 75 C116 72 193 77 264 75 L257 154 C201 158 129 153 61 154 Z',
        echo: 'M59 79 C123 77 192 80 261 78 L254 151 C197 153 132 150 63 151',
        inner: 'M72 92 C122 88 188 92 246 91 L242 137 C188 140 130 136 74 139 Z',
        weight: 'M62 154 C107 158 180 158 255 157 L257 148',
      },
      {
        face: 'M57 207 C118 203 191 210 261 207 L256 294 C189 298 125 292 62 291 Z',
        echo: 'M60 210 C118 208 194 213 258 210 L253 290 C190 292 126 288 64 288',
        inner: 'M73 222 C126 219 186 224 244 223 L241 276 C184 278 132 274 76 276 Z',
        weight: 'M63 292 C119 297 188 297 255 296 L256 286',
      },
      {
        face: 'M58 343 C117 347 190 339 262 342 L255 426 C199 430 125 424 61 425 Z',
        echo: 'M61 346 C120 349 189 343 259 345 L252 422 C196 425 127 420 63 421',
        inner: 'M73 357 C119 354 186 356 246 356 L241 409 C188 412 130 407 75 411 Z',
        weight: 'M62 425 C119 430 185 430 254 428 L255 418',
      },
      {
        face: 'M57 477 C111 473 188 479 260 475 L254 558 C199 563 126 557 62 559 Z',
        echo: 'M60 480 C114 477 186 482 257 478 L251 555 C196 558 128 554 64 556',
        inner: 'M74 492 C127 489 188 493 243 489 L239 542 C188 544 132 541 77 544 Z',
        weight: 'M63 559 C119 564 190 564 253 562 L254 552',
      },
      {
        face: 'M59 607 C114 604 190 608 262 606 L256 684 C197 689 131 682 62 682 Z',
        echo: 'M62 610 C118 608 188 611 259 609 L253 681 C196 684 132 679 65 679',
        inner: 'M74 622 C127 619 188 623 245 620 L241 670 C190 672 132 667 76 670 Z',
        weight: 'M63 682 C118 688 187 688 255 686 L256 676',
      },
    ],
    []
  );
  const hatches = useMemo(
    () => [
      'M41 33 C46 31 50 32 54 31',
      'M282 38 C288 37 292 39 296 37',
      'M42 118 C48 116 53 118 58 116',
      'M273 173 C281 171 286 173 292 172',
      'M39 321 C46 319 51 321 58 319',
      'M276 337 C283 336 288 338 294 336',
      'M39 452 C45 450 51 452 58 450',
      'M277 520 C284 518 290 520 296 518',
      'M42 646 C49 644 55 646 61 644',
      'M274 698 C282 696 288 698 294 696',
    ],
    []
  );

  return (
    <svg
      aria-hidden="true"
      className="door-art"
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 320 720"
    >
      <defs>
        <filter id={wobbleId} x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence baseFrequency="0.02" numOctaves="2" result="noise" seed="7" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.98" />
        </filter>
      </defs>

      <g filter={`url(#${wobbleId})`}>
        <path className="door-fill" d="M24 10 C104 7 202 13 298 10 L299 712 C213 715 119 709 27 711 L25 428 C23 319 27 188 25 169 Z" />
        <path className="door-line door-line-heavy" d="M25 10 C104 7 202 13 298 10 L299 712 C213 715 119 709 27 711 L25 428 C23 319 27 188 25 169 Z" />
        <path className="door-line door-line-echo" d="M28 14 C110 11 199 16 295 13 L296 708 C207 710 117 706 30 707 L29 422 C27 313 30 190 29 164" />
        <path className="door-line door-line-faint" d="M36 23 C108 20 196 24 289 22 L291 699 C209 702 121 697 37 699" />
        <path className="door-line door-line-scratch" d="M32 18 C29 158 33 294 31 431 C35 560 32 649 34 702" />
        <path className="door-line door-line-scratch" d="M289 22 C292 154 288 312 292 446 C288 555 292 636 291 699" />

        {panels.map((panel) => (
          <g className="door-panel" key={panel.face}>
            <path className="door-panel-face" d={panel.face} />
            <path className="door-panel-echo" d={panel.echo} />
            <path className="door-panel-inner" d={panel.inner} />
            <path className="door-panel-weight" d={panel.weight} />
          </g>
        ))}

        <g className="door-hardware">
          <path className="door-plate" d="M276 428 L296 428 L296 494 L276 493 Z" />
          <path className="door-plate-echo" d="M274 431 L294 429 L295 491 L277 496" />
          <path className="door-keyhole" d="M288 465 C284 465 283 471 286 473 L284 486 L292 486 L290 473 C293 471 292 465 288 465 Z" />
        </g>

        <path className="door-ink-scratch" d="M45 188 C106 184 164 188 222 185 C246 184 265 185 280 184" />
        <path className="door-ink-scratch" d="M47 193 C98 190 158 194 213 191" />
        <path className="door-ink-scratch" d="M43 568 C98 565 158 568 217 565 C242 565 263 566 282 564" />
        <path className="door-ink-scratch" d="M47 575 C102 571 158 575 210 572" />
        {hatches.map((hatch) => (
          <path className="door-hatch" d={hatch} key={hatch} />
        ))}
      </g>
    </svg>
  );
}

function EndlessDoor() {
  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [openedCount, setOpenedCount] = useState(0);
  const [doorMode, setDoorMode] = useState<DoorMode>('idle');

  const angleRef = useRef(0);
  const animationTargetRef = useRef<number | null>(null);
  const openedCountRef = useRef(0);
  const doorModeRef = useRef<DoorMode>('idle');
  const pointerRef = useRef<PointerSession | null>(null);

  const setAngleValue = useCallback((nextAngle: number) => {
    const clamped = clamp(nextAngle, 0, OPEN_ANGLE);
    angleRef.current = clamped;
    setAngle(clamped);
  }, []);

  const setOpenedCountValue = useCallback((nextCount: number) => {
    const normalized = Math.max(0, Math.floor(nextCount));
    openedCountRef.current = normalized;
    setOpenedCount(normalized);
  }, []);

  const setDoorModeValue = useCallback((nextMode: DoorMode) => {
    doorModeRef.current = nextMode;
    setDoorMode(nextMode);
  }, []);

  const settleDoorAt = useCallback((settledAngle: number) => {
    const mode = doorModeRef.current;

    if (settledAngle >= OPEN_ANGLE - SETTLE_EPSILON) {
      if (mode === 'opening') {
        setOpenedCountValue(openedCountRef.current + 1);
      }
    } else if (settledAngle <= SETTLE_EPSILON) {
      if (mode === 'closing') {
        setOpenedCountValue(openedCountRef.current - 1);
      }
    } else {
      setAngleValue(settledAngle);
      return;
    }

    animationTargetRef.current = null;
    setAngleValue(0);
    setDoorModeValue('idle');
  }, [setAngleValue, setDoorModeValue, setOpenedCountValue]);

  const animateDoor = useCallback((
    nextMode: Exclude<DoorMode, 'idle'>,
    startAngle: number,
    targetAngle: number
  ) => {
    setDoorModeValue(nextMode);
    setAngleValue(startAngle);
    animationTargetRef.current = targetAngle;
  }, [setAngleValue, setDoorModeValue]);

  const openDoor = useCallback(() => {
    const startAngle = doorModeRef.current === 'opening' ? angleRef.current : 0;
    animateDoor('opening', startAngle, OPEN_ANGLE);
  }, [animateDoor]);

  const closeDoor = useCallback(() => {
    if (openedCountRef.current === 0 && doorModeRef.current !== 'closing') {
      return;
    }

    const startAngle = doorModeRef.current === 'closing' ? angleRef.current : OPEN_ANGLE;
    animateDoor('closing', startAngle, 0);
  }, [animateDoor]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    function tick(now: number) {
      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.045);
      lastTime = now;

      if (!pointerRef.current && animationTargetRef.current !== null) {
        const current = angleRef.current;
        const target = animationTargetRef.current;
        const diff = target - current;

        if (Math.abs(diff) > 0.02) {
          const ease = 1 - Math.exp(-18 * deltaSeconds);
          setAngleValue(current + diff * ease);
        } else if (current !== target) {
          setAngleValue(target);
        }

        if (Math.abs(target - angleRef.current) < SETTLE_EPSILON) {
          settleDoorAt(target);
        }
      }

      rafId = window.requestAnimationFrame(tick);
    }

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [setAngleValue, settleDoorAt]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAngle: doorModeRef.current === 'idle' ? 0 : angleRef.current,
      moved: false,
      mode: doorModeRef.current === 'idle' ? null : doorModeRef.current,
    };

    animationTargetRef.current = null;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) {
      return;
    }

    const dx = pointer.startX - event.clientX;
    const dy = pointer.startY - event.clientY;
    if (Math.hypot(dx, dy) > 5) {
      pointer.moved = true;
    }

    if (!pointer.mode && pointer.moved) {
      pointer.mode = dx < 0 && openedCountRef.current > 0 ? 'closing' : 'opening';
      pointer.startAngle = pointer.mode === 'closing' ? OPEN_ANGLE : 0;
      setDoorModeValue(pointer.mode);
      setAngleValue(pointer.startAngle);
    }

    if (pointer.mode) {
      setAngleValue(pointer.startAngle + dx * DRAG_DEGREES_PER_PIXEL);
    }

    event.preventDefault();
  };

  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) {
      return;
    }

    pointerRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!pointer.moved) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickedOpenDoorSide =
        openedCountRef.current > 0 && event.clientX < rect.left + rect.width * 0.42;

      if (clickedOpenDoorSide) {
        closeDoor();
      } else {
        openDoor();
      }

      return;
    }

    animationTargetRef.current = null;
    settleDoorAt(angleRef.current);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowLeft') {
      event.preventDefault();
      openDoor();
    }

    if (event.key === 'Escape' || event.key === 'Backspace' || event.key === 'ArrowRight') {
      event.preventDefault();
      closeDoor();
    }
  };

  const staticOpenCount = Math.max(0, openedCount - (doorMode === 'closing' ? 1 : 0));
  const showOpenLeaf = staticOpenCount > 0;
  const stageStyle = {
    '--door-angle': `${-angle.toFixed(3)}deg`,
  } as React.CSSProperties;

  return (
    <main className="endless-door-page" data-testid="endless-door">
      <div className="room-line room-line-top" />
      <div className="room-line room-line-baseboard" />
      <div className="room-line room-line-floor" />

      <div className="endless-door-world">
        <div
          aria-label="Endless hand-drawn door. Click or drag left to open; drag right to close."
          className={[
            'endless-door-stage',
            isDragging ? 'is-dragging' : '',
            doorMode !== 'idle' ? 'is-transitioning' : '',
            doorMode === 'opening' ? 'is-opening' : '',
            doorMode === 'closing' ? 'is-closing' : '',
          ].filter(Boolean).join(' ')}
          data-opened-count={openedCount}
          data-transition-mode={doorMode}
          data-testid="door-stage"
          onKeyDown={handleKeyDown}
          onLostPointerCapture={finishPointer}
          onPointerCancel={finishPointer}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          role="button"
          style={stageStyle}
          tabIndex={0}
        >
          <div aria-hidden="true" className="door-layer door-layer-next">
            <DoorBody idSuffix="next" />
          </div>

          <div aria-hidden="true" className="door-open-stack">
            {showOpenLeaf && (
              <div
                className="door-open-leaf"
              >
                <DoorBody idSuffix="open" />
              </div>
            )}
          </div>

          <div aria-hidden="true" className="door-leaf" data-testid="door-leaf">
            <DoorBody idSuffix="active" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default EndlessDoor;
