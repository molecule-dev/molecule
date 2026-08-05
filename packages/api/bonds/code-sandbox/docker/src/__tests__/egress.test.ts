/**
 * Tests for the two-leg egress proof.
 *
 * The verdict mapping is the entire security value: molecule.dev REFUSES TO BOOT
 * production on a non-`filtered` verdict, so a mapping bug here is a silent
 * downgrade of tenant isolation rather than a visible failure.
 *
 * The case that matters most is `leg 1 blocked + leg 2 reachable`. An earlier
 * implementation ran only leg 1 and therefore returned `filtered` on a host where
 * every sandbox could still reach SSH, Redis, monitoring and the MinIO console —
 * because host-gateway traffic never traverses DOCKER-USER.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { verifyDockerEgress } from '../egress.js'

/** Exit codes the probe programs report. */
const BLOCKED = 0
const OPEN = 9

interface ScriptedOptions {
  /** Exit code for the outbound (leg 1) probe. */
  outbound?: number
  /** Exit code for the host-port (leg 2) client. */
  hostBound?: number
  /** Omit the gateway so leg 2 cannot run. */
  noGateway?: boolean
  /** Never emit the listener readiness marker. */
  listenerNeverReady?: boolean
  /** Make container creation fail. */
  createFails?: boolean
}

/**
 * A fake Docker daemon that answers the probe's request sequence by URL, rather
 * than by FIFO position — order-independent, so a change in probe sequencing does
 * not silently invalidate these tests.
 *
 * @param opts - Scripted behaviour.
 * @returns The request function plus a log of calls.
 */
function fakeDocker(opts: ScriptedOptions = {}): {
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>
  calls: Array<{ path: string; method: string; body?: unknown }>
} {
  const calls: Array<{ path: string; method: string; body?: unknown }> = []
  // Which container id belongs to which role, so /wait can answer correctly.
  const roles = new Map<string, 'outbound' | 'listener' | 'client'>()
  let seq = 0

  const request = async (path: string, method = 'GET', body?: unknown): Promise<unknown> => {
    calls.push({ path, method, body })

    if (path === '/info') {
      return opts.noGateway ? {} : { HostGatewayIP: '172.17.0.1' }
    }
    if (path === '/networks/bridge') {
      return opts.noGateway ? {} : { IPAM: { Config: [{ Gateway: '172.17.0.1' }] } }
    }
    if (path.includes('/containers/create')) {
      if (opts.createFails) throw new Error('no such image')
      const id = `probe-${++seq}`
      const name = /name=([^&]+)/.exec(path)?.[1] ?? ''
      roles.set(
        id,
        name.includes('-l-') ? 'listener' : name.includes('-c-') ? 'client' : 'outbound',
      )
      return { Id: id }
    }
    if (path.endsWith('/start')) return {}
    if (path.includes('/logs')) {
      return opts.listenerNeverReady ? '' : 'MOL_LISTENER_READY\n'
    }
    if (path.includes('/wait')) {
      const id = /containers\/([^/]+)\/wait/.exec(path)?.[1] ?? ''
      const role = roles.get(id)
      if (role === 'client') return { StatusCode: opts.hostBound ?? BLOCKED }
      return { StatusCode: opts.outbound ?? BLOCKED }
    }
    if (method === 'DELETE') return {}
    return {}
  }

  return { request, calls }
}

/** Build a probe context around a fake daemon. */
const ctx = (opts: ScriptedOptions = {}) => {
  const { request, calls } = fakeDocker(opts)
  return {
    calls,
    context: {
      request,
      network: 'molecule-sandbox',
      baseImage: 'molecule-sandbox:latest',
      labelPrefix: 'molecule-sandbox',
      warn: vi.fn(),
    },
  }
}

