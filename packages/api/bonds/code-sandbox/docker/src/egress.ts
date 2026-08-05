/**
 * Observe whether a Docker host actually denies sandbox egress.
 *
 * TWO LEGS, AND BOTH ARE REQUIRED. This is the part that is easy to get wrong and
 * was in fact got wrong: an earlier version of this check implemented only leg 1
 * and therefore reported `filtered` on a host where sandboxes could still reach
 * SSH, Redis, the monitoring stack, the MinIO admin console and the API itself.
 *
 * - **Leg 1 — DOCKER-USER (outbound to the internet).** A container on the sandbox
 *   network tries to open raw TCP to literal public IPs. Traffic leaving the
 *   bridge for the outside world traverses the `DOCKER-USER` chain.
 * - **Leg 2 — INPUT (host-bound).** Packets a sandbox sends to the HOST GATEWAY
 *   are delivered locally and **never traverse `DOCKER-USER`** — they hit the
 *   `INPUT` chain instead. The two diverge in practice: a `ufw reload` rebuilds
 *   INPUT while leaving DOCKER-USER intact, so leg 1 alone still passes while
 *   every host-bound service is exposed.
 *
 * Leg 2's difficulty is that a firewall REJECT and "nothing is listening" are the
 * same `ECONNREFUSED` to a client, so dialling an arbitrary closed port proves
 * nothing. It therefore opens a REAL listener in the host network namespace on an
 * ephemeral, deliberately non-allowlisted port and has a sandbox-network peer dial
 * it. Both ends are ours, so the answer is unambiguous.
 *
 * Every failure mode collapses to `inconclusive` — never `filtered`. "I could not
 * look" must never be reported as "I looked and it is safe"; that conflation is
 * the original failure this whole mechanism exists to prevent.
 *
 * @module
 */
import net from 'net'

import type { EgressVerdict } from '@molecule/api-code-sandbox'

/** Issues a Docker Engine API request. Injected so this module stays testable. */
export type DockerRequest = (
  path: string,
  method?: string,
  body?: unknown,
  timeoutMs?: number,
) => Promise<unknown>

/** Inputs the probe needs from the provider. */
export interface EgressProbeContext {
  request: DockerRequest
  /** The sandbox network name — the probe must be subject to the same rules. */
  network: string
  /** Image to run the probe in; needs a `node` binary. */
  baseImage: string
  /** Label namespace, used for the orphan sweep. */
  labelPrefix: string
  /** Optional logger for cleanup failures. */
  warn?: (message: string, meta?: Record<string, unknown>) => void
}

/** Exit codes the probe programs use to report what they observed. */
const EXIT_BLOCKED = 0
const EXIT_OPEN = 9
const EXIT_LISTENER_ACCEPTED = 10
const EXIT_LISTENER_IDLE = 11

const LISTENER_READY_MARKER = 'MOL_LISTENER_READY'
const PROBE_NAME_PREFIX = 'mol-egress-probe-'

/** Ephemeral range the host-port leg binds in. */
const HOST_PROBE_PORT_MIN = 41_000
const HOST_PROBE_PORT_MAX = 45_000

const REMEDIATION =
  'Apply the host default-deny for the sandbox subnet (scripts/provision-egress-firewall.sh), then re-check.'

/**
 * Parse an integer env var, tolerating garbage.
 *
 * `Math.max(min, parseInt(x))` returns NaN when x is malformed — NaN loses every
 * comparison, so a typo silently produced a NaN timeout rather than the default.
 *
 * @param raw - Raw env value.
 * @param fallback - Value to use when absent or unparseable.
 * @param min - Lower clamp.
 * @param max - Upper clamp.
 * @returns A usable integer.
 */
function intEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(raw ?? '', 10)
  const value = Number.isFinite(parsed) ? parsed : fallback
  return Math.min(max, Math.max(min, value))
}

