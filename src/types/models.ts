import type {
  VehicleType,
  FuelType,
  ServiceCategory,
  ExpenseCategory,
  ReminderRepeatUnit,
  Language,
  Theme,
  Currency,
  DistanceUnit,
  VolumeUnit,
  EfficiencyUnit,
  DocumentType,
} from './enums'

export interface Vehicle {
  id: string
  name: string
  brand: string
  model: string
  year: number
  type: VehicleType
  fuelType: FuelType
  odometer: number
  colour?: string
  plateNumber?: string
  createdAt: string
  updatedAt: string
}

export interface FuelLog {
  id: string
  vehicleId: string
  date: string
  volumeLitres: number
  pricePerLitre: number
  totalCost: number
  odometer: number
  previousOdometer?: number
  efficiencyKmPerL?: number
  efficiencyL100km?: number
  efficiencyMPG?: number
  stationName?: string
  fuelType?: string
  notes?: string
  createdAt: string
}

export interface ServiceLog {
  id: string
  vehicleId: string
  date: string
  category: ServiceCategory
  title: string
  cost: number
  odometer?: number
  shopName?: string
  notes?: string
  createdAt: string
}

export interface Expense {
  id: string
  vehicleId: string
  date: string
  category: ExpenseCategory
  title: string
  amount: number
  notes?: string
  createdAt: string
}

export interface Reminder {
  id: string
  vehicleId: string
  title: string
  type: 'one-time' | 'repeat'
  triggerType: 'date' | 'odometer' | 'both'
  dueDate?: string
  dueOdometer?: number
  repeatUnit?: ReminderRepeatUnit
  repeatValue?: number
  nextDueDate?: string
  nextDueOdometer?: number
  daysBeforeAlert: number
  kmBeforeAlert: number
  isActive: boolean
  lastTriggeredAt?: string
  createdAt: string
}

export interface VehicleDocument {
  id: string
  vehicleId: string
  type: DocumentType
  title: string
  expiryDate: string
  notes?: string
  createdAt: string
}

/** Records a deletion so it can propagate across devices during sync. */
export interface Tombstone {
  id: string // the deleted record's id
  entity: 'vehicles' | 'fuelLogs' | 'serviceLogs' | 'expenses' | 'reminders' | 'documents'
  deletedAt: string
}

export interface Settings {
  language: Language
  theme: Theme
  currency: Currency
  distanceUnit: DistanceUnit
  volumeUnit: VolumeUnit
  efficiencyUnit: EfficiencyUnit
  fuelPrices?: Partial<Record<FuelType, number>>
  defaultVehicleId?: string
  notificationsEnabled: boolean
  onboardingComplete?: boolean
  /** Pro only: show the AI assistant button in the center of the bottom nav.
   * When off, the "+" returns to the center and no AI button is shown. */
  showAgentButton?: boolean
}
