import { startHandTracking } from "./handTracking.js";
import { yToNote, buildScale } from "./notes.js";
import { ROOTS, QUALITIES, chordFrequencies } from "./chords.js";
import { wedgeCenterAngle, pickWedge } from "./chordWheel.js";
import { initAudio, noteOn, setFrequency, noteOff, playChord, stopChord, setWaveform } from "./audio.js";

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const fpsEl = document.getElementById("fps");
const noteEl = document.getElementById("note");
const audioGateBtn = document.getElementById("audioGate");
const modeSelect = document.getElementById("mode");
const scaleSelect = document.getElementById("scale");
const waveSelect = document.getElementById("wave");
const rangeSelect = document.getElementById("range");

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const PINCH_ON_RATIO = 0.4;
const PINCH_OFF_RATIO = 0.55;

// 21-point hand landmark topology (MediaPipe hand model).
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
];

const WHEEL_OUTER_FRACTION = 0.28; // of canvas height
const WHEEL_INNER_FRACTION = 0.12;
const ROOT_LABELS = ROOTS.map((r) => r.name);
const QUALITY_LABELS = QUALITIES.map((q) => q.name);

let wheelConfigs = null;

function resizeCanvasToVideo() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const outerRadius = canvas.height * WHEEL_OUTER_FRACTION;
  const innerRadius = canvas.height * WHEEL_INNER_FRACTION;
  wheelConfigs = {
    // Raw canvas-space centers. CSS mirrors the whole canvas horizontally
    // (see style.css), so a raw center near the right edge appears on the
    // visual LEFT — this is what puts the root wheel where a viewer expects
    // it without touching hand-landmark coordinates at all.
    root: {
      center: { x: canvas.width * 0.78, y: canvas.height * 0.5 },
      outerRadius,
      innerRadius,
      wedgeCount: ROOTS.length,
    },
    quality: {
      center: { x: canvas.width * 0.22, y: canvas.height * 0.5 },
      outerRadius,
      innerRadius,
      wedgeCount: QUALITIES.length,
    },
  };
}

