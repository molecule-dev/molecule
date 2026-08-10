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
 *   defaultNetworkRules: [
 *     { domain: 'registry.npmjs.org', action: 'allow' },
 *     { domain: '*.npmjs.org', action: 'allow' },
 *     { domain: 'github.com', action: 'allow' },
 *     { domain: '*', action: 'deny' },
 *   ],
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
 * @module
 */

export * from './provider.js'
export * from './types.js'
