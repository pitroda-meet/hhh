import { test, expect } from '@playwright/test';

async function startPitch(page) {
  await page.getByTestId('pitch-start').click();
  await expect(page.getByTestId('pitch-countdown')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('pitch-countdown')).toHaveCount(0, { timeout: 10000 });
  await expect.poll(() => page.evaluate(() => window.__sahayPitch?.snapshot().status), { timeout: 10000 }).toBe('playing');
}

test('complete real-time Gujarati audio tour visits all 29 routes without manual page actions', async ({ page }, testInfo) => {
  test.setTimeout(390000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/login');
  await startPitch(page);
  const start = Date.now();
  const captured = new Set();
  let state;
  while (Date.now() - start < 350000) {
    state = await page.evaluate(() => window.__sahayPitch.snapshot());
    if (state.status === 'error') throw new Error(`Auto-Pilot failed at ${state.time.toFixed(2)}s: ${state.error}`);
    if ([3, 5, 6, 8, 9, 10, 12].includes(state.scene.id) && state.time > state.scene.start + 8 && !captured.has(state.scene.id)) {
      captured.add(state.scene.id);
      await page.screenshot({ path: testInfo.outputPath(`scene-${state.scene.id}.png`), animations: 'disabled' });
    }
    if (state.status === 'completed') break;
    await page.waitForTimeout(500);
  }
  expect(state.status).toBe('completed');
  const report = await page.evaluate(() => window.__sahayPitch.report());
  await testInfo.attach('coverage-report', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
  expect(report.missingRoutes).toEqual([]);
  expect(report.visitedRoutes).toHaveLength(29);
  expect(report.modules).toBe(16);
  expect(report.actions.filter((action) => action.status !== 'completed')).toEqual([]);
  expect(report.master).toBe('HTMLAudioElement.currentTime');
  expect(Date.now() - start).toBeLessThan(310000);
  await expect(page.getByTestId('pitch-time')).toHaveText('05:00 / 05:00');
  expect(errors).toEqual([]);
});

test('pause, volume, captions, skip, reset and stop preserve normal saved data', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('demo-student').click();
  await expect(page.getByRole('heading', { name: /Welcome back, Aarav/ })).toBeVisible();
  const original = await page.evaluate(() => ({ db: localStorage.getItem('sahay.database.v1'), auth: localStorage.getItem('sahay.auth.v1') }));
  await startPitch(page);
  await page.getByTestId('pitch-pause').click();
  const paused = await page.getByTestId('pitch-audio').evaluate((audio) => audio.currentTime);
  await page.waitForTimeout(800);
  expect(await page.getByTestId('pitch-audio').evaluate((audio) => audio.currentTime)).toBeCloseTo(paused, 1);
  await page.getByTestId('pitch-captions').click();
  await expect(page.getByTestId('pitch-teleprompter')).toHaveCount(0);
  await page.getByTestId('pitch-mute').click();
  expect(await page.getByTestId('pitch-audio').evaluate((audio) => audio.muted)).toBe(true);
  await page.getByTestId('pitch-mute').click();
  await page.getByTestId('pitch-pause').click();
  await page.getByTestId('pitch-skip').click();
  await expect.poll(() => page.evaluate(() => window.__sahayPitch.snapshot().scene.id)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.__sahayPitch.snapshot().status)).toBe('playing');
  await page.getByTestId('pitch-reset').click();
  await expect(page.getByTestId('pitch-countdown')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('pitch-stop').click({ force: true });
  await expect(page.getByTestId('pitch-start')).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/student$/);
  const after = await page.evaluate(() => ({ db: localStorage.getItem('sahay.database.v1'), auth: localStorage.getItem('sahay.auth.v1') }));
  expect(after).toEqual(original);
});

test('missing prerecorded audio automatically uses Gujarati browser speech', async ({ page }) => {
  await page.addInitScript(() => {
    window.__spoken = [];
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ lang: 'gu-IN', name: 'Test Gujarati voice' }],
      speak: (utterance) => { window.__spoken.push({ text: utterance.text, lang: utterance.lang }); setTimeout(() => utterance.onend?.(), 40); },
      pause() {}, resume() {}, cancel() {},
    } });
  });
  await page.route('**/audio/pitch_5_min_gu.mp3', (route) => route.abort());
  await page.route('**/audio/pitch_manifest.json', (route) => route.abort());
  await page.goto('/login');
  await startPitch(page);
  await expect(page.getByText(/Browser Gujarati speech fallback/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBeGreaterThan(0);
  const spoken = await page.evaluate(() => window.__spoken[0]);
  expect(spoken.lang).toBe('gu-IN');
  expect(spoken.text).toContain('પરીક્ષાનું ફોર્મ');
  await page.getByTestId('pitch-stop').click();
  await expect(page.getByTestId('pitch-start')).toBeVisible();
});
