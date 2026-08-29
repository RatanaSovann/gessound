import { midiToFreq } from "./notes.js";

// Chromatic root wedges for the root wheel, in wedge order (12 o'clock, clockwise).
export const ROOTS = [
  { name: "C", midi: 60 },
  { name: "C#", midi: 61 },
  { name: "D", midi: 62 },
  { name: "D#", midi: 63 },
  { name: "E", midi: 64 },
  { name: "F", midi: 65 },
  { name: "F#", midi: 66 },
  { name: "G", midi: 67 },
  { name: "G#", midi: 68 },
  { name: "A", midi: 69 },
  { name: "A#", midi: 70 },
  { name: "B", midi: 71 },
];

// Chord-quality wedges for the quality wheel, in wedge order.
export const QUALITIES = [
  { name: "maj", intervals: [0, 4, 7] },
  { name: "maj7", intervals: [0, 4, 7, 11] },
  { name: "7", intervals: [0, 4, 7, 10] },
  { name: "sus4", intervals: [0, 5, 7] },
  { name: "m", intervals: [0, 3, 7] },
  { name: "m7", intervals: [0, 3, 7, 10] },
  { name: "dim", intervals: [0, 3, 6] },
  { name: "aug", intervals: [0, 4, 8] },
];

export function chordFrequencies(rootIndex, qualityIndex) {
  const root = ROOTS[rootIndex];
  const quality = QUALITIES[qualityIndex];
  return quality.intervals.map((interval) => midiToFreq(root.midi + interval));
}
