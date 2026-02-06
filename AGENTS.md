# Repository Guidelines

## Project Structure & Module Organization
- `index.html` contains the UI and all inline JavaScript logic.
- `tonal.min.js` and `abcjs-basic-min.js` are vendor libraries loaded by the page.
- There is no build system; the project is a static HTML app.

## Build, Test, and Development Commands
- `start` (manual): open `index.html` in a browser to run locally.
- `lint/test`: none configured; add tooling if needed.

## Coding Style & Naming Conventions
- HTML uses 4-space indentation.
- JavaScript is inline; prefer small, single-purpose functions and descriptive names (e.g., `updateChord`).
- Keep user input sanitization near the entry point (`updateChord`) and avoid global variables.

## Testing Guidelines
- No test framework is configured.
- If adding tests, document the runner and add a `tests/` folder with descriptive filenames (e.g., `chord-parser.test.js`).

## Commit & Pull Request Guidelines
- Commit messages in history are short, imperative sentences (e.g., "Update README.md").
- PRs should include a brief description, steps to verify, and screenshots when UI changes are made.

## Security & Configuration Tips
- Do not commit untrusted third-party scripts; keep vendor files versioned and local.
- If adding configuration (e.g., CDN, analytics), document it in `README.md`.
