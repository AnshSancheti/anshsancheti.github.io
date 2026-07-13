import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the interactive project objects', () => {
  render(<App />);
  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(screen.getByTestId('trifold-map')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /click or drag left to open/i })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /where's ansh now/i })
  ).toBeInTheDocument();
});
