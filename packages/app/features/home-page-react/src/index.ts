/**
 * `<Home />` — authenticated home page with personalized greeting.
 *
 * Renders a single H2 of the form `{home.greeting}{name|email|home.world}!`
 * using the universal common-locale bond. Used as the default
 * post-login landing page when the app has no app-specific dashboard.
 *
 * Replaces the byte-identical `pages/Home.tsx` shipped by 19 of the 38
 * flagship apps that have an authenticated Home route. Apps that
 * override `home.greeting` per-app (e.g. note-taking's
 * "Hello, {{name}}.") get the override automatically — the page reads
 * the resolved translation, which spreads the bond default beneath
 * any per-app override.
 *
 * @example
 * ```tsx
 * import { Home } from '@molecule/app-home-page-react'
 *
 * <Route path="/" element={<Home />} />
 * ```
 *
 * @module
 */

export * from './Home.js'
