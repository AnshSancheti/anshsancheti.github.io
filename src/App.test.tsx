import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

test('renders the portfolio homepage', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Selected work' })
  ).toBeInTheDocument();
  expect(screen.getByText('Claude Explores Earth')).toBeInTheDocument();
});

test('keeps the endless door available as an artifact', () => {
  window.history.pushState({}, '', '/?door');
  render(<App />);

  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /click or drag left to open/i })
  ).toBeInTheDocument();
});
