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
  describePublicReach,
  EGRESS_PROBE_EXIT_BLOCKED,
  EGRESS_PROBE_EXIT_REACHED,
  extractPolicyId,
  extractPolicyPorts,
  formatEgressProbeTarget,
  parseEgressAllowedPorts,
  parseEgressProbeTargets,
  unexpectedPolicyPorts,
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

  // A `filtered` verdict used to say only that the probed port was dropped,
  // which reads as "nothing gets out" — while every ALLOWED port was open to
  // every host on the internet, because a Fly policy has no destination. That
  // gap is what let three ports (5432, 3129, 4000) sit publicly reachable in
  // production with the platform re-reporting `filtered` every 15 minutes.
  it('NAMES the public reach of the allowed ports even when the verdict is filtered', () => {
    const verdict = verdictForProbeExit(EGRESS_PROBE_EXIT_BLOCKED, {
      ...context,
      policyPorts: [
        { protocol: 'udp', port: 53 },
        { protocol: 'tcp', port: 5432 },
        { protocol: 'tcp', port: 3129 },
      ],
    })

    expect(verdict.state).toBe('filtered')
    expect(verdict.detail).toContain('open to EVERY host')
    expect(verdict.detail).toContain('tcp/5432, tcp/3129')
  })

  it('reports the reach of the policy Fly HOLDS, not the one this provider meant to apply', () => {
    const verdict = verdictForProbeExit(EGRESS_PROBE_EXIT_BLOCKED, {
      ...context,
      policyPorts: [{ protocol: 'udp', port: 53 }],
      appliedPolicyPorts: [{ protocol: 'udp', port: 53 }],
    })

    // DNS alone is not a TCP channel and is tracked as its own residual, so
    // there is nothing to warn about here.
    expect(verdict.state).toBe('filtered')
    expect(verdict.detail).not.toContain('open to EVERY host')
  })

  it('is OPEN when Fly holds a port this provider never configured — even if the probe was blocked', () => {
    const verdict = verdictForProbeExit(EGRESS_PROBE_EXIT_BLOCKED, {
      ...context,
      policyPorts: [{ protocol: 'udp', port: 53 }],
      appliedPolicyPorts: [
        { protocol: 'udp', port: 53 },
        { protocol: 'tcp', port: 8080 },
      ],
    })

    expect(verdict.state).toBe('open')
    expect(verdict.detail).toContain('tcp/8080')
    expect(verdict.remediation).toContain('network_policies')
    expect(verdict.remediation).toContain('restart the Machines')
  })

  it('claims no drift when the policy could not be read back', () => {
    const verdict = verdictForProbeExit(EGRESS_PROBE_EXIT_BLOCKED, {
      ...context,
      policyPorts: [{ protocol: 'udp', port: 53 }],
    })
    expect(verdict.state).toBe('filtered')
    expect(verdict.detail).not.toContain('never configured')
  })
})

// ---------------------------------------------------------------------------
// What an allowed port actually permits
// ---------------------------------------------------------------------------

describe('describePublicReach', () => {
  it('says nothing when no policy is applied or only DNS is allowed', () => {
    expect(describePublicReach(undefined)).toBe('')
    expect(describePublicReach([])).toBe('')
    expect(describePublicReach([{ protocol: 'udp', port: 53 }])).toBe('')
  })

  it('names every non-DNS port as reachable to any host on the internet', () => {
    const sentence = describePublicReach([
      { protocol: 'udp', port: 53 },
      { protocol: 'tcp', port: 3129 },
    ])
    expect(sentence).toContain('tcp/3129')
    expect(sentence).not.toContain('udp/53')
    expect(sentence).toContain('no destination field')
  })
})

