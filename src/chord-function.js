import { Note, Interval, Chord } from "tonal";
import { getKeyDefinition } from "./chord-utils.js";

/**
 * 分析和弦功能
 * 支援調內和弦和借用和弦（Borrowed Chords）分析
 * 借用和弦：從平行調借用的和弦，如 C Major 中借用 C minor 的 iv、bVI、bIII
 */
export const analyzeChordFunction = (chordSymbol, keyDefinition) => {
  if (!chordSymbol || !keyDefinition) {
    return null;
  }

  const chordRoot = extractChordRoot(chordSymbol);
  if (!chordRoot) {
    return null;
  }

  const scaleDegree = getScaleDegree(chordRoot, keyDefinition);

  // 如果是屬七和弦且不是 V 級，檢測是否為副屬和弦
  const chordData = Chord.get(chordSymbol);
  const isDominant7th = chordData.type === 'dominant' ||
                        (chordSymbol.includes('7') && !chordSymbol.match(/maj7|m7|dim7|ø/i));
  
  if (isDominant7th && scaleDegree !== 5) {
    const secondaryDominant = detectSecondaryDominant(chordSymbol, chordRoot, keyDefinition);
    if (secondaryDominant) {
      return secondaryDominant;
    }
  }

  // 調內和弦：正常分析
  if (scaleDegree !== null) {
    const romanNumeral = generateRomanNumeral(scaleDegree, keyDefinition.mode);
    const { function: harmonicFunction, color } = getHarmonicFunction(scaleDegree, keyDefinition.mode);

    return {
      function: harmonicFunction,
      roman: romanNumeral,
      color: color,
      scaleDegree: scaleDegree,
      chordRoot: chordRoot
    };
  }

  // 非調內和弦：檢測是否為借用和弦
  const borrowedChord = detectBorrowedChord(chordRoot, keyDefinition);
  if (borrowedChord) {
    return {
      function: 'borrowed',
      roman: borrowedChord.roman,
      color: borrowedChord.color,
      scaleDegree: borrowedChord.scaleDegree,
      chordRoot: chordRoot,
      borrowedFrom: borrowedChord.borrowedFrom,
      description: borrowedChord.description
    };
  }

  return null;
};

/**
 * 檢測借用和弦
 * 目前支援從平行小調借用（Major Mode Borrowing）
 */
const detectBorrowedChord = (chordRoot, keyDefinition) => {
  if (keyDefinition.mode !== 'major') {
    return null;
  }

  const tonic = keyDefinition.tonic || keyDefinition.id;
  if (!tonic) {
    return null;
  }

  // 取得平行小調音階（以根音為基準的小調）
  // C Major 的平行小調是 C minor: C, D, Eb, F, G, Ab, Bb
  const parallelMinorScale = buildParallelMinorScale(tonic);

  // 檢查和弦根音是否在平行小調音階中
  const rootInfo = Note.get(chordRoot);
  if (rootInfo.empty) {
    return null;
  }

  const degreeIndex = parallelMinorScale.findIndex(scaleNote => {
    const scaleNoteInfo = Note.get(scaleNote);
    return scaleNoteInfo.pc === rootInfo.pc;
  });

  if (degreeIndex === -1) {
    return null;
  }

  const scaleDegree = degreeIndex + 1;

  // 檢查這個音級在平行小調中是否與大調不同
  // 平行小調與大調不同的音級：b3 (III), b6 (VI), b7 (VII)
  const majorScale = keyDefinition.scale;
  const isDifferentInMinor = isNoteDifferentInParallelMinor(chordRoot, majorScale, parallelMinorScale);

  if (!isDifferentInMinor) {
    return null;
  }

  // 生成借用和弦的羅馬數字標記
  return generateBorrowedRomanNumeral(scaleDegree);
};

/**
 * 檢測副屬和弦（Secondary Dominant）
 * 副屬和弦是臨時以其他音級為屬和弦的和弦，標記為 V/x
 * 例如：V/V 是「屬和弦的屬和弦」，指向 V 級
 */
const detectSecondaryDominant = (chordSymbol, chordRoot, keyDefinition) => {
  // 1. 檢測是否為屬七和弦（dominant 7th）
  const chordData = Chord.get(chordSymbol);
  const isDominant7th = chordData.type === 'dominant' || 
                        (chordSymbol.includes('7') && !chordSymbol.match(/maj7|m7|dim7|ø/i));
  
  if (!isDominant7th) {
    return null;
  }

  // 2. 計算目標音級的根音（副屬和弦根音上行純四度即為目標，因為屬和弦往下解決五度）
  const targetRoot = Note.transpose(chordRoot, '4P');
  if (!targetRoot) {
    return null;
  }

  // 3. 檢查目標根音在調內的音級
  const targetScaleDegree = getScaleDegree(targetRoot, keyDefinition);
  
  // 目標必須是調內和弦，且不能是 I 級（I 級有自己的屬和弦，就是原本的 V）
  if (!targetScaleDegree || targetScaleDegree === 1) {
    return null;
  }

  // 4. 生成目標音級的羅馬數字標記
  const targetRoman = generateRomanNumeral(targetScaleDegree, keyDefinition.mode);
  
  // 5. 計算副屬和弦所在的音級
  const secondaryDegree = getScaleDegree(chordRoot, keyDefinition);

  return {
    function: 'secondary-dominant',
    roman: `V/${targetRoman}`,
    color: 'red',
    scaleDegree: secondaryDegree || null,
    chordRoot: chordRoot,
    targetsDegree: targetScaleDegree,
    description: `副屬和弦 - 指向 ${targetRoman} 級的屬和弦`
  };
};

/**
 * 建立平行小調音階（自然小調）
 */
const buildParallelMinorScale = (tonic) => {
  // 自然小調音程：根音, 大二度, 小三度, 純四度, 純五度, 小六度, 小七度
  const minorIntervals = ['1P', '2M', '3m', '4P', '5P', '6m', '7m'];

  return minorIntervals.map(interval => {
    const note = Note.transpose(tonic, interval);
    return Note.enharmonic(note);
  });
};

/**
 * 檢查音符在平行小調中是否與大調不同
 * 大調與平行小調的差異音級：3, 6, 7
 */
const isNoteDifferentInParallelMinor = (note, majorScale, minorScale) => {
  const noteChroma = Note.get(note).chroma;

  // 檢查這個音是否在大調音階中
  const inMajor = majorScale.some(scaleNote => Note.get(scaleNote).chroma === noteChroma);

  // 檢查這個音是否在小調音階中
  const inMinor = minorScale.some(scaleNote => Note.get(scaleNote).chroma === noteChroma);

  // 借用和弦的條件：在小調中但不在大調中
  return !inMajor && inMinor;
};

/**
 * 生成借用和弦的羅馬數字標記
 * 平行小調借用：bIII, bVI, bVII, iv
 */
const generateBorrowedRomanNumeral = (scaleDegree) => {
  // 借用和弦的映射表
  const borrowedMap = {
    3: { roman: 'bIII', color: 'green', description: '平行小調借用 - 降三級大和弦' },
    6: { roman: 'bVI', color: 'blue', description: '平行小調借用 - 降六級大和弦' },
    7: { roman: 'bVII', color: 'red', description: '平行小調借用 - 降七級大和弦' },
    4: { roman: 'iv', color: 'blue', description: '平行小調借用 - 四級小和弦' }
  };

  const mapping = borrowedMap[scaleDegree];
  if (!mapping) {
    return null;
  }

  return {
    roman: mapping.roman,
    color: mapping.color,
    scaleDegree: scaleDegree,
    borrowedFrom: 'minor',
    description: mapping.description
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