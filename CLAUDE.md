# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Is

**CloudSource** — an AI-powered travel planning app built for the MariHacks IX "Agentic Age" hackathon. The centrepiece is a 3D interactive globe (CesiumJS) embedded in a Wii-channel-style 3D carousel. An AI agent (Gemma 4 primary / Claude fallback) generates a structured JSON trip plan that simultaneously populates every panel: Budget, Flights, Notes/Moodboard, Hotels, To-Do, and About. The UI is the other half of the story — it must be **pristine**.

- **Creative Director:** Val  
- **Senior Dev:** Felix

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | Auth.js v5 + Google OAuth |
| Database | Neon (serverless Postgres) |
| ORM | Drizzle ORM |
| UI | Tailwind CSS + Shadcn/UI |
| 3D Globe | CesiumJS (`@cesium/engine` or `resium`) |
| Carousel | keen-slider |
| AI (primary) | Gemma 4 (Google AI API) |
| AI (fallback) | Claude (Anthropic SDK) |
| Voice (later) | Eleven Labs — for the "little guy" mascot only |
| Maps | Google Places API (location pins on globe) |
| Deploy | Vercel |

---

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run db:push      # push Drizzle schema to Neon (no migration files)
npm run db:studio    # open Drizzle Studio to inspect Neon tables
npx auth secret      # generate AUTH_SECRET value
```

---

## Environment Variables (`.env.local`)

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
GOOGLE_AI_API_KEY=...        # Gemma 4
ANTHROPIC_API_KEY=...        # Claude fallback
GOOGLE_PLACES_API_KEY=...    # Globe location pins
CESIUM_ION_TOKEN=...         # CesiumJS terrain/imagery
# ELEVEN_LABS_API_KEY=...    # later — mascot voice
```

---

## App Architecture

### Route Structure (App Router)

```
app/
├── api/
│   ├── auth/[...nextauth]/route.ts   # Auth.js handler
│   ├── trip/generate/route.ts        # AI trip generation (POST)
│   └── trip/[id]/route.ts           # CRUD for saved trips
├── (auth)/login/page.tsx             # Google sign-in landing
├── (protected)/
│   └── app/page.tsx                  # Main carousel app shell
├── layout.tsx
└── page.tsx                          # Marketing/splash → redirect to login
components/
├── ui/                               # Shadcn (auto-generated, don't edit)
├── globe/                            # CesiumJS globe panel
├── carousel/                         # Wii-style 3D carousel shell
├── panels/                           # One component per panel
│   ├── BudgetPanel.tsx
│   ├── ChatbotPanel.tsx
│   ├── FlightsPanel.tsx
│   ├── NotesPanel.tsx
│   ├── HotelsPanel.tsx
│   ├── TodoPanel.tsx
│   └── AboutPanel.tsx
├── mascot/                           # "Little guy" tutorial agent
└── trip-switcher/                    # Hamburger menu, multi-trip list
db/
├── index.ts                          # Drizzle client
└── schema.ts                         # trips, budgetItems, notes, etc.
lib/
├── auth.ts                           # Auth.js config
├── ai.ts                             # Gemma 4 / Claude fallback wrapper
└── trip-schema.ts                    # Zod schema for AI JSON output
```

### Auth Flow

`middleware.ts` protects `/app/**`. Auth.js sessions are DB-backed via DrizzleAdapter. Get the session server-side with `const session = await auth()`.

---

## The Carousel — Core UX Contract

The entire app lives inside a **3D Wii-channel-style carousel**. Each panel is a card in the carousel. The Globe is one of those cards.

### Panel Order
`Globe` → `Chatbot` → `Flights` → `Hotels` → `Budget` → `Notes` → `To-Do` → `About`

### Carousel Behaviour
- **Arrow press →** the active panel slides out in the arrow's direction, the next panel slides in from the opposite side. All transitions use CSS `ease-out` (not keyframes — keeps them interruptible).
- **Globe panel selected →** the globe card expands / zooms in (CSS transform scale + translate, spring physics via Motion).
- **Globe panel exited →** globe zooms OUT first (spring reverse), then the carousel transition fires.
- Use `keen-slider` for the carousel track. Wrap each panel in a `motion.div` for enter/exit springs.

