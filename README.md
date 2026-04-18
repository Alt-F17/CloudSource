# CloudSource

CloudSource is a globe-first AI travel planner built with Next.js, React, TypeScript, Tailwind CSS, Framer Motion, and Cesium. It brings destination discovery, flight planning, budgeting, notes, trip tasks, and an AI assistant into one connected interface instead of splitting travel planning across separate tools.

## What It Does

- centers the experience around a 3D interactive globe
- uses an orbiting panel UI for flights, culture, hotels, budget, chat, notes, and to-dos
- generates structured trip plans with AI
- visualizes flight routes and airport markers on the globe
- keeps trip state synced across the app with shared client-side state
- includes Nimbus, an in-app travel assistant for destination-aware guidance

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Cesium
- Zod

## Project Structure

```text
app/
  page.tsx                    Landing page
  (app)/app/page.tsx          Main globe experience
  (app)/app/flights/page.tsx  Flights panel
  (app)/app/about/page.tsx    Culture panel
  (app)/app/budget/page.tsx   Budget panel
  (app)/app/chat/page.tsx     Nimbus chat panel
  (app)/app/notes/page.tsx    Notes panel
  (app)/app/todo/page.tsx     Trip checklist
  api/                        App routes for AI and flight search

components/
  app/                        Shared state and planning UI
  globe/                      Cesium globe and carousel components
  mascot/                     Nimbus widget

lib/
  airports.ts                 Airport lookup data
  culture-data.ts             Destination culture content
  mock-flights.ts             Mock flight search data
  panel-routes.ts             Panel routing map
  prompts/                    AI prompt builders
  trip-project.ts             Generated project types
  trip-schema.ts              Shared schemas

public/cesium/                Cesium static runtime assets
```

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Set up env vars

Copy `.env.example` to `.env` and fill in what you need.

Important variables:

- `GOOGLE_AI_API_KEY`: required for AI trip generation
- `GOOGLE_NIMBUS_MODEL`: optional override for Nimbus
- `GOOGLE_TRIP_MODEL`: optional override for trip generation
- `NEXT_PUBLIC_CESIUM_ION_TOKEN`: required for Cesium globe access
- `GOOGLE_PLACES_API_KEY`: reserved for places integrations
- `DATABASE_URL`, `AUTH_*`, `ANTHROPIC_API_KEY`: present for future or adjacent integrations

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npx tsc --noEmit
```

## How It Works

CloudSource uses a shared app state provider to keep the active trip, flights, notes, todos, chat, budget, and destination context in sync across the globe and the panel routes.

Current backend behavior:

- `app/api/trip/generate/route.ts` calls Google AI and expects structured JSON output
- `app/api/flights/search/route.ts` currently returns mocked itinerary data
- `app/api/nimbus/route.ts` powers the in-app assistant flow

## Current State

This repo is a polished hackathon-style prototype with a strong UI and real AI integration, but not all travel data is live yet.

What is already working:

- globe-centered navigation
- multi-panel trip planning flow
- shared local app state with persistence
- AI-generated trip scaffolding
- mocked flight search and globe route rendering

What is still likely next:

- live flight and hotel integrations
- stronger auth and persistence
- collaborative planning
- deeper destination intelligence

## Notes

- Keep Cesium assets under `public/cesium/`; the viewer expects those paths.
- Minimum recommended validation before shipping changes:

```bash
npm run lint
npx tsc --noEmit
```
