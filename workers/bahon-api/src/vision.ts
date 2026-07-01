// Image data extraction via Llama 4 Scout (natively multimodal) on Workers AI.
// Reads odometers, fuel receipts and vehicle documents into structured JSON the
// frontend turns into a confirm-then-save card.

import type { Env } from './types'
import { MODEL } from './chat'

export type VisionHint = 'odometer' | 'fuel_receipt' | 'document' | 'auto'

/** Fields we try to pull from an image. All optional — the model returns only
 * what it can actually read, and the frontend confirms before saving. */
export interface VisionExtract {
  kind: 'odometer' | 'fuel_receipt' | 'document' | 'unknown'
  odometer?: number
  volumeLitres?: number
  pricePerLitre?: number
  totalCost?: number
  stationName?: string
  date?: string
  documentType?: string
  expiryDate?: string
  title?: string
  /** Model's own 0–1 confidence that the reading is correct. */
  confidence?: number
  /** One short line to show the user if nothing usable was found. */
  note?: string
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function extractionPrompt(hint: VisionHint): string {
  const base =
    'You extract structured data from a photo taken in a vehicle app. Return ' +
    'ONLY a single minified JSON object, no prose, no code fences. Read digits ' +
    'exactly; never guess a number you cannot see. Dates as YYYY-MM-DD. ' +
    'Money is a plain number (no symbols/commas). Fields: kind ' +
    '("odometer"|"fuel_receipt"|"document"|"unknown"), odometer, volumeLitres, ' +
    'pricePerLitre, totalCost, stationName, date, documentType, expiryDate, ' +
    'title, confidence (0-1), note. Omit any field you cannot read.'
  if (hint === 'odometer')
    return base + ' The photo is a dashboard odometer; return kind "odometer" and the reading.'
  if (hint === 'fuel_receipt')
    return base + ' The photo is a fuel receipt; return kind "fuel_receipt" with litres, price and total.'
  if (hint === 'document')
    return base + ' The photo is a vehicle document; return kind "document" with documentType, title and expiryDate.'
  return base + ' Decide the kind yourself from what the image shows.'
}

// The generated Workers AI types don't model multimodal content parts; call
// through a locally-typed reference (same pattern as chat.ts / transcribe.ts).
interface VisionContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}
interface VisionMessage {
  role: 'system' | 'user'
  content: string | VisionContentPart[]
}

/**
 * Extracts structured data from an image. `mime` + raw bytes are sent to the
 * model as a data URI. Always resolves to a VisionExtract; on any failure it
 * returns { kind: 'unknown', note }.
 */
export async function extractFromImage(
  image: ArrayBuffer,
  mime: string,
  hint: VisionHint,
  env: Env,
): Promise<VisionExtract> {
  const dataUri = `data:${mime || 'image/jpeg'};base64,${toBase64(image)}`
  const run = env.AI.run.bind(env.AI) as (
    model: string,
    inputs: { messages: VisionMessage[]; max_tokens?: number },
  ) => Promise<{ response?: unknown }>

  let response: unknown
  try {
    const result = await run(MODEL, {
      max_tokens: 512,
      messages: [
        { role: 'system', content: extractionPrompt(hint) },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the data from this image.' },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        },
      ],
    })
    response = result.response
  } catch (err) {
    console.error('vision run failed:', err instanceof Error ? err.message : err)
    return { kind: 'unknown', note: 'read_failed' }
  }

  // Scout returns `response` as an already-parsed JSON object when the reply is
  // JSON; other models return a string. Handle both.
  const obj =
    response && typeof response === 'object'
      ? (response as Record<string, unknown>)
      : typeof response === 'string'
        ? extractJsonObject(response)
        : null
  if (!obj) return { kind: 'unknown', note: 'no_data' }
  return coerceExtract(obj)
}

/** Pulls the first JSON object out of a string reply, or null. */
function extractJsonObject(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Coerces a loosely-typed extract object into a clean VisionExtract. */
function coerceExtract(obj: Record<string, unknown>): VisionExtract {
  const numeric = (v: unknown): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^0-9.]/g, ''))
      if (Number.isFinite(n) && n > 0) return n
    }
    return undefined
  }
  const text = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() && !/^(null|n\/a|none)$/i.test(v.trim())
      ? v.trim()
      : undefined

  const kinds = ['odometer', 'fuel_receipt', 'document', 'unknown']
  const kind = (typeof obj.kind === 'string' && kinds.includes(obj.kind)
    ? obj.kind
    : 'unknown') as VisionExtract['kind']

  const out: VisionExtract = {
    kind,
    odometer: numeric(obj.odometer),
    volumeLitres: numeric(obj.volumeLitres),
    pricePerLitre: numeric(obj.pricePerLitre),
    totalCost: numeric(obj.totalCost),
    stationName: text(obj.stationName),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(obj.date)) ? String(obj.date) : undefined,
    documentType: text(obj.documentType),
    expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(String(obj.expiryDate)) ? String(obj.expiryDate) : undefined,
    title: text(obj.title),
    confidence: numeric(obj.confidence),
    note: text(obj.note),
  }
  const hasData =
    out.odometer || out.volumeLitres || out.pricePerLitre || out.totalCost || out.expiryDate
  if (!hasData && out.kind === 'unknown') out.note = out.note ?? 'no_data'
  return out
}
