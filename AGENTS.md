# Repository Guidelines

## Project Structure & Module Organization

This is a compact Next.js App Router dashboard. Page and route entry points live in `app/`: `app/page.tsx` renders the two-screen dashboard, `app/layout.tsx` defines the root shell, and `app/api/*/route.ts` exposes server data. Reusable UI belongs in `components/`, shared parsing, pricing, formatting, and system helpers in `lib/`, and static files in `public/`. Keep global visual tokens in `app/globals.css`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production build and run framework type checks.
- `npm start`: serve the production build after `npm run build`.

There is no `lint` or `test` script yet. Treat `npm run build` as required verification.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Component files use `PascalCase.tsx` names such as `ConsoleScreen.tsx`; utility modules in `lib/` use lowercase kebab-case names such as `claude-stats.ts`. Prefer the `@/` import alias.

Match the existing style: two-space indentation, double quotes, semicolons, and small, direct functions. Keep browser-only code behind `"use client"`. Keep Node-specific filesystem or system-information logic in API routes or route-only `lib/` helpers.

## Testing Guidelines

No test framework is configured yet. If tests are added, match the changed surface: unit tests for pure helpers in `lib/`, component tests for UI behavior, and route tests for `app/api/*`. Use names such as `format.test.ts` or `ConsoleScreen.test.tsx`.

Until tests exist, verify the dashboard in `npm run dev` and run `npm run build`.

## Commit & Pull Request Guidelines

This repository has no commit history yet, so there is no local convention. Use short, imperative commit subjects, for example `Add system stats route`.

Pull requests should include a summary, verification steps, and screenshots or recordings for visible UI changes. Link related issues when available. Avoid unrelated formatting, refactors, or asset churn.

## Agent-Specific Instructions

Before coding, state assumptions when the request is ambiguous. Make surgical changes only: do not refactor adjacent code, restyle unrelated UI, or add speculative configuration. Prefer the smallest implementation that fits existing patterns. Remove only unused code introduced by your change.

## Security & Configuration Tips

Do not commit local machine data, generated build output, or secrets. Keep `.next/`, `node_modules/`, and personal Claude settings out of source control. API routes read local system and Claude usage data, so do not expose them publicly without access controls.
