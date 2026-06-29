# Bahon / বাহন — Master Task List
# For Claude Code execution loops

## How to use this file

Each task follows the Plan → Execute → Test loop.
Claude Code should:
1. Read the PLAN section fully before writing any code
2. Execute every step in the EXECUTE section in order
3. Run every check in the TEST section before marking the task done
4. Never skip a task. Never combine tasks.
5. Commit after each task passes all tests.

---

## Phase 0 — Project bootstrap

---

### TASK-001: Initialise the Vite + React + TypeScript project

**PLAN**
- Scaffold a new Vite project with React + TypeScript template
- Set the project name to `bahon`
- Verify Node.js ≥ 18 is available
- Confirm the dev server runs before proceeding

**EXECUTE**
1. Scaffold into the current directory (not a subdirectory): `npm create vite@latest . -- --template react-ts`
   - If prompted about non-empty directory, confirm yes
2. `npm install`
3. Open `vite.config.ts` — confirm `@vitejs/plugin-react` is present; add `server: { port: 4546 }`
4. Delete `src/App.css`, `src/index.css`, `public/vite.svg`, `src/assets/react.svg`
5. Replace `src/App.tsx` with a minimal placeholder: `export default function App() { return <div>Bahon</div> }`
6. Replace `src/main.tsx` with standard React 18 root render
7. Update `index.html` — set `<title>Bahon | বাহন</title>` and `lang="en"`
8. Update `package.json` — set `"name": "bahon"`, `"version": "0.1.0"`

**TEST**
- [x] `npm run dev` starts without errors
- [x] Browser shows "Bahon" text at localhost:4546
- [x] No TypeScript errors: `npx tsc --noEmit`
- [x] No ESLint errors: `npm run lint`

---

### TASK-002: Install all dependencies

**PLAN**
- Install production dependencies in one batch
- Install dev dependencies separately
- Verify no peer dependency warnings that would cause runtime issues

**EXECUTE**
1. Install production deps:
   ```
   npm install react-router-dom zustand dexie react-chartjs-2 chart.js react-i18next i18next date-fns zod @tabler/icons-react
   ```
2. Install dev deps:
   ```
   npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event playwright @playwright/test vite-plugin-pwa workbox-window
   ```
3. Verify `package.json` lists all packages with exact installed versions

**TEST**
- [x] `npm install` completes with 0 errors
- [x] `npm run dev` still works
- [x] `node -e "require('./node_modules/dexie')"` exits 0
- [x] TypeScript can find all package types: `npx tsc --noEmit`

---

### TASK-003: Configure TypeScript

**PLAN**
- Update tsconfig.json for strict mode and correct paths
- Add path aliases for src/ subdirectories
- Configure for React JSX

**EXECUTE**
1. Replace `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@store/*": ["src/store/*"],
      "@db/*": ["src/db/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@i18n/*": ["src/i18n/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```
2. Update `vite.config.ts` to resolve the same aliases:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@screens': path.resolve(__dirname, './src/screens'),
      '@store': path.resolve(__dirname, './src/store'),
      '@db': path.resolve(__dirname, './src/db'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@i18n': path.resolve(__dirname, './src/i18n'),
    }
  }
})
```

**TEST**
- [x] `npx tsc --noEmit` passes
- [x] `npm run dev` still works
- [x] Create a test file `src/test-import.ts` that imports `import { useState } from 'react'` and delete after confirming no error

---

### TASK-004: Set up the folder structure

**PLAN**
- Create all directories defined in the spec
- Add placeholder index.ts files so git tracks empty dirs
- Structure must match BAHON_SPEC.md section 4.1 exactly

**EXECUTE**
1. Create all directories:
```
mkdir -p src/components/primitives
mkdir -p src/components/composed
mkdir -p src/components/charts
mkdir -p src/components/layout
mkdir -p src/components/domain
mkdir -p src/screens
mkdir -p src/store
mkdir -p src/db/queries
mkdir -p src/hooks
mkdir -p src/i18n
mkdir -p src/styles
mkdir -p src/utils
mkdir -p src/types
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/e2e
mkdir -p public/icons
mkdir -p .github/workflows
```
2. Add `.gitkeep` to each empty directory
3. Create `src/types/index.ts` with a comment: `// Global type exports`

**TEST**
- [x] All directories exist: `find src -type d | sort`
- [x] `npm run dev` still works
- [x] No TypeScript errors

---

### TASK-005: Create the global TypeScript types and interfaces

**PLAN**
- Define all database model interfaces from spec section 4.3
- Define all enum/union types
- Export everything from a central types/index.ts

**EXECUTE**
1. Create `src/types/models.ts` — define `Vehicle`, `FuelLog`, `ServiceLog`, `Expense`, `Reminder`, `Settings` interfaces exactly as in spec section 4.3
2. Create `src/types/enums.ts` — define:
   - `VehicleType`: `'car' | 'motorcycle' | 'truck' | 'bus' | 'other'`
   - `FuelType`: `'octane' | 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'`
   - `ServiceCategory`: all 20 categories from spec section 6.4
   - `ExpenseCategory`: all 9 categories from spec section 6.5
   - `ReminderRepeatUnit`: `'daily' | 'weekly' | 'monthly' | 'yearly' | 'km'`
   - `Language`: `'en' | 'bn'`
   - `Theme`: `'light' | 'dark' | 'system'`
   - `Currency`: `'BDT' | 'USD' | 'EUR' | 'INR' | 'GBP' | 'SAR'`
   - `DistanceUnit`: `'km' | 'mi'`
   - `VolumeUnit`: `'L' | 'gal'`
   - `EfficiencyUnit`: `'km/L' | 'L/100km' | 'MPG'`
3. Create `src/types/index.ts` — re-export everything from models.ts and enums.ts

**TEST**
- [x] `npx tsc --noEmit` — zero errors
- [x] All types are importable: add temp import in App.tsx, confirm no error, remove
- [x] Types file has no `any` types

---

### TASK-006: Set up the CSS design system (tokens)

**PLAN**
- Create the CSS custom properties file matching spec section 8
- Import Google Fonts (Hind Siliguri + Inter)
- Create global reset and base styles
- Link all style files into main.tsx

**EXECUTE**
1. Create `src/styles/fonts.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600&family=Inter:wght@400;500&display=swap');
```
2. Create `src/styles/tokens.css` with all CSS custom properties from spec section 8.1, 8.2, 8.3. Include both `:root` (light mode) and `[data-theme="dark"]` (dark mode) values.
3. Create `src/styles/global.css`:
   - CSS reset (box-sizing border-box, no default margins)
   - `body { font-family: var(--font-body); color: var(--text-primary); background: var(--surface-0); }`
   - Scrollbar hiding utility: `.no-scrollbar::-webkit-scrollbar { display: none }`
   - Safe area padding for iOS: `--safe-bottom: env(safe-area-inset-bottom, 0px)`
