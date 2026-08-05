/**
 * Tests for Fly egress verification.
 *
 * The centrepiece is the VERDICT MAPPING. `molecule-dev` refuses to boot
 * production on anything other than `filtered`, so a probe outcome that means "I
 * could not look" being reported as "I looked and it is safe" is a silent
 * downgrade of tenant isolation. Every exit status is pinned, exhaustively, in
 * both directions.
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
const {
  buildEgressProbeCommand,
  DEFAULT_EGRESS_POLICY_NAME,
  EGRESS_PROBE_EXIT_BLOCKED,
  EGRESS_PROBE_EXIT_REACHED,
  extractPolicyId,
  formatEgressProbeTarget,
  parseEgressAllowedPorts,
  parseEgressProbeTargets,
  verdictForProbeExit,
} = await import('../egress.js')
const { INDETERMINATE_EXIT_CODE } = await import('../exec.js')
const { createProvider } = await import('../provider.js')

import type { FlyioConfig } from '../types.js'

const PROJECT_ID = 'a3f1c0de-0000-4000-8000-000000000001'
const APP = `mol-sandbox-${PROJECT_ID}`
const TARGETS = [
  { host: '1.1.1.1', port: 443 },
  { host: '2606:4700:4700::1111', port: 443 },
]

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.FLY_SANDBOX_EGRESS_ALLOWED_PORTS
  delete process.env.SANDBOX_EGRESS_PROBE_TARGETS
  delete process.env.SANDBOX_EGRESS_PROBE_TIMEOUT_MS
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ---------------------------------------------------------------------------
// The verdict mapping — the security contract
// ---------------------------------------------------------------------------

describe('verdictForProbeExit — the verdict mapping', () => {
  const context = { app: APP, targets: TARGETS }

  it('maps a REACHED probe (exit 9) to open, never filtered', () => {
    const verdict = verdictForProbeExit(EGRESS_PROBE_EXIT_REACHED, context)
    expect(verdict.state).toBe('open')
    expect(verdict.detail).toContain('1.1.1.1:443')
    expect(verdict.detail).toContain('[2606:4700:4700::1111]:443')
    expect(verdict.remediation).toBeTruthy()
  })

  it('maps a BLOCKED probe (exit 0) to filtered — the only path to filtered', () => {
    const verdict = verdictForProbeExit(EGRESS_PROBE_EXIT_BLOCKED, context)
    expect(verdict.state).toBe('filtered')
    expect(verdict.detail).toContain('refused or timed out')
  })

  it('maps a missing interpreter (exit 127) to INCONCLUSIVE, not filtered', () => {
    const verdict = verdictForProbeExit(127, context)
    expect(verdict.state).toBe('inconclusive')
    expect(verdict.state).not.toBe('filtered')
    expect(verdict.remediation).toContain('node -e')
  })

  it('maps Fly returning no exit status (-1) to INCONCLUSIVE, not filtered', () => {
    const verdict = verdictForProbeExit(INDETERMINATE_EXIT_CODE, context)
    expect(verdict.state).toBe('inconclusive')
    expect(verdict.state).not.toBe('filtered')
  })

  it('maps a generic failure (exit 1) to INCONCLUSIVE — an interpreter error is not an observation', () => {
    expect(verdictForProbeExit(1, context).state).toBe('inconclusive')
  })

  it('is exhaustive: exactly one exit status yields filtered and exactly one yields open', () => {
    const codes = [INDETERMINATE_EXIT_CODE, ...Array.from({ length: 256 }, (_, i) => i)]
    const filtered = codes.filter((code) => verdictForProbeExit(code, context).state === 'filtered')
    const open = codes.filter((code) => verdictForProbeExit(code, context).state === 'open')
    const inconclusive = codes.filter(
      (code) => verdictForProbeExit(code, context).state === 'inconclusive',
    )

    expect(filtered).toEqual([EGRESS_PROBE_EXIT_BLOCKED])
    expect(open).toEqual([EGRESS_PROBE_EXIT_REACHED])
    expect(inconclusive).toHaveLength(codes.length - 2)
    // Nothing outside the three-state contract, ever.
    for (const code of codes) {
      expect(['filtered', 'open', 'inconclusive']).toContain(
        verdictForProbeExit(code, context).state,
      )
    }
  })

  it('names the applied policy, and its remediation admits Fly cannot match hosts', () => {
    const verdict = verdictForProbeExit(EGRESS_PROBE_EXIT_REACHED, {
      ...context,
      policyPorts: [{ protocol: 'tcp', port: 443 }],
    })
    expect(verdict.detail).toContain('tcp/443')
    expect(verdict.remediation).toContain('protocol and port ONLY')
  })

  it('tells the operator how to turn a policy on when none is applied', () => {
    const verdict = verdictForProbeExit(EGRESS_PROBE_EXIT_REACHED, context)
    expect(verdict.detail).toContain('no Fly network policy applied by this provider')
    expect(verdict.remediation).toContain('FLY_SANDBOX_EGRESS_ALLOWED_PORTS')
  })
})

// ---------------------------------------------------------------------------
// Parsers and the probe command
// ---------------------------------------------------------------------------

describe('parseEgressProbeTargets', () => {
  it('accepts IPv4 and bracketed IPv6 literals', () => {
    expect(parseEgressProbeTargets('1.1.1.1:443, [2606:4700:4700::1111]:8443')).toEqual([
      { host: '1.1.1.1', port: 443 },
      { host: '2606:4700:4700::1111', port: 8443 },
    ])
  })

  it('REJECTS hostnames — a DNS failure would look like a blocked connection', () => {
    expect(parseEgressProbeTargets('example.com:443,cloudflare.com:80')).toEqual([])
  })

  it('drops entries with an out-of-range or missing port', () => {
    expect(parseEgressProbeTargets('1.1.1.1:0,1.1.1.1:70000,1.1.1.1,1.1.1.1:443')).toEqual([
      { host: '1.1.1.1', port: 443 },
    ])
  })

  it('accepts an array and an absent value', () => {
    expect(parseEgressProbeTargets(['8.8.8.8:53'])).toEqual([{ host: '8.8.8.8', port: 53 }])
    expect(parseEgressProbeTargets(undefined)).toEqual([])
  })

  it('round-trips through formatEgressProbeTarget', () => {
    for (const target of TARGETS) {
      expect(parseEgressProbeTargets(formatEgressProbeTarget(target))).toEqual([target])
    }
  })
})

describe('parseEgressAllowedPorts', () => {
  it('parses protocol:port pairs and defaults a bare port to tcp', () => {
    expect(parseEgressAllowedPorts('tcp:3128, udp:53, 443')).toEqual([
      { protocol: 'tcp', port: 3128 },
      { protocol: 'udp', port: 53 },
      { protocol: 'tcp', port: 443 },
    ])
  })

  it('returns undefined for absent or empty input — "no policy", not "deny all"', () => {
    expect(parseEgressAllowedPorts(undefined)).toBeUndefined()
    expect(parseEgressAllowedPorts('   ')).toBeUndefined()
  })

  it('THROWS on an unparseable entry rather than silently dropping a port', () => {
    expect(() => parseEgressAllowedPorts('tcp:443,sctp:9')).toThrow(/Invalid Fly egress port/)
    expect(() => parseEgressAllowedPorts('tcp:nope')).toThrow(/Invalid Fly egress port/)
  })
})

describe('buildEgressProbeCommand', () => {
  it('uses raw sockets and the pinned exit codes, safely quoted for sh -c', () => {
    const command = buildEgressProbeCommand(TARGETS, 3000)
    expect(command.startsWith("node -e '")).toBe(true)
    expect(command).toContain("require('\\''net'\\''")
    expect(command).toContain('net.connect')
    expect(command).toContain(
      `process.exit(open>0?${EGRESS_PROBE_EXIT_REACHED}:${EGRESS_PROBE_EXIT_BLOCKED})`,
    )
    expect(command).toContain('setTimeout(3000)')
    expect(command).toContain('2606:4700:4700::1111')
    // No HTTP client: a proxied request would report the proxy's policy.
    expect(command).not.toContain('http')
  })

  it('exits non-zero rather than hanging when handed no targets', () => {
    expect(buildEgressProbeCommand([], 3000)).toContain('if(!ts.length)process.exit(1)')
  })
})

describe('extractPolicyId', () => {
  it('finds the id in a bare array or a wrapped one', () => {
    const rows = [
      { id: 'other', name: 'nope' },
      { id: 'pol_1', name: DEFAULT_EGRESS_POLICY_NAME },
    ]
    expect(extractPolicyId(rows, DEFAULT_EGRESS_POLICY_NAME)).toBe('pol_1')
    expect(extractPolicyId({ policies: rows }, DEFAULT_EGRESS_POLICY_NAME)).toBe('pol_1')
    expect(extractPolicyId({ network_policies: rows }, DEFAULT_EGRESS_POLICY_NAME)).toBe('pol_1')
  })

  it('returns undefined for an unrecognized shape, so the caller creates instead', () => {
    expect(extractPolicyId({ weird: true }, DEFAULT_EGRESS_POLICY_NAME)).toBeUndefined()
    expect(extractPolicyId(null, DEFAULT_EGRESS_POLICY_NAME)).toBeUndefined()
    expect(
      extractPolicyId([{ name: DEFAULT_EGRESS_POLICY_NAME }], DEFAULT_EGRESS_POLICY_NAME),
    ).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// The provider's observation
// ---------------------------------------------------------------------------

/** One request the probe fetch double saw. */
interface ProbeCall {
  method: string
  path: string
  body: unknown
}

