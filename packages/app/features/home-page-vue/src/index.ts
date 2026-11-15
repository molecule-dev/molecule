/**
 * `<Home />` (Vue) — authenticated home page with personalized greeting.
 *
 * The Vue counterpart of `@molecule/app-home-page-react`: same export, same
 * DOM for the same input. Renders a single H2 of the form
 * `{home.greeting}{name|email|home.world}!` using the universal
 * common-locale bond. Used as the default post-login landing page when the
 * app has no app-specific dashboard.
 *
 * Replaces the byte-identical `pages/Home.tsx` shipped by 19 of the 38
 * flagship apps that have an authenticated Home route. Apps that
 * override `home.greeting` per-app (e.g. note-taking's
 * "Hello, {{name}}.") get the override automatically — the page reads
 * the resolved translation, which spreads the bond default beneath
 * any per-app override.
 *
 * @example
 * ```ts
 * import { createApp, h } from 'vue'
 * import { Home } from '@molecule/app-home-page-vue'
 *
 * createApp({ render: () => h(Home) }).mount('#app')
 * ```
 *
 * @remarks
 * - Calls `useAuth()` and `useTranslation()` — both THROW unless the app is
 *   installed with `moleculePlugin` (from `@molecule/app-vue`) configured with
 *   `auth` and `i18n` (scaffolded apps do this in `main.ts`).
 * - `home.greeting` / `home.world` have NO inline English fallback: they
 *   resolve from `@molecule/app-locales-common`, which the app's i18n setup
 *   merges automatically. A custom i18n setup must register the common bond
 *   or the raw keys render on screen.
 *
 * @module
 */

export * from './Home.js'
