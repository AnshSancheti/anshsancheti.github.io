import React, { useState } from 'react';

function TrifoldMap() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      aria-label="where's ansh now"
      aria-pressed={isOpen}
      className={['trifold-map-thing', isOpen ? 'opened' : ''].filter(Boolean).join(' ')}
      data-testid="trifold-map"
      onClick={() => setIsOpen((current) => !current)}
      type="button"
    >
      <span className="trifold-map-art">
        <svg aria-hidden="true" focusable="false" viewBox="0 0 140 140">
          <defs>
            <filter id="trifold-pencil" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                baseFrequency="0.022"
                numOctaves="3"
                result="noise"
                seed="7"
                type="fractalNoise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="2.1"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>

          <g className="trifold-map-closed" filter="url(#trifold-pencil)">
            <path className="trifold-map-cover" data-fill d="M44 38 L86 30 L86 102 L44 110 Z" />
            <path data-faint d="M86 30 V102" />
            <g className="trifold-map-folds">
              <path data-fill d="M86 30 L98 38 L110 30 L110 102 L98 110 L86 102 Z" />
              <path data-faint d="M98 38 V110" />
            </g>
            <g className="trifold-map-cover-marks" transform="translate(2,0)">
              <path data-stroke d="M63 50 L66 58 L74 61 L66 64 L63 72 L60 64 L52 61 L60 58 Z" />
              <path data-faint d="M52 84 q5 -3 10 0 t10 0" />
              <path data-faint d="M52 92 q5 -3 10 0 t8 0" />
            </g>
          </g>

          <g className="trifold-map-open" filter="url(#trifold-pencil)">
            <rect data-fill x="14" y="36" width="112" height="68" rx="3" />
            <path data-faint strokeDasharray="3 4" d="M51 38 V102" />
            <path data-faint strokeDasharray="3 4" d="M89 38 V102" />
            <path data-stroke d="M30 62 q9 -10 21 -6 q13 4 17 15 q4 12 -7 18 q-12 7 -23 1 q-10 -6 -9 -16 q1 -7 0 -12 Z" />
            <path data-faint d="M92 84 q5 -3 10 0 t10 0" />
            <path data-faint d="M94 92 q5 -3 10 0 t8 0" />
            <path className="trifold-map-route" data-route d="M38 84 C52 80 64 94 84 70" />
            <circle data-fill cx="38" cy="84" r="2.4" />
            <g className="trifold-map-pin">
              <path data-stroke strokeWidth="3" d="M80 64 L88 72 M88 64 L80 72" />
            </g>
            <path data-stroke d="M112 46 L114.5 52 L120 54 L114.5 56 L112 62 L109.5 56 L104 54 L109.5 52 Z" />
            <path data-faint d="M22 98 H42 M22 96 V100 M32 97 V99 M42 96 V100" />
          </g>
        </svg>
      </span>
    </button>
  );
}

export default TrifoldMap;
