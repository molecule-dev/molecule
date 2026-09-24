/**
 * React auth-kit components for molecule.dev.
 *
 * Exports `<OAuthButtons>` — the config-driven OAuth row for branded
 * Login/Signup pages: reads `providers` from `useOAuth(oauthConfig)`,
 * renders the "or continue with" divider + provider buttons, and owns
 * the CALLBACK half of the page-based flow (`?code&state` exchange on
 * the page it is mounted on, with a visible inline error on failure).
 *
 * NOT the same component as `OAuthButtons` from
 * `@molecule/app-oauth-buttons-react` — that lower-level primitive takes
 * an explicit `providers` list and renders only the row; this one wraps
 * it and takes the app's `oauthConfig` from `config.ts`. Structural
 * pieces only — branded layout, copy, and chrome stay at the app level.
 *
 * @example
 * ```tsx
 * import { BrowserRouter, Route, Routes, useNavigate } from 'react-router'
 *
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { OAuthButtons } from '@molecule/app-auth-ui-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import * as oauthButtonLocales from '@molecule/app-locales-oauth-buttons'
 * import { MoleculeProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(commonLocales) // divider: "Or continue with"
 * registerLocaleModule(oauthButtonLocales) // provider names + aria labels
 * const authClient = createJWTAuthClient({ baseURL: import.meta.env.VITE_API_URL })
 * const oauthConfig = { baseURL: import.meta.env.VITE_API_URL, oauthProviders: ['github', 'google'] }
 *
 * function LoginPage() {
 *   const navigate = useNavigate()
 *   // The provider redirects back to THIS page with ?code&state; the component exchanges it.
 *   return <OAuthButtons oauthConfig={oauthConfig} showLabels onSuccess={() => navigate('/dashboard')} />
 * }
 *
 * export function App() {
 *   return (
 *     <MoleculeProvider auth={authClient} i18n={getI18nProvider()}>
 *       <BrowserRouter>
 *         <Routes>
 *           <Route path="/login" element={<LoginPage />} />
 *           <Route path="/dashboard" element={<h1>Dashboard</h1>} />
 *         </Routes>
 *       </BrowserRouter>
 *     </MoleculeProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * Renders `null` when `oauthConfig` yields no providers — safe to include
 * unconditionally. Mount it on the page the OAuth provider redirects back
 * to, or the code exchange never runs. A failed exchange renders an
 * inline `role="alert"` error (`data-mol-id="oauth-error"`) and also
 * calls `onError`. Divider copy defaults to "or continue with"
 * (override via `dividerKey` / `dividerDefault`). Translations: the
 * divider's `oauth.orContinueWith` lives in `@molecule/app-locales-common`,
 * provider names/aria labels in `@molecule/app-locales-oauth-buttons` —
 * register both.
 *
 * It needs a `MoleculeProvider` with BOTH `auth` (the code exchange calls
 * `useAuthClient()`) and `i18n` (the button row calls `useTranslation()`);
 * either missing throws. `oauthConfig.oauthProviders` is the ONLY source of
 * providers — it does not ask the API which ones are enabled. Clicking a
 * button is a full-page redirect to `${baseURL}${oauthEndpoint}/<provider>`
 * (default endpoint `/oauth`); for an in-place popup flow use
 * `@molecule/app-auth-modal-react` instead. The exchange POSTs to
 * `${baseURL}/users/log-in/oauth` (override with `oauthConfig.loginEndpoint`).
 *
 * @module
 */

export * from './OAuthButtons.js'
