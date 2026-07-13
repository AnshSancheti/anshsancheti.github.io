import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
  expect(screen.queryByText('Artificial Taste')).not.toBeInTheDocument();
  expect(
    within(screen.getByRole('navigation')).queryByRole('link', { name: 'Email' })
  ).not.toBeInTheDocument();
});

test('keeps the endless door available as an artifact', () => {
  window.history.pushState({}, '', '/?door');
  render(<App />);

  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /click or drag left to open/i })
  ).toBeInTheDocument();
});

test('renders the Now page as a concise prose update', () => {
  window.history.pushState({}, '', '/now/');
  render(<App />);

  const teleskope = screen.getByRole('link', { name: 'Teleskope' });
  expect(teleskope).toHaveAttribute('href', 'https://www.teleskope.ai/');
  expect(teleskope.querySelector('strong')).not.toBeNull();
  expect(screen.getByText('Artificial Taste')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Artificial Taste' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'ForecastBench' })).toHaveAttribute(
    'href',
    'https://forecastbench.org/'
  );
  expect(screen.queryByText('This site')).not.toBeInTheDocument();
});
