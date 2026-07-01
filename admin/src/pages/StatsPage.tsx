import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../api'

export function StatsPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<{ users: number; pro: number; activeSubs: number } | null>(null)

  useEffect(() => {
    adminApi.stats().then(setStats).catch(() => navigate('/login'))
  }, [navigate])

  return (
    <>
      <h1>Overview</h1>
      <div className="card">
        <div className="stats">
          <div className="stat">
            <div className="n">{stats?.users ?? '—'}</div>
            <div className="muted">Total users</div>
          </div>
          <div className="stat">
            <div className="n">{stats?.pro ?? '—'}</div>
            <div className="muted">Active Pro</div>
          </div>
          <div className="stat">
            <div className="n">{stats?.activeSubs ?? '—'}</div>
            <div className="muted">Active subs</div>
          </div>
        </div>
      </div>
    </>
  )
}
