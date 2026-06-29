import { useEffect } from 'react'
import { useSettingsStore } from '@store/settingsStore'

export function useTheme() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    const html = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      html.setAttribute('data-theme', resolved)
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
