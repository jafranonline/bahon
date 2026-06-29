# Bahon | বাহন

A free, offline-first PWA for tracking vehicle fuel costs, service records, and maintenance reminders. Built for users in Bangladesh with full Bangla and English language support. No backend, no accounts — all data lives on your device.

## Features

- **Fuel logs** — track fill-ups with odometer readings, cost, and auto-calculated efficiency (km/L, L/100km, MPG)
- **Service logs** — record oil changes, tyre replacements, and any maintenance work
- **Expense logs** — parking, fines, insurance, and other vehicle costs
- **Reminders** — time- and odometer-based maintenance reminders with urgency tiers
- **Stats** — monthly cost breakdowns, trend charts, and efficiency history
- **Multi-vehicle** — manage any number of vehicles
- **Offline-first PWA** — installable, works without internet
- **Bangla + English** — full i18n support

## Tech stack

| Layer | Library |
|---|---|
| UI | React 19 + TypeScript |
| Bundler | Vite 8 |
| Routing | React Router 7 |
| Database | Dexie 4 (IndexedDB) |
| State | Zustand 5 |
| i18n | react-i18next / i18next |
| Charts | Chart.js 4 + react-chartjs-2 |
| Styling | CSS Modules + custom properties |
| Icons | @tabler/icons-react |
| Testing | Vitest + Testing Library + Playwright |
| Linting | oxlint |
| Hosting | Cloudflare Pages |

## Getting started

```bash
git clone https://github.com/your-username/bahon.git
cd bahon
npm install
npm run dev        # http://localhost:4546
```

Node.js ≥ 18 required.

## Scripts

```bash
npm run dev          # Dev server at http://localhost:4546
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # oxlint
npm test             # Vitest unit + integration tests
npx tsc --noEmit     # Type-check only (no emit)
npx playwright test  # E2E tests (run npm run build first)
```

Run a single test file:

```bash
npm test -- src/utils/calculations.test.ts
```

## Project structure

```
src/
  components/
    primitives/     # Atoms: Button, Input, Toggle, Badge, Chip, Select, SegmentedControl
    composed/       # Molecules: StatCard, LogRow, HeroCard, VehiclePill
    charts/         # DonutChart, LineChart, StackedBarChart
    layout/         # AppShell, TopBar, BottomNav, Drawer, Screen
    domain/         # DB-aware components: SettingsDrawer
  db/
    database.ts     # Dexie schema
    models.ts       # TypeScript interfaces
    queries/        # useLiveQuery hooks per entity
  hooks/            # useUnits, useCurrency, useTranslation, useExport
  i18n/             # en.json, bn.json, config.ts
  screens/          # One component per route
  store/            # Zustand stores: settingsStore, vehicleStore, uiStore
  styles/
    tokens.css      # All CSS custom properties (colours, spacing, radius)
  types/            # Shared TypeScript types
  utils/            # calculations.ts, constants.ts, pure helpers
```

## Component usage

All interactive elements live under `src/components/primitives/`. Never use raw HTML inputs or buttons in screen components — use these primitives.

```tsx
import { Button } from '@components/primitives/Button'
import { Input } from '@components/primitives/Input'
import { Toggle } from '@components/primitives/Toggle'
import { Select } from '@components/primitives/Select'
import { Badge } from '@components/primitives/Badge'
import { Chip } from '@components/primitives/Chip'
import { SegmentedControl } from '@components/primitives/SegmentedControl'

// Button variants: 'primary' | 'secondary' | 'ghost' | 'danger'
<Button variant="primary" onClick={handleSave}>Save</Button>

// Input — always use inputMode for numeric fields
<Input
  label="Odometer"
  value={odo}
  onChange={setOdo}
  inputMode="numeric"
  suffix="km"
/>

// Toggle
<Toggle checked={isDark} onChange={setDark} aria-label="Dark mode" />

// SegmentedControl
<SegmentedControl
  options={[{ value: 'fuel', label: 'Fuel' }, { value: 'service', label: 'Service' }]}
  value={activeTab}
  onChange={setActiveTab}
/>
```

## Database schema

All data lives in IndexedDB via Dexie. The database name is `BahonDB`.

| Table | Key | Indexed fields |
|---|---|---|
| `vehicles` | `id` (uuid) | `type`, `createdAt` |
| `fuelLogs` | `id` (uuid) | `vehicleId`, `date`, `createdAt` |
| `serviceLogs` | `id` (uuid) | `vehicleId`, `date`, `category`, `createdAt` |
| `expenses` | `id` (uuid) | `vehicleId`, `date`, `category`, `createdAt` |
| `reminders` | `id` (uuid) | `vehicleId`, `isActive`, `nextDueDate` |

All stored values use SI units (km, L). Unit conversion to mi / gal / MPG happens at display time only via the `useUnits` hook.

Efficiency is stored as `efficiencyKmPerL` on each `FuelLog`, calculated at write time:

```
efficiencyKmPerL = (currentOdo − prevOdo) / volumeLitres
```

## i18n — adding a new language

1. Copy `src/i18n/en.json` to `src/i18n/xx.json` (where `xx` is the BCP-47 code)
2. Translate every value (keep keys unchanged)
3. In `src/i18n/config.ts`, import the new file and add it to the `resources` object
4. In `src/types/index.ts`, add the new code to the `Language` union type
5. In `src/components/domain/SettingsDrawer/SettingsDrawer.tsx`, add a label to the language option list

## Deployment

The app deploys automatically to Cloudflare Pages on every push to `main` via GitHub Actions (`.github/workflows/deploy.yml`).

To set up a new deployment:

1. Create a Cloudflare Pages project named `bahon`
2. Add two repository secrets in GitHub:
   - `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with Pages edit permission
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
3. Push to `main` — CI runs type-check, lint, tests, build, then deploys `dist/`

To deploy manually:

```bash
npm run build
npx wrangler pages deploy dist --project-name bahon
```

## Contributing

- Read `CLAUDE.md` for architecture rules before writing code
- Never hardcode colours — use CSS custom properties from `src/styles/tokens.css`
- Never hardcode user-visible strings — use i18n keys from `src/i18n/`
- All number inputs must use `inputMode="numeric"` or `inputMode="decimal"`
- Every screen must work fully offline

---

Built by [Jafran](mailto:jafraaan@gmail.com) · No data leaves your device
