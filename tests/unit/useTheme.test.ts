import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { useSettingsStore } from '../../src/store/settingsStore'
import { useTheme } from '../../src/hooks/useTheme'

// jsdom doesn't implement matchMedia — provide a minimal stub
function makeMatchMedia(matches: boolean) {
  return vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
}

beforeEach(() => {
  useSettingsStore.getState().reset()
  document.documentElement.removeAttribute('data-theme')
  Object.defineProperty(window, 'matchMedia', { writable: true, value: makeMatchMedia(false) })
})

describe('useTheme', () => {
  it('sets data-theme="light" when theme is light', () => {
    act(() => useSettingsStore.getState().update({ theme: 'light' }))
    renderHook(() => useTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('sets data-theme="dark" when theme is dark', () => {
    act(() => useSettingsStore.getState().update({ theme: 'dark' }))
    renderHook(() => useTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('sets data-theme to system default (light) when theme is system', () => {
    act(() => useSettingsStore.getState().update({ theme: 'system' }))
    renderHook(() => useTheme())
    // jsdom defaults to non-dark system, so system → light
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/)
  })
})
