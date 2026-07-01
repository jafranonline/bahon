import styles from './LoadingScreen.module.css'

/** Full-screen centred spinner. Used as the router's Suspense fallback so the
 * app shows motion (not a blank screen) while a lazy route chunk loads. */
export function LoadingScreen() {
  return (
    <div className={styles.root} role="status" aria-label="Loading">
      <span className={styles.spinner} aria-hidden="true" />
    </div>
  )
}
