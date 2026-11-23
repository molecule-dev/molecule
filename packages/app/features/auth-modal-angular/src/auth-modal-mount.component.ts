/**
 * AuthModalMount component (React parity).
 *
 * @module
 */

import { Component, type OnDestroy, type OnInit, signal } from '@angular/core'

import { useAuth, useHostPresence } from '@molecule/app-angular'

import { AuthModal } from './auth-modal.component.js'
import {
  type AuthModalMode,
  authModeForHref,
  DEFAULT_AUTH_PATHS,
  DEFAULT_UPGRADE_PATHS,
  upgradePathForHref,
} from './cta-intercept.js'

/**
 * AuthModalMount component.
 *
 * One-mount in-app auth + upgrade flow: renders the (initially hidden)
 * AuthModal and installs a capture-phase document click handler that opens it
 * for in-app `/login` / `/signup` links (and routes `/pricing` / `/billing`
 * clicks to `onUpgradeIntercept`, else a new tab whose return refreshes the
 * session in place). The host is unwrapped (`data-parity-unwrap`,
 * `display: contents`) and out of the DOM while React renders nothing
 * (`open` false, through `useHostPresence`), so a closed mount leaves no
 * element behind.
 */
@Component({
  selector: 'mol-auth-modal-mount',
  standalone: true,
  imports: [AuthModal],
  inputs: [
    'oauthConfig',
    'onClose',
    'onBeforeAuth',
    'onAuthenticated',
    'onUpgradeReturn',
    'onUpgradeIntercept',
    'captchaSlot',
    'captchaSolved',
    'authPaths',
    'upgradePaths',
  ],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `@if (open()) {<mol-auth-modal [open]="true" [onClose]="close" [initialMode]="mode()" [oauthConfig]="oauthConfig" [onBeforeAuth]="onBeforeAuth" [onAuthenticated]="onAuthenticated" [captchaSolved]="captchaSolved"><ng-container ngProjectAs="[slot=captchaSlot]"><ng-content select="[slot=captchaSlot]"></ng-content></ng-container></mol-auth-modal>}`,
})
export class AuthModalMount implements OnInit, OnDestroy {
  /** OAuth config from the app's `config.ts` (drives the popup OAuth buttons). */
  oauthConfig?: AuthModal['oauthConfig']
  /** Close without authenticating — accepted for parity with the modal's props. Optional. */
  onClose?: () => void
  /** Run before any login attempt (e.g. stash the guest id). Optional. */
  onBeforeAuth?: () => void
  /** Run after a successful login (session already refreshed). Optional. */
  onAuthenticated?: () => void | Promise<void>
  /**
   * Run when the user returns to this tab after the upgrade tab (the session
   * is already refreshed here). Only fires for the default new-tab flow.
   * Optional.
   */
  onUpgradeReturn?: () => void
  /**
   * Take over upgrade/billing CTA clicks instead of opening a new tab: called
   * with the matched upgrade path, navigation already prevented. Optional —
   * when omitted, the default new-tab flow (+ focus-return refresh) applies.
   */
  onUpgradeIntercept?: (path: string) => void
  /** Human-verification challenge for the modal's SIGNUP form. Optional. */
  captchaSlot?: AuthModal['captchaSlot']
  /** Whether `captchaSlot` is solved; `false` disables the signup submit. Defaults to `true`. */
  captchaSolved?: boolean
  /** Override the auth path→mode map (defaults to `/login`,`/signup`). */
  authPaths?: Readonly<Record<string, AuthModalMode>>
  /** Override the upgrade paths opened in a new tab (defaults to `/pricing`,`/billing`). */
  upgradePaths?: readonly string[]

  private readonly auth = useAuth()

  /** Whether the modal is mounted (React's `open` state). */
  readonly open = signal(false)
  /** Which form the modal opens on (React's `mode` state). */
  readonly mode = signal<AuthModalMode>('signup')

  /** Set when the user opens the upgrade/billing flow in a new tab, so we refresh when they return. */
  private upgradeTabOpened = false

  constructor() {
    // Leaves no element in the page while closed (React renders nothing). The open
    // signal is written from a document listener, which refreshes only this view.
    useHostPresence(() => this.open())
  }

  /** Opens the modal on the given form (React's `openAuth`). */
  private openAuth(next: AuthModalMode): void {
    this.mode.set(next)
    this.open.set(true)
  }

  /**
   * The window focus return: refresh the session and run `onUpgradeReturn`,
   * but only after an upgrade tab was opened here.
   */
  private readonly onFocus = (): void => {
    if (!this.upgradeTabOpened) return
    this.upgradeTabOpened = false
    this.auth.refresh().catch((_error: unknown) => {
      // Best-effort freshness pass: the user may have returned without a
      // session to refresh (never logged in, or the API has no refresh
      // path) — not an error worth surfacing on a simple tab focus.
    })
    this.onUpgradeReturn?.()
  }

  /**
   * The capture-phase click interceptor (React's document click effect).
   * Handlers read the current inputs at call time, the way React's
   * re-subscribed effect does.
   */
  private readonly onClick = (e: MouseEvent): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return
    const anchor = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return
    const href = anchor.getAttribute('href')
    const origin = window.location.origin
    const authMode = authModeForHref(href, origin, this.authPaths ?? DEFAULT_AUTH_PATHS)
    if (authMode) {
      e.preventDefault()
      e.stopPropagation()
      this.openAuth(authMode)
      return
    }
    const upgradePath = upgradePathForHref(href, origin, this.upgradePaths ?? DEFAULT_UPGRADE_PATHS)
    if (upgradePath) {
      e.preventDefault()
      e.stopPropagation()
      if (this.onUpgradeIntercept) {
        this.onUpgradeIntercept(upgradePath)
        return
      }
      this.upgradeTabOpened = true
      window.open(upgradePath, '_blank', 'noopener,noreferrer')
    }
  }

  /** Installs the document/window listeners (React's mount effect). */
  ngOnInit(): void {
    window.addEventListener('focus', this.onFocus)
    document.addEventListener('click', this.onClick, true)
  }

  /** Removes the document/window listeners (React's effect cleanup). */
  ngOnDestroy(): void {
    window.removeEventListener('focus', this.onFocus)
    document.removeEventListener('click', this.onClick, true)
  }

  /** Closes the modal (React's `setOpen(false)`). */
  close(): void {
    this.open.set(false)
  }
}
