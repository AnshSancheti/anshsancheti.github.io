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
  expect(
    screen.getByRole('link', { name: 'Rendezvous' })
  ).toHaveAttribute('href', 'https://claude-explores-earth.fly.dev/');
  expect(screen.queryByText('Artificial Taste')).not.toBeInTheDocument();
  expect(
    within(screen.getByRole('navigation')).queryByRole('link', { name: 'Email' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('Some projects take a few seconds to wake up.')
  ).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Outbid/ })).toHaveTextContent(
    'Guess which painting sold for more. Learned nothing about art and too much about money.'
  );

  expect(screen.getByRole('link', { name: /Reddit Atlas/ })).toHaveAttribute(
    'target',
    '_blank'
  );
  expect(screen.getByRole('link', { name: /New New York/ })).toHaveTextContent(
    'Weekly updating map of new and closing restaurants in NYC'
  );
  const dongsGallery = screen.getByRole('link', { name: /DONGs Gallery/ });
  expect(dongsGallery).toHaveAttribute('target', '_blank');
  expect(dongsGallery).toHaveAttribute('rel', 'noreferrer');
  expect(dongsGallery.querySelector('.minimal-arrow')).toHaveClass(
    'minimal-arrow--external'
  );
  expect(screen.getByRole('link', { name: 'Endless Autumn' })).toHaveAttribute(
    'href',
    '/endless-autumn/'
  );
  expect(screen.getByRole('link', { name: 'Open Door Policy' })).toHaveAttribute(
    'href',
    '/door/'
  );
  expect(screen.getByRole('link', { name: 'Poll Position' })).toHaveAttribute(
    'href',
    '/us-voter-turnout/'
  );
});

test('renders Open Door Policy as a full-page experience', () => {
  window.history.pushState({}, '', '/door/');
  const { container } = render(<App />);

  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(screen.queryByTestId('trifold-map')).not.toBeInTheDocument();
  expect(container.querySelectorAll('filter')).toHaveLength(0);
  expect(container.querySelectorAll('feTurbulence')).toHaveLength(0);
  expect(container.querySelectorAll('feDisplacementMap')).toHaveLength(0);
  const door = screen.getByRole('button', { name: /click or drag left to open/i });

  fireEvent.keyDown(door, { key: 'ArrowLeft' });
  expect(door).toHaveAttribute('data-transition-mode', 'opening');
});

test('keeps the objects URL as an alias to Open Door Policy', () => {
  window.history.pushState({}, '', '/objects/');
  render(<App />);

  expect(screen.getByTestId('endless-door')).toBeInTheDocument();
  expect(screen.queryByTestId('trifold-map')).not.toBeInTheDocument();
});

test('does not run an animation loop while Open Door Policy is idle', () => {
  const requestAnimationFrame = jest.spyOn(window, 'requestAnimationFrame');
  window.history.pushState({}, '', '/door/');

  render(<App />);

  expect(requestAnimationFrame).not.toHaveBeenCalled();
  requestAnimationFrame.mockRestore();
});

test('does not preview the door on hover', () => {
  window.history.pushState({}, '', '/door/');
  render(<App />);

  const door = screen.getByTestId('door-stage');
  const leaf = screen.getByTestId('door-leaf');
  const mouseEnter = new Event('pointerover', { bubbles: true });
  Object.defineProperty(mouseEnter, 'pointerType', { value: 'mouse' });
  fireEvent(door, mouseEnter);

  expect(door).not.toHaveClass('is-hover-preview');
  expect((leaf as HTMLElement).style.transform).toBe('');
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
  act(() => frames.shift()?.(160));
  expect((leaf as HTMLElement).style.transform).toContain('rotateY(-11.25deg)');
  expect(frames).toHaveLength(1);
  act(() => frames.shift()?.(640));

  expect(door).toHaveAttribute('data-transition-mode', 'idle');
  expect(door).toHaveAttribute('data-opened-count', '1');
  expect((leaf as HTMLElement).style.transform).toContain('rotateY(-180deg)');
  expect(frames).toHaveLength(1);
  act(() => frames.shift()?.(656));

  expect((leaf as HTMLElement).style.transform).toBe('');
  expect(frames).toHaveLength(0);

  fireEvent.keyDown(door, { key: 'ArrowRight' });
  expect(frames).toHaveLength(1);
  act(() => frames.shift()?.(1000));
  act(() => frames.shift()?.(1160));
  expect((leaf as HTMLElement).style.transform).toContain('rotateY(-168.75deg)');
  act(() => frames.shift()?.(1640));

  expect(door).toHaveAttribute('data-transition-mode', 'idle');
  expect(door).toHaveAttribute('data-opened-count', '0');
  expect((leaf as HTMLElement).style.transform).toBe('');
  expect(frames).toHaveLength(0);
  requestAnimationFrame.mockRestore();
});

test('keeps the old door query as an alias to Open Door Policy', () => {
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
  expect(screen.queryByText('Artificial Taste')).not.toBeInTheDocument();
  expect(screen.queryByText('ForecastBench')).not.toBeInTheDocument();
  expect(screen.queryByText('This site')).not.toBeInTheDocument();
});
