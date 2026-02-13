import { Chord } from "tonal";
import abcjs from "abcjs";
import {
	MAJOR_ROOTS,
	MINOR_ROOTS,
	buildAbcChord,
	getKeyDefinition,
	isValidNote,
	parseNotesInput,
	sanitizeChordInput,
	spellNotesInKey,
	spellNotesWithOctaveInKey,
	stripOctave,
	toAbcKey,
} from "./chord-utils.js";
import { analyzeChordFunction } from "./chord-function.js";
import { initSortable } from "./drag-utils.js";

const STORAGE_KEYS = {
	HISTORY: "harmonia.history",
	PROGRESSION: "harmonia.progression",
	PROGRESSION_HISTORY: "harmonia.progressionHistory",
	KEY_ROOT: "harmonia.keyRoot",
	KEY_MODE: "harmonia.keyMode",
	INPUT_MODE: "harmonia.inputMode",
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
	inputMode: storage.load(STORAGE_KEYS.INPUT_MODE, "chord"),
});

const getUiElements = () => ({
	input: document.querySelector("#chord-input"),
	keyRoot: document.querySelector("#key-root"),
	modeMajor: document.querySelector("#mode-major"),
	modeMinor: document.querySelector("#mode-minor"),
	modeChord: document.querySelector("#mode-chord"),
	modeNotes: document.querySelector("#mode-notes"),
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
	floatingWindow: document.querySelector("#progression-floating-window"),
	sidebarClose: document.querySelector("#sidebar-close"),
	fabOpenProgression: document.querySelector("#fab-open-progression"),
});

const setModeToggle = (ui, mode) => {
	const isMajor = mode === "major";
	ui.modeMajor.classList.toggle("is-active", isMajor);
	ui.modeMinor.classList.toggle("is-active", !isMajor);
	ui.modeMajor.setAttribute("aria-pressed", String(isMajor));
	ui.modeMinor.setAttribute("aria-pressed", String(!isMajor));
};

const setInputModeToggle = (ui, mode) => {
	ui.modeChord.classList.toggle("is-active", mode === "chord");
	ui.modeNotes.classList.toggle("is-active", mode === "notes");
	ui.modeChord.setAttribute("aria-pressed", String(mode === "chord"));
	ui.modeNotes.setAttribute("aria-pressed", String(mode === "notes"));
};

