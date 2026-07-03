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
 * @module
 */

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