4. Update `src/main.tsx`:
```typescript
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/global.css'
```

**TEST**
- [x] `npm run dev` — no CSS import errors
- [x] Browser DevTools: `getComputedStyle(document.documentElement).getPropertyValue('--blue-400')` returns `#2a78d6`
- [x] Toggle `data-theme="dark"` on `<html>` — verify text-primary changes
- [x] Hind Siliguri font loaded in Network tab

---

---

## Phase 1 — Database layer

---

### TASK-007: Set up Dexie database schema

**PLAN**
- Create the Dexie database class with all tables
- Define indexes for efficient queries
- Export a singleton instance

**EXECUTE**
1. Create `src/db/database.ts`:
```typescript
import Dexie, { type Table } from 'dexie';
import type { Vehicle, FuelLog, ServiceLog, Expense, Reminder } from '@/types';

export class BahonDatabase extends Dexie {
  vehicles!: Table<Vehicle, string>;
  fuelLogs!: Table<FuelLog, string>;
  serviceLogs!: Table<ServiceLog, string>;
  expenses!: Table<Expense, string>;
  reminders!: Table<Reminder, string>;

  constructor() {
    super('BahonDB');
    this.version(1).stores({
      vehicles: 'id, type, createdAt',
      fuelLogs: 'id, vehicleId, date, createdAt',
      serviceLogs: 'id, vehicleId, date, category, createdAt',
      expenses: 'id, vehicleId, date, category, createdAt',
      reminders: 'id, vehicleId, isActive, nextDueDate',
    });
  }
}

export const db = new BahonDatabase();
```
2. Create `src/db/models.ts` — re-export all DB types (same as types/models.ts, kept here for db-layer imports)

**TEST**
- [x] `npx tsc --noEmit` — no errors
- [x] Import db in App.tsx, call `db.vehicles.count()`, confirm returns promise — remove after test
- [x] DevTools → Application → IndexedDB — confirm "BahonDB" appears after app loads

---

### TASK-008: Create database query hooks — vehicles

**PLAN**
- All queries use `useLiveQuery` from Dexie for reactive updates
- Every hook returns `{ data, loading, error }` pattern
- Mutations return async functions, not hooks

**EXECUTE**
1. Create `src/db/queries/useVehicles.ts`:
   - `useVehicles()` — returns all vehicles, sorted by createdAt desc
   - `useVehicle(id: string)` — returns single vehicle or undefined
   - `addVehicle(data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>)` — generates uuid, timestamps, saves
   - `updateVehicle(id: string, data: Partial<Vehicle>)` — updates with new updatedAt
   - `deleteVehicle(id: string)` — deletes vehicle + all associated logs and reminders (transaction)
2. Use `crypto.randomUUID()` for id generation
3. Use `new Date().toISOString()` for timestamps

**TEST**
- [x] `npx tsc --noEmit` — no errors
- [x] Write a unit test in `tests/unit/vehicles.test.ts`:
  - Add a vehicle, verify it appears in `useVehicles`
  - Delete a vehicle, verify it's gone
  - Verify cascading delete removes fuel logs too

---

### TASK-009: Create database query hooks — fuel logs

**PLAN**
- Queries must support filtering by vehicleId and date range
- Efficiency is always calculated server-side on write, not on read

**EXECUTE**
1. Create `src/db/queries/useFuelLogs.ts`:
   - `useFuelLogs(vehicleId: string)` — all logs for vehicle, sorted by date desc
   - `useFuelLogsByDateRange(vehicleId: string, from: string, to: string)` — filtered by date range
   - `useMonthlyFuelLogs(vehicleId: string, year: number, month: number)` — for dashboard
   - `addFuelLog(data: Omit<FuelLog, 'id' | 'createdAt'>)` — auto-generates id, sets createdAt
   - `updateFuelLog(id: string, data: Partial<FuelLog>)`
   - `deleteFuelLog(id: string)`
   - `getLastOdometer(vehicleId: string): Promise<number>` — returns last known odometer for the vehicle

**TEST**
- [ ] Unit test: add 3 fuel logs, verify monthly query returns correct 2 for a given month
- [ ] Unit test: `getLastOdometer` returns highest odometer value
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-010: Create database query hooks — service logs, expenses, reminders

**PLAN**
- Service and expense hooks mirror fuel log hook pattern
- Reminder hook includes logic for urgency calculation

**EXECUTE**
1. Create `src/db/queries/useServiceLogs.ts`:
   - `useServiceLogs(vehicleId: string)` — all, sorted by date desc
   - `useMonthlyServiceLogs(vehicleId: string, year: number, month: number)`
   - `addServiceLog`, `updateServiceLog`, `deleteServiceLog`
2. Create `src/db/queries/useExpenses.ts` — same pattern as service logs
3. Create `src/db/queries/useReminders.ts`:
   - `useReminders(vehicleId?: string)` — all active reminders, optional vehicleId filter
   - `useOverdueReminders()` — reminders where dueDate < today or dueOdometer < current odo
   - `addReminder`, `updateReminder`, `deleteReminder`
   - `dismissReminder(id: string, currentOdometer?: number)` — for repeat reminders, advances next due date/odo; for one-time, marks inactive
   - `advanceRepeatReminder(reminder: Reminder, currentOdometer: number): Reminder` — pure function, calculates next trigger

**TEST**
- [ ] Unit test: add repeat monthly reminder, dismiss it, verify nextDueDate advanced by 1 month
- [ ] Unit test: `advanceRepeatReminder` with 'km' type, verify nextDueOdometer = current + repeatValue
- [ ] Unit test: `useOverdueReminders` returns reminder with past dueDate
- [ ] `npx tsc --noEmit` — no errors

---

---

## Phase 2 — State management

---

### TASK-011: Create settings store

**PLAN**
- Settings persist to localStorage via Zustand persist middleware
- Default values defined for all settings
- Hydration must be synchronous (no flash of wrong settings on load)

**EXECUTE**
1. Create `src/store/settingsStore.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '@/types';

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const defaults: Settings = {
  language: 'en',
  theme: 'system',
  currency: 'BDT',
  distanceUnit: 'km',
  volumeUnit: 'L',
  efficiencyUnit: 'km/L',
  notificationsEnabled: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaults,
      update: (patch) => set((state) => ({ ...state, ...patch })),
      reset: () => set(defaults),
    }),
    { name: 'bahon-settings' }
  )
);
```

