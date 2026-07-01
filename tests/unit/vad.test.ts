import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createVAD } from '../../src/utils/vad'

// A controllable fake Web Audio graph: `level` (0..127 offset from 128) sets the
// simulated loudness read back by getByteTimeDomainData. `requestAnimationFrame`
// is stubbed so the test drives ticks one frame at a time via `frame()`.

let level = 0
let now = 0
let rafCb: FrameRequestCallback | null = null

class FakeAnalyser {
  fftSize = 512
  connect() {}
  disconnect() {}
  getByteTimeDomainData(buf: Uint8Array) {
    for (let i = 0; i < buf.length; i++) buf[i] = 128 + level
  }
}
class FakeAudioContext {
  createMediaStreamSource() {
    return { connect() {}, disconnect() {} }
  }
  createAnalyser() {
    return new FakeAnalyser()
  }
  resume() {
    return Promise.resolve()
  }
  close() {
    return Promise.resolve()
  }
}

/** Advance one animation frame at the given loudness and clock time. */
function frame(loudOffset: number, timeMs: number) {
  level = loudOffset
  now = timeMs
  rafCb?.(timeMs)
}

beforeEach(() => {
  level = 0
  now = 0
  rafCb = null
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCb = cb
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.spyOn(performance, 'now').mockImplementation(() => now)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const stream = {} as MediaStream

describe('createVAD', () => {
  it('fires onSpeechStart on loud onset and onSpeechEnd(true) after a full utterance', () => {
    const onSpeechStart = vi.fn()
    const onSpeechEnd = vi.fn()
    createVAD(stream, { onSpeechStart, onSpeechEnd }) // defaults: silence 900ms, minSpeech 300ms

    frame(0, 0) // quiet — nothing
    expect(onSpeechStart).not.toHaveBeenCalled()

    frame(40, 100) // loud → start
    expect(onSpeechStart).toHaveBeenCalledTimes(1)

    frame(40, 500) // still loud
    frame(0, 600) // quiet, only 100ms since last loud → not ended yet
    expect(onSpeechEnd).not.toHaveBeenCalled()

    frame(0, 1500) // 1000ms of quiet ≥ 900 → end; spoke 400ms ≥ 300 → longEnough
    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    expect(onSpeechEnd).toHaveBeenCalledWith(true)
  })

  it('flags a sub-minSpeech blip as not long enough', () => {
    const onSpeechEnd = vi.fn()
    createVAD(stream, { onSpeechStart: vi.fn(), onSpeechEnd })

    frame(40, 100) // brief loud blip
    frame(0, 200)
    frame(0, 1100) // ≥900ms quiet → end; spoke 0ms < 300 → false
    expect(onSpeechEnd).toHaveBeenCalledWith(false)
  })

  it('does not re-detect the same utterance twice', () => {
    const onSpeechStart = vi.fn()
    createVAD(stream, { onSpeechStart, onSpeechEnd: vi.fn() })
    frame(40, 100)
    frame(40, 200)
    frame(40, 300)
    expect(onSpeechStart).toHaveBeenCalledTimes(1)
  })

  it('pause() closes an in-progress utterance', () => {
    const onSpeechEnd = vi.fn()
    const vad = createVAD(stream, { onSpeechStart: vi.fn(), onSpeechEnd })
    frame(40, 100) // start speaking (400ms will elapse before pause)
    frame(40, 500)
    vad.pause()
    expect(onSpeechEnd).toHaveBeenCalledTimes(1)
    expect(onSpeechEnd).toHaveBeenCalledWith(true)
  })
})
