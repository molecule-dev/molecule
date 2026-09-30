/**
 * Google Cloud Run model hosting for molecule.dev — run a model server
 * container on CPU or an NVIDIA L4 GPU, scaled between min and max instances
 * (including zero), behind Google IAM.
 *
 * Cloud Run is the cheap place for small encoder models (Laya, GLiNER) on CPU:
 * request-based billing charges only while a request is being served, with a
 * monthly free tier. The same API runs an L4 GPU (instance-billed) when a
 * Qwen-based model needs CUDA.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-model-hosting'
 * import { provider } from '@molecule/api-model-hosting-cloud-run'
 *
 * setProvider(provider) // reads GOOGLE_CLOUD_PROJECT + GOOGLE_SERVICE_ACCOUNT_JSON on first use
 *
 * const endpoint = await requireProvider().deploy({
 *   name: 'laya',
 *   image: 'us-docker.pkg.dev/acme/models/laya-serve:0.3.1',
 *   port: 8000,
 *   healthPath: '/health',
 *   accelerator: { kind: 'cpu' },
 *   region: 'us',
 *   scaling: { minInstances: 0, maxInstances: 3, idleTimeoutSeconds: 900 },
 *   access: 'private',
 * })
 * const headers = await requireProvider().authHeaders(endpoint.id) // { authorization: 'Bearer <ID token>' }
 * ```
 *
 * @remarks
 * - **Credentials:** `GOOGLE_CLOUD_PROJECT` and `GOOGLE_SERVICE_ACCOUNT_JSON`
 *   (the key file CONTENTS). The account needs Cloud Run Admin to deploy and
 *   Cloud Run Invoker on the services to call private ones; the Cloud Run API
 *   must be enabled and billing on.
 * - **Images must be pullable by Cloud Run** — Artifact Registry in the same
 *   project, or a public registry. A private GHCR/Docker Hub image fails the
 *   deploy with a pull error in the endpoint's `error`.
 * - **`authHeaders` mints a Google-signed ID token** for the service URL and
 *   caches it for about an hour. Call it per request (the ai-decisions bonds'
 *   `headers` hook) — never store the value. `access: 'public'` sets
 *   `invokerIamDisabled` and `authHeaders` returns `{}`.
 * - **GPU = NVIDIA L4 only here**, in us-central1, us-east4, europe-west1,
 *   europe-west4, asia-south1, asia-southeast1 (`'us'` → us-central1, `'eu'` →
 *   europe-west4). It forces ≥ 4 vCPU / 16 GiB and instance-based billing, and
 *   zonal redundancy is turned off (cheaper; a zone outage takes it down). New
 *   projects start with a small GPU quota.
 * - **`idleTimeoutSeconds` is ignored** — Cloud Run decides when idle
 *   instances stop. `minInstances: 0` means no instance (and, on CPU, no cost)
 *   while idle.
 * - **`secretEnv` becomes plain environment variables** on the revision,
 *   readable by anyone with viewer access to the project. For real secrets
 *   use Secret Manager references yourself.
 * - **`deploy` waits for the Ready condition** (startup probe on `healthPath`,
 *   up to 10 minutes of probing) and polls every 5 s; a failed rollout returns
 *   `status: 'failed'` with Cloud Run's message.
 * - `list()` returns only services this bond created (label
 *   `managed-by=molecule-model-hosting`) in the us/eu regions configured.
 * - Errors from the API throw `CloudRunApiError` with the HTTP `status` and
 *   Google's error `code` (e.g. `PERMISSION_DENIED`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './client.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