**TEST**
- [ ] Change language setting, reload page — language persists
- [ ] `npx tsc --noEmit` — no errors
- [ ] localStorage key `bahon-settings` appears in DevTools after first render

---

### TASK-012: Create vehicle and UI stores

**PLAN**
- vehicleStore holds the currently selected vehicle ID
- uiStore holds transient UI state: drawer open, active tab

**EXECUTE**
1. Create `src/store/vehicleStore.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VehicleStore {
  activeVehicleId: string | null;
  setActiveVehicle: (id: string | null) => void;
}

export const useVehicleStore = create<VehicleStore>()(
  persist(
    (set) => ({
      activeVehicleId: null,
      setActiveVehicle: (id) => set({ activeVehicleId: id }),
    }),
    { name: 'bahon-active-vehicle' }
  )
);
```
2. Create `src/store/uiStore.ts`:
```typescript
import { create } from 'zustand';

interface UIStore {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  statsTab: 'summary' | 'fuel' | 'service';
  setStatsTab: (tab: 'summary' | 'fuel' | 'service') => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  statsTab: 'summary',
  setStatsTab: (tab) => set({ statsTab: tab }),
}));
```

**TEST**
- [ ] `npx tsc --noEmit` — no errors
- [ ] Toggle drawer open in store, verify component re-renders (manual test)
- [ ] Active vehicle ID persists across reload

---

---

## Phase 3 — Utilities and hooks

---

### TASK-013: Create calculation utilities

**PLAN**
- Pure functions only — no side effects, no imports from DB or stores
- All functions fully typed
- Cover every calculation mentioned in spec section 6.3

**EXECUTE**
Create `src/utils/constants.ts` first:
```typescript
export const FEEDBACK_FORM_URL = ''; // paste Google Form URL here when created
export const APP_VERSION = '1.0.0';
```
Then create `src/utils/calculations.ts`:
```typescript
// Fuel efficiency calculations
export function calcEfficiencyKmL(distanceKm: number, volumeL: number): number
export function calcEfficiencyL100km(distanceKm: number, volumeL: number): number
export function calcEfficiencyMPG(distanceKm: number, volumeL: number): number

// Fuel cost calculations
export function calcTotalCost(volumeL: number, pricePerL: number): number
export function calcPricePerLitre(totalCost: number, volumeL: number): number

// Unit conversions
export function kmToMiles(km: number): number
export function milesToKm(miles: number): number
export function litresToGallons(litres: number): number
export function gallonsToLitres(gallons: number): number
export function kmLToMPG(kml: number): number
export function kmLToL100km(kml: number): number
export function MPGToKmL(mpg: number): number
export function L100kmToKmL(l100: number): number

// Date helpers for reminders
export function addDays(date: Date, days: number): Date
export function addMonths(date: Date, months: number): Date
export function addYears(date: Date, years: number): Date
export function daysUntil(date: Date): number

// Monthly aggregation
export function getMonthKey(date: string): string  // 'YYYY-MM'
export function sumByMonth(logs: Array<{date: string; amount: number}>): Record<string, number>
```

**TEST**
- [ ] `npx tsc --noEmit` — no errors
- [ ] Unit tests in `tests/unit/calculations.test.ts`:
  - `calcEfficiencyKmL(100, 8)` === `12.5`
  - `calcEfficiencyL100km(100, 8)` === `8`
  - `kmLToMPG(12.4)` ≈ `29.2` (within 0.1)
  - `calcTotalCost(40, 130)` === `5200`
  - `calcPricePerLitre(5200, 40)` === `130`
  - All functions return `number`, never `NaN` for valid inputs

---

### TASK-014: Create formatter utilities

**PLAN**
- Formatters are unit-aware: they read settings and apply conversions
- All user-visible numbers go through formatters, never raw

**EXECUTE**
Create `src/utils/formatters.ts`:
```typescript
import type { Settings } from '@/types';

// Currency formatter
export function formatCurrency(
  amount: number,
  currency: Settings['currency'],
  compact?: boolean
): string  // e.g. "৳ 5,200" or "৳ 5.2K"

// Currency symbol lookup
export function getCurrencySymbol(currency: Settings['currency']): string

// Distance formatter
export function formatDistance(
  km: number,
  unit: Settings['distanceUnit']
): string  // e.g. "842 km" or "523 mi"

// Volume formatter
export function formatVolume(
  litres: number,
  unit: Settings['volumeUnit']
): string  // e.g. "40 L" or "10.6 gal"

// Efficiency formatter
export function formatEfficiency(
  kmPerL: number,
  unit: Settings['efficiencyUnit']
): string  // e.g. "12.4 km/L" or "8.1 L/100km" or "29.2 MPG"

// Date formatter
export function formatDate(isoDate: string, locale: 'en' | 'bn'): string
// e.g. "28 Jun 2026"

// Relative date
export function formatRelativeDate(isoDate: string): string
// e.g. "3 days ago", "Today", "Yesterday"

// Number with locale
export function formatNumber(n: number, decimals?: number): string
// Always English digits
```

**TEST**
- [ ] `npx tsc --noEmit` — no errors
- [ ] Unit tests:
  - `formatCurrency(5200, 'BDT')` === `'৳ 5,200'`
  - `formatCurrency(5200.5, 'USD')` === `'$ 5,200.50'`
  - `formatDistance(100, 'mi')` === `'62.1 mi'`
  - `formatEfficiency(12.4, 'L/100km')` === `'8.1 L/100km'`
  - No `NaN` in output for any valid input

---

### TASK-015: Create shared React hooks

**PLAN**
- Wrap store selectors and formatters into convenient hooks
- useTranslation wraps react-i18next
- useUnits and useCurrency give components formatted values without knowing the raw settings

**EXECUTE**
1. Create `src/hooks/useUnits.ts`:
   - Returns `{ formatDistance, formatVolume, formatEfficiency, distanceUnit, volumeUnit, efficiencyUnit }` with current settings baked in
2. Create `src/hooks/useCurrency.ts`:
   - Returns `{ format, symbol, currency }` with current currency baked in
3. Create `src/hooks/useTheme.ts`:
   - Applies `data-theme` attribute to `<html>` based on settings and system preference
   - Responds to `prefers-color-scheme` media query changes
