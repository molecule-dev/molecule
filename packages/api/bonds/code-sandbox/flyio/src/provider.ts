/**
 * Fly.io Machines implementation of `SandboxProvider`.
 *
 * Each sandbox is one Fly Machine — a Firecracker microVM — inside a Fly app,
 * managed over the Machines API at `https://api.machines.dev/v1`.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type {
  CommitTemplateOptions,
  DirEntry,
  EgressVerdict,
  ExecOptions,
  ExecResult,
  FileChangeEvent,
  ListTemplatesOptions,
  Sandbox,
  SandboxConfig,
  SandboxProvider,
  SandboxTemplate,
} from '@molecule/api-code-sandbox'
import { t } from '@molecule/api-i18n'

import { FlyApiClient, FlyApiError, normalizeApiUrl } from './api.js'
import {
  buildEgressProbeCommand,
  DEFAULT_EGRESS_POLICY_NAME,
  DEFAULT_EGRESS_PROBE_TARGETS,
  extractPolicyId,
  parseEgressAllowedPorts,
  parseEgressProbeTargets,
  verdictForProbeExit,
} from './egress.js'
import { execCommand, type RawExec, toExecResult } from './exec.js'
import {
  assertPrivateRoutesForEnv,
  decodePrivateRoutes,
  DEFAULT_PRIVATE_IP_TYPE,
  encodePrivateRoutes,
  flycastHost,
  mergeEgressPorts,
  parsePrivateServices,
  PRIVATE_ROUTES_METADATA_SUFFIX,
} from './flycast.js'
import { appNameForProject, mapMachineState, parseSandboxId, toSandboxId } from './ids.js'
import { createTemplateStore, MAX_PRESIGN_EXPIRY_SECONDS, type ObjectStore } from './storage.js'
import * as templates from './templates.js'
import type {
  FlyExecResponse,
  FlyioConfig,
  FlyIpAssignment,
  FlyMachine,
  FlyMachineConfig,
  FlyMachineService,
  FlyNetworkPolicy,
  FlyNetworkPolicyPort,
  FlyOrgMachine,
  FlyPrivateService,
  FlyVolume,
} from './types.js'
import { shellQuote } from './utilities.js'

const logger = getLogger()

/**
 * Default sandbox image. Fly pulls images itself, so this MUST be a reference
 * Fly can resolve — a tag in the org's `registry.fly.io` repository or a public
 * registry. A local `molecule-sandbox:latest` is invisible to Fly.
 */
const DEFAULT_IMAGE = 'registry.fly.io/molecule-sandbox:latest'

/** Default Fly region for Machines and volumes. */
const DEFAULT_REGION = 'iad'

/** Default per-project Fly app name prefix. */
const DEFAULT_APP_PREFIX = 'mol-sandbox'

/** Default metadata key prefix identifying Machines this provider manages. */
const DEFAULT_METADATA_PREFIX = 'molecule-sandbox'

/** Default internal port the preview service forwards to (the Vite dev server). */
const DEFAULT_PREVIEW_PORT = 5173

/** Working directory every exec and file operation is relative to. */
const WORKSPACE_PATH = '/workspace'

/** Default volume size in GB when `SandboxConfig.resources.diskMB` is unset. */
const DEFAULT_VOLUME_GB = 10

/** Page size for the org-wide Machine listing. */
const LIST_PAGE_SIZE = 200

/** Hard cap on pages fetched while listing, so a bad cursor cannot loop forever. */
const LIST_MAX_PAGES = 50

/**
 * Chunk size for base64-encoded `writeFile` payloads. `sh -c` receives the whole
 * command as ONE argument, which Linux caps at MAX_ARG_STRLEN (128 KB), so a
 * file over ~45 KB has to be written across several appends.
 */
const WRITE_CHUNK_BASE64 = 60_000

/**
 * Budget for the file-operation execs (`cat`, `ls`, `rm`, chunked writes), in ms.
 *
 * This MUST stay inside `DIRECT_EXEC_BUDGET_SECONDS` so file operations take the
 * single-call exec path. Leaving it at the default budget sent every file read
 * through the detach-and-poll path instead — three extra round-trips and a
 * minimum two-second poll wait for a `cat`, and a chunked write large enough to
 * be re-encoded past the launcher's argument limit.
 */
const FILE_OP_TIMEOUT_MS = 30_000

/**
 * Fly's own ceiling on `GET /v1/apps/{app}/machines/{id}/wait`: "This request
 * will block for up to 60 seconds."
 */
const MAX_WAIT_SECONDS = 60

/** Guest size for the throwaway `verifyEgress()` probe Machine. */
const PROBE_MEMORY_MB = 256

/**
 * How long the probe Machine's init command sleeps. It is destroyed explicitly
 * once the probe has run; this plus `auto_destroy` is the backstop that reaps it
 * if this process dies mid-check.
 */
const PROBE_LIFETIME_SECONDS = 300

/** Default per-connection timeout for the egress probe, in ms. */
const DEFAULT_PROBE_TIMEOUT_MS = 3000

/** Extra seconds allowed for the probe exec beyond its connection budget. */
const PROBE_EXEC_HEADROOM_SECONDS = 10

/**
 * Fly.io Machines implementation of `SandboxProvider`.
 *
 * Lifecycle mapping (every endpoint verified against
 * https://docs.machines.dev/openapi.json):
 *
 * | Interface | Fly Machines API |
 * |---|---|
 * | `create` | `POST /v1/apps/{app}/machines` (after ensuring the app exists) |
 * | `get` | `GET /v1/apps/{app}/machines/{id}` |
 * | `list` | `GET /v1/orgs/{org}/machines`, or `GET /v1/apps/{app}/machines` |
 * | `destroy` | `DELETE /v1/apps/{app}/machines/{id}?force=true` |
 * | `start` / `wake` | `POST /v1/apps/{app}/machines/{id}/start` |
 * | `stop` | `POST /v1/apps/{app}/machines/{id}/stop` |
 * | `sleep` | `POST /v1/apps/{app}/machines/{id}/suspend` |
 * | `exec` and all file ops | `POST /v1/apps/{app}/machines/{id}/exec` |
 */
class FlyioSandboxProvider implements SandboxProvider {
  readonly name = 'flyio'

  private readonly config: FlyioConfig
  private readonly client: FlyApiClient
  private readonly metadataPrefix: string
  /** Emit the `onFileChange` unsupported warning once per provider, not once per sandbox. */
  private warnedNoFileWatch = false
  /**
   * Memoized template store. `undefined` means "not resolved yet", `null` means
   * "resolved, and not configured" — resolution is deferred to first use so a
   * secrets bond can populate the environment after this singleton is built,
   * exactly like the API token.
   */
  private templateStoreCache: ObjectStore | null | undefined

  /**
   * Creates the provider.
   * @param config - Fly-specific configuration; every field also has an env fallback.
   * @param client - Injectable API client, for tests. Built from `config` when omitted.
   * @param store - Injectable template object store, for tests. Resolved from
   *   `config` (and the environment) on first use when omitted; pass `null` to
   *   model an operator who configured no store at all.
   */
  constructor(config: FlyioConfig = {}, client?: FlyApiClient, store?: ObjectStore | null) {
    this.config = config
    this.metadataPrefix = config.metadataPrefix ?? DEFAULT_METADATA_PREFIX
    if (store !== undefined) this.templateStoreCache = store
    this.client =
      client ??
      new FlyApiClient({
        // Resolved lazily on each request so a secrets bond can populate the
        // environment after the provider singleton is constructed.
        token: () =>
          this.config.apiToken ?? process.env.FLY_API_TOKEN ?? process.env.FLY_ACCESS_TOKEN,
        baseUrl: normalizeApiUrl(config.apiUrl ?? process.env.FLY_API_HOSTNAME),
        timeoutMs: config.requestTimeoutMs,
      })
  }

  // ---------------------------------------------------------------------------
  // Configuration resolution
  // ---------------------------------------------------------------------------

  /**
   * Resolves the Fly organization slug that owns sandbox apps.
   * @returns The org slug.
   */
  private orgSlug(): string {
    return this.config.orgSlug ?? process.env.FLY_ORG_SLUG ?? 'personal'
  }

