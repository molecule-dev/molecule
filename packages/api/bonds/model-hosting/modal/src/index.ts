/**
 * Modal model hosting for molecule.dev — run a model server container on a
 * T4/L4/A10… GPU or CPU with per-second billing, scale to zero, behind Modal
 * proxy auth.
 *
 * Modal is the cheap place for small GPU models (Kev, Jeff, Intern-Decision —
 * a T4 fits a 0.8–4B fine-tune) and the easiest place to keep one warm-cheap:
 * containers boot in about a second, idle windows go down to 2 s, and $30/mo
 * of compute is free on the Starter plan.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-model-hosting'
 * import { provider as modal } from '@molecule/api-model-hosting-modal'
 *
 * setProvider('modal', modal) // reads MODAL_TOKEN_ID/SECRET + MODAL_WORKSPACE on first use
 *
 * const endpoint = await requireProvider().deploy({
 *   name: 'kev',
 *   image: 'ghcr.io/acme/kev-serve:0.8.2',
 *   // Modal starts the server from Python, so the command is required:
 *   command: ['kev-serve', '--port', '8000'],
 *   port: 8000,
 *   healthPath: '/health',
 *   accelerator: { kind: 'gpu', minVramGb: 16 }, // smallest fit → T4
 *   region: 'us',
 *   scaling: { minInstances: 0, maxInstances: 2, idleTimeoutSeconds: 300 },
 *   access: 'private',
 * })
 * const headers = await requireProvider().authHeaders(endpoint.id) // { 'Modal-Key': …, 'Modal-Secret': … }
 * ```
 *
 * @remarks
 * - **Deploys run the `modal` CLI** — Modal has no REST deploy API. The
 *   machine calling `deploy` needs the `modal` binary (and, for `scale`, a
 *   `python3` with the `modal` package). The CLI authenticates with
 *   `MODAL_TOKEN_ID` + `MODAL_TOKEN_SECRET`; the endpoint URL needs
 *   `MODAL_WORKSPACE` (and `MODAL_ENVIRONMENT` / `MODAL_ENVIRONMENT_SUFFIX`
 * when not deploying to the default environment).
 * - **`command` is required** — Modal starts your server from a Python
 *   function (`@modal.web_server` wraps the image), so it cannot just run the
 *   image's entrypoint. An image without a Python interpreter needs
 *   `createProvider({ addPython: '3.12' })` (`Image.from_registry(…,
 *   add_python=…)`).
 * - **`scale` rewrites the live autoscaler** (`Function.update_autoscaler`) —
 *   min/max/idle take effect without a redeploy. Per-instance concurrency is
 *   a decorator and needs a fresh `deploy`. `scale` on an endpoint this
 *   process did not deploy cannot find the app to scale — it is the one
 *   method that is not purely id-driven.
 * - **There is no delete on Modal** — `remove` stops the app (serves nothing,
 *   bills nothing); the name stays taken.
 * - **`authHeaders` returns Modal proxy-auth headers** (`Modal-Key` /
 *   `Modal-Secret` from `MODAL_PROXY_TOKEN_ID` / `MODAL_PROXY_TOKEN_SECRET`)
 *   for `access: 'private'` endpoints — Modal calls this "proxy auth"
 *   (`requires_proxy_auth=True`). Feed them to the ai-decisions bonds'
 *   `headers` hook per request. `access: 'public'` needs no headers, and is
 *   reachable by anyone with the URL.
 * - **`list()` is environment-wide**: Modal cannot mark which apps this bond
 *   created, so it lists every deployed app in the configured environment.
 *   Region/hardware/scaling read back correctly only for endpoints this
 *   process deployed.
 * - **Billing is per container-second, not per request**: with
 *   `minInstances ≥ 1` you pay around the clock; with `minInstances: 0` only
 *   while containers are up (requests + the scaledown tail). `estimate`
 *   prices the first exactly and the second by busy time alone.
 * - GPUs price at T4 $0.000164/s and L4 $0.000222/s (verified
 *   2026-09-30); other GPU ids deploy fine but `estimate` refuses them rather
 *   than guess. Region pinning costs 1.15× (`us`/`eu`) to 1.75×.
 *
 * @module
 */

export { appSource, gpuFor, MODAL_GPUS, toPython } from './app-source.js'
export { endpointUrl, MODAL_FUNCTION_NAME, ModalClient, resolveModalConfig } from './client.js'
export {
  createProvider,
  fromAppRow,
  MODAL_CAPABILITIES,
  MODAL_PRICES,
  provider,
  regionMultiplier,
} from './provider.js'
export { modelHostingModalSecretDefinitions } from './secrets.js'
export * from './types.js'
