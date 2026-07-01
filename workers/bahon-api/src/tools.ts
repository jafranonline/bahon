// Tool definitions the agent can invoke, in Cloudflare Workers AI format.
// The frontend executes these against Dexie / the router and returns results.

export interface WorkerAITool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

const SERVICE_CATEGORIES = [
  'oil_change', 'oil_filter', 'air_filter', 'fuel_filter', 'spark_plug',
  'brake_pad', 'brake_disc', 'tire_rotation', 'tire_replacement',
  'wheel_alignment', 'wheel_balancing', 'battery', 'coolant', 'transmission',
  'ac_service', 'chain_service', 'wash', 'inspection', 'registration', 'other',
]

const EXPENSE_CATEGORIES = [
  'tax_token', 'insurance', 'parking', 'toll', 'fuel_tax', 'fine', 'wash',
  'accessories', 'other',
]

const REPEAT_UNITS = ['daily', 'weekly', 'monthly', 'yearly', 'km']

export const tools: WorkerAITool[] = [
  {
    name: 'add_fuel_log',
    description:
      'Record a fuel fill-up. Provide any of: litres, price per litre, or the ' +
      'total spent (totalCost). A bare "N taka of fuel" is a TOTAL → pass ' +
      'totalCost. The app fills the rest using the saved fuel price when needed.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD; default today' },
        volumeLitres: { type: 'number' },
        pricePerLitre: { type: 'number' },
        totalCost: { type: 'number', description: 'Total taka spent on the fill-up' },
        odometer: { type: 'number' },
        stationName: { type: 'string' },
        notes: { type: 'string' },
      },
      // Only vehicleId is hard-required; the executor validates that at least
      // one of litres / price / totalCost is present and derives the rest.
      required: ['vehicleId'],
    },
  },
  {
    name: 'add_service_log',
    description: 'Record a service or maintenance event (oil change, brakes, etc.).',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD; default today' },
        title: { type: 'string' },
        category: { type: 'string', enum: SERVICE_CATEGORIES },
        cost: { type: 'number' },
        odometer: { type: 'number' },
        shopName: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['vehicleId', 'title', 'cost'],
    },
  },
  {
    name: 'add_expense',
    description: 'Record a miscellaneous vehicle expense (parking, toll, fine, etc.).',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD; default today' },
        title: { type: 'string' },
        category: { type: 'string', enum: EXPENSE_CATEGORIES },
        amount: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['vehicleId', 'title', 'amount'],
    },
  },
  {
    name: 'add_reminder',
    description: 'Create a maintenance reminder by date, odometer, or both.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        title: { type: 'string' },
        type: { type: 'string', enum: ['one-time', 'repeat'] },
        triggerType: { type: 'string', enum: ['date', 'odometer', 'both'] },
        dueDate: { type: 'string', description: 'YYYY-MM-DD' },
        dueOdometer: { type: 'number' },
        repeatUnit: { type: 'string', enum: REPEAT_UNITS },
        repeatValue: { type: 'number' },
      },
      required: ['vehicleId', 'title', 'type', 'triggerType'],
    },
  },
  {
    name: 'add_document',
    description:
      'Store a vehicle document (fitness, insurance, registration, tax token) ' +
      'with its expiry date so the app can remind the user before it lapses.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        type: { type: 'string', enum: ['fitness', 'insurance', 'registration', 'tax_token', 'other'] },
        title: { type: 'string' },
        expiryDate: { type: 'string', description: 'YYYY-MM-DD' },
        notes: { type: 'string' },
      },
      required: ['vehicleId', 'type', 'expiryDate'],
    },
  },
  {
    name: 'update_vehicle',
    description: "Update the active vehicle's name, odometer, colour, or plate.",
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        name: { type: 'string' },
        odometer: { type: 'number' },
        colour: { type: 'string' },
        plateNumber: { type: 'string' },
      },
      required: ['vehicleId'],
    },
  },
  {
    name: 'update_settings',
    description: 'Change app settings: language, theme, currency, or units.',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['en', 'bn'] },
        theme: { type: 'string', enum: ['light', 'dark', 'system'] },
        currency: { type: 'string' },
        distanceUnit: { type: 'string', enum: ['km', 'mi'] },
        volumeUnit: { type: 'string', enum: ['L', 'gal'] },
      },
      required: [],
    },
  },
  {
    name: 'navigate_to',
    description: 'Navigate the app to a screen.',
    parameters: {
      type: 'object',
      properties: {
        screen: {
          type: 'string',
          enum: ['home', 'stats', 'reminders', 'logs', 'settings', 'vehicles'],
        },
      },
      required: ['screen'],
    },
  },
  {
    name: 'get_stats_summary',
    description:
      'Read recent totals for the active vehicle to answer questions about ' +
      'spending or usage.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        period: { type: 'string', enum: ['week', 'month', 'year'] },
      },
      required: ['vehicleId'],
    },
  },
  {
    name: 'list_recent_logs',
    description: 'Read recent logs of a given type for the active vehicle.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        type: { type: 'string', enum: ['fuel', 'service', 'expense', 'reminder'] },
        limit: { type: 'number' },
      },
      required: ['vehicleId', 'type'],
    },
  },
  {
    name: 'compare_periods',
    description:
      'Compare two time windows for the active vehicle (e.g. this month vs ' +
      'last month) and report the deltas in spend, fuel and efficiency.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        unit: { type: 'string', enum: ['week', 'month', 'year'] },
      },
      required: ['vehicleId', 'unit'],
    },
  },
  {
    name: 'get_vehicle_overview',
    description:
      'Read a full snapshot of the active vehicle: odometer, lifetime totals ' +
      '(fuel/service/expense), average efficiency, and the next due reminder.',
    parameters: {
      type: 'object',
      properties: { vehicleId: { type: 'string' } },
      required: ['vehicleId'],
    },
  },
  {
    name: 'delete_recent_log',
    description:
      "Delete one of the active vehicle's records. Use `which` to pick which " +
      'recent entry to remove (1 = most recent). The app confirms with the ' +
      'user before deleting.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        type: { type: 'string', enum: ['fuel', 'service', 'expense', 'reminder'] },
        which: { type: 'number', description: '1 = most recent (default), 2 = next, …' },
      },
      required: ['vehicleId', 'type'],
    },
  },
  {
    name: 'delete_vehicle',
    description:
      'Delete the active vehicle and ALL of its logs, reminders and documents. ' +
      'The app confirms with the user before deleting.',
    parameters: {
      type: 'object',
      properties: { vehicleId: { type: 'string' } },
      required: ['vehicleId'],
    },
  },
  {
    name: 'clear_all_data',
    description:
      "Erase ALL of the active vehicle's logs, reminders and documents while " +
      'keeping the vehicle itself. The app confirms with the user first.',
    parameters: {
      type: 'object',
      properties: { vehicleId: { type: 'string' } },
      required: ['vehicleId'],
    },
  },
]
