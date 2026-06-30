import Dexie, { type Table } from 'dexie'
import type { Vehicle, FuelLog, ServiceLog, Expense, Reminder, VehicleDocument } from '@/types'

export class BahonDatabase extends Dexie {
  vehicles!: Table<Vehicle, string>
  fuelLogs!: Table<FuelLog, string>
  serviceLogs!: Table<ServiceLog, string>
  expenses!: Table<Expense, string>
  reminders!: Table<Reminder, string>
  documents!: Table<VehicleDocument, string>

  constructor() {
    super('BahonDB')
    this.version(1).stores({
      vehicles: 'id, type, createdAt',
      fuelLogs: 'id, vehicleId, date, createdAt',
      serviceLogs: 'id, vehicleId, date, category, createdAt',
      expenses: 'id, vehicleId, date, category, createdAt',
      reminders: 'id, vehicleId, isActive, nextDueDate',
    })
    this.version(2).stores({
      vehicles: 'id, type, createdAt',
      fuelLogs: 'id, vehicleId, date, createdAt',
      serviceLogs: 'id, vehicleId, date, category, createdAt',
      expenses: 'id, vehicleId, date, category, createdAt',
      reminders: 'id, vehicleId, isActive, nextDueDate',
      documents: 'id, vehicleId, type, expiryDate, createdAt',
    })
  }
}

export const db = new BahonDatabase()
