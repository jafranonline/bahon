// Whisper speech-to-text via Cloudflare Workers AI.

import type { Env } from './types'

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * Transcribes audio to text using whisper-large-v3-turbo, which — unlike the
 * base model — accepts an explicit `language`. We force it from the app's
 * language ("en"/"bn") so Bangla/English speech isn't mis-detected as Arabic.
 * @param audio Raw audio bytes (WebM/Opus from MediaRecorder).
 * @param lang  App language hint ("en" or "bn").
 */
export async function transcribe(
  audio: ArrayBuffer,
  lang: string,
  env: Env,
): Promise<string> {
  const language = lang === 'bn' ? 'bn' : 'en'
  // The generated AI types don't model turbo's inputs; call via a typed ref.
  const run = env.AI.run.bind(env.AI) as (
    model: string,
    inputs: { audio: string; language?: string; task?: string },
  ) => Promise<{ text?: string }>

  const result = await run('@cf/openai/whisper-large-v3-turbo', {
    audio: toBase64(audio),
    language,
    task: 'transcribe',
  })
  return result.text ?? ''
}
