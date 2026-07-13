import React from 'react';
import EndlessDoor from './EndlessDoor';
import PortfolioPrototype from './portfolio/PortfolioPrototype';
import NowPage from './portfolio/NowPage';
import './App.css';

function App() {
  const showDoor = new URLSearchParams(window.location.search).has('door');
  const showNow = window.location.pathname.replace(/\/+$/, '') === '/now';

  if (showDoor) return <EndlessDoor />;
  if (showNow) return <NowPage />;
  return <PortfolioPrototype />;
}

export default App;
