/**
 * `@molecule/app-auth-modal-react` — the shared in-app login / signup /
 * upgrade flow. Mount {@link AuthModalMount} ONCE inside the app's
 * providers (where the `@molecule/app-react` auth hooks work) and every
 * in-app `/login` / `/signup` link opens the {@link AuthModal} instead of
 * navigating, while `/pricing` / `/billing` links open the upgrade flow in
 * a new tab (session auto-refreshes when the user returns) — no
 * navigation, no reload, no lost work. OAuth runs in a popup
 * (`loginViaPopup`), so social login never navigates the host either.
 *
 * @example
 * ```tsx
 * import { AuthModalMount } from '@molecule/app-auth-modal-react'
 * import { oauthConfig } from './config.js'
 *
 * // Once, inside the app's providers (e.g. in App.tsx):
 * <AuthModalMount
 *   oauthConfig={oauthConfig}
 *   onAuthenticated={() => claimGuestWork()}
 * />
 * // Every plain <a href="/login">, <a href="/signup">, <a href="/pricing">
 * // anywhere in the app is now intercepted — no other wiring needed.
 * ```
 *
 * @remarks
 * Interception is capture-phase on `document` and matches plain
 * left-clicks on `<a href>` whose resolved pathname is in `authPaths`
 * (default `/login`, `/signup`) or `upgradePaths` (default `/pricing`,
 * `/billing`) — modifier/middle clicks still navigate normally, and
 * non-anchor buttons that call `navigate()` are NOT intercepted. Hosts
 * that render pricing in-place pass `onUpgradeIntercept` and own that UI
 * + the post-upgrade session refresh. `AuthModalMount` must render inside
 * the app's auth/HTTP providers (it calls `useAuth`), and the standalone
 * `/login` & `/signup` pages should stay routed — they are the fallback
 * for modifier clicks and deep links. App-specific extras (stash a guest
 * id, claim guest work, invalidate usage) go in `onBeforeAuth` /
 * `onAuthenticated`. The modal's `auth.modal.*` strings are homed in the
 * `@molecule/app-locales-common` bond (79 languages), alongside the
 * `auth.login.*` / `auth.signup.*` keys the modal also renders.
 *
 * @module
 */

export * from './AuthModal.js'
export * from './AuthModalMount.js'
export * from './cta-intercept.js'
