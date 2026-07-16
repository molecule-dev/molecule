/**
 * Code sandbox core interface for molecule.dev.
 *
 * Defines the `SandboxProvider` contract for provisioning isolated execution
 * environments (`create`/`get`/`list`/`destroy`, optional named-volume
 * management) and the `Sandbox` handle each returns: lifecycle
 * (`start`/`stop`/`sleep`/`wake`), `exec`, file I/O, `getPreviewUrl`, and file
 * watching. Interface-only: bond a provider (e.g.
 * `@molecule/api-code-sandbox-docker`) at startup; consumers stay
 * provider-agnostic.
 *
 * @remarks
 * - **Treat everything inside a sandbox as untrusted.** Files and exec output are
 *   user/model-controlled: never eval them on the host, always cap `exec` with
 *   `timeout`, and pass secrets in via `env` only when the workload truly needs
 *   them.
 * - **`Sandbox` handles are not durable.** Persist your `projectId` → sandbox `id`
 *   mapping and re-`get(id)` after restarts. Files that must outlive the container
 *   need a named volume (`createVolume` + `SandboxConfig.volumeName`) — the volume
 *   APIs are optional, so feature-detect (`if (provider.createVolume)`).
 * - **`exec` returns a result, it doesn't throw on failure.** A non-zero
 *   `exitCode` is data — check it and read `stderr`. Long-running processes (dev
 *   servers) need `spawn` (optional — feature-detect), not `exec`.
 * - **`readDir()` THROWS when the path doesn't exist** — an empty array means
 *   "exists and is empty", never "missing".
 * - Wire with `setProvider(provider)` (or `bond('code-sandbox', provider)` — this
 *   core reads the bond registry).
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-code-sandbox'
 * import { provider as docker } from '@molecule/api-code-sandbox-docker'
 *
 * setProvider(docker) // at startup
 *
 * const sandbox = await requireProvider().create({ projectId: project.id })
 * const result = await sandbox.exec('npm test', { timeout: 120_000 })
 * if (result.exitCode !== 0) console.error(result.stderr)
 * await sandbox.writeFile('notes/README.md', '# Hello')
 * const url = sandbox.getPreviewUrl(5173) // proxy/iframe target for the running app
 * await requireProvider().destroy(sandbox.id)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
