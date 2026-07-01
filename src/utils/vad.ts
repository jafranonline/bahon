// Lightweight voice-activity detection over a live MediaStream, using the Web
// Audio API only (no model download, no dependency). Powers hands-free "live"
// voice mode: it tells the caller when an utterance starts and ends so the
// caller can record just that segment and send it for transcription.

interface VADOptions {
  onSpeechStart: () => void
  /** Fired after `silenceMs` of quiet. `longEnough` is false for sub-`minSpeechMs` blips. */
  onSpeechEnd: (longEnough: boolean) => void
  /** RMS energy (0..1) above which a frame counts as speech. */
  energyThreshold?: number
  /** Continuous quiet needed to declare the utterance over. */
  silenceMs?: number
  /** Utterances shorter than this are flagged as blips (noise, taps). */
  minSpeechMs?: number
}

export interface VADHandle {
  /** Suspend detection (e.g. while the agent is transcribing/thinking). */
  pause: () => void
  /** Resume detection after a pause. */
  resume: () => void
  /** Tear everything down and release the audio graph. */
  stop: () => void
}

type AudioCtxCtor = typeof AudioContext

/** Attach energy-based VAD to a stream. Call the returned `stop()` to clean up. */
export function createVAD(stream: MediaStream, options: VADOptions): VADHandle {
  const {
    onSpeechStart,
    onSpeechEnd,
    energyThreshold = 0.02,
    silenceMs = 900,
    minSpeechMs = 300,
  } = options

  const Ctor: AudioCtxCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: AudioCtxCtor }).webkitAudioContext
  const ctx = new Ctor()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  source.connect(analyser)

  const buf = new Uint8Array(analyser.fftSize)
  let raf = 0
  let paused = false
  let speaking = false
  let speechStart = 0
  let lastLoud = 0

  function rms(): number {
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128
      sum += v * v
    }
    return Math.sqrt(sum / buf.length)
  }

  function tick() {
    raf = requestAnimationFrame(tick)
    if (paused) return
    const now = performance.now()
    const loud = rms() > energyThreshold

    if (loud) {
      lastLoud = now
      if (!speaking) {
        speaking = true
        speechStart = now
        onSpeechStart()
      }
    } else if (speaking && now - lastLoud >= silenceMs) {
      speaking = false
      onSpeechEnd(lastLoud - speechStart >= minSpeechMs)
    }
  }

  // Autoplay policy: a suspended context won't produce data until resumed.
  void ctx.resume().catch(() => {})
  raf = requestAnimationFrame(tick)

  return {
    pause() {
      paused = true
      // If we were mid-utterance when paused, close it out cleanly.
      if (speaking) {
        speaking = false
        onSpeechEnd(lastLoud - speechStart >= minSpeechMs)
      }
    },
    resume() {
      paused = false
      speaking = false
    },
    stop() {
      cancelAnimationFrame(raf)
      try {
        source.disconnect()
        analyser.disconnect()
      } catch {
        /* already torn down */
      }
      void ctx.close().catch(() => {})
    },
  }
}
