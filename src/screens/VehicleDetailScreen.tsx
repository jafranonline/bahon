import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Button } from '@components/primitives/Button'
import { useVehicle, deleteVehicle } from '@db/queries/useVehicles'
import { useFuelLogs, deleteFuelLog } from '@db/queries/useFuelLogs'
import { useServiceLogs, deleteServiceLog } from '@db/queries/useServiceLogs'
import { useExpenses, deleteExpense } from '@db/queries/useExpenses'
import { useVehicleStore } from '@store/vehicleStore'
import { useVehicles } from '@db/queries/useVehicles'
import { useCurrency } from '@hooks/useCurrency'
import type { FuelLog, ServiceLog, Expense } from '@/types'
import styles from './VehicleDetailScreen.module.css'

type LogTab = 'all' | 'fuel' | 'service' | 'expense'

type LogEntry =
  | { kind: 'fuel'; log: FuelLog; date: string }
  | { kind: 'service'; log: ServiceLog; date: string }
  | { kind: 'expense'; log: Expense; date: string }

const VEHICLE_ICONS: Record<string, string> = {
  car: '🚗', motorcycle: '🏍️', truck: '🚛', bus: '🚌', other: '🚘',
}

export function VehicleDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { format } = useCurrency()

  const vehicle = useVehicle(id ?? '')
  const fuelLogs = useFuelLogs(id ?? '')
  const serviceLogs = useServiceLogs(id ?? '')
  const expenses = useExpenses(id ?? '')

  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const setActiveVehicle = useVehicleStore((s) => s.setActiveVehicle)
  const vehicles = useVehicles() ?? []

  const [tab, setTab] = useState<LogTab>('all')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<{ kind: LogEntry['kind']; id: string } | null>(null)

  const lifetimeFuel = useMemo(() => fuelLogs.reduce((s, l) => s + l.totalCost, 0), [fuelLogs])
  const lifetimeService = useMemo(() => serviceLogs.reduce((s, l) => s + l.cost, 0), [serviceLogs])
  const lifetimeExpense = useMemo(() => expenses.reduce((s, l) => s + l.amount, 0), [expenses])
  const lifetimeTotal = lifetimeFuel + lifetimeService + lifetimeExpense

  const totalFuelLitres = useMemo(() => fuelLogs.reduce((s, l) => s + l.volumeLitres, 0), [fuelLogs])
  const avgEfficiency = useMemo(() => {
    const valid = fuelLogs.filter(l => l.efficiencyKmPerL != null)
    if (!valid.length) return null
    return valid.reduce((s, l) => s + (l.efficiencyKmPerL ?? 0), 0) / valid.length
  }, [fuelLogs])

  const allLogs = useMemo((): LogEntry[] => {
    const entries: LogEntry[] = [
      ...fuelLogs.map(log => ({ kind: 'fuel' as const, log, date: log.date })),
      ...serviceLogs.map(log => ({ kind: 'service' as const, log, date: log.date })),
      ...expenses.map(log => ({ kind: 'expense' as const, log, date: log.date })),
    ]
    entries.sort((a, b) => b.date.localeCompare(a.date))
    return entries
  }, [fuelLogs, serviceLogs, expenses])

  const filteredLogs = useMemo(() => {
    if (tab === 'all') return allLogs
    return allLogs.filter(e => e.kind === tab)
  }, [allLogs, tab])

  async function handleDeleteLog() {
    if (!confirmDeleteLog) return
    const { kind, id: logId } = confirmDeleteLog
    if (kind === 'fuel') await deleteFuelLog(logId)
    else if (kind === 'service') await deleteServiceLog(logId)
    else await deleteExpense(logId)
    setConfirmDeleteLog(null)
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await deleteVehicle(id)
      if (activeVehicleId === id) {
        const remaining = vehicles.filter(v => v.id !== id)
        setActiveVehicle(remaining[0]?.id ?? null)
      }
      navigate('/')
    } finally {
      setDeleting(false)
    }
  }

  if (!vehicle) {
    return (
      <div className={styles.root}>
        <TopBar title="Vehicle" onBack={() => navigate(-1)} />
        <Screen><p className={styles.empty}>Vehicle not found.</p></Screen>
      </div>
    )
  }

  const icon = VEHICLE_ICONS[vehicle.type] ?? '🚘'

  return (
    <div className={styles.root}>
      <TopBar
        title={vehicle.name}
        onBack={() => navigate(-1)}
        actions={
          <button
            className={styles.editBtn}
            onClick={() => navigate('/vehicles/add', { state: { editVehicle: vehicle } })}
            aria-label="Edit vehicle"
          >
            Edit
          </button>
        }
      />
      <Screen>
        {/* Vehicle info card */}
        <div className={styles.infoCard}>
          <span className={styles.vehicleIcon} aria-hidden="true">{icon}</span>
          <div className={styles.infoGrid}>
            <span className={styles.infoLabel}>Type</span>
            <span className={styles.infoValue}>{vehicle.type}</span>
            {vehicle.brand && (<><span className={styles.infoLabel}>Brand</span><span className={styles.infoValue}>{vehicle.brand}</span></>)}
            {vehicle.model && (<><span className={styles.infoLabel}>Model</span><span className={styles.infoValue}>{vehicle.model}</span></>)}
            {vehicle.year > 0 && (<><span className={styles.infoLabel}>Year</span><span className={styles.infoValue}>{vehicle.year}</span></>)}
            {vehicle.plateNumber && (<><span className={styles.infoLabel}>Plate</span><span className={styles.infoValue}>{vehicle.plateNumber}</span></>)}
            <span className={styles.infoLabel}>Fuel</span>
            <span className={styles.infoValue}>{vehicle.fuelType}</span>
            <span className={styles.infoLabel}>Odometer</span>
            <span className={styles.infoValue}>{vehicle.odometer.toLocaleString()} km</span>
          </div>
        </div>

        {/* Lifetime stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Lifetime spend</span>
            <span className={styles.statValue}>{format(lifetimeTotal)}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Fuel cost</span>
            <span className={styles.statValue}>{format(lifetimeFuel)}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Service cost</span>
            <span className={styles.statValue}>{format(lifetimeService)}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total fuelled</span>
            <span className={styles.statValue}>{totalFuelLitres.toFixed(1)} L</span>
          </div>
          {avgEfficiency != null && (
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Avg mileage</span>
              <span className={styles.statValue}>{avgEfficiency.toFixed(1)} km/L</span>
            </div>
          )}
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Fill-ups</span>
            <span className={styles.statValue}>{fuelLogs.length}</span>
          </div>
        </div>

        {/* Documents (scoped to this vehicle) */}
        <button
          type="button"
          className={styles.docsBtn}
          onClick={() => { setActiveVehicle(vehicle.id); navigate('/documents') }}
        >
          <span className={styles.docsBtnIcon} aria-hidden="true">📄</span>
          <span className={styles.docsBtnLabel}>Documents</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Log history tabs */}
        <div className={styles.tabBar}>
          {(['all', 'fuel', 'service', 'expense'] as LogTab[]).map(t => (
            <button
              key={t}
              type="button"
              className={[styles.tabBtn, tab === t ? styles.tabBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => setTab(t)}
              aria-selected={tab === t}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {confirmDeleteLog && (
          <div className={styles.confirmCard}>
            <p className={styles.confirmText}>Delete this log entry? This cannot be undone.</p>
            <div className={styles.confirmActions}>
              <Button onClick={() => setConfirmDeleteLog(null)} fullWidth>Cancel</Button>
              <Button onClick={handleDeleteLog} fullWidth>Yes, delete</Button>
            </div>
          </div>
        )}

        {filteredLogs.length === 0 ? (
          <p className={styles.empty}>No {tab === 'all' ? '' : tab + ' '}logs yet.</p>
        ) : (
          <div className={styles.logList}>
            {filteredLogs.map((entry, i) => {
              if (entry.kind === 'fuel') {
                const l = entry.log as FuelLog
                return (
                  <div key={l.id ?? i} className={styles.logItem}>
                    <span className={styles.logIcon}>⛽</span>
                    <div className={styles.logMeta}>
                      <span className={styles.logTitle}>Fuel — {l.volumeLitres.toFixed(1)} L</span>
                      <span className={styles.logDate}>{l.date}</span>
                    </div>
                    <span className={styles.logAmount}>{format(l.totalCost)}</span>
                    <div className={styles.logActions}>
                      <button
                        type="button"
                        className={styles.logEditBtn}
                        onClick={() => navigate('/log/fuel', { state: { editLog: l } })}
                        aria-label="Edit fuel log"
                      >✏️</button>
                      <button
                        type="button"
                        className={styles.logDeleteBtn}
                        onClick={() => l.id && setConfirmDeleteLog({ kind: 'fuel', id: l.id })}
                        aria-label="Delete fuel log"
                      >🗑️</button>
                    </div>
                  </div>
                )
              }
              if (entry.kind === 'service') {
                const l = entry.log as ServiceLog
                return (
                  <div key={l.id ?? i} className={styles.logItem}>
                    <span className={styles.logIcon}>🔧</span>
                    <div className={styles.logMeta}>
                      <span className={styles.logTitle}>{l.title || l.category.replace(/_/g, ' ')}</span>
                      <span className={styles.logDate}>{l.date}</span>
                    </div>
                    <span className={styles.logAmount}>{format(l.cost)}</span>
                    <div className={styles.logActions}>
                      <button
                        type="button"
                        className={styles.logEditBtn}
                        onClick={() => navigate('/log/service', { state: { editLog: l } })}
                        aria-label="Edit service log"
                      >✏️</button>
                      <button
                        type="button"
                        className={styles.logDeleteBtn}
                        onClick={() => l.id && setConfirmDeleteLog({ kind: 'service', id: l.id })}
                        aria-label="Delete service log"
                      >🗑️</button>
                    </div>
                  </div>
                )
              }
              const l = entry.log as Expense
              return (
                <div key={l.id ?? i} className={styles.logItem}>
                  <span className={styles.logIcon}>💸</span>
                  <div className={styles.logMeta}>
                    <span className={styles.logTitle}>{l.title || l.category.replace(/_/g, ' ')}</span>
                    <span className={styles.logDate}>{l.date}</span>
                  </div>
                  <span className={styles.logAmount}>{format(l.amount)}</span>
                  <div className={styles.logActions}>
                    <button
                      type="button"
                      className={styles.logEditBtn}
                      onClick={() => navigate('/log/expense', { state: { editLog: l } })}
                      aria-label="Edit expense log"
                    >✏️</button>
                    <button
                      type="button"
                      className={styles.logDeleteBtn}
                      onClick={() => l.id && setConfirmDeleteLog({ kind: 'expense', id: l.id })}
                      aria-label="Delete expense log"
                    >🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Delete section */}
        {confirmDelete ? (
          <div className={styles.confirmCard}>
            <p className={styles.confirmText}>
              Delete <strong>{vehicle.name}</strong> and all its logs? This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <Button onClick={() => setConfirmDelete(false)} fullWidth>
                Cancel
              </Button>
              <Button onClick={handleDelete} loading={deleting} fullWidth>
                Yes, delete
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete vehicle ${vehicle.name}`}
          >
            Delete vehicle
          </button>
        )}
      </Screen>
    </div>
  )
}
