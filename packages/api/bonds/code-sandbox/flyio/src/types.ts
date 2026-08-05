/**
 * Fly.io Machines sandbox provider configuration and wire types.
 *
 * Wire types mirror the Fly Machines OpenAPI specification
 * (https://docs.machines.dev/openapi.json, servers: `https://api.machines.dev/v1`).
 * Only the fields this provider actually reads or writes are modelled — the real
 * schemas are much larger, and modelling fields we never use would rot silently.
 *
 * @module
 */

/**
 * Configuration for the Fly.io Machines sandbox provider.
 *
 * Every option is also readable from an environment variable (see
 * {@link ProcessEnv}); explicit config always wins.
 */
export interface FlyioConfig {
  /**
   * Fly API token (sent as `Authorization: Bearer <token>`). Falls back to
   * `FLY_API_TOKEN`, then `FLY_ACCESS_TOKEN`. Required — the provider throws a
   * named error on the first API call if none is resolvable.
   */
  apiToken?: string
  /**
   * Machines API base URL, INCLUDING the `/v1` path segment. Defaults to
   * `FLY_API_HOSTNAME` (with `/v1` appended when the value has no path) or
   * `https://api.machines.dev/v1`. From inside a Fly private network the
   * documented internal endpoint is `http://_api.internal:4280/v1`.
   */
  apiUrl?: string
  /**
   * Fly organization slug that owns the sandbox apps. Falls back to
   * `FLY_ORG_SLUG`, then `personal`. Required for app creation and for
   * {@link FlyioConfig.appPerProject} listing.
   */
  orgSlug?: string
  /**
   * Shared Fly app that holds every sandbox Machine. Only used when
   * `appPerProject` is `false`. Falls back to `FLY_SANDBOX_APP`.
   *
   * A shared app puts every tenant on ONE 6PN private network, where each
   * sandbox can reach every other sandbox's dev-server ports by private IPv6.
   * That is the same cross-tenant exposure the Docker bond's `bridge` network
   * has, so this mode is REFUSED in production.
   */
  appName?: string
  /**
   * Name prefix for the per-project Fly app when `appPerProject` is `true`
   * (default). The app is `<appPrefix>-<sanitized projectId>`. Falls back to
   * `FLY_SANDBOX_APP_PREFIX`, then `mol-sandbox`.
   */
  appPrefix?: string
  /**
   * Create one Fly app — on its own custom 6PN private network — per project,
   * so tenants are network-isolated from each other. Defaults to `true`.
   * Set `false` (or `FLY_SANDBOX_APP_PER_PROJECT=false`) only for a
   * single-tenant deployment; it is refused in production.
   */
  appPerProject?: boolean
  /**
   * Custom 6PN network name for a per-project app. Defaults to the app name, so
   * every project lands on its own private network. Ignored when
   * `appPerProject` is `false`. A Fly app's network CANNOT be changed after
   * creation.
   */
  network?: string
  /** Fly region for Machines and volumes (e.g. `iad`). Falls back to `FLY_REGION`, then `iad`. */
  region?: string
  /**
   * OCI image every sandbox Machine runs. Must be pullable by Fly — a tag in
   * the org's `registry.fly.io` repository or a public registry. A LOCAL
   * `molecule-sandbox:latest` is not reachable by Fly; push it first. Falls
   * back to `FLY_SANDBOX_IMAGE`, then `registry.fly.io/molecule-sandbox:latest`.
   */
  baseImage?: string
  /** Default vCPU count (`guest.cpus`). Defaults to 1. */
  defaultCpu?: number
  /** Default `guest.cpu_kind` — `shared` or `performance`. Defaults to `shared`. */
  defaultCpuKind?: string
  /** Default memory in MB (`guest.memory_mb`). Defaults to 1024. */
  defaultMemoryMB?: number
  /**
   * Size in GB of the volume created for a sandbox's `/workspace` when
   * `SandboxConfig.volumeName` is set. Fly volumes are sized in whole GB, so the
   * core's `resources.diskMB` is rounded UP to the next GB. Defaults to 10.
   */
  defaultVolumeGB?: number
  /** Internal port the preview service forwards to (the Vite dev server). Defaults to 5173. */
  previewPort?: number
  /**
   * Preview URL template. Placeholders `{app}`, `{machineId}` and `{port}` are
   * all replaced globally. Defaults to `https://{app}.fly.dev`.
   *
   * For a control plane that runs on the SAME Fly 6PN, the private form
   * `http://{machineId}.vm.{app}.internal:{port}` reaches the Machine with no
   * public exposure at all — but it does NOT work across custom 6PNs, which is
   * exactly what `appPerProject` creates. See the module `@remarks`.
   */
  previewUrlTemplate?: string
  /**
   * Attach a public Fly Proxy service (`80` → http, `443` → tls+http) forwarding
   * to {@link FlyioConfig.previewPort}. Defaults to `true`. Set `false` for a
   * fully private sandbox reached only over 6PN/Flycast.
   */
  publicService?: boolean
  /**
   * Fly Proxy idle behaviour for the preview service. `suspend` (the default)
   * is the scale-to-zero mapping this bond exists for: the proxy suspends an
   * idle Machine and resumes it from its memory snapshot on the next request.
   * `stop` is a full stop (cold boot on wake); `off` never idles the Machine.
   */
  autostop?: 'off' | 'stop' | 'suspend'
  /**
   * Allocate a shared Anycast IPv4 for a newly-created app so `<app>.fly.dev`
   * serves traffic. Defaults to `false` (opt-in). See the module `@remarks` —
   * the accepted `type` values for the IP-assignment endpoint are NOT enumerated
   * in Fly's OpenAPI specification.
   */
  assignSharedIpv4?: boolean
  /** IP type requested when {@link FlyioConfig.assignSharedIpv4} is on. Defaults to `shared_v4`. */
  ipAssignmentType?: string
  /** Prefix for the Machine metadata keys this provider owns. Defaults to `molecule-sandbox`. */
  metadataPrefix?: string
  /** Timeout for a single Machines API request, in ms. Defaults to 30000. */
  requestTimeoutMs?: number
}

