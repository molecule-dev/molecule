/**
 * One-mount in-app auth + upgrade flow for any Molecule app.
 *
 * Mount `<AuthModalMount oauthConfig={oauthConfig} />` once inside the app's
 * providers (where the auth hooks work) and every in-app `/login` / `/signup`
 * link opens the {@link AuthModal} instead of navigating, while `/pricing` /
 * `/billing` links open the upgrade flow WITHOUT navigating the current tab —
 * so the user never loses their place or work. By default the upgrade flow
 * opens in a new tab, and on returning from that tab the session is refreshed
 * in place so a completed upgrade reflects without a manual reload. A host that
 * prefers to keep the user fully in place (e.g. an IDE showing pricing in its
 * own modal) passes `onUpgradeIntercept` to receive the click instead — it then
 * owns rendering the upgrade UI and refreshing the session afterwards.
 *
 * Nothing here is app-specific by default; an app injects extras (claim guest
 * work, invalidate usage, stash a guest id) via the optional hooks.
 *
 * @module
 */

import { type JSX, useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@molecule/app-react'

import { AuthModal, type AuthModalProps } from './AuthModal.js'
import {
  type AuthModalMode,
  authModeForHref,
  DEFAULT_AUTH_PATHS,
  DEFAULT_UPGRADE_PATHS,
  upgradePathForHref,
} from './cta-intercept.js'

/** Props for {@link AuthModalMount}. */
export interface AuthModalMountProps {
  /** OAuth config from the app's `config.ts` (drives the popup OAuth buttons). */
  oauthConfig: AuthModalProps['oauthConfig']
  /** Run before any login attempt (e.g. stash the guest id). Optional. */
  onBeforeAuth?: () => void
  /** Run after a successful login (session already refreshed). Optional. */
  onAuthenticated?: () => void | Promise<void>
  /**
   * Run when the user returns to this tab after the upgrade tab (the session is
   * already refreshed here) — e.g. invalidate usage so a budget banner clears.
   * Only fires for the default new-tab flow; irrelevant when
   * {@link AuthModalMountProps.onUpgradeIntercept} is set. Optional.
   */
  onUpgradeReturn?: () => void
  /**
   * Take over upgrade/billing CTA clicks instead of opening a new tab: called
   * with the matched upgrade path (e.g. `/pricing`), navigation already
   * prevented. The host renders its own upgrade UI (typically a modal) and owns
   * refreshing the session when that flow completes. Optional — when omitted,
   * the default new-tab flow (+ focus-return refresh) applies.
   */
  onUpgradeIntercept?: (path: string) => void
  /** Override the auth path→mode map (defaults to `/login`,`/signup`). */
  authPaths?: Readonly<Record<string, AuthModalMode>>
  /** Override the upgrade paths opened in a new tab (defaults to `/pricing`,`/billing`). */
  upgradePaths?: readonly string[]
}

/**
 * Mounts the in-app auth modal + the CTA click-interceptor: renders the (initially hidden) AuthModal and installs a capture-phase document click handler that opens it for in-app `/login`/`/signup` links (and routes `/pricing`/`/billing` clicks to the upgrade flow). Mount ONCE inside the app providers.
 *
 * @param props - {@link AuthModalMountProps}.
 * @returns The (lazily-mounted) auth modal element.
 */
export function AuthModalMount({
  oauthConfig,
  onBeforeAuth,
  onAuthenticated,
  onUpgradeReturn,
  onUpgradeIntercept,
  authPaths = DEFAULT_AUTH_PATHS,
  upgradePaths = DEFAULT_UPGRADE_PATHS,
}: AuthModalMountProps): JSX.Element {
  const { refresh } = useAuth()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthModalMode>('signup')
  const openAuth = useCallback((next: AuthModalMode) => {
    setMode(next)
    setOpen(true)
  }, [])

  // Set when the user opens the upgrade/billing flow in a new tab, so we refresh
  // when they return (a completed upgrade reflects with no manual reload).
  const upgradeTabOpenedRef = useRef(false)
  useEffect(() => {
    const onFocus = (): void => {
      if (!upgradeTabOpenedRef.current) return
      upgradeTabOpenedRef.current = false
      void refresh()
      onUpgradeReturn?.()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh, onUpgradeReturn])

  // Intercept clicks on the in-app /login, /signup (→ modal) and /pricing, /billing
  // (→ host's onUpgradeIntercept, else a new tab) CTAs — plain <a href> links from
  // anywhere in the app, incl. ones opened with target="_blank". Capture-phase +
  // preventDefault stops navigation. Plain left-clicks only — a modifier/middle
  // click still opens the real page.
  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return
      const anchor = (e.target as HTMLElement | null)?.closest(
        'a[href]',
      ) as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href')
      const origin = window.location.origin
      const authMode = authModeForHref(href, origin, authPaths)
      if (authMode) {
        e.preventDefault()
        e.stopPropagation()
        openAuth(authMode)
        return
      }
      const upgradePath = upgradePathForHref(href, origin, upgradePaths)
      if (upgradePath) {
        e.preventDefault()
        e.stopPropagation()
        if (onUpgradeIntercept) {
          onUpgradeIntercept(upgradePath)
          return
        }
        upgradeTabOpenedRef.current = true
        window.open(upgradePath, '_blank', 'noopener,noreferrer')
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [openAuth, authPaths, upgradePaths, onUpgradeIntercept])

  // Mounted only while open so the auth hooks don't run on every app render.
  return open ? (
    <AuthModal
      open={open}
      onClose={() => setOpen(false)}
      initialMode={mode}
      oauthConfig={oauthConfig}
      onBeforeAuth={onBeforeAuth}
      onAuthenticated={onAuthenticated}
    />
  ) : (
    <></>
  )
}

AuthModalMount.displayName = 'AuthModalMount'