4. Create `src/hooks/useExport.ts`:
   - `exportAsCSV(entity: 'vehicles' | 'fuel' | 'service' | 'expenses' | 'reminders')` — queries DB, formats CSV with BOM, triggers download
5. Create `src/hooks/useNotifications.ts`:
   - `requestPermission(): Promise<boolean>`
   - `scheduleReminder(reminder: Reminder)` — registers service worker push

**TEST**
- [ ] `npx tsc --noEmit` — no errors
- [ ] `useUnits` returns correctly formatted distance in a test component
- [ ] `useTheme` sets `data-theme="dark"` when settings.theme === 'dark'
- [ ] `exportAsCSV('vehicles')` downloads a file in browser (manual test)

---

---

## Phase 4 — i18n

---

### TASK-016: Set up i18next and create translation files

**PLAN**
- Configure i18next with react-i18next
- Create full en.json and bn.json translation files covering every string in the app
- Language must switch instantly without page reload

**EXECUTE**
1. Create `src/i18n/config.ts`:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import bn from './bn.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, bn: { translation: bn } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```
2. Create `src/i18n/en.json` — all English strings organised by namespace (app, nav, vehicle, fuel, service, expense, reminder, stats, settings, common). Minimum 80 keys.
3. Create `src/i18n/bn.json` — Bangla equivalents of all keys in en.json. All UI labels, placeholders, button text, error messages, and empty states.
4. Import `src/i18n/config.ts` in `src/main.tsx` before App renders
5. Create `src/hooks/useTranslation.ts` — re-exports `useTranslation` from react-i18next with type-safe key paths

**TEST**
- [ ] Switch language to 'bn' in settings → all UI labels update immediately
- [ ] Switch back to 'en' → reverts
- [ ] `npx tsc --noEmit` — no errors
- [ ] No missing translation keys (check browser console for i18next warnings)
- [ ] `bn.json` has the same number of keys as `en.json`

---

---

## Phase 5 — Primitive components

---

### TASK-017: Build the Button primitive

**PLAN**
- Must support all variants and sizes from spec section 5.1
- No platform `<button>` used in screens directly — all go through this
- Loading state shows spinner and disables interaction

**EXECUTE**
Create `src/components/primitives/Button/Button.tsx` and `Button.module.css`:
- Props: `variant`, `size`, `icon`, `iconPosition`, `loading`, `disabled`, `fullWidth`, `onClick`, `children`
- Renders native `<button>` internally (primitives wrap platform elements)
- Loading state: replace children with animated spinner icon, disable pointer events
- CSS Module: one class per variant and size, all colours from CSS vars

**TEST**
- [ ] All 4 variants render with correct colours
- [ ] Loading state: spinner shows, button non-interactive
- [ ] Disabled state: correct opacity, cursor not-allowed
- [ ] Keyboard accessible: Enter and Space trigger onClick
- [ ] Meets 44px minimum height on all sizes
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-018: Build the Input primitive

**PLAN**
- Single Input component handles text, number, and date types
- Label, hint, and error are built in (not separate components)
- Number inputs always use English keyboard (inputMode numeric/decimal)
- Prefix and suffix slots for currency symbols and unit labels

**EXECUTE**
Create `src/components/primitives/Input/Input.tsx` and `Input.module.css`:
- Renders `<input>` internally
- Floating label that lifts on focus or when value present
- Error state: red border, red error message below
- Prefix: left-side content (e.g. "৳")
- Suffix: right-side content (e.g. "km")
- For `type="number"`: set `inputMode` to `numeric` or `decimal`
- Focus ring from CSS var `--focus-shadow`

**TEST**
- [ ] Type "hello" in text input — value updates
- [ ] Type "130" in number input — numeric keyboard on mobile (manual)
- [ ] Error prop shows red border and error text
- [ ] Prefix "৳" appears before input text
- [ ] Suffix "km" appears after input text
- [ ] Tab navigation works correctly through form
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-019: Build Toggle, Badge, Chip, and SegmentedControl primitives

**PLAN**
- Toggle: animated iOS-style switch
- Badge: small coloured pill (for reminder urgency)
- Chip: selectable tag (for fuel type, service category, reminder repeat unit)
- SegmentedControl: tab-style selector (for reminder type, entry mode)
- All from spec section 5.1

**EXECUTE**
1. `src/components/primitives/Toggle/Toggle.tsx`
   - Animated pill, blue when checked
   - Renders `<input type="checkbox">` internally, visually hidden
   - Label text beside it
2. `src/components/primitives/Badge/Badge.tsx`
   - Variants: neutral, accent, success, warning, danger, repeat
   - Small pill shape, correct colours from CSS vars
3. `src/components/primitives/Chip/Chip.tsx`
   - Selectable: selected = blue bg, unselected = surface bg
   - Icon slot
   - Tap to toggle selected
4. `src/components/primitives/SegmentedControl/SegmentedControl.tsx`
   - Generic `<T extends string>` type parameter
   - Renders a row of segments, active one highlighted

**TEST**
- [ ] Toggle: click toggles state, animation smooth
- [ ] Badge: all 6 variants render with correct contrast
- [ ] Chip: click selects, click again deselects
- [ ] SegmentedControl: selecting one option deselects others
- [ ] All keyboard accessible
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-020: Build the Select primitive

**PLAN**
- Wraps native `<select>` internally for accessibility
- Styled to match app design system
- Used in reminder vehicle selector and settings dropdowns

**EXECUTE**
Create `src/components/primitives/Select/Select.tsx`:
- Renders styled native `<select>` (best for accessibility + keyboard)
- Custom chevron-down arrow via CSS background-image
- Label support
- Error state

**TEST**
- [ ] Select renders options correctly
- [ ] Native keyboard navigation works
- [ ] `npx tsc --noEmit` — no errors

---

---

## Phase 6 — Composed and layout components

---

### TASK-021: Build StatCard, LogRow, VehiclePill

**PLAN**
- StatCard: used in 2×2 grids on Home and Stats screens
- LogRow: used in recent activity lists
- VehiclePill: used in vehicle selector strip

**EXECUTE**
1. `src/components/composed/StatCard/StatCard.tsx` — icon, value, label, trend indicator
2. `src/components/composed/LogRow/LogRow.tsx` — type icon, title, subtitle, amount. Type determines icon and colour (fuel=amber, service=teal, expense=red)
3. `src/components/composed/VehiclePill/VehiclePill.tsx` — selectable pill with vehicle icon and name. Separate "Add" variant with dashed border and plus icon

