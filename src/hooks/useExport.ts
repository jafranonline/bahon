import { db } from '@db/database'

type ExportEntity = 'vehicles' | 'fuel' | 'service' | 'expenses' | 'reminders'

interface BackupFile {
  version: string
  exportedAt: string
  vehicles: unknown[]
  fuelLogs: unknown[]
  serviceLogs: unknown[]
  expenses: unknown[]
  reminders: unknown[]
  documents: unknown[]
  tombstones?: unknown[]
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? '')
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
        })
        .join(',')
    ),
  ]
  return '﻿' + lines.join('\r\n')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useExport() {
  async function exportAsCSV(entity: ExportEntity) {
    let rows: Record<string, unknown>[] = []
    const date = new Date().toISOString().slice(0, 10)

    switch (entity) {
      case 'vehicles':
        rows = (await db.vehicles.toArray()) as unknown as Record<string, unknown>[]
        break
      case 'fuel':
        rows = (await db.fuelLogs.toArray()) as unknown as Record<string, unknown>[]
        break
      case 'service':
        rows = (await db.serviceLogs.toArray()) as unknown as Record<string, unknown>[]
        break
      case 'expenses':
        rows = (await db.expenses.toArray()) as unknown as Record<string, unknown>[]
        break
      case 'reminders':
        rows = (await db.reminders.toArray()) as unknown as Record<string, unknown>[]
        break
    }

    const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `bahon-${entity}-${date}.csv`)
  }

  async function exportAsJSON() {
    const date = new Date().toISOString().slice(0, 10)
    const backup: BackupFile = {
      version: '1',
      exportedAt: new Date().toISOString(),
      vehicles: await db.vehicles.toArray(),
      fuelLogs: await db.fuelLogs.toArray(),
      serviceLogs: await db.serviceLogs.toArray(),
      expenses: await db.expenses.toArray(),
      reminders: await db.reminders.toArray(),
      documents: await db.documents.toArray(),
      tombstones: await db.tombstones.toArray(),
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `bahon-backup-${date}.json`)
  }

  async function importFromJSON(file: File): Promise<void> {
    const text = await file.text()
    const data = JSON.parse(text) as BackupFile

    if (!data.vehicles || !data.fuelLogs) {
      throw new Error('invalid_backup')
    }

    await db.transaction(
      'rw',
      [db.vehicles, db.fuelLogs, db.serviceLogs, db.expenses, db.reminders, db.documents, db.tombstones],
      async () => {
        await db.vehicles.clear()
        await db.fuelLogs.clear()
        await db.serviceLogs.clear()
        await db.expenses.clear()
        await db.reminders.clear()
        await db.documents.clear()
        await db.tombstones.clear()
        if (data.tombstones?.length) await db.tombstones.bulkAdd(data.tombstones as Parameters<typeof db.tombstones.bulkAdd>[0])

        if (data.vehicles.length) await db.vehicles.bulkAdd(data.vehicles as Parameters<typeof db.vehicles.bulkAdd>[0])
        if (data.fuelLogs.length) await db.fuelLogs.bulkAdd(data.fuelLogs as Parameters<typeof db.fuelLogs.bulkAdd>[0])
        if (data.serviceLogs.length) await db.serviceLogs.bulkAdd(data.serviceLogs as Parameters<typeof db.serviceLogs.bulkAdd>[0])
        if (data.expenses.length) await db.expenses.bulkAdd(data.expenses as Parameters<typeof db.expenses.bulkAdd>[0])
        if (data.reminders.length) await db.reminders.bulkAdd(data.reminders as Parameters<typeof db.reminders.bulkAdd>[0])
        if (data.documents.length) await db.documents.bulkAdd(data.documents as Parameters<typeof db.documents.bulkAdd>[0])
      }
    )
  }

  return { exportAsCSV, exportAsJSON, importFromJSON }
}
