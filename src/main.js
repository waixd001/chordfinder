import { Chord } from "tonal";
import abcjs from "abcjs";
import {
	MAJOR_ROOTS,
	MINOR_ROOTS,
	buildAbcChord,
	getKeyDefinition,
	sanitizeChordInput,
	spellNotesInKey,
	spellNotesWithOctaveInKey,
	toAbcKey,
} from "./chord-utils.js";
import { analyzeChordFunction } from "./chord-function.js";
import { initSortable } from "./drag-utils.js";

const STORAGE_KEYS = {
	HISTORY: "chordfinder.history",
	PROGRESSION: "chordfinder.progression",
	PROGRESSION_HISTORY: "chordfinder.progressionHistory",
	KEY_ROOT: "chordfinder.keyRoot",
	KEY_MODE: "chordfinder.keyMode",
};

const createStorage = (backend) => ({
	load(key, fallback) {
		try {
			const raw = backend.getItem(key);
			if (!raw) {
				return fallback;
			}
			const parsed = JSON.parse(raw);
			return parsed ?? fallback;
		} catch {
			return fallback;
		}
	},
	save(key, value) {
		backend.setItem(key, JSON.stringify(value));
	},
});

const createState = (storage) => ({
	currentChord: null,
	history: storage.load(STORAGE_KEYS.HISTORY, []),
	progression: storage.load(STORAGE_KEYS.PROGRESSION, []),
	progressionHistory: storage.load(STORAGE_KEYS.PROGRESSION_HISTORY, []),
	keyRoot: storage.load(STORAGE_KEYS.KEY_ROOT, "C"),
	keyMode: storage.load(STORAGE_KEYS.KEY_MODE, "major"),
});

const getUiElements = () => ({
	input: document.querySelector("#chord-input"),
	keyRoot: document.querySelector("#key-root"),
	modeMajor: document.querySelector("#mode-major"),
	modeMinor: document.querySelector("#mode-minor"),
	chordOutput: document.querySelector("#chordOutput"),
	paper: document.querySelector("#paper"),
	historyButtons: document.querySelector("#historyButtons"),
	historyAdd: document.querySelector("#history-add"),
	historyClear: document.querySelector("#history-clear"),
	progressionAdd: document.querySelectorAll("#progression-add, #progression-add-modal"),
	progressionClear: document.querySelectorAll("#progression-clear, #progression-clear-modal"),
	progressionSave: document.querySelectorAll("#progression-save, #progression-save-modal"),
	progressionCurrent: document.querySelectorAll("#progressionCurrent"),
	progressionHistory: document.querySelectorAll("#progressionHistory"),
});

const setModeToggle = (ui, mode) => {
	const isMajor = mode === "major";
	ui.modeMajor.classList.toggle("is-active", isMajor);
	ui.modeMinor.classList.toggle("is-active", !isMajor);
	ui.modeMajor.setAttribute("aria-pressed", String(isMajor));
	ui.modeMinor.setAttribute("aria-pressed", String(!isMajor));
};

const populateRootSelect = (ui, state, mode) => {
	const roots = mode === "minor" ? MINOR_ROOTS : MAJOR_ROOTS;
	ui.keyRoot.innerHTML = "";
	roots.forEach((root) => {
		const option = document.createElement("option");
		option.value = root;
		option.textContent = root;
		ui.keyRoot.appendChild(option);
	});
	if (roots.includes(state.keyRoot)) {
		ui.keyRoot.value = state.keyRoot;
	} else {
		ui.keyRoot.value = roots[0];
		state.keyRoot = roots[0];
	}
};

const renderEmptyState = (container, message) => {
	container.innerHTML = "";
	const empty = document.createElement("p");
	empty.className = "empty-state";
	empty.textContent = message;
	container.appendChild(empty);
};

const renderHistory = (ui, state) => {
	// 渲染歷史按鈕
	if (!state.history.length) {
		ui.historyButtons.innerHTML = "";
		return;
	}

	// 更新按鈕容器
	ui.historyButtons.innerHTML = "";
	state.history.forEach((item, index) => {
		const button = document.createElement("button");
		button.className = "history-button";
		button.type = "button";
		button.dataset.index = String(index);
		button.textContent = item;
		ui.historyButtons.appendChild(button);
	});
};