**TEST**
- [ ] StatCard renders all icon colour variants
- [ ] LogRow fuel/service/expense variants all correct colours
- [ ] VehiclePill selected state shows blue bg
- [ ] VehiclePill "Add" variant shows dashed border
- [ ] All components accessible with ARIA labels
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-022: Build HeroCard and DonutChart components

**PLAN**
- HeroCard: the large monthly summary card with serif display number
- DonutChart: Chart.js doughnut chart with inline legend

**EXECUTE**
1. `src/components/composed/HeroCard/HeroCard.tsx`:
   - Display amount in serif font (--font-display) at 38px
   - Delta badge (green, trending down icon)
   - Divider
   - 3-column stats row: Fuel, Service, Other amounts
2. `src/components/charts/DonutChart/DonutChart.tsx`:
   - Wraps Chart.js via react-chartjs-2
   - Receives `data: Array<{label, value, color}>`
   - Size 100×100px canvas, cutout 70%
   - No built-in legend (legend is rendered outside by parent)
   - Proper `role="img"` and `aria-label`

**TEST**
- [ ] HeroCard: amount displayed in serif font
- [ ] HeroCard: delta badge shows correct colour
- [ ] DonutChart renders in browser
- [ ] DonutChart canvas has aria-label
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-023: Build TopBar, BottomNav, Drawer, Screen layout components

**PLAN**
- TopBar: used on every screen
- BottomNav: 3 items only (Stats, Add FAB, Reminders)
- Drawer: slides in from right, has overlay
- Screen: scrollable content wrapper

**EXECUTE**
1. `src/components/layout/TopBar/TopBar.tsx`:
   - Left: optional back button (renders if `onBack` prop provided)
   - Centre: title + optional subtitle
   - Right: optional actions slot + always-present settings icon (if `onSettings` prop provided)
2. `src/components/layout/BottomNav/BottomNav.tsx`:
   - 3 items: Stats (left), Add FAB (centre, elevated circular button), Reminders (right)
   - FAB: 52px circle, blue, plus icon, elevated above nav bar
   - Active state: blue colour for active item
3. `src/components/layout/Drawer/Drawer.tsx`:
   - Right-side slide-in panel, 260px wide
   - Semi-transparent overlay behind it
   - Close on overlay tap
   - CSS transition for slide animation
   - Children slot for drawer content
4. `src/components/layout/Screen/Screen.tsx`:
   - Flex column wrapper, flex:1, overflow-y:auto
   - Padding prop (default 13px 14px)
   - Gap prop (default 11px)
   - No-scrollbar class

**TEST**
- [ ] TopBar: back button only shows when `onBack` provided
- [ ] TopBar: settings icon present
- [ ] BottomNav: FAB is elevated above the bar
- [ ] Drawer: slides in from right on open, slides back on close
- [ ] Drawer: tap overlay closes it
- [ ] Screen: scrolls content correctly
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-024: Build AppShell and set up routing

**PLAN**
- AppShell is the root layout — contains Drawer, theme applier, notification init
- React Router v6 manages all navigation
- All routes defined in App.tsx

**EXECUTE**
1. Create `src/components/layout/AppShell/AppShell.tsx`:
   - Renders the phone-frame wrapper (max-width 390px, centred)
   - Contains `<Drawer>` component wired to uiStore
   - Applies theme via `useTheme` hook (sets `data-theme` on `<html>`)
   - Initialises notifications via `useNotifications` hook
   - Renders `<Outlet />` for child routes
2. Update `src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import all screen components (stubs at first)
const routes = [
  { path: '/', element: <HomeScreen /> },
  { path: '/stats', element: <StatsScreen /> },
  { path: '/log/fuel', element: <LogFuelScreen /> },
  { path: '/log/service', element: <LogServiceScreen /> },
  { path: '/log/expense', element: <LogExpenseScreen /> },
  { path: '/vehicles/add', element: <AddVehicleScreen /> },
  { path: '/vehicles/:id', element: <VehicleDetailScreen /> },
  { path: '/reminders', element: <RemindersScreen /> },
  { path: '/about', element: <AboutScreen /> },
];
```

**TEST**
- [ ] Navigate to `/stats` → StatsScreen stub renders
- [ ] Navigate to `/log/fuel` → LogFuelScreen stub renders
- [ ] Browser back button works
- [ ] Drawer opens and closes from AppShell
- [ ] Theme applies to `<html>` element
- [ ] `npx tsc --noEmit` — no errors

---

---

## Phase 7 — Screen implementations

---

### TASK-025: Implement HomeScreen

**PLAN**
- HomeScreen is the most complex screen — read spec section 6.1 in full before starting
- Uses real data from Dexie hooks
- Monthly totals calculated from current month's logs

**EXECUTE**
1. Create `src/screens/HomeScreen.tsx`
2. Sections in order:
   a. `<TopBar>` — app name, month, settings icon (opens drawer)
   b. Vehicle strip — `useVehicles()` → map to `<VehiclePill>` + Add pill
   c. `<HeroCard>` — monthly total from current month fuel + service + expense logs
   d. `<DonutChart>` card — fuel/service/other breakdown with legend
   e. 2×2 `<StatCard>` grid — avg mileage, total km this month, total litres, due reminders count
   f. Recent activity — last 5 entries from all log types, sorted by date desc, rendered as `<LogRow>`
3. Calculate all values in the component or a `useHomeStats(vehicleId, year, month)` custom hook
4. Wire `<BottomNav>` to navigate between screens

**TEST**
- [ ] Home renders with no vehicles: shows empty state prompting to add vehicle
- [ ] After adding a vehicle: hero card shows 0 costs for current month
- [ ] After adding fuel log: costs update reactively
- [ ] Vehicle strip scrolls horizontally if more than 2 vehicles
- [ ] Tapping a vehicle pill switches active vehicle
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-026: Implement LogFuelScreen

**PLAN**
- Three entry modes must all work and calculate correctly
- Lock fuel price must persist to settings store
- Efficiency pill shows only when odometers are both filled

**EXECUTE**
1. Create `src/screens/LogFuelScreen.tsx`
2. Manage local form state with `useState` (not Zustand — this is transient form state)
3. Entry mode selector: SegmentedControl with 3 options
4. Computed card: live-updating as user types
5. Lock row: reads/writes `settingsStore.lockedFuelPrice`; pre-fill pricePerL from locked value on mount
6. On save: call `addFuelLog()`, update vehicle's odometer if new odo > current, navigate back
7. Validation: volume > 0, totalCost > 0 required. Show inline error if missing.
8. TopBar with back arrow

