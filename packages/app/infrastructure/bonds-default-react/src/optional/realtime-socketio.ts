/**
 * Wiring for the optional `@molecule/app-realtime` bond.
 *
 * Lives in its own module, reachable only via the
 * `@molecule/app-bonds-default-react/optional/realtime-socketio.js` subpath, because
 * a bundler must RESOLVE every `import()` in a module it pulls into the graph —
 * before tree-shaking can drop anything. While these wirings sat in `setup.ts`
 * (re-exported from the barrel), importing `bootstrapApp` dragged all 18 optional
 * providers into the graph, and any app that had not installed all of them failed
 * to build:
 *
 * ```
 * [vite]: Rolldown failed to resolve import "@molecule/app-maps"
 *         from ".../app-bonds-default-react/dist/setup.js"
 * ```
 *
 * One module per provider pair means an app pays for exactly the providers it
 * imports — which is what made them optional in the first place.
 *
 * @module
 */

/** Wires `@molecule/app-realtime-socketio` to `@molecule/app-realtime`. */
export async function setupAppRealtimeSocketio(): Promise<void> {
  const [{ setProvider: setRealtime }, { provider }] = await Promise.all([
    import('@molecule/app-realtime'),
    import('@molecule/app-realtime-socketio'),
  ])
  setRealtime(provider)
}
