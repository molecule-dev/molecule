/**
 * Wiring for the optional `@molecule/app-client-search` bond.
 *
 * Its own module + subpath export so a bundler only resolves these providers when
 * an app actually imports them — see `./realtime-socketio.js` for the full
 * rationale.
 *
 * @module
 */

/** Wires `@molecule/app-client-search-minisearch` to `@molecule/app-client-search`. */
export async function setupAppClientSearchMinisearch(): Promise<void> {
  const [{ setProvider: setSearch }, { provider }] = await Promise.all([
    import('@molecule/app-client-search'),
    import('@molecule/app-client-search-minisearch'),
  ])
  setSearch(provider)
}
