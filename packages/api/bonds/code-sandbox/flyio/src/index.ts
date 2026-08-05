/**
 * Fly.io Machines code-sandbox provider for molecule.dev.
 *
 * Runs each sandbox as a Fly Machine — a Firecracker microVM — managed over the
 * Fly Machines API. The reason to pick this over the Docker bond is
 * SCALE-TO-ZERO: `sleep()` maps to Fly's `suspend`, which snapshots the microVM's
 * memory to disk, and a suspended Machine bills for storage only. Waking is a
 * resume from that snapshot rather than a cold boot.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { createProvider } from '@molecule/api-code-sandbox-flyio'
 *
 * // The API token is read from FLY_API_TOKEN (or FLY_ACCESS_TOKEN) unless you
 * // pass `apiToken` explicitly. Every option below has an env fallback too.
 * bond(
 *   'code-sandbox',
 *   createProvider({
 *     orgSlug: 'my-org',
 *     region: 'iad',
 *     baseImage: 'registry.fly.io/molecule-sandbox:latest',
 *   }),
 * )
 *
 * // Elsewhere, through the core interface:
 * import { requireProvider } from '@molecule/api-code-sandbox'
 *
 * const sandbox = await requireProvider().create({
 *   projectId: 'a3f1c0de-0000-4000-8000-000000000001',
 *   volumeName: 'mol-a3f1c0de',
 *   resources: { cpu: 2, memoryMB: 2048, diskMB: 10240 },
 * })
 *
 * await sandbox.exec('npm install', { timeout: 600_000 })
 * await sandbox.sleep() // Fly suspend — memory snapshot, storage-only billing
 * await sandbox.wake() // Fly start — resumes from the snapshot
 * ```
 *
 * @remarks
 * **Sources.** Every endpoint, payload field and documented behaviour used here
 * was checked against Fly's own material, not recalled:
 * the OpenAPI specification (https://docs.machines.dev/openapi.json,
 * `servers: https://api.machines.dev/v1`), the Machines resource reference
 * (https://fly.io/docs/machines/api/machines-resource/), Working with the
 * Machines API (https://fly.io/docs/machines/api/working-with-machines-api/),
 * Machine states (https://fly.io/docs/machines/machine-states/), Suspend and
 * Resume (https://fly.io/docs/reference/suspend-resume/), Custom private
 * networks (https://fly.io/docs/networking/custom-private-networks/), Private
 * networking (https://fly.io/docs/networking/private-networking/), Fly Volumes
 * (https://fly.io/docs/volumes/overview/), Network Policies
 * (https://fly.io/docs/machines/guides-examples/network-policies/ and its
 * announcement https://community.fly.io/t/new-feature-network-policies/19173),
 * Egress IP addresses (https://fly.io/docs/networking/egress-ips/), rate limits
 * (https://fly.io/docs/machines/api/working-with-machines-api/), and the exec
 * timeout ceiling
 * (https://community.fly.io/t/extending-timeout-of-execute-command-machines-api-endpoint/26074).
 *
 * **`sleep()` is suspend, not stop — that is the point of this bond.**
 * `sleep()` calls `POST /v1/apps/{app}/machines/{id}/suspend`, which "uses
 * Firecracker snapshots to capture the entire VM state: CPU registers, memory
 * contents, open file handles"; `wake()` calls `start`, which restores it —
 * "Resume from suspend: a few hundred ms" versus "Cold start: ~2+ seconds".
 * Fly documents that "Suspended machines cost the same as stopped machines:
 * storage only. There are no CPU/RAM charges." Two caveats that bite: suspend is
 * discouraged above 2 GB of guest memory, and calling `stop()` on a SUSPENDED
 * Machine invalidates its snapshot, forcing a cold boot on the next `wake()` —
 * so do not "tidy up" a sleeping sandbox with a stop.
 *
 * **`exec` is capped at 60 seconds by Fly, and this provider works around it.**
 * The exec endpoint rejects a `timeout` above 60 s outright. Any command whose
 * budget exceeds that is therefore run DETACHED inside the Machine — script file
 * plus redirected stdout/stderr plus an exit-status file — and polled to
 * completion with short execs. The caller still gets one `ExecResult`. The
 * observable differences: output is not streamed, and a command still running
 * when the budget expires returns `exitCode: -1` (indeterminate) with whatever
 * output existed at that moment, exactly like the Docker bond's convention.
 * Captured output is capped at 5 MB per stream.
 *
 * **`spawn()` is NOT implemented.** It is optional in the core interface, and
 * Fly's exec is strictly request/response — no connection upgrade, no streaming
 * stdout, and stdin only as a single up-front string. There is no honest way to
 * back a `SpawnHandle` with it, so the method is absent rather than faked.
 * Callers must feature-detect (`sandbox.spawn?.(…)`), which the interface
 * already requires.
 *
 * **`onFileChange()` is NOT implemented** — it registers nothing and returns a
 * real no-op unsubscribe, and warns once. The Machines API exposes no
 * filesystem-event channel, and the only alternative is polling through the
 * rate-limited exec endpoint, which would spend the whole API budget to deliver
 * changes seconds late. Poll `readDir`/`readFile` yourself if you need it.
 *
 * **Tenant isolation: one app per project, each on its own 6PN.** Every Machine
 * in a Fly app shares one 6PN private network and can reach every other Machine
 * in that app by private IPv6 — the same cross-tenant exposure the Docker bond's
 * shared `bridge` network has. So by default this provider creates one Fly app
 * per project (`<prefix>-<projectId>`) with `network` set to a custom 6PN, which
 * Fly documents as the tenant-isolation mechanism: "Apps on separate 6PNs can
 * never communicate unless explicitly configured to do so." Shared-app mode
 * (`appPerProject: false`) exists for single-tenant deployments and is REFUSED
 * in production. An app's network cannot be changed after creation, so an app
 * that already exists is used as-is rather than silently "fixed".
 *
 * **Egress: `verifyEgress()` OBSERVES, and Fly's only lever is ports.** 6PN
 * isolation answers "can app A reach app B", not "can a sandbox reach the
 * internet". For that, the one mechanism Fly documents is a **network policy** —
 * app-scoped `allow` rules where "Once you create a rule for a given direction,
 * the default for that direction becomes drop." Set `egressAllowedPorts` (or
 * `FLY_SANDBOX_EGRESS_ALLOWED_PORTS=tcp:3128,udp:53`) and this provider applies
 * one to every app it provisions, BEFORE creating the Machine — Fly applies a
 * policy at boot ("restart or redeploy the Machines for changes to take
 * effect"), so a policy that lands afterwards does not cover the running
 * Machine. A failure to apply it FAILS the boot rather than quietly starting an
 * unfiltered sandbox. Three limits are load-bearing and cannot be designed
 * around: rules match **protocol and port only** (no host, no CIDR, no ranges),
 * so a policy can never be a host allowlist — `tcp:443` lets a sandbox reach
 * every host on the internet that listens on 443; policies **do not apply to Fly
 * Proxy traffic**; and the endpoints, while documented in the guide and the
 * announcement, are **absent from Fly's OpenAPI specification**, so the LIST
 * response shape is parsed defensively. To get host-level control, allow only
 * the port of an egress proxy you run and route sandbox traffic through it.
 *
 * `verifyEgress()` then PROVES the result instead of reporting the
 * configuration: it boots a throwaway Machine through the same `ensureApp` path
 * every sandbox uses, attempts raw TCP connects to literal public IPs with proxy
 * environment blanked, and maps connected → `open`, refused/timed-out →
 * `filtered`, anything else → `inconclusive`. It costs one Machine boot (and, in
 * per-project mode, one app create/delete) per call, so cache the verdict.
 *
 * **The preview URL is a template, and the isolation choice constrains it.**
 * `getPreviewUrl()` renders `previewUrlTemplate` (default
 * `https://{app}.fly.dev`) with `{app}`, `{machineId}` and `{port}`. The
 * private form `http://{machineId}.vm.{app}.internal:{port}` reaches a Machine
 * over 6PN with no public exposure at all — but only from the SAME 6PN, which
 * per-project apps deliberately prevent. So a control plane that wants private
 * previews must reach each app another way (Flycast, or a public router app
 * using `fly-replay`), and a control plane off Fly entirely must use the public
 * form. Public serving additionally requires an allocated IP: set
 * `assignSharedIpv4: true` to request one at app-creation time. The accepted
 * `type` values for `POST /v1/apps/{app}/ip_assignments` are NOT enumerated in
 * Fly's OpenAPI specification — `shared_v4` is this provider's default and is
 * configurable via `ipAssignmentType`, but treat that value as UNVERIFIED.
 *
 * **Volumes are provisioned by `create()`, not by `createVolume()`.** The
 * optional core methods `createVolume`/`removeVolume`/`volumeExists` are
 * deliberately NOT implemented: they receive only a name, while a Fly volume
 * needs an app, a region and a size, and a volume created in the wrong app can
 * never be mounted. So passing `SandboxConfig.volumeName` provisions the volume
 * inside the project's app, mounted at `/workspace`; `resources.diskMB` is
 * rounded UP to whole GB. Fly documents that "a volume can be attached to only
 * one Machine", which matches one sandbox per project. Fly does not document the
 * legal character set for volume names, so names are conservatively reduced to
 * `[A-Za-z0-9_]` — an assumption, flagged as such.
 *
 * **Sandbox ids are composite: `"<app>:<machineId>"`.** A Fly Machine id is only
 * unique within its app and every endpoint is `/v1/apps/{app}/machines/{id}`, so
 * a bare Machine id cannot be addressed. Keep treating the id as opaque.
 *
 * **The image must be pullable BY FLY.** Fly pulls the image itself, so a local
 * `molecule-sandbox:latest` is invisible to it — push to the org's
 * `registry.fly.io` repository or a public registry first. Unlike the Docker
 * bond, nothing here can pre-pull on a host you control.
 *
 * **Rate limits are handled in the transport, but they also shape throughput.**
 * Fly documents the Machines API at "1 request, per second, per action … with a
 * short-term burst limit up to 3 req/s, per action", scoped "per-action,
 * per-machine … That might be Machine ID or App ID, depending on the type of
 * request", with Get Machine at 5 req/s and app deletions capped at 100 per
 * minute. `429` and `5xx` are retried with `Retry-After`-aware backoff; other
 * `4xx` responses are real answers and are never retried. The consequence to
 * plan for is that EVERY file operation is an exec API call, so one sandbox's
 * reads and writes serialize at roughly one per second and a multi-megabyte
 * `writeFile` (chunked at ~45 KB decoded) takes tens of seconds. An agent that
 * edits files in a tight loop will feel this; batch where you can.
 *
 * **`create()` launches the Machine, and `start()`/`wake()` WAIT for it.** Unlike
 * Docker's create-then-start, the Machines API starts a Machine as part of
 * creation. `POST .../start` only means Fly accepted the request, so
 * `start()`/`wake()` then block on `GET .../wait?state=started` (Fly blocks
 * server-side for up to 60 s, tunable with `startTimeoutSeconds`) and throw if
 * the Machine never runs — without that, the caller's next `exec` would land on
 * a Machine that is still booting.
 *
 * **Statuses are lossy.** Fly documents seventeen Machine states and the core
 * has four. `failed`/`launch_failed` both map to `stopped` because the core
 * union has no error status.
 *
 * **No per-sandbox disk quota beyond the volume.** `resources.diskMB` sizes the
 * mounted volume; without `volumeName` it is not applied at all, and the rootfs
 * size is Fly's default.
 *
 * @module
 */

export * from './api.js'
export * from './browser-guard.js'
export * from './egress.js'
export * from './exec.js'
export * from './ids.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'

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