**TEST**
- [ ] Mode "Volume + price/L": enter 40L and ৳130 → total shows ৳5,200
- [ ] Mode "Volume + total": enter 40L and ৳5200 → price shows ৳130/L in computed row
- [ ] Mode "Total only": enter ৳5200 → shows total, no efficiency pill
- [ ] Efficiency pill: fill odometer fields → shows km/L
- [ ] Lock price: toggle on, reload screen, price pre-filled
- [ ] Save: log appears in DB, navigates back to Home
- [ ] Missing required field: shows validation error, does not save
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-027: Implement LogServiceScreen and LogExpenseScreen

**PLAN**
- Service screen: 20 categories shown as horizontal scrolling chips
- Expense screen: 9 categories shown as chips
- Both follow same pattern as fuel screen

**EXECUTE**
1. Create `src/screens/LogServiceScreen.tsx`:
   - Vehicle row, date, category chips (scrollable), title input, cost input, odometer input, shop name, notes, save button
   - Category chips use Chip primitive, allow single selection
2. Create `src/screens/LogExpenseScreen.tsx`:
   - Same structure, fewer categories (9)
   - No odometer field
3. Both: on save, add to DB, navigate back, show toast (future: for now just navigate)

**TEST**
- [ ] Service: select "Oil change" chip → highlighted
- [ ] Service: enter all fields, save → appears in DB
- [ ] Expense: enter all fields, save → appears in DB
- [ ] Category chips scroll horizontally when they overflow
- [ ] Validation: cost required, shows error if missing
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-028: Implement AddVehicleScreen

**PLAN**
- Simple form, no VIN, no complex validation
- Type selector is a 2×2 card grid (Car/SUV, Motorcycle, Truck, Bus/Other)
- After save: if first vehicle, auto-select it in vehicleStore

**EXECUTE**
1. Create `src/screens/AddVehicleScreen.tsx`
2. Vehicle type cards: `<button>` cards with icon + label + subtitle
3. Fuel type: Chip row
4. On save: `addVehicle()`, if no active vehicle → `setActiveVehicle(newId)`, navigate to Home
5. Validation: nickname required

**TEST**
- [ ] Select "Motorcycle" card → highlighted, deselects Car
- [ ] Fill nickname only → can save (all other fields optional)
- [ ] After saving first vehicle: home shows it in strip, it's selected
- [ ] Empty nickname: shows error, does not save
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-029: Implement StatsScreen

**PLAN**
- Three tabs: Summary, Fuel, Service
- Charts render Chart.js after screen mounts (not during streaming)
- Export button triggers CSV download

**EXECUTE**
1. Create `src/screens/StatsScreen.tsx`
2. Tab bar using local state, switches displayed content
3. Summary tab:
   - 2×2 KPI grid (year-to-date, cost/km, best mileage, avg monthly)
   - `<StackedBarChart>` — 6 months, 3 series
   - `<LineChart>` — last 10 fill-up efficiencies
   - Recent logs list
4. Fuel tab: avg efficiency trend, fill-up table
5. Service tab: service log list by category
6. Export button: calls `useExport` to download CSV

**TEST**
- [ ] Summary tab renders all 4 KPI cards
- [ ] Charts render (canvas visible, not blank)
- [ ] Tab switching shows correct content
- [ ] Export button downloads CSV file
- [ ] With no data: empty states shown for each section
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-030: Implement RemindersScreen

**PLAN**
- Two modes: one-time and repeat, controlled by SegmentedControl
- Days-before-alert field defaults to 3
- Active reminders list shows urgency badges

**EXECUTE**
1. Create `src/screens/RemindersScreen.tsx`
2. Reminder list: `useReminders(activeVehicleId)` → sort by urgency → `<ReminderCard>` per item
3. `<ReminderCard>` component: shows title, vehicle, due date/km, urgency badge, dismiss and edit buttons
4. Add reminder form (inline, below list):
   - Title input
   - Vehicle Select
   - Type SegmentedControl: One-time / Repeat
   - One-time section: date input, km input, days-before input, km-before input
   - Repeat section: repeat unit chips, repeat value input, starting date, days-before, km-before
   - Save button
5. Dismiss: calls `dismissReminder()`, advances repeat reminders

**TEST**
- [ ] Overdue reminder shows red badge "Overdue"
- [ ] Within days-before: shows "X days" amber badge
- [ ] Repeat reminder shows blue "Repeat" badge
- [ ] Switching to Repeat mode: repeat-specific fields appear
- [ ] Save one-time reminder: appears in list
- [ ] Save repeat reminder: appears in list with Repeat badge
- [ ] Dismiss one-time: removed from list
- [ ] Dismiss repeat: nextDueDate advances, reappears with new date
- [ ] Days-before-alert default is 3
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-031: Implement VehicleDetailScreen

**PLAN**
- Accessible from vehicle pill (long press) or from settings
- Shows lifetime stats and full log history
- Delete requires confirmation

**EXECUTE**
1. Create `src/screens/VehicleDetailScreen.tsx`
2. Reads `:id` from URL params
3. Vehicle info card: editable fields inline or edit button opens edit form
4. Lifetime stats: sum all fuel, service, expense logs for the vehicle
5. Log history tabs (All / Fuel / Service / Expense) using local state
6. Delete button: confirmation prompt → `deleteVehicle(id)` → navigate to Home

**TEST**
- [ ] Correct vehicle loaded from URL param
- [ ] Lifetime stats sum correctly
- [ ] Tab switching shows filtered logs
- [ ] Delete confirmation required
- [ ] After delete: navigated back to Home, vehicle gone from strip
- [ ] `npx tsc --noEmit` — no errors

---

---

## Phase 8 — Drawer settings panel

---

### TASK-032: Implement the settings drawer content

**PLAN**
- Drawer slides in from right on settings icon tap
- Contains dark mode toggle, language selector, units, currency, export, storage info
- Every change is instant — no save button

**EXECUTE**
1. Create `src/components/domain/SettingsDrawer/SettingsDrawer.tsx`
2. Sections:
   a. App name header with current vehicle
   b. Dark mode: `<DrawerRow>` with `<Toggle>` trailing
   c. Language: `<DrawerRow>` expandable → shows en/bn options with checkmark
   d. Distance unit: expandable → km / mi
   e. Volume unit: expandable → L / gal
   f. Efficiency unit: expandable → km/L / L/100km / MPG
   g. Currency: expandable → BDT / USD / EUR / INR / GBP / SAR
   h. Export data: `<DrawerRow>` with chevron → triggers `useExport`
   i. Storage: shows "All data on device" info row
3. Each setting change: calls `settingsStore.update()`
4. Language change: calls `i18n.changeLanguage()`

