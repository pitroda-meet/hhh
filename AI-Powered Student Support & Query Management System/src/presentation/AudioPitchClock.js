import { PITCH_MODULES, PITCH_ROUTES, matchPitchRoute } from './routes.js';

export const abortError = () => Object.assign(new Error('Presentation action cancelled.'), { name: 'AbortError' });

// No wall-clock interval advances the presentation. Every cue and animation
// reads the HTMLAudioElement's currentTime, including the silent fallback track.
export class AudioPitchClock {
  constructor({ audio, scenes, steps, execute, getContext, onUpdate, onComplete }) {
    this.audio = audio;
    this.scenes = scenes;
    this.steps = [...steps].sort((a, b) => a.at - b.at);
    this.execute = execute;
    this.getContext = getContext;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.controller = new AbortController();
    this.status = 'idle';
    this.intentToPlay = false;
    this.done = new Set();
    this.visited = new Map();
    this.actionLog = [];
    this.holds = new Set();
    this.subscribers = new Set();
    this.pending = null;
    this.pendingHoldRelease = null;
    this.bufferLog = [];
    this.overlay = null;
    this.activeStep = null;
    this.lastPublish = 0;
    this.generation = 0;
    this.currentError = null;
    this.onTimeUpdate = () => this.tick();
    this.onEnded = () => this.finish();
    audio.addEventListener('timeupdate', this.onTimeUpdate);
    audio.addEventListener('ended', this.onEnded);
  }

  get time() { return Math.max(0, Math.min(300, Number(this.audio.currentTime) || 0)); }
  get signal() { return this.controller.signal; }
  get userPaused() { return this.status === 'paused'; }
  get scene() { return this.scenes.find((scene) => this.time >= scene.start && this.time < scene.end) || this.scenes[this.scenes.length - 1]; }

  snapshot() {
    const completedModules = PITCH_MODULES.filter((module) => PITCH_ROUTES.filter((route) => route.module === module).every((route) => this.visited.has(route.key)));
    return { status: this.status, time: this.time, scene: this.scene, overlay: this.overlay, activeStep: this.activeStep?.label || '', routes: this.visited.size, routeTotal: PITCH_ROUTES.length, modules: completedModules.length, moduleTotal: PITCH_MODULES.length, actions: this.actionLog.filter((action) => action.status === 'completed').length, totalActions: this.steps.length, error: this.currentError };
  }

  publish(force = false) {
    for (const listener of this.subscribers) listener();
    const now = performance.now();
    if (force || now - this.lastPublish >= 90) { this.lastPublish = now; this.onUpdate?.(this.snapshot()); }
  }

  startLoop() {
    cancelAnimationFrame(this.frame);
    const draw = () => { this.tick(); if (!['disposed', 'completed'].includes(this.status)) this.frame = requestAnimationFrame(draw); };
    this.frame = requestAnimationFrame(draw);
  }

  async play() {
    this.intentToPlay = true;
    this.status = this.holds.size ? 'buffering' : 'playing';
    this.publish(true);
    if (!this.holds.size) await this.audio.play();
    this.startLoop();
  }

  pause() {
    if (['idle', 'completed', 'disposed'].includes(this.status)) return;
    this.intentToPlay = false;
    this.audio.pause();
    this.status = 'paused';
    this.publish(true);
  }

  hold(reason) {
    const token = Symbol(reason);
    const entry = { reason, at: this.time, wallStart: performance.now(), durationMs: null };
    this.bufferLog.push(entry);
    this.holds.add(token);
    this.audio.pause();
    if (this.intentToPlay) this.status = 'buffering';
    this.publish(true);
    return () => {
      if (!this.holds.delete(token)) return;
      entry.durationMs = performance.now() - entry.wallStart;
      if (!this.holds.size && this.intentToPlay && this.status !== 'disposed') {
        this.status = 'playing';
        this.audio.play().catch((error) => this.fail(error));
      }
      this.publish(true);
    };
  }

  setOverlay(kind) { this.overlay = kind; this.publish(true); }

  observeRoute() {
    if (typeof document === 'undefined') return;
    const context = this.getContext();
    const pathname = context.pathname;
    const route = matchPitchRoute(pathname);
    if (!route || (route.role !== 'public' && context.app.user?.role !== route.role)) return;
    const marker = [...document.querySelectorAll('#sahay-app [data-pitch-page][data-pitch-ready="true"]')].find((element) => element.dataset.pitchPage === pathname);
    if (!marker || !marker.getClientRects().length) return;
    if (document.querySelector('#sahay-app [data-pitch-loading="true"], #sahay-app .MuiLinearProgress-root:not([aria-valuenow])')) return;
    if (!this.visited.has(route.key)) {
      this.visited.set(route.key, { key: route.key, pattern: route.path, actualPath: pathname, role: route.role, module: route.module, firstSeenAt: this.time });
      this.publish(true);
    }
  }

