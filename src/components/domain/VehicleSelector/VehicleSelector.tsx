import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVehicles } from '@db/queries/useVehicles'
import { useVehicleStore } from '@store/vehicleStore'
import { useTranslation } from '@hooks/useTranslation'
import styles from './VehicleSelector.module.css'

const VEHICLE_ICONS: Record<string, string> = {
  car: '🚗', motorcycle: '🏍️', truck: '🚛', bus: '🚌', cng: '🛺', bicycle: '🚲', other: '🚘',
}

/**
 * Header vehicle selector: shows the active vehicle as a pill and opens a picker
 * to switch vehicle / add / compare. Shared across Home, Stats and Reminders so
 * the active-vehicle context is switchable from any of them.
 */
export function VehicleSelector() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const vehicles = useVehicles() ?? []
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const setActiveVehicle = useVehicleStore((s) => s.setActiveVehicle)

  const vehicleId = activeVehicleId ?? vehicles[0]?.id ?? ''
  const activeVehicle = vehicles.find((v) => v.id === vehicleId)

  // No vehicles yet → an Add Vehicle CTA instead of a switcher.
  if (vehicles.length === 0) {
    return (
      <button
        type="button"
        className={styles.addBtn}
        onClick={() => navigate('/vehicles/add')}
        aria-label={t('home.add_vehicle')}
      >
        <span className={styles.addIcon} aria-hidden="true">＋</span>
        <span className={styles.name}>{t('home.add_vehicle')}</span>
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        className={styles.pill}
        onClick={() => setOpen(true)}
        aria-label="Switch vehicle"
      >
        <span className={styles.icon} aria-hidden="true">
          {activeVehicle ? (VEHICLE_ICONS[activeVehicle.type] ?? '🚘') : '🚗'}
        </span>
        <span className={styles.name}>{activeVehicle?.name ?? t('home.no_vehicles_title')}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Switch vehicle">
            <div className={styles.header}>
              <span className={styles.title}>{t('home.your_vehicles')}</span>
              <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <ul className={styles.list}>
              {vehicles.map((v) => (
                <li key={v.id} className={styles.row}>
                  <button
                    type="button"
                    className={`${styles.item} ${v.id === vehicleId ? styles.itemActive : ''}`}
                    onClick={() => { setActiveVehicle(v.id); setOpen(false) }}
                  >
                    <span className={styles.itemIcon}>{VEHICLE_ICONS[v.type] ?? '🚘'}</span>
                    <span className={styles.itemName}>{v.name}</span>
                    {v.id === vehicleId && (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <path d="M3 9l5 5 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.detailBtn}
                    onClick={() => { setOpen(false); navigate(`/vehicles/${v.id}`) }}
                    aria-label={`View details for ${v.name}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className={styles.addItem} onClick={() => { setOpen(false); navigate('/vehicles/add') }}>
                  <span className={styles.itemIcon}>＋</span>
                  <span className={styles.itemName}>{t('home.add_vehicle')}</span>
                </button>
              </li>
              {vehicles.length >= 2 && (
                <li>
                  <button type="button" className={styles.compareItem} onClick={() => { setOpen(false); navigate('/compare') }}>
                    <span className={styles.itemIcon}>⚖️</span>
                    <span className={styles.itemName}>{t('home.compare_vehicles')}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </>
  )
}
