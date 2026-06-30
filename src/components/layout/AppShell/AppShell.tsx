import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useSettingsStore } from '@store/settingsStore'
import { useTheme } from '@hooks/useTheme'
import { useNotifications } from '@hooks/useNotifications'
import { InstallBanner } from '../InstallBanner/InstallBanner'
import i18n from '@i18n/config'
import styles from './AppShell.module.css'

export function AppShell() {
  useTheme()

  const language = useSettingsStore((s) => s.language)
  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language)
    }
  }, [language])

  const { requestPermission } = useNotifications()
  void requestPermission()

  return (
    <div className={styles.shell}>
      <Outlet />
      <InstallBanner />
    </div>
  )
}