  tick() {
    if (['idle', 'disposed', 'completed'].includes(this.status)) return;
    if (this.status === 'playing') {
      this.observeRoute();
      if (this.time >= 300) { this.finish(); return; }
      if (!this.pending) {
        const next = this.steps.find((step) => !this.done.has(step.id) && step.at <= this.time + .004);
        if (next) void this.runStep(next);
      } else if (!this.pendingHoldRelease && this.steps.some((step) => !this.done.has(step.id) && step.at <= this.time)) {
        this.pendingHoldRelease = () => {};
        this.pendingHoldRelease = this.hold('Finishing the previous scripted action');
      }
    }
    this.publish();
  }

  async runStep(step) {
    const generation = this.generation;
    const signal = this.signal;
    this.done.add(step.id);
    this.pending = step.id;
    this.activeStep = step;
    const entry = { id: step.id, label: step.label, scene: step.scene, plannedAt: step.at, startedAt: this.time, status: 'running' };
    this.actionLog.push(entry);
    this.publish(true);
    try {
      await this.execute(step, { clock: this, signal });
      if (signal.aborted || generation !== this.generation) return;
      entry.status = 'completed'; entry.finishedAt = this.time;
    } catch (error) {
      if (error.name === 'AbortError' || signal.aborted) { entry.status = 'cancelled'; return; }
      entry.status = 'failed'; entry.error = error.message;
      this.fail(error, step);
    } finally {
      if (generation === this.generation) {
        this.pending = null;
        const release = this.pendingHoldRelease;
        this.pendingHoldRelease = null;
        release?.();
        this.publish(true);
      }
    }
  }

  fail(error, step = this.activeStep) {
    if (this.status === 'disposed' || error.name === 'AbortError') return;
    this.intentToPlay = false;
    this.audio.pause();
    this.controller.abort();
    this.status = 'error';
    this.currentError = `${step?.label || 'Presentation'}: ${error.message || error}`;
    this.publish(true);
  }

  seek(time, { clear = false } = {}) {
    this.controller.abort();
    this.controller = new AbortController();
    this.generation += 1;
    this.pending = null;
    this.pendingHoldRelease = null;
    this.holds.clear();
    this.currentError = null;
    this.activeStep = null;
    this.overlay = null;
    if (clear) { this.done.clear(); this.visited.clear(); this.actionLog = []; }
    for (const step of this.steps) {
      if (step.at < time && !this.done.has(step.id)) {
        this.done.add(step.id);
        this.actionLog.push({ id: step.id, label: step.label, plannedAt: step.at, status: 'skipped' });
      }
      if (step.at >= time) this.done.delete(step.id);
    }
    this.audio.pause();
    this.audio.currentTime = time;
    this.status = 'paused';
    this.intentToPlay = false;
    this.publish(true);
  }

  finish() {
    if (this.status === 'completed' || this.status === 'disposed') return;
    this.audio.pause();
    if (this.audio.currentTime > 300) this.audio.currentTime = 300;
    this.intentToPlay = false;
    this.status = 'completed';
    this.publish(true);
    this.onComplete?.(this.report());
  }

  report() {
    return { duration: 300, master: 'HTMLAudioElement.currentTime', completed: this.status === 'completed', visitedRoutes: [...this.visited.values()], missingRoutes: PITCH_ROUTES.filter((route) => !this.visited.has(route.key)).map(({ key, path, label }) => ({ key, path, label })), modules: this.snapshot().modules, moduleTotal: PITCH_MODULES.length, buffers: this.bufferLog.map(({ reason, at, durationMs }) => ({ reason, at, durationMs })), actions: this.actionLog.map((entry) => ({ ...entry })) };
  }

  dispose() {
    this.intentToPlay = false;
    this.audio.pause();
    this.controller.abort();
    this.generation += 1;
    this.status = 'disposed';
    cancelAnimationFrame(this.frame);
    this.audio.removeEventListener('timeupdate', this.onTimeUpdate);
    this.audio.removeEventListener('ended', this.onEnded);
    this.subscribers.clear();
  }
}
