type PixelRect = [x: number, y: number, width: number, height: number];

const aTop: PixelRect = [2, 2, 4, 2];
const aUpperLeft: PixelRect = [1, 3, 2, 4];
const aUpperRight: PixelRect = [5, 3, 2, 4];
const aCrossbar: PixelRect = [1, 7, 6, 2];
const aLowerLeft: PixelRect = [1, 9, 2, 5];
const aLowerRight: PixelRect = [5, 9, 2, 5];
const sTop: PixelRect = [9, 2, 6, 2];
const sUpperLeft: PixelRect = [9, 4, 2, 3];
const sMiddle: PixelRect = [9, 7, 6, 2];
const sLowerRight: PixelRect = [13, 9, 2, 3];
const sBottom: PixelRect = [9, 12, 6, 2];

const frames: PixelRect[][] = [
  [aTop],
  [aTop, aUpperLeft, aUpperRight],
  [aTop, aUpperLeft, aUpperRight, aCrossbar],
  [aTop, aUpperLeft, aUpperRight, aCrossbar, aLowerLeft, aLowerRight],
  [aTop, aUpperLeft, aUpperRight, aCrossbar, aLowerLeft, aLowerRight, sTop],
  [aTop, aUpperLeft, aUpperRight, aCrossbar, aLowerLeft, aLowerRight, sTop, sUpperLeft, sMiddle],
  [aTop, aUpperLeft, aUpperRight, aCrossbar, aLowerLeft, aLowerRight, sTop, sUpperLeft, sMiddle, sLowerRight],
  [aTop, aUpperLeft, aUpperRight, aCrossbar, aLowerLeft, aLowerRight, sTop, sUpperLeft, sMiddle, sLowerRight, sBottom],
];

const frameDurations = [90, 90, 90, 110, 90, 90, 90, 160];

const drawFrame = (rectangles: PixelRect[]) => {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = 16 * scale;
  canvas.height = 16 * scale;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.imageSmoothingEnabled = false;
  context.fillStyle = '#171715';

  rectangles.forEach(([x, y, width, height]) => {
    context.fillRect(x * scale, y * scale, width * scale, height * scale);
  });

  return canvas.toDataURL('image/png');
};

const hasPlayed = () => {
  if (process.env.NODE_ENV === 'development') return false;

  try {
    return sessionStorage.getItem('as-favicon-animated') === 'true';
  } catch {
    return false;
  }
};

const markAsPlayed = () => {
  try {
    sessionStorage.setItem('as-favicon-animated', 'true');
  } catch {
    // Storage can be unavailable in strict privacy modes; animation still works.
  }
};

export const animateFavicon = () => {
  const favicon = document.querySelector<HTMLLinkElement>('#favicon');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (!favicon || reducedMotion || hasPlayed()) return;

  const renderedFrames = frames.map(drawFrame);
  if (renderedFrames.some((frame) => frame === null)) return;

  const play = () => {
    markAsPlayed();
    favicon.type = 'image/png';
    favicon.setAttribute('sizes', '32x32');

    let frameIndex = 0;

    const advance = () => {
      favicon.href = renderedFrames[frameIndex] as string;

      if (frameIndex === renderedFrames.length - 1) {
        window.setTimeout(() => {
          favicon.href = `${process.env.PUBLIC_URL}/favicon-32x32.png`;
        }, frameDurations[frameIndex]);
        return;
      }

      window.setTimeout(() => {
        frameIndex += 1;
        advance();
      }, frameDurations[frameIndex]);
    };

    advance();
  };

  if (document.visibilityState === 'visible') {
    play();
  } else {
    document.addEventListener('visibilitychange', play, { once: true });
  }
};
