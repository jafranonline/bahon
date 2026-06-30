import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/global.css'
import './i18n/config'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onNeedRefresh() {
    const banner = document.createElement('div')
    banner.id = 'sw-update-banner'
    banner.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;background:#2a78d6;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;z-index:9999;font-family:sans-serif;font-size:14px'
    banner.innerHTML =
      '<span>App update available</span><button id="sw-reload-btn" style="background:#fff;color:#2a78d6;border:none;padding:6px 14px;border-radius:6px;font-weight:600;cursor:pointer">Reload</button>'
    document.body.appendChild(banner)
    document.getElementById('sw-reload-btn')?.addEventListener('click', () => {
      window.location.reload()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