/**
 * Literal `ip:port` destinations for leg 1.
 *
 * TWO by default, not one: a blocked verdict is inferred from failure, so a single
 * unreachable target is indistinguishable from a working firewall. Requiring every
 * target to fail makes that coincidence need two independent outages.
 *
 * Hostnames are REJECTED rather than resolved — a hostname would make DNS the
 * thing under test, and a blocked resolver would read as `filtered` on a wide-open
 * host.
 *
 * @returns Validated targets.
 */
function probeTargets(): Array<{ host: string; port: number }> {
  const raw = process.env.SANDBOX_EGRESS_PROBE_TARGETS ?? '1.1.1.1:443,8.8.8.8:443'
  const targets: Array<{ host: string; port: number }> = []
  for (const entry of raw.split(',')) {
    const match = /^\s*(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})\s*$/.exec(entry)
    if (!match) continue
    const port = Number(match[2])
    if (net.isIPv4(match[1]) && port > 0 && port < 65_536) targets.push({ host: match[1], port })
  }
  return targets
}

/**
 * Host-gateway ports the firewall intentionally allows, mirroring
 * `provision-egress-firewall.sh`. Read from the same env vars that script reads,
 * so an operator who moves a port does not silently turn leg 2 into a false pass.
 *
 * @returns Ports a sandbox is expected to reach on the host gateway.
 */
function allowedHostPorts(): Set<number> {
  const raw =
    process.env.SANDBOX_ALLOWED_HOST_PORTS ??
    [
      process.env.SANDBOX_EGRESS_PROXY_PORT ?? '3129',
      process.env.SANDBOX_DB_PORT ?? '5432',
      process.env.MINIO_PORT ?? '9000',
    ].join(',')
  const ports = new Set<number>()
  for (const entry of raw.split(',')) {
    const port = Number(entry.trim())
    if (Number.isInteger(port) && port > 0 && port < 65_536) ports.add(port)
  }
  return ports
}

/**
 * The client program: raw `net.connect` to each target.
 *
 * Raw sockets, never `fetch` — proxy env is blanked AND a raw connect ignores it
 * regardless, so this exercises the DIRECT path the proxy does not cover and only
 * the firewall stops.
 *
 * @param targets - Destinations to attempt.
 * @param timeoutMs - Per-connection timeout.
 * @returns Program source.
 */
export function buildProbeScript(
  targets: Array<{ host: string; port: number }>,
  timeoutMs: number,
): string {
  return (
    `const net=require('net');const ts=${JSON.stringify(targets)};let open=0,left=ts.length;` +
    `const done=()=>{if(--left===0)process.exit(open>0?${EXIT_OPEN}:${EXIT_BLOCKED})};` +
    `for(const t of ts){const s=net.connect({host:t.host,port:t.port});` +
    `s.setTimeout(${timeoutMs});` +
    `s.on('connect',()=>{open++;s.destroy();done()});` +
    `s.on('timeout',()=>{s.destroy();done()});` +
    `s.on('error',()=>done())}`
  )
}

/**
 * The host-netns listener program for leg 2.
 *
 * @param port - Port to bind.
 * @param timeoutMs - How long to wait for a connection.
 * @returns Program source.
 */
export function buildListenerScript(port: number, timeoutMs: number): string {
  return [
    "const net=require('net');",
    'let settled=false;',
    'const exit=(c)=>{if(settled)return;settled=true;process.exit(c);};',
    `const s=net.createServer((c)=>{c.destroy();exit(${EXIT_LISTENER_ACCEPTED});});`,
    "s.on('error',()=>exit(40));",
    `s.listen(${port},'0.0.0.0',()=>{console.log('${LISTENER_READY_MARKER}');});`,
    `setTimeout(()=>exit(${EXIT_LISTENER_IDLE}),${timeoutMs});`,
  ].join('')
}

