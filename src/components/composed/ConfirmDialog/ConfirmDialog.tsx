import { Modal } from '@components/primitives/Modal'
import { Button } from '@components/primitives/Button'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  /** True for irreversible/destructive actions — styles the confirm button as danger. */
  danger?: boolean
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Blocking confirmation modal for critical prompts (delete, clear data, etc.).
 * Wraps Modal so every destructive confirm in the app shares the same
 * behaviour: centred, focus-trapped, closes on Escape/overlay click. */
export function ConfirmDialog({
  open,
  title,
  danger = true,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} aria-label={title}>
      <p className={styles.text}>{title}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={busy} fullWidth>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy} fullWidth>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
