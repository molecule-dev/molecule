/**
 * Types for the Angular in-app auth modal + the one-mount interceptor.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

import type { UseOAuthConfig } from '@molecule/app-angular'

import type { AuthModalMode } from './cta-intercept.js'

/** Props accepted by the {@link AuthModal} component (the inputs of `mol-auth-modal`). */
export interface AuthModalProps {
  /** Whether the modal is open. */
  open: boolean
  /** Close without authenticating (backdrop / Escape / ✕). */
  onClose?: () => void
  /** Which form to open on. Defaults to `'signup'`. */
  initialMode?: AuthModalMode
  /**
   * OAuth config consumed by `useOAuth()` — `{ baseURL, oauthProviders, oauthEndpoint }`
   * from the app's `config.ts`. Drives the popup OAuth buttons.
   */
  oauthConfig: UseOAuthConfig
  /**
   * Run synchronously BEFORE any login/signup/OAuth attempt — e.g. stash the
   * guest id so the new session can claim its work. Optional.
   */
  onBeforeAuth?: () => void
  /**
   * Run AFTER a successful login/signup/OAuth (the session is already
   * refreshed), still on the same page — e.g. claim guest projects, invalidate
   * usage. Optional.
   */
  onAuthenticated?: () => void | Promise<void>
  /**
   * A human-verification challenge rendered inside the SIGNUP form, above the
   * submit button (e.g. the app's Turnstile/hCaptcha widget), as projected
   * `[slot=captchaSlot]` content or a `TemplateRef` input. Login is not gated,
   * so the slot is unmounted in login mode — which lets the widget clear its
   * own token when the user switches tabs and re-issue a fresh one on the way
   * back.
   *
   * The modal stays provider-agnostic: it renders the node and never inspects
   * it. An app whose signup API requires a challenge MUST pass `captchaSolved`
   * as well, or the form will submit without a token and the API will reject
   * it. Optional — omitted (the default for apps with no challenge) the signup
   * form is unchanged.
   */
  captchaSlot?: TemplateRef<unknown>
  /**
   * Whether the `captchaSlot` challenge is currently solved. `false` disables
   * the signup submit, so the form cannot POST a missing/expired token.
   * Defaults to `true` (no challenge → nothing to wait for). Ignored in login
   * mode.
   */
  captchaSolved?: boolean
}

/** Props accepted by the {@link AuthModalMount} component (the inputs of `mol-auth-modal-mount`). */
export interface AuthModalMountProps {
  /** OAuth config from the app's `config.ts` (drives the popup OAuth buttons). */
  oauthConfig: AuthModalProps['oauthConfig']
  /** Run before any login attempt (e.g. stash the guest id). Optional. */
  onBeforeAuth?: () => void
  /** Run after a successful login (session already refreshed). Optional. */
  onAuthenticated?: () => void | Promise<void>
  /**
   * Run when the user returns to this tab after the upgrade tab (the session
   * is already refreshed here) — e.g. invalidate usage so a budget banner
   * clears. Only fires for the default new-tab flow; irrelevant when
   * `onUpgradeIntercept` is set. Optional.
   */
  onUpgradeReturn?: () => void
  /**
   * Take over upgrade/billing CTA clicks instead of opening a new tab: called
   * with the matched upgrade path (e.g. `/pricing`), navigation already
   * prevented. The host renders its own upgrade UI (typically a modal) and
   * owns refreshing the session when that flow completes. Optional — when
   * omitted, the default new-tab flow (+ focus-return refresh) applies.
   */
  onUpgradeIntercept?: (path: string) => void
  /**
   * Human-verification challenge rendered inside the modal's SIGNUP form — see
   * `AuthModalProps.captchaSlot`. Pass it together with `captchaSolved`
   * whenever the app's signup API requires a challenge token, otherwise the
   * in-app signup POSTs without one while the standalone `/signup` page (which
   * renders its own widget) works — a mismatch the user experiences as
   * "complete the challenge" with no challenge on screen. Optional.
   */
  captchaSlot?: AuthModalProps['captchaSlot']
  /** Whether `captchaSlot` is solved; `false` disables the signup submit. Defaults to `true`. */
  captchaSolved?: boolean
  /** Override the auth path→mode map (defaults to `/login`,`/signup`). */
  authPaths?: Readonly<Record<string, AuthModalMode>>
  /** Override the upgrade paths opened in a new tab (defaults to `/pricing`,`/billing`). */
  upgradePaths?: readonly string[]
}