/** Knobs for the probe fetch double. */
interface ProbeOptions {
  /** Exec response body, or a thrown status. */
  exec?: { stdout?: string; stderr?: string; exit_code?: number }
  /** Status to answer the exec call with (non-2xx makes the transport fail). */
  execStatus?: number
  /** Machine id returned by the create call, or `null` to return no id. */
  machineId?: string | null
  /** Machine state returned by a plain machine GET (used by the start fallback). */
  machineState?: string
  /** Status for the wait call. */
  waitStatus?: number
  /** Existing policies returned by the LIST call. */
  policies?: unknown
}

/**
 * Builds a fetch double that routes by URL suffix, because the probe's app name
 * is random and cannot be matched by prefix.
 * @param options - Canned responses.
 * @returns The fetch implementation and the recorded calls.
 */
function createProbeFetch(options: ProbeOptions = {}) {
  const calls: ProbeCall[] = []
  const respond = (status: number, body: unknown) =>
    ({
      status,
      headers: { get: () => null },
      text: async () => JSON.stringify(body),
    }) as unknown as Response

  const fetchImpl = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    const path = url.slice('https://api.machines.dev/v1'.length)
    const method = (init?.method ?? 'GET').toUpperCase()
    calls.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined })

    if (path.includes('/exec')) {
      return respond(options.execStatus ?? 200, options.exec ?? { exit_code: 0 })
    }
    if (path.includes('/wait')) return respond(options.waitStatus ?? 200, { ok: true })
    if (path.includes('/network_policies')) return respond(200, options.policies ?? [])
    if (method === 'POST' && /\/machines$/.test(path)) {
      const id = options.machineId === undefined ? 'probe1' : options.machineId
      return respond(200, id ? { id, state: 'created' } : {})
    }
    if (method === 'GET' && /\/machines\/[^/]+$/.test(path)) {
      return respond(200, { id: 'probe1', state: options.machineState ?? 'started' })
    }
    if (method === 'GET' && /^\/apps\/[^/]+$/.test(path))
      return respond(404, { error: 'not found' })
    return respond(200, {})
  }) as unknown as typeof fetch

  return { fetch: fetchImpl, calls }
}

