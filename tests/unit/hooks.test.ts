import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { useSettingsStore } from '../../src/store/settingsStore'
import { useUnits } from '../../src/hooks/useUnits'
import { useCurrency } from '../../src/hooks/useCurrency'

beforeEach(() => {
  useSettingsStore.getState().reset()
})

describe('useUnits', () => {
  it('formatDistance uses km by default', () => {
    const { result } = renderHook(() => useUnits())
    expect(result.current.formatDistance(100)).toBe('100 km')
  })

  it('formatDistance converts to mi when distanceUnit is mi', () => {
    act(() => useSettingsStore.getState().update({ distanceUnit: 'mi' }))
    const { result } = renderHook(() => useUnits())
    expect(result.current.formatDistance(100)).toBe('62.1 mi')
  })

  it('formatVolume uses L by default', () => {
    const { result } = renderHook(() => useUnits())
    expect(result.current.formatVolume(40)).toBe('40.0 L')
  })
})

describe('useCurrency', () => {
  it('returns BDT symbol by default', () => {
    const { result } = renderHook(() => useCurrency())
    expect(result.current.symbol).toBe('৳')
  })

  it('format returns formatted BDT amount', () => {
    const { result } = renderHook(() => useCurrency())
    expect(result.current.format(5200)).toBe('৳ 5,200')
  })

  it('format uses updated currency', () => {
    act(() => useSettingsStore.getState().update({ currency: 'USD' }))
    const { result } = renderHook(() => useCurrency())
    expect(result.current.symbol).toBe('$')
    expect(result.current.format(100)).toBe('$ 100')
  })
})
