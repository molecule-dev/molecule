/**
 * The mock server in the browser: answer `/api/*` from a bundled fixture set
 * (`createFixtureFetch`) and install it as the page's `fetch` with a demo
 * session (`installFixtureFetch`). Browser-safe — import it from a static
 * build's entry, never from server code paths that need the Express server.
 * @module
 */

export * from './fixture-fetch.js'
export * from './install.js'
