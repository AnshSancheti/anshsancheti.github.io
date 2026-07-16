import React from 'react';
import ObjectGallery from './ObjectGallery';
import PortfolioPrototype from './portfolio/PortfolioPrototype';
import NowPage from './portfolio/NowPage';

function App() {
  const showDoor = new URLSearchParams(window.location.search).has('door');
  const path = window.location.pathname.replace(/\/+$/, '');
  const showObjects = path === '/objects';
  const showNow = path === '/now';

  if (showDoor || showObjects) return <ObjectGallery />;
  if (showNow) return <NowPage />;
  return <PortfolioPrototype />;
}

export default App;