/**
 * Builds a provider wired to a fetch double, with retry sleeps collapsed.
 * @param config - Provider configuration overrides.
 * @param fetchImpl - The fetch double.
 * @returns The provider.
 */
function makeProvider(config: FlyioConfig, fetchImpl: typeof fetch) {
  const client = new FlyApiClient({
    token: () => 'tok',
    baseUrl: 'https://api.machines.dev/v1',
    fetchImpl,
    sleep: async () => {},
  })
  return createProvider({ orgSlug: 'acme', region: 'iad', ...config }, client)
}

describe('verifyEgress — observation, not attestation', () => {
  it('is implemented, so a caller can tell it from a provider with no egress isolation', () => {
    const probe = createProbeFetch()
    expect(makeProvider({}, probe.fetch).verifyEgress).toBeTypeOf('function')
  })

  it('boots a throwaway Machine, runs raw connects, and reports filtered when all are blocked', async () => {
    const probe = createProbeFetch({ exec: { exit_code: EGRESS_PROBE_EXIT_BLOCKED } })
    const verdict = await makeProvider(
      { egressAllowedPorts: [{ protocol: 'tcp', port: 3128 }] },
      probe.fetch,
    ).verifyEgress!()

    expect(verdict.state).toBe('filtered')
    expect(verdict.detail).toContain('tcp/3128')

    // It really ran something: app → policy → machine → wait → exec.
    const app = probe.calls.find((call) => call.method === 'POST' && call.path === '/apps')
      ?.body as { name: string }
    expect(app.name).toMatch(/^mol-sandbox-egress-probe-[0-9a-f]{12}$/)
    expect(probe.calls.some((call) => call.path.endsWith('/network_policies'))).toBe(true)
    expect(probe.calls.some((call) => call.path.includes('/wait?state=started'))).toBe(true)
    const exec = probe.calls.find((call) => call.path.endsWith('/exec'))?.body as {
      command: string[]
    }
    expect(exec.command[2]).toContain('net.connect')
  })

  it('reports OPEN when a raw connect succeeds', async () => {
    const probe = createProbeFetch({ exec: { exit_code: EGRESS_PROBE_EXIT_REACHED } })
    const verdict = await makeProvider({}, probe.fetch).verifyEgress!()

    expect(verdict.state).toBe('open')
    expect(verdict.remediation).toContain('egressAllowedPorts')
  })

  it('blanks proxy env and never marks the probe Machine as managed', async () => {
    const probe = createProbeFetch()
    await makeProvider({}, probe.fetch).verifyEgress!()

    const create = probe.calls.find(
      (call) => call.method === 'POST' && call.path.endsWith('/machines'),
    )?.body as {
      config: {
        env: Record<string, string>
        metadata: Record<string, string>
        init: { exec: string[] }
        auto_destroy: boolean
      }
    }
    expect(create.config.env.HTTPS_PROXY).toBe('')
    expect(create.config.env.https_proxy).toBe('')
    expect(create.config.metadata['molecule-sandbox.managed']).toBeUndefined()
    expect(create.config.metadata['molecule-sandbox.egressProbe']).toBe('true')
    expect(create.config.init.exec[0]).toBe('sleep')
    expect(create.config.auto_destroy).toBe(true)
  })

  it('returns INCONCLUSIVE — never filtered — when the exec call itself fails', async () => {
    const probe = createProbeFetch({ execStatus: 400, exec: { exit_code: 0 } })
    const verdict = await makeProvider({}, probe.fetch).verifyEgress!()

    expect(verdict.state).toBe('inconclusive')
    expect(verdict.state).not.toBe('filtered')
    expect(verdict.detail).toContain('could not run')
  })

  it('returns INCONCLUSIVE when the probe Machine is never created', async () => {
    const probe = createProbeFetch({ machineId: null })
    const verdict = await makeProvider({}, probe.fetch).verifyEgress!()
    expect(verdict.state).toBe('inconclusive')
  })

  it('returns INCONCLUSIVE when the probe Machine never starts', async () => {
    const probe = createProbeFetch({ waitStatus: 400, machineState: 'failed' })
    const verdict = await makeProvider({}, probe.fetch).verifyEgress!()
    expect(verdict.state).toBe('inconclusive')
    expect(verdict.detail).toContain('did not reach "started"')
  })

  it('returns INCONCLUSIVE when there are no valid probe targets, without booting anything', async () => {
    const probe = createProbeFetch()
    const verdict = await makeProvider({ egressProbeTargets: ['example.com:443'] }, probe.fetch)
      .verifyEgress!()

    expect(verdict.state).toBe('inconclusive')
    expect(probe.calls).toHaveLength(0)
  })

  it('destroys the probe Machine and its throwaway app, even after a failed probe', async () => {
    const probe = createProbeFetch({ execStatus: 500 })
    await makeProvider({}, probe.fetch).verifyEgress!()

    const deletes = probe.calls.filter((call) => call.method === 'DELETE')
    expect(deletes.some((call) => call.path.includes('/machines/probe1?force=true'))).toBe(true)
    expect(
      deletes.some((call) => /^\/apps\/mol-sandbox-egress-probe-[0-9a-f]{12}$/.test(call.path)),
    ).toBe(true)
  })

  it('never deletes the shared app in shared-app mode', async () => {
    process.env.NODE_ENV = 'development'
    const probe = createProbeFetch()
    await makeProvider({ appPerProject: false, appName: 'shared' }, probe.fetch).verifyEgress!()

    expect(
      probe.calls.some((call) => call.method === 'DELETE' && call.path === '/apps/shared'),
    ).toBe(false)
    expect(
      probe.calls.some((call) => call.method === 'DELETE' && call.path.includes('/machines/')),
    ).toBe(true)
  })

  it('refuses an empty allow-list instead of guessing what Fly does with it', async () => {
    const probe = createProbeFetch()
    const verdict = await makeProvider({ egressAllowedPorts: [] }, probe.fetch).verifyEgress!()
    expect(verdict.state).toBe('inconclusive')
    expect(verdict.detail).toContain('egressAllowedPorts is empty')
  })

  it('reads probe targets from the same env var the Docker bond uses', async () => {
    process.env.SANDBOX_EGRESS_PROBE_TARGETS = '9.9.9.9:853'
    const probe = createProbeFetch({ exec: { exit_code: EGRESS_PROBE_EXIT_BLOCKED } })
    const verdict = await makeProvider({}, probe.fetch).verifyEgress!()
    expect(verdict.detail).toContain('9.9.9.9:853')
  })
})

