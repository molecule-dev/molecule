/**
 * RunPod Serverless model hosting for molecule.dev — run a model server
 * container on a load-balancing GPU endpoint (16 GB class and up) that scales
 * to zero, called at `https://<endpoint-id>.api.runpod.ai` with your RunPod
 * API key.
 *
 * Load-balancing endpoints run YOUR HTTP server (no RunPod handler code), so
 * `laya-serve`, `jeff-serve` or any `/v1/systemone` server works unchanged.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-model-hosting'
 * import { provider } from '@molecule/api-model-hosting-runpod'
 *
 * setProvider(provider) // reads RUNPOD_API_KEY on first use
 *
 * const endpoint = await requireProvider().deploy({
 *   name: 'jeff',
 *   image: 'ghcr.io/acme/jeff-serve:0.8b',
 *   port: 8000,
 *   healthPath: '/ping',
 *   accelerator: { kind: 'gpu', minVramGb: 16 },
 *   region: 'us',
 *   scaling: { minInstances: 0, maxInstances: 2, idleTimeoutSeconds: 60 },
 *   access: 'private',
 * })
 * const headers = await requireProvider().authHeaders(endpoint.id) // { authorization: 'Bearer <RUNPOD_API_KEY>' }
 * ```
 *
 * @remarks
 * - **Serve `/ping` on your port.** RunPod's load balancer health-polls
 *   `/ping` (the `HEALTH_CHECK_PATH` override is documented but reported
 *   ignored — runpod/docs#853) and expects `200` healthy / `204` still
 *   loading. A server with only `/health` never becomes healthy; add `/ping`
 *   (or proxy it). The bond sets `PORT`, `PORT_HEALTH` and `HEALTH_CHECK_PATH`
 *   from the spec anyway, and `deploy` waits on YOUR `healthPath` through the
 *   public URL.
 * - **Cold starts return "no workers available"** until a worker is up; retry
 *   3 times 5–10 s apart (RunPod's own guidance), or keep `minInstances: 1`.
 * - **GPU only.** `minVramGb` picks the smallest pool class that fits
 *   (`AMPERE_16` → 16 GB; 24 GB → `AMPERE_24,ADA_24`; …); name one or a
 *   comma-separated set in `accelerator.model`. `'us'` → `US`, `'eu'` →
 *   `CZ,FR,GB,NO,RO`, or pass RunPod location codes.
 * - **The endpoint is created with the GraphQL `saveEndpoint` mutation**
 *   (`type: "LB"`), because the REST API cannot create load-balancing
 *   endpoints; updates, reads and deletes use REST. `remove` drains workers to
 *   0 before deleting, then deletes the template.
 * - **Anyone with your RunPod API key can call every endpoint** — the key is
 *   both the admin credential and the endpoint credential. Keep it server-side.
 * - Workers stop when the account balance reaches $0 — a silent outage.
 * - `list()` returns every serverless endpoint on the account (RunPod does not
 *   say which are load-balancing).
 * - API errors throw `RunPodApiError` with the HTTP `status`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './client.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
