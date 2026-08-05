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
 * disk at the host / volume level instead. `setResources({ diskMB })` THROWS
 * rather than accepting a ceiling it cannot enforce.
 *
 * **Templates are not `commit` alone, and that is not an optimization.**
 * `commitTemplate` copies the caller-named `capturePaths` into a throwaway,
 * volume-less container and commits THAT. A sandbox keeps the project on a
 * volume, and a volume is not part of a container's writable layer — so
 * committing a sandbox directly yields an image that builds, tags, and boots
 * with an empty workspace, with no error anywhere. The throwaway container
 * handles tenant-authored bytes and is committed into something other tenants
 * boot, so it runs with `--network none`, `CapDrop: ALL` plus the three
 * capabilities extraction needs, a memory cap and a process cap, and setuid/setgid
 * bits are stripped from the extracted tree afterwards.
 *
 * Templates live in their OWN repository (`templateRepository`, default
 * `molecule-sandbox-template`) rather than sharing the base image's, so nothing
 * written to sweep templates can reach the base image. `publishTemplate` /
 * `fetchTemplate` use a Docker registry and require `templateRegistry`; without
 * it they THROW rather than returning "not found", because "there is no shared
 * store" and "the shared store does not have it" are different answers.
 *
 * **`hibernate()`/`resume()` report which mechanism ran.** A CRIU checkpoint
 * preserves the process tree; a stop does not, and whether CRIU is available is a
 * property of the host (the daemon's experimental flag plus the `criu` package),
 * discovered at runtime. A sandbox that runs its dev servers as detached exec
 * processes comes back from a stop-style wake alive and serving nothing, so
 * callers must branch on `processesPreserved` — never on `status`, which says
 * `running` either way. The first response that shows CRIU is unavailable
 * disables it for the rest of the process.
 *
 * **`find()` costs one request per match.** Docker's container LIST omits
 * `State.StartedAt`, which is the only field distinguishing an interrupted
 * creation (`startedAt: null` — holds storage forever, will never run) from an
 * ordinary stopped sandbox, so each match is then inspected. Narrow with
 * `labels`; an unfiltered query on a busy host inspects every container.
 *
 * **`capacity()` measures THIS host, so it reports nothing for a TCP daemon.**
 * Over a `tcp://` endpoint the daemon writes to a different machine's storage,
 * and returning this machine's numbers would be a confident wrong answer — so it
 * returns empty `headroom` and says why. On a local socket it reports free bytes
 * and free inodes on the daemon's `DockerRootDir` plus `MemAvailable`. Inodes are
 * omitted (not reported as zero) on filesystems with dynamic inode allocation.
 * `admits` is always `null`: Docker has no quota of its own to consult, so the
 * floors and the refusal stay with the caller.
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
