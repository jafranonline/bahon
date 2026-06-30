import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { addDocument, updateDocument } from '@db/queries/useDocuments'
import type { DocumentType, VehicleDocument } from '@/types'
import styles from './AddDocumentScreen.module.css'

const DOC_TYPES: { value: DocumentType; label: string; icon: string }[] = [
  { value: 'fitness', label: 'Fitness', icon: '🏥' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️' },
  { value: 'registration', label: 'Registration', icon: '📝' },
  { value: 'tax_token', label: 'Tax token', icon: '🏷️' },
  { value: 'other', label: 'Other', icon: '📄' },
]

export function AddDocumentScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const editDoc = (location.state as { editDoc?: VehicleDocument } | null)?.editDoc ?? null
  const isEditing = editDoc != null

  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)

  const [type, setType] = useState<DocumentType>(editDoc?.type ?? 'fitness')
  const [title, setTitle] = useState(editDoc?.title ?? '')
  const [expiryDate, setExpiryDate] = useState(editDoc?.expiryDate ?? '')
  const [notes, setNotes] = useState(editDoc?.notes ?? '')
  const [showNotes, setShowNotes] = useState(!!editDoc?.notes)
  const [saving, setSaving] = useState(false)
  const [expiryError, setExpiryError] = useState('')

  async function handleSave() {
    if (!expiryDate) {
      setExpiryError('Expiry date is required')
      return
    }
    setExpiryError('')
    if (!activeVehicleId) return
    setSaving(true)
    try {
      const payload = {
        vehicleId: activeVehicleId,
        type,
        title: title.trim(),
        expiryDate,
        notes: notes.trim() || undefined,
      }
      if (isEditing && editDoc.id) {
        await updateDocument(editDoc.id, payload)
      } else {
        await addDocument(payload)
      }
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={isEditing ? 'Edit Document' : 'Add Document'} onBack={() => navigate(-1)} />
      <Screen>
        <div className={styles.typeGrid}>
          {DOC_TYPES.map((dt) => (
            <button
              key={dt.value}
              type="button"
              className={`${styles.typeChip} ${type === dt.value ? styles.typeChipActive : ''}`}
              onClick={() => setType(dt.value)}
              aria-pressed={type === dt.value}
              aria-label={dt.label}
            >
              <span className={styles.typeIcon} aria-hidden="true">{dt.icon}</span>
              {dt.label}
            </button>
          ))}
        </div>

        <Input
          label="Title (optional)"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Vehicle fitness certificate"
          id="doc-title"
        />

        <Input
          type="date"
          label="Expiry date"
          value={expiryDate}
          onChange={(v) => { setExpiryDate(v); setExpiryError('') }}
          error={expiryError}
          id="doc-expiry"
        />

        {showNotes ? (
          <Input
            label="Note"
            value={notes}
            onChange={setNotes}
            placeholder="Any notes..."
            id="doc-notes"
            multiline
          />
        ) : (
          <button type="button" className={styles.addNoteBtn} onClick={() => setShowNotes(true)}>
            + Add note
          </button>
        )}

        <Button onClick={handleSave} loading={saving} fullWidth>
          {isEditing ? 'Save Changes' : 'Add Document'}
        </Button>
      </Screen>
    </div>
  )
}