// ---------------------------------------------------------------------------
// Policy application on the sandbox path
// ---------------------------------------------------------------------------

describe('egress policy application', () => {
  /**
   * Queues the happy-path responses for a `create()`.
   * @param double - The fetch double.
   * @returns The same double, for chaining.
   */
  function queueCreate(double: ReturnType<typeof createFetchDouble>) {
    return double
      .on(`GET /apps/${APP}`, { status: 404, body: { error: 'not found' } })
      .on('POST /apps', { status: 201, body: {} })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })
  }

  /**
   * Builds a provider over the shared fetch double.
   * @param config - Provider configuration overrides.
   * @param double - The fetch double.
   * @returns The provider.
   */
  function provider(config: FlyioConfig, double: ReturnType<typeof createFetchDouble>) {
    const client = new FlyApiClient({
      token: () => 'tok',
      baseUrl: 'https://api.machines.dev/v1',
      fetchImpl: double.fetch,
      sleep: async () => {},
    })
    return createProvider({ orgSlug: 'acme', region: 'iad', ...config }, client)
  }

  it('applies an app-wide egress allow rule before the Machine boots', async () => {
    const double = queueCreate(createFetchDouble())
    await provider(
      {
        egressAllowedPorts: [
          { protocol: 'tcp', port: 3128 },
          { protocol: 'udp', port: 53 },
        ],
      },
      double,
    ).create({ projectId: PROJECT_ID })

    const policy = double.matching(`POST /apps/${APP}/network_policies`)[0]
    expect(policy.body).toEqual({
      name: DEFAULT_EGRESS_POLICY_NAME,
      selector: { all: true },
      rules: [
        {
          action: 'allow',
          direction: 'egress',
          ports: [
            { protocol: 'tcp', port: 3128 },
            { protocol: 'udp', port: 53 },
          ],
        },
      ],
    })

    // Fly applies a policy at Machine boot, so it must land BEFORE the create.
    const policyIndex = double.calls.findIndex((call) => call.path.endsWith('/network_policies'))
    const machineIndex = double.calls.findIndex(
      (call) => call.method === 'POST' && call.path === `/apps/${APP}/machines`,
    )
    expect(policyIndex).toBeGreaterThanOrEqual(0)
    expect(policyIndex).toBeLessThan(machineIndex)
  })

  it('updates the existing policy in place instead of stacking duplicates', async () => {
    const double = queueCreate(createFetchDouble()).on(`GET /apps/${APP}/network_policies/`, {
      body: [{ id: 'pol_9', name: DEFAULT_EGRESS_POLICY_NAME }],
    })
    await provider({ egressAllowedPorts: [{ protocol: 'tcp', port: 443 }] }, double).create({
      projectId: PROJECT_ID,
    })

    const policy = double.matching(`POST /apps/${APP}/network_policies`)[0].body as { id?: string }
    expect(policy.id).toBe('pol_9')
  })

  it('FAILS the boot when the policy cannot be applied — never boots unfiltered', async () => {
    const double = queueCreate(createFetchDouble())
    for (let i = 0; i < 8; i++) {
      double.on(`POST /apps/${APP}/network_policies`, { status: 500, body: { error: 'nope' } })
    }

    await expect(
      provider({ egressAllowedPorts: [{ protocol: 'tcp', port: 443 }] }, double).create({
        projectId: PROJECT_ID,
      }),
    ).rejects.toThrow(/network_policies/)
    expect(double.matching(`POST /apps/${APP}/machines`)).toHaveLength(0)
  })

  it('re-applies the policy to an app that already exists', async () => {
    const double = createFetchDouble()
      .on(`GET /apps/${APP}`, { body: { name: APP } })
      .on(`POST /apps/${APP}/machines`, { body: { id: 'm1', state: 'started' } })

    await provider({ egressAllowedPorts: [{ protocol: 'tcp', port: 443 }] }, double).create({
      projectId: PROJECT_ID,
    })

    expect(double.matching(`POST /apps/${APP}/network_policies`)).toHaveLength(1)
  })

  it('applies no policy at all when none is configured', async () => {
    const double = queueCreate(createFetchDouble())
    await provider({}, double).create({ projectId: PROJECT_ID })
    expect(double.calls.some((call) => call.path.includes('network_policies'))).toBe(false)
  })

  it('reads the allow-list from FLY_SANDBOX_EGRESS_ALLOWED_PORTS', async () => {
    process.env.FLY_SANDBOX_EGRESS_ALLOWED_PORTS = 'tcp:3128,udp:53'
    const double = queueCreate(createFetchDouble())
    await provider({}, double).create({ projectId: PROJECT_ID })

    const policy = double.matching(`POST /apps/${APP}/network_policies`)[0].body as {
      rules: Array<{ ports: unknown }>
    }
    expect(policy.rules[0].ports).toEqual([
      { protocol: 'tcp', port: 3128 },
      { protocol: 'udp', port: 53 },
    ])
  })

  it('still applies the policy when the policy list cannot be read', async () => {
    const double = queueCreate(createFetchDouble())
    for (let i = 0; i < 8; i++) {
      double.on(`GET /apps/${APP}/network_policies/`, { status: 500, body: { error: 'nope' } })
    }

    await provider({ egressAllowedPorts: [{ protocol: 'tcp', port: 443 }] }, double).create({
      projectId: PROJECT_ID,
    })

    expect(double.matching(`POST /apps/${APP}/network_policies`)).toHaveLength(1)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not list Fly network policies'),
      expect.anything(),
    )
  })
})

