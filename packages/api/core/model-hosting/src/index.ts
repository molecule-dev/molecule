/**
 * Model hosting for molecule.dev — run a container that serves a model on
 * rented GPUs or CPUs, and get back an HTTPS URL plus the headers to call it.
 *
 * One sentence: run this image on this hardware in this region, give me a URL
 * and the headers to call it with, and let it scale between min and max. You
 * pass the image, port, health path, hardware, region and scaling; the
 * provider discovers nothing. Pair it with `@molecule/api-ai-decisions` to
 * self-host Laya, Jeff, Intern-Decision or Kev — or with anything else that is
 * a container behind an HTTP port.
 *
 * This core defines the `ModelHostingProvider` contract and its accessor only.
 * Bond one (or several, by name):
 *
 * | Bond | Where it runs | Scale to zero | Endpoint auth |
 * |---|---|---|---|
 * | `@molecule/api-model-hosting-cloud-run` | Google Cloud Run — CPU (request-billed, near free at low volume) or an NVIDIA L4 | yes | IAM: a Google-signed ID token (`authHeaders` mints and refreshes it) |
 * | `@molecule/api-model-hosting-modal` | Modal — T4/L4/A10… or CPU, per-second billing, ~1 s container boot | yes | proxy auth (`Modal-Key` / `Modal-Secret`) |
 * | `@molecule/api-model-hosting-runpod` | RunPod Serverless load-balancing endpoints — 16 GB+ GPUs | yes | your RunPod API key as a bearer token |
 * | `@molecule/api-model-hosting-koyeb` | Koyeb — CPU or RTX 4000 / L4, EU or US | yes (sleep) | none — the server must check its own key |
 * | `@molecule/api-model-hosting-docker` | a Docker host you run (NVIDIA runtime for GPUs) | no | none — the server must check its own key |
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-model-hosting'
 * import { provider as cloudRun } from '@molecule/api-model-hosting-cloud-run'
 * import { setProvider as setDecisions } from '@molecule/api-ai-decisions'
 * import { createProvider as createLaya } from '@molecule/api-ai-decisions-laya'
 *
 * setProvider(cloudRun) // reads GOOGLE_CLOUD_PROJECT + GOOGLE_SERVICE_ACCOUNT_JSON on first use
 * const hosting = requireProvider()
 *
 * const endpoint = await hosting.deploy({
 *   name: 'laya',
 *   image: 'us-docker.pkg.dev/acme/models/laya-serve:0.3.1',
 *   port: 8000,
 *   healthPath: '/health',
 *   accelerator: { kind: 'cpu' },
 *   cpu: 2,
 *   memoryMb: 4096,
 *   region: 'us',
 *   scaling: { minInstances: 0, maxInstances: 3, idleTimeoutSeconds: 900 },
 *   access: 'private',
 * })
 *
 * setDecisions(createLaya({ baseUrl: endpoint.url, headers: () => hosting.authHeaders(endpoint.id) }))
 * ```
 *
 * @remarks
 * - **Scale to zero is not free at steady traffic.** A request every ~17 s
 *   (5,000 a day) keeps any instance with an idle window ≥ 60 s warm all day,
 *   so a GPU endpoint costs its always-on price during active hours. Scale to
 *   zero pays off for bursty or nightly work; batch GPU work to use it.
 * - **Cold starts are real latency.** The first request after idle waits for
 *   the instance AND the model to load (seconds on CPU, tens of seconds for a
 *   multi-GB GPU model). Keep `minInstances: 1` for anything a user waits on,
 *   or retry — RunPod's own guidance is 3 retries 5–10 s apart.
 * - **`healthPath` gates "ready".** `deploy` resolves only when that path
 *   answers 2xx; a server whose health route answers before the model is
 *   loaded makes `ready` a lie.
 * - **Small encoders do not need a GPU.** Laya (421M) and GLiNER (340M) run on
 *   2 vCPU / 4 GB; ask for `{ kind: 'cpu' }` first and measure before renting
 *   a GPU. Qwen-based models (Jeff, Intern-Decision, Kev) need CUDA.
 * - **Hosts that CANNOT do this (verified 2026-09-30):** Fly.io has no GPUs any
 *   more; Cloudflare Workers AI only takes LoRA adapters on its own base models
 *   and Cloudflare Containers have no GPUs; SageMaker Serverless has no GPUs
 *   and needs SigV4 signing. There are no bonds for them on purpose.
 * - **`access: 'private'` on a provider without endpoint auth** (Koyeb,
 *   Docker — `capabilities.platformAuth` is false) is refused unless you set
 *   `serverEnforcesAuth: true` and pass the server's key in `secretEnv` (e.g.
 *   `LAYA_API_KEY`), then give the same key to the consumer (`apiKey`).
 * - **`authHeaders(id)` is async and short-lived** on Cloud Run (an ID token,
 *   about an hour). Call it per request — pass it as the consumer's `headers`
 *   hook — never store its result.
 * - **Prices move.** `estimate()` quotes dated list prices; re-check the
 *   vendor's page before committing to a spend.
 * - Every bond calls `assertDeployable(spec, capabilities, name)` before its
 *   first API call, so an impossible spec fails without creating anything.
 * - Use the core's `setProvider`, not `bond('model-hosting', …)` directly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
