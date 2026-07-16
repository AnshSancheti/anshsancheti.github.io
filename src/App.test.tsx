import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

  expect(screen.getByRole('link', { name: /Reddit Atlas/ })).toHaveAttribute(
    'target',
    '_blank'
  );
  const dongsGallery = screen.getByRole('link', { name: /DONGs Gallery/ });
  expect(dongsGallery).toHaveAttribute('target', '_blank');
  expect(dongsGallery).toHaveAttribute('rel', 'noreferrer');
  expect(dongsGallery.querySelector('.minimal-arrow')).toHaveClass(
    'minimal-arrow--external'
  );
  expect(screen.getByRole('link', { name: 'NYC Tree Foliage' })).toHaveAttribute(
    'href',
    '/nyc-tree-map/'
  );
  expect(screen.getByRole('link', { name: 'Endless Door' })).toHaveAttribute(
    'href',
    '/objects/'
  );
});

test('renders the recovered interactive objects page', () => {
  window.history.pushState({}, '', '/objects/');
  render(<App />);

  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(screen.getByTestId('trifold-map')).toBeInTheDocument();
  const door = screen.getByRole('button', { name: /click or drag left to open/i });
  const map = screen.getByRole('button', { name: /where's ansh now/i });

  fireEvent.pointerEnter(door);
  expect(door).toHaveClass('is-hover-preview');

  fireEvent.keyDown(door, { key: 'ArrowLeft' });
  expect(door).toHaveAttribute('data-transition-mode', 'opening');

  fireEvent.click(map);
  expect(map).toHaveAttribute('aria-pressed', 'true');
});

test('keeps the old door URL as an alias to the recovered objects page', () => {
  window.history.pushState({}, '', '/?door');
  render(<App />);

  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(screen.getByTestId('trifold-map')).toBeInTheDocument();
});

test('renders the Now page as a concise prose update', () => {
  window.history.pushState({}, '', '/now/');
  render(<App />);

  const teleskope = screen.getByRole('link', { name: 'Teleskope' });
  expect(teleskope).toHaveAttribute('href', 'https://www.teleskope.ai/');
  expect(teleskope.querySelector('strong')).not.toBeNull();
  expect(screen.getByText('Artificial Taste')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Artificial Taste' })).not.toBeInTheDocument();
  const forecastBench = screen.getByRole('link', { name: 'ForecastBench' });
  expect(forecastBench).toHaveAttribute(
    'href',
    'https://forecastbench.org/'
  );
  expect(forecastBench.querySelector('strong')).not.toBeNull();
  expect(screen.queryByText('This site')).not.toBeInTheDocument();
});
