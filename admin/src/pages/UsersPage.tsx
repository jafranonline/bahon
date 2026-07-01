import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi, type AdminUser } from '../api'

export function UsersPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    adminApi
      .users(query, page)
      .then((r) => {
        if (!active) return
        setUsers(r.users)
        setTotal(r.total)
        setPageSize(r.pageSize)
      })
      .catch(() => navigate('/login'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [query, page, navigate])

  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <h1>Users ({total})</h1>
      <input
        placeholder="Search by email…"
        value={query}
        onChange={(e) => {
          setPage(1)
          setQuery(e.target.value)
        }}
        style={{ marginBottom: 16 }}
      />
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Last sync</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link to={`/users/${u.id}`}>{u.email}</Link>
                </td>
                <td>
                  <span className={`badge ${u.tier === 'pro' ? 'pro' : 'free'}`}>
                    {u.tier ?? 'free'}
                  </span>
                </td>
                <td className="muted">{u.status ?? '—'}</td>
                <td className="muted">
                  {u.data_updated_at ? new Date(u.data_updated_at).toLocaleString() : 'never'}
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
        <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <span className="muted">
          Page {page} / {pages}
        </span>
        <button className="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </>
  )
}