/** Sleep, for the readiness poll. */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Create and start a hardened throwaway probe container.
 *
 * The name is PRE-CHOSEN, not read back from the create response: a create that
 * times out client-side may still have landed daemon-side, and without a known
 * name that container is unreachable and leaks.
 *
 * @param ctx - Probe context.
 * @param name - Pre-chosen container name.
 * @param script - Program to run.
 * @param hostConfig - Extra HostConfig (network mode).
 * @returns The container id, or a failure reason.
 */
async function startProbeContainer(
  ctx: EgressProbeContext,
  name: string,
  script: string,
  hostConfig: Record<string, unknown>,
): Promise<{ id: string } | { failure: string }> {
  try {
    const created = (await ctx.request(`/containers/create?name=${name}`, 'POST', {
      Image: ctx.baseImage,
      Cmd: ['node', '-e', script],
      // Blank the proxy env the sandbox image bakes in, plus NODE_OPTIONS —
      // its --max-old-space-size fights the tiny memory cap below.
      Env: [
        'HTTP_PROXY=',
        'HTTPS_PROXY=',
        'http_proxy=',
        'https_proxy=',
        'NO_PROXY=',
        'no_proxy=',
        'NODE_USE_ENV_PROXY=',
        'NODE_OPTIONS=',
      ],
      Labels: { [`${ctx.labelPrefix}.egress-probe`]: 'true' },
      // Raw (non-multiplexed) logs, so the readiness marker reads back without
      // decoding Docker's stream framing.
      Tty: true,
      HostConfig: {
        // AutoRemove OFF deliberately: it races /wait, and the exit code matters
        // more than the convenience. Callers remove unconditionally.
        AutoRemove: false,
        RestartPolicy: { Name: '' },
        Memory: 128 * 1024 * 1024,
        MemorySwap: 128 * 1024 * 1024,
        NanoCPUs: 250_000_000,
        PidsLimit: 32,
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges'],
        ReadonlyRootfs: true,
        Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=8m' },
        ...hostConfig,
      },
    })) as { Id: string }
    await ctx.request(`/containers/${created.Id}/start`, 'POST')
    return { id: created.Id }
  } catch (error) {
    return { failure: error instanceof Error ? error.message : String(error) }
  }
}

/** Remove a probe container by id or pre-chosen name; never throws. */
async function removeProbeContainer(ctx: EgressProbeContext, ref: string): Promise<void> {
  await ctx.request(`/containers/${ref}?force=true`, 'DELETE').catch((error: unknown) => {
    ctx.warn?.('Failed to remove egress probe container', { ref, error })
  })
}

/** Wait for a container to exit and return its status code. */
async function waitForExit(
  ctx: EgressProbeContext,
  id: string,
  timeoutMs: number,
): Promise<number | null> {
  try {
    const waited = (await ctx.request(`/containers/${id}/wait`, 'POST', undefined, timeoutMs)) as {
      StatusCode: number
    }
    return typeof waited?.StatusCode === 'number' ? waited.StatusCode : null
  } catch (_error) {
    return null
  }
}

/**
 * Resolve the host-gateway IP, preferring the daemon's own answer and falling
 * back to the `bridge` network's gateway — `docker info` omits `HostGatewayIP`
 * on some daemon versions.
 *
 * @param ctx - Probe context.
 * @returns The gateway IP, or null when undiscoverable.
 */
async function resolveHostGatewayIp(ctx: EgressProbeContext): Promise<string | null> {
  try {
    const info = (await ctx.request('/info')) as { HostGatewayIP?: string }
    if (info?.HostGatewayIP && net.isIP(info.HostGatewayIP)) return info.HostGatewayIP
  } catch (_error) {
    // Fall through to the bridge lookup.
  }
  try {
    const bridge = (await ctx.request('/networks/bridge')) as {
      IPAM?: { Config?: Array<{ Gateway?: string }> }
    }
    for (const entry of bridge?.IPAM?.Config ?? []) {
      if (entry.Gateway && net.isIP(entry.Gateway)) return entry.Gateway
    }
  } catch (_error) {
    // Reported as inconclusive by the caller.
  }
  return null
}

