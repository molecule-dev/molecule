/**
 * Wiring for the optional `@molecule/app-video` bond.
 *
 * Its own module + subpath export so a bundler only resolves these providers when
 * an app actually imports them — see `./realtime-socketio.js` for the full
 * rationale.
 *
 * @module
 */

/** Wires `@molecule/app-video-hls` (hls.js — HLS streaming everywhere) to `@molecule/app-video`. */
export async function setupAppVideoHls(): Promise<void> {
  const [{ setProvider: setVideo }, { provider }] = await Promise.all([
    import('@molecule/app-video'),
    import('@molecule/app-video-hls'),
  ])
  setVideo(provider)
}
