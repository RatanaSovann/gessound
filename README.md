# Gessound

Play chords and melodies with your hands, through your webcam. Hand tracking runs entirely
in the browser (MediaPipe Tasks Vision); sound is synthesized live with the Web Audio API.
No build step, no dependencies to install.

## Running it

MediaPipe's WASM needs the page served with COOP/COEP headers (for its multi-threaded build),
so a plain static server (or `file://`) won't do:

```
python serve.py 8765
```

Open `http://localhost:8765` in Chrome, grant camera access, then click "Click to enable
audio" (required once, by browser autoplay policy).

## Modes

- **Melody** — your hand's vertical position selects a pitch (quantized to the current scale);
  pinch (thumb to index finger) to trigger the note, release to stop. Move while pinching to
  glide between notes.
- **Chord** — two fixed radial wheels overlaid on the video. Point your left hand at the root
  wheel (12 chromatic notes) and your right hand at the quality wheel (maj, maj7, 7, sus4, m,
  m7, dim, aug). The chord sounds continuously as soon as a root is selected — the quality
  wheel defaults to major when centered/untouched, only overriding when you actually point at
  a wedge. Pull a hand back to a wheel's center or out of frame to silence that side.

## Controls

- **Mode** — Melody / Chord.
- **Scale** — Major, Minor, Major Pentatonic, Minor Pentatonic. Melody only (the chord root
  wheel is a fixed chromatic 12, so "scale" doesn't apply there).
- **Wave** — oscillator waveform (Sawtooth, Sine, Triangle, Square). Applies to both modes,
  live — it retimbres whatever's currently sounding, not just new notes.
- **Range** — octave span. In Melody, how many octaves the vertical position covers. In Chord,
  which octave the chord is voiced in (2 oct = default register, 1/3 shift it down/up).

## Project structure

- `index.html`, `style.css` — page shell, HUD controls, dark theme.
- `src/handTracking.js` — webcam capture + MediaPipe `HandLandmarker`, decoupled from audio
  and rendering (emits landmark results via a callback).
- `src/main.js` — per-frame integration: skeleton overlay, melody/chord state machines, chord
  wheel rendering.
- `src/notes.js` — scale tables and pitch quantization for Melody mode.
- `src/chords.js` — chord root/quality tables and frequency construction for Chord mode.
- `src/chordWheel.js` — pure radial wedge geometry (hit-testing), shared by both wheels and by
  the rendering code so they can't drift out of sync.
- `src/audio.js` — Web Audio synth engine: one monophonic voice for melody, an independent
  polyphonic voice bank for chords.
- `serve.py` — static file server that sends the COOP/COEP headers MediaPipe needs.

## Known caveats

- Hand-tracking inference runs on CPU (XNNPACK) rather than GPU by default — this project was
  built/tested on a machine without real GPU acceleration in Chrome (a software WebGL
  renderer), where CPU delegate outperformed the "GPU" delegate. If you have real hardware
  acceleration, `delegate: "CPU"` in `src/handTracking.js` may be worth changing back to
  `"GPU"`.
- Tested in Chrome. Other browsers aren't verified.
