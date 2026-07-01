import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { adminApi, type AdminUser, type Subscription } from '../api'

export function UserDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [tier, setTier] = useState('free')
  const [status, setStatus] = useState('active')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    adminApi
      .user(id)
      .then(({ user, subscription }) => {
        setUser(user)
        applySub(subscription)
      })
      .catch(() => navigate('/login'))
  }
  const applySub = (s: Subscription | null) => {
    setTier(s?.tier ?? 'free')
    setStatus(s?.status ?? 'active')
    setExpiresAt(s?.expires_at ? s.expires_at.slice(0, 10) : '')
    setNotes(s?.notes ?? '')
  }

  useEffect(load, [id, navigate])

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const { subscription } = await adminApi.setSubscription(id, {
        tier,
        status,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        notes: notes || null,
      })
      applySub(subscription)
      setMsg({ ok: true, text: 'Saved.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to save.' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm('Delete this user and all their data? This cannot be undone.')) return
    try {
      await adminApi.deleteUser(id)
      navigate('/')
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Delete failed.' })
    }
  }

  if (!user) return <p className="muted">Loading…</p>

  return (
    <>
      <p>
        <Link to="/">← Users</Link>
      </p>
      <h1>{user.email}</h1>
      <p className="muted">
        Joined {new Date(user.created_at).toLocaleDateString()} · data v{user.data_version} · last
        sync {user.data_updated_at ? new Date(user.data_updated_at).toLocaleString() : 'never'}
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Subscription</h2>
        <label>Tier</label>
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="free">free</option>
          <option value="pro">pro</option>
        </select>
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">active</option>
          <option value="expired">expired</option>
          <option value="cancelled">cancelled</option>
        </select>
        <label>Expires (blank = no expiry)</label>
        <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        <label>Notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. paid via bKash" />
        {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
        <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
          <button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button className="danger" onClick={remove}>
            Delete user
          </button>
        </div>
      </div>
    </>
  )
}
