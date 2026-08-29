const ATTACK_SECONDS = 0.015;
const RELEASE_SECONDS = 0.08;
const PEAK_GAIN = 0.25;
const CHORD_VOICE_GAIN = 0.15; // lower per-voice: chords sum multiple oscillators
const GLIDE_TIME_CONSTANT = 0.01;
const FILTER_CUTOFF_HZ = 2200; // tames raw sawtooth's harsh/buzzy high harmonics

let audioCtx = null;
let voice = null; // { osc, gain } — monophonic melody voice
let chordVoices = []; // { osc, gain }[] — one per chord tone
let currentWaveform = "sawtooth";

// Takes effect for voices started after this call, not ones already sounding.
export function setWaveform(type) {
  currentWaveform = type;
}

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function noteOn(freq) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  if (voice) {
    voice.osc.frequency.setTargetAtTime(freq, now, GLIDE_TIME_CONSTANT);
    return;
  }

  voice = startVoice(freq, PEAK_GAIN, now);
}

export function setFrequency(freq) {
  if (!voice || !audioCtx) return;
  voice.osc.frequency.setTargetAtTime(freq, audioCtx.currentTime, GLIDE_TIME_CONSTANT);
}

export function noteOff() {
  if (!voice || !audioCtx) return;
  releaseVoice(voice.osc, voice.gain, audioCtx.currentTime);
  voice = null;
}

function releaseVoice(osc, gain, now) {
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + RELEASE_SECONDS);
  osc.stop(now + RELEASE_SECONDS + 0.02);
}

function startVoice(freq, peakGain, now) {
  const osc = audioCtx.createOscillator();
  osc.type = currentWaveform;
  osc.frequency.value = freq;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = FILTER_CUTOFF_HZ;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + ATTACK_SECONDS);

  osc.connect(filter).connect(gain).connect(audioCtx.destination);
  osc.start(now);

  return { osc, gain, filter };
}

// Retunes existing voices by position and starts/releases voices to match
// freqs.length, so this is safe to call every time the held chord changes.
export function playChord(freqs) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  while (chordVoices.length > freqs.length) {
    const { osc, gain } = chordVoices.pop();
    releaseVoice(osc, gain, now);
  }

  freqs.forEach((freq, i) => {
    if (chordVoices[i]) {
      chordVoices[i].osc.frequency.setTargetAtTime(freq, now, GLIDE_TIME_CONSTANT);
    } else {
      chordVoices[i] = startVoice(freq, CHORD_VOICE_GAIN, now);
    }
  });
}

export function stopChord() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  for (const { osc, gain } of chordVoices) {
    releaseVoice(osc, gain, now);
  }
  chordVoices = [];
}
