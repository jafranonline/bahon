import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useSettingsStore } from '@store/settingsStore'
import { useAuthStore } from '@store/authStore'

const HomeScreen = lazy(() => import('./screens/HomeScreen').then(m => ({ default: m.HomeScreen })))
const StatsScreen = lazy(() => import('./screens/StatsScreen').then(m => ({ default: m.StatsScreen })))
const LogFuelScreen = lazy(() => import('./screens/LogFuelScreen').then(m => ({ default: m.LogFuelScreen })))
const LogServiceScreen = lazy(() => import('./screens/LogServiceScreen').then(m => ({ default: m.LogServiceScreen })))
const LogExpenseScreen = lazy(() => import('./screens/LogExpenseScreen').then(m => ({ default: m.LogExpenseScreen })))
const AddVehicleScreen = lazy(() => import('./screens/AddVehicleScreen').then(m => ({ default: m.AddVehicleScreen })))
const VehicleDetailScreen = lazy(() => import('./screens/VehicleDetailScreen').then(m => ({ default: m.VehicleDetailScreen })))
const RemindersScreen = lazy(() => import('./screens/RemindersScreen').then(m => ({ default: m.RemindersScreen })))
const AddReminderScreen = lazy(() => import('./screens/AddReminderScreen').then(m => ({ default: m.AddReminderScreen })))
const AboutScreen = lazy(() => import('./screens/AboutScreen').then(m => ({ default: m.AboutScreen })))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })))
const CompareScreen = lazy(() => import('./screens/CompareScreen').then(m => ({ default: m.CompareScreen })))
const DocumentsScreen = lazy(() => import('./screens/DocumentsScreen').then(m => ({ default: m.DocumentsScreen })))
const AddDocumentScreen = lazy(() => import('./screens/AddDocumentScreen').then(m => ({ default: m.AddDocumentScreen })))
const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen').then(m => ({ default: m.OnboardingScreen })))
const AuthScreen = lazy(() => import('./screens/AuthScreen').then(m => ({ default: m.AuthScreen })))
const AccountScreen = lazy(() => import('./screens/AccountScreen').then(m => ({ default: m.AccountScreen })))
const VerifyEmailScreen = lazy(() => import('./screens/VerifyEmailScreen').then(m => ({ default: m.VerifyEmailScreen })))
const ResetPasswordScreen = lazy(() => import('./screens/ResetPasswordScreen').then(m => ({ default: m.ResetPasswordScreen })))

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete)
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  // Session bootstrap: if a refresh token was persisted, hydrate the session.
  useEffect(() => {
    void useAuthStore.getState().loadMe()
  }, [])

  useEffect(() => {
    const splash = document.getElementById('splash')
    if (!splash) return
    splash.classList.add('hidden')
    splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    const fallback = setTimeout(() => splash.remove(), 600)
    return () => clearTimeout(fallback)
  }, [])

  return (
    <BrowserRouter>
      <Suspense>
        <Routes>
          <Route path="/onboarding" element={<OnboardingScreen />} />
          {/* Email link targets — reachable without onboarding (e.g. fresh device). */}
          <Route path="/verify" element={<VerifyEmailScreen />} />
          <Route path="/reset" element={<ResetPasswordScreen />} />
          <Route element={<RequireOnboarding><AppShell /></RequireOnboarding>}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/log/fuel" element={<LogFuelScreen />} />
            <Route path="/log/service" element={<LogServiceScreen />} />
            <Route path="/log/expense" element={<LogExpenseScreen />} />
            <Route path="/vehicles/add" element={<AddVehicleScreen />} />
            <Route path="/vehicles/:id" element={<VehicleDetailScreen />} />
            <Route path="/reminders" element={<RemindersScreen />} />
            <Route path="/reminders/add" element={<AddReminderScreen />} />
            <Route path="/about" element={<AboutScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/compare" element={<CompareScreen />} />
            <Route path="/documents" element={<DocumentsScreen />} />
            <Route path="/documents/add" element={<AddDocumentScreen />} />
            <Route path="/auth" element={<AuthScreen />} />
            <Route path="/account" element={<AccountScreen />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