const renderProgression = (ui, state) => {
	// Get current key definition for chord function analysis
	const keyDefinition = getKeyDefinition(state.keyRoot, state.keyMode);
	
	ui.progressionCurrent.forEach((container) => {
		if (!state.progression.length) {
			renderEmptyState(container, "進程尚未開始。");
		} else {
			container.innerHTML = "";
			state.progression.forEach((chord, index) => {
				const chip = document.createElement("span");
				chip.className = "chip";
				chip.dataset.index = String(index);
				
				// Analyze chord function
				const chordFunction = analyzeChordFunction(chord, keyDefinition);
				
				// Add function class for color coding
				if (chordFunction && chordFunction.color) {
					chip.classList.add(`chip--${chordFunction.color}`);
				}
				
				const handle = document.createElement("span");
				handle.className = "drag-handle";
				handle.innerHTML = `
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="9" cy="5" r="1"></circle>
						<circle cx="9" cy="12" r="1"></circle>
						<circle cx="9" cy="19" r="1"></circle>
						<circle cx="15" cy="5" r="1"></circle>
						<circle cx="15" cy="12" r="1"></circle>
						<circle cx="15" cy="19" r="1"></circle>
					</svg>
				`;
				
				// Create container for chord text and roman numeral
				const contentContainer = document.createElement("span");
				contentContainer.className = "chip-content";
				
				// Add roman numeral badge if available
				if (chordFunction && chordFunction.roman) {
					const romanBadge = document.createElement("span");
					romanBadge.className = "chip-roman";
					romanBadge.textContent = chordFunction.roman;
					romanBadge.title = chordFunction.function;
					contentContainer.appendChild(romanBadge);
				}
				
				const text = document.createElement("span");
				text.className = "chip-text";
				text.textContent = chord;
				contentContainer.appendChild(text);
				
				chip.appendChild(handle);
				chip.appendChild(contentContainer);
				container.appendChild(chip);
			});
		}
	});

	ui.progressionHistory.forEach((container) => {
		if (!state.progressionHistory.length) {
			renderEmptyState(container, "還沒有保存的進程。");
			return;
		}

		container.innerHTML = "";
		state.progressionHistory.forEach((progression, index) => {
			const row = document.createElement("div");
			row.className = "list-item list-item--stack";
			row.dataset.index = String(index);

			const handle = document.createElement("span");
			handle.className = "drag-handle drag-handle--list";
			handle.innerHTML = `
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="8" y1="9" x2="16" y2="9"></line>
					<line x1="8" y1="15" x2="16" y2="15"></line>
				</svg>
			`;

			// Create progressions with chord function badges
			const progressionWithFunctions = progression.map(chord => {
				const chordFunction = analyzeChordFunction(chord, keyDefinition);
				if (chordFunction && chordFunction.roman) {
					// Return chord with roman numeral in parentheses
					return `${chord} (${chordFunction.roman})`;
				}
				return chord;
			});
			
			const text = document.createElement("span");
			text.className = "list-item-text";
			text.textContent = progressionWithFunctions.join(" → ");

			const remove = document.createElement("button");
			remove.className = "icon-button";
			remove.type = "button";
			remove.dataset.index = String(index);
			remove.textContent = "移除";

			row.appendChild(handle);
			row.appendChild(text);
			row.appendChild(remove);
			container.appendChild(row);
		});
	});
};

const persistState = (storage, state) => {
	storage.save(STORAGE_KEYS.HISTORY, state.history);
	storage.save(STORAGE_KEYS.PROGRESSION, state.progression);
	storage.save(STORAGE_KEYS.PROGRESSION_HISTORY, state.progressionHistory);
	storage.save(STORAGE_KEYS.KEY_ROOT, state.keyRoot);
	storage.save(STORAGE_KEYS.KEY_MODE, state.keyMode);
};

