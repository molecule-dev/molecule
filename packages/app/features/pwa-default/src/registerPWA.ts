import { registerSW } from 'virtual:pwa-register'

import { t } from '@molecule/app-i18n'
import { error as logError } from '@molecule/app-logger'

const CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
const UPDATE_TIMEOUT = 5000 // 5 seconds

/**
 * Registers the service worker with full PWA lifecycle management:
 * - Periodic update checks (every 5 minutes)
 * - Styled update banner with Update button
 * - Multi-tab coordination (all tabs reload when new SW activates)
 * - Window focus notification to SW
 * - Error recovery (unregister SW + reload on fatal errors)
 */
export function registerPWA(): void {
  if (typeof window === 'undefined') return

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdateBanner(() => {
        updateSW(true)
        // Fallback: if update doesn't trigger reload within 5s, force reload
        setTimeout(() => window.location.reload(), UPDATE_TIMEOUT)
      })
    },
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every 5 minutes
      if (registration) {
        setInterval(() => registration.update(), CHECK_INTERVAL)
      }
    },
    onRegisterError(error) {
      logError('SW registration failed:', error)
    },
  })

  // Notify SW when window regains focus (triggers update check)
  window.addEventListener('focus', () => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'WINDOW_FOCUSED' })
    }
  })

  // Multi-tab: reload when a new SW takes control
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    window.location.reload()
  })

  // Error recovery: if a fatal error occurs and a SW update is pending,
  // unregister the broken SW and reload to get fresh code
  window.addEventListener('error', async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        if (registration.installing || registration.waiting) {
          await registration.unregister()
          window.location.reload()
        }
      } catch {
        // Ignore — if SW isn't ready, nothing to recover
      }
    }
  })
}

/**
 * Shows a styled update banner fixed to the bottom of the screen.
 * Uses the app's CSS custom properties for consistent theming.
 */
function showUpdateBanner(onUpdate: () => void): void {
  // Avoid duplicates
  if (document.getElementById('pwa-update-banner')) return

  const style = document.createElement('style')
  style.id = 'pwa-update-style'
  style.textContent = `
    @keyframes pwa-slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    #pwa-update-banner {
      position: fixed;
      z-index: 9999;
      bottom: 0;
      left: 0;
      right: 0;
      height: 55px;
      padding: 10px;
      text-align: center;
      background: var(--color-surface, #1c1c1c);
      border-top: 1px solid var(--color-border, #292929);
      color: var(--color-foreground, #e0e0e0);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 18px;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
      animation: pwa-slide-up 0.3s ease-out;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    #pwa-update-banner span {
      line-height: 35px;
    }
    #pwa-update-btn {
      padding: 6px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: var(--color-success, #309000);
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
    }
    #pwa-update-btn:hover {
      opacity: 0.9;
    }
    #pwa-update-banner.pwa-updating {
      pointer-events: none;
      opacity: 0.7;
    }
    #pwa-update-banner.pwa-updating #pwa-update-btn {
      opacity: 0.5;
    }
  `

  const banner = document.createElement('div')
  banner.id = 'pwa-update-banner'
  banner.setAttribute('role', 'alert')
  banner.innerHTML = `
    <span>${t('pwa.updateAvailable')}</span>
    <button id="pwa-update-btn">${t('pwa.update')}</button>
  `

  document.head.appendChild(style)
  document.body.appendChild(banner)

  document.getElementById('pwa-update-btn')!.addEventListener('click', () => {
    banner.classList.add('pwa-updating')
    banner.querySelector('span')!.textContent = t('pwa.updating')
    onUpdate()
  })
}
