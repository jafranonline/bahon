import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { HomeScreen } from './screens/HomeScreen'
import { StatsScreen } from './screens/StatsScreen'
import { LogFuelScreen } from './screens/LogFuelScreen'
import { LogServiceScreen } from './screens/LogServiceScreen'
import { LogExpenseScreen } from './screens/LogExpenseScreen'
import { AddVehicleScreen } from './screens/AddVehicleScreen'
import { VehicleDetailScreen } from './screens/VehicleDetailScreen'
import { RemindersScreen } from './screens/RemindersScreen'
import { AboutScreen } from './screens/AboutScreen'

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
