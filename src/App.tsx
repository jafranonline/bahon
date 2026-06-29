import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'

const HomeScreen = lazy(() => import('./screens/HomeScreen').then(m => ({ default: m.HomeScreen })))
const StatsScreen = lazy(() => import('./screens/StatsScreen').then(m => ({ default: m.StatsScreen })))
const LogFuelScreen = lazy(() => import('./screens/LogFuelScreen').then(m => ({ default: m.LogFuelScreen })))
const LogServiceScreen = lazy(() => import('./screens/LogServiceScreen').then(m => ({ default: m.LogServiceScreen })))
const LogExpenseScreen = lazy(() => import('./screens/LogExpenseScreen').then(m => ({ default: m.LogExpenseScreen })))
const AddVehicleScreen = lazy(() => import('./screens/AddVehicleScreen').then(m => ({ default: m.AddVehicleScreen })))
const VehicleDetailScreen = lazy(() => import('./screens/VehicleDetailScreen').then(m => ({ default: m.VehicleDetailScreen })))
const RemindersScreen = lazy(() => import('./screens/RemindersScreen').then(m => ({ default: m.RemindersScreen })))
const AboutScreen = lazy(() => import('./screens/AboutScreen').then(m => ({ default: m.AboutScreen })))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/log/fuel" element={<LogFuelScreen />} />
            <Route path="/log/service" element={<LogServiceScreen />} />
            <Route path="/log/expense" element={<LogExpenseScreen />} />
            <Route path="/vehicles/add" element={<AddVehicleScreen />} />
            <Route path="/vehicles/:id" element={<VehicleDetailScreen />} />
            <Route path="/reminders" element={<RemindersScreen />} />
            <Route path="/about" element={<AboutScreen />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
