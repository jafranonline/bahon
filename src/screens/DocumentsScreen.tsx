import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { BottomNav } from '@components/layout/BottomNav'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { useReminderCount } from '@hooks/useReminderCount'
import { useDocuments, deleteDocument } from '@db/queries/useDocuments'
import type { VehicleDocument, DocumentType } from '@/types'
import styles from './DocumentsScreen.module.css'

const DOC_ICONS: Record<DocumentType, string> = {
  fitness: '🏥',
  insurance: '🛡️',
  registration: '📝',
  tax_token: '🏷️',
  other: '📄',
}

const DOC_LABELS: Record<DocumentType, string> = {
  fitness: 'Fitness certificate',
  insurance: 'Insurance',
  registration: 'Registration',
  tax_token: 'Tax token',
  other: 'Document',
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(dateStr)
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const days = getDaysUntil(expiryDate)
  if (days < 0) {
    return <span className={`${styles.badge} ${styles.badgeRed}`}>Expired</span>
  }
  if (days <= 7) {
    return <span className={`${styles.badge} ${styles.badgeRed}`}>{days}d left</span>
  }
  if (days <= 30) {
    return <span className={`${styles.badge} ${styles.badgeAmber}`}>{days}d left</span>
  }
  return <span className={`${styles.badge} ${styles.badgeGreen}`}>{days}d left</span>
}

export function DocumentsScreen() {
  const navigate = useNavigate()
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const docs = useDocuments(activeVehicleId ?? '')
  const reminderCount = useReminderCount()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirmDelete) return
    await deleteDocument(confirmDelete)
    setConfirmDelete(null)
  }

  return (
    <div className={styles.root}>
      <TopBar title="Documents" onBack={() => navigate(-1)} />
      <Screen paddingBottom="76px">
        {confirmDelete && (
          <div className={styles.confirmCard}>
            <p className={styles.confirmText}>Delete this document? This cannot be undone.</p>
            <div className={styles.confirmActions}>
              <Button onClick={() => setConfirmDelete(null)} fullWidth>Cancel</Button>
              <Button onClick={handleDelete} fullWidth>Yes, delete</Button>
            </div>
          </div>
        )}

        {docs.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📄</span>
            <p className={styles.emptyText}>No documents yet.{'\n'}Track fitness, insurance, registration and more.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {(docs as VehicleDocument[]).map((doc) => (
              <div key={doc.id} className={styles.docRow}>
                <span className={styles.docIcon} aria-hidden="true">{DOC_ICONS[doc.type]}</span>
                <div className={styles.docMeta}>
                  <span className={styles.docTitle}>{doc.title || DOC_LABELS[doc.type]}</span>
                  <span className={styles.docType}>{DOC_LABELS[doc.type]}</span>
                </div>
                <div className={styles.docRight}>
                  <ExpiryBadge expiryDate={doc.expiryDate} />
                  <span className={styles.docDate}>{formatDate(doc.expiryDate)}</span>
                </div>
                <div className={styles.docActions}>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => navigate('/documents/add', { state: { editDoc: doc } })}
                    aria-label={`Edit ${doc.title || DOC_LABELS[doc.type]}`}
                  >✏️</button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => doc.id && setConfirmDelete(doc.id)}
                    aria-label={`Delete ${doc.title || DOC_LABELS[doc.type]}`}
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className={styles.addBtn}
          onClick={() => navigate('/documents/add')}
          aria-label="Add document"
        >
          + Add document
        </button>
      </Screen>

      <BottomNav
        onHome={() => navigate('/')}
        onAdd={() => navigate('/log/fuel')}
        onReminders={() => navigate('/reminders')}
        reminderCount={reminderCount}
      />
    </div>
  )
}