  /**
   * Resolves the Fly region for Machines and volumes.
   * @returns The region code.
   */
  private region(): string {
    return this.config.region ?? process.env.FLY_REGION ?? DEFAULT_REGION
  }

  /**
   * Whether each project gets its own Fly app on its own custom 6PN network.
   * @returns `true` unless explicitly disabled.
   */
  private appPerProject(): boolean {
    if (this.config.appPerProject !== undefined) return this.config.appPerProject
    return process.env.FLY_SANDBOX_APP_PER_PROJECT !== 'false'
  }

  /**
   * Resolves the Fly app a project's Machine belongs to.
   *
   * In the default per-project mode this is `<prefix>-<projectId>`, which is
   * also the app's custom 6PN network name — so one tenant's sandbox cannot
   * reach another's over private networking. The shared-app mode puts every
   * tenant on ONE 6PN, which is the same cross-tenant exposure the Docker
   * bond's shared `bridge` network has, and is refused in production.
   * @param projectId - The project id from `SandboxConfig`.
   * @returns The Fly app name.
   * @throws {Error} When shared-app mode is selected in production, or with no app name.
   */
  private resolveApp(projectId: string): string {
    if (this.appPerProject()) {
      return appNameForProject(
        this.config.appPrefix ?? process.env.FLY_SANDBOX_APP_PREFIX ?? DEFAULT_APP_PREFIX,
        projectId,
      )
    }
    const shared = this.config.appName ?? process.env.FLY_SANDBOX_APP
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Shared-app mode is forbidden in production (via FLY_SANDBOX_APP_PER_PROJECT=false or ' +
          'config.appPerProject=false): every Machine in one Fly app shares a 6PN private ' +
          "network, so one tenant's sandbox can reach another tenant's dev-server ports by " +
          'private IPv6. Use the default per-project apps, each on its own custom 6PN.',
      )
    }
    if (!shared) {
      throw new Error(
        t('codeSandbox.flyio.error.noAppName', undefined, {
          defaultValue:
            'Shared-app mode needs an app name — set FLY_SANDBOX_APP or config.appName, ' +
            'or leave config.appPerProject at its default (true).',
        }),
      )
    }
    logger.warn(
      'Fly sandboxes are running in shared-app mode — every tenant shares one 6PN private ' +
        'network and can reach every other tenant sandbox by private IPv6. Use per-project apps.',
      { app: shared },
    )
    return shared
  }

  /**
   * Builds the Fly Proxy service exposing a sandbox's preview port, or `undefined`
   * when public exposure is disabled.
   *
   * `autostop: 'suspend'` is the scale-to-zero behaviour this bond exists for:
   * Fly Proxy suspends the Machine when it goes idle and resumes it from its
   * memory snapshot on the next request, so an idle sandbox bills only for its
   * rootfs and volume.
   * @returns The service definition, or `undefined`.
   */
  private previewService(): FlyMachineService | undefined {
    if (this.config.publicService === false) return undefined
    return {
      protocol: 'tcp',
      internal_port: this.config.previewPort ?? DEFAULT_PREVIEW_PORT,
      ports: [
        { port: 80, handlers: ['http'], force_https: true },
        { port: 443, handlers: ['tls', 'http'] },
      ],
      autostart: true,
      autostop: this.config.autostop ?? 'suspend',
      min_machines_running: 0,
    }
  }

  // ---------------------------------------------------------------------------
  // App + volume provisioning
  // ---------------------------------------------------------------------------

  /**
   * Resolves the custom 6PN network a project's app lives on, or `undefined` in
   * shared-app mode (where the app is on the org's default network).
   * @param app - The Fly app name.
   * @returns The network name, or `undefined`.
   */
  private networkFor(app: string): string | undefined {
    if (!this.appPerProject()) return undefined
    return this.config.network ?? app
  }

  /**
   * Resolves the apps every sandbox must reach across its per-project 6PN.
   *
   * Empty in shared-app mode: that app sits on the org's default network, where
   * `<app>.internal` already resolves and Flycast would add nothing.
   * @returns The declared services, or `undefined` when none are configured.
   */
  private privateServices(): FlyPrivateService[] | undefined {
    if (!this.appPerProject()) return undefined
    return (
      this.config.privateServices ?? parsePrivateServices(process.env.FLY_SANDBOX_PRIVATE_SERVICES)
    )
  }

  /**
   * Idempotently ensures the Fly app exists, creating it on its own custom 6PN
   * network in per-project mode, applies the egress network policy, and
   * allocates the Flycast routes that let the sandbox reach the tenant database
   * and the egress proxy.
   *
   * A Fly app's network CANNOT be changed after creation, so an app that already
   * exists is used as-is — this never silently "fixes" an app that was created
   * on the shared org network. The egress policy IS re-applied to an existing
   * app, because Fly applies a policy at Machine boot ("restart or redeploy the
   * Machines for changes to take effect") and this runs before the Machine is
   * created.
   * @param app - The Fly app name.
   * @param options - `privateRoutes: false` skips the Flycast allocation, which
   *   is what the throwaway `verifyEgress()` app wants: it never connects to
   *   anything but the probe targets, and allocating for an app that is deleted
   *   seconds later would leak one address per probe on every target app.
   * @returns Target app name → allocated private address, for recording in the
   *   Machine's metadata. Empty when no private services are declared.
   */
  private async ensureApp(
    app: string,
    options: { privateRoutes?: boolean } = {},
  ): Promise<Record<string, string>> {
    const existing = await this.client.request<{ name: string }>(`/apps/${app}`, { nullOn: [404] })

    if (!existing) {
      const body: Record<string, unknown> = { name: app, org_slug: this.orgSlug() }
      const network = this.networkFor(app)
      if (network) body.network = network

      let created = true
      try {
        await this.client.request(`/apps`, { method: 'POST', body })
        logger.info('Created Fly sandbox app', { app, network: body.network })
      } catch (error) {
        // 409/422 means another concurrent boot created the same app first, which
        // is exactly the outcome we wanted. Anything else is a real failure.
        if (error instanceof FlyApiError && (error.status === 409 || error.status === 422)) {
          logger.debug('Fly sandbox app already exists', { app })
          created = false
        } else {
          throw error
        }
      }

      if (created && this.config.assignSharedIpv4) await this.assignSharedIpv4(app)
    }

    await this.applyEgressPolicy(app)

    if (options.privateRoutes === false) return {}
    return this.ensurePrivateRoutes(app, Boolean(existing))
  }

  /**
   * Allocates a Flycast private address on every declared service app, INTO this
   * project's 6PN, so `<service>.flycast` resolves from inside the sandbox.
   *
   * A failure here is FATAL, for the same reason the egress policy's is: a
   * sandbox whose route to its own database was never created boots perfectly,
   * reports healthy, and then fails to connect somewhere deep inside the user's
   * own application — which is indistinguishable from the user's code being
   * wrong. Failing the boot with the app name and the remedy is the only honest
   * outcome.
   *
   * Self-healing rather than create-once: an app that already exists is checked
   * against the routes recorded on its Machines and any MISSING service is
   * allocated. Fly's own `IPAssignment` carries no network, so a listing on the
   * target app cannot answer "does this project already have a route" — the
   * Machine metadata this provider wrote is the only record.
   * @param app - The Fly app name (which is also its 6PN network name).
   * @param appExisted - Whether the app was already there, in which case its
   *   Machines may carry addresses allocated by an earlier boot.
   * @returns Target app name → private address.
   */
  private async ensurePrivateRoutes(
    app: string,
    appExisted: boolean,
  ): Promise<Record<string, string>> {
    const services = this.privateServices()
    const network = this.networkFor(app)
    if (!services?.length || !network) return {}

    const routes = appExisted ? await this.recordedPrivateRoutes(app) : {}
    for (const service of services) {
      if (routes[service.app]) continue
      const ip = await this.allocatePrivateAddress(service, network)
      if (ip) routes[service.app] = ip
    }
    return routes
  }

  /**
   * Reads the private addresses an earlier boot recorded on this app's Machines.
   * @param app - The Fly app name.
   * @returns Target app name → private address; empty when nothing is recorded.
   */
  private async recordedPrivateRoutes(app: string): Promise<Record<string, string>> {
    const key = `${this.metadataPrefix}.${PRIVATE_ROUTES_METADATA_SUFFIX}`
    try {
      const machines = await this.client.request<FlyMachine[]>(`/apps/${app}/machines`, {
        nullOn: [404],
      })
      for (const machine of machines ?? []) {
        const recorded = machine.config?.metadata?.[key]
        if (recorded) return decodePrivateRoutes(recorded)
      }
    } catch (error) {
      // Only the reuse optimization is lost. Falling through allocates the
      // routes again, which costs an address rather than a broken sandbox —
      // and the alternative (treating an unreadable listing as "routes exist")
      // is exactly the "I could not look" ⇒ "it is fine" conflation this
      // provider refuses everywhere else.
      logger.warn(
        'Could not read the Fly sandbox app’s Machines for recorded private routes — ' +
          'reallocating, which may leave an unreferenced address on the target apps',
        { app, error },
      )
    }
    return {}
  }

  /**
   * Allocates ONE Flycast private address on a target app, for this project's
   * network.
   *
   * `POST /v1/apps/{app}/ip_assignments` with `{type, network, org_slug}` — the
   * REST equivalent of `fly ips allocate-v6 --private --network <network>`. The
   * request schema (`assignIPRequest`) is in Fly's OpenAPI specification; the
   * `type` value is not enumerated there, so it is configurable.
   * @param service - The declared target app and the port sandboxes dial it at.
   * @param network - The project's 6PN, which requests will originate from.
   * @returns The allocated address, or `undefined` when Fly reports the address
   *   already exists and cannot be re-read.
   * @throws {Error} When the allocation fails, or succeeds without returning an
   *   address — an allocation this provider can neither verify nor release later
   *   is untracked state, and the boot is the last moment it can be reported.
   */
  private async allocatePrivateAddress(
    service: FlyPrivateService,
    network: string,
  ): Promise<string | undefined> {
    let assignment: FlyIpAssignment | null
    try {
      assignment = await this.client.request<FlyIpAssignment>(
        `/apps/${service.app}/ip_assignments`,
        {
          method: 'POST',
          body: {
            type: this.config.privateIpAssignmentType ?? DEFAULT_PRIVATE_IP_TYPE,
            network,
            org_slug: this.orgSlug(),
          },
        },
      )
    } catch (error) {
      // A conflict means an address for this (app, network) pair is already
      // there — from a boot that crashed between allocating and recording. The
      // ROUTE is what the sandbox needs and it exists, so this is not a boot
      // failure; it is an address this provider can no longer release, because
      // Fly's listing does not report which network an address belongs to.
      if (error instanceof FlyApiError && (error.status === 409 || error.status === 422)) {
        logger.warn(
          'A Fly private address for this project’s network already exists on the target app — ' +
            'the route works, but this one cannot be released on destroy. Reconcile with ' +
            '`fly ips list --app <target>`.',
          { target: service.app, network, status: error.status },
        )
        return undefined
      }
      throw new Error(
        t(
          'codeSandbox.flyio.error.privateRouteFailed',
          { app: service.app, network },
          {
            defaultValue:
              `Could not allocate a Flycast private address on Fly app "${service.app}" for ` +
              `network "${network}", so a sandbox in that network cannot reach ` +
              `"${flycastHost(service.app)}:${service.port}". Check that the API token may ` +
              `allocate IPs on "${service.app}", that the app exists in organization ` +
              `"${this.orgSlug()}", and that it declares an [http_service] or [services] section ` +
              '— Flycast routes through Fly Proxy and does nothing without one.',
          },
        ),
        { cause: error },
      )
    }

    if (!assignment?.ip) {
      throw new Error(
        t(
          'codeSandbox.flyio.error.privateRouteNoAddress',
          { app: service.app, network },
          {
            defaultValue:
              `Fly allocated a private address on app "${service.app}" for network "${network}" ` +
              'but returned no address, so it can never be released. Check ' +
              `\`fly ips list --app ${service.app}\` and remove the orphan.`,
          },
        ),
      )
    }
    logger.info('Allocated a Fly private (Flycast) address for a sandbox network', {
      target: service.app,
      network,
      host: flycastHost(service.app),
      port: service.port,
    })
    return assignment.ip
  }

  /**
   * Releases the Flycast addresses a project's sandbox recorded.
   *
   * Best-effort: the sandbox is being destroyed either way, and an address left
   * behind is a reconciliation item (`fly ips list --app <target>`) rather than
   * a failed teardown. It routes into a 6PN that no longer has any app in it.
   * @param routes - Target app name → private address, from Machine metadata.
   */
  private async releasePrivateRoutes(routes: Record<string, string>): Promise<void> {
    for (const [target, ip] of Object.entries(routes)) {
      try {
        await this.client.request(`/apps/${target}/ip_assignments/${encodeURIComponent(ip)}`, {
          method: 'DELETE',
          nullOn: [404],
        })
        logger.debug('Released a Fly private (Flycast) address', { target, ip })
      } catch (error) {
        logger.warn(
          'Failed to release a Fly private (Flycast) address — it will keep pointing at a 6PN ' +
            'with no apps in it until it is reconciled with `fly ips list`',
          { target, ip, error },
        )
      }
    }
  }

  /**
   * Resolves the ports the egress network policy allows, or `undefined` when no
   * policy should be applied.
   *
   * The operator's list is UNIONED with the port of every declared private
   * service, because those two are one decision wearing two hats: a policy is
   * deny-by-default once any rule exists, so declaring
   * `molecule-pg-tenant:5432` and leaving the policy at `tcp:3128` would drop
   * every database connection in the fleet with no diagnostic but a timeout.
   * Deriving it is what lets the operator documentation keep saying "never widen
   * this list" — see {@link mergeEgressPorts}.
   * @returns The allowed ports, or `undefined`.
   * @throws {Error} When configured with an EMPTY list. Fly documents the deny
   *   default as a consequence of an `allow` rule existing and says nothing
   *   about a rule with no ports, so accepting `[]` would ship a security
   *   control whose behaviour is a guess.
   */
  private egressAllowedPorts(): FlyNetworkPolicyPort[] | undefined {
    return mergeEgressPorts(this.configuredEgressPorts(), this.privateServices())
  }

  /**
   * Resolves ONLY the ports the operator configured, before the declared private
   * services are merged in.
   * @returns The configured ports, or `undefined` when no policy should be applied.
   * @throws {Error} When configured with an EMPTY list.
   */
  private configuredEgressPorts(): FlyNetworkPolicyPort[] | undefined {
    const configured = this.config.egressAllowedPorts
    if (configured) {
      if (configured.length === 0) {
        throw new Error(
          t('codeSandbox.flyio.error.emptyEgressPorts', undefined, {
            defaultValue:
              'config.egressAllowedPorts is empty. Fly derives its deny-all default from an ' +
              'existing allow rule and does not document a rule with no ports, so this provider ' +
              'refuses to send one. Omit the option for no policy, or allow at least one port.',
          }),
        )
      }
      return configured
    }
    return parseEgressAllowedPorts(process.env.FLY_SANDBOX_EGRESS_ALLOWED_PORTS)
  }

  /**
   * Applies this provider's egress network policy to an app, updating the
   * existing policy in place when one is already there.
   *
   * A failure here is FATAL to the caller, deliberately. The operator asked for
   * an egress restriction; booting a sandbox for untrusted code without it — and
   * logging a warning nobody reads — is the trade this whole capability exists to
   * refuse.
   * @param app - The Fly app name.
   * @returns Nothing; resolves once the policy is in place (or none was configured).
   */
  private async applyEgressPolicy(app: string): Promise<void> {
    const ports = this.egressAllowedPorts()
    if (!ports) return

    const name = this.config.egressPolicyName ?? DEFAULT_EGRESS_POLICY_NAME
    let id: string | undefined
    try {
      const listed = await this.client.request<unknown>(`/apps/${app}/network_policies/`, {
        nullOn: [404],
      })
      id = extractPolicyId(listed, name)
    } catch (error) {
      // Only the UPDATE-in-place optimization is lost: the POST below still
      // applies the policy, it just risks stacking a duplicate with identical
      // allow rules. Enforcement is what matters, so this does not fail the boot.
      logger.warn('Could not list Fly network policies — applying the egress policy as a create', {
        app,
        error,
      })
    }

    const policy: FlyNetworkPolicy = {
      ...(id ? { id } : {}),
      name,
      selector: { all: true },
      rules: [{ action: 'allow', direction: 'egress', ports }],
    }
    await this.client.request(`/apps/${app}/network_policies`, { method: 'POST', body: policy })
    logger.info('Applied Fly egress network policy', { app, name, ports, updated: Boolean(id) })
  }

  /**
   * Requests a shared Anycast IPv4 for the app so `<app>.fly.dev` serves traffic.
   *
   * Non-fatal: a sandbox is still fully usable over exec and private networking
   * without a public address, so an allocation failure degrades the preview URL
   * rather than failing the boot.
   * @param app - The Fly app name.
   */
  private async assignSharedIpv4(app: string): Promise<void> {
    try {
      await this.client.request(`/apps/${app}/ip_assignments`, {
        method: 'POST',
        body: {
          type: this.config.ipAssignmentType ?? 'shared_v4',
          org_slug: this.orgSlug(),
          region: this.region(),
        },
      })
    } catch (error) {
      logger.warn(
        'Failed to assign a shared IPv4 to the Fly sandbox app — the public preview URL will ' +
          'not resolve until an address is allocated',
        { app, error },
      )
    }
  }

  /**
   * Sanitizes a caller-supplied volume name into a conservative form.
   *
   * Fly does NOT document the character rules for volume names, so this reduces
   * to `[A-Za-z0-9_]`, which is the form every Fly example uses. Callers pass
   * names like `mol-<uuid>`; the hyphens become underscores.
   * @param name - The caller's volume name.
   * @returns A sanitized Fly volume name.
   */
  private volumeName(name: string): string {
    return name.replace(/[^A-Za-z0-9_]/g, '_')
  }

  /**
   * Idempotently ensures a volume exists in the app and returns its id.
   *
   * A Fly volume is app-scoped and attaches to exactly ONE Machine, which is why
   * volumes are provisioned here — inside `create()`, where the app, region and
   * size are all known — rather than through the core's optional
   * `createVolume(name)`; see the module `@remarks`.
   * @param app - The Fly app name.
   * @param name - The caller's volume name.
   * @param sizeGB - Size to create the volume with, in whole GB.
   * @returns The Fly volume id.
   */
  private async ensureVolume(app: string, name: string, sizeGB: number): Promise<string> {
    const flyName = this.volumeName(name)
    const existing = await this.findVolume(app, flyName)
    if (existing) return existing.id

    const created = await this.client.request<FlyVolume>(`/apps/${app}/volumes`, {
      method: 'POST',
      body: {
        name: flyName,
        region: this.region(),
        size_gb: sizeGB,
        encrypted: true,
      },
    })
    if (!created?.id) {
      throw new Error(
        t(
          'codeSandbox.flyio.error.volumeCreateFailed',
          { name: flyName },
          { defaultValue: `Fly volume "${flyName}" was created but the API returned no id.` },
        ),
      )
    }
    return created.id
  }

  /**
   * Finds a volume in an app by name, ignoring ones already being destroyed.
   * @param app - The Fly app name.
   * @param flyName - The sanitized Fly volume name.
   * @returns The matching volume, or `null`.
   */
  private async findVolume(app: string, flyName: string): Promise<FlyVolume | null> {
    const volumes = await this.client.request<FlyVolume[]>(`/apps/${app}/volumes`, {
      nullOn: [404],
    })
    if (!Array.isArray(volumes)) return null
    return (
      volumes.find(
        (volume) =>
          volume.name === flyName && volume.state !== 'destroyed' && volume.state !== 'destroying',
      ) ?? null
    )
  }

  // ---------------------------------------------------------------------------
  // SandboxProvider
  // ---------------------------------------------------------------------------

  /**
   * Creates a sandbox as a Fly Machine.
   *
   * Unlike the Docker provider — where `create` produces a stopped container —
   * the Machines API LAUNCHES the Machine as part of `POST .../machines`. The
   * returned sandbox therefore already reports a live state, and `start()` is
   * idempotent.
   *
   * `config.templateId` is honored by RESTORING the template's archive into the
   * new Machine before the sandbox is handed back, and a missing template is a
   * hard failure — booting the base image instead would return a healthy-looking
   * sandbox whose filesystem is not the one the caller named. Note the one place
   * this provider cannot match the core's wording: on Fly a template is a
   * filesystem, not an image, so `templateId` does not override `image`. The
   * image still selects the OS and toolchain; the template supplies the captured
   * paths on top of it.
   * @param config - Project id, image, env, volume name, template, labels and resource limits.
   * @returns A `Sandbox` bound to the new Machine.
   */
  async create(config: SandboxConfig): Promise<Sandbox> {
    // Resolved BEFORE anything is provisioned, so a bad template id costs no app,
    // no volume and no Machine.
    let manifest: templates.TemplateManifest | null = null
    if (config.templateId) {
      const found = await templates.readTemplate(this.templateContext(), config.templateId)
      if (!found) {
        throw new Error(
          t(
            'codeSandbox.flyio.error.templateMissing',
            { templateId: config.templateId },
            {
              defaultValue:
                `Cannot create a sandbox from template "${config.templateId}": it does not exist. ` +
                'Commit it first with commitTemplate().',
            },
          ),
        )
      }
      manifest = found.manifest
    }

    // Also resolved BEFORE anything is provisioned: a sandbox told to dial a
    // `.flycast` host nobody declared would boot healthy and then fail to
    // connect inside the user's own application.
    assertPrivateRoutesForEnv(config.env, this.privateServices())

    const app = this.resolveApp(config.projectId)
    const privateRoutes = await this.ensureApp(app)

    const metadata: Record<string, string> = {
      [`${this.metadataPrefix}.projectId`]: config.projectId,
      [`${this.metadataPrefix}.managed`]: 'true',
      // Recorded so `destroy()` can release exactly the addresses this project
      // allocated. Fly's IP listing does not report which network an address
      // belongs to, so nothing else can reconstruct this.
      ...(Object.keys(privateRoutes).length
        ? {
            [`${this.metadataPrefix}.${PRIVATE_ROUTES_METADATA_SUFFIX}`]:
              encodePrivateRoutes(privateRoutes),
          }
        : {}),
      // Recorded for operators reconciling which sandboxes came from which
      // template. It is NOT what `inUse` is derived from — see `templates.ts`.
      ...(config.templateId ? { [`${this.metadataPrefix}.templateId`]: config.templateId } : {}),
    }
    // Caller labels are merged FIRST so the provider's own managed keys always
    // win — a caller can never clobber `managed`/`projectId`.
    if (config.labels && typeof config.labels === 'object' && !Array.isArray(config.labels)) {
      for (const [key, value] of Object.entries(config.labels)) {
        if (key in metadata) continue
        metadata[key] = String(value)
      }
    }

    const machineConfig: FlyMachineConfig = {
      image:
        config.image ?? this.config.baseImage ?? process.env.FLY_SANDBOX_IMAGE ?? DEFAULT_IMAGE,
      env: config.env,
      metadata,
      guest: {
        cpus: config.resources?.cpu ?? this.config.defaultCpu ?? 1,
        cpu_kind: this.config.defaultCpuKind ?? 'shared',
        memory_mb: config.resources?.memoryMB ?? this.config.defaultMemoryMB ?? 1024,
      },
      // `no` matches the Docker provider: a sandbox whose main process exits
      // stays stopped for the caller to inspect, rather than silently looping.
      // Fly's default when unset is `on-failure`.
      restart: { policy: 'no' },
      auto_destroy: false,
    }

    if (config.volumeName) {
      metadata[`${this.metadataPrefix}.volumeName`] = config.volumeName
      const sizeGB = config.resources?.diskMB
        ? Math.max(1, Math.ceil(config.resources.diskMB / 1024))
        : (this.config.defaultVolumeGB ?? DEFAULT_VOLUME_GB)
      const volumeId = await this.ensureVolume(app, config.volumeName, sizeGB)
      machineConfig.mounts = [{ volume: volumeId, path: WORKSPACE_PATH }]
    }

    const service = this.previewService()
    if (service) machineConfig.services = [service]

    const machine = await this.client.request<FlyMachine>(`/apps/${app}/machines`, {
      method: 'POST',
      body: { region: this.region(), config: machineConfig },
    })
    if (!machine?.id) {
      throw new Error(
        t(
          'codeSandbox.flyio.error.createFailed',
          { app },
          { defaultValue: `Fly Machine creation in app "${app}" returned no Machine id.` },
        ),
      )
    }

    if (manifest && config.templateId) {
      await this.restoreTemplate(app, machine.id, config.templateId, manifest)
      // The restore waited for `started` and ran a command in it, so the state
      // read back from the creation response is stale by definition.
      return this.buildSandbox(app, machine.id, 'running')
    }

    return this.buildSandbox(app, machine.id, mapMachineState(machine.state ?? 'created'))
  }

  /**
   * Retrieves an existing sandbox by its composite `<app>:<machineId>` id.
   * @param id - The sandbox id returned by `create`.
   * @returns The sandbox, or `null` when the id is malformed or the Machine is gone.
   */
  async get(id: string): Promise<Sandbox | null> {
    let app: string
    let machineId: string
    try {
      ;({ app, machineId } = parseSandboxId(id))
    } catch (error) {
      logger.warn('Cannot get Fly sandbox — malformed sandbox id', { id, error })
      return null
    }
    try {
      const machine = await this.client.request<FlyMachine>(`/apps/${app}/machines/${machineId}`, {
        nullOn: [404],
      })
      if (!machine) return null
      return this.buildSandbox(app, machine.id, mapMachineState(machine.state ?? 'created'))
    } catch (error) {
      logger.debug('Failed to get Fly Machine', { id, error })
      return null
    }
  }

  /**
   * Lists every sandbox this provider manages.
   *
   * In per-project mode the Machines live in many apps, so this pages through
   * `GET /v1/orgs/{org}/machines` and keeps the ones carrying this provider's
   * `managed` metadata. In shared-app mode it lists that app directly.
   * @param _userId - Reserved for future per-user filtering; currently ignored,
   *   matching the Docker provider.
   * @returns Every managed sandbox.
   */
  async list(_userId: string): Promise<Sandbox[]> {
    const managedKey = `${this.metadataPrefix}.managed`

    if (!this.appPerProject()) {
      const app = this.resolveApp('unused')
      const machines = await this.client.request<FlyMachine[]>(`/apps/${app}/machines`, {
        nullOn: [404],
      })
      return (machines ?? [])
        .filter((machine) => machine.config?.metadata?.[managedKey] === 'true')
        .map((machine) =>
          this.buildSandbox(app, machine.id, mapMachineState(machine.state ?? 'created')),
        )
    }

    const sandboxes: Sandbox[] = []
    let cursor: string | undefined
    for (let page = 0; page < LIST_MAX_PAGES; page++) {
      const query = new URLSearchParams({ limit: String(LIST_PAGE_SIZE) })
      if (cursor) query.set('cursor', cursor)
      const response = await this.client.request<{
        machines?: FlyOrgMachine[]
        next_cursor?: string
      }>(`/orgs/${this.orgSlug()}/machines?${query.toString()}`, { nullOn: [404] })

      for (const machine of response?.machines ?? []) {
        if (machine.config?.metadata?.[managedKey] !== 'true') continue
        sandboxes.push(
          this.buildSandbox(
            machine.app_name,
            machine.id,
            mapMachineState(machine.state ?? 'created'),
          ),
        )
      }

      cursor = response?.next_cursor || undefined
      if (!cursor) break
      if (page === LIST_MAX_PAGES - 1) {
        // Fly still had a cursor: this listing is TRUNCATED, and a caller that
        // reaps or reconciles from it would leave the unseen Machines running
        // and billing forever. Say so rather than returning a short list that
        // looks complete. Fly's `limit` is advisory ("Responses may be shorter,
        // or even empty, even when more machines remain"), so a large org can
        // reach this cap well before LIST_MAX_PAGES * LIST_PAGE_SIZE Machines.
        logger.warn(
          'Fly org-wide Machine listing hit its page cap and is TRUNCATED — some managed ' +
            'sandboxes are missing from this result',
          { org: this.orgSlug(), pages: LIST_MAX_PAGES, returned: sandboxes.length },
        )
      }
    }
    return sandboxes
  }

  /**
   * Destroys a sandbox.
   *
   * In per-project mode the whole Fly app is deleted after the Machine, which
   * also removes its volumes and its custom 6PN network — leaving an empty app
   * behind would leak both. In shared-app mode only the Machine and its own
   * volumes are removed.
   *
   * The Flycast addresses this project holds live on OTHER apps (the tenant
   * database, the egress proxy), so deleting the app does not touch them. They
   * are read from the Machine's metadata FIRST — the Machine is the only record
   * of which address belongs to which network — and released last.
   * @param id - The composite sandbox id.
   */
  async destroy(id: string): Promise<void> {
    const { app, machineId } = parseSandboxId(id)

    let volumeIds: string[] = []
    let privateRoutes: Record<string, string> = {}
    try {
      const machine = await this.client.request<FlyMachine>(`/apps/${app}/machines/${machineId}`, {
        nullOn: [404],
      })
      privateRoutes = decodePrivateRoutes(
        machine?.config?.metadata?.[`${this.metadataPrefix}.${PRIVATE_ROUTES_METADATA_SUFFIX}`],
      )
      if (!this.appPerProject()) {
        volumeIds = (machine?.config?.mounts ?? [])
          .map((mount) => mount.volume)
          .filter((volume): volume is string => Boolean(volume))
      }
    } catch (error) {
      // Best-effort metadata gathering; the Machine may already be gone.
      // Destruction proceeds either way — but say so, because an unread
      // metadata block means the private addresses below are NOT released.
      logger.warn(
        'Could not read the Fly Machine before destroy — its volumes and any private (Flycast) ' +
          'addresses it recorded will not be cleaned up',
        { id, error },
      )
    }

    try {
      await this.client.request(`/apps/${app}/machines/${machineId}?force=true`, {
        method: 'DELETE',
        nullOn: [404],
      })
    } catch (error) {
      logger.warn('Failed to destroy Fly Machine', { id, error })
    }

    if (this.appPerProject()) {
      try {
        await this.client.request(`/apps/${app}`, { method: 'DELETE', nullOn: [404] })
      } catch (error) {
        logger.warn('Failed to delete Fly sandbox app — its volumes and 6PN network may leak', {
          app,
          error,
        })
      }
      await this.releasePrivateRoutes(privateRoutes)
      return
    }

    for (const volumeId of volumeIds) {
      try {
        await this.client.request(`/apps/${app}/volumes/${volumeId}`, {
          method: 'DELETE',
          nullOn: [404],
        })
      } catch (error) {
        logger.warn('Failed to remove Fly volume', { app, volumeId, error })
      }
    }
    await this.releasePrivateRoutes(privateRoutes)
  }

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  /**
   * Builds the context the template capability runs against.
   *
   * The store is resolved once and memoized, so a boot that checks for a
   * template does not rebuild an S3 client per call.
   * @returns The template context.
   */
  private templateContext(): templates.TemplateContext {
    if (this.templateStoreCache === undefined) {
      this.templateStoreCache = createTemplateStore(this.config)
      if (this.templateStoreCache) {
        logger.info('Fly sandbox templates are enabled', {
          store: this.templateStoreCache.describe,
        })
      }
    }
    return {
      store: this.templateStoreCache,
      exec: async (app, machineId, command, timeoutMs) =>
        // `cwd: '/'` rather than the workspace: a freshly-booted Machine that is
        // about to be restored INTO has no `/workspace` yet, and `execCommand`
        // starts every script with a `cd` that would fail there.
        execCommand(this.rawExec(app, machineId), command, { cwd: '/', timeout: timeoutMs }, '/'),
      ensureStarted: async (app, machineId) => {
        await this.startMachine(app, machineId)
      },
      parseSandboxId,
      presignExpirySeconds: Math.max(
        60,
        Math.min(
          this.config.templateUrlExpirySeconds ?? templates.DEFAULT_PRESIGN_EXPIRY_SECONDS,
          MAX_PRESIGN_EXPIRY_SECONDS,
        ),
      ),
      // Floored only against a zero/negative budget: how long a capture may take
      // is the operator's call, and a low value simply fails the transfer rather
      // than doing anything unsafe.
      transferTimeoutMs: Math.max(
        1000,
        this.config.templateTransferTimeoutMs ?? templates.DEFAULT_TRANSFER_TIMEOUT_MS,
      ),
      maxArchiveBytes: Math.max(
        1,
        Math.min(
          this.config.templateMaxArchiveBytes ?? templates.MAX_ARCHIVE_BYTES,
          templates.MAX_ARCHIVE_BYTES,
        ),
      ),
      warn: (message, meta) => logger.warn(message, meta),
      debug: (message, meta) => logger.debug(message, meta),
    }
  }

  /**
   * Capture a sandbox's filesystem as a reusable template.
   *
   * See `templates.ts` for why this is a tar in object storage rather than
   * anything Fly-native: Fly cannot produce an image from a running Machine, and
   * a volume snapshot cannot cross the per-project app boundary this bond
   * creates for tenant isolation.
   * @param options - What to capture and what to call it.
   * @returns The template as it now exists.
   */
  async commitTemplate(options: CommitTemplateOptions): Promise<SandboxTemplate> {
    return templates.commitTemplate(this.templateContext(), options)
  }

  /**
   * Read one template by the caller's identifier.
   * @param templateId - The caller's identifier.
   * @returns The template, or `null` when no template has that id.
   */
  async getTemplate(templateId: string): Promise<SandboxTemplate | null> {
    return templates.getTemplate(this.templateContext(), templateId)
  }

  /**
   * Enumerate templates in the configured store.
   * @param options - Narrowing by id prefix.
   * @returns Every matching template.
   */
  async listTemplates(options?: ListTemplatesOptions): Promise<SandboxTemplate[]> {
    return templates.listTemplates(this.templateContext(), options)
  }

  /**
   * Delete a template, refusing while a restore is still reading it.
   * @param templateId - The caller's identifier.
   */
  async removeTemplate(templateId: string): Promise<void> {
    return templates.removeTemplate(this.templateContext(), templateId)
  }

  /**
   * Restores a template into a freshly-created Machine.
   *
   * A failure here DESTROYS the Machine. The alternative is to hand back a
   * sandbox that started cleanly and whose filesystem is not the one that was
   * asked for — the same silent-wrong-contents failure that makes a missing
   * template a hard error rather than a fallback to the base image.
   * @param app - The Fly app name.
   * @param machineId - The Fly Machine id.
   * @param templateId - The caller's template identifier.
   * @param manifest - The CONTROL-PLANE manifest, whose `capturePaths` bound what is extracted.
   * @throws {Error} When the restore fails; the Machine is destroyed first.
   */
  private async restoreTemplate(
    app: string,
    machineId: string,
    templateId: string,
    manifest: templates.TemplateManifest,
  ): Promise<void> {
    const ctx = this.templateContext()
    const store = templates.requireStore(ctx)
    const leaseId = `${machineId}-${Date.now().toString(36)}`.replace(/[^A-Za-z0-9_.-]/g, '_')
    let lease: string | null = null

    try {
      // The restore runs through exec, so the Machine has to be up. `create`
      // launches it but returns as soon as Fly accepts the request.
      await this.waitForStarted(app, machineId)
      lease = await templates.acquireRestoreLease(ctx, templateId, leaseId)
      const url = await store.presignGet(
        templates.archiveKey(store, templateId),
        ctx.presignExpirySeconds,
      )
      const result = await ctx.exec(
        app,
        machineId,
        templates.buildRestoreCommand(manifest.capturePaths, url),
        ctx.transferTimeoutMs,
      )
      if (result.exitCode !== 0) {
        throw new Error(
          t(
            'codeSandbox.flyio.error.templateRestoreFailed',
            { templateId, exitCode: String(result.exitCode) },
            {
              defaultValue:
                `Restoring template "${templateId}" into Fly Machine ${machineId} failed ` +
                `(exit ${result.exitCode}): ${result.stderr.slice(0, 500) || result.stdout.slice(0, 500)}`,
            },
          ),
        )
      }
    } catch (error) {
      try {
        await this.client.request(`/apps/${app}/machines/${machineId}?force=true`, {
          method: 'DELETE',
          nullOn: [404],
        })
      } catch (cleanupError) {
        logger.warn(
          'Failed to destroy the Fly Machine whose template restore failed — it will keep ' +
            'billing until it is reaped',
          { app, machineId, error: cleanupError },
        )
      }
      throw error
    } finally {
      if (lease) await templates.releaseRestoreLease(ctx, lease)
    }
  }

  // ---------------------------------------------------------------------------
  // Egress verification
  // ---------------------------------------------------------------------------

  /**
   * PROVES whether a sandbox Machine can open raw connections to the public
   * internet, by running one and watching what happens.
   *
   * **Why it is built this way.** Fly's tenant isolation (custom 6PN networks)
   * answers a different question — whether one app can reach ANOTHER app — and
   * says nothing about the public internet. The only mechanism Fly documents for
   * egress is a **network policy**
   * (https://fly.io/docs/machines/guides-examples/network-policies/), an
   * app-scoped object whose `allow` rules make everything else in that direction
   * drop. Reading that policy back would be attestation, not observation, and the
   * failure this capability replaced was exactly an attestation that stayed true
   * on paper after it stopped being true in fact. So this creates a throwaway
   * Machine through the SAME provisioning path every sandbox goes through
   * (`ensureApp`, which applies the same policy), attempts raw TCP connects to
   * literal public IPs from inside it, and reports what the sockets did.
   *
   * `open` and `filtered` are therefore observations. Everything else — no
   * targets, no API token, the Machine never booting, a probe image without
   * `node`, an exec that returned no status — is `inconclusive`, never
   * `filtered`.
   *
   * **What a `filtered` verdict here does and does not mean.** It means raw
   * egress to the probed ports is dropped. It does NOT mean host-level control:
   * Fly network policies match protocol and port only, with no host or CIDR
   * matching, so a host allowlist can only be built by allowing the port of an
   * egress proxy and routing sandbox traffic through it. It also cannot speak
   * for Machines that were already running when their app's policy changed —
   * Fly applies a policy at Machine boot ("restart or redeploy the Machines for
   * changes to take effect"), which is why `ensureApp` applies it before every
   * Machine is created.
   *
   * Costs one Machine boot and (in per-project mode) one app create/delete per
   * call, so callers should cache the verdict rather than probing per request.
   * @returns What was observed about egress from a Fly sandbox Machine.
   */
  async verifyEgress(): Promise<EgressVerdict> {
    const targets = parseEgressProbeTargets(
      this.config.egressProbeTargets ??
        process.env.SANDBOX_EGRESS_PROBE_TARGETS ??
        DEFAULT_EGRESS_PROBE_TARGETS,
    )
    if (targets.length === 0) {
      return {
        state: 'inconclusive',
        detail: 'No valid literal ip:port egress probe targets are configured.',
        remediation:
          'Set SANDBOX_EGRESS_PROBE_TARGETS (or config.egressProbeTargets) to comma-separated ' +
          'literal ip:port values — hostnames are rejected, and IPv6 literals must be bracketed.',
      }
    }

    // parseInt yields NaN (not undefined) for an absent or junk value, so the
    // fallback is a finiteness check rather than `??`.
    const configured =
      this.config.egressProbeTimeoutMs ??
      Number.parseInt(process.env.SANDBOX_EGRESS_PROBE_TIMEOUT_MS ?? '', 10)
    const timeoutMs = Number.isFinite(configured)
      ? Math.min(15_000, Math.max(500, configured))
      : DEFAULT_PROBE_TIMEOUT_MS

    let app: string | null = null
    let machineId: string | null = null
    let policyPorts: FlyNetworkPolicyPort[] | undefined
    try {
      policyPorts = this.egressAllowedPorts()
      app = this.resolveApp(this.probeProjectId())
      // The SAME policy a real sandbox gets (private-service ports included, so
      // the probe observes the real posture), but NO Flycast allocation: this
      // app is deleted seconds from now, and allocating would leave one
      // unreleasable address per probe on every target app — every 15 minutes.
      await this.ensureApp(app, { privateRoutes: false })
      machineId = await this.createProbeMachine(app)
      await this.waitForStarted(app, machineId)

      const seconds = Math.min(
        MAX_WAIT_SECONDS,
        Math.max(1, Math.ceil(timeoutMs / 1000) + PROBE_EXEC_HEADROOM_SECONDS),
      )
      const result = toExecResult(
        await this.rawExec(app, machineId)(
          ['sh', '-c', buildEgressProbeCommand(targets, timeoutMs)],
          seconds,
        ),
      )
      return verdictForProbeExit(result.exitCode, { app, targets, policyPorts })
    } catch (error) {
      // A probe that could not RUN proves nothing. Reporting `filtered` here is
      // precisely the lie this method exists to make impossible.
      return {
        state: 'inconclusive',
        detail: `The Fly egress probe could not run: ${error instanceof Error ? error.message : String(error)}`,
        remediation:
          'Check that FLY_API_TOKEN can create apps and Machines in the organization, and that ' +
          'the probe image is pullable by Fly and contains `node` and `sleep`.',
      }
    } finally {
      await this.destroyProbe(app, machineId)
    }
  }

  /**
   * Generates the synthetic project id the throwaway probe app is named from.
   * Hex only, so {@link appNameForProject} never has to rewrite it.
   * @returns A project id such as `egress-probe-1a2b3c4d5e6f`.
   */
  private probeProjectId(): string {
    let hex = ''
    while (hex.length < 12) hex += Math.floor(Math.random() * 0xffffffff).toString(16)
    return `egress-probe-${hex.slice(0, 12)}`
  }

  /**
   * Creates the throwaway probe Machine.
   *
   * It runs the sandbox image (so it observes egress from the same image real
   * sandboxes run) with `init.exec` overriding the entrypoint — Fly documents
   * `exec` as overriding "any other startup command line, either in our API or in
   * your Docker container definition" — so the Machine is guaranteed to stay up
   * long enough to exec into, whatever the image's own entrypoint does. Proxy
   * environment variables are blanked: a probe that politely used a proxy would
   * report the proxy's policy rather than the network's.
   * @param app - The Fly app to create it in.
   * @returns The new Machine's id.
   * @throws {Error} When the API returns no Machine id.
   */
  private async createProbeMachine(app: string): Promise<string> {
    const config: FlyMachineConfig = {
      image:
        this.config.egressProbeImage ??
        this.config.baseImage ??
        process.env.FLY_SANDBOX_IMAGE ??
        DEFAULT_IMAGE,
      env: {
        HTTP_PROXY: '',
        HTTPS_PROXY: '',
        http_proxy: '',
        https_proxy: '',
        NO_PROXY: '',
        no_proxy: '',
      },
      // NOT the `managed` metadata: a probe Machine must never appear in list().
      metadata: { [`${this.metadataPrefix}.egressProbe`]: 'true' },
      guest: { cpus: 1, cpu_kind: 'shared', memory_mb: PROBE_MEMORY_MB },
      init: { exec: ['sleep', String(PROBE_LIFETIME_SECONDS)] },
      restart: { policy: 'no' },
      // Backstop: reaps the Machine when the sleep ends, even if this process
      // dies before its explicit cleanup runs.
      auto_destroy: true,
    }

    const machine = await this.client.request<FlyMachine>(`/apps/${app}/machines`, {
      method: 'POST',
      body: { region: this.region(), config },
    })
    if (!machine?.id) {
      throw new Error(
        t(
          'codeSandbox.flyio.error.probeCreateFailed',
          { app },
          { defaultValue: `Fly egress probe Machine creation in app "${app}" returned no id.` },
        ),
      )
    }
    return machine.id
  }

  /**
   * Removes the probe Machine and, in per-project mode, its throwaway app.
   *
   * Best-effort by design: a cleanup failure must not turn a completed
   * observation into an error, and `auto_destroy` plus the bounded init sleep
   * already reap the Machine on their own.
   * @param app - The probe app, or `null` when it was never resolved.
   * @param machineId - The probe Machine id, or `null` when it was never created.
   */
  private async destroyProbe(app: string | null, machineId: string | null): Promise<void> {
    if (!app) return
    if (machineId) {
      try {
        await this.client.request(`/apps/${app}/machines/${machineId}?force=true`, {
          method: 'DELETE',
          nullOn: [404],
        })
      } catch (error) {
        logger.warn('Failed to remove the Fly egress probe Machine', { app, machineId, error })
      }
    }
    // Never in shared-app mode: that app holds real sandboxes.
    if (!this.appPerProject()) return
    try {
      await this.client.request(`/apps/${app}`, { method: 'DELETE', nullOn: [404] })
    } catch (error) {
      logger.warn('Failed to delete the Fly egress probe app — it may leak an empty app', {
        app,
        error,
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Sandbox
  // ---------------------------------------------------------------------------

  /**
   * Issues one Fly exec call against a Machine.
   * @param app - The Fly app name.
   * @param machineId - The Fly Machine id.
   * @returns A transport callback for {@link execCommand}.
   */
  private rawExec(app: string, machineId: string): RawExec {
    return async (command: string[], timeoutSeconds: number): Promise<FlyExecResponse> => {
      const response = await this.client.request<FlyExecResponse>(
        `/apps/${app}/machines/${machineId}/exec`,
        {
          method: 'POST',
          body: { command, timeout: timeoutSeconds },
          // The API's own timeout bounds the command; allow the HTTP request a
          // little longer so the transport never fires first.
          timeoutMs: (timeoutSeconds + 15) * 1000,
        },
      )
      return response ?? {}
    }
  }

  /**
   * Starts (or resumes) a Machine, tolerating the case where it is already up.
   *
   * A Machine that is already `started` may reject a redundant start. Rather
   * than pattern-matching an error string, the state is re-read and the call
   * treated as successful when the Machine is in fact running.
   * @param app - The Fly app name.
   * @param machineId - The Fly Machine id.
   */
  private async startMachine(app: string, machineId: string): Promise<void> {
    try {
      await this.client.request(`/apps/${app}/machines/${machineId}/start`, { method: 'POST' })
    } catch (error) {
      const machine = await this.client
        .request<FlyMachine>(`/apps/${app}/machines/${machineId}`, { nullOn: [404] })
        .catch(() => null)
      if (machine && (machine.state === 'started' || machine.state === 'starting')) {
        logger.debug('Fly Machine start rejected but the Machine is already running', {
          app,
          machineId,
          state: machine.state,
        })
        return
      }
      throw error
    }
    await this.waitForStarted(app, machineId)
  }

  /**
   * Blocks until a Machine actually reaches `started`.
   *
   * `POST .../start` returns as soon as Fly ACCEPTS the request, not when the
   * Machine is running — so without this, `start()` and `wake()` resolve against
   * a Machine that is still booting and the caller's very next `exec` fails on a
   * Machine that is not up. Fly's `wait` endpoint exists for exactly this and
   * blocks server-side for up to 60 s.
   * @param app - The Fly app name.
   * @param machineId - The Fly Machine id.
   * @throws {Error} When the Machine has not started within the budget.
   */
  private async waitForStarted(app: string, machineId: string): Promise<void> {
    const seconds = Math.max(
      1,
      Math.min(this.config.startTimeoutSeconds ?? MAX_WAIT_SECONDS, MAX_WAIT_SECONDS),
    )
    try {
      await this.client.request(
        `/apps/${app}/machines/${machineId}/wait?state=started&timeout=${seconds}`,
        // One attempt: a retry would re-block for the whole budget, and the
        // fallback below re-reads the state anyway.
        { attempts: 1, timeoutMs: (seconds + 15) * 1000 },
      )
    } catch (error) {
      // The wait endpoint returning an error is not itself proof the Machine
      // failed — re-read the authoritative state before failing the caller.
      const machine = await this.client
        .request<FlyMachine>(`/apps/${app}/machines/${machineId}`, { nullOn: [404] })
        .catch(() => null)
      if (machine?.state === 'started') return
      throw new Error(
        t(
          'codeSandbox.flyio.error.startTimeout',
          { app, machineId, seconds: String(seconds), state: machine?.state ?? 'unknown' },
          {
            defaultValue:
              `Fly Machine ${machineId} in app "${app}" did not reach "started" within ` +
              `${seconds}s (last observed state: ${machine?.state ?? 'unknown'}).`,
          },
        ),
        { cause: error },
      )
    }
  }

  /**
   * Builds the `Sandbox` facade for one Machine.
   * @param app - The Fly app name.
   * @param machineId - The Fly Machine id.
   * @param initialStatus - Status derived from the Machine's current Fly state.
   * @returns A `Sandbox` bound to that Machine.
   */
  private buildSandbox(app: string, machineId: string, initialStatus: Sandbox['status']): Sandbox {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const provider = this
    const exec = provider.rawExec(app, machineId)

    return {
      id: toSandboxId(app, machineId),
      status: initialStatus,
      previewUrl: provider.renderPreviewUrl(app, machineId),

      async start(): Promise<void> {
        await provider.startMachine(app, machineId)
        this.status = 'running'
      },

      async stop(): Promise<void> {
        await provider.client.request(`/apps/${app}/machines/${machineId}/stop`, { method: 'POST' })
        this.status = 'stopped'
      },

      /**
       * SUSPENDS the Machine. Fly snapshots the microVM's memory to disk, so the
       * next `wake()` resumes in a few hundred ms instead of cold-booting, and
       * a suspended Machine bills for storage only. This mapping — not a plain
       * stop — is why this bond exists.
       */
      async sleep(): Promise<void> {
        await provider.client.request(`/apps/${app}/machines/${machineId}/suspend`, {
          method: 'POST',
        })
        this.status = 'sleeping'
      },

      /**
       * RESUMES the Machine. Fly has no separate resume endpoint: `start` on a
       * suspended Machine restores the memory snapshot, falling back to a cold
       * boot (with the rootfs preserved) when the snapshot cannot be used.
       */
      async wake(): Promise<void> {
        await provider.startMachine(app, machineId)
        this.status = 'running'
      },

      async exec(command: string, opts?: ExecOptions): Promise<ExecResult> {
        return await execCommand(exec, command, opts, WORKSPACE_PATH)
      },

      async readFile(path: string): Promise<string> {
        const result = await this.exec(`cat ${shellQuote(path)}`, { timeout: FILE_OP_TIMEOUT_MS })
        if (result.exitCode !== 0) {
          throw new Error(
            t(
              'codeSandbox.flyio.error.readFailed',
              { path, error: result.stderr },
              { defaultValue: `Failed to read ${path}: ${result.stderr}` },
            ),
          )
        }
        return result.stdout
      },

      async writeFile(path: string, content: string): Promise<void> {
        const base64 = Buffer.from(content).toString('base64')
        const quoted = shellQuote(path)
        const failIfError = (result: ExecResult): void => {
          if (result.exitCode !== 0) {
            throw new Error(
              t(
                'codeSandbox.flyio.error.writeFailed',
                { path, error: result.stderr },
                { defaultValue: `Failed to write ${path}: ${result.stderr}` },
              ),
            )
          }
        }
        // Chunked for the same reason as the Docker provider: the whole command
        // is one `sh -c` argument, capped at MAX_ARG_STRLEN (128 KB). Each chunk
        // is a multiple of 4 base64 characters (= 3 decoded bytes) so it decodes
        // standalone and the bytes concatenate exactly.
        failIfError(
          await this.exec(
            `mkdir -p "$(dirname ${quoted})" && printf %s ${shellQuote(base64.slice(0, WRITE_CHUNK_BASE64))} | base64 -d > ${quoted}`,
            { timeout: FILE_OP_TIMEOUT_MS },
          ),
        )
        for (let i = WRITE_CHUNK_BASE64; i < base64.length; i += WRITE_CHUNK_BASE64) {
          failIfError(
            await this.exec(
              `printf %s ${shellQuote(base64.slice(i, i + WRITE_CHUNK_BASE64))} | base64 -d >> ${quoted}`,
              { timeout: FILE_OP_TIMEOUT_MS },
            ),
          )
        }
      },

      async readDir(path: string): Promise<DirEntry[]> {
        // Trailing slash so `ls` follows a symlinked directory.
        const dirPath = path.endsWith('/') ? path : `${path}/`
        // Deliberately NOT piped: a pipeline reports the LAST command's status,
        // which would mask a missing directory. The `total` header is filtered
        // in JS instead.
        const result = await this.exec(`ls -la --time-style=+%s ${shellQuote(dirPath)}`, {
          timeout: FILE_OP_TIMEOUT_MS,
        })
        // A missing directory must THROW. An empty array means "exists and is
        // empty", and conflating the two sends an AI executor chasing files
        // that were never there.
        if (result.exitCode !== 0) {
          throw new Error(
            t(
              'codeSandbox.flyio.error.readDirFailed',
              { path, error: result.stderr },
              { defaultValue: `Failed to list ${path}: ${result.stderr}` },
            ),
          )
        }

        return result.stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .filter((line) => !/^total\s/.test(line))
          .filter((line) => {
            const name = line.split(/\s+/).slice(6).join(' ')
            return name !== '.' && name !== '..'
          })
          .map((line) => {
            const parts = line.split(/\s+/)
            const isDir = line.startsWith('d')
            const isSymlink = line.startsWith('l')
            const size = Number.parseInt(parts[4] ?? '0', 10)
            const rawName = parts.slice(6).join(' ')
            const arrowIndex = rawName.indexOf(' -> ')
            const name = isSymlink && arrowIndex !== -1 ? rawName.slice(0, arrowIndex) : rawName
            const symlinkTarget =
              isSymlink && arrowIndex !== -1 ? rawName.slice(arrowIndex + 4) : undefined
            return {
              name,
              type: isDir ? ('directory' as const) : ('file' as const),
              size: isDir ? undefined : size,
              ...(symlinkTarget ? { symlinkTarget } : {}),
            }
          })
      },

      async deleteFile(path: string): Promise<void> {
        const result = await this.exec(`rm -rf ${shellQuote(path)}`, {
          timeout: FILE_OP_TIMEOUT_MS,
        })
        if (result.exitCode !== 0) {
          throw new Error(
            t(
              'codeSandbox.flyio.error.deleteFailed',
              { path, error: result.stderr },
              { defaultValue: `Failed to delete ${path}: ${result.stderr}` },
            ),
          )
        }
      },

      getPreviewUrl(port?: number): string {
        return provider.renderPreviewUrl(app, machineId, port)
      },

      /**
       * NOT SUPPORTED on Fly. See the module `@remarks` — the Machines API has
       * no filesystem-event channel, and the only alternative (polling through
       * the rate-limited exec endpoint) would spend the caller's whole API
       * budget to report changes seconds late. The callback is never invoked;
       * the returned unsubscribe function is a real no-op.
       */
      onFileChange(_cb: (event: FileChangeEvent) => void): () => void {
        if (!provider.warnedNoFileWatch) {
          provider.warnedNoFileWatch = true
          logger.warn(
            'onFileChange is not supported by the Fly.io sandbox provider — the Machines API ' +
              'exposes no filesystem-event channel. The callback will never fire; poll with ' +
              'readDir/readFile if you need change detection.',
          )
        }
        return () => {}
      },
    }
  }

  /**
   * Renders the preview URL for a Machine from the configured template.
   * @param app - The Fly app name.
   * @param machineId - The Fly Machine id.
   * @param port - Port to substitute for `{port}`; defaults to the preview port.
   * @returns The rendered URL.
   */
  private renderPreviewUrl(app: string, machineId: string, port?: number): string {
    const template = this.config.previewUrlTemplate ?? 'https://{app}.fly.dev'
    return template
      .replace(/\{app\}/g, app)
      .replace(/\{machineId\}/g, machineId)
      .replace(/\{port\}/g, String(port ?? this.config.previewPort ?? DEFAULT_PREVIEW_PORT))
  }
}

/**
 * Creates a Fly.io Machines sandbox provider.
 * @param config - Optional Fly configuration: API token/URL, org slug, app
 *   naming and isolation mode, region, base image, guest sizing, preview
 *   service, and the preview URL template. Every field has an env fallback.
 * @param client - Injectable Machines API client, for tests.
 * @param store - Injectable template object store, for tests. Resolved from the
 *   template settings (or their env fallbacks) on first use when omitted.
 * @returns A `SandboxProvider` backed by Fly Machines.
 */
export function createProvider(
  config?: FlyioConfig,
  client?: FlyApiClient,
  store?: ObjectStore | null,
): SandboxProvider {
  return new FlyioSandboxProvider(config, client, store)
}
