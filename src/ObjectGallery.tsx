import React, { useEffect } from 'react';
import EndlessDoor from './EndlessDoor';
import TrifoldMap from './TrifoldMap';
import './ObjectGallery.css';

export default function ObjectGallery() {
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
    <main className="object-gallery-page">
      <section className="object-gallery-grid" aria-label="Interactive project objects">
        <div className="object-cell object-cell-door">
          <EndlessDoor />
        </div>
        <div className="object-cell object-cell-map">
          <TrifoldMap />
        </div>
      </section>
    </main>
  );
}
