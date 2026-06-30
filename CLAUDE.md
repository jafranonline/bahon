# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Bahon (বাহন) is a free, offline-first PWA for tracking vehicle fuel costs, service records, and maintenance reminders. Built for users in Bangladesh with full Bangla and English language support. No backend, no accounts, no API integrations — all data lives on the user's device.

## How to work on this project

1. **Read specs.md first.** It is the single source of truth for every design decision. If you are unsure about any architectural, naming, or UI decision, check the spec before writing code.

2. **Use tasks.md for the task queue.** Work through tasks in order. Do not skip tasks. Do not combine two tasks into one execution.

3. **Follow the Plan → Execute → Test loop.** Every task has a PLAN, EXECUTE, and TEST section. Complete all TEST items before moving to the next task.

4. **Mark tasks done in tasks.md.** After every TEST item passes, change its `[ ]` to `[x]` in tasks.md. Only when every TEST checkbox is `[x]` is the task considered done.

5. **Commit after each task passes all tests.** Commit message format: `TASK-NNN: [short description]`

6. **Retry and hard-stop rule.** If a TEST item fails, fix the issue and re-run it — up to **3 attempts**. If it still fails after 3 attempts, **stop the loop**, leave the checkbox unchecked, and write a brief failure note directly below the failing TEST line in tasks.md. Do not proceed to the next task.

## Absolute rules

- Never use `any` in TypeScript
- Never hardcode hex colours — use CSS custom properties from `src/styles/tokens.css`
- Never use platform primitives directly in screens — always use components from `src/components/primitives/`
- Never hardcode user-visible strings — always use i18n keys from `src/i18n/`
- All number inputs must use `inputMode="numeric"` or `inputMode="decimal"` — English digits only
- All interactive elements must have accessible labels
- Every screen must work fully offline

## Running the project

The dev server always runs on **port 4546**.

```bash
npm run dev          # Start dev server at http://localhost:4546
npm run build        # Production build to dist/
npm run preview      # Preview production build
npx tsc --noEmit     # Type check only
npm run lint         # ESLint
npm test             # Vitest unit + integration tests
npx playwright test  # E2E tests (requires built app)
```

Set the port in `vite.config.ts`:
```ts
server: { port: 4546 }
```

## Browser testing

Use **Brave Browser** for all local testing and screenshots. After implementing any UI change, open `http://localhost:4546` in Brave, take a screenshot, and critique the result before marking the task done.

## Deployment

- **Hosting:** Cloudflare Pages (static PWA, free tier, GitHub Actions CI)
- **Future AI features:** Cloudflare Workers (edge functions deployed alongside Pages)
- **Pattern:** Pages serves the static app shell; Workers will handle any future AI/backend endpoints under the same domain without requiring a separate server

CI/CD config lives in `.github/workflows/deploy.yml`. Deploy target is Cloudflare Pages via the official GitHub Action.

## User feedback

Since the app has no accounts or backend, user feedback is collected via a **Google Form** embedded or linked from the app. The form link lives as a constant in `src/utils/constants.ts` (`FEEDBACK_FORM_URL`). The About screen links to it. When creating or updating the form, update that constant.

## About screen

The About screen (`src/screens/AboutScreen.tsx`, route `/about`) should display:

- App name and tagline
- A short description of what Bahon is and why it was built
- Built by: **Jafran** · [mail@jafran.online](mailto:mail@jafran.online)
- A link to submit feedback (Google Form)
- App version (from `package.json`)
- Open source / privacy note: no data leaves the device

> Update the personal details above if the developer's preferred display name or contact changes.

## Key file locations

| What | Where |
|------|-------|
| Full app specification | specs.md |
| Task queue | tasks.md |
| TypeScript types | src/types/ |
| Database (Dexie) | src/db/ |
| Zustand stores | src/store/ |
| CSS design tokens | src/styles/tokens.css |
| Translation files | src/i18n/en.json, bn.json |
| Reusable components | src/components/ |
| Screen components | src/screens/ |
| Shared hooks | src/hooks/ |
| Pure utilities | src/utils/ |
| Feedback form URL constant | src/utils/constants.ts → FEEDBACK_FORM_URL |

## Architecture

### Data flow

User interaction → React screen → reads **Zustand store** (settings, UI state) OR **Dexie query hook** (vehicles, logs, reminders) → writes via Dexie transaction → IndexedDB → `useLiveQuery` triggers reactive re-render.

Settings (language, theme, currency, units, locked fuel price) live in `localStorage` via Zustand persist. All vehicle/log/reminder data lives in IndexedDB via Dexie.

### Store responsibilities

| Store | Owns |
|-------|------|
| `settingsStore` | language, theme, currency, units, locked fuel price, notifications enabled |
| `vehicleStore` | currently active vehicle ID |
| `uiStore` | drawer open state, active tab, modal visibility |

### DB layer (`src/db/`)

`database.ts` — Dexie schema and migrations. `models.ts` — all TypeScript interfaces. `src/db/queries/` — one `useLiveQuery` hook per entity (`useFuelLogs`, `useServiceLogs`, `useExpenses`, `useVehicles`, `useReminders`). All stored values are SI units (km, L); conversion to mi / gal / MPG happens at display time only.

### Component hierarchy

```
primitives/  ← atoms: Button, Input, Toggle, Badge, Chip, Select, IconButton, SegmentedControl
composed/    ← molecules: FormField, StatCard, LogRow, VehiclePill, HeroCard, ReminderCard, DrawerRow
charts/      ← DonutChart, StackedBarChart, LineChart (own Chart.js internally)
layout/      ← AppShell, TopBar, BottomNav, Drawer, Screen
domain/      ← components that import DB types (forms, reminder cards, vehicle pills)
screens/     ← route-level components, one per route
```

### Key calculations (`src/utils/calculations.ts`)

- `efficiencyKmL = (currentOdo − prevOdo) / volumeLitres`
- `efficiencyL100km = (volumeLitres / (currentOdo − prevOdo)) × 100`
- `efficiencyMPG = ((currentOdo − prevOdo) × 0.621371) / (volumeLitres × 0.264172)`

Derived values are calculated at write time and stored alongside raw inputs.

### Reminder urgency tiers

Overdue (red) → Urgent (red, within lead-time window) → Upcoming (amber, ≤30 days / ≤1000 km) → Future (green). Repeat reminders auto-advance their next due date/odometer on dismiss.

---

## Current task

1. Open tasks.md
2. Find the first task whose TEST section has at least one unchecked `[ ]` item
3. That is the current task — read its PLAN, execute its EXECUTE steps, run its TEST checks
4. Mark each passing TEST item `[x]` in tasks.md immediately after it passes
5. When all TEST items are `[x]`, commit and move to the next task
