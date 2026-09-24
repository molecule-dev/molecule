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
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { AuthModalMount } from '@molecule/app-auth-modal-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import { setIconSet } from '@molecule/app-icons'
 * import { iconSet } from '@molecule/app-icons-molecule'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { MoleculeProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once, at module scope.
 * setClassMap(classMap)
 * setIconSet(iconSet) // the modal's close/success icons throw without it
 * registerLocaleModule(commonLocales) // the modal's `auth.*` strings
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 * const oauthConfig = { baseURL: '/api', oauthProviders: ['github', 'google'] }
 *
 * export function App() {
 *   // Plain `<a href>` links — the mount intercepts them; no onClick wiring needed.
 *   return (
 *     <MoleculeProvider auth={authClient} i18n={getI18nProvider()}>
 *       <AuthModalMount
 *         oauthConfig={oauthConfig}
 *         onAuthenticated={() => console.log('signed in:', authClient.getUser()?.email)}
 *       />
 *       <nav>
 *         <a href="/login">Log in</a>
 *         <a href="/signup">Sign up</a>
 *         <a href="/pricing">Upgrade</a>
 *       </nav>
 *     </MoleculeProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * **Startup wiring it cannot render without:** `setClassMap(...)` (from
 * `@molecule/app-ui`), `setIconSet(...)` (from `@molecule/app-icons` — the
 * modal's close/success icons throw "No icon set bonded" otherwise), and a
 * `MoleculeProvider` (from `@molecule/app-react`) passing BOTH `auth` and
 * `i18n` — the form's error text goes through `useTranslation()`, which
 * throws with no i18n provider mounted. The modal renders nothing until a
 * link is clicked, so a missing piece only surfaces on the first click.
 *
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
 * If the signup API requires a human-verification challenge (Turnstile /
 * hCaptcha), pass BOTH `captchaSlot` (the widget, rendered in the signup
 * form) and `captchaSolved` (which gates the submit). Rendering the widget
 * on the standalone `/signup` page alone is NOT enough: this modal is what
 * a `/signup` link actually opens, so the in-app signup would POST with no
 * token and the API would answer "complete the verification challenge"
 * while no challenge is on screen. Login is not gated, so the slot is
 * unmounted in login mode.
 *
 * @module
 */

export * from './AuthModal.js'
export * from './AuthModalMount.js'
export * from './cta-intercept.js'
