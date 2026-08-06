/**
 * Wiring for the optional `@molecule/app-code-editor` bond.
 *
 * Its own module + subpath export so a bundler only resolves these providers when
 * an app actually imports them — see `./realtime-socketio.js` for the full
 * rationale.
 *
 * @module
 */

/** Wires `@molecule/app-code-editor-monaco` to `@molecule/app-code-editor`. */
export async function setupAppCodeEditorMonaco(): Promise<void> {
  const [{ setProvider: setEditor }, { provider }] = await Promise.all([
    import('@molecule/app-code-editor'),
    import('@molecule/app-code-editor-monaco'),
  ])
  setEditor(provider)
}
