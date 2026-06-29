import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Chip } from '@components/primitives/Chip'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { addExpense } from '@db/queries/useExpenses'
import type { ExpenseCategory } from '@/types'
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
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState<ExpenseCategory | null>(null)
  const [title, setTitle] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [notes, setNotes] = useState('')
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
      await addExpense({
        vehicleId: activeVehicleId,
        date,
        category: category ?? 'other',
        title: title || (category ? EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? '' : ''),
        amount,
        notes: notes || undefined,
      })
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title="Log Expense" onBack={() => navigate(-1)} />
      <Screen>
        <Input
          type="date"
          label="Date"
          value={date}
          onChange={setDate}
          id="exp-date"
        />

        <div>
          <p className={styles.chipLabel}>Category</p>
          <div className={styles.chipRow}>
            {EXPENSE_CATEGORIES.map((cat) => (
              <Chip
                key={cat.value}
                selected={category === cat.value}
                onChange={() => setCategory(category === cat.value ? null : cat.value)}
                aria-label={cat.label}
              >
                {cat.label}
              </Chip>
            ))}
          </div>
        </div>

        <Input
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Annual insurance"
          id="exp-title"
        />

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

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={setNotes}
          placeholder="Any notes..."
          id="exp-notes"
        />

        <Button onClick={handleSave} loading={saving} fullWidth>
          Save Expense
        </Button>
      </Screen>
    </div>
  )
}
