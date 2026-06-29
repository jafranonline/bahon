import { Outlet } from 'react-router-dom'
import { Drawer } from '../Drawer'
import { useUIStore } from '@store/uiStore'
import { useTheme } from '@hooks/useTheme'
import { useNotifications } from '@hooks/useNotifications'
import styles from './AppShell.module.css'

export function AppShell() {
  useTheme()

  const { requestPermission } = useNotifications()
  // Request notification permission once on mount (non-blocking)
  void requestPermission()

  const drawerOpen = useUIStore((s) => s.drawerOpen)
  const setDrawerOpen = useUIStore((s) => s.setDrawerOpen)

  return (
    <div className={styles.shell}>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className={styles.drawerContent}>
          <p className={styles.drawerTitle}>Bahon</p>
        </div>
      </Drawer>
      <Outlet />
    </div>
  )
}
