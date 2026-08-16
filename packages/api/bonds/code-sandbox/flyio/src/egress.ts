/**
 * Fly network policies — the only egress restriction Fly.io exposes — and the
 * pure logic behind the observation that proves one is actually in force.
 *
 * **What Fly actually offers.** 6PN custom private networks isolate apps from
 * EACH OTHER ("Apps on separate 6PNs can never communicate unless explicitly
 * configured to do so",
 * https://fly.io/docs/networking/custom-private-networks/); they say nothing
 * about reaching the public internet, which is a different question and the one
 * `verifyEgress()` answers. The mechanism Fly documents for that is **network
 * policies** (https://fly.io/docs/machines/guides-examples/network-policies/,
 * announced at https://community.fly.io/t/new-feature-network-policies/19173):
 * an app-scoped object with a `selector` and `allow` rules, where "Once you
 * create a rule for a given direction, the default for that direction becomes
 * drop."
 *
 * Three properties of that mechanism drive everything below, and every one of
 * them is a limitation you cannot design around:
 *
 * 1. **Rules match protocol + port ONLY.** There is no host, IP or CIDR
 *    matching, and (as of the announcement) no port ranges. A network policy
 *    therefore CANNOT express a host allowlist. `allow tcp/443` permits a
 *    sandbox to reach every host on the internet that listens on 443.
 * 2. **They do not apply to Fly Proxy traffic** — stated in the docs and, in
 *    the announcement, in capitals. Inbound preview traffic through the proxy
 *    is unaffected by an ingress rule.
 * 3. **They take effect at Machine boot.** Fly's own troubleshooting note:
 *    "After creating or updating a policy, restart or redeploy the Machines for
 *    changes to take effect." A policy applied to an app with an already-running
 *    Machine does not retroactively cover it.
 *
 * The endpoints are documented in the guide and the announcement but are NOT in
 * Fly's OpenAPI specification (https://docs.machines.dev/openapi.json — 68
 * paths, none of them `network_policies`), so the request shape below is taken
 * from those two documents verbatim and the LIST response shape, which neither
 * document specifies, is parsed defensively by {@link extractPolicyId}.
 *
 * VERIFIED AGAINST A REAL FLY ORG, 2026-08-05 — the endpoints DO exist despite
 * their absence from the spec:
 *
 *   GET  /apps/{app}/network_policies   -> 200 []
 *   GET  /apps/{app}/network_policies/  -> 404 (trailing slash is NOT accepted)
 *   POST /apps/{app}/network_policies   -> 400 {"error":"name is required"}
 *
 * The POST error is the useful one: it proves the route is real and validating,
 * and that `name` is mandatory — which is why {@link DEFAULT_EGRESS_POLICY_NAME}
 * is always sent.
 *
 * **THE PORT LIST IS THE WHOLE POLICY — there is no destination, and this was
 * measured rather than inferred (2026-08-16, live API, throwaway app).** Every
 * plausible destination field was POSTed and read back: on a RULE,
 * `ipv6_cidrs` / `ipv4_cidrs` / `cidrs` / `destinations` / `apps` / `app` / `to`
 * / `dst` are all accepted by the decoder and DROPPED — the stored rule comes
 * back as `{action, direction, ports}` and nothing else. On the SELECTOR (which
 * chooses which Machines a policy covers, i.e. the SOURCE, never a destination)
 * only `all`, `machines` and `metadata` persist; `apps` is the one field the API
 * answers about, with `400 {"error":"apps array not currently supported in
 * selectors"}`. So an `allow tcp/5432` rule permits that Machine to reach port
 * 5432 on EVERY host on the internet, and no arrangement of this object can say
 * otherwise. {@link describePublicReach} states that in the verdict rather than
 * leaving an operator to deduce it.
 *
 * **The derived private-service ports ARE load-bearing** (the open question this
 * module and FLY-OPERATOR-SETUP §9 both carried since 2026-08-05). Measured the
 * same day: with a policy allowing only `udp:53`, a Machine on a custom 6PN
 * could resolve `molecule-pg-tenant.flycast` and `molecule-api.flycast` but
 * every TCP connect to them was dropped, and re-applying `tcp:443` re-opened
 * only 443. Fly's "policies do not affect traffic routed through the Fly Proxy"
 * is about INGRESS; a Machine's egress TOWARD a Flycast address is filtered like
 * any other. Dropping a declared service's port would therefore take out every
 * database connection in the fleet.
 *
 * @module
 */

