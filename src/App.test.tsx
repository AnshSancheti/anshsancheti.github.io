import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing hero with text', () => {
  render(<App />);
  const hero = screen.getByTestId('hero-root');
  expect(hero).toBeInTheDocument();
  expect(screen.getByText(/lorem ipsum/i)).toBeInTheDocument();
  expect(screen.getByText(/dolor sit amet\./i)).toBeInTheDocument();
});