describe('unexpectedPolicyPorts', () => {
  it('returns nothing when the readback matches, or when there was no readback', () => {
    const own = [{ protocol: 'tcp', port: 3129 } as const]
    expect(unexpectedPolicyPorts([...own], [...own])).toEqual([])
    expect(unexpectedPolicyPorts(undefined, [...own])).toEqual([])
  })

  it('reports a port Fly allows that this provider never configured', () => {
    expect(
      unexpectedPolicyPorts(
        [
          { protocol: 'tcp', port: 3129 },
          { protocol: 'tcp', port: 443 },
        ],
        [{ protocol: 'tcp', port: 3129 }],
      ),
    ).toEqual([{ protocol: 'tcp', port: 443 }])
  })

  it('treats an applied policy with no intent behind it as entirely unexpected', () => {
    expect(unexpectedPolicyPorts([{ protocol: 'tcp', port: 443 }], undefined)).toEqual([
      { protocol: 'tcp', port: 443 },
    ])
  })

  it('matches on protocol as well as port', () => {
    expect(
      unexpectedPolicyPorts([{ protocol: 'udp', port: 3129 }], [{ protocol: 'tcp', port: 3129 }]),
    ).toEqual([{ protocol: 'udp', port: 3129 }])
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

describe('extractPolicyPorts — what Fly actually holds', () => {
  /** The live LIST shape, verbatim from api.machines.dev on 2026-08-16. */
  const LIVE = [
    {
      id: '01M048YS9D17RDKJ5DVNFXP51Z',
      name: DEFAULT_EGRESS_POLICY_NAME,
      // NOT `selector` — the API answers with this key while accepting the other.
      netpolSelector: { all: true },
      rules: [
        {
          action: 'allow',
          direction: 'egress',
          ports: [
            { protocol: 'udp', port: 53 },
            { protocol: 'tcp', port: 5432 },
            { protocol: 'tcp', port: 3129 },
          ],
        },
      ],
    },
  ]

  it('reads the egress ports out of the live response shape', () => {
    expect(extractPolicyPorts(LIVE, DEFAULT_EGRESS_POLICY_NAME)).toEqual([
      { protocol: 'udp', port: 53 },
      { protocol: 'tcp', port: 5432 },
      { protocol: 'tcp', port: 3129 },
    ])
  })

  it('ignores ingress rules — this verdict is about egress', () => {
    const mixed = [
      {
        name: DEFAULT_EGRESS_POLICY_NAME,
        rules: [
          { action: 'allow', direction: 'ingress', ports: [{ protocol: 'tcp', port: 8080 }] },
          { action: 'allow', direction: 'egress', ports: [{ protocol: 'tcp', port: 3129 }] },
        ],
      },
    ]
    expect(extractPolicyPorts(mixed, DEFAULT_EGRESS_POLICY_NAME)).toEqual([
      { protocol: 'tcp', port: 3129 },
    ])
  })

  it('accepts a wrapped list and de-duplicates ports across rules', () => {
    const wrapped = {
      policies: [
        {
          name: DEFAULT_EGRESS_POLICY_NAME,
          rules: [
            { action: 'allow', direction: 'egress', ports: [{ protocol: 'tcp', port: 3129 }] },
            { action: 'allow', direction: 'egress', ports: [{ protocol: 'tcp', port: 3129 }] },
          ],
        },
      ],
    }
    expect(extractPolicyPorts(wrapped, DEFAULT_EGRESS_POLICY_NAME)).toEqual([
      { protocol: 'tcp', port: 3129 },
    ])
  })

  it('returns undefined — never [] — when there is nothing to compare', () => {
    // `[]` would read as "Fly allows nothing", which is the opposite of "I could
    // not look", and the drift check would then call every configured port
    // missing rather than saying nothing.
    expect(extractPolicyPorts([], DEFAULT_EGRESS_POLICY_NAME)).toBeUndefined()
    expect(extractPolicyPorts(null, DEFAULT_EGRESS_POLICY_NAME)).toBeUndefined()
    expect(
      extractPolicyPorts([{ name: 'someone-elses-policy', rules: [] }], DEFAULT_EGRESS_POLICY_NAME),
    ).toBeUndefined()
  })

  it('drops malformed port entries rather than inventing a protocol', () => {
    const junk = [
      {
        name: DEFAULT_EGRESS_POLICY_NAME,
        rules: [
          {
            action: 'allow',
            direction: 'egress',
            ports: [{ protocol: 'sctp', port: 9 }, { protocol: 'tcp', port: '3129' }, null, 7],
          },
        ],
      },
    ]
    expect(extractPolicyPorts(junk, DEFAULT_EGRESS_POLICY_NAME)).toEqual([])
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
  /** Per-call statuses for consecutive wait calls; falls back to `waitStatus` when exhausted. */
  waitStatuses?: number[]
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
  let waitIndex = 0
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
    if (path.includes('/wait')) {
      const status = options.waitStatuses?.[waitIndex++] ?? options.waitStatus ?? 200
      return respond(status, status === 200 ? { ok: true } : { error: 'deadline_exceeded' })
    }
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

  // The production shape, as measured on 2026-08-16: the policy denies the
  // probe's port, so the observation is `filtered` — while tcp/5432 and
  // tcp/3129, derived from the declared private services, were reachable to an
  // arbitrary public host (portquiz.net) from the live production Machine. The
  // verdict has to SAY that; reporting only "filtered" is what kept the hole
  // invisible.
  it('reports filtered but names the ports the policy leaves open to the whole internet', async () => {
    const probe = createProbeFetch({
      exec: { exit_code: EGRESS_PROBE_EXIT_BLOCKED },
      policies: [
        {
          id: 'pol_1',
          name: DEFAULT_EGRESS_POLICY_NAME,
          netpolSelector: { all: true },
          rules: [
            {
              action: 'allow',
              direction: 'egress',
              ports: [
                { protocol: 'udp', port: 53 },
                { protocol: 'tcp', port: 5432 },
                { protocol: 'tcp', port: 3129 },
              ],
            },
          ],
        },
      ],
    })
    const verdict = await makeProvider(
      {
        egressAllowedPorts: [{ protocol: 'udp', port: 53 }],
        privateServices: [
          { app: 'molecule-pg-tenant', port: 5432 },
          { app: 'molecule-api', port: 3129 },
        ],
      },
      probe.fetch,
    ).verifyEgress!()

    expect(verdict.state).toBe('filtered')
    expect(verdict.detail).toContain('open to EVERY host')
    expect(verdict.detail).toContain('tcp/5432, tcp/3129')
  })

  it('reads the policy back from Fly and reports OPEN on a port nothing here configured', async () => {
    const probe = createProbeFetch({
      exec: { exit_code: EGRESS_PROBE_EXIT_BLOCKED },
      policies: [
        {
          id: 'pol_1',
          name: DEFAULT_EGRESS_POLICY_NAME,
          rules: [
            {
              action: 'allow',
              direction: 'egress',
              ports: [
                { protocol: 'udp', port: 53 },
                // Somebody widened it by hand to unblock npm. The raw-connect
                // probe attempts 443 only, so nothing else here can see this.
                { protocol: 'tcp', port: 8080 },
              ],
            },
          ],
        },
      ],
    })
    const verdict = await makeProvider(
      { egressAllowedPorts: [{ protocol: 'udp', port: 53 }] },
      probe.fetch,
    ).verifyEgress!()

    expect(verdict.state).toBe('open')
    expect(verdict.detail).toContain('tcp/8080')

    // The readback has to happen while the throwaway app still exists.
    const listIndex = probe.calls.findIndex(
      (call) => call.method === 'GET' && call.path.endsWith('/network_policies'),
    )
    const appDelete = probe.calls.findIndex(
      (call) => call.method === 'DELETE' && /^\/apps\/[^/]+$/.test(call.path),
    )
    expect(listIndex).toBeGreaterThanOrEqual(0)
    expect(listIndex).toBeLessThan(appDelete)
  })

  it('stays with the probe’s own observation when the policy cannot be read back', async () => {
    const probe = createProbeFetch({ exec: { exit_code: EGRESS_PROBE_EXIT_BLOCKED } })
    const verdict = await makeProvider(
      { egressAllowedPorts: [{ protocol: 'udp', port: 53 }] },
      probe.fetch,
    ).verifyEgress!()

    expect(verdict.state).toBe('filtered')
    expect(verdict.detail).not.toContain('never configured')
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
    const double = queueCreate(createFetchDouble()).on(`GET /apps/${APP}/network_policies`, {
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

  it('reconcileEgressPolicy re-applies the current policy to an app that already exists', async () => {
    const double = createFetchDouble().on(`GET /apps/${APP}/network_policies`, {
      body: [{ id: 'pol_9', name: DEFAULT_EGRESS_POLICY_NAME }],
    })
    const instance = provider(
      {
        egressAllowedPorts: [{ protocol: 'udp', port: 53 }],
        privateServices: [{ app: 'molecule-pg-tenant', port: 5432 }],
      },
      double,
    ) as unknown as { reconcileEgressPolicy: (app: string) => Promise<unknown> }

    const ports = await instance.reconcileEgressPolicy(APP)

    expect(ports).toEqual([
      { protocol: 'udp', port: 53 },
      { protocol: 'tcp', port: 5432 },
    ])
    // Updates in place, and touches NOTHING else — no app create, no Machine.
    const applied = double.matching(`POST /apps/${APP}/network_policies`)
    expect(applied).toHaveLength(1)
    expect(applied[0].body).toEqual({
      id: 'pol_9',
      name: DEFAULT_EGRESS_POLICY_NAME,
      selector: { all: true },
      rules: [
        {
          action: 'allow',
          direction: 'egress',
          ports: [
            { protocol: 'udp', port: 53 },
            { protocol: 'tcp', port: 5432 },
          ],
        },
      ],
    })
    expect(double.calls.some((call) => call.path.endsWith('/machines'))).toBe(false)
  })

  it('reconcileEgressPolicy writes NOTHING when no policy is configured', async () => {
    const double = createFetchDouble()
    const instance = provider({}, double) as unknown as {
      reconcileEgressPolicy: (app: string) => Promise<unknown>
    }

    expect(await instance.reconcileEgressPolicy(APP)).toBeUndefined()
    expect(double.calls).toHaveLength(0)
  })

  it('reconcileEgressPolicy THROWS rather than reporting a write that did not happen', async () => {
    const double = createFetchDouble()
    for (let i = 0; i < 8; i++) {
      double.on(`POST /apps/${APP}/network_policies`, { status: 500, body: { error: 'nope' } })
    }
    const instance = provider(
      { egressAllowedPorts: [{ protocol: 'udp', port: 53 }] },
      double,
    ) as unknown as { reconcileEgressPolicy: (app: string) => Promise<unknown> }

    await expect(instance.reconcileEgressPolicy(APP)).rejects.toThrow(/network_policies/)
  })

  it('still applies the policy when the policy list cannot be read', async () => {
    const double = queueCreate(createFetchDouble())
    for (let i = 0; i < 8; i++) {
      double.on(`GET /apps/${APP}/network_policies`, { status: 500, body: { error: 'nope' } })
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

  it('spends the start budget in more wait rounds while the Machine is still provisioning', async () => {
    // The incident this guards: a freshly pushed image must be pulled onto the
    // host before the Machine can start, so the first 60 s wait round expires
    // with the Machine still in `created` — one round turned every first boot
    // after an image push into a hard create failure.
    const probe = createProbeFetch({ waitStatuses: [408, 200], machineState: 'created' })
    const client = new FlyApiClient({
      token: () => 'tok',
      baseUrl: 'https://api.machines.dev/v1',
      fetchImpl: probe.fetch,
      sleep: async () => {},
    })
    const sandbox = await createProvider({ orgSlug: 'acme' }, client).get(`${APP}:m1`)
    await sandbox?.start()

    expect(probe.calls.filter((call) => call.path.includes('/wait?state=started'))).toHaveLength(2)
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