import type { EgressVerdict } from '@molecule/api-code-sandbox'

import type { FlyNetworkPolicyPort } from './types.js'
import { shellQuote } from './utilities.js'

/** Default name of the egress policy this provider owns on each sandbox app. */
export const DEFAULT_EGRESS_POLICY_NAME = 'molecule-sandbox-egress'

/**
 * UDP port name resolution runs on.
 *
 * Excluded from {@link describePublicReach}'s "reachable on" list because DNS is
 * not a TCP channel and is a residual of its own (a resolver forwards queries
 * upstream on the platform's behalf, which is why DNS tunnelling is tracked
 * separately in `docs/sandbox-egress-enforcement.md` rather than as an open
 * port). It is never excluded from {@link unexpectedPolicyPorts}: a policy that
 * allows DNS this provider did not configure is still drift.
 */
const DNS_PORT = 53

/**
 * Probe exit status meaning at least one raw connection to a public IP
 * SUCCEEDED. Deliberately not 1, so an interpreter error (which exits 1) can
 * never be mistaken for a completed observation.
 */
export const EGRESS_PROBE_EXIT_REACHED = 9

/** Probe exit status meaning every raw connection attempt was refused or timed out. */
export const EGRESS_PROBE_EXIT_BLOCKED = 0

/**
 * Default probe targets: one IPv4 and one IPv6 literal, both anycast resolvers
 * that answer on 443 from anywhere. IPv6 is included because Fly Machines have
 * native public IPv6 egress and "often egress over IPv6 when the destination
 * has an AAAA record" (https://fly.io/docs/networking/egress-ips/) — probing
 * only IPv4 could miss an open v6 path entirely.
 */
export const DEFAULT_EGRESS_PROBE_TARGETS = '1.1.1.1:443,[2606:4700:4700::1111]:443'

/** One literal host:port the probe attempts a raw TCP connection to. */
export interface EgressProbeTarget {
  /** A literal IPv4 or IPv6 address. Never a hostname — see {@link parseEgressProbeTargets}. */
  host: string
  /** TCP port. */
  port: number
}

/** Context {@link verdictForProbeExit} renders its operator-facing messages from. */
export interface EgressProbeContext {
  /** Fly app the probe Machine ran in. */
  app: string
  /** Targets the probe attempted. */
  targets: EgressProbeTarget[]
  /**
   * Ports this provider's own egress policy allows, or `undefined` when it
   * applies no policy at all. Used for the message, the remediation, and as the
   * INTENT half of the drift check against {@link appliedPolicyPorts} — never to
   * decide `open` vs `filtered` from a probe that reached a target, which comes
   * from the observation alone.
   */
  policyPorts?: FlyNetworkPolicyPort[]
  /**
   * Ports the policy Fly ACTUALLY holds for this app allows, read back from the
   * API after the probe ran, or `undefined` when the readback failed or found no
   * policy of this provider's name.
   *
   * This is the observation half of the only drift this module can catch: a
   * policy widened outside the provider (by hand, by another tool, by an older
   * build) allows ports nothing here configured, and the raw-connect probe
   * cannot see it because it only attempts the targets it was given. See
   * {@link unexpectedPolicyPorts}.
   */
  appliedPolicyPorts?: FlyNetworkPolicyPort[]
}

/** Matches a bare IPv4 literal. */
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

/** Matches a bracketed IPv6 literal, e.g. `[2606:4700:4700::1111]`. */
const IPV6_BRACKETED = /^\[[0-9a-fA-F:]+\]$/

