import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, GlobalStyles, IconButton, LinearProgress, Paper, Portal, Slider, Stack, Tooltip, Typography } from '@mui/material';
import { DownloadRounded, PauseRounded, PlayArrowRounded, ReplayRounded, SkipNextRounded, StopRounded, SubtitlesOffOutlined, SubtitlesOutlined, VolumeOffRounded, VolumeUpRounded } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/appContext.js';
import { presentationService } from '../services/presentationService.js';
import { errorMessage } from '../utils/format.js';
import { AudioPitchClock } from '../presentation/AudioPitchClock.js';
import { PITCH_MODULES, PITCH_ROUTES, preloadPitchRoutes } from '../presentation/routes.js';
import { PITCH_SCENES, PITCH_STEPS, validatePitchPlan } from '../presentation/steps.js';
import { createStepExecutor } from '../presentation/executeStep.js';
import { BrowserGujaratiNarrator, createSilentMaster, fallbackManifest, waitForAudio } from '../presentation/audio.js';
import PitchSlides from './presentation/PitchSlides.jsx';
import gujaratiText from '../../docs/GUJARATI_VOICEOVER_5_MIN.txt?raw';
import romanText from '../../docs/ROMAN_GUJARATI_5_MIN.txt?raw';

const BASE_AUDIO = `${import.meta.env.BASE_URL}audio/pitch_5_min_gu.mp3`;
const paragraphs = (text) => text.split(/\[[^\]]+\]/).map((part) => part.trim().replace(/\s+/g, ' ')).filter(Boolean);
const GU_SCENES = paragraphs(gujaratiText);
const ROMAN_SCENES = paragraphs(romanText);
const timecode = (time) => `${String(Math.floor(Math.min(300, time) / 60)).padStart(2, '0')}:${String(Math.floor(Math.min(300, time) % 60)).padStart(2, '0')}`;
const initialView = () => ({ status: 'idle', time: 0, scene: PITCH_SCENES[0], overlay: null, activeStep: '', routes: 0, routeTotal: PITCH_ROUTES.length, modules: 0, moduleTotal: PITCH_MODULES.length, actions: 0, totalActions: PITCH_STEPS.length, error: null });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // Pre-roll only; never advances the pitch timeline.

