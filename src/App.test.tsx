import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
    '/door/'
  );
});

test('renders Endless Door as a full-page experience', () => {
  window.history.pushState({}, '', '/door/');
  const { container } = render(<App />);

  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(screen.queryByTestId('trifold-map')).not.toBeInTheDocument();
  expect(container.querySelectorAll('filter')).toHaveLength(0);
  expect(container.querySelectorAll('feTurbulence')).toHaveLength(0);
  expect(container.querySelectorAll('feDisplacementMap')).toHaveLength(0);
  const door = screen.getByRole('button', { name: /click or drag left to open/i });

  const mouseEnter = new Event('pointerover', { bubbles: true });
  Object.defineProperty(mouseEnter, 'pointerType', { value: 'mouse' });
  fireEvent(door, mouseEnter);
  expect(door).toHaveClass('is-hover-preview');

  fireEvent.keyDown(door, { key: 'ArrowLeft' });
  expect(door).toHaveAttribute('data-transition-mode', 'opening');
});

test('keeps the objects URL as an alias to Endless Door', () => {
  window.history.pushState({}, '', '/objects/');
  render(<App />);

  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(screen.queryByTestId('trifold-map')).not.toBeInTheDocument();
});

test('does not run an animation loop while Endless Door is idle', () => {
  const requestAnimationFrame = jest.spyOn(window, 'requestAnimationFrame');
  window.history.pushState({}, '', '/door/');

  render(<App />);

  expect(requestAnimationFrame).not.toHaveBeenCalled();
  requestAnimationFrame.mockRestore();
});

test('does not apply the desktop hover preview to touch input', () => {
  window.history.pushState({}, '', '/door/');
  render(<App />);

  const door = screen.getByTestId('door-stage');
  const touchEnter = new Event('pointerover', { bubbles: true });
  Object.defineProperty(touchEnter, 'pointerType', { value: 'touch' });
  fireEvent(door, touchEnter);

  expect(door).not.toHaveClass('is-hover-preview');
});

test('finishes a door animation without leaving background frame work running', () => {
  const frames: FrameRequestCallback[] = [];
  const requestAnimationFrame = jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
  window.history.pushState({}, '', '/door/');
  render(<App />);

  const door = screen.getByTestId('door-stage');
  const leaf = screen.getByTestId('door-leaf');
  fireEvent.keyDown(door, { key: 'ArrowLeft' });

  expect(frames).toHaveLength(1);
  act(() => frames.shift()?.(0));
  expect(frames).toHaveLength(1);
  act(() => frames.shift()?.(480));

  expect(door).toHaveAttribute('data-transition-mode', 'idle');
  expect(door).toHaveAttribute('data-opened-count', '1');
  expect((leaf as HTMLElement).style.transform).toBe('');
  expect(frames).toHaveLength(0);
  requestAnimationFrame.mockRestore();
});

test('keeps the old door query as an alias to Endless Door', () => {
  window.history.pushState({}, '', '/?door');
  render(<App />);

  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(screen.queryByTestId('trifold-map')).not.toBeInTheDocument();
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