describe('verifyDockerEgress — proves BOTH legs, not just outbound', () => {
  it('reports FILTERED only when both legs are denied', async () => {
    const { context } = ctx({ outbound: BLOCKED, hostBound: BLOCKED })
    const verdict = await verifyDockerEgress(context)
    expect(verdict.state).toBe('filtered')
  })

  it('reports OPEN when the outbound leg reaches the internet', async () => {
    const { context } = ctx({ outbound: OPEN })
    const verdict = await verifyDockerEgress(context)
    expect(verdict.state).toBe('open')
    expect(verdict.detail).toMatch(/outbound egress is NOT filtered/)
  })

  it('reports OPEN when outbound is denied but the HOST-BOUND leg gets through', async () => {
    // THE REGRESSION THIS SUITE EXISTS FOR. A `ufw reload` rebuilds INPUT while
    // leaving DOCKER-USER intact, so leg 1 passes and every host service is
    // exposed. An outbound-only implementation returned `filtered` here.
    const { context } = ctx({ outbound: BLOCKED, hostBound: OPEN })
    const verdict = await verifyDockerEgress(context)
    expect(verdict.state).toBe('open')
    expect(verdict.detail).toMatch(/INPUT-chain deny is not in effect/)
    expect(verdict.detail).toMatch(/SSH, Redis, monitoring/)
  })

  it('actually RUNS the host-bound leg — a listener in the host netns + a sandbox client', async () => {
    const { context, calls } = ctx({ outbound: BLOCKED, hostBound: BLOCKED })
    await verifyDockerEgress(context)

    const created = calls
      .filter((c) => c.path.includes('/containers/create'))
      .map((c) => c.body as { HostConfig: { NetworkMode: string } })
    // Three containers: outbound probe, host-netns listener, sandbox client.
    expect(created).toHaveLength(3)
    expect(created.map((b) => b.HostConfig.NetworkMode)).toEqual([
      'molecule-sandbox',
      'host',
      'molecule-sandbox',
    ])
  })

  it('is INCONCLUSIVE — never filtered — when the gateway cannot be discovered', async () => {
    const { context } = ctx({ outbound: BLOCKED, noGateway: true })
    const verdict = await verifyDockerEgress(context)
    expect(verdict.state).toBe('inconclusive')
    expect(verdict.state).not.toBe('filtered')
    expect(verdict.detail).toMatch(/host-gateway IP/)
  })

  it('is INCONCLUSIVE when the listener never binds — not a false blocked', async () => {
    // Without the readiness wait a fast client races the listener and its refusal
    // looks exactly like a working firewall.
    //
    // The budget is shortened via the real env var rather than faked timers: the
    // poll's job is to burn its full budget before giving up, so letting it run
    // the 5 s default would just time the test out.
    const previous = process.env.SANDBOX_EGRESS_LISTENER_READY_MS
    process.env.SANDBOX_EGRESS_LISTENER_READY_MS = '200'
    try {
      const { context } = ctx({ outbound: BLOCKED, listenerNeverReady: true })
      const verdict = await verifyDockerEgress(context)
      expect(verdict.state).toBe('inconclusive')
      expect(verdict.detail).toMatch(/never reported ready/)
    } finally {
      if (previous === undefined) delete process.env.SANDBOX_EGRESS_LISTENER_READY_MS
      else process.env.SANDBOX_EGRESS_LISTENER_READY_MS = previous
    }
  })

  it('is INCONCLUSIVE when containers cannot be created at all', async () => {
    const { context } = ctx({ createFails: true })
    const verdict = await verifyDockerEgress(context)
    expect(verdict.state).toBe('inconclusive')
  })

  it('hardens every probe container and blanks proxy env', async () => {
    const { context, calls } = ctx({ outbound: BLOCKED, hostBound: BLOCKED })
    await verifyDockerEgress(context)

    for (const call of calls.filter((c) => c.path.includes('/containers/create'))) {
      const body = call.body as {
        Env: string[]
        HostConfig: Record<string, unknown>
        Cmd: string[]
      }
      // A probe that used the proxy would report the PROXY's policy, not the
      // firewall's.
      expect(body.Env).toContain('HTTPS_PROXY=')
      // Untrusted-ish throwaway containers still get the full hardening set —
      // an earlier version shipped with Docker's default capabilities.
      expect(body.HostConfig.CapDrop).toEqual(['ALL'])
      expect(body.HostConfig.SecurityOpt).toEqual(['no-new-privileges'])
      expect(body.HostConfig.ReadonlyRootfs).toBe(true)
      expect(body.HostConfig.PidsLimit).toBe(32)
      // Raw sockets, literal IPs — never fetch, never hostnames.
      expect(body.Cmd.join(' ')).toContain("require('net')")
    }
  })

  it('pre-chooses container names so a timed-out create can still be removed', async () => {
    const { context, calls } = ctx({ outbound: BLOCKED, hostBound: BLOCKED })
    await verifyDockerEgress(context)

    const creates = calls.filter((c) => c.path.includes('/containers/create'))
    expect(creates.every((c) => /name=mol-egress-probe-/.test(c.path))).toBe(true)
    // Cleanup targets the pre-chosen NAME, which works even when the create
    // response never arrived.
    const deletes = calls.filter((c) => c.method === 'DELETE')
    expect(deletes.length).toBeGreaterThanOrEqual(3)
  })

  it('tolerates a malformed timeout env instead of computing NaN', async () => {
    const previous = process.env.SANDBOX_EGRESS_PROBE_TIMEOUT_MS
    process.env.SANDBOX_EGRESS_PROBE_TIMEOUT_MS = 'not-a-number'
    try {
      const { context, calls } = ctx({ outbound: BLOCKED, hostBound: BLOCKED })
      const verdict = await verifyDockerEgress(context)
      expect(verdict.state).toBe('filtered')
      const body = calls.find((c) => c.path.includes('/containers/create'))!.body as {
        Cmd: string[]
      }
      expect(body.Cmd.join(' ')).not.toMatch(/NaN/)
    } finally {
      if (previous === undefined) delete process.env.SANDBOX_EGRESS_PROBE_TIMEOUT_MS
      else process.env.SANDBOX_EGRESS_PROBE_TIMEOUT_MS = previous
    }
  })

  it('rejects hostname probe targets — DNS must not become the thing under test', async () => {
    const previous = process.env.SANDBOX_EGRESS_PROBE_TARGETS
    process.env.SANDBOX_EGRESS_PROBE_TARGETS = 'example.com:443'
    try {
      const { context } = ctx({ outbound: BLOCKED, hostBound: BLOCKED })
      const verdict = await verifyDockerEgress(context)
      // No valid literal targets remain, so it must refuse rather than guess.
      expect(verdict.state).toBe('inconclusive')
      expect(verdict.detail).toMatch(/literal ip:port/)
    } finally {
      if (previous === undefined) delete process.env.SANDBOX_EGRESS_PROBE_TARGETS
      else process.env.SANDBOX_EGRESS_PROBE_TARGETS = previous
    }
  })
})
