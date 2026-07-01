// Whisper speech-to-text via Cloudflare Workers AI.

import type { Env } from './index'

/**
 * Transcribes audio to text using @cf/openai/whisper.
 * @param audio Raw audio bytes (WebM/Opus from MediaRecorder).
 * @param _lang Language hint ("en" or "bn"). The base Whisper model
 *   auto-detects language and takes no explicit hint, so this is reserved for
 *   a future switch to a model that accepts one (e.g. whisper-large-v3-turbo).
 */
export async function transcribe(
  audio: ArrayBuffer,
  _lang: string,
  env: Env,
): Promise<string> {
  // Whisper expects an array of bytes for the `audio` field.
  const result = await env.AI.run('@cf/openai/whisper', {
    audio: [...new Uint8Array(audio)],
  })

  return result.text ?? ''
}
