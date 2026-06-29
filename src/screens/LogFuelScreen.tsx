import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { SegmentedControl } from '@components/primitives/SegmentedControl'
import { Input } from '@components/primitives/Input'
import { Toggle } from '@components/primitives/Toggle'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { useSettingsStore } from '@store/settingsStore'
import { addFuelLog, updateFuelLog, getLastOdometer } from '@db/queries/useFuelLogs'
import { updateVehicle } from '@db/queries/useVehicles'
import { useCurrency } from '@hooks/useCurrency'
import type { FuelLog } from '@/types'
import styles from './LogFuelScreen.module.css'

type EntryMode = 'vol+price' | 'vol+total' | 'total'

const MODE_OPTIONS: { value: EntryMode; label: string }[] = [
  { value: 'vol+price', label: 'Vol + ৳/L' },
  { value: 'vol+total', label: 'Vol + Total' },
  { value: 'total', label: 'Total Only' },
]

export function LogFuelScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { symbol } = useCurrency()
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const lockedFuelPrice = useSettingsStore((s) => s.lockedFuelPrice)
  const updateSettings = useSettingsStore((s) => s.update)

  const editLog = (location.state as { editLog?: FuelLog } | null)?.editLog ?? null
  const isEditing = editLog != null

  const today = new Date().toISOString().slice(0, 10)

  const [mode, setMode] = useState<EntryMode>('vol+price')
  const [date, setDate] = useState(today)
  const [volumeStr, setVolumeStr] = useState('')
  const [pricePerLStr, setPricePerLStr] = useState('')
  const [totalCostStr, setTotalCostStr] = useState('')
  const [currentOdoStr, setCurrentOdoStr] = useState('')
  const [prevOdoStr, setPrevOdoStr] = useState('')
  const [stationName, setStationName] = useState('')
  const [notes, setNotes] = useState('')
  const [lockPrice, setLockPrice] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ volume?: string; totalCost?: string }>({})

  useEffect(() => {
    if (isEditing && editLog) {
      setDate(editLog.date)
      setVolumeStr(editLog.volumeLitres > 0 ? String(editLog.volumeLitres) : '')
      setPricePerLStr(editLog.pricePerLitre > 0 ? String(editLog.pricePerLitre) : '')
      setTotalCostStr(editLog.totalCost > 0 ? String(editLog.totalCost) : '')
      setCurrentOdoStr(editLog.odometer > 0 ? String(editLog.odometer) : '')
      setPrevOdoStr(editLog.previousOdometer != null ? String(editLog.previousOdometer) : '')
      setStationName(editLog.stationName ?? '')
      setNotes(editLog.notes ?? '')
    } else if (lockedFuelPrice && lockedFuelPrice > 0) {
      setPricePerLStr(String(lockedFuelPrice))
      setLockPrice(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isEditing || !activeVehicleId) return
    getLastOdometer(activeVehicleId).then((odo) => {
      if (odo > 0) setPrevOdoStr(String(odo))
    })
  }, [activeVehicleId, isEditing])

  const volume = parseFloat(volumeStr) || 0
  const pricePerL = parseFloat(pricePerLStr) || 0
  const totalCostInput = parseFloat(totalCostStr) || 0
  const currentOdo = parseFloat(currentOdoStr) || 0
  const prevOdo = parseFloat(prevOdoStr) || 0

  const computedTotal = useMemo(() => {
    if (mode === 'vol+price' && volume > 0 && pricePerL > 0) return volume * pricePerL
    return null
  }, [mode, volume, pricePerL])

  const computedPricePerL = useMemo(() => {
    if (mode === 'vol+total' && volume > 0 && totalCostInput > 0) return totalCostInput / volume
    return null
  }, [mode, volume, totalCostInput])

  const efficiencyKmL = useMemo(() => {
    if (mode === 'total') return null
    if (currentOdo > prevOdo && prevOdo > 0 && volume > 0) {
      return (currentOdo - prevOdo) / volume
    }
    return null
  }, [mode, currentOdo, prevOdo, volume])

  const finalTotal = mode === 'vol+price' ? (computedTotal ?? 0) : totalCostInput
  const finalPricePerL = mode === 'vol+price' ? pricePerL : (computedPricePerL ?? 0)
  const finalVolume = mode === 'total' ? 0 : volume

  async function handleSave() {
    const newErrors: { volume?: string; totalCost?: string } = {}
    if (mode !== 'total' && volume <= 0) newErrors.volume = 'Volume is required'
    if (finalTotal <= 0) newErrors.totalCost = 'Total cost is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    if (!activeVehicleId) return
    setSaving(true)
    try {
      if (isEditing && editLog?.id) {
        await updateFuelLog(editLog.id, {
          date,
          volumeLitres: finalVolume,
          pricePerLitre: finalPricePerL,
          totalCost: finalTotal,
          odometer: currentOdo || 0,
          previousOdometer: prevOdo > 0 ? prevOdo : undefined,
          efficiencyKmPerL: efficiencyKmL ?? undefined,
          stationName: stationName || undefined,
          notes: notes || undefined,
        })
      } else {
        await addFuelLog({
          vehicleId: activeVehicleId,
          date,
          volumeLitres: finalVolume,
          pricePerLitre: finalPricePerL,
          totalCost: finalTotal,
          odometer: currentOdo || 0,
          previousOdometer: prevOdo > 0 ? prevOdo : undefined,
          efficiencyKmPerL: efficiencyKmL ?? undefined,
          stationName: stationName || undefined,
          notes: notes || undefined,
        })
      }
      if (currentOdo > 0) {
        await updateVehicle(activeVehicleId, { odometer: currentOdo })
      }
      if (lockPrice && finalPricePerL > 0) {
        updateSettings({ lockedFuelPrice: finalPricePerL })
      } else if (!lockPrice) {
        updateSettings({ lockedFuelPrice: undefined })
      }
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={isEditing ? 'Edit Fuel Log' : 'Log Fuel'} onBack={() => navigate(-1)} />
      <Screen>
        <SegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onChange={(v) => { setMode(v); setErrors({}) }}
          aria-label="Fuel entry mode"
        />

        <Input
          type="date"
          label="Date"
          value={date}
          onChange={setDate}
          id="fuel-date"
        />

        {mode !== 'total' && (
          <Input
            label="Volume (L)"
            value={volumeStr}
            onChange={setVolumeStr}
            inputMode="decimal"
            placeholder="0.00"
            suffix="L"
            error={errors.volume}
            id="fuel-volume"
          />
        )}

        {mode === 'vol+price' && (
          <Input
            label={`Price per litre (${symbol}/L)`}
            value={pricePerLStr}
            onChange={setPricePerLStr}
            inputMode="decimal"
            placeholder="0.00"
            prefix={symbol}
            id="fuel-price-per-l"
          />
        )}

        {(mode === 'vol+total' || mode === 'total') && (
          <Input
            label={`Total cost (${symbol})`}
            value={totalCostStr}
            onChange={setTotalCostStr}
            inputMode="decimal"
            placeholder="0.00"
            prefix={symbol}
            error={errors.totalCost}
            id="fuel-total"
          />
        )}

        <div className={styles.computedCard}>
          {mode === 'vol+price' && (
            <div className={styles.computedRow}>
              <span className={styles.computedLabel}>Total cost</span>
              <span className={styles.computedValue}>
                {computedTotal != null
                  ? `${symbol} ${computedTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                  : '—'}
              </span>
            </div>
          )}
          {mode === 'vol+total' && (
            <div className={styles.computedRow}>
              <span className={styles.computedLabel}>Price per litre</span>
              <span className={styles.computedValue}>
                {computedPricePerL != null ? `${symbol} ${computedPricePerL.toFixed(2)}/L` : '—'}
              </span>
            </div>
          )}
          {mode === 'total' && (
            <div className={styles.computedRow}>
              <span className={styles.computedLabel}>Total recorded</span>
              <span className={styles.computedValue}>
                {totalCostInput > 0 ? `${symbol} ${totalCostInput.toLocaleString()}` : '—'}
              </span>
            </div>
          )}
          {efficiencyKmL != null && (
            <div className={styles.computedRow}>
              <span className={styles.computedLabel}>Efficiency</span>
              <span className={styles.efficiencyPill}>
                {efficiencyKmL.toFixed(2)} km/L
              </span>
            </div>
          )}
        </div>

        <div className={styles.lockRow}>
          <span className={styles.lockLabel}>Lock price for next entries</span>
          <Toggle checked={lockPrice} onChange={setLockPrice} aria-label="Lock fuel price" />
        </div>

        <Input
          label="Current odometer (km)"
          value={currentOdoStr}
          onChange={setCurrentOdoStr}
          inputMode="numeric"
          placeholder="50500"
          suffix="km"
          id="fuel-current-odo"
        />
        <Input
          label="Previous odometer (km)"
          value={prevOdoStr}
          onChange={setPrevOdoStr}
          inputMode="numeric"
          placeholder="50000"
          suffix="km"
          id="fuel-prev-odo"
        />

        <Input
          label="Station name (optional)"
          value={stationName}
          onChange={setStationName}
          placeholder="e.g. Padma Petrol"
          id="fuel-station"
        />
        <Input
          label="Notes (optional)"
          value={notes}
          onChange={setNotes}
          placeholder="Any notes..."
          id="fuel-notes"
        />

        <Button onClick={handleSave} loading={saving} fullWidth>
          {isEditing ? 'Update Fuel Log' : 'Save Fuel Log'}
        </Button>
      </Screen>
    </div>
  )
}