**TEST**
- [ ] Dark mode toggle: app switches immediately
- [ ] Language to Bangla: all labels on screen switch
- [ ] Language back to English: reverts
- [ ] Currency to USD: all amounts in app show $
- [ ] Efficiency to MPG: stats screen shows MPG
- [ ] Selecting km/L in efficiency: fuel log efficiency pill shows km/L
- [ ] Export: triggers download
- [ ] Settings persist after drawer close and reopen
- [ ] `npx tsc --noEmit` — no errors

---

---

## Phase 9 — PWA setup

---

### TASK-033: Configure PWA manifest and icons

**PLAN**
- Generate all required icon sizes
- Configure manifest.json for installability
- Test iOS Add to Home Screen

**EXECUTE**
1. Create `public/manifest.json`:
```json
{
  "name": "Bahon | বাহন",
  "short_name": "Bahon",
  "description": "Your vehicles, tracked.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#2a78d6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```
2. Create an SVG app icon (stylised B in blue circle) and generate PNG sizes: 72, 96, 128, 144, 152, 192, 384, 512
3. Add `<meta name="apple-mobile-web-app-capable" content="yes">` to index.html
4. Add `<meta name="apple-mobile-web-app-status-bar-style" content="default">` to index.html
5. Add `<link rel="apple-touch-icon" href="/icons/icon-192.png">` to index.html

**TEST**
- [ ] Lighthouse: PWA category passes "Installable" checks
- [ ] Chrome Android: install prompt appears
- [ ] Safari iOS: "Add to Home Screen" works, icon appears
- [ ] Installed app: opens in standalone mode (no browser chrome)
- [ ] `manifest.json` valid: check via https://manifest-validator.appspot.com/

---

### TASK-034: Configure service worker with Workbox

**PLAN**
- Use vite-plugin-pwa for service worker generation
- Cache-first for all app assets
- App must work 100% offline after first load

**EXECUTE**
1. Update `vite.config.ts` to add VitePWA plugin:
```typescript
import { VitePWA } from 'vite-plugin-pwa';

plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'gstatic-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
      ],
    },
    manifest: false, // use public/manifest.json
  }),
]
```
2. Register service worker in `src/main.tsx` via `workbox-window`
3. Add update notification: when new SW is available, show "Update available" banner with reload button

**TEST**
- [ ] DevTools → Application → Service Workers: status "Activated"
- [ ] Go offline (DevTools → Network → Offline), reload → app still works
- [ ] All screens usable offline
- [ ] IndexedDB data accessible offline
- [ ] Google Fonts load from cache when offline (after first online load)

---

---

## Phase 10 — CI/CD and deployment

---

### TASK-035: Set up GitHub Actions for Cloudflare Pages

**PLAN**
- Every push to main triggers build and deploy
- PR previews automatically deployed
- TypeScript errors fail the build

**EXECUTE**
1. Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test -- --run
      - run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: bahon
          directory: dist
```
2. Create `public/_headers` for Cloudflare Pages security headers:
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
```
3. Create `public/_redirects`:
```
/*  /index.html  200
```

**TEST**
- [ ] Push to main → GitHub Actions passes all steps
- [ ] Build artifact in `dist/` contains `index.html` and service worker
- [ ] Deployed URL accessible
- [ ] Security headers present in response (check via curl)
- [ ] SPA routing works: navigate to `/reminders` directly → correct screen

---

---

## Phase 11 — Testing

---

### TASK-036: Write unit tests for all utilities

**PLAN**
- Test every function in calculations.ts and formatters.ts
- Edge cases: zero values, very large numbers, unit conversions
- Use Vitest

**EXECUTE**
1. Configure Vitest in `vite.config.ts`:
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./tests/setup.ts'],
}
```
2. Create `tests/setup.ts` — configure Dexie fake IndexedDB for tests
3. Create `tests/unit/calculations.test.ts` — minimum 20 test cases
4. Create `tests/unit/formatters.test.ts` — minimum 15 test cases
5. Create `tests/unit/reminders.test.ts` — test `advanceRepeatReminder` for all repeat types

**TEST**
- [ ] `npm test` runs all tests
- [ ] All calculation tests pass
- [ ] All formatter tests pass
- [ ] All reminder advancement tests pass
- [ ] Coverage: > 80% for utils/

---

### TASK-037: Write integration tests for database hooks

**PLAN**
- Test real Dexie operations against fake IndexedDB
- Test cascading deletes, reactive queries, and reminder advancement

**EXECUTE**
1. Create `tests/integration/vehicles.test.ts`:
   - Add vehicle, verify in DB
   - Delete vehicle, verify associated logs deleted
2. Create `tests/integration/fuelLogs.test.ts`:
   - Add 3 logs for different months, verify monthly query returns correct 1
   - Verify `getLastOdometer` returns max value
3. Create `tests/integration/reminders.test.ts`:
   - Create monthly repeat reminder
   - Dismiss it, verify next due is +1 month
   - Create km-based repeat reminder
   - Dismiss at 42,000 km with 5,000 km interval → next due 47,000

**TEST**
- [ ] All integration tests pass
- [ ] `npm test` exits 0

---

### TASK-038: Write E2E tests for critical user flows

**PLAN**
- Use Playwright for full browser E2E tests
- Test the 3 most critical paths: add vehicle, log fuel, set reminder

**EXECUTE**
1. Configure Playwright in `playwright.config.ts`
2. Create `tests/e2e/addVehicle.spec.ts`:
   - Open app → click Add in nav → fill form → save → verify vehicle in strip
3. Create `tests/e2e/logFuel.spec.ts`:
   - Open app with vehicle → tap Add FAB → fill fuel form (volume + price/L mode) → save → verify on home screen
4. Create `tests/e2e/reminder.spec.ts`:
   - Open reminders → fill add form (one-time) → save → verify in list
   - Dismiss reminder → verify removed

**TEST**
- [ ] `npx playwright test` — all E2E tests pass
- [ ] Tests run in headless Chromium

---

---

## Phase 12 — Polish and accessibility

---

### TASK-039: Accessibility audit and fixes

**PLAN**
- Run automated audit + manual keyboard and screen reader test
- Fix every issue before shipping

**EXECUTE**
1. Install axe-core: `npm install -D @axe-core/playwright`
2. Add axe scan to each E2E test
3. Manual tests:
   - Navigate entire app with Tab key only
   - Test with VoiceOver on iOS Safari (manual)
   - Verify all interactive elements have visible focus rings
4. Fix all issues found
5. Verify colour contrast of every text/background combination

**TEST**
- [ ] `axe` reports 0 violations on Home, Stats, LogFuel, Reminders screens
- [ ] Tab navigation: no focus traps, logical order
- [ ] All charts have `role="img"` and descriptive `aria-label`
- [ ] All icon-only buttons have `aria-label`
- [ ] Lighthouse Accessibility score ≥ 95

---

### TASK-040: Performance audit and optimisation

**PLAN**
- Measure real bundle size and load time
- Code-split large screens
- Ensure Lighthouse Performance > 90

**EXECUTE**
1. Run `npm run build && npx vite preview`
2. Run Lighthouse on preview build
3. Check bundle: `npx vite-bundle-visualizer`
4. If Chart.js > 50KB of initial bundle: lazy-load StatsScreen
5. If total initial JS > 200KB gzipped: identify and lazy-load heaviest imports
6. Add `React.lazy()` and `<Suspense>` for all screens
7. Verify fonts use `display=swap`

**TEST**
- [ ] Lighthouse Performance ≥ 90
- [ ] Lighthouse PWA = 100
- [ ] Initial JS bundle < 200KB gzipped
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test -- --run` exits 0