/**
 * Environment variables the Fly.io sandbox provider reads. Every one is
 * overridden by the matching {@link FlyioConfig} field.
 */
export interface ProcessEnv {
  /** Fly API token. Also accepted as `FLY_ACCESS_TOKEN`. */
  FLY_API_TOKEN?: string
  /** Fly API token (flyctl's variable name). Used when `FLY_API_TOKEN` is unset. */
  FLY_ACCESS_TOKEN?: string
  /** Machines API base URL. `/v1` is appended when the value carries no path. */
  FLY_API_HOSTNAME?: string
  /** Fly organization slug owning the sandbox apps (default `personal`). */
  FLY_ORG_SLUG?: string
  /** Shared Fly app name, used only when `FLY_SANDBOX_APP_PER_PROJECT=false`. */
  FLY_SANDBOX_APP?: string
  /** Per-project Fly app name prefix (default `mol-sandbox`). */
  FLY_SANDBOX_APP_PREFIX?: string
  /** `false` disables per-project apps (refused in production). */
  FLY_SANDBOX_APP_PER_PROJECT?: string
  /** Fly region for Machines and volumes (default `iad`). */
  FLY_REGION?: string
  /** OCI image for sandbox Machines. */
  FLY_SANDBOX_IMAGE?: string
}

/**
 * A Fly Machine state, as documented at https://fly.io/docs/machines/machine-states/.
 * Modelled as a union of the documented values plus `string` so an unrecognized
 * future state is carried through rather than crashing the mapper.
 */
export type FlyMachineState =
  | 'created'
  | 'creating'
  | 'starting'
  | 'started'
  | 'stopping'
  | 'stopped'
  | 'suspending'
  | 'suspended'
  | 'restarting'
  | 'updating'
  | 'replacing'
  | 'replaced'
  | 'migrated'
  | 'destroying'
  | 'destroyed'
  | 'failed'
  | 'launch_failed'
  | (string & {})

/** A Fly Machine, as returned by the Machines API (fields this provider reads). */
export interface FlyMachine {
  id: string
  name?: string
  /** Optional so a response that omits it degrades to `created` rather than crashing the mapper. */
  state?: FlyMachineState
  region?: string
  private_ip?: string
  config?: FlyMachineConfig
}

/** A Machine as returned by the org-wide list endpoint (`GET /orgs/{org}/machines`). */
export interface FlyOrgMachine extends FlyMachine {
  app_name: string
}

/** Machine configuration (`fly.MachineConfig`) — the subset this provider writes. */
export interface FlyMachineConfig {
  image: string
  env?: Record<string, string>
  metadata?: Record<string, string>
  guest?: { cpus?: number; cpu_kind?: string; memory_mb?: number }
  mounts?: Array<{ volume?: string; name?: string; path: string }>
  services?: FlyMachineService[]
  restart?: { policy?: 'no' | 'always' | 'on-failure' | 'spot-price'; max_retries?: number }
  auto_destroy?: boolean
  init?: { exec?: string[]; entrypoint?: string[]; cmd?: string[]; tty?: boolean }
}

/** A Fly Proxy service attached to a Machine (`fly.MachineService`). */
export interface FlyMachineService {
  protocol: string
  internal_port: number
  ports: Array<{ port: number; handlers?: string[]; force_https?: boolean }>
  autostart?: boolean
  autostop?: 'off' | 'stop' | 'suspend'
  min_machines_running?: number
}

/** A Fly volume (fields this provider reads). */
export interface FlyVolume {
  id: string
  name: string
  state?: string
  size_gb?: number
  region?: string
  attached_machine_id?: string
}

/** Response body of `POST /v1/apps/{app}/machines/{id}/exec` (`flydv1.ExecResponse`). */
export interface FlyExecResponse {
  stdout?: string
  stderr?: string
  exit_code?: number
  exit_signal?: number
}
