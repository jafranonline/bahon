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
      'Record a fuel fill-up. Use whenever the user mentions buying fuel, ' +
      'litres, fuel price, or an odometer reading at a fill-up. Compute ' +
      'pricePerLitre from total spent ÷ litres if the user gives a total.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD; default today' },
        volumeLitres: { type: 'number' },
        pricePerLitre: { type: 'number' },
        odometer: { type: 'number' },
        stationName: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['vehicleId', 'date', 'volumeLitres', 'pricePerLitre', 'odometer'],
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
      required: ['vehicleId', 'date', 'title', 'category', 'cost'],
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
      required: ['vehicleId', 'date', 'title', 'category', 'amount'],
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
      'Read recent totals for the active vehicle. The frontend executes this ' +
      'and returns the data so you can answer questions about spending/usage.',
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
    description:
      'Read recent logs of a given type for the active vehicle. The frontend ' +
      'executes this and returns the data.',
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
]