const buildChordResult = (cleaned, keyDefinition) => {
	if (!cleaned) {
		return { status: "empty" };
	}

	const result = Chord.get(cleaned);
	if (!result.notes || !result.notes.length) {
		return { status: "invalid" };
	}

	const spelledNotes = spellNotesInKey(result.notes, keyDefinition);
	const spelledWithOctave = spellNotesWithOctaveInKey(
		spelledNotes.map((note) => `${note}4`),
		keyDefinition
	);

	const chordFunction = analyzeChordFunction(cleaned, keyDefinition);

	return {
		status: "valid",
		symbol: result.symbol,
		notes: spelledNotes,
		notesWithOctave: spelledWithOctave,
		function: chordFunction,
	};
};

const renderChord = (ui, state, chordResult) => {
	if (chordResult.status === "empty") {
		ui.chordOutput.textContent = "";
		ui.paper.innerHTML = "";
		state.currentChord = null;
		return;
	}

	if (chordResult.status === "invalid") {
		ui.chordOutput.textContent = "找不到對應的和弦，請確認代號是否正確。";
		ui.paper.innerHTML = "";
		state.currentChord = null;
		return;
	}

	state.currentChord = {
		symbol: chordResult.symbol,
		notes: chordResult.notes,
		notesWithOctave: chordResult.notesWithOctave,
		function: chordResult.function,
	};

	// Build output text with chord function analysis
	let outputText = `${chordResult.symbol} 和弦的組成音是 ${chordResult.notes.join(" ")}`;
	
	if (chordResult.function) {
		const roman = chordResult.function.roman;
		const func = chordResult.function.function;
		const color = chordResult.function.color;
		
		// Add function analysis
		outputText += `\n調性分析: ${roman} (${func})`;
		
		// Add color coding hint
		let colorHint = "";
		if (color === "green") colorHint = "綠色 - 主功能和弦";
		else if (color === "blue") colorHint = "藍色 - 下屬功能和弦";
		else if (color === "red") colorHint = "紅色 - 屬功能和弦";
		
		if (colorHint) {
			outputText += `\n功能色彩: ${colorHint}`;
		}
	} else if (chordResult.status === "valid") {
		outputText += "\n調性分析: 非調內和弦 (N/A)";
	}

	ui.chordOutput.textContent = outputText;
	ui.paper.innerHTML = "";

	if (chordResult.notesWithOctave.length) {
		const abcSyntax = buildAbcChord(chordResult.notesWithOctave);
		const abcKey = toAbcKey(state.keyRoot, state.keyMode);
		const abcText = `X:1\nK:${abcKey}\n${abcSyntax}`;
		abcjs.renderAbc("paper", abcText);
	}
};

// 定時器變數
let inputTimeout = null;

const updateChord = (ui, state, storage) => {
	const cleaned = sanitizeChordInput(ui.input.value);
	const keyDefinition = getKeyDefinition(state.keyRoot, state.keyMode);
	const chordResult = buildChordResult(cleaned, keyDefinition);
	renderChord(ui, state, chordResult);

	// 清除之前的定時器
	if (inputTimeout) {
		clearTimeout(inputTimeout);
	}

	// 如果輸入有效且不是空的，設置3秒後自動加入歷史
	if (chordResult.status === "valid" && cleaned) {
		inputTimeout = setTimeout(() => {
			// 檢查是否已在歷史中，避免重複
			if (!state.history.includes(chordResult.symbol)) {
				state.history.unshift(chordResult.symbol);
				state.history = state.history.slice(0, 20);
				persistState(storage, state);
				renderHistory(ui, state);
			}
		}, 3000);
	}
};

const addHistoryItem = (storage, ui, state) => {
	if (!state.currentChord) {
		return;
	}
	state.history.unshift(state.currentChord.symbol);
	state.history = state.history.slice(0, 20);
	persistState(storage, state);
	renderHistory(ui, state);
};

const addProgressionItem = (storage, ui, state) => {
	if (!state.currentChord) {
		return;
	}
	state.progression.push(state.currentChord.symbol);
	persistState(storage, state);
	renderProgression(ui, state);
};

