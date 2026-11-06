export function fallbackManifest(scenes) {
  const cues = [];
  for (const scene of scenes) {
    const roman = scene.roman.split(/(?<=[.!?])\s+/);
    const total = scene.sentences.reduce((count, sentence) => count + sentence.split(/\s+/).length, 0);
    let offset = 0;
    scene.sentences.forEach((sentence, index) => {
      const length = sentence.split(/\s+/).length;
      cues.push({ scene: scene.id, sentence: index, start: scene.start + offset / total * scene.voice_seconds, end: scene.start + (offset + length) / total * scene.voice_seconds, gu: sentence, roman: roman[index] || scene.roman });
      offset += length;
    });
  }
  return { duration: 300, voice: 'Browser Gujarati speech', language: 'gu-IN', cues };
}

export function createSilentMaster() {
  const sampleRate = 8000;
  const samples = sampleRate * 300;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const data = new DataView(buffer);
  const text = (offset, value) => Array.from(value).forEach((character, index) => data.setUint8(offset + index, character.charCodeAt(0)));
  text(0, 'RIFF'); data.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 1, true);
  data.setUint32(24, sampleRate, true); data.setUint32(28, sampleRate * 2, true);
  data.setUint16(32, 2, true); data.setUint16(34, 16, true); text(36, 'data'); data.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

export async function waitForAudio(audio, timeout = 12000) {
  if (audio.readyState >= 3) return;
  return new Promise((resolve, reject) => {
    const clean = () => { clearTimeout(timer); audio.removeEventListener('canplay', loaded); audio.removeEventListener('error', failed); };
    const loaded = () => { clean(); resolve(); };
    const failed = () => { clean(); reject(new Error('The pre-rendered Gujarati audio could not be loaded.')); };
    const timer = setTimeout(failed, timeout);
    audio.addEventListener('canplay', loaded, { once: true });
    audio.addEventListener('error', failed, { once: true });
    if (audio.error) failed();
  });
}

// The fallback still uses an HTML audio clock. If a browser voice is slower
// than a cue, the clock buffers at that cue boundary instead of cutting speech.
// Its wall-clock duration therefore depends on the installed browser voice.
export class BrowserGujaratiNarrator {
  constructor(clock, cues, getVolume) {
    this.clock = clock; this.cues = cues; this.getVolume = getVolume;
    this.lastCue = -1; this.active = null; this.release = null;
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) throw new Error('Browser speech synthesis is unavailable. Generate the Neural Gujarati audio first.');
  }
  tick() {
    if (this.clock.status !== 'playing' && this.clock.status !== 'buffering') return;
    const time = this.clock.time;
    if (this.active && time >= this.active.end && !this.release) {
      this.release = () => {};
      this.release = this.clock.hold('Waiting for Gujarati browser speech');
    }
    if (this.active) return;
    const index = this.cues.findIndex((cue) => time >= cue.start && time < cue.end);
    if (index < 0 || index === this.lastCue) return;
    this.lastCue = index;
    const cue = this.cues[index];
    if (this.getVolume().muted) return;
    const utterance = new SpeechSynthesisUtterance(cue.gu);
    utterance.lang = 'gu-IN';
    utterance.voice = speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('gu')) || null;
    utterance.rate = 1.04; utterance.volume = this.getVolume().volume;
    this.active = cue;
    utterance.onend = () => { this.active = null; const release = this.release; this.release = null; release?.(); };
    utterance.onerror = (event) => {
      this.active = null;
      if (!['canceled', 'interrupted'].includes(event.error)) this.clock.fail(new Error('This browser cannot play Gujarati speech. Generate public/audio/pitch_5_min_gu.mp3.'));
      const release = this.release; this.release = null; release?.();
    };
    speechSynthesis.speak(utterance);
  }
  pause() { speechSynthesis.pause(); }
  resume() { speechSynthesis.resume(); }
  stop() { speechSynthesis.cancel(); this.active = null; this.lastCue = -1; const release = this.release; this.release = null; release?.(); }
}
