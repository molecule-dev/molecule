/**
 * The header comment on both scripts the preview dev server injects — the page
 * client and the in-page locator runtime.
 *
 * Nothing on the page says what those two scripts are. An app that fetches its
 * own preview HTML sees `<script src="/__mol/e2e-client.js">` and
 * `<script src="/__mol/e2e-runtime.js">` pointing at 60 KB of compiled
 * machinery, and the only way to find out whether it matters is to read it: X1
 * flash-m67 spent 10 calls over 61 KB of the runtime bundle — `toBeVisible`,
 * `toBeDisabled`, the dispatch — learning nothing about its own app, because
 * the platform's statement of the app's browser contract (the supplied suite's
 * `SELECTORS.md` and its `specs/e2e/helpers/*.ts`) is somewhere else entirely.
 *
 * So the first thing in each served script says what it is, that the app must
 * not depend on it, and where the contract it was mistaken for actually lives.
 *
 * @module
 */

/**
 * The banner, as a leading block comment. It is the first thing in
 * {@link E2E_PREVIEW_CLIENT_SCRIPT} and in the served runtime script, so a
 * reader — a person, or a model looking for the app's browser contract — is
 * told what the file is before the bundle starts.
 */
export const E2E_DRIVER_BANNER = `/* molecule.dev preview test driver — served by the preview dev server, NOT part of your app.
 * This script exists so the IDE can drive the preview page it is already showing: clicks,
 * fills, assertions and navigation travel over a WebSocket to the test runner.
 * Do not import it, call it, or depend on anything on \`window\` that it sets. It is not a
 * public API, and a production build never carries it.
 * The browser contract YOUR app must satisfy is in the test suite you were given — its
 * selector/contract document (e.g. SELECTORS.md) and its helpers under specs/e2e/. Read
 * those; reading this file tells you nothing about what the tests need.
 */
`
