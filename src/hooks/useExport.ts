import { db } from '@db/database'

type ExportEntity = 'vehicles' | 'fuel' | 'service' | 'expenses' | 'reminders'

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

function download(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
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
        rows = (await db.vehicles.toArray()) as Record<string, unknown>[]
        break
      case 'fuel':
        rows = (await db.fuelLogs.toArray()) as Record<string, unknown>[]
        break
      case 'service':
        rows = (await db.serviceLogs.toArray()) as Record<string, unknown>[]
        break
      case 'expenses':
        rows = (await db.expenses.toArray()) as Record<string, unknown>[]
        break
      case 'reminders':
        rows = (await db.reminders.toArray()) as Record<string, unknown>[]
        break
    }

    download(toCSV(rows), `bahon-${entity}-${date}.csv`)
  }

  return { exportAsCSV }
}
