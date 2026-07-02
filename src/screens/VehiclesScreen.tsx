import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { BottomNav } from '@components/layout/BottomNav'
import { useVehicles } from '@db/queries/useVehicles'
import { useVehicleStore } from '@store/vehicleStore'
import { useUIStore } from '@store/uiStore'
import { useReminderCount } from '@hooks/useReminderCount'
import { useTranslation } from '@hooks/useTranslation'
import styles from './VehiclesScreen.module.css'

const VEHICLE_ICONS: Record<string, string> = {
  car: '🚗', motorcycle: '🏍️', truck: '🚛', bus: '🚌', cng: '🛺', bicycle: '🚲', other: '🚘',
}

export function VehiclesScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const openMenu = useUIStore((s) => s.setDrawerOpen)
  const reminderCount = useReminderCount()

  const vehiclesResult = useVehicles()
  const vehicles = vehiclesResult ?? []
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const setActiveVehicle = useVehicleStore((s) => s.setActiveVehicle)

  const openVehicle = (id: string) => {
    setActiveVehicle(id)
    navigate(`/vehicles/${id}`)
  }

  return (
    <div className={styles.root}>
      <TopBar title={t('nav.vehicles')} onMenu={() => openMenu(true)} />
      <Screen padding="16px" paddingBottom="76px" gap="12px">
        {vehicles.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">🚗</span>
            <p className={styles.emptyTitle}>{t('home.no_vehicles_title')}</p>
            <p className={styles.emptySubtitle}>{t('home.no_vehicles_subtitle')}</p>
            <button className={styles.primaryBtn} onClick={() => navigate('/vehicles/add')}>
              {t('home.add_vehicle')}
            </button>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {vehicles.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    className={`${styles.row} ${v.id === activeVehicleId ? styles.rowActive : ''}`}
                    onClick={() => openVehicle(v.id)}
                  >
                    <span className={styles.rowIcon} aria-hidden="true">
                      {VEHICLE_ICONS[v.type] ?? '🚘'}
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowName}>{v.name}</span>
                      <span className={styles.rowMeta}>
                        {[v.brand, v.model].filter(Boolean).join(' ') ||
                          v.type.charAt(0).toUpperCase() + v.type.slice(1)}
                        {v.odometer > 0 && ` · ${v.odometer.toLocaleString()} km`}
                      </span>
                    </span>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => navigate('/vehicles/add')}
              >
                ＋ {t('home.add_vehicle')}
              </button>
              {vehicles.length >= 2 && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => navigate('/compare')}
                >
                  ⚖️ {t('home.compare_vehicles')}
                </button>
              )}
            </div>
          </>
        )}
      </Screen>

      <BottomNav
        onHome={() => navigate('/')}
        onAdd={() => navigate('/vehicles/add')}
        onReminders={() => navigate('/reminders')}
        reminderCount={reminderCount}
      />
    </div>
  )
}
