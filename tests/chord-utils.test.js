import { getKeyDefinition, spellNotesInKey, parseNotesInput, normalizeNote, isValidNote, isNoteNameOnly, stripOctave } from "../src/chord-utils.js";

const assertEqual = (actual, expected, message) => {
	if (actual !== expected) {
		throw new Error(`${message} Expected "${expected}", got "${actual}".`);
	}
};

const assertArrayEqual = (actual, expected, message) => {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(`${message} Expected "${JSON.stringify(expected)}", got "${JSON.stringify(actual)}".`);
	}
};

const test = (name, fn) => {
	try {
		fn();
		return { name, status: "pass" };
	} catch (error) {
		return { name, status: "fail", error };
	}
};

const runChordUtilsTests = () => {
	const results = [];

	results.push(
		test("C# major spells F as E#", () => {
			const key = getKeyDefinition("C#", "major");
			const [spelled] = spellNotesInKey(["F"], key);
			assertEqual(spelled, "E#", "C# major diatonic spelling mismatch.");
		})
	);

	results.push(
		test("Gb major spells B as Cb", () => {
			const key = getKeyDefinition("Gb", "major");
			const [spelled] = spellNotesInKey(["B"], key);
			assertEqual(spelled, "Cb", "Gb major diatonic spelling mismatch.");
		})
	);

	results.push(
		test("F major prefers flats for non-diatonic chroma", () => {
			const key = getKeyDefinition("F", "major");
			const [spelled] = spellNotesInKey(["C#"], key);
			assertEqual(spelled, "Db", "F major chromatic spelling mismatch.");
		})
	);

	results.push(
		test("C minor prefers flats for non-diatonic chroma", () => {
			const key = getKeyDefinition("C", "minor");
			const [spelled] = spellNotesInKey(["F#"], key);
			assertEqual(spelled, "Gb", "C minor chromatic spelling mismatch.");
		})
	);

	// Note Parsing Tests
	results.push(
		test("parseNotesInput parses space-delimited notes", () => {
			const result = parseNotesInput("C E G");
			assertArrayEqual(result, ["C", "E", "G"], "Space delimited parsing failed.");
		})
	);

	results.push(
		test("parseNotesInput parses comma-delimited notes", () => {
			const result = parseNotesInput("C, E, G");
			assertArrayEqual(result, ["C", "E", "G"], "Comma delimited parsing failed.");
		})
	);

	results.push(
		test("parseNotesInput handles mixed delimiters", () => {
			const result = parseNotesInput("C, E G");
			assertArrayEqual(result, ["C", "E", "G"], "Mixed delimiter parsing failed.");
		})
	);

	results.push(
		test("parseNotesInput handles extra whitespace", () => {
			const result = parseNotesInput("  C   E  G  ");
			assertArrayEqual(result, ["C", "E", "G"], "Extra whitespace handling failed.");
		})
	);

	// Note Normalization Tests
	results.push(
		test("normalizeNote converts to uppercase", () => {
			const result = normalizeNote("c");
			assertEqual(result, "C", "Lowercase normalization failed.");
		})
	);

	results.push(
		test("normalizeNote preserves sharps and flats", () => {
			const result1 = normalizeNote("c#");
			const result2 = normalizeNote("db");
			assertEqual(result1, "C#", "Sharp normalization failed.");
			assertEqual(result2, "Db", "Flat normalization failed.");
		})
	);

	// Note Validation Tests
	results.push(
		test("isValidNote validates valid notes", () => {
			assertEqual(isValidNote("C"), true, "Valid note C rejected.");
			assertEqual(isValidNote("F#"), true, "Valid note F# rejected.");
			assertEqual(isValidNote("Bb"), true, "Valid note Bb rejected.");
		})
	);

	results.push(
		test("isValidNote rejects invalid notes", () => {
			assertEqual(isValidNote("X"), false, "Invalid note X accepted.");
			assertEqual(isValidNote("H"), false, "Invalid note H accepted.");
			assertEqual(isValidNote(""), false, "Empty string accepted.");
		})
	);

	// Octave Stripping Tests
	results.push(
		test("stripOctave removes octave numbers", () => {
			assertEqual(stripOctave("C4"), "C", "Octave stripping failed for C4.");
			assertEqual(stripOctave("F#5"), "F#", "Octave stripping failed for F#5.");
			assertEqual(stripOctave("Bb3"), "Bb", "Octave stripping failed for Bb3.");
		})
	);

	results.push(
		test("stripOctave handles notes without octaves", () => {
			assertEqual(stripOctave("C"), "C", "Note without octave modified incorrectly.");
			assertEqual(stripOctave("F#"), "F#", "Sharp without octave modified incorrectly.");
		})
	);

	return results;
};

export { runChordUtilsTests };
