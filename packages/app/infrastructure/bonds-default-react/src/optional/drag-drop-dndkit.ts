/**
 * Wiring for the optional `@molecule/app-drag-drop` bond.
 *
 * Its own module + subpath export so a bundler only resolves these providers when
 * an app actually imports them — see `./realtime-socketio.js` for the full
 * rationale.
 *
 * @module
 */

/** Wires `@molecule/app-drag-drop-dndkit` to `@molecule/app-drag-drop`. */
export async function setupAppDragDropDndkit(): Promise<void> {
  const [{ setProvider: setDnd }, { provider }] = await Promise.all([
    import('@molecule/app-drag-drop'),
    import('@molecule/app-drag-drop-dndkit'),
  ])
  setDnd(provider)
}
