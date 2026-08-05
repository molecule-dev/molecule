/**
 * Tests for the Flycast private routes that let a sandbox reach its own database
 * and the egress proxy ACROSS its per-project 6PN — the pure declaration/policy
 * logic, and the provider wiring that allocates, records and releases the
 * addresses.
 *
 * The invariants these exist to hold are all failure modes with no symptom at
 * boot: a route that was never created, a policy that drops the connection it
 * was supposed to allow, an address allocated on an app nobody declared, and an
 * address nothing ever releases.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchDouble, mockLogger } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const { FlyApiClient } = await import('../api.js')
const { createProvider } = await import('../provider.js')
const {
  assertPrivateRoutesForEnv,
  decodePrivateRoutes,
  encodePrivateRoutes,
  flycastHost,
  mergeEgressPorts,
  parsePrivateServices,
} = await import('../flycast.js')

import type { FlyioConfig, FlyPrivateService } from '../types.js'

const PROJECT_ID = 'a3f1c0de-0000-4000-8000-000000000001'
const APP = `mol-sandbox-${PROJECT_ID}`
const TENANT_DB = 'molecule-pg-tenant'
const CONTROL_DB = 'molecule-pg-control'
const PROXY = 'molecule-api'
const DB_IP = 'fdaa:0:1111:0:1::3'
const PROXY_IP = 'fdaa:0:1111:0:1::4'

/** The two services a real molecule.dev deployment declares. */
const SERVICES: FlyPrivateService[] = [
  { app: TENANT_DB, port: 5432 },
  { app: PROXY, port: 3129 },
]

/** The environment the control plane bakes into a sandbox on Fly. */
const SANDBOX_ENV = {
  DATABASE_URL: `postgresql://${TENANT_DB}.flycast:5432/mol_abc`,
  HTTP_PROXY: `http://${PROXY}.flycast:3129`,
}

/**
 * Builds a provider wired to a fetch double with retry sleeps collapsed.
 * @param config - Provider configuration overrides.
 * @param double - The fetch double.
 * @returns The provider.
 */
function makeProvider(
  config: FlyioConfig = {},
  double: ReturnType<typeof createFetchDouble> = createFetchDouble(),
) {
  const client = new FlyApiClient({
    token: () => 'tok',
    baseUrl: 'https://api.machines.dev/v1',
    fetchImpl: double.fetch,
    sleep: async () => {},
  })
  return createProvider({ orgSlug: 'acme', region: 'iad', ...config }, client)
}

/**
 * Queues the happy-path responses for a `create()` that allocates both routes.
 *
 * Specific routes are registered BEFORE broader ones: the double matches by
 * method + path PREFIX, so `GET /apps/<app>` would otherwise swallow
 * `GET /apps/<app>/machines`.
 * @param double - The fetch double.
 * @returns The same double, for chaining.
 */
