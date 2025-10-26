# Repository Guidelines

## Project Structure & Module Organization
Extension code lives at the repo root. Core runtime scripts are `background.js` (service worker), `content.js` (floating popup), and `textfield-assistant.js` (in-field assistant). UI assets pair HTML/CSS/JS per feature, such as `sidepanel.{html,css,js}` for the dashboard and `youtube-summary.{css,js}` for media helpers. Shared styling stays in files like `content.css` and component-specific styles (e.g., `gemini-live-modal.css`). Icons reside in `icons/`, and manifest configuration is defined in `manifest.json`. Feature notes and experiments are documented in the Markdown files alongside the code; `ARCHITECTURE.md` provides a higher-level overview.

## Build, Test, and Development Commands
No build step is required—load the current directory as an unpacked extension from `chrome://extensions/`. During development, use Chrome’s “Reload” control to pick up file changes. When iterating on content scripts, keep DevTools open and refresh the target tab to re-run injections. If you need fresh icons, run `pwsh ./generate-icons.ps1` from the project root on Windows PowerShell.

## Coding Style & Naming Conventions
JavaScript uses two-space indentation, single quotes for strings, trailing semicolons, and `const`/`let` over `var`. Keep modules self-contained—background logic in `background.js`, DOM interaction in the relevant content script, and feature state encapsulated in classes or closures where practical. CSS favors BEM-inspired, kebab-case class names (see `ai-popup-*` selectors in `content.css`). Maintain manifest keys in lowerCamelCase to mirror existing entries.

## Testing Guidelines
Automated tests are not yet wired in; follow `TESTING-GUIDE.md` for manual validation of the text field assistant, including trigger behavior, tone rewrites, and error handling. Re-run regression passes on Gmail, Twitter, and a generic form after major UI or API changes. Capture console logs for failures and document repro steps using the template in `TESTING-GUIDE.md`. Aim to verify accessibility (keyboard navigation) whenever modifying interactive elements.

## Commit & Pull Request Guidelines
Stick to Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) as seen in the existing history. Commits should be scoped to a single concern and include relevant screenshots or console output in the description when UI changes or bug fixes are involved. Pull requests need a concise summary, testing notes (e.g., “Manual: Gmail compose, Twitter tweet”), and linked issue IDs when applicable. Flag any new permissions or storage keys in the PR body.

## Security & Configuration Tips
Never hardcode API secrets; rely on Chrome storage and reference the setup steps in `SETUP.md`. When introducing new permissions in `manifest.json`, call them out in review notes for security scrutiny. Confirm that Gemini API calls gracefully handle quota or auth errors before shipping.
