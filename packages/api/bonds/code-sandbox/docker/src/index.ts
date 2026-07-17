/**
 * Docker code-sandbox provider for molecule.dev.
 *
 * @remarks
 * **Tenant network isolation (secure default).** Each sandbox is placed on a dedicated
 * user-defined Docker network created with inter-container communication DISABLED
 * (`com.docker.network.bridge.enable_icc=false`), so one tenant's sandbox cannot reach another
 * tenant's Vite/API dev-server ports by IP. Do NOT set `SANDBOX_DOCKER_NETWORK="bridge"` — the
 * shared docker bridge has ICC enabled (no cross-tenant isolation) and is REFUSED in production.
 * Override `SANDBOX_DOCKER_NETWORK` only to point at another dedicated ICC-off network. This is
 * an L2 isolation control; pair it with host-layer default-deny egress filtering (operator-
 * provisioned) for full isolation. [C1-1]
 *
 * **Prerequisites.** A reachable Docker daemon and the base image already pulled
 * on the host. The daemon is reached over a unix socket by default
 * (`config.socketPath` ?? `DOCKER_SOCKET_PATH` ?? `/var/run/docker.sock`); a
 * remote or rootless daemon can be selected with `config.host`/`config.port` or a
 * `DOCKER_HOST` (`tcp://host:port` or `unix:///path`). Only PLAIN (unencrypted)
 * TCP is supported — front a TLS-protected daemon (2376) with a local socket
 * proxy. The provider never pulls images, so `create()` fails with a no-such-image
 * error if the base image (default `node:22-slim`, or `config.baseImage`) is
 * absent. The isolated sandbox network is auto-created on first use; it is NOT a
 * prerequisite.
 *
 * **No per-sandbox disk quota.** The Docker API cannot portably cap a
 * container/volume size (it needs specific storage drivers — e.g. overlay2 on xfs
 * with `pquota` — and errors on the common overlay2/ext4 host), so this provider
 * enforces none. The core `resources.diskMB` is accepted but not applied here; cap
 * disk at the host / volume level instead.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
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
