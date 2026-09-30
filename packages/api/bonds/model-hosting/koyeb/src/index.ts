/**
 * Koyeb model hosting for molecule.dev — run a model server container on a
 * CPU instance or an NVIDIA GPU (L4, A100, H100, H200) in the EU or US, with
 * sleep-when-idle and per-second billing.
 *
 * Each endpoint is one Koyeb app holding one WEB service, reachable at the
 * app's `*.koyeb.app` domain.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-model-hosting'
 * import { provider } from '@molecule/api-model-hosting-koyeb'
 *
 * setProvider(provider) // reads KOYEB_API_TOKEN on first use
 *
 * const endpoint = await requireProvider().deploy({
 *   name: 'laya',
 *   image: 'ghcr.io/acme/laya-serve:0.3.1',
 *   port: 8000,
 *   healthPath: '/health',
 *   secretEnv: { LAYA_API_KEY: process.env.LAYA_API_KEY ?? '' },
 *   accelerator: { kind: 'cpu' },
 *   region: 'eu',
 *   scaling: { minInstances: 0, maxInstances: 2, idleTimeoutSeconds: 600 },
 *   access: 'private',
 *   serverEnforcesAuth: true,
 * })
 * endpoint.url // https://laya-acme.koyeb.app
 * ```
 *
 * @remarks
 * - **No endpoint auth of its own.** A Koyeb URL is public. For
 *   `access: 'private'` you must set `serverEnforcesAuth: true`, pass the
 *   server's key in `secretEnv` (e.g. `LAYA_API_KEY`), and give the consumer
 *   the same key (`apiKey`). `authHeaders()` always returns `{}`.
 * - **`secretEnv` is stored as plain service env**, visible in the Koyeb
 *   console to anyone in the organization. Use Koyeb secrets yourself for
 *   anything stricter.
 * - **Instance types:** CPU uses `large` (4 vCPU / 4 GB — enough for a ~400M
 *   encoder; `medium` has too little memory) unless `cpuInstanceType` is set.
 *   GPUs are picked by `minVramGb` from `gpu-nvidia-l4` (24 GB) up; pass
 *   `accelerator.model` to name one exactly (e.g. an RTX 4000 SFF Ada id from
 *   Koyeb's catalog). Which regions carry which GPUs is not documented on the
 *   regions page — a GPU in a region without it fails the deploy.
 * - **Sleep:** `minInstances: 0` sleeps after `idleTimeoutSeconds` (300–43,200
 *   s; the upper end depends on your plan) and wakes in 1–5 s plus the model
 *   load. `'us'` → `was`, `'eu'` → `fra`.
 * - **GPU instances need a paid plan** and a card on file (Koyeb holds a
 *   pre-authorization); the deploy fails with Koyeb's message otherwise.
 * - `remove()` deletes the whole app. `list()` returns services whose app has
 *   the same name — the shape this bond creates.
 * - API errors throw `KoyebApiError` with the HTTP `status` and Koyeb's `code`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './client.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
