# Plan: Key Spelling + History/Progression + Key Mode Toggle

## Goals
1. Add a selectable song key (major) and respell note names to match the key (e.g., C# major uses E# instead of F).
2. Add a history list and a progression tool so users can save designed progressions.
3. Add a mode toggle for Major/Minor and split the key selection into root + mode.
4. Ensure ABC rendering clears previous output to avoid stacked staves.

## Constraints & Context
- Front-end only; no backend.
- Current UI is in `src/index.html`, logic in `src/main.js`, styles in `src/styles.css`.
- No test framework exists; add a minimal, documented test harness under `tests/` to validate note spelling utilities.

## Step-by-Step Plan
1. **Extract pure utilities**
   - Create `src/chord-utils.js` with:
     - Input sanitation.
     - Key definitions (major keys with diatonic spellings + accidental preference).
     - Note spelling logic: diatonic chroma uses scale spelling; non-diatonic uses sharp/flat preference.
     - ABC rendering helpers for chord notes.
   - Export functions for UI and tests.
2. **Add key selection UI**
   - Extend `src/index.html` with root selector and a Major/Minor toggle button.
   - Add UI blocks for History and Progression.
3. **Implement history & progression logic**
   - In `src/main.js`, wire:
     - Root/mode change to respell displayed notes.
     - History list: save current chord when requested; show list; allow remove/clear.
     - Progression tool: add current chord to progression list; save progression snapshot to history.
   - Persist history/progression with `localStorage`.
4. **Fix ABC render stacking**
   - Clear `#paper` before each `abcjs.renderAbc`.
   - Confirm only one rendered staff remains on updates.
5. **Style new UI blocks**
   - Extend `src/styles.css` with small, consistent card/list/button styles.
6. **Add minimal tests**
   - Create `tests/` with a tiny browser test runner and a `chord-utils.test.js`.
   - Cover key spelling edge cases (e.g., C# major: F -> E#).
7. **Sanity check**
   - Ensure input sanitization remains near the update entry point.
   - Verify DOM updates and no runtime errors.
