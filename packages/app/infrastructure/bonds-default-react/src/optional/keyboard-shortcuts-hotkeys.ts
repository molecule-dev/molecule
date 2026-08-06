/**
 * Wiring for the optional `@molecule/app-keyboard-shortcuts` bond.
 *
 * Its own module + subpath export so a bundler only resolves these providers when
 * an app actually imports them — see `./realtime-socketio.js` for the full
 * rationale.
 *
 * @module
 */

/** Wires `@molecule/app-keyboard-shortcuts-hotkeys` to `@molecule/app-keyboard-shortcuts`. */
export async function setupAppKeyboardShortcutsHotkeys(): Promise<void> {
  const [{ setProvider: setKbd }, { provider }] = await Promise.all([
    import('@molecule/app-keyboard-shortcuts'),
    import('@molecule/app-keyboard-shortcuts-hotkeys'),
  ])
  setKbd(provider)
}