### Critical animation rules (Emil Kowalski)
- All transitions: `transform` + `opacity` only — never `width/height/top/left`
- Entry easing: `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out)
- Exit faster than enter (~60% of enter duration)
- Buttons: `scale(0.97)` on `:active`, 160ms
- No `ease-in` anywhere in the UI
- Respect `prefers-reduced-motion`
- Stagger panel content reveals: 30–50ms between items

---

## The Globe Panel — Technical Notes

CesiumJS runs exclusively client-side. **Always import it via `next/dynamic` with `ssr: false`.**

```tsx
const GlobeView = dynamic(() => import('@/components/globe/GlobeView'), {
  ssr: false,
  loading: () => <GlobeSkeleton />,
})
```

### Globe Interaction Flow
1. User selects the Globe panel → globe zooms in (spring scale, `duration: 0.6, bounce: 0.15`)
2. User drags to spin the globe (CesiumJS native interaction)
3. Clicking a location → Google Places API call → floating pin card with place name, photo, rating
4. Left/right arrow → globe spring-zooms OUT → carousel transitions to next/prev panel

### CesiumJS Setup
- Use `Cesium.Ion.defaultAccessToken` from `CESIUM_ION_TOKEN`
- Disable default Cesium UI chrome (timeline, animation widget, infoBox) — build our own
- Set `imageryProvider` to a dark/satellite tile layer to match the dark app theme
- Camera zoom controlled programmatically via `viewer.camera.flyTo()` or `zoomIn/zoomOut`

---

## AI Trip Generation — The Core Feature

### Endpoint: `POST /api/trip/generate`

Accepts: `{ destination: string, budget?: number, dates?: { from: string, to: string } }`

The AI (Gemma 4 → Claude fallback) returns a **single JSON object** that fills every panel simultaneously. Validate with Zod before writing to DB.

### Trip JSON Schema (`lib/trip-schema.ts`)

```ts
const BudgetItem = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.number(),
  category: z.enum(['transport', 'accommodation', 'food', 'activities', 'misc']),
})

