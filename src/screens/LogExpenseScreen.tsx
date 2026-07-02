import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TopBar } from '@components/layout/TopBar'
import { AgentButton } from '@components/domain/AgentButton/AgentButton'
import { Screen } from '@components/layout/Screen'
import { Select } from '@components/primitives/Select'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { addExpense, updateExpense } from '@db/queries/useExpenses'
import type { ExpenseCategory, Expense } from '@/types'
import styles from './LogExpenseScreen.module.css'

export function LogExpenseScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const editLog = (location.state as { editLog?: Expense } | null)?.editLog ?? null
  const isEditing = editLog != null

  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)

  const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
    { value: 'tax_token', label: t('expense.categories.tax_token') },
    { value: 'insurance', label: t('expense.categories.insurance') },
    { value: 'parking', label: t('expense.categories.parking') },
    { value: 'toll', label: t('expense.categories.toll') },
    { value: 'fuel_tax', label: t('expense.categories.fuel_tax') },
    { value: 'fine', label: t('expense.categories.fine') },
    { value: 'wash', label: t('expense.categories.wash') },
    { value: 'accessories', label: t('expense.categories.accessories') },
    { value: 'other', label: t('expense.categories.other') },
  ]

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(editLog?.date ?? today)
  const [category, setCategory] = useState<ExpenseCategory | null>(editLog?.category ?? null)
  const [title, setTitle] = useState(editLog?.category === 'other' ? (editLog?.title ?? '') : '')
  const [amountStr, setAmountStr] = useState(editLog?.amount ? String(editLog.amount) : '')
  const [notes, setNotes] = useState(editLog?.notes ?? '')
  const [showNotes, setShowNotes] = useState(!!editLog?.notes)
  const [saving, setSaving] = useState(false)
  const [amountError, setAmountError] = useState('')

  async function handleSave() {
    const amount = parseFloat(amountStr) || 0
    if (amount <= 0) {
      setAmountError(t('common.required'))
      return
    }
    setAmountError('')
    if (!activeVehicleId) return
    setSaving(true)
    try {
      const payload = {
        date,
        category: category ?? 'other',
        title: title || (category ? EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? '' : ''),
        amount,
        notes: notes || undefined,
      }
      if (isEditing && editLog.id) {
        await updateExpense(editLog.id, payload)
      } else {
        await addExpense({ vehicleId: activeVehicleId, ...payload })
      }
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={isEditing ? t('expense.edit') : t('expense.log')} onBack={() => navigate(-1)} actions={<AgentButton />} />
      <Screen>
        <Input
          type="date"
          label={t('expense.date')}
          value={date}
          onChange={setDate}
          id="exp-date"
        />

        <Select
          label={t('expense.category')}
          options={EXPENSE_CATEGORIES}
          value={category ?? ''}
          onChange={(v) => {
            setCategory(v as ExpenseCategory)
            if (v !== 'other') setTitle('')
          }}
          placeholder={t('common.select')}
          id="exp-category"
        />

        {category === 'other' && (
          <Input
            label={t('expense.title')}
            value={title}
            onChange={setTitle}
            placeholder={t('expense.describe_placeholder')}
            id="exp-title"
          />
        )}

        <Input
          label={t('expense.amount')}
          value={amountStr}
          onChange={(v) => { setAmountStr(v); setAmountError('') }}
          inputMode="decimal"
          placeholder="0.00"
          prefix="৳"
          error={amountError}
          required
          id="exp-amount"
        />

        {showNotes ? (
          <Input
            label={t('common.note')}
            value={notes}
            onChange={setNotes}
            placeholder={t('common.note_placeholder')}
            id="exp-notes"
            multiline
          />
        ) : (
          <button type="button" className={styles.addNoteBtn} onClick={() => setShowNotes(true)}>
            {t('common.add_note')}
          </button>
        )}

        <Button onClick={handleSave} loading={saving} fullWidth>
          {isEditing ? t('common.save_changes') : t('expense.save')}
        </Button>
      </Screen>
    </div>
  )
}
