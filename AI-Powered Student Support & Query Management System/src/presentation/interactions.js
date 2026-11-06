import { abortError } from './AudioPitchClock.js';

export function isVisible(element) {
  if (!element || !element.isConnected || !element.getClientRects().length) return false;
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none' && !element.closest('[aria-hidden="true"]');
}

export function createInteractions(clock, signal, onHighlight = () => {}) {
  const assertActive = () => { if (signal.aborted) throw abortError(); };
  const resolve = (selector) => typeof selector === 'function' ? selector() : [...document.querySelectorAll(selector)].find(isVisible);

  async function waitFor(selector, { timeout = 10000, enabled = false, grace = 1500 } = {}) {
    assertActive();
    return new Promise((accept, reject) => {
      let frame, elapsed = 0, previous = performance.now(), releaseHold;
      const cleanup = () => { cancelAnimationFrame(frame); signal.removeEventListener('abort', cancelled); releaseHold?.(); };
      const cancelled = () => { cleanup(); reject(abortError()); };
      const poll = () => {
        if (signal.aborted) return cancelled();
        const now = performance.now();
        if (!clock.userPaused) elapsed += now - previous;
        previous = now;
        let value;
        try { value = resolve(selector); } catch (error) { cleanup(); reject(error); return; }
        if (value && (!enabled || (!value.disabled && value.getAttribute?.('aria-disabled') !== 'true'))) {
          cleanup(); accept(value); return;
        }
        if (!releaseHold && elapsed > grace && clock.intentToPlay) releaseHold = clock.hold('Waiting for the current UI action');
        if (elapsed > timeout) { cleanup(); reject(new Error(`The expected page control did not become ready: ${typeof selector === 'string' ? selector : 'semantic target'}`)); return; }
        frame = requestAnimationFrame(poll);
      };
      signal.addEventListener('abort', cancelled, { once: true });
      poll();
    });
  }

  async function waitForActive() {
    assertActive();
    if (!clock.userPaused) return;
    await new Promise((resolveActive, reject) => {
      const check = () => { if (!clock.userPaused) { cleanup(); resolveActive(); } };
      const cancel = () => { cleanup(); reject(abortError()); };
      const cleanup = () => { clock.subscribers.delete(check); signal.removeEventListener('abort', cancel); };
      clock.subscribers.add(check);
      signal.addEventListener('abort', cancel, { once: true });
    });
  }

  async function animate(durationMs, render, startAt = clock.time) {
    assertActive();
    clock.animationCount += 1;
    await new Promise((finish, reject) => {
      let frame, settled = false;
      const cleanup = () => { if (settled) return; settled = true; clock.animationCount = Math.max(0, clock.animationCount - 1); cancelAnimationFrame(frame); signal.removeEventListener('abort', cancel); };
      const cancel = () => { cleanup(); reject(abortError()); };
      const update = () => {
        if (signal.aborted) return cancel();
        if (!clock.userPaused) {
          const progress = Math.min(1, Math.max(0, (clock.time - startAt) * 1000 / Math.max(1, durationMs)));
          try { render(progress); } catch (error) { cleanup(); reject(error); return; }
          if (progress >= 1) { cleanup(); finish(); return; }
        }
        frame = requestAnimationFrame(update);
      };
      signal.addEventListener('abort', cancel, { once: true });
      update();
    });
  }

  async function highlight(selector) {
    const element = await waitFor(selector);
    await waitForActive();
    document.querySelectorAll('[data-pitch-highlighted]').forEach((item) => item.removeAttribute('data-pitch-highlighted'));
    element.setAttribute('data-pitch-highlighted', 'true');
    onHighlight(element.getBoundingClientRect());
    return element;
  }

  async function smoothScrollTo(selector, durationMs = 800) {
    const element = await waitFor(selector);
    await waitForActive();
    let container = element.parentElement;
    while (container && container !== document.body) {
      const style = getComputedStyle(container);
      if (/(auto|scroll)/.test(style.overflowY) && container.scrollHeight > container.clientHeight + 5) break;
      container = container.parentElement;
    }
    const scrollingPage = !container || container === document.body;
    const scroller = scrollingPage ? document.scrollingElement : container;
    const rect = element.getBoundingClientRect();
    const dockHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pitch-dock-height')) || 166;
    const bounds = scrollingPage ? { top: 0, height: window.innerHeight - dockHeight - 20 } : container.getBoundingClientRect();
    const from = scroller.scrollTop;
    const to = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, from + rect.top - bounds.top - Math.max(0, (bounds.height - rect.height) / 2)));
    if (Math.abs(to - from) > 3) await animate(durationMs, (progress) => { scroller.scrollTop = from + (to - from) * (.5 - Math.cos(Math.PI * progress) / 2); });
    return highlight(() => element);
  }

  async function click(selector) {
    const element = await waitFor(selector, { enabled: true });
    await waitForActive();
    await highlight(() => element);
    element.focus?.({ preventScroll: true });
    element.click();
    return element;
  }

  const setInput = (input, text) => {
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  async function simulateTyping(inputSelector, text, speedMs = 35, startAt = clock.time) {
    const target = await waitFor(inputSelector, { enabled: true });
    const input = target.matches('input,textarea') ? target : target.querySelector('textarea:not([aria-hidden="true"]),input:not([type="hidden"])');
    if (!input) throw new Error(`No text input inside ${inputSelector}`);
    await waitForActive();
    input.focus({ preventScroll: true });
    await highlight(() => target);
    const characters = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('gu', { granularity: 'grapheme' }).segment(text)].map((part) => part.segment) : Array.from(text);
    let previous = -1;
    await animate(characters.length * speedMs, (progress) => {
      if (!input.isConnected) throw new Error('The input was replaced before typing finished.');
      const count = Math.min(characters.length, Math.floor(progress * characters.length));
      if (count !== previous) { setInput(input, characters.slice(0, count).join('')); previous = count; }
    }, startAt);
    setInput(input, text);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function fill(selector, text) {
    const target = await waitFor(selector, { enabled: true });
    const input = target.matches('input,textarea') ? target : target.querySelector('textarea:not([aria-hidden="true"]),input:not([type="hidden"])');
    if (!input) throw new Error(`No text field found: ${selector}`);
    await waitForActive();
    setInput(input, text);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return highlight(() => target);
  }

  async function select(selector, value) {
    const target = await waitFor(selector);
    const combobox = target.matches('[role="combobox"]') ? target : target.querySelector('[role="combobox"]');
    if (!combobox) throw new Error(`No select control found: ${selector}`);
    await waitFor(() => combobox, { enabled: true });
    await waitForActive();
    combobox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    await click(`[role="option"][data-value="${CSS.escape(String(value))}"]`);
  }

  function byText(selector, text) { return () => [...document.querySelectorAll(selector)].find((element) => isVisible(element) && element.textContent.trim() === text); }
  function last(selector) { return () => [...document.querySelectorAll(selector)].filter(isVisible).at(-1); }

  return { waitFor, waitForActive, animate, highlight, smoothScrollTo, click, simulateTyping, fill, select, byText, last };
}

// Named helpers are also usable by component-level presentation tests.
export async function simulateTyping(inputSelector, text, speedMs = 35, controls) {
  if (!controls) throw new Error('simulateTyping requires the active audio-clock interaction controls.');
  return controls.simulateTyping(inputSelector, text, speedMs);
}
export async function smoothScrollTo(elementSelector, durationMs = 800, controls) {
  if (!controls) throw new Error('smoothScrollTo requires the active audio-clock interaction controls.');
  return controls.smoothScrollTo(elementSelector, durationMs);
}