function drawHands(result) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const landmarks of result.landmarks) {
    ctx.strokeStyle = "#4fd1c5";
    ctx.lineWidth = 3;
    for (const [a, b] of HAND_CONNECTIONS) {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      ctx.beginPath();
      ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
      ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
      ctx.stroke();
    }
    ctx.fillStyle = "#f6ad55";
    for (const point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

let audioEnabled = false;
audioGateBtn.addEventListener("click", () => {
  initAudio();
  audioEnabled = true;
  audioGateBtn.classList.add("hidden");
});

function landmarkDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

let pinched = false;
let heldMidi = null;
let currentNotes = buildScale(scaleSelect.value, Number(rangeSelect.value));

function rebuildNotes() {
  currentNotes = buildScale(scaleSelect.value, Number(rangeSelect.value));
}

scaleSelect.addEventListener("change", rebuildNotes);
rangeSelect.addEventListener("change", rebuildNotes);
waveSelect.addEventListener("change", () => setWaveform(waveSelect.value));
setWaveform(waveSelect.value);

function updateMelody(result) {
  const landmarks = result.landmarks[0];
  if (!landmarks) {
    if (pinched) {
      pinched = false;
      heldMidi = null;
      if (audioEnabled) noteOff();
    }
    noteEl.textContent = "";
    return;
  }

  const handScale = landmarkDistance(landmarks[WRIST], landmarks[MIDDLE_MCP]) || 1;
  const pinchRatio = landmarkDistance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) / handScale;
  const note = yToNote(landmarks[WRIST].y, currentNotes);

  if (!pinched && pinchRatio < PINCH_ON_RATIO) {
    pinched = true;
    heldMidi = note.midi;
    if (audioEnabled) noteOn(note.freq);
  } else if (pinched && pinchRatio > PINCH_OFF_RATIO) {
    pinched = false;
    heldMidi = null;
    if (audioEnabled) noteOff();
  } else if (pinched && note.midi !== heldMidi) {
    heldMidi = note.midi;
    if (audioEnabled) setFrequency(note.freq);
  }

  noteEl.textContent = pinched ? `♪ ${note.name}` : note.name;
}

// Counters the CSS mirror locally so glyphs read upright instead of backwards.
function drawUprightText(text, x, y, font) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.font = font;
  ctx.fillStyle = "#e8e8e8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawWheel(wheel, labels, selectedIndex, offLabel = "OFF") {
  const { center, innerRadius, outerRadius, wedgeCount } = wheel;
  const wedgeAngle = (Math.PI * 2) / wedgeCount;

  for (let i = 0; i < wedgeCount; i += 1) {
    const centerAngle = wedgeCenterAngle(i, wedgeCount);
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.arc(center.x, center.y, outerRadius, centerAngle - wedgeAngle / 2, centerAngle + wedgeAngle / 2);
    ctx.closePath();
    ctx.fillStyle = i === selectedIndex ? "rgba(79, 209, 197, 0.55)" : "rgba(20, 20, 24, 0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const labelRadius = (innerRadius + outerRadius) / 2;
    drawUprightText(
      labels[i],
      center.x + Math.cos(centerAngle) * labelRadius,
      center.y + Math.sin(centerAngle) * labelRadius,
      "bold 20px system-ui, sans-serif"
    );
  }

  ctx.beginPath();
  ctx.arc(center.x, center.y, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.stroke();
  drawUprightText(
    selectedIndex === null ? offLabel : labels[selectedIndex],
    center.x,
    center.y,
    "bold 16px system-ui, sans-serif"
  );
}

const DEFAULT_QUALITY_INDEX = QUALITIES.findIndex((q) => q.name === "maj");

// Range's "2 oct" is the original/unshifted chord register; 1 and 3 shift a full octave down/up.
function chordOctaveOffset() {
  return (Number(rangeSelect.value) - 2) * 12;
}

function drawChordWheels(rootIndex, qualityIndex) {
  if (!wheelConfigs) return;
  drawWheel(wheelConfigs.root, ROOT_LABELS, rootIndex);
  drawWheel(wheelConfigs.quality, QUALITY_LABELS, qualityIndex, QUALITY_LABELS[DEFAULT_QUALITY_INDEX]);
}

let rootIndex = null;
let qualityIndex = null;
let soundingQuality = DEFAULT_QUALITY_INDEX;
let soundingOctaveOffset = chordOctaveOffset();
let chordActive = false;

function updateChords(result) {
  if (!wheelConfigs) return;

  let newRoot = null;
  let newQuality = null;
  for (const landmarks of result.landmarks) {
    const fingertip = landmarks[INDEX_TIP];
    const point = { x: fingertip.x * canvas.width, y: fingertip.y * canvas.height };
    const r = pickWedge(point, wheelConfigs.root);
    const q = pickWedge(point, wheelConfigs.quality);
    if (r !== null) newRoot = r;
    if (q !== null) newQuality = q;
  }

  // Quality wheel centered/absent defaults to "maj" rather than silence —
  // only an actual wedge pick overrides it, so a bare root already plays.
  const effectiveQuality = newQuality !== null ? newQuality : DEFAULT_QUALITY_INDEX;
  const octaveOffset = chordOctaveOffset();
  const selectionChanged =
    newRoot !== rootIndex || effectiveQuality !== soundingQuality || octaveOffset !== soundingOctaveOffset;
  rootIndex = newRoot;
  qualityIndex = newQuality;
  soundingQuality = effectiveQuality;
  soundingOctaveOffset = octaveOffset;

  if (rootIndex !== null) {
    if (!chordActive || selectionChanged) {
      chordActive = true;
      if (audioEnabled) playChord(chordFrequencies(rootIndex, soundingQuality, soundingOctaveOffset));
    }
  } else if (chordActive) {
    chordActive = false;
    if (audioEnabled) stopChord();
  }

  drawChordWheels(rootIndex, qualityIndex);
}

let mode = "melody";
modeSelect.addEventListener("change", () => {
  if (mode === "melody" && pinched) {
    pinched = false;
    heldMidi = null;
    if (audioEnabled) noteOff();
  }
  if (mode === "chord" && chordActive) {
    chordActive = false;
    rootIndex = null;
    qualityIndex = null;
    if (audioEnabled) stopChord();
  }
  mode = modeSelect.value;
  noteEl.textContent = "";
});

let frameCount = 0;
let lastFpsSample = performance.now();

function updateFps() {
  frameCount += 1;
  const now = performance.now();
  const elapsed = now - lastFpsSample;
  if (elapsed >= 500) {
    fpsEl.textContent = `${Math.round((frameCount * 1000) / elapsed)} fps`;
    frameCount = 0;
    lastFpsSample = now;
  }
}

let resized = false;

startHandTracking({
  video,
  onStatus: (msg) => {
    statusEl.textContent = msg;
  },
  onResults: (result) => {
    if (!resized && video.videoWidth) {
      resizeCanvasToVideo();
      resized = true;
    }
    drawHands(result);
    if (mode === "melody") {
      updateMelody(result);
    } else {
      updateChords(result);
    }
    updateFps();
  },
}).catch((err) => {
  console.error(err);
  statusEl.textContent = `Error: ${err.message}`;
});
