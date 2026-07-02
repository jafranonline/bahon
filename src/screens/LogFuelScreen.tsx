import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TopBar } from '@components/layout/TopBar'
import { AgentButton } from '@components/domain/AgentButton/AgentButton'
import { Screen } from '@components/layout/Screen'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { SegmentedControl } from '@components/primitives/SegmentedControl'
import { useVehicleStore } from '@store/vehicleStore'
import { useSettingsStore } from '@store/settingsStore'
import { addFuelLog, updateFuelLog, getLastOdometer } from '@db/queries/useFuelLogs'
import { updateVehicle, useVehicle } from '@db/queries/useVehicles'
import { useCurrency } from '@hooks/useCurrency'
import type { FuelLog } from '@/types'
import styles from './LogFuelScreen.module.css'

type CalcMode = 'volume' | 'total'

export function LogFuelScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { symbol } = useCurrency()
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const vehicle = useVehicle(activeVehicleId ?? '')
  const fuelPrices = useSettingsStore((s) => s.fuelPrices)
  const updateSettings = useSettingsStore((s) => s.update)

  const editLog = (location.state as { editLog?: FuelLog } | null)?.editLog ?? null
  const isEditing = editLog != null

  const today = new Date().toISOString().slice(0, 10)

  const [calcMode, setCalcMode] = useState<CalcMode>('volume')
  const [date, setDate] = useState(today)
  const [rawVolume, setRawVolume] = useState('')
  const [rawPrice, setRawPrice] = useState('')
  const [rawTotal, setRawTotal] = useState('')
  const [currentOdoStr, setCurrentOdoStr] = useState('')
  const [prevOdoStr, setPrevOdoStr] = useState('')
  const [stationName, setStationName] = useState('')
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ volume?: string; total?: string; price?: string }>({})

  const modeOptions: { value: CalcMode; label: string }[] = useMemo(() => [
    { value: 'volume', label: t('fuel.enter_volume') },
    { value: 'total', label: t('fuel.enter_total') },
  ], [t])

  useEffect(() => {
    if (isEditing && editLog) {
      setDate(editLog.date)
      setRawVolume(editLog.volumeLitres > 0 ? String(editLog.volumeLitres) : '')
      setRawPrice(editLog.pricePerLitre > 0 ? String(editLog.pricePerLitre) : '')
      setRawTotal(editLog.totalCost > 0 ? String(editLog.totalCost) : '')
      setCurrentOdoStr(editLog.odometer > 0 ? String(editLog.odometer) : '')
      setPrevOdoStr(editLog.previousOdometer != null ? String(editLog.previousOdometer) : '')
      setStationName(editLog.stationName ?? '')
      setNotes(editLog.notes ?? '')
      if (editLog.notes) setShowNotes(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isEditing || !vehicle || !fuelPrices) return
    const saved = fuelPrices[vehicle.fuelType]
    if (saved && saved > 0) {
      setRawPrice((prev) => (prev === '' ? String(saved) : prev))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.fuelType])

  useEffect(() => {
    if (isEditing || !activeVehicleId) return
    getLastOdometer(activeVehicleId).then((odo) => {
      if (odo > 0) setPrevOdoStr(String(odo))
    })
  }, [activeVehicleId, isEditing])

  const rp = parseFloat(rawPrice) || 0

  const computedTotal = useMemo(() => {
    const vol = parseFloat(rawVolume)
    if (calcMode === 'volume' && vol > 0 && rp > 0) return vol * rp
    return null
  }, [calcMode, rawVolume, rp])

  const computedVolume = useMemo(() => {
    const total = parseFloat(rawTotal)
    if (calcMode === 'total' && total > 0 && rp > 0) return total / rp
    return null
  }, [calcMode, rawTotal, rp])

  const finalV = calcMode === 'volume' ? (parseFloat(rawVolume) || 0) : (computedVolume ?? 0)
  const finalP = rp
  const finalT = calcMode === 'total' ? (parseFloat(rawTotal) || 0) : (computedTotal ?? 0)

  const currentOdo = parseFloat(currentOdoStr) || 0
  const prevOdo = parseFloat(prevOdoStr) || 0

  const efficiencyKmL = useMemo(() => {
    if (finalV <= 0 || currentOdo <= prevOdo || prevOdo <= 0) return null
    return (currentOdo - prevOdo) / finalV
  }, [finalV, currentOdo, prevOdo])

  async function handleSave() {
    const newErrors: typeof errors = {}
    if (calcMode === 'volume' && (parseFloat(rawVolume) || 0) <= 0) newErrors.volume = t('common.required')
    if (calcMode === 'total' && (parseFloat(rawTotal) || 0) <= 0) newErrors.total = t('common.required')
    if (finalP <= 0) newErrors.price = t('common.required')
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    if (!activeVehicleId) return
    setSaving(true)
    try {
      const payload = {
        date,
        volumeLitres: finalV,
        pricePerLitre: finalP,
        totalCost: finalT,
        odometer: currentOdo || 0,
        previousOdometer: prevOdo > 0 ? prevOdo : undefined,
        efficiencyKmPerL: efficiencyKmL ?? undefined,
        stationName: stationName || undefined,
        notes: notes || undefined,
      }
      if (isEditing && editLog?.id) {
        await updateFuelLog(editLog.id, payload)
      } else {
        await addFuelLog({ vehicleId: activeVehicleId, ...payload })
      }
      if (currentOdo > 0) await updateVehicle(activeVehicleId, { odometer: currentOdo })
      if (finalP > 0 && vehicle?.fuelType) {
        updateSettings({ fuelPrices: { ...fuelPrices, [vehicle.fuelType]: finalP } })
      }
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={isEditing ? t('fuel.edit') : t('fuel.log')} onBack={() => navigate(-1)} actions={<AgentButton />} />
      <Screen>
        <Input
          type="date"
          label={t('fuel.date')}
          value={date}
          onChange={setDate}
          id="fuel-date"
        />

        <SegmentedControl
          options={modeOptions}
          value={calcMode}
          onChange={(v) => { setCalcMode(v as CalcMode); setErrors({}) }}
          aria-label={t('fuel.log')}
        />

        {calcMode === 'volume' ? (
          <Input
            label={t('fuel.volume')}
            value={rawVolume}
            onChange={(v) => { setRawVolume(v); setErrors((e) => ({ ...e, volume: undefined })) }}
            inputMode="decimal"
            placeholder="0.00"
            suffix="L"
            error={errors.volume}
            required
            id="fuel-volume"
          />
        ) : (
          <Input
            label={t('fuel.total_cost')}
            value={rawTotal}
            onChange={(v) => { setRawTotal(v); setErrors((e) => ({ ...e, total: undefined })) }}
            inputMode="decimal"
            placeholder="0.00"
            prefix={symbol}
            error={errors.total}
            required
            id="fuel-total"
          />
        )}

        <Input
          label={t('fuel.price_per_l')}
          value={rawPrice}
          onChange={(v) => { setRawPrice(v); setErrors((e) => ({ ...e, price: undefined })) }}
          inputMode="decimal"
          placeholder="0.00"
          prefix={symbol}
          suffix="/L"
          error={errors.price}
          required
          id="fuel-price-per-l"
        />

        {calcMode === 'volume' && computedTotal != null && (
          <div className={styles.computedCard}>
            <div className={styles.computedRow}>
              <span className={styles.computedLabel}>{t('fuel.total_cost')}</span>
              <span className={styles.computedValue}>{symbol} {computedTotal.toFixed(0)}</span>
            </div>
          </div>
        )}

        {calcMode === 'total' && computedVolume != null && (
          <div className={styles.computedCard}>
            <div className={styles.computedRow}>
              <span className={styles.computedLabel}>{t('fuel.volume')}</span>
              <span className={styles.computedValue}>{computedVolume.toFixed(2)} L</span>
            </div>
          </div>
        )}

        {efficiencyKmL != null && (
          <div className={styles.computedCard}>
            <div className={styles.computedRow}>
              <span className={styles.computedLabel}>{t('fuel.efficiency')}</span>
              <span className={styles.efficiencyPill}>{efficiencyKmL.toFixed(2)} km/L</span>
            </div>
          </div>
        )}

        <Input
          label={t('vehicle.current_odometer')}
          value={currentOdoStr}
          onChange={setCurrentOdoStr}
          inputMode="numeric"
          placeholder="50500"
          suffix="km"
          id="fuel-current-odo"
        />

        <Input
          label={t('fuel.previous_odometer')}
          value={prevOdoStr}
          onChange={setPrevOdoStr}
          inputMode="numeric"
          placeholder="50000"
          suffix="km"
          id="fuel-prev-odo"
        />

        <Input
          label={t('fuel.station_name')}
          value={stationName}
          onChange={setStationName}
          placeholder={t('fuel.station_placeholder')}
          id="fuel-station"
        />

        {showNotes ? (
          <Input
            label={t('common.note')}
            value={notes}
            onChange={setNotes}
            placeholder={t('common.note_placeholder')}
            id="fuel-notes"
            multiline
          />
        ) : (
          <button type="button" className={styles.addNoteBtn} onClick={() => setShowNotes(true)}>
            {t('common.add_note')}
          </button>
        )}

        <Button onClick={handleSave} loading={saving} fullWidth>
          {isEditing ? t('fuel.update') : t('fuel.save')}
        </Button>
      </Screen>
    </div>
  )
}
