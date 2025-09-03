import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing hero with demo button', () => {
  render(<App />);
  const hero = screen.getByTestId('hero-root');
  expect(hero).toBeInTheDocument();
  const demoBtn = screen.getByRole('button', { name: /play demo/i });
  expect(demoBtn).toBeInTheDocument();
});
