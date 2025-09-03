# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` — `App.tsx`, `PhysicsVisual.tsx`, styles (`App.css`, `index.css`).
- Tests: colocated `*.test.tsx` (e.g., `src/App.test.tsx`); Jest setup in `src/setupTests.ts`.
- Assets: `public/` (`index.html`, icons, manifest).
- Config: `package.json`, `tsconfig.json`; CRA scaffolding via `react-scripts`.

## Build, Test, and Development Commands
- `npm start`: Launches CRA dev server with HMR at `http://localhost:3000`.
- `npm test`: Runs Jest in watch mode (React Testing Library enabled).
- `npm run build`: Produces production build in `build/`.
- `npm run eject`: Not recommended; discuss before using.

## Coding Style & Naming Conventions
- Language: TypeScript + React (functional components, hooks).
- Indentation: 2 spaces; keep semicolons and imports consistent with existing files.
- Names: Components in PascalCase, files `PascalCase.tsx`; utilities in camelCase.
- Styling: CSS modules in `App.css` and base styles in `index.css`.
- Linting: CRA ESLint preset (`react-app`, `react-app/jest`). Fix editor/CI warnings before opening a PR.

## Testing Guidelines
- Frameworks: Jest + React Testing Library + `@testing-library/jest-dom`.
- Location: Place tests next to code (`ComponentName.test.tsx`).
- Style: Prefer user-facing queries (`screen.getByText`, roles) over implementation details.
- Commands: `npm test` (watch) or press `a` to run all. Update/remove template tests that no longer reflect the UI.

## Commit & Pull Request Guidelines
- Commits: Concise, imperative tense (e.g., "Add minimal physics canvas"). One logical change per commit.
- PRs: Include summary, motivation, before/after screenshot or short clip for visuals, steps to verify, and linked issues. Ensure build and tests pass.

## Security & Configuration Tips
- Do not commit secrets. CRA supports `.env` with `REACT_APP_*` variables if needed.
- Client-only demo; limit dependencies and keep bundle lean.

## Agent Notes
- Keep changes scoped; avoid drive-by refactors.
- If behavior changes, update tests and `README.md` snippets accordingly.
- Validate locally: `npm start`, then `npm test`, and `npm run build` before proposing changes.