function queueCreateWithRoutes(double: ReturnType<typeof createFetchDouble>) {
  return double
    .on(`POST /apps/${TENANT_DB}/ip_assignments`, { body: { ip: DB_IP } })
    .on(`POST /apps/${PROXY}/ip_assignments`, { body: { ip: PROXY_IP } })
    .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
    .on(`GET /apps/${APP}`, { status: 404, body: { error: 'not found' } })
    .on('POST /apps', { status: 201, body: {} })
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.FLY_SANDBOX_PRIVATE_SERVICES
  delete process.env.FLY_SANDBOX_EGRESS_ALLOWED_PORTS
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ---------------------------------------------------------------------------
// Declaration parsing
// ---------------------------------------------------------------------------

describe('parsePrivateServices', () => {
  it('parses <app>:<port> pairs in order', () => {
    expect(parsePrivateServices(`${TENANT_DB}:5432, ${PROXY}:3129`)).toEqual(SERVICES)
  })

  it('returns undefined for an absent or empty declaration — "allocate nothing"', () => {
    expect(parsePrivateServices(undefined)).toBeUndefined()
    expect(parsePrivateServices('')).toBeUndefined()
    expect(parsePrivateServices(' , , ')).toBeUndefined()
  })

  it('deduplicates an app:port repeated verbatim', () => {
    expect(parsePrivateServices(`${TENANT_DB}:5432,${TENANT_DB}:5432`)).toEqual([
      { app: TENANT_DB, port: 5432 },
    ])
  })

  it('keeps one app declared on two ports', () => {
    expect(parsePrivateServices(`${PROXY}:3129,${PROXY}:4000`)).toEqual([
      { app: PROXY, port: 3129 },
      { app: PROXY, port: 4000 },
    ])
  })

  it.each([
    ['no port', TENANT_DB],
    ['an empty app', ':5432'],
    ['a non-numeric port', `${TENANT_DB}:pg`],
    ['a port out of range', `${TENANT_DB}:70000`],
    ['a port of zero', `${TENANT_DB}:0`],
    ['an app with an underscore', 'molecule_pg:5432'],
    ['a full URL', 'https://molecule-pg-tenant:5432'],
  ])('throws on %s rather than dropping it silently', (_label, raw) => {
    expect(() => parsePrivateServices(raw)).toThrow(/Invalid Fly private service/)
  })
})

describe('flycastHost', () => {
  it('renders the name Fly serves the AAAA record at', () => {
    expect(flycastHost(TENANT_DB)).toBe(`${TENANT_DB}.flycast`)
  })
})

// ---------------------------------------------------------------------------
// Policy union
// ---------------------------------------------------------------------------

describe('mergeEgressPorts', () => {
  it('adds every declared service port to the operator’s list', () => {
    expect(mergeEgressPorts([{ protocol: 'tcp', port: 3129 }], SERVICES)).toEqual([
      { protocol: 'tcp', port: 3129 },
      { protocol: 'tcp', port: 5432 },
    ])
  })

  it('never turns "no policy" into a policy', () => {
    expect(mergeEgressPorts(undefined, SERVICES)).toBeUndefined()
  })

  it('leaves the list alone when nothing is declared', () => {
    const ports = [{ protocol: 'tcp' as const, port: 3129 }]
    expect(mergeEgressPorts(ports, undefined)).toEqual(ports)
    expect(mergeEgressPorts(ports, [])).toEqual(ports)
  })

  it('does not duplicate a port the operator already allowed', () => {
    expect(
      mergeEgressPorts([{ protocol: 'tcp', port: 5432 }], [{ app: TENANT_DB, port: 5432 }]),
    ).toEqual([{ protocol: 'tcp', port: 5432 }])
  })

  it('adds a TCP rule even when the same port is allowed for UDP', () => {
    expect(mergeEgressPorts([{ protocol: 'udp', port: 53 }], [{ app: 'dns', port: 53 }])).toEqual([
      { protocol: 'udp', port: 53 },
      { protocol: 'tcp', port: 53 },
    ])
  })
})

// ---------------------------------------------------------------------------
// Metadata encoding
// ---------------------------------------------------------------------------

describe('private route metadata', () => {
  it('round-trips app → IPv6 address pairs', () => {
    const routes = { [TENANT_DB]: DB_IP, [PROXY]: PROXY_IP }
    expect(decodePrivateRoutes(encodePrivateRoutes(routes))).toEqual(routes)
  })

  it('decodes an absent value as "nothing recorded"', () => {
    expect(decodePrivateRoutes(undefined)).toEqual({})
    expect(decodePrivateRoutes('')).toEqual({})
  })

  it('skips a malformed entry rather than losing the well-formed ones', () => {
    expect(decodePrivateRoutes(`garbage,${TENANT_DB}=${DB_IP},=x,y=`)).toEqual({
      [TENANT_DB]: DB_IP,
    })
  })
})

// ---------------------------------------------------------------------------
// The environment check — a route that was never created
// ---------------------------------------------------------------------------

describe('assertPrivateRoutesForEnv', () => {
  it('accepts an environment whose .flycast hosts are all declared', () => {
    expect(() => assertPrivateRoutesForEnv(SANDBOX_ENV, SERVICES)).not.toThrow()
  })

  it('REFUSES a DATABASE_URL naming an app that was never declared', () => {
    expect(() => assertPrivateRoutesForEnv(SANDBOX_ENV, [{ app: PROXY, port: 3129 }])).toThrow(
      /DATABASE_URL points at "molecule-pg-tenant\.flycast"/,
    )
  })

  it('REFUSES a route to the control-plane cluster that nobody declared', () => {
    expect(() =>
      assertPrivateRoutesForEnv(
        { DATABASE_URL: `postgresql://${CONTROL_DB}.flycast:5432/molecule` },
        SERVICES,
      ),
    ).toThrow(
      /DATABASE_URL points at "molecule-pg-control\.flycast".*not a declared Fly private service/s,
    )
  })

  it('REFUSES when nothing at all is declared', () => {
    expect(() => assertPrivateRoutesForEnv(SANDBOX_ENV, undefined)).toThrow(
      /not a declared Fly private service/,
    )
  })

  it('REFUSES a port the declared service does not serve — the policy would drop it', () => {
    expect(() =>
      assertPrivateRoutesForEnv(SANDBOX_ENV, [
        { app: TENANT_DB, port: 15432 },
        { app: PROXY, port: 3129 },
      ]),
    ).toThrow(/dials "molecule-pg-tenant\.flycast" on port 5432/)
  })

  it('accepts a URL with no explicit port, matching on the app alone', () => {
    expect(() =>
      assertPrivateRoutesForEnv({ API_URL: `https://${PROXY}.flycast/` }, SERVICES),
    ).not.toThrow()
  })

  it('ignores values that are not URLs, and hosts that are not .flycast', () => {
    expect(() =>
      assertPrivateRoutesForEnv(
        {
          NOTE: 'use the flycast address, not .internal',
          DATABASE_URL: 'postgresql://molecule-pg-tenant.internal:5432/mol',
          PATH: '/usr/bin',
        },
        undefined,
      ),
    ).not.toThrow()
  })

  it('does nothing when no environment is being injected', () => {
    expect(() => assertPrivateRoutesForEnv(undefined, undefined)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Provider wiring
// ---------------------------------------------------------------------------

describe('create — allocating the routes', () => {
  it('allocates a Flycast address on each declared app, INTO the project’s 6PN', async () => {
    const double = queueCreateWithRoutes(createFetchDouble())
    await makeProvider({ privateServices: SERVICES }, double).create({
      projectId: PROJECT_ID,
      env: SANDBOX_ENV,
    })

    const db = double.matching(`POST /apps/${TENANT_DB}/ip_assignments`)
    expect(db).toHaveLength(1)
    expect(db[0].body).toEqual({ type: 'private_v6', network: APP, org_slug: 'acme' })

    const proxy = double.matching(`POST /apps/${PROXY}/ip_assignments`)
    expect(proxy).toHaveLength(1)
    expect(proxy[0].body).toEqual({ type: 'private_v6', network: APP, org_slug: 'acme' })
  })

  it('reads the declaration from FLY_SANDBOX_PRIVATE_SERVICES', async () => {
    process.env.FLY_SANDBOX_PRIVATE_SERVICES = `${TENANT_DB}:5432`
    const double = queueCreateWithRoutes(createFetchDouble())
    await makeProvider({}, double).create({ projectId: PROJECT_ID })

    expect(double.matching(`POST /apps/${TENANT_DB}/ip_assignments`)).toHaveLength(1)
  })

  it('records the allocated addresses in the Machine metadata, so destroy can release them', async () => {
    const double = queueCreateWithRoutes(createFetchDouble())
    await makeProvider({ privateServices: SERVICES }, double).create({
      projectId: PROJECT_ID,
      env: SANDBOX_ENV,
    })

    const machine = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      config: { metadata: Record<string, string> }
    }
    expect(machine.config.metadata['molecule-sandbox.privateRoutes']).toBe(
      `${TENANT_DB}=${DB_IP},${PROXY}=${PROXY_IP}`,
    )
  })

  it('NEVER allocates on an app that was not declared — the control-plane cluster included', async () => {
    const double = queueCreateWithRoutes(createFetchDouble())
    await makeProvider({ privateServices: SERVICES }, double).create({
      projectId: PROJECT_ID,
      env: SANDBOX_ENV,
    })

    expect(double.matching(`POST /apps/${CONTROL_DB}/ip_assignments`)).toHaveLength(0)
    const allocations = double.calls.filter(
      (call) => call.method === 'POST' && call.path.endsWith('/ip_assignments'),
    )
    expect(allocations.map((call) => call.path)).toEqual([
      `/apps/${TENANT_DB}/ip_assignments`,
      `/apps/${PROXY}/ip_assignments`,
    ])
  })

  it('allocates nothing when no private services are declared', async () => {
    const double = createFetchDouble()
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
      .on(`GET /apps/${APP}`, { status: 404, body: {} })
      .on('POST /apps', { status: 201, body: {} })

    await makeProvider({}, double).create({ projectId: PROJECT_ID })

    expect(double.calls.filter((call) => call.path.endsWith('/ip_assignments'))).toHaveLength(0)
  })

  it('allocates nothing in shared-app mode — that app is on the org’s default 6PN', async () => {
    process.env.NODE_ENV = 'development'
    const double = createFetchDouble()
      .on('POST /apps/shared/machines', { body: { id: 'm1', state: 'started' } })
      .on('GET /apps/shared', { body: { name: 'shared' } })

    await makeProvider(
      { appPerProject: false, appName: 'shared', privateServices: SERVICES },
      double,
    ).create({ projectId: PROJECT_ID })

    expect(double.calls.filter((call) => call.path.endsWith('/ip_assignments'))).toHaveLength(0)
  })

  it('FAILS the boot when the allocation fails — a routeless sandbox looks healthy', async () => {
    const double = createFetchDouble()
      .on(`POST /apps/${TENANT_DB}/ip_assignments`, { status: 403, body: { error: 'forbidden' } })
      .on(`GET /apps/${APP}`, { status: 404, body: {} })
      .on('POST /apps', { status: 201, body: {} })

    await expect(
      makeProvider({ privateServices: SERVICES }, double).create({ projectId: PROJECT_ID }),
    ).rejects.toThrow(
      /Could not allocate a Flycast private address on Fly app "molecule-pg-tenant"/,
    )
    expect(double.matching(`POST /apps/${APP}/machines`)).toHaveLength(0)
  })

  it('FAILS the boot when Fly allocates but returns no address to release later', async () => {
    const double = createFetchDouble()
      .on(`POST /apps/${TENANT_DB}/ip_assignments`, { body: { region: 'iad' } })
      .on(`GET /apps/${APP}`, { status: 404, body: {} })
      .on('POST /apps', { status: 201, body: {} })

    await expect(
      makeProvider({ privateServices: [SERVICES[0]] }, double).create({ projectId: PROJECT_ID }),
    ).rejects.toThrow(/returned no address/)
  })

  it('treats a conflict as "the route already exists" and still boots', async () => {
    const double = createFetchDouble()
      .on(`POST /apps/${TENANT_DB}/ip_assignments`, { status: 409, body: { error: 'taken' } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
      .on(`GET /apps/${APP}`, { status: 404, body: {} })
      .on('POST /apps', { status: 201, body: {} })

    const sandbox = await makeProvider({ privateServices: [SERVICES[0]] }, double).create({
      projectId: PROJECT_ID,
    })

    expect(sandbox.id).toBe(`${APP}:m1`)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('already exists on the target app'),
      expect.anything(),
    )
    // Nothing was recorded, so nothing will be released — which is exactly what
    // the warning says.
    const machine = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      config: { metadata: Record<string, string> }
    }
    expect(machine.config.metadata['molecule-sandbox.privateRoutes']).toBeUndefined()
  })

  it('REFUSES a sandbox whose DATABASE_URL names an undeclared .flycast host', async () => {
    const double = queueCreateWithRoutes(createFetchDouble())
    await expect(
      makeProvider({ privateServices: [{ app: PROXY, port: 3129 }] }, double).create({
        projectId: PROJECT_ID,
        env: SANDBOX_ENV,
      }),
    ).rejects.toThrow(/not a declared Fly private service/)

    // Nothing was provisioned: the check runs before the app exists.
    expect(double.calls.filter((call) => call.method === 'POST')).toHaveLength(0)
  })

  it('reuses the addresses an earlier boot recorded instead of allocating again', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}/machines`, {
        body: [
          {
            id: 'old',
            config: {
              metadata: {
                'molecule-sandbox.privateRoutes': `${TENANT_DB}=${DB_IP},${PROXY}=${PROXY_IP}`,
              },
            },
          },
        ],
      })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm2', state: 'started' } })
      .on(`GET /apps/${APP}`, { body: { name: APP } })

    await makeProvider({ privateServices: SERVICES }, double).create({
      projectId: PROJECT_ID,
      env: SANDBOX_ENV,
    })

    expect(double.calls.filter((call) => call.path.endsWith('/ip_assignments'))).toHaveLength(0)
    const machine = double.matching(`POST /apps/${APP}/machines`)[0].body as {
      config: { metadata: Record<string, string> }
    }
    expect(machine.config.metadata['molecule-sandbox.privateRoutes']).toBe(
      `${TENANT_DB}=${DB_IP},${PROXY}=${PROXY_IP}`,
    )
  })

  it('allocates only the service an existing app is MISSING', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}/machines`, {
        body: [
          {
            id: 'old',
            config: { metadata: { 'molecule-sandbox.privateRoutes': `${TENANT_DB}=${DB_IP}` } },
          },
        ],
      })
      .on(`POST /apps/${PROXY}/ip_assignments`, { body: { ip: PROXY_IP } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm2', state: 'started' } })
      .on(`GET /apps/${APP}`, { body: { name: APP } })

    await makeProvider({ privateServices: SERVICES }, double).create({
      projectId: PROJECT_ID,
      env: SANDBOX_ENV,
    })

    expect(double.matching(`POST /apps/${TENANT_DB}/ip_assignments`)).toHaveLength(0)
    expect(double.matching(`POST /apps/${PROXY}/ip_assignments`)).toHaveLength(1)
  })
})

describe('create — the egress policy carries the declared ports', () => {
  it('unions the declared service ports into the operator’s allow list', async () => {
    const double = queueCreateWithRoutes(createFetchDouble())
    await makeProvider(
      { privateServices: SERVICES, egressAllowedPorts: [{ protocol: 'udp', port: 53 }] },
      double,
    ).create({ projectId: PROJECT_ID, env: SANDBOX_ENV })

    const policy = double.matching(`POST /apps/${APP}/network_policies`)[0].body as {
      rules: Array<{ ports: Array<{ protocol: string; port: number }> }>
    }
    expect(policy.rules[0].ports).toEqual([
      { protocol: 'udp', port: 53 },
      { protocol: 'tcp', port: 5432 },
      { protocol: 'tcp', port: 3129 },
    ])
  })

  it('applies no policy at all when the operator configured none', async () => {
    const double = queueCreateWithRoutes(createFetchDouble())
    await makeProvider({ privateServices: SERVICES }, double).create({
      projectId: PROJECT_ID,
      env: SANDBOX_ENV,
    })

    expect(double.matching(`POST /apps/${APP}/network_policies`)).toHaveLength(0)
  })
})

describe('destroy — releasing the routes', () => {
  it('releases every address the Machine recorded, on the app that holds it', async () => {
    const double = createFetchDouble().on(`GET /apps/${APP}/machines/m1`, {
      body: {
        id: 'm1',
        config: {
          metadata: {
            'molecule-sandbox.privateRoutes': `${TENANT_DB}=${DB_IP},${PROXY}=${PROXY_IP}`,
          },
        },
      },
    })

    await makeProvider({ privateServices: SERVICES }, double).destroy(`${APP}:m1`)

    const released = double.calls.filter((call) => call.method === 'DELETE')
    expect(released.map((call) => call.path)).toEqual([
      `/apps/${APP}/machines/m1?force=true`,
      `/apps/${APP}`,
      `/apps/${TENANT_DB}/ip_assignments/${encodeURIComponent(DB_IP)}`,
      `/apps/${PROXY}/ip_assignments/${encodeURIComponent(PROXY_IP)}`,
    ])
  })

  it('releases nothing when the Machine recorded nothing', async () => {
    const double = createFetchDouble().on(`GET /apps/${APP}/machines/m1`, {
      body: { id: 'm1', config: { metadata: {} } },
    })

    await makeProvider({ privateServices: SERVICES }, double).destroy(`${APP}:m1`)

    expect(
      double.calls.filter(
        (call) => call.method === 'DELETE' && call.path.includes('/ip_assignments/'),
      ),
    ).toHaveLength(0)
  })

  it('still tears the sandbox down when releasing an address fails', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}/machines/m1`, {
        body: {
          id: 'm1',
          config: { metadata: { 'molecule-sandbox.privateRoutes': `${TENANT_DB}=${DB_IP}` } },
        },
      })
      .on(`DELETE /apps/${TENANT_DB}/ip_assignments`, { status: 403, body: { error: 'forbidden' } })

    await expect(
      makeProvider({ privateServices: SERVICES }, double).destroy(`${APP}:m1`),
    ).resolves.toBeUndefined()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to release a Fly private'),
      expect.anything(),
    )
  })
})

describe('verifyEgress — the throwaway probe app', () => {
  it('allocates NO private address, so a probe every 15 minutes cannot leak one per run', async () => {
    const double = createFetchDouble().fallback({ status: 200, body: { id: 'probe' } })
    const provider = makeProvider(
      { privateServices: SERVICES, egressProbeTargets: ['1.1.1.1:443'] },
      double,
    )

    await provider.verifyEgress?.()

    expect(double.calls.filter((call) => call.path.endsWith('/ip_assignments'))).toHaveLength(0)
  })

  it('still applies the policy a real sandbox gets, including the declared ports', async () => {
    const double = createFetchDouble().fallback({ status: 200, body: { id: 'probe' } })
    const provider = makeProvider(
      {
        privateServices: SERVICES,
        egressAllowedPorts: [{ protocol: 'udp', port: 53 }],
        egressProbeTargets: ['1.1.1.1:443'],
      },
      double,
    )

    await provider.verifyEgress?.()

    const policies = double.calls.filter(
      (call) => call.method === 'POST' && call.path.endsWith('/network_policies'),
    )
    expect(policies).toHaveLength(1)
    expect((policies[0].body as { rules: Array<{ ports: unknown }> }).rules[0].ports).toEqual([
      { protocol: 'udp', port: 53 },
      { protocol: 'tcp', port: 5432 },
      { protocol: 'tcp', port: 3129 },
    ])
  })
})