const detectInputType = (input) => {
	// 直接解析原始輸入，不要先使用 sanitizeChordInput（會移除空格）
	const notes = parseNotesInput(input);
	const validNotes = notes.filter(isValidNote);
	if (validNotes.length >= 3) {
		return "notes";
	}
	return "chord";
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

				// Add visual indicator for special chord functions
				if (chordFunction && chordFunction.function === 'borrowed') {
					chip.classList.add('chip--borrowed');
				}
				if (chordFunction && chordFunction.function === 'secondary-dominant') {
					chip.classList.add('chip--secondary');
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
					
					// Add indicator for secondary dominant
					if (chordFunction.function === 'secondary-dominant') {
						romanBadge.textContent = '• ' + chordFunction.roman;
					} else {
						romanBadge.textContent = chordFunction.roman;
					}
					
					romanBadge.title = chordFunction.description || chordFunction.function;
					contentContainer.appendChild(romanBadge);
				}

			const text = document.createElement("span");
			text.className = "chip-text";
			const chordData = Chord.get(chord);
			const formattedChord = chordData.tonic + (chordData.aliases[0] || "");
			text.textContent = formattedChord;
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
			const progressionWithFunctions = progression.map((chord) => {
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
		keyDefinition,
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

const renderDetectedChords = (ui, state, storage, detectedChords, keyDefinition) => {
	if (!detectedChords || detectedChords.length === 0) {
		ui.chordOutput.textContent = "找不到對應的和弦，請確認音符是否正確。";
		ui.paper.innerHTML = "";
		return;
	}

	const topChords = detectedChords.slice(0, 3);

	ui.chordOutput.innerHTML = "";
	ui.paper.innerHTML = "";

	const title = document.createElement("p");
	title.textContent = `從音符推測和弦 (${detectedChords.length} 個可能):`;
	title.className = "mb-2 font-medium";
	ui.chordOutput.appendChild(title);

	topChords.forEach((chordName, index) => {
		const chordFunction = analyzeChordFunction(chordName, keyDefinition);
		const resultEl = document.createElement("div");
		resultEl.className = "detected-chord mb-2 cursor-pointer hover:bg-white/10 rounded p-2 transition-colors";
		resultEl.dataset.chord = chordName;

		let html = `<span class="font-bold">${index + 1}. ${chordName}</span>`;

		if (chordFunction) {
			const roman = chordFunction.roman;
			const func = chordFunction.function;
			const color = chordFunction.color;
			html += ` <span class="chip chip--${color} text-xs">${roman} (${func})</span>`;
		}

		resultEl.innerHTML = html;

		resultEl.addEventListener("click", () => {
			ui.input.value = chordName;
			state.inputMode = "chord";
			setInputModeToggle(ui, "chord");
			persistState(storage, state);
			updateChord(ui, state, storage);
		});

		ui.chordOutput.appendChild(resultEl);
	});

	if (detectedChords.length > 3) {
		const more = document.createElement("p");
		more.className = "text-sm text-ink/50 mt-2";
		more.textContent = `還有 ${detectedChords.length - 3} 個其他可能...`;
		ui.chordOutput.appendChild(more);
	}
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
	const input = ui.input.value;
	const keyDefinition = getKeyDefinition(state.keyRoot, state.keyMode);

	const notes = parseNotesInput(input);
	const validNotes = notes.filter(isValidNote);
	const detectedType = detectInputType(input);

	if (detectedType !== state.inputMode && validNotes.length >= 3) {
		state.inputMode = detectedType;
		setInputModeToggle(ui, detectedType);
	}

	console.log(validNotes.length);
	if (state.inputMode === "notes" && validNotes.length >= 2) {
		const detected = Chord.detect(validNotes);
		renderDetectedChords(ui, state, storage, detected, keyDefinition);
		state.currentChord = detected.length > 0 ? { symbol: detected[0] } : null;
	} else {
		const cleaned = sanitizeChordInput(input);
		const chordResult = buildChordResult(cleaned, keyDefinition);
		renderChord(ui, state, chordResult);
	}

	if (inputTimeout) {
		clearTimeout(inputTimeout);
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

const openSidebar = (ui) => {
	if (ui.floatingWindow) {
		ui.floatingWindow.style.display = "block";
		void ui.floatingWindow.offsetWidth;
		ui.floatingWindow.classList.add("open");
	}
};

const closeSidebar = (ui) => {
	if (ui.floatingWindow) {
		ui.floatingWindow.classList.remove("open");
		setTimeout(() => {
			ui.floatingWindow.style.display = "none";
		}, 200);
	}
};

const init = () => {
	const ui = getUiElements();
	const storage = createStorage(window.localStorage);
	const state = createState(storage);

	setModeToggle(ui, state.keyMode);
	setInputModeToggle(ui, state.inputMode);
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
	ui.modeChord.addEventListener("click", () => {
		if (state.inputMode === "chord") {
			return;
		}
		state.inputMode = "chord";
		setInputModeToggle(ui, "chord");
		persistState(storage, state);
		updateChord(ui, state, storage);
	});
	ui.modeNotes.addEventListener("click", () => {
		if (state.inputMode === "notes") {
			return;
		}
		state.inputMode = "notes";
		setInputModeToggle(ui, "notes");
		persistState(storage, state);
		updateChord(ui, state, storage);
	});
	ui.historyAdd.addEventListener("click", () => addHistoryItem(storage, ui, state));
	ui.historyClear.addEventListener("click", () => {
		state.history = [];
		persistState(storage, state);
		renderHistory(ui, state);
	});

	ui.progressionAdd.forEach((btn) => btn.addEventListener("click", () => addProgressionItem(storage, ui, state)));
	ui.progressionClear.forEach((btn) =>
		btn.addEventListener("click", () => {
			state.progression = [];
			persistState(storage, state);
			renderProgression(ui, state);
		}),
	);
	ui.progressionSave.forEach((btn) => btn.addEventListener("click", () => saveProgression(storage, ui, state)));

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

	ui.fabOpenProgression?.addEventListener("click", () => openSidebar(ui));
	ui.sidebarClose?.addEventListener("click", () => closeSidebar(ui));
	ui.sidebarBackdrop?.addEventListener("click", () => closeSidebar(ui));
	window.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && !ui.sidebarBackdrop.classList.contains("hidden")) {
			closeSidebar(ui);
		}
	});

	// Window state persistence
	const WINDOW_STATE_KEY = 'harmonia:windowState';
	const DEFAULT_WINDOW_STATE = {
		x: window.innerWidth - 400,
		y: (window.innerHeight - 480) / 2,
		width: 380,
		height: 480
	};

	const debounce = (fn, delay) => {
		let timeout;
		return (...args) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => fn(...args), delay);
		};
	};

	const saveWindowState = debounce((state) => {
		try {
			localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(state));
		} catch (e) {
			console.warn('Failed to save window state:', e);
		}
	}, 300);

	const loadWindowState = () => {
		try {
			const saved = localStorage.getItem(WINDOW_STATE_KEY);
			return saved ? JSON.parse(saved) : DEFAULT_WINDOW_STATE;
		} catch (e) {
			console.warn('Failed to load window state:', e);
			return DEFAULT_WINDOW_STATE;
		}
	};

	const initFloatingWindowDrag = () => {
		const floatingWindow = document.querySelector("#progression-floating-window");
		const header = document.querySelector("#progression-window-header");

		if (!floatingWindow || !header) return;

		let isDragging = false;
		let startX, startY;
		let initialLeft, initialTop;
		let hasConvertedToPx = false;

	const convertPositionToPx = () => {
		if (hasConvertedToPx) return;

		const rect = floatingWindow.getBoundingClientRect();
		const computed = window.getComputedStyle(floatingWindow);

		floatingWindow.style.left = rect.left + "px";
		floatingWindow.style.top = rect.top + "px";
		floatingWindow.style.right = "auto";
		floatingWindow.style.transform = "none";

		hasConvertedToPx = true;
		floatingWindow.dataset.initialRight = computed.getPropertyValue("right").trim();
	};

	const initializeDrag = (e) => {
		if (e.type === "mousedown" && e.button !== 0) return;
		if (e.type === "touchstart") e.preventDefault();

		convertPositionToPx();

		isDragging = true;
		floatingWindow.classList.add("dragging");

		startX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
		startY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
		initialLeft = floatingWindow.offsetLeft;
		initialTop = floatingWindow.offsetTop;
	};

	const onDrag = (e) => {
		if (!isDragging) return;
		if (e.type === "touchmove") e.preventDefault();

		const deltaX = (e.type.includes("touch") ? e.touches[0].clientX : e.clientX) - startX;
		const deltaY = (e.type.includes("touch") ? e.touches[0].clientY : e.clientY) - startY;

		let newX = initialLeft + deltaX;
		let newY = initialTop + deltaY;

		// Boundary constraints
		const minX = 40 - floatingWindow.offsetWidth;
		const maxX = window.innerWidth - 40;
		const minY = 0;
		const maxY = window.innerHeight - 40;

		newX = Math.max(minX, Math.min(maxX, newX));
		newY = Math.max(minY, Math.min(maxY, newY));

		floatingWindow.style.left = newX + "px";
		floatingWindow.style.top = newY + "px";
	};

	const stopDrag = () => {
		if (!isDragging) return;

		isDragging = false;
		floatingWindow.classList.remove("dragging");

		const rect = floatingWindow.getBoundingClientRect();
		floatingWindow.dataset.lastLeft = rect.left + "px";
		floatingWindow.dataset.lastTop = rect.top + "px";

		saveWindowState({
			x: floatingWindow.offsetLeft,
			y: floatingWindow.offsetTop,
			width: floatingWindow.offsetWidth,
			height: floatingWindow.offsetHeight
		});
	};

	header.addEventListener("mousedown", initializeDrag);
	header.addEventListener("touchstart", initializeDrag, { passive: false });
	window.addEventListener("mousemove", onDrag);
	window.addEventListener("touchmove", onDrag, { passive: false });
	window.addEventListener("mouseup", stopDrag);
	window.addEventListener("touchend", stopDrag);

	// Load saved window state
	const state = loadWindowState();
	floatingWindow.style.left = state.x + "px";
	floatingWindow.style.top = state.y + "px";
	floatingWindow.style.width = state.width + "px";
	floatingWindow.style.height = state.height + "px";
	floatingWindow.style.right = "auto";
	floatingWindow.style.transform = "none";
	hasConvertedToPx = true;

	// Handle window resize - keep window in bounds
	const constrainWindowBounds = () => {
		const rect = floatingWindow.getBoundingClientRect();
		const minX = 40 - rect.width;
		const maxX = window.innerWidth - 40;
		const minY = 0;
		const maxY = window.innerHeight - 40;

		let newX = rect.left;
		let newY = rect.top;

		newX = Math.max(minX, Math.min(maxX, newX));
		newY = Math.max(minY, Math.min(maxY, newY));

		floatingWindow.style.left = newX + "px";
		floatingWindow.style.top = newY + "px";
	};

	window.addEventListener("resize", constrainWindowBounds);
};

