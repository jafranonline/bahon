import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Select } from '@components/primitives/Select'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { addExpense, updateExpense } from '@db/queries/useExpenses'
import type { ExpenseCategory, Expense } from '@/types'
import styles from './LogExpenseScreen.module.css'

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'tax_token', label: 'Tax token' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'parking', label: 'Parking' },
  { value: 'toll', label: 'Toll' },
  { value: 'fuel_tax', label: 'Fuel tax' },
  { value: 'fine', label: 'Fine' },
  { value: 'wash', label: 'Wash' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
]

export function LogExpenseScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const editLog = (location.state as { editLog?: Expense } | null)?.editLog ?? null
  const isEditing = editLog != null

  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)

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
      setAmountError('Amount is required')
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
      <TopBar title={isEditing ? 'Edit Expense' : 'Log Expense'} onBack={() => navigate(-1)} />
      <Screen>
        <Input
          type="date"
          label="Date"
          value={date}
          onChange={setDate}
          id="exp-date"
        />

        <Select
          label="Category"
          options={EXPENSE_CATEGORIES}
          value={category ?? ''}
          onChange={(v) => {
            setCategory(v as ExpenseCategory)
            if (v !== 'other') setTitle('')
          }}
          placeholder="Select category…"
          id="exp-category"
        />

        {category === 'other' && (
          <Input
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Describe the expense…"
            id="exp-title"
          />
        )}

        <Input
          label="Amount (৳)"
          value={amountStr}
          onChange={(v) => { setAmountStr(v); setAmountError('') }}
          inputMode="decimal"
          placeholder="0.00"
          prefix="৳"
          error={amountError}
          id="exp-amount"
        />

        {showNotes ? (
          <Input
            label="Note"
            value={notes}
            onChange={setNotes}
            placeholder="Any notes..."
            id="exp-notes"
            multiline
          />
        ) : (
          <button type="button" className={styles.addNoteBtn} onClick={() => setShowNotes(true)}>
            + Add note
          </button>
        )}

        <Button onClick={handleSave} loading={saving} fullWidth>
          {isEditing ? 'Save Changes' : 'Save Expense'}
        </Button>
      </Screen>
    </div>
  )
}