const saveProgression = (storage, ui, state) => {
	if (!state.progression.length) {
		return;
	}
	state.progressionHistory.unshift([...state.progression]);
	state.progressionHistory = state.progressionHistory.slice(0, 20);
	persistState(storage, state);
	renderProgression(ui, state);
};

const bindRemoveHandler = (container, onRemove) => {
	container.addEventListener("click", (event) => {
		const button = event.target.closest("button[data-index]");
		if (!button) {
			return;
		}
		const index = Number(button.dataset.index);
		if (Number.isNaN(index)) {
			return;
		}
		onRemove(index);
	});
};

const init = () => {
	const ui = getUiElements();
	const storage = createStorage(window.localStorage);
	const state = createState(storage);

	setModeToggle(ui, state.keyMode);
	populateRootSelect(ui, state, state.keyMode);
	renderHistory(ui, state);
	renderProgression(ui, state);
	updateChord(ui, state, storage);

	ui.progressionCurrent.forEach((container) => {
		initSortable(container, {
			onEnd: (evt) => {
				const { oldIndex, newIndex } = evt;
				if (oldIndex === newIndex) return;

				const movedItem = state.progression.splice(oldIndex, 1)[0];
				state.progression.splice(newIndex, 0, movedItem);

				persistState(storage, state);
				renderProgression(ui, state);
			},
		});
	});

	ui.progressionHistory.forEach((container) => {
		initSortable(container, {
			onEnd: (evt) => {
				const { oldIndex, newIndex } = evt;
				if (oldIndex === newIndex) return;

				const movedItem = state.progressionHistory.splice(oldIndex, 1)[0];
				state.progressionHistory.splice(newIndex, 0, movedItem);

				persistState(storage, state);
				renderProgression(ui, state);
			},
		});
	});

	ui.input.addEventListener("input", () => updateChord(ui, state, storage));
	ui.keyRoot.addEventListener("change", () => {
		state.keyRoot = ui.keyRoot.value;
		persistState(storage, state);
		updateChord(ui, state, storage);
		renderProgression(ui, state);
	});
	ui.modeMajor.addEventListener("click", () => {
		if (state.keyMode === "major") {
			return;
		}
		state.keyMode = "major";
		setModeToggle(ui, state.keyMode);
		populateRootSelect(ui, state, state.keyMode);
		persistState(storage, state);
		updateChord(ui, state, storage);
		renderProgression(ui, state);
	});
	ui.modeMinor.addEventListener("click", () => {
		if (state.keyMode === "minor") {
			return;
		}
		state.keyMode = "minor";
		setModeToggle(ui, state.keyMode);
		populateRootSelect(ui, state, state.keyMode);
		persistState(storage, state);
		updateChord(ui, state, storage);
		renderProgression(ui, state);
	});
	ui.historyAdd.addEventListener("click", () => addHistoryItem(storage, ui, state));
	ui.historyClear.addEventListener("click", () => {
		state.history = [];
		persistState(storage, state);
		renderHistory(ui, state);
	});

	ui.progressionAdd.forEach((btn) =>
		btn.addEventListener("click", () => addProgressionItem(storage, ui, state))
	);
	ui.progressionClear.forEach((btn) =>
		btn.addEventListener("click", () => {
			state.progression = [];
			persistState(storage, state);
			renderProgression(ui, state);
		})
	);
	ui.progressionSave.forEach((btn) =>
		btn.addEventListener("click", () => saveProgression(storage, ui, state))
	);

	// 為歷史按鈕添加點擊事件，點擊時填入輸入框
	ui.historyButtons.addEventListener("click", (event) => {
		const button = event.target.closest("button.history-button");
		if (!button) return;
		const chord = button.textContent;
		ui.input.value = chord;
		updateChord(ui, state, storage);
	});

	ui.progressionHistory.forEach((container) => {
		bindRemoveHandler(container, (index) => {
			state.progressionHistory.splice(index, 1);
			persistState(storage, state);
			renderProgression(ui, state);
		});
	});
};

init();
