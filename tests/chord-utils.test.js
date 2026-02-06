import { getKeyDefinition, spellNotesInKey } from "../src/chord-utils.js";

const assertEqual = (actual, expected, message) => {
	if (actual !== expected) {
		throw new Error(`${message} Expected "${expected}", got "${actual}".`);
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

	return results;
};

export { runChordUtilsTests };
