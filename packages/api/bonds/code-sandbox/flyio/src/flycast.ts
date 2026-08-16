/**
 * Flycast private routes — the one mechanism Fly documents for reaching an app
 * ACROSS custom 6PN private networks, and the pure logic behind wiring it per
 * project.
 *
 * **The problem this solves.** This provider puts every project's sandbox app on
 * its own custom 6PN, which is what makes tenants unable to reach each other:
 * "Apps on separate 6PNs can never communicate unless explicitly configured to
 * do so" (https://fly.io/docs/networking/custom-private-networks/). The same
 * sentence severs two paths the product REQUIRES — a sandbox reaching its own
 * `mol_<uuid>` database on the tenant Postgres cluster, and a sandbox reaching
 * the control plane's egress proxy. Neither is optional: a scaffolded app
 * connects to `DATABASE_URL` at startup, and the proxy is where the per-project
 * host allowlist is enforced.
 *
 * **The mechanism.** Fly names exactly three ways to cross a 6PN boundary
 * (https://fly.io/docs/networking/custom-private-networks/): a public service
 * IP, `fly-replay`, and a Flycast private address allocated INTO the calling
 * network. Only the third one grants a single directed edge without exposing
 * anything publicly, so it is what this module implements:
 *
 * > "You can use Flycast to expose an app on one private network to another
 * > private network in your organization; the app won't be accessible via
 * > Flycast from its own network. Use the `--network` option to specify the
 * > network from which requests will originate:
 * > `fly ips allocate-v6 --private --network custom-network-name`"
 * > — https://fly.io/docs/networking/flycast/
 *
 * The REST equivalent is `POST /v1/apps/{app}/ip_assignments`, whose
 * `assignIPRequest` schema carries `network`, `org_slug`, `region`,
 * `service_name` and `type` — read directly from
 * https://docs.machines.dev/openapi.json rather than inferred. `type` is a bare
 * `string` there with no enum and no description, so `private_v6` — the value
 * flyctl passes for `allocate-v6 --private`
 * (https://github.com/superfly/flyctl `internal/command/ips/allocate.go`) — is
 * this provider's default and is configurable via
 * {@link FlyioConfig.privateIpAssignmentType}. Treat the literal as UNVERIFIED
 * against an official Fly *doc page*; the flyctl source is a secondary source.
 *
 * **Three consequences that shape the code, none of which can be designed
 * around:**
 *
 * 1. **The allocation lives on the TARGET app, keyed by the CALLER's network.**
 *    So the tenant Postgres app accumulates one private address per project
 *    network, and destroying a project must release its own. Fly documents no
 *    limit on how many private addresses one app may hold, in either direction —
 *    see the module `@remarks` in `index.ts`.
 * 2. **`GET /apps/{app}/ip_assignments` does not report which network an address
 *    belongs to** (`IPAssignment` is `{created_at, ip, region, service_name,
 *    shared}`). A listing therefore cannot tell you whether THIS project's route
 *    already exists, so the addresses are recorded in the sandbox Machine's own
 *    metadata and read back from there.
 * 3. **The target app needs a services block.** "Services configured in your
 *    app's `fly.toml` with an `[http_service]` or `[services]` section"
 *    (https://fly.io/docs/networking/flycast/). That is an operator action on
 *    the target app, not something this provider can perform.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

import type { FlyNetworkPolicyPort, FlyPrivateService } from './types.js'

/**
 * DNS suffix Fly serves a Flycast address at: "If an app has a Flycast address
 * allocated to it, there will be an AAAA record at `my-app-name.flycast`"
 * (https://fly.io/docs/networking/flycast/).
 */
export const FLYCAST_SUFFIX = '.flycast'

/**
 * Machine-metadata key suffix (after the configured prefix) recording the
 * private addresses allocated for a project, so `destroy()` can release exactly
 * the ones it created. See consequence 2 in the module description: a listing on
 * the target app cannot tell you which network an address serves.
 */
export const PRIVATE_ROUTES_METADATA_SUFFIX = 'privateRoutes'

/**
 * `type` sent to `POST /apps/{app}/ip_assignments` for a Flycast address. This
 * is the value flyctl passes for `fly ips allocate-v6 --private`; the field has
 * no enum in Fly's OpenAPI specification, so it is configurable rather than
 * hardcoded.
 */
export const DEFAULT_PRIVATE_IP_TYPE = 'private_v6'

/** Fly app names are DNS labels: lowercase alphanumerics and hyphens. */
const APP_NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/**
 * Renders the DNS name a sandbox dials to reach an app over its Flycast address.
 * @param app - The target Fly app name.
 * @returns `<app>.flycast`.
 */
export function flycastHost(app: string): string {
  return `${app}${FLYCAST_SUFFIX}`
}

