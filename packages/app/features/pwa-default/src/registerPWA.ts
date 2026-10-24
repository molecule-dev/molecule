import { registerSW } from 'virtual:pwa-register'

import { t } from '@molecule/app-i18n'
import { error as logError } from '@molecule/app-logger'
import { getUpdateSummary, type UpdateSummary } from '@molecule/app-version'

const CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Registers the service worker with full PWA lifecycle management:
 * - Periodic update checks (every 5 minutes)
 * - Styled update banner with Update button and a one-line summary of the update
 * - Multi-tab coordination (all tabs reload when new SW activates)
 * - Window focus notification to SW
 * - Error recovery (unregister SW + reload on fatal errors)
 */
export function registerPWA(): void {
  if (typeof window === 'undefined') return

  // Single source of truth for the post-update reload. `updateSW(true)` skip-waits
  // the NEW worker; the browser fires `controllerchange` once it actually takes
  // control, and ONLY then do we reload — so we never reload while the OLD worker
  // (and its old precache) is still in charge. The guard makes it idempotent
  // (controllerchange can fire more than once, and in other tabs). Never
  // blind-timeout-reload: that reloaded before the swap completed and landed the
  // user back on the stale bundle after clicking Update.
  let reloading = false
  // A page with no worker yet is CLAIMED on its first visit (`clientsClaim`),
  // which fires `controllerchange` too: that is not an update, and reloading on
  // it threw away whatever the visitor had started on their very first page
  // (and every fresh browser context, so end-to-end runs saw pages reload under
  // them). Only a change FROM an existing worker is an update.
  let hadController = Boolean(navigator.serviceWorker?.controller)
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true
      return
    }
    if (reloading) return
    reloading = true
    window.location.reload()
  })

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // The banner's Update action calls this. `updateSW(true)` posts SKIP_WAITING
      // to the waiting worker; the controllerchange listener above performs the one
      // reload once the new worker is in control.
      showUpdateBanner(() => {
        void updateSW(true)
      })
      // One line on what the update brings, filled in once the new build's
      // release notes arrive (the banner shows without waiting for them).
      void getUpdateSummary().then((summary) => {
        if (summary) showUpdateSummary(summary)
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

  // (Multi-tab reload-on-activation is handled by the single guarded
  // `controllerchange` listener registered above.)

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
      } catch (_error) {
        // Ignore — if SW isn't ready, nothing to recover
      }
    }
  })
}

/**
 * Shows a styled update banner fixed to the bottom of the screen.
 * Uses the app's CSS custom properties for consistent theming. One row on
 * wide screens (headline, summary, Update); on phones the headline and Update
 * share the first row and the summary takes the full width below. The summary
 * never wraps (see {@link showUpdateSummary} for how it fits).
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
      box-sizing: border-box;
      min-height: 55px;
      padding: 8px 16px;
      padding-bottom: max(8px, env(safe-area-inset-bottom));
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
      gap: 16px;
    }
    #pwa-update-text {
      display: flex;
      align-items: baseline;
      gap: 10px;
      min-width: 0;
    }
    #pwa-update-title,
    #pwa-update-summary {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 24px;
    }
    #pwa-update-title {
      flex-shrink: 0;
      max-width: 100%;
    }
    #pwa-update-summary {
      min-width: 0;
      font-size: 16px;
      opacity: 0.75;
    }
    #pwa-update-summary[hidden] {
      display: none;
    }
    #pwa-update-btn {
      flex-shrink: 0;
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
    @media (max-width: 600px) {
      /* Phones: the headline and Update share the first row; the summary
         takes the full width below, so it fits on its one line. */
      #pwa-update-banner {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        column-gap: 12px;
        row-gap: 2px;
        align-items: center;
      }
      #pwa-update-text {
        display: contents;
      }
      #pwa-update-title {
        grid-column: 1;
        grid-row: 1;
        white-space: normal;
        font-size: 15px;
        font-weight: 600;
        line-height: 20px;
      }
      #pwa-update-summary {
        grid-column: 1 / -1;
        grid-row: 2;
        max-width: 100%;
        font-size: 13px;
        line-height: 18px;
      }
      #pwa-update-btn {
        grid-column: 2;
        grid-row: 1;
        padding: 6px 14px;
        font-size: 15px;
      }
    }
  `

  const banner = document.createElement('div')
  banner.id = 'pwa-update-banner'
  banner.setAttribute('role', 'alert')

  // Built with textContent, never innerHTML: the labels come from translated
  // locale data and the summary from commit messages, so a `<`, `&` or quote
  // character must render as text, never become markup.
  const text = document.createElement('span')
  text.id = 'pwa-update-text'
  const title = document.createElement('span')
  title.id = 'pwa-update-title'
  title.textContent = t('pwa.updateAvailable')
  const summary = document.createElement('span')
  summary.id = 'pwa-update-summary'
  summary.hidden = true
  text.append(title, summary)

  const button = document.createElement('button')
  button.id = 'pwa-update-btn'
  button.type = 'button'
  button.textContent = t('pwa.update')

  banner.append(text, button)
  document.head.appendChild(style)
  document.body.appendChild(banner)

  button.addEventListener('click', () => {
    banner.classList.add('pwa-updating')
    title.textContent = t('pwa.updating')
    onUpdate()
  })
}

/**
 * Fills in the banner's one-line summary of what the update brings: the full
 * line where it fits, the compact one ("3 features, 2 fixes, faster") where it
 * does not — re-checked when the window resizes. The full line stays available
 * as a tooltip.
 *
 * @param lines - The summary from `getUpdateSummary()`.
 */
function showUpdateSummary(lines: UpdateSummary): void {
  const summary = document.getElementById('pwa-update-summary')
  if (!summary) return
  summary.title = lines.text
  summary.hidden = false
  const fit = (): void => {
    summary.textContent = lines.text
    if (summary.scrollWidth > summary.clientWidth) summary.textContent = lines.compact
  }
  fit()
  window.addEventListener('resize', fit)
}
