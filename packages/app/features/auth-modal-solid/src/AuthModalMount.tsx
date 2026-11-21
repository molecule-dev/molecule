/**
 * One-mount in-app auth + upgrade flow for any Molecule app.
 *
 * Solid counterpart of `@molecule/app-auth-modal-react`'s `AuthModalMount`:
 * the same props (React names), the same DOM for the same input, and the same
 * navigation calls.
 *
 * Mount `<AuthModalMount oauthConfig={oauthConfig} />` once inside the app's
 * providers (where the auth primitives work) and every in-app `/login` /
 * `/signup` link opens the {@link AuthModal} instead of navigating, while
 * `/pricing` / `/billing` links open the upgrade flow WITHOUT navigating the
 * current tab — so the user never loses their place or work. By default the
 * upgrade flow opens in a new tab, and on returning from that tab the session
 * is refreshed in place so a completed upgrade reflects without a manual
 * reload. A host that prefers to keep the user fully in place (e.g. an IDE
 * showing pricing in its own modal) passes `onUpgradeIntercept` to receive the
 * click instead — it then owns rendering the upgrade UI and refreshing the
 * session afterwards.
 *
 * @module
 */

import { type Component, createSignal, onCleanup, onMount, Show } from 'solid-js'

import { useAuth } from '@molecule/app-solid'

import { AuthModal, type AuthModalProps } from './AuthModal.jsx'
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
  /**
   * Human-verification challenge rendered inside the modal's SIGNUP form — see
   * {@link AuthModalProps.captchaSlot}. Pass it together with
   * {@link AuthModalMountProps.captchaSolved} whenever the app's signup API
   * requires a challenge token, otherwise the in-app signup POSTs without one
   * while the standalone `/signup` page (which renders its own widget) works —
   * a mismatch the user experiences as "complete the challenge" with no
   * challenge on screen. Optional.
   */
  captchaSlot?: AuthModalProps['captchaSlot']
  /** Whether {@link AuthModalMountProps.captchaSlot} is solved; `false` disables the signup submit. Defaults to `true`. */
  captchaSolved?: boolean
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
export const AuthModalMount: Component<AuthModalMountProps> = (props) => {
  const { refresh } = useAuth()
  const [open, setOpen] = createSignal(false)
  const [mode, setMode] = createSignal<AuthModalMode>('signup')
  const openAuth = (next: AuthModalMode): void => {
    setMode(next)
    setOpen(true)
  }

  // Set when the user opens the upgrade/billing flow in a new tab, so we refresh
  // when they return (a completed upgrade reflects with no manual reload).
  let upgradeTabOpened = false
  const onFocus = (): void => {
    if (!upgradeTabOpened) return
    upgradeTabOpened = false
    refresh().catch((_error: unknown) => {
      // Best-effort freshness pass: the user may have returned without a
      // session to refresh (never logged in, or the API has no refresh
      // path) — not an error worth surfacing on a simple tab focus.
    })
    props.onUpgradeReturn?.()
  }

  // Intercept clicks on the in-app /login, /signup (→ modal) and /pricing, /billing
  // (→ host's onUpgradeIntercept, else a new tab) CTAs — plain <a href> links from
  // anywhere in the app, incl. ones opened with target="_blank". Capture-phase +
  // preventDefault stops navigation. Plain left-clicks only — a modifier/middle
  // click still opens the real page.
  const onClick = (e: MouseEvent): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return
    const anchor = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return
    const href = anchor.getAttribute('href')
    const origin = window.location.origin
    const authMode = authModeForHref(href, origin, props.authPaths ?? DEFAULT_AUTH_PATHS)
    if (authMode) {
      e.preventDefault()
      e.stopPropagation()
      openAuth(authMode)
      return
    }
    const upgradePath = upgradePathForHref(
      href,
      origin,
      props.upgradePaths ?? DEFAULT_UPGRADE_PATHS,
    )
    if (upgradePath) {
      e.preventDefault()
      e.stopPropagation()
      if (props.onUpgradeIntercept) {
        props.onUpgradeIntercept(upgradePath)
        return
      }
      upgradeTabOpened = true
      window.open(upgradePath, '_blank', 'noopener,noreferrer')
    }
  }

  onMount(() => {
    window.addEventListener('focus', onFocus)
    document.addEventListener('click', onClick, true)
  })
  onCleanup(() => {
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('click', onClick, true)
  })

  // Mounted only while open so the auth primitives don't run on every app render.
  return (
    <Show when={open()}>
      <AuthModal
        open={open()}
        onClose={() => setOpen(false)}
        initialMode={mode()}
        oauthConfig={props.oauthConfig}
        onBeforeAuth={props.onBeforeAuth}
        onAuthenticated={props.onAuthenticated}
        captchaSlot={props.captchaSlot}
        captchaSolved={props.captchaSolved}
      />
    </Show>
  )
}