---

---

## Phase 13 — Final checklist before launch

---

### TASK-041: Final QA pass

**PLAN**
- Complete walkthrough of every feature against spec
- Test on real iOS device (Safari) and real Android device (Chrome)
- Verify offline, install, and notifications

**EXECUTE**
Work through every item in this checklist:

**Vehicles**
- [ ] Add car, add motorcycle — both appear in strip
- [ ] Switch between vehicles — stats update
- [ ] Delete vehicle — all logs deleted, strip updates

**Fuel logging**
- [ ] All 3 entry modes work and calculate correctly
- [ ] Efficiency calculates from odometer fields
- [ ] Lock price persists
- [ ] Edit and delete a fuel log

**Service logging**
- [ ] All 20 categories selectable
- [ ] Log saves with correct data

**Expense logging**
- [ ] All 9 categories selectable
- [ ] Log saves with correct data

**Reminders**
- [ ] One-time reminder with date: created, appears, dismisses
- [ ] One-time reminder with km: created, appears, dismisses
- [ ] Repeat monthly: created, dismiss, next due = +1 month
- [ ] Repeat by km: created, dismiss, next due = +5000 km
- [ ] Days-before alert configurable, default 3
- [ ] Urgency badges correct colours

**Stats**
- [ ] Monthly bar chart shows 6 months
- [ ] Mileage trend line shows 10 fill-ups
- [ ] All 3 tabs work
- [ ] Export downloads CSV

**Settings drawer**
- [ ] Dark mode: toggles, persists
- [ ] Language en/bn: toggles instantly, persists
- [ ] Currency: all 6 options, amounts update everywhere
- [ ] Efficiency unit: all 3 options, updates everywhere
- [ ] Distance unit: km/mi, updates everywhere

**PWA**
- [ ] Install on Android: works
- [ ] Install on iOS: works
- [ ] Fully offline after install
- [ ] Push notifications: permission request, notification fires

**TEST**
- [ ] All checklist items above pass
- [ ] Zero console errors in production build
- [ ] Zero TypeScript errors
- [ ] All automated tests pass

---

### TASK-041b: Implement AboutScreen

**PLAN**
- Simple static screen; no DB queries
- Reads app version from constants.ts
- Links to Google Form for feedback
- Accessible from the settings drawer

**EXECUTE**
1. Create `src/screens/AboutScreen.tsx`:
   - `<TopBar>` with back arrow
   - App name "Bahon" in display font + tagline "Your vehicles, tracked."
   - 2–3 sentence description: what the app is, why it exists, privacy stance
   - Built by section: "Jafran · jafraaan@gmail.com" (tappable email link)
   - Feedback button: links to `FEEDBACK_FORM_URL` from constants.ts (open in new tab); if URL is empty, show "Coming soon"
   - App version: "Version {APP_VERSION}" from constants.ts
   - Privacy note: "All data is stored on your device. Nothing is sent to any server."
2. Add "About" row to `SettingsDrawer` → navigates to `/about`
3. All strings must have i18n keys in `en.json` and `bn.json`

**TEST**
- [ ] `/about` route renders without errors
- [ ] Back button returns to previous screen
- [ ] Email link is tappable
- [ ] Feedback button opens form URL (or shows "Coming soon" if URL is empty)
- [ ] App version matches `constants.ts`
- [ ] Privacy note visible
- [ ] Switch to Bangla → all labels translate
- [ ] `npx tsc --noEmit` — no errors

---

### TASK-042: Write README.md

**PLAN**
- Document how to run, build, and deploy
- Document the component library for future contributors

**EXECUTE**
Create `README.md` with:
1. Project overview and motivation
2. Tech stack table
3. Getting started (clone, npm install, npm run dev)
4. Available scripts (dev, build, test, lint, preview)
5. Project structure overview
6. Component usage examples for each primitive
7. Database schema summary
8. i18n — how to add a new language
9. Deployment to Cloudflare Pages (step by step)
10. Contributing guidelines

**TEST**
- [ ] README renders correctly on GitHub
- [ ] All code examples in README are correct and copy-pasteable
- [ ] A new developer could set up the project following README alone

---

## Done

When TASK-042 passes all tests, Bahon v1.0.0 is ready for production deployment.

**Total tasks:** 43 (TASK-001 → TASK-042, plus TASK-041b)  
**Estimated hours (solo):** 80–120 hours  
**With Claude Code loops:** 20–40 hours  

---

## Appendix: Task dependency graph

```
TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005
                                               │
                     TASK-006 ─────────────────┘
                        │
                     TASK-007 → TASK-008 → TASK-009 → TASK-010
                        │
                     TASK-011 → TASK-012
                        │
                     TASK-013 → TASK-014 → TASK-015
                        │
                     TASK-016
                        │
              ┌─────────┴──────────────────────────┐
           TASK-017   TASK-018   TASK-019   TASK-020
              └─────────┬──────────────────────────┘
                     TASK-021 → TASK-022 → TASK-023 → TASK-024
                                               │
              ┌────────────────────────────────┘
           TASK-025 → TASK-026 → TASK-027 → TASK-028
              │
           TASK-029 → TASK-030 → TASK-031 → TASK-032
              │
           TASK-033 → TASK-034 → TASK-035
              │
           TASK-036 → TASK-037 → TASK-038
              │
           TASK-039 → TASK-040 → TASK-041 → TASK-041b → TASK-042
```