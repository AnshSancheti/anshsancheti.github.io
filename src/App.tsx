import React from 'react';
import EndlessDoor from './EndlessDoor';
import TrifoldMap from './TrifoldMap';
import './App.css';

function App() {
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

export default App;
