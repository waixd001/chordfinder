import { Note } from "tonal";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const MAJOR_KEYS = [
	{ id: "C", label: "C major", scale: ["C", "D", "E", "F", "G", "A", "B"], accidental: "sharp" },
	{ id: "G", label: "G major", scale: ["G", "A", "B", "C", "D", "E", "F#"], accidental: "sharp" },
	{ id: "D", label: "D major", scale: ["D", "E", "F#", "G", "A", "B", "C#"], accidental: "sharp" },
	{ id: "A", label: "A major", scale: ["A", "B", "C#", "D", "E", "F#", "G#"], accidental: "sharp" },
	{ id: "E", label: "E major", scale: ["E", "F#", "G#", "A", "B", "C#", "D#"], accidental: "sharp" },
	{ id: "B", label: "B major", scale: ["B", "C#", "D#", "E", "F#", "G#", "A#"], accidental: "sharp" },
	{ id: "F#", label: "F# major", scale: ["F#", "G#", "A#", "B", "C#", "D#", "E#"], accidental: "sharp" },
	{ id: "C#", label: "C# major", scale: ["C#", "D#", "E#", "F#", "G#", "A#", "B#"], accidental: "sharp" },
	{ id: "F", label: "F major", scale: ["F", "G", "A", "Bb", "C", "D", "E"], accidental: "flat" },
	{ id: "Bb", label: "Bb major", scale: ["Bb", "C", "D", "Eb", "F", "G", "A"], accidental: "flat" },
	{ id: "Eb", label: "Eb major", scale: ["Eb", "F", "G", "Ab", "Bb", "C", "D"], accidental: "flat" },
	{ id: "Ab", label: "Ab major", scale: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"], accidental: "flat" },
	{ id: "Db", label: "Db major", scale: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"], accidental: "flat" },
	{ id: "Gb", label: "Gb major", scale: ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"], accidental: "flat" },
	{ id: "Cb", label: "Cb major", scale: ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"], accidental: "flat" },
];

const MINOR_KEYS = [
	{ id: "A", label: "A minor", scale: ["A", "B", "C", "D", "E", "F", "G"], accidental: "sharp" },
	{ id: "E", label: "E minor", scale: ["E", "F#", "G", "A", "B", "C", "D"], accidental: "sharp" },
	{ id: "B", label: "B minor", scale: ["B", "C#", "D", "E", "F#", "G", "A"], accidental: "sharp" },
	{ id: "F#", label: "F# minor", scale: ["F#", "G#", "A", "B", "C#", "D", "E"], accidental: "sharp" },
	{ id: "C#", label: "C# minor", scale: ["C#", "D#", "E", "F#", "G#", "A", "B"], accidental: "sharp" },
	{ id: "G#", label: "G# minor", scale: ["G#", "A#", "B", "C#", "D#", "E", "F#"], accidental: "sharp" },
	{ id: "D#", label: "D# minor", scale: ["D#", "E#", "F#", "G#", "A#", "B", "C#"], accidental: "sharp" },
	{ id: "A#", label: "A# minor", scale: ["A#", "B#", "C#", "D#", "E#", "F#", "G#"], accidental: "sharp" },
	{ id: "D", label: "D minor", scale: ["D", "E", "F", "G", "A", "Bb", "C"], accidental: "flat" },
	{ id: "G", label: "G minor", scale: ["G", "A", "Bb", "C", "D", "Eb", "F"], accidental: "flat" },
	{ id: "C", label: "C minor", scale: ["C", "D", "Eb", "F", "G", "Ab", "Bb"], accidental: "flat" },
	{ id: "F", label: "F minor", scale: ["F", "G", "Ab", "Bb", "C", "Db", "Eb"], accidental: "flat" },
	{ id: "Bb", label: "Bb minor", scale: ["Bb", "C", "Db", "Eb", "F", "Gb", "Ab"], accidental: "flat" },
	{ id: "Eb", label: "Eb minor", scale: ["Eb", "F", "Gb", "Ab", "Bb", "Cb", "Db"], accidental: "flat" },
	{ id: "Ab", label: "Ab minor", scale: ["Ab", "Bb", "Cb", "Db", "Eb", "Fb", "Gb"], accidental: "flat" },
];

const buildDiatonicMap = (scale) => {
	const map = new Map();
	scale.forEach((note) => {
		const chroma = Note.get(note).chroma;
		if (chroma !== null) {
			map.set(chroma, note);
		}
	});
	return map;
};

const normalizeKeyDefinitions = (keys, mode) =>
	keys.map((key) => ({
		...key,
		mode,
		diatonicMap: buildDiatonicMap(key.scale),
	}));

const KEY_DEFINITIONS = [
	...normalizeKeyDefinitions(MAJOR_KEYS, "major"),
	...normalizeKeyDefinitions(MINOR_KEYS, "minor"),
];

const ORDERED_MAJOR_ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "Cb", "Db", "Gb"];
const ORDERED_MINOR_ROOTS = ["A", "A#", "B", "C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#"];
const MAJOR_ROOTS = ORDERED_MAJOR_ROOTS.filter((root) => MAJOR_KEYS.some((key) => key.id === root));
const MINOR_ROOTS = ORDERED_MINOR_ROOTS.filter((root) => MINOR_KEYS.some((key) => key.id === root));

const sanitizeChordInput = (value) => value.replace(/[(),\s]/g, "");

const getKeyDefinition = (root, mode) =>
	KEY_DEFINITIONS.find((key) => key.id === root && key.mode === mode) ?? KEY_DEFINITIONS[0];

const selectAccidentalName = (chroma, preference) =>
	preference === "flat" ? FLAT_NAMES[chroma] : SHARP_NAMES[chroma];

const spellNoteInKey = (note, keyDefinition) => {
	const chroma = Note.get(note).chroma;
	if (chroma === null || chroma === undefined) {
		return note;
	}

	const diatonic = keyDefinition?.diatonicMap?.get(chroma);
	if (diatonic) {
		return diatonic;
	}

	return selectAccidentalName(chroma, keyDefinition?.accidental ?? "sharp");
};

const spellNotesInKey = (notes, keyDefinition) =>
	notes.map((note) => spellNoteInKey(note, keyDefinition));

const spellNotesWithOctaveInKey = (notes, keyDefinition) =>
	notes.map((note) => {
		const parsed = Note.get(note);
		if (parsed.chroma === null || parsed.oct === null) {
			return note;
		}
		const spelled = spellNoteInKey(parsed.name, keyDefinition);
		return `${spelled}${parsed.oct}`;
	});

const accidentalToAbc = (accidental) => {
	if (!accidental) {
		return "";
	}
	if (accidental === "##") {
		return "^^";
	}
	if (accidental === "bb") {
		return "__";
	}
	if (accidental === "#") {
		return "^";
	}
	if (accidental === "b") {
		return "_";
	}
	return "";
};

const toAbcNote = (note, defaultOctave = 4) => {
	const parsed = Note.get(note);
	if (!parsed.name) {
		return note;
	}

	const accidental = accidentalToAbc(parsed.acc);
	const baseLetter = parsed.letter ?? parsed.name.charAt(0);
	const octave = parsed.oct ?? defaultOctave;

	if (octave >= 5) {
		const marks = "'".repeat(octave - 5);
		return `${accidental}${baseLetter.toLowerCase()}${marks}`;
	}

	if (octave === 4) {
		return `${accidental}${baseLetter.toUpperCase()}`;
	}

	const marks = ",".repeat(4 - octave);
	return `${accidental}${baseLetter.toUpperCase()}${marks}`;
};

const buildAbcChord = (notesWithOctave, defaultOctave = 4) =>
	`[${notesWithOctave.map((note) => toAbcNote(note, defaultOctave)).join(" ")}]1`;

const toAbcKey = (root, mode) => {
	if (!root) {
		return "C";
	}
	const suffix = mode === "minor" ? "m" : "";
	return `${root}${suffix}`;
};

// Parse notes input - supports space and comma separators
const parseNotesInput = (input) => {
	if (!input || typeof input !== "string") return [];
	return input
		.split(/[,\s]+/)
		.map((n) => n.trim())
		.filter(Boolean)
		.map(stripOctave);
};

// Strip octave numbers from note (e.g., "C4" -> "C")
const stripOctave = (note) => {
	if (!note || typeof note !== "string") return "";
	return note.replace(/\d+$/, "").trim();
};

// Validate note format (e.g., "C", "C#", "Db")
const isValidNote = (note) => {
	if (!note || typeof note !== "string") return false;
	return /^[A-Ga-g][#b]?$/.test(note.trim());
};

// Normalize note to uppercase
const normalizeNote = (note) => {
	if (!note || typeof note !== "string") return "";
	return note.charAt(0).toUpperCase() + note.slice(1).toLowerCase();
};

// Check if input is a note name only (vs chord symbol)
const isNoteNameOnly = (input) => {
	if (!input || typeof input !== "string") return false;
	return /^[A-Ga-g][#b]?$/.test(input.trim());
};

// Detect input type: "chord" or "notes"
const detectInputType = (input) => {
	const notes = parseNotesInput(input);
	const validNotes = notes.filter(isValidNote);
	if (validNotes.length >= 3) {
		return "notes";
	}
	return "chord";
};

export {
	KEY_DEFINITIONS,
	MAJOR_ROOTS,
	MINOR_ROOTS,
	buildAbcChord,
	getKeyDefinition,
	isValidNote,
	normalizeNote,
	isNoteNameOnly,
	detectInputType,
	parseNotesInput,
	sanitizeChordInput,
	spellNotesInKey,
	spellNotesWithOctaveInKey,
	stripOctave,
	toAbcKey,
};
