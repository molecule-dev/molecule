<!--
  AuthModalMount: the Svelte counterpart of
  `@molecule/app-auth-modal-react`'s `AuthModalMount` — one mount that renders
  the (initially hidden) AuthModal and installs a capture-phase document click
  handler opening it for in-app `/login` / `/signup` links (and routing
  `/pricing` / `/billing` clicks to `onUpgradeIntercept`, else a new tab with a
  focus-return session refresh). Same props (React names), same DOM for the
  same input, same navigation calls.
-->
<script lang="ts">
  import { useAuth } from '@molecule/app-svelte'

  import AuthModal from './AuthModal.svelte'
  import {
    type AuthModalMode,
    authModeForHref,
    DEFAULT_AUTH_PATHS,
    DEFAULT_UPGRADE_PATHS,
    upgradePathForHref,
  } from './cta-intercept.js'
  import type { AuthModalMountProps } from './types.js'

  let {
    oauthConfig,
    onBeforeAuth,
    onAuthenticated,
    onUpgradeReturn,
    onUpgradeIntercept,
    captchaSlot,
    captchaSolved,
    authPaths,
    upgradePaths,
  }: AuthModalMountProps = $props()

  const { refresh } = useAuth()
  let open = $state(false)
  let mode = $state<AuthModalMode>('signup')

  /**
   * Opens the modal on the given form (React's `openAuth`).
   *
   * @param next - The form to show.
   */
  function openAuth(next: AuthModalMode): void {
    mode = next
    open = true
  }

  // Set when the user opens the upgrade/billing flow in a new tab, so we
  // refresh when they return (a completed upgrade reflects with no manual
  // reload).
  let upgradeTabOpened = false
  /**
   * The window focus return: refresh the session and run `onUpgradeReturn`,
   * but only after an upgrade tab was opened here.
   */
  function onFocus(): void {
    if (!upgradeTabOpened) return
    upgradeTabOpened = false
    refresh().catch((_error: unknown) => {
      // Best-effort freshness pass: the user may have returned without a
      // session to refresh (never logged in, or the API has no refresh
      // path) — not an error worth surfacing on a simple tab focus.
    })
    onUpgradeReturn?.()
  }

  // Intercept clicks on the in-app /login, /signup (→ modal) and /pricing,
  // /billing (→ host's onUpgradeIntercept, else a new tab) CTAs — plain
  // <a href> links from anywhere in the app, incl. ones opened with
  // target="_blank". Capture-phase + preventDefault stops navigation. Plain
  // left-clicks only — a modifier/middle click still opens the real page.
  /**
   * The capture-phase click interceptor (React's document click effect).
   *
   * @param e - The click event.
   */
  function onClick(e: MouseEvent): void {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return
    const anchor = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return
    const href = anchor.getAttribute('href')
    const origin = window.location.origin
    const authMode = authModeForHref(href, origin, authPaths ?? DEFAULT_AUTH_PATHS)
    if (authMode) {
      e.preventDefault()
      e.stopPropagation()
      openAuth(authMode)
      return
    }
    const upgradePath = upgradePathForHref(href, origin, upgradePaths ?? DEFAULT_UPGRADE_PATHS)
    if (upgradePath) {
      e.preventDefault()
      e.stopPropagation()
      if (onUpgradeIntercept) {
        onUpgradeIntercept(upgradePath)
        return
      }
      upgradeTabOpened = true
      window.open(upgradePath, '_blank', 'noopener,noreferrer')
    }
  }

  // The listeners read the current props at call time (React re-subscribes
  // when they change); the effect itself runs once per mount.
  $effect(() => {
    window.addEventListener('focus', onFocus)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('click', onClick, true)
    }
  })
</script>

<!-- Mounted only while open so the auth hooks don't run on every app render. -->
{#if open}
  <AuthModal
    {open}
    onClose={() => (open = false)}
    initialMode={mode}
    {oauthConfig}
    {onBeforeAuth}
    {onAuthenticated}
    {captchaSlot}
    {captchaSolved}
  />
{/if}
