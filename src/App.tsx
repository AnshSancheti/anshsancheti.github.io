import React from 'react';
import DoorPage from './DoorPage';
import PortfolioPrototype from './portfolio/PortfolioPrototype';
import NowPage from './portfolio/NowPage';

function App() {
  const hasDoorQuery = new URLSearchParams(window.location.search).has('door');
  const path = window.location.pathname.replace(/\/+$/, '');
  const showDoor = hasDoorQuery || path === '/door' || path === '/objects';
  const showNow = path === '/now';

  if (showDoor) return <DoorPage />;
  if (showNow) return <NowPage />;
  return <PortfolioPrototype />;
}

export default App;
