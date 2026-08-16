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
 * Beyond that core, a set of OPTIONAL capabilities covers what a control plane
 * needs to actually operate a fleet: **templates** (`commitTemplate`,
 * `getTemplate`, `listTemplates`, `removeTemplate`, `publishTemplate`,
 * `fetchTemplate`, `SandboxConfig.templateId`) for warm starts and restore
 * points, **inspection** (`describe`, `find`, `listVolumes`) for recovery and
 * reconciliation, **hibernation fidelity** (`hibernate`/`resume`) for knowing
 * whether a woken sandbox's processes survived, **`setResources`** for applying
 * an entitlement after creation, **`exportFiles`/`importFiles`** for bulk
 * workspace transfer, and **`capacity`** for refusing a boot before it damages
 * the sandboxes already running.
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
 *   "exists and is empty", never "missing". The enumerating capabilities
 *   (`find`, `listVolumes`, `listTemplates`) follow the same rule: they throw
 *   rather than return `[]`, because a caller that DELETES what these return
 *   must never be told "nothing is orphaned" by a failed query.
 * - **Feature-detect every optional capability** (`if (provider.commitTemplate)`,
 *   `sandbox.hibernate?.()`). An absent method means the provider cannot do it;
 *   a rejected call means it can and this attempt failed. Providers must never
 *   collapse the two by stubbing a capability they lack.
 * - **`wake()` does not tell you whether your processes survived** — a
 *   checkpoint-style resume brings them back and a plain start does not, and the
 *   sandbox looks identical either way. Use `hibernate`/`resume` (optional) when
 *   you launched anything the sandbox needs to still be running.
 * - **A sandbox that must survive its own host restarting has to describe its own
 *   boot.** Processes started with `exec` after creation do not come back when
 *   the host restarts, migrates or OOM-kills the sandbox — the image's idle
 *   command runs instead and `status` still reports `running`, because it is:
 *   running and empty. Give such a sandbox `SandboxConfig.command` (its main
 *   process, pointing at something on the persistent VOLUME — a script on the
 *   rootfs is gone by then) plus `SandboxConfig.restartPolicy`. Dev sandboxes,
 *   which nobody serves from, are fine with the `'no'` default.
 * - Wire with `setProvider(provider)` (or `bond('code-sandbox', provider)` — this
 *   core reads the bond registry).
 * - **`exportFiles(path)` archives are rooted at the last segment of `path`**
 *   (`exportFiles('/workspace/my-app')` → `my-app/…`, Docker's archive shape),
 *   and the inverse is `importFiles(dirname(path), archive)`. Never assume `./…`
 *   rooting and never extract at `/` unless you exported a top-level directory —
 *   a differently rooted archive lands files in the wrong place with no error.
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
