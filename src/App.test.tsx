import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the endless door interaction surface', () => {
  render(<App />);
  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /click or drag left to open/i })
  ).toBeInTheDocument();
});
