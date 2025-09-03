import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders hero with name and subtitle', () => {
  render(<App />);
  const hero = screen.getByTestId('hero-root');
  expect(hero).toBeInTheDocument();
  expect(screen.getByText(/Ansh Sancheti/i)).toBeInTheDocument();
  expect(screen.getByText(/software engineer\./i)).toBeInTheDocument();
});