/**
 * Renders a target the way it is written in configuration, so an operator can
 * paste it straight back.
 * @param target - The parsed target.
 * @returns `host:port`, with IPv6 hosts bracketed.
 */
export function formatEgressProbeTarget(target: EgressProbeTarget): string {
  const host = target.host.includes(':') ? `[${target.host}]` : target.host
  return `${host}:${target.port}`
}

/**
 * Parses probe targets from configuration.
 *
 * Only LITERAL addresses are accepted, never hostnames — Fly's own
 * troubleshooting guidance for testing a policy is to "use direct IP addresses
 * (not hostnames) to test blocked traffic to avoid DNS masking", and a probe
 * that failed at name resolution would report a blocked connection it never
 * actually attempted.
 * @param raw - Comma-separated `ip:port` string, or an array of them. IPv6
 *   literals must be bracketed (`[2606:4700:4700::1111]:443`).
 * @returns The valid targets, in order. Invalid entries are dropped rather than
 *   throwing: the caller turns an empty result into an `inconclusive` verdict,
 *   which is the honest outcome for "nothing to probe".
 */
export function parseEgressProbeTargets(raw: string | string[] | undefined): EgressProbeTarget[] {
  const entries = Array.isArray(raw) ? raw : (raw ?? '').split(',')
  const targets: EgressProbeTarget[] = []
  for (const entry of entries) {
    const trimmed = entry.trim()
    const index = trimmed.lastIndexOf(':')
    if (index <= 0) continue
    const host = trimmed.slice(0, index)
    const port = Number(trimmed.slice(index + 1))
    if (!Number.isInteger(port) || port < 1 || port > 65535) continue
    if (IPV4.test(host)) targets.push({ host, port })
    else if (IPV6_BRACKETED.test(host)) targets.push({ host: host.slice(1, -1), port })
  }
  return targets
}

/**
 * Parses an allowed-port list for the egress network policy.
 *
 * An EMPTY list is deliberately not expressible. Fly documents the deny default
 * as a consequence of at least one `allow` rule existing for a direction; what
 * an allow rule with zero ports does is not documented anywhere, so a provider
 * that sent one would be guessing at a security control. An operator who wants
 * near-total denial allows a single port nothing in the sandbox uses.
 * @param raw - Comma-separated `protocol:port` pairs, e.g. `tcp:3128,udp:53`.
 *   A bare port is treated as TCP.
 * @returns The parsed ports, or `undefined` when the input is absent or empty
 *   (meaning "apply no policy"), which is NOT the same as "deny everything".
 * @throws {Error} When an entry is present but unparseable — silently dropping a
 *   port from a security control would produce a policy the operator never wrote.
 */
