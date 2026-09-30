/**
 * Model hosting contract: run a container image that serves a model on rented
 * (or your own) hardware, get back an HTTPS URL and the headers to call it with.
 *
 * The caller passes everything it knows — image, port, health path, hardware,
 * region, scaling. A provider never discovers or guesses any of them.
 *
 * @module
 */

/**
 * Hardware the caller asks for.
 *
 * `gpu` picks the provider's cheapest GPU with at least `minVramGb` of memory,
 * unless `model` names one exactly (a provider id such as `'nvidia-l4'`,
 * `'nvidia-t4'`, `'AMPERE_16'`, `'gpu-nvidia-rtx-4000-sff-ada'`).
 */
export type Accelerator =
  | { kind: 'cpu' }
  | {
      kind: 'gpu'
      /** Smallest acceptable GPU memory, in GB. */
      minVramGb: number
      /** A provider-specific GPU id that overrides the `minVramGb` choice. */
      model?: string
    }

/** How many instances may run, and when idle ones stop. */
export interface EndpointScaling {
  /** Instances kept running at all times. `0` = scale to zero when idle. */
  minInstances: number
  /** Upper bound on instances. */
  maxInstances: number
  /**
   * Seconds without traffic before an instance stops. Providers clamp this to
   * their own range (`capabilities.idleTimeoutRange`).
   */
  idleTimeoutSeconds: number
  /** Concurrent requests one instance takes before another starts (where the provider supports it). */
  concurrency?: number
}

/** Everything a provider needs to run one model server. */
export interface ModelEndpointSpec {
  /** Stable name. `deploy` with an existing name updates that endpoint in place. Lowercase letters, digits and `-`. */
  name: string
  /** OCI image reference, e.g. `'ghcr.io/acme/laya-serve:0.3.1'`. */
  image: string
  /** Port the server listens on inside the container. */
  port: number
  /** `GET` path that answers 2xx once the model is loaded (e.g. `'/health'`). */
  healthPath: string
  /**
   * Command that starts the server, when the image's own entrypoint does not.
   * Some providers require it (Modal starts the server from a Python function).
   */
  command?: string[]
  /** Plain environment variables. */
  env?: Readonly<Record<string, string>>
  /** Values the provider stores as secrets where it can, never logged. */
  secretEnv?: Readonly<Record<string, string>>
  /** Hardware. */
  accelerator: Accelerator
  /** vCPUs per instance (providers round to what they offer). */
  cpu?: number
  /** Memory per instance, in MB. */
  memoryMb?: number
  /** `'us'`, `'eu'`, or a provider region id (e.g. `'us-central1'`, `'fra'`). */
  region: string
  /** Scaling bounds. */
  scaling: EndpointScaling
  /**
   * `'private'`: only callers holding `authHeaders(id)` get through — on
   * providers WITHOUT their own endpoint auth (`capabilities.platformAuth`
   * false) you must also set `serverEnforcesAuth: true`, meaning the server
   * itself checks a key you passed in `secretEnv`. `'public'`: no auth at all
   * (tests only).
   */
  access: 'private' | 'public'
  /**
   * You confirm the model server checks its own API key (e.g. `LAYA_API_KEY`
   * passed in `secretEnv`). Required for `access: 'private'` on providers whose
   * `capabilities.platformAuth` is false; ignored elsewhere.
   */
  serverEnforcesAuth?: boolean
}

/** Lifecycle of an endpoint as the provider reports it. */
export type EndpointStatus = 'deploying' | 'ready' | 'scaled-to-zero' | 'failed' | 'removed'

/** A deployed model server. */
export interface ModelEndpoint {
  /** Provider-scoped id; pass it to `get`, `scale`, `remove`, `authHeaders`. */
  id: string
  /** The spec's `name`. */
  name: string
  /** The provider's `name`. */
  provider: string
  /** Plain HTTPS (or, for self-hosted, HTTP) base URL of the server. */
  url: string
  /** Current status. */
  status: EndpointStatus
  /** Region it runs in. */
  region: string
  /** Hardware it runs on (as requested). */
  accelerator: Accelerator
  /** Scaling as last set. */
  scaling: EndpointScaling
  /** ISO timestamp, when the provider reports one. */
  createdAt?: string
  /** Last failure text from the provider, when `status` is `'failed'`. */
  error?: string
}

/** What a provider can do — check before deploying. */
export interface ProviderCapabilities {
  /** Accelerator ids it accepts, `'cpu'` first when CPU is offered. */
  accelerators: readonly string[]
  /** Region ids it accepts (plus the `'us'` / `'eu'` aliases it maps). */
  regions: readonly string[]
  /** Whether `minInstances: 0` actually stops billing for idle instances. */
  scaleToZero: boolean
  /** Inclusive range, in seconds, accepted for `idleTimeoutSeconds`. */
  idleTimeoutRange: readonly [number, number]
  /**
   * Whether the provider itself can refuse unauthenticated calls to an
   * endpoint (Cloud Run IAM, Modal proxy auth, RunPod API key). When false,
   * `access: 'private'` needs `serverEnforcesAuth`.
   */
  platformAuth: boolean
  /** The provider's own stated cold start, for display only. */
  coldStartHint?: string
}

/** Options for `deploy`. */
export interface DeployOptions {
  /** Progress lines (status changes, provider messages). */
  log?: (line: string) => void
  /** Give up waiting for the health path after this long (default is provider-specific). */
  timeoutMs?: number
}

/** The model hosting provider every bond implements. */
export interface ModelHostingProvider {
  /** Provider identifier (`'cloud-run'`, `'modal'`, `'runpod'`, `'koyeb'`, `'docker'`). */
  readonly name: string
  /** What this provider supports. */
  readonly capabilities: ProviderCapabilities
  /**
   * Create the endpoint, or update it in place when one named `spec.name`
   * exists. Resolves once it serves traffic (or with `status: 'failed'`).
   */
  deploy(spec: ModelEndpointSpec, opts?: DeployOptions): Promise<ModelEndpoint>
  /** One endpoint by id, or `null` when it does not exist. */
  get(id: string): Promise<ModelEndpoint | null>
  /** Every endpoint this provider manages for you. */
  list(): Promise<ModelEndpoint[]>
  /** Change scaling without redeploying the image where the provider allows it. */
  scale(id: string, scaling: EndpointScaling): Promise<ModelEndpoint>
  /** Delete the endpoint and stop its billing. Removing a missing endpoint is not an error. */
  remove(id: string): Promise<void>
  /**
   * Headers to attach to every request to the endpoint. Async because some
   * are short-lived (Cloud Run ID tokens); providers cache and refresh them.
   * Empty for public endpoints and for providers without platform auth.
   */
  authHeaders(id: string): Promise<Record<string, string>>
  /**
   * Optional: price a spec at an expected load from the provider's dated list
   * prices (never guessed). Absent on providers that bill per account plan.
   */
  estimate?(spec: ModelEndpointSpec, load: ExpectedLoad): Promise<CostEstimate>
}

/** Traffic to price a spec at. */
export interface ExpectedLoad {
  /** Requests per day. */
  requestsPerDay: number
  /** Busy time one request takes on the chosen hardware, in ms. */
  busyMsPerRequest: number
}

/** A monthly price with the inputs it came from. */
export interface CostEstimate {
  /** Always USD. */
  currency: 'USD'
  /** Estimated cost per 30-day month. */
  monthly: number
  /** Each price used: what, how much, per what, where it was read, and when. */
  basis: ReadonlyArray<{
    item: string
    unitPrice: number
    unit: string
    source: string
    verifiedAt: string
  }>
}
