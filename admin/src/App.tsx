import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { auth } from './api'
import { LoginPage } from './pages/LoginPage'
import { UsersPage } from './pages/UsersPage'
import { UserDetailPage } from './pages/UserDetailPage'
import { StatsPage } from './pages/StatsPage'

function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (!auth.get()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Nav() {
  const navigate = useNavigate()
  return (
    <nav className="nav">
      <b>Bahon Admin</b>
      <Link to="/">Users</Link>
      <Link to="/stats">Stats</Link>
      <span className="spacer" />
      <button
        className="secondary"
        onClick={() => {
          auth.clear()
          navigate('/login')
        }}
      >
        Log out
      </button>
    </nav>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="wrap">{children}</div>
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAdmin>
              <Shell>
                <UsersPage />
              </Shell>
            </RequireAdmin>
          }
        />
        <Route
          path="/users/:id"
          element={
            <RequireAdmin>
              <Shell>
                <UserDetailPage />
              </Shell>
            </RequireAdmin>
          }
        />
        <Route
          path="/stats"
          element={
            <RequireAdmin>
              <Shell>
                <StatsPage />
              </Shell>
            </RequireAdmin>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
