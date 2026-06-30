export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bus' | 'other'

export type FuelType = 'octane' | 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'

export type ServiceCategory =
  | 'oil_change'
  | 'oil_filter'
  | 'air_filter'
  | 'fuel_filter'
  | 'spark_plug'
  | 'brake_pad'
  | 'brake_disc'
  | 'tire_rotation'
  | 'tire_replacement'
  | 'wheel_alignment'
  | 'wheel_balancing'
  | 'battery'
  | 'coolant'
  | 'transmission'
  | 'ac_service'
  | 'chain_service'
  | 'wash'
  | 'inspection'
  | 'registration'
  | 'other'

export type ExpenseCategory =
  | 'tax_token'
  | 'insurance'
  | 'parking'
  | 'toll'
  | 'fuel_tax'
  | 'fine'
  | 'wash'
  | 'accessories'
  | 'other'

export type ReminderRepeatUnit = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'km'

export type Language = 'en' | 'bn'

export type Theme = 'light' | 'dark' | 'system'

export type Currency = 'BDT' | 'USD' | 'INR' | 'EUR' | 'GBP' | 'SAR'

export type DistanceUnit = 'km' | 'mi'

export type VolumeUnit = 'L' | 'gal'

export type EfficiencyUnit = 'km/L' | 'L/100km' | 'MPG'

export type DocumentType = 'fitness' | 'insurance' | 'registration' | 'tax_token' | 'other'