/**
 * Parses the declared cross-network services.
 *
 * Each entry is `<app>:<port>` — the Fly app to allocate a Flycast address on,
 * and the TCP port a sandbox dials it at. The port is not cosmetic: it is what
 * {@link mergeEgressPorts} adds to the Fly network policy, and what
 * {@link assertPrivateRoutesForEnv} checks the injected connection URLs against.
 * @param raw - Comma-separated `app:port` pairs, e.g.
 *   `molecule-pg-tenant:5432,molecule-api:3129`.
 * @returns The declared services, deduplicated, in order — or `undefined` when
 *   the input is absent or empty, meaning "allocate nothing", which is correct
 *   for a control plane that shares one 6PN with its sandboxes.
 * @throws {Error} When an entry is present but unparseable. Dropping one
 *   silently would leave a sandbox with a `DATABASE_URL` that nothing routes.
 */
export function parsePrivateServices(raw: string | undefined): FlyPrivateService[] | undefined {
  const entries = (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (entries.length === 0) return undefined

  const services: FlyPrivateService[] = []
  for (const entry of entries) {
    const index = entry.lastIndexOf(':')
    const app = index > 0 ? entry.slice(0, index) : ''
    const port = Number(entry.slice(index + 1))
    if (
      !APP_NAME.test(app) ||
      app.length > 63 ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error(
        t(
          'codeSandbox.flyio.error.badPrivateService',
          { entry },
          {
            defaultValue:
              `Invalid Fly private service "${entry}" — expected "<fly-app>:<port>", e.g. ` +
              '"molecule-pg-tenant:5432". The app is the Fly app a Flycast address is allocated ' +
              'on; the port is the one a sandbox dials it at.',
          },
        ),
      )
    }
    if (!services.some((service) => service.app === app && service.port === port)) {
      services.push({ app, port })
    }
  }
  return services
}

/**
 * Adds every declared private-service port to the egress network policy.
 *
 * A Fly network policy is deny-by-default once any rule exists for a direction,
 * so a sandbox told to dial `molecule-pg-tenant.flycast:5432` under a policy
 * allowing only `tcp:3128` would fail to connect with no diagnostic beyond a
 * timeout. Deriving the port from the declaration — rather than asking the
 * operator to keep two lists in step — is what makes that class of outage
 * impossible: FLY-OPERATOR-SETUP.md § 9 can keep saying "never widen this list",
 * because the operator never has to.
 *
 * It is deliberately a UNION and never a replacement, so an operator's list is
 * still exactly what they wrote plus the ports their own declarations require,
 * and the applied policy is logged.
 *
 * The addition is load-bearing — VERIFIED 2026-08-16, not inferred. Fly states
 * "Network policies only apply to traffic directly to and from Machines. They do
 * not affect traffic routed through the Fly Proxy"
 * (https://fly.io/docs/machines/guides-examples/network-policies/), and Flycast
 * traffic IS routed through Fly Proxy, so it was an open question whether these
 * ports did anything. Measured on a throwaway app with a Flycast address into
 * its own 6PN: under a policy allowing only `udp:53`, `molecule-pg-tenant.flycast`
 * and `molecule-api.flycast` both RESOLVED and every TCP connect to them was
 * dropped; re-applying the policy with `tcp:443` opened 443 and nothing else.
 * Fly's sentence is about INGRESS — a Machine's egress TOWARD a Flycast address
 * is filtered like any other. Drop a declared service's port and every database
 * connection in the fleet goes with it.
 *
 * The cost of each derived port, stated plainly because a Fly policy has no
 * destination field of any kind (also measured — see the `egress.ts` module
 * description): the port is opened to EVERY host on the internet, not only to
 * the private service it was derived for. That residual cannot be closed at this
 * layer; it is named in `verifyEgress()`'s verdict and in
 * `docs/sandbox-egress-enforcement.md`.
 * @param ports - The operator's configured ports, or `undefined` when no policy
 *   is being applied at all.
 * @param services - The declared private services, or `undefined`.
 * @returns The union, deduplicated — or `undefined` when `ports` is `undefined`.
 *   "No policy" is never turned INTO a policy here: applying one that Fly then
 *   uses to drop everything else is not something to infer from an unrelated
 *   setting.
 */
export function mergeEgressPorts(
  ports: FlyNetworkPolicyPort[] | undefined,
  services: FlyPrivateService[] | undefined,
): FlyNetworkPolicyPort[] | undefined {
  if (!ports) return undefined
  if (!services?.length) return ports
  const merged = [...ports]
  for (const service of services) {
    if (!merged.some((port) => port.protocol === 'tcp' && port.port === service.port)) {
      merged.push({ protocol: 'tcp', port: service.port })
    }
  }
  return merged
}

/**
 * Encodes allocated addresses for storage in Machine metadata.
 * @param routes - Target app name → allocated private address.
 * @returns `app=address` pairs joined by commas. An IPv6 literal contains
 *   neither `,` nor `=`, so the encoding is unambiguous.
 */
export function encodePrivateRoutes(routes: Record<string, string>): string {
  return Object.entries(routes)
    .map(([app, ip]) => `${app}=${ip}`)
    .join(',')
}

/**
 * Decodes the addresses recorded by {@link encodePrivateRoutes}.
 * @param raw - The metadata value, or `undefined` when the Machine carries none.
 * @returns Target app name → allocated private address. Unparseable entries are
 *   skipped: this value only drives cleanup and self-healing, and a malformed
 *   entry must not stop either.
 */
export function decodePrivateRoutes(raw: string | undefined): Record<string, string> {
  const routes: Record<string, string> = {}
  for (const entry of (raw ?? '').split(',')) {
    const index = entry.indexOf('=')
    if (index <= 0) continue
    const app = entry.slice(0, index).trim()
    const ip = entry.slice(index + 1).trim()
    if (app && ip) routes[app] = ip
  }
  return routes
}

/**
 * Extracts the `<app>` and port from a URL that names a Flycast host.
 * @param value - A candidate environment-variable value.
 * @returns The target app and the port the URL dials it at (`undefined` when the
 *   URL carries no explicit port), or `null` when the value is not a URL naming
 *   a `.flycast` host.
 */
function flycastTarget(value: string): { app: string; port?: number } | null {
  let url: URL
  try {
    url = new URL(value)
  } catch (_error) {
    // Intentionally ignored: "not a URL" is the normal case for an environment
    // value, and a non-URL cannot be the connection string this check is
    // responsible for. There is nothing to report.
    return null
  }
  const host = url.hostname.toLowerCase()
  if (!host.endsWith(FLYCAST_SUFFIX)) return null
  const app = host.slice(0, -FLYCAST_SUFFIX.length)
  if (!app) return null
  const port = url.port ? Number(url.port) : undefined
  return Number.isInteger(port) ? { app, port } : { app }
}

/**
 * Refuses to boot a sandbox that is told to dial a Flycast host this provider
 * did not allocate a route for.
 *
 * This is the check that turns the product-breaking failure into a startup
 * error. The control plane bakes `DATABASE_URL` (and the proxy environment) into
 * every sandbox; on Fly those must name `<app>.flycast`, and that name resolves
 * ONLY because this provider allocated a private address into the project's
 * network for that app. Get the two out of step — a `SANDBOX_DB_HOST` pointing
 * at an app nobody declared, a port that does not match the one the policy
 * allows — and the sandbox boots healthy, the scaffolded app cannot connect, and
 * the only symptom is a connection timeout inside someone else's project.
 *
 * It is also the guard on the control-plane cluster: reaching
 * `molecule-pg-control.flycast` from a sandbox would require an operator to have
 * declared it as a private service, which is an explicit act with its own name
 * in the configuration — never something this provider arranges on its own.
 * @param env - The environment the caller is baking into the sandbox.
 * @param services - The declared private services, or `undefined`.
 * @throws {Error} When an environment value names a `.flycast` host with no
 *   matching declaration, naming the variable and the fix.
 */
export function assertPrivateRoutesForEnv(
  env: Record<string, string> | undefined,
  services: FlyPrivateService[] | undefined,
): void {
  if (!env) return
  const declared = services ?? []
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== 'string' || !value.toLowerCase().includes(FLYCAST_SUFFIX)) continue
    const target = flycastTarget(value)
    if (!target) continue

    const forApp = declared.filter((service) => service.app === target.app)
    if (forApp.length === 0) {
      throw new Error(
        t(
          'codeSandbox.flyio.error.undeclaredPrivateRoute',
          { key, app: target.app },
          {
            defaultValue:
              `${key} points at "${flycastHost(target.app)}", but "${target.app}" is not a ` +
              'declared Fly private service, so no Flycast address is allocated into this ' +
              "project's 6PN and the name will not resolve inside the sandbox. Add " +
              `"${target.app}:<port>" to FLY_SANDBOX_PRIVATE_SERVICES (or config.privateServices).`,
          },
        ),
      )
    }
    if (target.port !== undefined && !forApp.some((service) => service.port === target.port)) {
      throw new Error(
        t(
          'codeSandbox.flyio.error.privateRoutePortMismatch',
          { key, app: target.app, port: String(target.port) },
          {
            defaultValue:
              `${key} dials "${flycastHost(target.app)}" on port ${target.port}, but the declared ` +
              `Fly private service for "${target.app}" is on port ` +
              `${forApp.map((service) => service.port).join(', ')}. The sandbox egress policy ` +
              'allows the declared port, so the connection would be dropped. Make the two match.',
          },
        ),
      )
    }
  }
}