export function parseEgressAllowedPorts(
  raw: string | undefined,
): FlyNetworkPolicyPort[] | undefined {
  const entries = (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (entries.length === 0) return undefined

  const ports: FlyNetworkPolicyPort[] = []
  for (const entry of entries) {
    const [left, right] = entry.includes(':') ? entry.split(':', 2) : ['tcp', entry]
    const protocol = left.toLowerCase()
    const port = Number(right)
    if (
      (protocol !== 'tcp' && protocol !== 'udp') ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error(
        `Invalid Fly egress port "${entry}" — expected "tcp:443", "udp:53" or a bare port number.`,
      )
    }
    ports.push({ protocol, port })
  }
  return ports
}

/**
 * Builds the shell command that observes egress from inside a Machine.
 *
 * Raw `net.connect` on purpose: an HTTP client would honour proxy environment
 * variables and report the PROXY's policy instead of the network's. Every target
 * is attempted in parallel and the process exits
 * {@link EGRESS_PROBE_EXIT_REACHED} if any connected,
 * {@link EGRESS_PROBE_EXIT_BLOCKED} if all were refused or timed out.
 * @param targets - Literal targets to attempt.
 * @param timeoutMs - Per-connection timeout.
 * @returns A `sh`-safe command string.
 */
export function buildEgressProbeCommand(targets: EgressProbeTarget[], timeoutMs: number): string {
  const script =
    `const net=require('net');const ts=${JSON.stringify(targets)};` +
    `if(!ts.length)process.exit(1);` +
    `let open=0,left=ts.length;` +
    `const done=()=>{if(--left===0)process.exit(open>0?${EGRESS_PROBE_EXIT_REACHED}:${EGRESS_PROBE_EXIT_BLOCKED})};` +
    `for(const t of ts){const s=net.connect({host:t.host,port:t.port});` +
    `s.setTimeout(${timeoutMs});` +
    `s.on('connect',()=>{open++;s.destroy();done()});` +
    `s.on('timeout',()=>{s.destroy();done()});` +
    `s.on('error',()=>done())}`
  return `node -e ${shellQuote(script)}`
}

/**
 * Renders a port list the way an operator reads it back.
 * @param ports - The ports.
 * @returns `tcp/443, udp/53`.
 */
function formatPorts(ports: FlyNetworkPolicyPort[]): string {
  return ports.map((port) => `${port.protocol}/${port.port}`).join(', ')
}

/**
 * Describes the policy this provider applied, for the verdict message.
 * @param policyPorts - Allowed ports, or `undefined` when no policy is applied.
 * @returns A phrase naming the mechanism that was (or was not) in place.
 */
function describePolicy(policyPorts: FlyNetworkPolicyPort[] | undefined): string {
  if (!policyPorts) return 'no Fly network policy applied by this provider'
  return `a Fly network policy allowing egress on ${formatPorts(policyPorts)}`
}

/**
 * States, in the verdict itself, what an allowed port actually permits.
 *
 * A Fly network policy has no destination (see the module description — measured
 * against the live API, not inferred), so every allowed port is open to every
 * host on the internet, not only to the private service it was derived for. That
 * is the single most consequential thing about this mechanism and it was invisible
 * everywhere it mattered: the probe attempts one port the policy denies, reports
 * `filtered`, and an operator reasonably reads that as "nothing gets out".
 *
 * Naming it here means the residual is restated on every re-probe (the consumer
 * re-verifies every 15 minutes) instead of living only in a document.
 * @param policyPorts - Allowed ports, or `undefined` when no policy is applied.
 * @returns A sentence naming the public reach, or `''` when there is nothing to
 *   say (no policy, or nothing but UDP/53 — DNS is a documented residual of its
 *   own and not a TCP channel).
 */
export function describePublicReach(policyPorts: FlyNetworkPolicyPort[] | undefined): string {
  const reachable = (policyPorts ?? []).filter(
    (port) => port.protocol !== 'udp' || port.port !== DNS_PORT,
  )
  if (reachable.length === 0) return ''
  return (
    `Every allowed port is open to EVERY host, not only to the private service it exists for — ` +
    `a Fly network policy matches protocol and port with no destination field of any kind — so ` +
    `code in this app can still reach an arbitrary public host on ${formatPorts(reachable)}. ` +
    'Route what must be filtered by host through an egress proxy on one of those ports.'
  )
}

/**
 * Finds ports the policy Fly holds allows that this provider never configured.
 *
 * The raw-connect probe can only speak for the targets it was handed, so a
 * policy widened outside this provider — edited by hand to unblock something, or
 * left behind by an older build — is invisible to it: the probe's own port stays
 * denied and the verdict stays `filtered` while a port nothing here asked for is
 * open to the whole internet. Comparing what Fly holds against what this
 * provider intended is the one check that can catch that, and it is why the
 * verdict reads the policy back rather than trusting the write.
 * @param applied - Ports in the policy Fly actually holds, or `undefined` when
 *   the readback found nothing (in which case there is nothing to compare).
 * @param intended - Ports this provider configured, or `undefined` when it
 *   applies no policy.
 * @returns The applied ports with no counterpart in `intended`, in order.
 */
export function unexpectedPolicyPorts(
  applied: FlyNetworkPolicyPort[] | undefined,
  intended: FlyNetworkPolicyPort[] | undefined,
): FlyNetworkPolicyPort[] {
  if (!applied) return []
  const wanted = intended ?? []
  return applied.filter(
    (port) => !wanted.some((own) => own.protocol === port.protocol && own.port === port.port),
  )
}

/**
 * Maps a probe's exit status onto an {@link EgressVerdict}.
 *
 * The mapping is the whole security contract of this file, so it is total and
 * has exactly one path to each state:
 *
 * | Exit | Verdict | Meaning |
 * |---|---|---|
 * | {@link EGRESS_PROBE_EXIT_REACHED} | `open` | A raw socket reached a public IP. |
 * | {@link EGRESS_PROBE_EXIT_BLOCKED} | `filtered` | Every attempt was refused or timed out. |
 * | anything else | `inconclusive` | The probe did not complete its attempts. |
 *
 * Every other outcome — a missing interpreter (127), a killed process, Fly
 * returning no status at all (-1), an API failure before the probe ever ran — is
 * `inconclusive`. Collapsing any of those into `filtered` is precisely the "I
 * could not look" ⇒ "I looked and it is safe" conflation the capability exists
 * to prevent, and the caller refuses to boot production on anything but
 * `filtered`.
 * @param exitCode - The probe process's exit status.
 * @param context - App, targets and the policy this provider applied.
 * @returns The verdict.
 */
export function verdictForProbeExit(exitCode: number, context: EgressProbeContext): EgressVerdict {
  const targets = context.targets.map(formatEgressProbeTarget).join(', ')
  const policy = describePolicy(context.policyPorts)
  const reach = describePublicReach(context.appliedPolicyPorts ?? context.policyPorts)

  // Drift, and it outranks a blocked probe: the probe attempts the targets it
  // was handed, so a port widened outside this provider is open with nothing
  // observing it. `open` is the honest state — something out there permits
  // traffic this provider never configured.
  const unexpected = unexpectedPolicyPorts(context.appliedPolicyPorts, context.policyPorts)
  if (unexpected.length > 0) {
    return {
      state: 'open',
      detail: (
        `The Fly network policy in force on app "${context.app}" allows ` +
        `${formatPorts(unexpected)}, which this provider never configured (it applies ` +
        `${policy}). ${describePublicReach(context.appliedPolicyPorts)}`
      ).trim(),
      remediation:
        'Something outside this provider widened the policy. Inspect it with ' +
        `\`GET /v1/apps/${context.app}/network_policies\`, remove the rule that does not belong, ` +
        'and restart the Machines — Fly applies a policy at boot, so an already-running Machine ' +
        'keeps the wider one until it is recreated.',
    }
  }

  if (exitCode === EGRESS_PROBE_EXIT_REACHED) {
    return {
      state: 'open',
      detail:
        `A Machine in Fly app "${context.app}" (${policy}) opened a raw TCP connection to ` +
        `${targets} — sandbox egress is NOT filtered.`,
      remediation: context.policyPorts
        ? 'The policy that is in force still permits the probe’s ports. A Fly network policy ' +
          'matches protocol and port ONLY — it has no host or CIDR matching — so it cannot be a ' +
          'host allowlist. Allow only the port of an egress proxy you control and route sandbox ' +
          'traffic through it. See https://fly.io/docs/machines/guides-examples/network-policies/.'
        : 'Set config.egressAllowedPorts (or FLY_SANDBOX_EGRESS_ALLOWED_PORTS, e.g. ' +
          '"tcp:3128,udp:53") so this provider applies a Fly network policy to every sandbox app. ' +
          'Fly drops everything else in that direction once one egress rule exists. See ' +
          'https://fly.io/docs/machines/guides-examples/network-policies/.',
    }
  }

  if (exitCode === EGRESS_PROBE_EXIT_BLOCKED) {
    return {
      state: 'filtered',
      detail:
        `Raw TCP connects to ${targets} from a Machine in Fly app "${context.app}" ` +
        `(${policy}) were refused or timed out.${reach ? ` ${reach}` : ''}`,
    }
  }

  return {
    state: 'inconclusive',
    detail:
      `The egress probe in Fly app "${context.app}" exited ${exitCode}, which is neither ` +
      `${EGRESS_PROBE_EXIT_BLOCKED} (every attempt blocked) nor ${EGRESS_PROBE_EXIT_REACHED} ` +
      '(a target was reached) — it did not complete its connection attempts, so nothing was ' +
      'observed about egress.',
    remediation:
      'Check that the probe image can run `node -e` (override it with config.egressProbeImage), ' +
      'and that the Fly API token may create Machines in the probe app.',
  }
}

/**
 * Narrows an unknown value to a plain object.
 * @param value - The value to test.
 * @returns `true` when it is a non-null, non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Finds an existing policy's id in a LIST response, so the next write updates it
 * instead of stacking duplicates.
 *
 * Neither the guide nor the announcement specifies what
 * `GET /v1/apps/{app}/network_policies/` returns, and the endpoint is absent
 * from Fly's OpenAPI specification — so this accepts a bare array or an object
 * wrapping one under any of the plausible keys, and returns `undefined` for
 * anything it does not recognize. `undefined` is safe: the caller then POSTs
 * without an `id`, which still applies the policy.
 * @param response - The raw parsed LIST response.
 * @param name - The policy name to match.
 * @returns The matching policy's id, or `undefined`.
 */
export function extractPolicyId(response: unknown, name: string): string | undefined {
  const entry = findPolicy(response, name)
  return entry && typeof entry.id === 'string' && entry.id ? entry.id : undefined
}

/**
 * Reads back the egress ports the policy Fly ACTUALLY holds allows.
 *
 * The write is not the observation: this provider POSTs a policy, but what
 * governs a Machine is whatever Fly has when that Machine boots — which may
 * differ because a person, another tool or an older build changed it. Reading it
 * back is what lets {@link unexpectedPolicyPorts} catch a policy wider than the
 * one this provider configured, so `verifyEgress()` can fail on drift its raw
 * connects were never going to attempt.
 *
 * Parsed as defensively as {@link extractPolicyId}, and for the same reason:
 * neither Fly document specifies the LIST response shape. The live API answers
 * with a bare array whose selector key is `netpolSelector` rather than the
 * `selector` it accepts (verified 2026-08-16), which is exactly why nothing here
 * depends on any key but `name` and `rules`.
 * @param response - The raw parsed LIST response.
 * @param name - The policy name to match.
 * @returns The allowed egress ports, or `undefined` when no policy of that name
 *   is present or the shape is unrecognized. `undefined` means "nothing to
 *   compare", never "nothing is allowed".
 */
export function extractPolicyPorts(
  response: unknown,
  name: string,
): FlyNetworkPolicyPort[] | undefined {
  const entry = findPolicy(response, name)
  if (!entry || !Array.isArray(entry.rules)) return undefined
  const ports: FlyNetworkPolicyPort[] = []
  for (const rule of entry.rules) {
    if (!isRecord(rule) || rule.direction !== 'egress' || !Array.isArray(rule.ports)) continue
    for (const port of rule.ports) {
      if (!isRecord(port)) continue
      const protocol = port.protocol
      const value = port.port
      if ((protocol !== 'tcp' && protocol !== 'udp') || typeof value !== 'number') continue
      if (!ports.some((seen) => seen.protocol === protocol && seen.port === value)) {
        ports.push({ protocol, port: value })
      }
    }
  }
  return ports
}

/**
 * Finds the named policy in a LIST response.
 * @param response - The raw parsed LIST response.
 * @param name - The policy name to match.
 * @returns The matching entry, or `undefined`.
 */
function findPolicy(response: unknown, name: string): Record<string, unknown> | undefined {
  const list = Array.isArray(response)
    ? response
    : isRecord(response)
      ? [response.policies, response.network_policies, response.data].find(Array.isArray)
      : undefined
  if (!Array.isArray(list)) return undefined
  for (const entry of list) {
    if (isRecord(entry) && entry.name === name) return entry
  }
  return undefined
}
