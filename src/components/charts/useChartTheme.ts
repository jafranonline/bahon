import { useEffect, useState } from 'react'

export interface ChartThemeColors {
  textMuted: string
  border: string
  accent: string
}

/**
 * Chart.js renders to <canvas>, which cannot resolve CSS custom properties —
 * passing 'var(--text-muted)' silently falls back to the canvas default, so
 * axis ticks and grid lines ignored the theme entirely. This hook resolves the
 * needed tokens to concrete colors and re-resolves when the theme attribute
 * on <html> changes, so charts follow light/dark like the rest of the app.
 */
function resolveColors(): ChartThemeColors {
  const style = getComputedStyle(document.documentElement)
  return {
    textMuted: style.getPropertyValue('--text-muted').trim(),
    border: style.getPropertyValue('--border').trim(),
    accent: style.getPropertyValue('--accent').trim(),
  }
}

export function useChartTheme(): ChartThemeColors {
  const [colors, setColors] = useState(resolveColors)
  useEffect(() => {
    const observer = new MutationObserver(() => setColors(resolveColors()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return colors
}