initFloatingWindowDrag();

	// Floating window resize logic
	const initFloatingWindowResize = () => {
		const floatingWindow = document.querySelector("#progression-floating-window");
		const resizeHandle = document.querySelector("#progression-resize-handle");

		if (!floatingWindow || !resizeHandle) return;

		let isResizing = false;
		let startX, startY;
		let startWidth, startHeight;

		const MIN_WIDTH = 320;
		const MIN_HEIGHT = 200;

		const getClientX = (e) => (e.type.includes("touch") ? e.touches[0].clientX : e.clientX);
		const getClientY = (e) => (e.type.includes("touch") ? e.touches[0].clientY : e.clientY);

		resizeHandle.addEventListener("mousedown", startResize);
		resizeHandle.addEventListener("touchstart", startResize, { passive: false });

		function startResize(e) {
			isResizing = true;
			floatingWindow.classList.add("resizing");

			startX = getClientX(e);
			startY = getClientY(e);
			startWidth = floatingWindow.offsetWidth;
			startHeight = floatingWindow.offsetHeight;

			e.preventDefault();
		}

		window.addEventListener("mousemove", onResize);
		window.addEventListener("touchmove", onResize, { passive: false });
		window.addEventListener("mouseup", stopResize);
		window.addEventListener("touchend", stopResize);

		function onResize(e) {
			if (!isResizing) return;

			const clientX = getClientX(e);
			const clientY = getClientY(e);

			const deltaX = clientX - startX;
			const deltaY = clientY - startY;

			const newWidth = Math.max(MIN_WIDTH, Math.min(window.innerWidth * 0.9, startWidth + deltaX));
			const newHeight = Math.max(MIN_HEIGHT, Math.min(window.innerHeight * 0.9, startHeight + deltaY));

			floatingWindow.style.width = newWidth + "px";
			floatingWindow.style.height = newHeight + "px";
		}

		function stopResize() {
			isResizing = false;
			floatingWindow.classList.remove("resizing");

			saveWindowState({
				x: floatingWindow.offsetLeft,
				y: floatingWindow.offsetTop,
				width: floatingWindow.offsetWidth,
				height: floatingWindow.offsetHeight
			});
		}
	};

	// Initialize resize after DOM is ready
	initFloatingWindowResize();
};

init();