export default function AutoPitchRunner() {
  const app = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState(initialView);
  const [countdown, setCountdown] = useState(null);
  const [volume, setVolume] = useState(.85);
  const [muted, setMuted] = useState(false);
  const [showPrompter, setShowPrompter] = useState(true);
  const [audioMode, setAudioMode] = useState('neural');
  const [manifest, setManifest] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const audioRef = useRef(null);
  const clockRef = useRef(null);
  const narratorRef = useRef(null);
  const controlsRef = useRef(null);
  const canvasRef = useRef(null);
  const audioGraphRef = useRef(null);
  const contextRef = useRef(null);
  const preferencesRef = useRef({ volume: .85, muted: false });
  const originalRef = useRef(null);
  const lifeRef = useRef(0);
  const preparationRef = useRef(null);
  const busyRef = useRef(false);
  const silentUrlRef = useRef(null);
  const memoryRef = useRef({});
  const active = view.status !== 'idle';

  useEffect(() => { contextRef.current = { app, pathname: location.pathname, search: location.search, navigate }; }, [app, location.pathname, location.search, navigate]);
  useEffect(() => { preferencesRef.current = { volume, muted }; if (audioRef.current) { audioRef.current.volume = volume; audioRef.current.muted = muted; } }, [volume, muted]);

  useEffect(() => {
    if (!active) return undefined;
    document.documentElement.dataset.autoPitchActive = 'true';
    document.documentElement.style.setProperty('--pitch-dock-height', showPrompter ? '166px' : '72px');
    return () => { delete document.documentElement.dataset.autoPitchActive; document.documentElement.style.removeProperty('--pitch-dock-height'); };
  }, [active, showPrompter]);

  useEffect(() => {
    if (!active) return undefined;
    // Keep the always-available presentation toolbar accessible while a page
    // opens its own Material UI dialog. Page dialogs remain fully functional.
    const observer = new MutationObserver(() => { if (controlsRef.current?.getAttribute('aria-hidden') === 'true') controlsRef.current.removeAttribute('aria-hidden'); });
    observer.observe(document.body, { attributes: true, attributeFilter: ['aria-hidden'], childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    let frame;
    const draw = () => {
      const canvas = canvasRef.current;
      const analyser = audioGraphRef.current?.analyser;
      if (canvas) {
        const paint = canvas.getContext('2d');
        paint.clearRect(0, 0, canvas.width, canvas.height);
        const frequencies = new Uint8Array(analyser?.frequencyBinCount || 64);
        if (analyser) analyser.getByteFrequencyData(frequencies);
        for (let index = 0; index < 22; index += 1) {
          const level = audioMode === 'neural' ? frequencies[index + 1] / 255 : 0;
          const height = 2 + level * 25;
          paint.fillStyle = index % 4 === 0 ? '#ea8a45' : '#4d839f';
          paint.fillRect(index * 5, (30 - height) / 2, 3, height);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    if (active) frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, audioMode]);

  const ensureAudioGraph = async () => {
    if (!audioGraphRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audioRef.current);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; analyser.smoothingTimeConstant = .7;
        source.connect(analyser); analyser.connect(audioContext.destination);
        audioGraphRef.current = { context: audioContext, source, analyser };
      }
    }
    await audioGraphRef.current?.context.resume();
  };

  const prepareAudio = async () => {
    const audio = audioRef.current;
    try {
      const { data } = await presentationService.loadAudioManifest();
      audio.src = BASE_AUDIO;
      audio.load();
      await waitForAudio(audio);
      setManifest(data); setAudioMode('neural');
      return { mode: 'neural', manifest: data };
    } catch {
      const data = fallbackManifest(PITCH_SCENES);
      if (silentUrlRef.current) URL.revokeObjectURL(silentUrlRef.current);
      silentUrlRef.current = createSilentMaster();
      audio.src = silentUrlRef.current;
      audio.load();
      await waitForAudio(audio);
      setManifest(data); setAudioMode('speech');
      return { mode: 'speech', manifest: data };
    }
  };

  const launch = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const generation = ++lifeRef.current;
    if (!originalRef.current) originalRef.current = { route: location.pathname + location.search, language: app.language };
    clockRef.current?.dispose(); narratorRef.current?.stop();
    setFinalReport(null); setCountdown(null); setHighlight(null);
    setView({ ...initialView(), status: 'preparing', activeStep: `Preparing audio and all ${PITCH_ROUTES.length} route modules…` });
    app.setPresentationActive(true);
    try {
      validatePitchPlan();
      if (GU_SCENES.length !== 12 || ROMAN_SCENES.length !== 12) throw new Error('The teleprompter files must contain twelve scene paragraphs.');
      await ensureAudioGraph();
      preparationRef.current = presentationService.beginPresentation();
      const [, source] = await Promise.all([preparationRef.current, prepareAudio(), preloadPitchRoutes()]);
      if (generation !== lifeRef.current) return;
      contextRef.current.app.setUser(null);
      contextRef.current.app.setLanguage('en');
      contextRef.current.app.refresh();
      navigate('/login', { replace: true });
      audioRef.current.currentTime = 0;
      audioRef.current.volume = preferencesRef.current.volume;
      audioRef.current.muted = preferencesRef.current.muted;
      memoryRef.current = {};
      const clock = new AudioPitchClock({
        audio: audioRef.current, scenes: PITCH_SCENES, steps: PITCH_STEPS,
        getContext: () => contextRef.current,
        execute: createStepExecutor(() => contextRef.current, memoryRef.current, (rect) => setHighlight({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })),
        onUpdate: setView,
        onComplete: (report) => { setFinalReport(report); setHighlight(null); },
      });
      clockRef.current = clock;
      narratorRef.current = source.mode === 'speech' ? new BrowserGujaratiNarrator(clock, source.manifest.cues, () => preferencesRef.current) : null;
      if (narratorRef.current) clock.subscribers.add(() => narratorRef.current?.tick());
      window.__sahayPitch = { snapshot: () => clock.snapshot(), report: () => clock.report() };
      for (const value of [3, 2, 1]) {
        if (generation !== lifeRef.current) return;
        setCountdown(value);
        setView((current) => ({ ...current, status: 'countdown' }));
        await sleep(1000);
      }
      if (generation !== lifeRef.current) return;
      setCountdown(null);
      await clock.play();
    } catch (error) {
      if (generation === lifeRef.current && error.name !== 'AbortError') setView((current) => ({ ...current, status: 'error', error: errorMessage(error) }));
    } finally { if (generation === lifeRef.current) busyRef.current = false; }
  };

  const stop = async () => {
    ++lifeRef.current;
    busyRef.current = true;
    clockRef.current?.dispose(); narratorRef.current?.stop();
    audioRef.current.pause();
    setCountdown(null); setHighlight(null);
    setView((current) => ({ ...current, status: 'stopping', overlay: null, activeStep: 'Returning to your saved workspace…' }));
    try {
      await preparationRef.current?.catch(() => {});
      const { data } = await presentationService.endPresentation();
      const original = originalRef.current;
      contextRef.current.app.setUser(data.user);
      contextRef.current.app.setLanguage(original?.language || 'en');
      contextRef.current.app.setPresentationActive(false);
      contextRef.current.app.refresh();
      navigate(original?.route || (data.user ? `/${data.user.role}` : '/login'), { replace: true });
      document.querySelectorAll('[data-pitch-highlighted]').forEach((element) => element.removeAttribute('data-pitch-highlighted'));
      audioRef.current.currentTime = 0;
      originalRef.current = null;
      delete window.__sahayPitch;
      setView(initialView());
    } catch (error) { setView((current) => ({ ...current, status: 'error', error: errorMessage(error) })); }
    finally { busyRef.current = false; }
  };

  const togglePause = async () => {
    const clock = clockRef.current;
    if (!clock || !['playing', 'buffering', 'paused'].includes(clock.status)) return;
    if (clock.status === 'paused') { narratorRef.current?.resume(); await clock.play().catch((error) => clock.fail(error)); }
    else { clock.pause(); narratorRef.current?.pause(); }
  };

  const seekScene = async (scene, retry = false) => {
    if (!clockRef.current || busyRef.current || !scene) return;
    busyRef.current = true;
    const generation = ++lifeRef.current;
    const clock = clockRef.current;
    clock.pause(); narratorRef.current?.stop();
    clock.seek(scene.start);
    setCountdown(null); setHighlight(null);
    setView((current) => ({ ...current, status: 'seeking', activeStep: `Preparing scene ${scene.id}…` }));
    try {
      if (retry) await presentationService.beginPresentation();
      const { data } = await presentationService.prepareCheckpoint(scene.id);
      if (generation !== lifeRef.current) return;
      contextRef.current.app.setUser(data.user);
      contextRef.current.app.setLanguage('en');
      contextRef.current.app.refresh();
      memoryRef.current.chatUrl = data.session_id ? `/student/chat?session=${data.session_id}` : undefined;
      navigate(data.user ? `/${data.user.role}` : '/login', { replace: true });
      clock.execute = createStepExecutor(() => contextRef.current, memoryRef.current, (rect) => setHighlight({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
      await sleep(80);
      await clock.play();
    } catch (error) { if (generation === lifeRef.current) clock.fail(error); }
    finally { if (generation === lifeRef.current) busyRef.current = false; }
  };

  useEffect(() => {
    if (!active) return undefined;
    const visibility = () => { if (document.hidden && clockRef.current?.intentToPlay) { clockRef.current.pause(); narratorRef.current?.pause(); } };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [active]);

  useEffect(() => () => {
    clockRef.current?.dispose(); narratorRef.current?.stop();
    if (silentUrlRef.current) URL.revokeObjectURL(silentUrlRef.current);
    audioGraphRef.current?.context.close();
  }, []);

  const downloadReport = () => {
    const report = finalReport || clockRef.current?.report();
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...report, audioMode, voice: manifest?.voice }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'sahay-auto-pitch-coverage.json'; link.click(); URL.revokeObjectURL(url);
  };

  const playing = ['playing', 'buffering'].includes(view.status);
  const cue = manifest?.cues?.find((item) => view.time >= item.start && view.time < item.end);
  const sceneIndex = Math.max(0, (view.scene?.id || 1) - 1);
  const gu = cue?.gu || GU_SCENES[sceneIndex];
  const roman = cue?.roman || ROMAN_SCENES[sceneIndex];
  const busy = ['preparing', 'countdown', 'seeking', 'stopping'].includes(view.status);

  return <>
    <audio ref={audioRef} data-testid="pitch-audio" src={BASE_AUDIO} preload="metadata" aria-hidden="true" />
    <GlobalStyles styles={{
      '@keyframes pitch-pulse': { '0%,100%': { boxShadow: '0 4px 20px #0b395425' }, '50%': { boxShadow: '0 4px 24px #ea580c38' } },
      'html[data-auto-pitch-active="true"] #sahay-app': { paddingBottom: 'var(--pitch-dock-height)' },
      'html[data-auto-pitch-active="true"] [data-pitch="demo-password-hint"]': { visibility: 'hidden' },
      'html[data-auto-pitch-active="true"] [data-pitch="chat-shell"]': { height: 'calc(100dvh - 240px - var(--pitch-dock-height)) !important', minHeight: '360px !important' },
      'html[data-auto-pitch-active="true"] .MuiDialog-container': { alignItems: 'flex-start', paddingTop: 24 },
      'html[data-auto-pitch-active="true"] .MuiDialog-paper': { maxHeight: 'calc(100dvh - var(--pitch-dock-height) - 70px)', marginTop: 0 },
      '[data-pitch-highlighted="true"]': { outline: '2px solid #e99458', outlineOffset: 4, borderRadius: 7 },
      '@media (prefers-reduced-motion: reduce)': { '.pitch-start': { animation: 'none !important' } },
    }} />
    <Portal>
      {!active && <Button className="pitch-start" data-testid="pitch-start" variant="contained" onClick={launch} disabled={!app.ready} startIcon={<PlayArrowRounded />} sx={{ position: 'fixed', right: { xs: 14, md: 24 }, bottom: 20, zIndex: 1600, borderRadius: '30px', px: 2.5, py: 1.4, animation: 'pitch-pulse 2.4s ease-in-out infinite', fontSize: '.78rem' }}>Start Video Demo (with Gujarati Audio)</Button>}
      {active && <>
        <PitchSlides kind={view.overlay} time={view.time} />
        {highlight && view.status === 'playing' && !view.overlay && <Box aria-hidden="true" sx={{ position: 'fixed', zIndex: 1550, pointerEvents: 'none', left: Math.max(8, highlight.x - 9), top: Math.max(8, highlight.y - 8), width: 7, height: 7, borderRadius: '50%', bgcolor: 'secondary.main' }} />}
        {countdown !== null && <Box data-testid="pitch-countdown" role="status" sx={{ position: 'fixed', inset: 0, zIndex: 1800, display: 'grid', placeItems: 'center', bgcolor: '#06283eea', color: '#fff', backdropFilter: 'blur(9px)' }}><Stack alignItems="center" spacing={2}><Typography variant="overline" sx={{ color: '#eab082' }}>YOUR FIVE-MINUTE PRESENTATION</Typography><Typography variant="h3" sx={{ color: '#fff' }}>Starting demo & Gujarati audio in</Typography><Typography sx={{ fontFamily: 'Plus Jakarta Sans', fontSize: 108, fontWeight: 800, lineHeight: 1.2 }}>{countdown}</Typography><Typography sx={{ color: '#b2cbd9' }}>Start your screen recorder now.</Typography></Stack></Box>}
        <Paper ref={controlsRef} data-testid="pitch-controls" role="region" aria-label="Auto-Pilot presentation controls" sx={{ position: 'fixed', zIndex: 1900, left: { xs: 10, md: 22 }, right: { xs: 10, md: 22 }, bottom: 10, p: { xs: 1.3, md: 1.7 }, bgcolor: '#fffffffa', backdropFilter: 'blur(15px)', border: '1px solid #cfdee8', boxShadow: '0 -4px 35px #0b39541f', borderRadius: '14px' }}>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
            <Box sx={{ flex: 1, minWidth: { xs: 170, md: 310 } }}><Typography data-testid="pitch-scene-title" variant="subtitle2">Scene {view.scene?.id || 1}/12: {view.scene?.title}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '.62rem' }}>{busy ? view.activeStep : view.activeStep || 'Audio currentTime is the master clock'} · Mock app data</Typography></Box>
            <Chip data-testid="pitch-route-count" size="small" label={`${view.routes}/${view.routeTotal} routes · ${view.modules}/${view.moduleTotal} modules`} sx={{ bgcolor: '#edf5f1', color: '#447d65', fontSize: '.62rem' }} />
            <Typography data-testid="pitch-time" variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums', px: 1 }}>{timecode(view.status === 'completed' ? 300 : view.time)} / 05:00</Typography>
            <Box component="canvas" ref={canvasRef} width={110} height={30} data-testid="pitch-waveform" aria-label={audioMode === 'neural' ? 'Live audio waveform' : 'Browser speech mode'} sx={{ width: 110, height: 30, display: { xs: 'none', lg: 'block' } }} />
            {busy ? <CircularProgress size={20} sx={{ mx: 1 }} /> : <Tooltip title={playing ? 'Pause audio and actions' : 'Resume audio and actions'}><span><IconButton data-testid="pitch-pause" aria-label={playing ? 'Pause presentation' : 'Resume presentation'} onClick={togglePause} disabled={!['playing', 'paused', 'buffering'].includes(view.status)} color="primary">{playing ? <PauseRounded /> : <PlayArrowRounded />}</IconButton></span></Tooltip>}
            <Tooltip title="Skip to next scene"><span><IconButton data-testid="pitch-skip" aria-label="Skip to next scene" disabled={busy || view.scene?.id === 12} onClick={() => seekScene(PITCH_SCENES[view.scene.id])}><SkipNextRounded /></IconButton></span></Tooltip>
            <Tooltip title="Reset to start"><span><IconButton data-testid="pitch-reset" aria-label="Reset presentation to start" disabled={busy} onClick={launch}><ReplayRounded /></IconButton></span></Tooltip>
            <Tooltip title={muted ? 'Unmute' : 'Mute'}><IconButton data-testid="pitch-mute" aria-label={muted ? 'Unmute narration' : 'Mute narration'} onClick={() => { setMuted(!muted); if (!muted) narratorRef.current?.stop(); }}>{muted ? <VolumeOffRounded /> : <VolumeUpRounded />}</IconButton></Tooltip>
            <Slider aria-label="Narration volume" size="small" value={volume} min={0} max={1} step={.05} onChange={(_, value) => setVolume(value)} sx={{ width: 75, mx: 1, display: { xs: 'none', sm: 'block' } }} />
            <Tooltip title={showPrompter ? 'Hide teleprompter' : 'Show teleprompter'}><IconButton data-testid="pitch-captions" aria-label={showPrompter ? 'Hide teleprompter' : 'Show teleprompter'} onClick={() => setShowPrompter(!showPrompter)}>{showPrompter ? <SubtitlesOutlined /> : <SubtitlesOffOutlined />}</IconButton></Tooltip>
            <Tooltip title="Stop and return to saved workspace"><IconButton data-testid="pitch-stop" aria-label="Stop presentation" onClick={stop} color="error"><StopRounded /></IconButton></Tooltip>
          </Stack>
          <LinearProgress variant="determinate" value={view.status === 'completed' ? 100 : view.time / 3} sx={{ mt: 1, height: 3, borderRadius: 4, bgcolor: '#e8eff4', '& .MuiLinearProgress-bar': { bgcolor: '#dc8b50' } }} />
          {showPrompter && <Box data-testid="pitch-teleprompter" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: .6, md: 3 }, pt: 1.2 }}><Typography lang="gu" sx={{ fontFamily: 'Noto Sans Gujarati, sans-serif', fontSize: { xs: '.8rem', md: '.96rem' }, lineHeight: 1.8, maxHeight: 66, overflowY: 'auto' }}>{gu}</Typography><Typography sx={{ fontSize: '.74rem', color: '#6c8293', lineHeight: 1.9, maxHeight: 66, overflowY: 'auto' }}>{roman}</Typography></Box>}
          {audioMode === 'speech' && <Typography variant="caption" sx={{ display: 'block', color: '#a77b43', mt: .5 }}>Browser Gujarati speech fallback · voice availability and buffering depend on this browser.</Typography>}
          {view.status === 'buffering' && <Typography variant="caption" color="text.secondary">Audio clock held while the current action becomes ready.</Typography>}
          {view.error && <Alert severity="error" sx={{ mt: 1 }} action={<Button color="inherit" size="small" onClick={() => seekScene(view.scene, true)}>Retry scene</Button>}>{view.error}</Alert>}
          {view.status === 'completed' && <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}><Typography variant="caption" color={finalReport?.missingRoutes.length ? 'warning.main' : 'success.main'}>{finalReport?.missingRoutes.length ? `${finalReport.missingRoutes.length} routes were skipped. Replay for full coverage.` : 'All 29 routes visited. Five-minute presentation complete.'}</Typography><Button size="small" startIcon={<DownloadRounded />} onClick={downloadReport}>Coverage report</Button></Stack>}
        </Paper>
      </>}
    </Portal>
  </>;
}