/** Leg 2's observation. */
type HostPortResult =
  | { result: 'reachable'; detail: string }
  | { result: 'blocked'; detail: string }
  | { result: 'inconclusive'; detail: string }

/**
 * Leg 2 — prove the INPUT chain denies sandbox→host traffic.
 *
 * @param ctx - Probe context.
 * @param timeoutMs - Per-connection timeout.
 * @returns What was observed on the locally-delivered path.
 */
async function probeHostPort(ctx: EgressProbeContext, timeoutMs: number): Promise<HostPortResult> {
  const gateway = await resolveHostGatewayIp(ctx)
  if (!gateway) {
    return {
      result: 'inconclusive',
      detail:
        'could not determine the host-gateway IP, so the INPUT-chain deny (host-bound ports: ' +
        `SSH, Redis, monitoring, the MinIO console, this API) could not be verified. ${REMEDIATION}`,
    }
  }

  const allowed = allowedHostPorts()
  let port = 0
  for (let attempt = 0; attempt < 8 && port === 0; attempt++) {
    const candidate =
      HOST_PROBE_PORT_MIN + Math.floor(Math.random() * (HOST_PROBE_PORT_MAX - HOST_PROBE_PORT_MIN))
    if (!allowed.has(candidate)) port = candidate
  }
  if (port === 0) {
    return {
      result: 'inconclusive',
      detail: 'every candidate port collided with SANDBOX_ALLOWED_HOST_PORTS',
    }
  }

  const listenerName = `${PROBE_NAME_PREFIX}l-${Math.random().toString(36).slice(2, 12)}`
  const clientName = `${PROBE_NAME_PREFIX}c-${Math.random().toString(36).slice(2, 12)}`
  try {
    // The listener must live in the HOST network namespace — the only way to bind
    // a port a sandbox reaches via the gateway, container or not.
    const listener = await startProbeContainer(
      ctx,
      listenerName,
      buildListenerScript(port, timeoutMs + 5_000),
      { NetworkMode: 'host' },
    )
    if ('failure' in listener) {
      return {
        result: 'inconclusive',
        detail: `host listener could not start: ${listener.failure} (INPUT-chain deny unverified)`,
      }
    }

    // Wait for the bind. Without this a fast client races the listener and
    // reports a false `blocked`.
    const readyBudget = intEnv(process.env.SANDBOX_EGRESS_LISTENER_READY_MS, 5_000, 100, 30_000)
    let ready = false
    for (let waited = 0; waited < readyBudget && !ready; waited += 100) {
      const logs = await ctx
        .request(`/containers/${listener.id}/logs?stdout=1&stderr=1`)
        .catch(() => '')
      if (String(logs).includes(LISTENER_READY_MARKER)) {
        ready = true
        break
      }
      await delay(100)
    }
    if (!ready) {
      return {
        result: 'inconclusive',
        detail: `listener on ${gateway}:${port} never reported ready (INPUT-chain deny unverified)`,
      }
    }

    const client = await startProbeContainer(
      ctx,
      clientName,
      buildProbeScript([{ host: gateway, port }], timeoutMs),
      { NetworkMode: ctx.network },
    )
    if ('failure' in client) {
      return {
        result: 'inconclusive',
        detail: `host-port client could not start: ${client.failure} (INPUT-chain deny unverified)`,
      }
    }
    const code = await waitForExit(ctx, client.id, timeoutMs + 10_000)
    if (code === EXIT_OPEN) {
      return {
        result: 'reachable',
        detail:
          `a container on "${ctx.network}" opened TCP to the host at ${gateway}:${port}, which is ` +
          'NOT an allowed host port. The INPUT-chain deny is not in effect, so sandboxes can ' +
          `reach host-bound services (SSH, Redis, monitoring, the MinIO console, this API). ${REMEDIATION}`,
      }
    }
    if (code === EXIT_BLOCKED) {
      return { result: 'blocked', detail: `host ${gateway}:${port} refused (INPUT deny verified)` }
    }
    return {
      result: 'inconclusive',
      detail: `host-port probe exited ${String(code)} (INPUT-chain deny unverified)`,
    }
  } catch (error) {
    return {
      result: 'inconclusive',
      detail: error instanceof Error ? error.message : String(error),
    }
  } finally {
    await removeProbeContainer(ctx, listenerName)
    await removeProbeContainer(ctx, clientName)
  }
}

