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

test('only commits a dragged door open once it is most of the way there', () => {
  // jsdom has no PointerEvent; a MouseEvent subclass gives the handlers button and clientX.
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  const originalPointerEvent = window.PointerEvent;
  (window as any).PointerEvent = TestPointerEvent;

  const frames: FrameRequestCallback[] = [];
  const requestAnimationFrame = jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
  const originalCapture = {
    setPointerCapture: HTMLElement.prototype.setPointerCapture,
    releasePointerCapture: HTMLElement.prototype.releasePointerCapture,
    hasPointerCapture: HTMLElement.prototype.hasPointerCapture,
  };
  HTMLElement.prototype.setPointerCapture = jest.fn();
  HTMLElement.prototype.releasePointerCapture = jest.fn();
  HTMLElement.prototype.hasPointerCapture = jest.fn(() => false);

  window.history.pushState({}, '', '/door/');
  render(<App />);
  const door = screen.getByTestId('door-stage');

  // Pixels to drag for a fraction of the 180 degree swing at 0.38 degrees per pixel.
  const dragFor = (fraction: number) => Math.ceil((180 * fraction) / 0.38);
  const dragAndRelease = (fraction: number) => {
    const startX = 600;
    const endX = startX - dragFor(fraction);
    fireEvent.pointerDown(door, { pointerId: 1, button: 0, clientX: startX, clientY: 300 });
    fireEvent.pointerMove(door, { pointerId: 1, clientX: startX - 20, clientY: 300 });
    fireEvent.pointerMove(door, { pointerId: 1, clientX: endX, clientY: 300 });
    fireEvent.pointerUp(door, { pointerId: 1, clientX: endX, clientY: 300 });
    let clock = 0;
    while (frames.length > 0) {
      const frame = frames.shift();
      clock += 10_000;
      const now = clock;
      act(() => frame?.(now));
    }
  };

  dragAndRelease(0.7);
  expect(door).toHaveAttribute('data-opened-count', '0');
  expect(door).toHaveAttribute('data-transition-mode', 'idle');

  dragAndRelease(0.9);
  expect(door).toHaveAttribute('data-opened-count', '1');
  expect(door).toHaveAttribute('data-transition-mode', 'idle');

  Object.assign(HTMLElement.prototype, originalCapture);
  (window as any).PointerEvent = originalPointerEvent;
  requestAnimationFrame.mockRestore();
});
