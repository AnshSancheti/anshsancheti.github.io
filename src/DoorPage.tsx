import React, { useEffect } from 'react';
import EndlessDoor from './EndlessDoor';
import './DoorPage.css';

export default function DoorPage() {
  useEffect(() => {
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeColor?.content;
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;

    if (themeColor) themeColor.content = '#0a0a0a';
    document.documentElement.style.background = '#0a0a0a';
    document.body.style.background = '#0a0a0a';

    return () => {
      if (themeColor && previousThemeColor) themeColor.content = previousThemeColor;
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
    };
  }, []);

  return (
    <main className="door-page" aria-label="Endless Door">
      <EndlessDoor />
    </main>
  );
}