/**
 * Run BOTH legs and combine them into one verdict.
 *
 * A `filtered` verdict requires both legs to be denied. Either leg observing a
 * successful connection is conclusive `open`; anything that could not be observed
 * is `inconclusive`.
 *
 * @param ctx - Probe context.
 * @returns The combined verdict.
 */
export async function verifyDockerEgress(ctx: EgressProbeContext): Promise<EgressVerdict> {
  const targets = probeTargets()
  if (targets.length === 0) {
    return {
      state: 'inconclusive',
      detail: 'No valid literal ip:port probe targets configured.',
      remediation: 'Set SANDBOX_EGRESS_PROBE_TARGETS to comma-separated ip:port values.',
    }
  }
  const timeoutMs = intEnv(process.env.SANDBOX_EGRESS_PROBE_TIMEOUT_MS, 3_000, 500, 15_000)

  // ── Leg 1: DOCKER-USER / outbound ──────────────────────────────────────────
  const outboundName = `${PROBE_NAME_PREFIX}o-${Math.random().toString(36).slice(2, 12)}`
  let outbound: HostPortResult
  try {
    const started = await startProbeContainer(
      ctx,
      outboundName,
      buildProbeScript(targets, timeoutMs),
      { NetworkMode: ctx.network },
    )
    if ('failure' in started) {
      outbound = {
        result: 'inconclusive',
        detail: `outbound probe could not run: ${started.failure}`,
      }
    } else {
      const code = await waitForExit(ctx, started.id, timeoutMs * targets.length + 10_000)
      outbound =
        code === EXIT_OPEN
          ? {
              result: 'reachable',
              detail: `a container on "${ctx.network}" reached ${targets
                .map((t) => `${t.host}:${t.port}`)
                .join(' or ')} directly — outbound egress is NOT filtered. ${REMEDIATION}`,
            }
          : code === EXIT_BLOCKED
            ? {
                result: 'blocked',
                detail: `raw connects from "${ctx.network}" to ${targets.length} public target(s) were refused or timed out`,
              }
            : {
                result: 'inconclusive',
                detail: `outbound probe exited ${String(code)} — it did not complete its attempts`,
              }
    }
  } finally {
    await removeProbeContainer(ctx, outboundName)
  }

  if (outbound.result === 'reachable') {
    return { state: 'open', detail: outbound.detail, remediation: REMEDIATION }
  }

  // ── Leg 2: INPUT / host-bound ──────────────────────────────────────────────
  const hostBound = await probeHostPort(ctx, timeoutMs)
  if (hostBound.result === 'reachable') {
    return { state: 'open', detail: hostBound.detail, remediation: REMEDIATION }
  }

  // A pass needs BOTH legs denied. One inconclusive leg makes the whole verdict
  // inconclusive — half a proof is not a proof.
  if (outbound.result === 'inconclusive' || hostBound.result === 'inconclusive') {
    const parts = [outbound, hostBound]
      .filter((leg) => leg.result === 'inconclusive')
      .map((leg) => leg.detail)
    return {
      state: 'inconclusive',
      detail: `egress could not be fully verified: ${parts.join('; ')}`,
      remediation: `Ensure the Docker daemon is reachable and the base image ("${ctx.baseImage}") is present. ${REMEDIATION}`,
    }
  }

  return {
    state: 'filtered',
    detail: `both legs denied — ${outbound.detail}; ${hostBound.detail}`,
  }
}
