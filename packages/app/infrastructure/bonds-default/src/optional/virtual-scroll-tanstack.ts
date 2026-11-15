/**
 * Wiring for the optional `@molecule/app-virtual-scroll` bond.
 *
 * Its own module + subpath export so a bundler only resolves these providers when
 * an app actually imports them — see `./realtime-socketio.js` for the full
 * rationale.
 *
 * @module
 */

/** Wires `@molecule/app-virtual-scroll-tanstack` to `@molecule/app-virtual-scroll`. */
export async function setupAppVirtualScrollTanstack(): Promise<void> {
  const [{ setProvider: setScroll }, { provider }] = await Promise.all([
    import('@molecule/app-virtual-scroll'),
    import('@molecule/app-virtual-scroll-tanstack'),
  ])
  setScroll(provider)
}
