import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const OPEN_ANGLE = 180;
const HOVER_PREVIEW_ANGLE = OPEN_ANGLE * 0.1;
const SETTLE_EPSILON = 0.6;
const DRAG_DEGREES_PER_PIXEL = 0.38;
const ANIMATION_DURATION_MS = 480;
const MIN_ANIMATION_DURATION_MS = 140;

type DoorMode = 'idle' | 'opening' | 'closing';

type PointerSession = {
  id: number;
  startX: number;
  startY: number;
  startAngle: number;
  moved: boolean;
  mode: DoorMode | null;
};

type DoorDepthProps = {
  side: 'hinge' | 'latch';
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const DoorDepth = memo(function DoorDepth({ side }: DoorDepthProps) {
  return (
    <svg
      aria-hidden="true"
      className={`door-depth-art door-depth-art-${side}`}
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 34 704"
    >
      <g>
        <path className="door-depth-fill" d="M5 5 L30 3 L29 700 L4 699 Z" />
        <path className="door-depth-line" d="M5 5 L30 3 L29 700 L4 699 Z" />
        <path className="door-depth-edge" d="M9 10 C7 186 10 364 8 694" />
        <path className="door-depth-edge" d="M25 8 C27 232 24 474 26 696" />
      </g>
    </svg>
  );
});

const DoorBody = memo(function DoorBody() {
  return (
    <>
      <div className="door-face door-face-front">
        <DoorDrawing />
      </div>
      <div className="door-face door-face-back">
        <DoorDrawing />
      </div>
      <DoorKnobAssembly />
      <DoorDepth side="hinge" />
      <DoorDepth side="latch" />
    </>
  );
});

function DoorKnobAssembly() {
  return (
    <div aria-hidden="true" className="door-knob-assembly">
      <span className="door-knob-sphere door-knob-sphere-front" />
      <span className="door-knob-sphere door-knob-sphere-back" />
    </div>
  );
}

const DoorDrawing = memo(function DoorDrawing() {
  const panels = useMemo(
    () => [
      {
        face: 'M58 78 L263 75 L258 154 L62 156 Z',
        inner: 'M76 96 L244 94 L242 136 L78 138 Z',
      },
      {
        face: 'M59 208 L262 205 L258 292 L61 290 Z',
        inner: 'M77 225 L244 223 L241 273 L75 274 Z',
      },
      {
        face: 'M58 342 L264 340 L259 426 L62 424 Z',
        inner: 'M77 359 L245 358 L242 407 L75 409 Z',
      },
      {
        face: 'M60 477 L261 474 L258 559 L61 558 Z',
        inner: 'M77 493 L244 491 L241 541 L76 542 Z',
      },
      {
        face: 'M59 608 L263 606 L258 684 L62 682 Z',
        inner: 'M77 623 L244 622 L241 668 L76 669 Z',
      },
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
      <g>
        <path className="door-fill" d="M30 12 L297 9 L294 711 L28 708 Z" />
        <path className="door-line door-line-heavy" d="M30 12 L297 9 L294 711 L28 708 Z" />
        <path className="door-line door-line-faint" d="M40 24 L287 23 L284 699 L38 696 Z" />

        {panels.map((panel) => (
          <g className="door-panel" key={panel.face}>
            <path className="door-panel-face" d={panel.face} />
            <path className="door-panel-inner" d={panel.inner} />
          </g>
        ))}

        <g className="door-hardware">
          <path className="door-plate" d="M268 430 L287 428 L288 493 L269 492 Z" />
          <path className="door-plate-echo" d="M271 434 L285 433 L285 489 L271 489 Z" />
          <path className="door-keyhole" d="M280 465 C276 465 275 471 278 473 L276 486 H284 L282 473 C285 471 284 465 280 465 Z" />
        </g>

      </g>
    </svg>
  );
});

function EndlessDoor() {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverSettling, setIsHoverSettling] = useState(false);
  const [openedCount, setOpenedCount] = useState(0);
  const [doorMode, setDoorMode] = useState<DoorMode>('idle');

  const activeLeafRef = useRef<HTMLDivElement | null>(null);
  const angleRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const openedCountRef = useRef(0);
  const doorModeRef = useRef<DoorMode>('idle');
  const pointerRef = useRef<PointerSession | null>(null);
  const hoverSettleTimeoutRef = useRef<number | null>(null);

  const applyAngle = useCallback((nextAngle: number) => {
    const clamped = clamp(nextAngle, 0, OPEN_ANGLE);
    angleRef.current = clamped;

    if (activeLeafRef.current) {
      activeLeafRef.current.style.transform = `rotateY(${-clamped.toFixed(3)}deg) translateZ(3px)`;
    }
  }, []);

  const clearActiveLeafTransform = useCallback(() => {
    angleRef.current = 0;
    activeLeafRef.current?.style.removeProperty('transform');
  }, []);

  const cancelActiveAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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
    cancelActiveAnimation();
    const mode = doorModeRef.current;

    if (settledAngle >= OPEN_ANGLE - SETTLE_EPSILON) {
      if (mode === 'opening') {
        setOpenedCountValue(openedCountRef.current + 1);
      }
    } else if (settledAngle <= SETTLE_EPSILON) {
      if (mode === 'closing') {
        setOpenedCountValue(openedCountRef.current - 1);
      }
    }

    clearActiveLeafTransform();
    setDoorModeValue('idle');
  }, [cancelActiveAnimation, clearActiveLeafTransform, setDoorModeValue, setOpenedCountValue]);

  const animateDoor = useCallback((
    nextMode: Exclude<DoorMode, 'idle'>,
    startAngle: number,
    targetAngle: number
  ) => {
    cancelActiveAnimation();
    setDoorModeValue(nextMode);
    applyAngle(startAngle);

    const distance = Math.abs(targetAngle - startAngle);
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (distance <= SETTLE_EPSILON || prefersReducedMotion) {
      applyAngle(targetAngle);
      settleDoorAt(targetAngle);
      return;
    }

    const duration = Math.max(
      MIN_ANIMATION_DURATION_MS,
      ANIMATION_DURATION_MS * (distance / OPEN_ANGLE)
    );
    let startedAt: number | null = null;

    const tick = (now: number) => {
      if (startedAt === null) {
        startedAt = now;
      }

      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      applyAngle(startAngle + (targetAngle - startAngle) * easedProgress);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      animationFrameRef.current = null;
      settleDoorAt(targetAngle);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  }, [applyAngle, cancelActiveAnimation, setDoorModeValue, settleDoorAt]);

  const openDoor = useCallback(() => {
    const startAngle = angleRef.current;
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
    return () => {
      cancelActiveAnimation();
      if (hoverSettleTimeoutRef.current !== null) {
        window.clearTimeout(hoverSettleTimeoutRef.current);
      }
    };
  }, [cancelActiveAnimation]);

  const clearHoverSettling = useCallback(() => {
    if (hoverSettleTimeoutRef.current !== null) {
      window.clearTimeout(hoverSettleTimeoutRef.current);
      hoverSettleTimeoutRef.current = null;
    }

    setIsHoverSettling(false);
  }, []);

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') {
      return;
    }

    clearHoverSettling();
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    if (!isHovered) {
      clearHoverSettling();
      return;
    }

    const shouldSettleHover =
      !pointerRef.current
      && doorModeRef.current === 'idle'
      && openedCountRef.current === 0
      && angleRef.current <= SETTLE_EPSILON;

    setIsHovered(false);

    if (!shouldSettleHover) {
      clearHoverSettling();
      return;
    }

    setIsHoverSettling(true);
    if (hoverSettleTimeoutRef.current !== null) {
      window.clearTimeout(hoverSettleTimeoutRef.current);
    }
    hoverSettleTimeoutRef.current = window.setTimeout(() => {
      hoverSettleTimeoutRef.current = null;
      setIsHoverSettling(false);
    }, 200);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const shouldCommitHoverPreview =
      isHovered
      && doorModeRef.current === 'idle'
      && openedCountRef.current === 0
      && angleRef.current <= SETTLE_EPSILON;
    const startAngle = shouldCommitHoverPreview ? HOVER_PREVIEW_ANGLE : angleRef.current;

    if (shouldCommitHoverPreview) {
      applyAngle(startAngle);
    }

    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAngle,
      moved: false,
      mode: doorModeRef.current === 'idle' ? null : doorModeRef.current,
    };

    cancelActiveAnimation();
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
      pointer.startAngle = pointer.mode === 'closing' ? OPEN_ANGLE : pointer.startAngle;
      setDoorModeValue(pointer.mode);
      applyAngle(pointer.startAngle);
    }

    if (pointer.mode) {
      applyAngle(pointer.startAngle + dx * DRAG_DEGREES_PER_PIXEL);
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

    const pointerMode = pointer.mode;
    if (!pointerMode || pointerMode === 'idle') {
      clearActiveLeafTransform();
      setDoorModeValue('idle');
      return;
    }

    const currentAngle = angleRef.current;
    const targetAngle = currentAngle >= OPEN_ANGLE / 2 ? OPEN_ANGLE : 0;
    animateDoor(pointerMode, currentAngle, targetAngle);
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
  const showHoverPreview =
    isHovered
    && !isDragging
    && doorMode === 'idle'
    && openedCount === 0
    && angleRef.current <= SETTLE_EPSILON;

  return (
    <section className="endless-door-object" data-testid="endless-door">
      <div
        aria-label="Endless hand-drawn door. Click or drag left to open; drag right to close."
        className={[
          'endless-door-stage',
          isDragging ? 'is-dragging' : '',
          showHoverPreview ? 'is-hover-preview' : '',
          isHoverSettling ? 'is-hover-settling' : '',
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
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        role="button"
        tabIndex={0}
      >
        <div aria-hidden="true" className="door-layer door-layer-next">
          <DoorBody />
        </div>

        <div aria-hidden="true" className="door-open-stack">
          {showOpenLeaf && (
            <div
              className="door-open-leaf"
            >
              <DoorBody />
            </div>
          )}
        </div>

        <div aria-hidden="true" className="door-leaf" data-testid="door-leaf" ref={activeLeafRef}>
          <DoorBody />
        </div>
      </div>
    </section>
  );
}

export default EndlessDoor;
