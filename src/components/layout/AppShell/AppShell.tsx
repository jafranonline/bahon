import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Drawer } from '../Drawer'
import { SettingsDrawer } from '@components/domain/SettingsDrawer/SettingsDrawer'
import { useUIStore } from '@store/uiStore'
import { useSettingsStore } from '@store/settingsStore'
import { useTheme } from '@hooks/useTheme'
import { useNotifications } from '@hooks/useNotifications'
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

  const drawerOpen = useUIStore((s) => s.drawerOpen)
  const setDrawerOpen = useUIStore((s) => s.setDrawerOpen)

  return (
    <div className={styles.shell}>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <SettingsDrawer />
      </Drawer>
      <Outlet />
    </div>
  )
}
