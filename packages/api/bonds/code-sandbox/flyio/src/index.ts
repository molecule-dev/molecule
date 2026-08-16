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
 *
 * // Warm start. Capture the prepared filesystem once…
 * const provider = requireProvider()
 * await provider.commitTemplate?.({
 *   sandboxId: sandbox.id,
 *   templateId: 'react-postgres-v3',
 *   // REQUIRED here: the archive of these paths IS the template.
 *   capturePaths: ['/workspace'],
 * })
 *
 * // …then every later boot of the same configuration restores it instead of
 * // re-running `mlcl create` + `npm install`. A missing template THROWS.
 * const warm = await provider.create({
 *   projectId: 'b7d2…',
 *   volumeName: 'mol-b7d2',
 *   templateId: 'react-postgres-v3',
 * })
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
 * For the template capability: Fly Volume snapshots
 * (https://fly.io/docs/volumes/snapshots/), Tigris object storage on Fly
 * (https://fly.io/docs/tigris/) and its S3 API coverage
 * (https://www.tigrisdata.com/docs/api/s3/), presigned URLs
 * (https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html),
 * the 5 GB single-`PUT` ceiling
 * (https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html),
 * and the AWS SDK's checksum defaults
 * (https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html).
 * The `tar` behaviours the restore's containment rests on — a `..` member
 * refused, a leading `/` stripped, a write through a symlink refused, and
 * setuid/setgid dropped by `--no-same-permissions` — were verified by running
 * GNU tar 1.35 against crafted archives rather than inferred from its manual.
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
 * **Crossing the 6PN: `privateServices` is what makes a database work.** The
 * per-project 6PN that stops tenants reaching each other also stops a sandbox
 * reaching the tenant Postgres cluster and the control plane's egress proxy —
 * both of which the product REQUIRES. Fly documents three ways across a 6PN
 * boundary (https://fly.io/docs/networking/custom-private-networks/): a public
 * service IP, `fly-replay`, and a **Flycast** private address allocated into the
 * calling network. Only the third grants ONE directed edge with nothing exposed
 * publicly, so it is what this bond implements. Declare the targets —
 * `privateServices: [{ app: 'molecule-pg-tenant', port: 5432 }]`, or
 * `FLY_SANDBOX_PRIVATE_SERVICES=molecule-pg-tenant:5432,molecule-api:3129` — and
 * `create()` allocates one address per target INTO the project's own network
 * (`POST /apps/{target}/ip_assignments`, the REST form of
 * `fly ips allocate-v6 --private --network <project-net>`), records them in the
 * Machine's metadata, and `destroy()` releases them. The sandbox then dials
 * `<target>.flycast:<port>`.
 *
 * Four properties of that are worth knowing before you deploy it:
 *
 * - **Isolation is unchanged.** An allocation is a one-way grant from ONE
 *   project's network to ONE shared app. No sandbox app ever receives one, so
 *   no sandbox becomes reachable from anywhere it was not already.
 * - **The declared port is unioned into the egress network policy**, because a
 *   policy is deny-by-default once any rule exists — declaring
 *   `molecule-pg-tenant:5432` under a `tcp:3128` policy would drop every
 *   database connection in the fleet. Whether the union is even load-bearing is
 *   UNVERIFIED: Fly says policies "do not affect traffic routed through the Fly
 *   Proxy" and Flycast IS Fly Proxy, but says nothing about a Machine's EGRESS
 *   toward a Flycast address. An inert entry costs a port; a missing one costs
 *   the fleet.
 * - **Any `.flycast` URL in a sandbox's environment must have a matching
 *   declaration**, or `create()` throws. That check is what turns "the route was
 *   silently never created" — a healthy sandbox that cannot reach its own
 *   database — into a startup error, and it is also the guard on the
 *   control-plane cluster: reaching it would require an operator to declare it
 *   by name.
 * - **The target app needs an `[http_service]`/`[services]` section and must
 *   bind `0.0.0.0`** (https://fly.io/docs/networking/flycast/). This bond cannot
 *   do that for you. **Fly documents no limit on how many private addresses one
 *   app may hold**, in either direction, so the shared target apps accumulate
 *   one address per live project — reconcile with `fly ips list --app <target>`.
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
 * **Warm start: templates are tar archives in object storage.** Fly cannot
 * `commit` a running Machine — it PULLS images from a registry — and the
 * Machines API has no file-transfer endpoint at all, so a template here is a
 * `tar.gz` of the caller-named `capturePaths` in an S3-compatible bucket
 * (Tigris on Fly: `fly storage create` exports exactly the variables this bond
 * reads). The bytes move DIRECTLY between the sandbox and the store over
 * presigned URLs — the control plane only handles the URL and the manifest —
 * because pushing hundreds of megabytes through `exec`'s JSON response is not a
 * slower transfer, it is a different order of magnitude. `commitTemplate`
 * REQUIRES `capturePaths`: unlike Docker, where the container's own image
 * carries the filesystem, the archive here IS the template, so committing none
 * would store an empty template that later boots successfully into an empty
 * workspace. Configure it with `templateBucket` + `templateAccessKeyId` +
 * `templateSecretAccessKey` (+ `templateEndpoint` for a non-AWS store); without
 * them the template methods throw an actionable error naming the settings
 * rather than pretending the capability is absent, the same call the Docker
 * bond makes for `templateRegistry`.
 *
 * The **volume-snapshot** alternative was checked and rejected on Fly's own
 * documentation, not on preference: `POST /v1/apps/{app}/volumes` does accept
 * `snapshot_id` and `source_volume_id`, but "Every Fly Volume belongs to a Fly
 * App and you can't share a volume between apps"
 * (https://fly.io/docs/volumes/overview/) — and this bond gives every project
 * its own app. A snapshot could serve a per-project restore point and never the
 * cross-project warm start the capability exists for.
 *
 * **Booting from a template FAILS when the template is gone**, rather than
 * falling back to the base image, which would hand back a healthy-looking
 * sandbox whose filesystem is not the one that was named. One wording in the
 * core cannot be honored literally: `templateId` does NOT override `image`
 * here, because a Fly template is a filesystem rather than an image — the image
 * still selects the OS and toolchain, and the template supplies the captured
 * paths on top of it. A restore that fails DESTROYS the Machine before throwing.
 *
 * **The tenant boundary is the restore, not the capture.** A capture runs inside
 * a sandbox the tenant controls, so nothing done there is a security control.
 * The restore runs in a fresh Machine before anyone holds a handle to it, and
 * extracts ONLY the paths recorded in the control-plane-written manifest (they
 * are `tar` member selectors), with `--no-same-owner --no-same-permissions`,
 * followed by a `find -perm /6000 -exec chmod a-s` sweep and then a second
 * `find` that FAILS the restore if any setuid/setgid file survived. GNU tar's
 * own refusals — a `..` member, an absolute member, a write through a symlink —
 * all exit non-zero and therefore fail the restore too.
 *
 * **`inUse` means "a restore is in flight", and cannot mean more than that.** On
 * Docker a template is the image a container runs, so deleting it destroys the
 * container. Here the archive is COPIED into the sandbox at boot and never
 * referenced again, so removing a template cannot destroy a running sandbox —
 * the only window is a restore still reading it, which is tracked with a lease
 * object in the same store (so a second control plane sees it) and ages out
 * after the transfer budget. A lease whose timestamp cannot be read counts as
 * live, and any failure to LIST or read the store throws rather than reporting
 * "absent" or "not in use".
 *
 * **`publishTemplate`/`fetchTemplate` are NOT implemented, deliberately.** They
 * exist for providers whose templates are host-local; object storage is already
 * the shared store, so there is nothing to publish or fetch.
 *
 * **`importFiles` IS implemented; `exportFiles` is not.** Import takes the same
 * route the template restore does — a presigned object-store URL the Machine
 * pulls itself, falling back to chunked base64 over `exec` when no store is
 * configured — so an app tree can be delivered into a fresh Machine. There is no
 * inverse: Fly's only read channel is the `exec` endpoint's JSON response, and a
 * base64 emulation of a whole-tree export would look supported and route every
 * byte through the control plane. Pair a Fly destination with a source that CAN
 * export (the core's rooting contract makes them interchangeable).
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
export * from './flycast.js'
export * from './ids.js'
export * from './provider.js'
export * from './storage.js'
export * from './templates.js'
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