const TripPlan = z.object({
  destination: z.string(),
  summary: z.string(),
  dates: z.object({ from: z.string(), to: z.string() }).optional(),

  // Budget — ARRAY-BASED: AI or user can add/remove fields freely
  budget: z.array(BudgetItem),
  budgetTotal: z.number(),

  flights: z.object({
    outbound: FlightSchema,
    return: FlightSchema.optional(),
    notes: z.string().optional(),
  }),

  hotels: z.array(HotelSchema),

  notes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    pinned: z.boolean().default(false),
  })),

  todo: z.array(z.object({
    id: z.string(),
    task: z.string(),
    category: z.enum(['documents', 'packing', 'booking', 'health', 'misc']),
    completed: z.boolean().default(false),
    aiSuggested: z.boolean().default(false),
  })),

  about: z.object({
    culture: z.string(),
    currency: z.string(),
    language: z.string(),
    timezone: z.string(),
    funFacts: z.array(z.string()),
    touristTips: z.array(z.string()),
    visaRequired: z.boolean().nullable(),
    visaInfo: z.string().optional(),
  }),

  forgottenItems: z.array(z.string()), // AI "did I forget?" suggestions
})
```

### Budget Panel — Array-Based Architecture
The budget is **not** a fixed set of fields. It's an array of `BudgetItem`. Both the AI (on generation) and the user (manually) can add, remove, or edit items. The total is always derived by summing `budget[].amount`. Over-budget logic: if `budgetTotal > userMaxBudget`, highlight in red and surface AI suggestions to cut costs.

### AI Prompt Strategy
Build the system prompt to instruct the model to output **only** valid JSON matching the schema above. Use `JSON.parse` + Zod `.safeParse()` — never trust raw output. Retry once on validation failure with the Zod error appended to the prompt. Fall back to Claude if Gemma fails or returns invalid JSON after retry.

---

## Database Schema Overview (`db/schema.ts`)

```ts
trips            // id, userId, destination, planJson (JSONB), createdAt
budgetItems      // id, tripId, label, amount, category (for DB-level budget queries)
// Auth.js tables managed automatically by DrizzleAdapter
```

Store the full `TripPlan` JSON in a `planJson` JSONB column for flexibility. Keep `budgetItems` as a separate table only if budget queries are needed server-side. For a hackathon, JSONB is fine for everything.

---

## Design System

The UI is **dark-first, premium, immersive**. Think: NASA control room meets luxury travel concierge.

### Color Tokens — Black · Blue · Pink (accent White)
```css
--bg-space:       #06080F;   /* deep black — main app background */
--bg-space-2:     #0A0F1E;   /* secondary surface */
--bg-panel:       rgba(255,255,255,0.05);  /* glass panel surface */
--bg-panel-hover: rgba(255,255,255,0.09);
--border-glass:   rgba(255,255,255,0.10);
--blue:           #3B82F6;   /* primary blue accent */
--blue-bright:    #60A5FA;   /* hover/glow */
--blue-deep:      #1E3A8A;   /* depth */
--pink:           #EC4899;   /* pink accent — key differentiator */
--pink-bright:    #F472B6;   /* hover/glow */
--pink-hot:       #DB2777;   /* CTA emphasis */
--accent-white:   #FFFFFF;   /* pure white accents */
--text-primary:   #F8FAFC;
--text-muted:     #94A3B8;
--ai-gradient:    linear-gradient(135deg, #3B82F6, #EC4899);  /* AI-generated items */
--error:          #F87171;
--success:        #34D399;
```

### Glass Panel Style (every carousel card)
```css
background: var(--bg-panel);
backdrop-filter: blur(24px) saturate(160%);
border: 1px solid var(--border-glass);
border-radius: 24px;
box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
```

### Typography
- **Display/headings:** `Satoshi` (or `DM Sans` as Google Fonts fallback) — weight 700
- **Body:** `DM Sans` — weight 400/500
- **Monospace (budget amounts, flight codes):** `JetBrains Mono` or `IBM Plex Mono`
- Base: 16px, line-height 1.6, type scale: 12/14/16/18/24/32/48

### Key UI Patterns
- Carousel cards: glass + `box-shadow` depth
- AI-generated content: `--ai-gradient` (blue→pink) left border or shimmer badge
- Budget items: monospace amounts, animated total counter
- Pins on globe: floating card with frosted glass, origin-aware scale transform
- "Little guy" mascot: fixed bottom-right, animated idle state, speech bubble on trigger
- Loading states: skeleton shimmer (never blank spinners for >300ms waits)

---

## Performance Rules (Critical for Vercel)

- **CesiumJS + keen-slider** → always `next/dynamic({ ssr: false })`
- **AI generation** → stream the response with `ReadableStream` so panels populate progressively
- **Parallel data fetching** → `Promise.all([fetchFlights(), fetchHotels()])`, never sequential awaits
- **Globe imagery tiles** → loaded by CesiumJS lazily, no action needed
- **Moodboard images** → `next/image` with explicit `width`/`height` to prevent CLS
- **Budget total** → derive during render from `budget.reduce()`, never store as separate state

---

## The "Little Guy" Mascot

A small animated character (SVG/Lottie) docked bottom-right. On first load, triggers a guided tour of the carousel. Eleven Labs voice integration is a **stretch goal** — build the character and speech-bubble system first, wire audio later. Don't block core feature work on this.

---

## Multi-Trip Switcher (Low Priority)

Top-left hamburger menu. Opens a drawer listing saved `trips` for the current user. Switching loads a different trip's `planJson` into the carousel panels. Build only after core features are stable.

---

## What "Done" Looks Like for the Hackathon

1. Google sign-in works
2. Globe loads, spins, accepts location clicks with Places API pins
3. Carousel transitions between all panels (smooth, 3D feel)
4. AI generates a full trip plan JSON that populates all panels
5. Budget panel: dynamic array of items, live total, over-budget warning
6. To-do panel: "What did I forget?" AI check runs against existing items
7. UI is pristine on desktop — dark theme, glass panels, premium feel
