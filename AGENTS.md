# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Next.js App Router routes (`app/page.tsx` for landing, `app/(app)/app/page.tsx` for the main in-app experience) plus global styles in `app/globals.css`.
- `components/globe/` contains globe and carousel UI (`CesiumViewer.tsx`, `GlobeCanvas.tsx`, `SimpleGlobeCarousel.tsx`).
- `lib/` contains shared utilities and schemas (`lib/utils.ts`, `lib/trip-schema.ts`).
- `public/cesium/` contains Cesium runtime assets and workers; treat these as vendor/static files, not hand-edited source.
- Config lives at root: `tailwind.config.ts`, `tsconfig.json`, `next.config.mjs`, `drizzle.config.ts`, `components.json`.

## Build, Test, and Development Commands
- `npm run dev`: start local Next.js dev server.
- `npm run build`: create production build.
- `npm run start`: run production server from the build output.
- `npm run lint`: run Next.js lint checks.
- `npx tsc --noEmit`: run strict TypeScript checks (recommended pre-PR).

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Formatting patterns in current codebase: 2-space indentation, single quotes, and no semicolons.
- Use `PascalCase` for React component files (`CesiumViewer.tsx`), `camelCase` for helpers, and descriptive schema names ending with `Schema` in `lib/trip-schema.ts`.
- Prefer imports via path alias `@/*` (configured in `tsconfig.json`) over long relative paths.
- Keep styling consistent with existing Tailwind tokens and utility patterns; use CSS modules only when component-scoped styling is clearer.

## Testing Guidelines
- There is no established automated test suite in this snapshot yet.
- Minimum quality gate for changes: run `npm run lint` and `npx tsc --noEmit`.
- For new tests, place them near source or in `__tests__/` and use `*.test.ts` / `*.test.tsx` naming.

## Commit & Pull Request Guidelines
- Git metadata/history is not present in this workspace snapshot, so no project-specific commit pattern can be inferred.
- Use Conventional Commits by default (for example: `feat(globe): add keyboard orbit controls`).
- PRs should include: concise summary, why the change is needed, validation steps run, and screenshots/GIFs for UI changes.

## Security & Configuration Tips
- Copy `.env.example` for local setup and never commit secrets.
- Keep Cesium/public asset paths stable; `CesiumViewer` expects `/cesium/...` static locations.
