/**
 * E2B (e2b.dev) code sandbox provider.
 *
 * E2B runs isolated Firecracker microVMs purpose-built for agent/dev workloads:
 * a sandbox spawns from a golden **template** (a Dockerfile-built image with the
 * whole dependency set baked in) in ~1s, exposes every internal port at
 * `https://<port>-<id>.e2b.app`, pauses/resumes with filesystem + memory state
 * preserved in ~1s, and governs outbound traffic by a DNS network policy. This
 * bond maps that platform onto the `@molecule/api-code-sandbox` contract through
 * the official `e2b` SDK.
 *
 * The design that makes it fast: a single golden SUPERSET template carries the
 * entire `@molecule` fleet node_modules + postgres + warmed Vite deps, so a boot
 * only copies the ONE selected app's source in and starts the dev servers — no
 * per-boot `npm install`. The 133 flagship template sources are NOT baked into
 * the image; they are copied from the control plane at boot, so templates and
 * `mlcl` stay private.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { provider } from '@molecule/api-code-sandbox-e2b'
 *
 * bond('codeSandbox', provider)
 * // Requires E2B_API_KEY (and E2B_TEMPLATE_ID for the golden superset template).
 * ```
 *
 * @example
 * ```typescript
 * import { createProvider } from '@molecule/api-code-sandbox-e2b'
 *
 * const provider = createProvider({
 *   templateId: 'molecule-superset',
 *   defaultPreviewPort: 5173,
 *   // Deny-by-default egress: everything not listed here is blocked, raw IPs
 *   // included. An empty/omitted list applies NO policy at all.
 *   defaultAllowOut: ['registry.npmjs.org', '*.npmjs.org', 'github.com'],
 * })
 * ```
 *
 * @remarks
 * **`verifyEgress` is intentionally not implemented yet.** The control plane
 * treats an absent `verifyEgress` as an `inconclusive` verdict and refuses to
 * boot sandboxes in production — the correct safe default until egress
 * observation is proven against E2B's `updateNetwork` policy (Rule 18: never
 * trade cost for security). Do not stub it with a fabricated `filtered`.
 *
 * **E2B pauses, it does not stop.** `sleep()`/`stop()` both map to E2B pause
 * (FS + memory snapshot); `wake()`/`start()` reconnect by id. `hibernate()`/
 * `resume()` report `processesPreserved: true` because the memory snapshot
 * restores the process tree — unlike a Docker stop, a resumed E2B sandbox's
 * dev servers are still running.
 *
 * **`get()` RESUMES a paused sandbox — use `describe()` to look at one.**
 * Obtaining a handle is `POST /sandboxes/{id}/connect`, which resumes a paused
 * sandbox and extends its deadline. That is right for a caller about to USE the
 * sandbox and wrong for every status check: polling `get()` every few seconds
 * silently un-hibernates every sleeping project and bills for the compute while
 * the UI still says "asleep". `describe(id)` reads the record instead, reports
 * `sleeping` for a paused sandbox, and changes nothing.
 *
 * **`get()` returns `null` ONLY for a sandbox that does not exist.** Every other
 * failure throws. A control plane reads `null` as "gone", detaches the project
 * and rebuilds it from a template — and since an E2B microVM is the only copy of
 * a project's files, answering a transient 5xx with `null` destroys the user's
 * code. "I could not look" must never be delivered as "I looked, and it is not
 * there". The same rule governs `describe()`.
 *
 * **`hibernate()`/`stop()`/`sleep()` pause or THROW.** They never resolve a
 * success-shaped outcome for a sandbox that is still running: a caller's next act
 * is to record the sandbox as stopped, and a control plane that believes a running
 * sandbox is asleep bills for it and — with the kill timeout — watches it die at
 * its deadline instead of hibernating. Note the converse trap: a pause is undone by
 * the very next `get()`, since obtaining a handle connects. Anything that polls a
 * stopped sandbox (status, logs, files) must go through `describe()`.
 *
 * **Sandboxes are created to PAUSE at their timeout, not to be killed.** E2B's
 * default is `onTimeout: 'kill'`, so a sandbox nothing touched for its lifetime
 * would be destroyed with its files. This bond creates every sandbox with
 * `lifecycle: { onTimeout: { action: 'pause', keepMemory: true } }`; the memory
 * snapshot is what lets `resume()` truthfully report `processesPreserved: true`.
 * Extending the deadline is `keepAlive(ms)` — call it from a real activity
 * signal (an open editor's heartbeat), never as a side effect of polling.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
