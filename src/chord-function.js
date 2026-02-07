import { Note } from "tonal";
import { getKeyDefinition } from "./chord-utils.js";

export const analyzeChordFunction = (chordSymbol, keyDefinition) => {
  if (!chordSymbol || !keyDefinition) {
    return null;
  }

  const chordRoot = extractChordRoot(chordSymbol);
  if (!chordRoot) {
    return null;
  }

  const scaleDegree = getScaleDegree(chordRoot, keyDefinition);
  if (scaleDegree === null) {
    return null;
  }

  const romanNumeral = generateRomanNumeral(scaleDegree, keyDefinition.mode);
  const { function: harmonicFunction, color } = getHarmonicFunction(scaleDegree, keyDefinition.mode);

  return {
    function: harmonicFunction,
    roman: romanNumeral,
    color: color,
    scaleDegree: scaleDegree,
    chordRoot: chordRoot
  };
};

const extractChordRoot = (chordSymbol) => {
  if (!chordSymbol || typeof chordSymbol !== 'string') {
    return null;
  }

  const cleaned = chordSymbol.replace(/[(),\s]/g, '');
  const rootMatch = cleaned.match(/^([A-G][#b]?)/i);
  if (!rootMatch) {
    return null;
  }

  const root = rootMatch[1];
  const noteInfo = Note.get(root);
  if (noteInfo.empty) {
    return null;
  }

  return root.toUpperCase();
};

const getScaleDegree = (note, keyDefinition) => {
  if (!keyDefinition || !keyDefinition.scale || !Array.isArray(keyDefinition.scale)) {
    return null;
  }

  const noteInfo = Note.get(note);
  if (noteInfo.empty) {
    return null;
  }

  const normalizedNote = noteInfo.pc;
  const degreeIndex = keyDefinition.scale.findIndex(scaleNote => {
    const scaleNoteInfo = Note.get(scaleNote);
    return scaleNoteInfo.pc === normalizedNote;
  });

  if (degreeIndex === -1) {
    return null;
  }

  return degreeIndex + 1;
};

const generateRomanNumeral = (scaleDegree, mode) => {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  
  if (scaleDegree < 1 || scaleDegree > 7) {
    return 'N/A';
  }

  let roman = romanNumerals[scaleDegree - 1];
  
  if (mode === 'major') {
    if (scaleDegree === 2 || scaleDegree === 3 || scaleDegree === 6) {
      roman = roman.toLowerCase();
    } else if (scaleDegree === 7) {
      roman = roman.toLowerCase() + '°';
    }
  } else if (mode === 'minor') {
    if (scaleDegree === 1 || scaleDegree === 4 || scaleDegree === 5) {
      roman = roman.toLowerCase();
    } else if (scaleDegree === 2) {
      roman = roman.toLowerCase() + '°';
    }
  }

  return roman;
};

const getHarmonicFunction = (scaleDegree, mode) => {
  let harmonicFunction = 'tonic';
  let color = 'green';

  if (mode === 'major') {
    if (scaleDegree === 1 || scaleDegree === 3 || scaleDegree === 6) {
      harmonicFunction = 'tonic';
      color = 'green';
    } else if (scaleDegree === 4 || scaleDegree === 2) {
      harmonicFunction = 'subdominant';
      color = 'blue';
    } else if (scaleDegree === 5 || scaleDegree === 7) {
      harmonicFunction = 'dominant';
      color = 'red';
    }
  } else if (mode === 'minor') {
    if (scaleDegree === 1 || scaleDegree === 3 || scaleDegree === 6) {
      harmonicFunction = 'tonic';
      color = 'green';
    } else if (scaleDegree === 4 || scaleDegree === 2) {
      harmonicFunction = 'subdominant';
      color = 'blue';
    } else if (scaleDegree === 5 || scaleDegree === 7) {
      harmonicFunction = 'dominant';
      color = 'red';
    }
  }

  return { function: harmonicFunction, color };
};

export const testChordFunctionAnalysis = () => {
  // Test function for chord function analysis - can be used for debugging
  const cMajorKey = getKeyDefinition('C', 'major');
  
  const tests = [
    { chord: 'C', expected: { function: 'tonic', roman: 'I', color: 'green' } },
    { chord: 'F', expected: { function: 'subdominant', roman: 'IV', color: 'blue' } },
    { chord: 'G', expected: { function: 'dominant', roman: 'V', color: 'red' } },
    { chord: 'Am', expected: { function: 'tonic', roman: 'vi', color: 'green' } },
    { chord: 'Dm', expected: { function: 'subdominant', roman: 'ii', color: 'blue' } },
    { chord: 'Em', expected: { function: 'tonic', roman: 'iii', color: 'green' } },
    { chord: 'Bdim', expected: { function: 'dominant', roman: 'vii°', color: 'red' } },
  ];

  const nonDiatonicTests = [
    { chord: 'Eb', expected: null },
    { chord: 'F#', expected: null },
    { chord: 'Ab', expected: null },
  ];

  const aMinorKey = getKeyDefinition('A', 'minor');
  
  const minorTests = [
    { chord: 'Am', expected: { function: 'tonic', roman: 'i', color: 'green' } },
    { chord: 'C', expected: { function: 'tonic', roman: 'III', color: 'green' } },
    { chord: 'Dm', expected: { function: 'subdominant', roman: 'iv', color: 'blue' } },
    { chord: 'Em', expected: { function: 'dominant', roman: 'v', color: 'red' } },
    { chord: 'F', expected: { function: 'tonic', roman: 'VI', color: 'green' } },
    { chord: 'G', expected: { function: 'dominant', roman: 'VII', color: 'red' } },
    { chord: 'Bdim', expected: { function: 'subdominant', roman: 'ii°', color: 'blue' } },
  ];

  // Run all tests and return results
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  // Test C major chords
  tests.forEach(test => {
    const result = analyzeChordFunction(test.chord, cMajorKey);
    const passed = result && result.roman === test.expected.roman && result.function === test.expected.function && result.color === test.expected.color;
    results.details.push({ chord: test.chord, passed, expected: test.expected, actual: result });
    passed ? results.passed++ : results.failed++;
  });

  // Test non-diatonic chords
  nonDiatonicTests.forEach(test => {
    const result = analyzeChordFunction(test.chord, cMajorKey);
    const passed = result === null;
    results.details.push({ chord: test.chord, passed, expected: null, actual: result });
    passed ? results.passed++ : results.failed++;
  });

  // Test A minor chords
  minorTests.forEach(test => {
    const result = analyzeChordFunction(test.chord, aMinorKey);
    const passed = result && result.roman === test.expected.roman;
    results.details.push({ chord: test.chord, passed, expected: test.expected, actual: result });
    passed ? results.passed++ : results.failed++;
  });

  return results;
};