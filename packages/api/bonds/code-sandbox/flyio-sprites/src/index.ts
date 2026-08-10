/**
 * Fly Sprites (sprites.dev) code sandbox provider.
 *
 * Sprites are persistent, hardware-isolated Linux environments purpose-built
 * for agent/dev workloads: the filesystem persists for the sprite's lifetime
 * (NVMe while running, object storage while cold), sleeping sprites wake
 * automatically on the next request, every sprite gets its own HTTPS URL, and
 * outbound traffic is governed by a DNS-based network policy. This bond maps
 * that platform onto the `@molecule/api-code-sandbox` contract through the
 * official `@fly/sprites` SDK.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { provider } from '@molecule/api-code-sandbox-flyio-sprites'
 *
 * bond('codeSandbox', provider)
 * // Requires SPRITE_TOKEN in the environment (see `sprite org auth`).
 * ```
 *
 * @example
 * ```typescript
 * import { createProvider, ensureService } from '@molecule/api-code-sandbox-flyio-sprites'
 *
 * const provider = createProvider({
 *   namePrefix: 'mol-',
 *   urlAuth: 'public',
 *   defaultNetworkRules: [
 *     { domain: 'registry.npmjs.org', action: 'allow' },
 *     { domain: 'github.com', action: 'allow' },
 *   ],
 * })
 * const sandbox = await provider.create({ projectId, env: { NODE_ENV: 'development' } })
 * ```
 *
 * @remarks
 * Traps a consumer must know, each observed against the real platform:
 *
 * - **`templateId` THROWS.** Sprite checkpoints are per-sprite overlay
 *   snapshots and cannot seed a different sprite, so there is no cross-sprite
 *   template mechanism. Fast cold starts come from a pre-warmed sprite pool
 *   (create + install ahead of demand, adopt on project create), not from
 *   templates.
 * - **`start`/`stop`/`sleep`/`wake` are no-ops.** Sprites sleep and wake
 *   themselves; a `stopped` (cold) sprite still auto-wakes on the next
 *   request — it is not dead, just slower to resume.
 * - **`volumeName`/`volumeMountPath` are ignored.** The sprite filesystem is
 *   already persistent; there is no separate volume to mount.
 * - **The preview URL routes to the service that claims `http_port`** (see
 *   `ensureService`) — `getPreviewUrl(port)` cannot vary by port.
 * - **A `PUT` on a RUNNING service is silently ignored** (`Service already
 *   running with that command`), and the public `/restart` path 404s. Use
 *   `ensureService`, which stops/redefines/verifies, instead of raw service
 *   calls.
 * - **Vite must allow `.sprites.app`.** The provider writes
 *   `VITE_ALLOWED_HOSTS=.sprites.app` (plus `extraViteAllowedHosts`) into
 *   `/etc/mol/env`; a scaffold that does not read that env var will 403 every
 *   preview request.
 * - **`urlAuth: 'public'` is the default** so anonymous browsers can load
 *   previews; switch to `'sprite'` only if every preview request can carry a
 *   Bearer token.
 * - **`setResources` only bounds memory**, and the limit was NOT observed to
 *   apply to the live cgroup of a running sprite — treat it as binding on the
 *   next wake. CPU/disk changes throw.
 * - **File ops use the Sprites Filesystem API** (HTTP), so `readDir` on a
 *   missing path throws (ENOENT) per the core contract — `[]` always means
 *   "exists and is empty".
 *
 * @module
 */

export * from './names.js'
export * from './provider.js'
export * from './services.js'
export * from './types.js'

import type { SandboxProvider } from '@molecule/api-code-sandbox'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars / secrets are resolved. */
let _provider: SandboxProvider | null = null
/**
 * The provider implementation.
 */
export const provider: SandboxProvider = new Proxy({} as SandboxProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