// ---------------------------------------------------------------------------
// start() actually waits
// ---------------------------------------------------------------------------

describe('start/wake wait for the Machine to be running', () => {
  it('blocks on Fly’s wait endpoint before reporting running', async () => {
    const probe = createProbeFetch()
    const client = new FlyApiClient({
      token: () => 'tok',
      baseUrl: 'https://api.machines.dev/v1',
      fetchImpl: probe.fetch,
      sleep: async () => {},
    })
    const sandbox = await createProvider({ orgSlug: 'acme' }, client).get(`${APP}:m1`)
    await sandbox?.start()

    expect(probe.calls.some((call) => call.path.includes('/wait?state=started&timeout=60'))).toBe(
      true,
    )
    expect(sandbox?.status).toBe('running')
  })

  it('throws rather than claiming running when the Machine never starts', async () => {
    const probe = createProbeFetch({ waitStatus: 400, machineState: 'stopped' })
    const client = new FlyApiClient({
      token: () => 'tok',
      baseUrl: 'https://api.machines.dev/v1',
      fetchImpl: probe.fetch,
      sleep: async () => {},
    })
    const sandbox = await createProvider({ orgSlug: 'acme' }, client).get(`${APP}:m1`)
    await expect(sandbox?.start()).rejects.toThrow(/did not reach "started"/)
  })
})
