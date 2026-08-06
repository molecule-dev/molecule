/**
 * Wiring for the optional `@molecule/app-command-palette` bond.
 *
 * Its own module + subpath export so a bundler only resolves these providers when
 * an app actually imports them — see `./realtime-socketio.js` for the full
 * rationale.
 *
 * @module
 */

/** Wires `@molecule/app-command-palette-cmdk` to `@molecule/app-command-palette`. */
export async function setupAppCommandPaletteCmdk(): Promise<void> {
  const [{ setProvider: setPalette }, { provider }] = await Promise.all([
    import('@molecule/app-command-palette'),
    import('@molecule/app-command-palette-cmdk'),
  ])
  setPalette(provider)
}
