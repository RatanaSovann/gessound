const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BASE_MIDI = 60; // C4

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
};

function midiName(midi) {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function buildScale(scaleName, octaves) {
  const intervals = SCALES[scaleName] ?? SCALES.major;
  const midiNumbers = [];
  for (let octave = 0; octave < octaves; octave += 1) {
    for (const interval of intervals) {
      midiNumbers.push(BASE_MIDI + octave * 12 + interval);
    }
  }
  midiNumbers.push(BASE_MIDI + octaves * 12); // top octave root, e.g. C6

  return midiNumbers.map((midi) => ({
    midi,
    name: midiName(midi),
    freq: midiToFreq(midi),
  }));
}

// y=0 (top of frame) maps to the highest note in `notes`, y=1 (bottom) to the lowest.
export function yToNote(normalizedY, notes) {
  const clamped = Math.min(1, Math.max(0, normalizedY));
  const highness = 1 - clamped;
  const index = Math.min(notes.length - 1, Math.floor(highness * notes.length));
  return notes[index];
}
