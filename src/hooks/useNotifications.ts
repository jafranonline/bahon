import type { Reminder } from '@/types'

export function useNotifications() {
  async function requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const result = await Notification.requestPermission()
    return result === 'granted'
  }

  async function scheduleReminder(reminder: Reminder): Promise<void> {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    if (!('showNotification' in reg)) return

    const dueMs = new Date(reminder.nextDueDate).getTime() - Date.now()
    if (dueMs <= 0) {
      await reg.showNotification('Bahon Reminder', {
        body: reminder.title,
        tag: reminder.id,
      })
    }
    // Future: use push/background-sync for future-dated reminders
  }

  return { requestPermission, scheduleReminder }
}
