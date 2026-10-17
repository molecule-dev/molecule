/**
 * What a failing request actually hit, read off the runner's own output.
 *
 * Three layers fail in three different ways, and only one of them is the app's code:
 *
 * - **connection** — the request never got an answer at all: the transport timed out, was
 *   refused, reset, or could not resolve the name or negotiate TLS. Nothing about a handler,
 *   a header or CORS was measured, so a re-run is the only thing that tells a cold start (a
 *   machine deployed minutes ago whose boot finishes after the URL is live) from a real outage.
 * - **status** — a response arrived and the HTTP status disagreed with what the suite asserts.
 * - **assertion** — a response arrived and an assertion over its body failed.
 *
 * X0 xr-molecule-flash-m110 (+18:42 → +20:09) is the case this exists for: one Hurl file on the
 * freshly deployed URL failed with `(28) Operation timed out … 0 bytes received` while the other
 * twelve passed and 138 requests executed, and every note on the result read it as an assertion.
 * The executor rewrote a CORS middleware, bisected a second server and latency-compared the two,
 * then re-ran the same file — which passed in 3 s. A single re-run was the whole fix, and the one
 * fact that would have said so is the failure's LAYER.
 *
 * ONE classifier, used by the causes note ({@link ./utilities.ts} `failureCausesNote`) and by the
 * platform's own proof result (`molecule-dev` `suite-proof.ts`), so the two can never disagree
 * about whether a failure was the app's to fix.
 *
 * @module
 */

/**
 * The layer a failure came from: the transport (no answer at all), the response's status, or an
 * assertion over a response that arrived.
 */
export type RunFailureKind = 'connection' | 'status' | 'assertion'

/** What the transport did when a request never got an answer. */
export type ConnectionFailureKind = 'timeout' | 'refused' | 'reset' | 'dns' | 'tls' | 'empty'

/** One failure a runner printed, classified by the layer that failed. */
export interface RunFailureClass {
  /** The layer that failed. */
  kind: RunFailureKind
  /** For a `connection` failure, what the transport did. */
  connection?: ConnectionFailureKind
  /** How long the request waited before the transport gave up, in seconds, when printed. */
  seconds?: number
  /** The `file:line` the runner printed for the failure, when it printed one. */
  at?: string
}

/**
 * Transport-level failures, most specific first: the patterns curl/Hurl and Chromium/Node print
 * for a request that never got an answer. A message can carry more than one (`page.goto: Timeout
 * 30000ms exceeded … net::ERR_CONNECTION_REFUSED`), and the more specific reading wins.
 */
const CONNECTION_FAILURES: ReadonlyArray<readonly [ConnectionFailureKind, RegExp]> = [
  // Hurl/curl's numbered errors (curl's exit codes, printed as `(28) Operation timed out …`).
  ['empty', /\(\s*52\)\s*Empty reply from server/],
  ['timeout', /\(\s*28\)\s*Operation timed out|Operation timed out after \d+/],
  ['dns', /\(\s*6\)\s*Could not resolve host|Could not resolve host/],
  [
    'tls',
    /\(\s*(?:35|51|58|59|60|77|83|90|91)\)\s|SSL connect error|SSL certificate problem|self[- ]signed certificate|UNABLE_TO_VERIFY_LEAF_SIGNATURE|CERT_HAS_EXPIRED/i,
  ],
  [
    'refused',
    /\(\s*7\)\s*(?:Failed to connect|Couldn't connect)|Failed to connect to\s|Couldn't connect to server/,
  ],
  ['reset', /\(\s*5[56]\)\s*(?:Recv|Send) failure|Connection reset by peer|socket hang up/],
  // The browser's own net errors, and the Node errors underneath them.
  ['timeout', /net::ERR_(?:CONNECTION_)?TIMED_OUT|\bETIMEDOUT\b/],
  ['dns', /net::ERR_NAME_(?:NOT_RESOLVED|RESOLUTION_FAILED)|\bENOTFOUND\b|\bEAI_AGAIN\b/],
  ['refused', /net::ERR_CONNECTION_REFUSED|\bECONNREFUSED\b/],
  ['empty', /net::ERR_EMPTY_RESPONSE/],
  ['reset', /net::ERR_CONNECTION_(?:RESET|CLOSED|ABORTED)|\bECONNRESET\b/],
  ['tls', /net::ERR_(?:CERT|SSL|BAD_SSL)\w*/i],
]

/** A status assertion: the response arrived and its code is what failed. */
const STATUS_FAILURE =
  /^\s*error:\s*Assert status code\b|actual value is <\d{3}>|\bHTTP(?:\/[\d.]+)?\s+[1-5]\d{2}\b|Expected[: ]+[1-5]\d{2}\b|\.status\(\)/m

/** Any other assertion over a response that arrived. */
const ASSERTION_FAILURE =
  /^\s*error:\s*Assert\b|\bAssertionError\b|\bexpect\(|\bExpected[: ]|\bReceived[: ]|\bjsonpath\b|^\s*Error:/m

/** Hurl's `--> file:line:col`, the location of the failing request or assertion. */
const HURL_AT = /-->\s+(\S+?):(\d+)(?::\d+)?\s*$/m

/** A spec file and line, the location a Playwright block names. */
const SPEC_AT = /([\w./~-]+\.(?:spec|test)\.[cm]?[jt]sx?):(\d+)(?::\d+)?/

/** How long a request waited, as curl prints it (`Operation timed out after 20002 milliseconds`). */
const WAITED_MS = /Operation timed out after (\d+) milliseconds/

/** How long a request waited, as Playwright prints it (`Timeout 30000ms exceeded`). */
const WAITED_PLAYWRIGHT = /(?<!Test )\bTimeout (\d+)ms exceeded/

/**
 * The `file:line` a failure block names, when it names one.
 *
 * @param text - The failure block.
 * @returns The location, or undefined when the block carries none.
 */
function failureLocation(text: string): string | undefined {
  const hurl = HURL_AT.exec(text)
  if (hurl) return `${hurl[1] as string}:${hurl[2] as string}`
  const spec = SPEC_AT.exec(text)
  return spec ? `${spec[1] as string}:${spec[2] as string}` : undefined
}

/**
 * How long the request waited before it gave up, in seconds, when the runner printed it.
 *
 * @param text - The failure block.
 * @returns The seconds, rounded, or undefined.
 */
function waitedSeconds(text: string): number | undefined {
  const ms = WAITED_MS.exec(text) ?? WAITED_PLAYWRIGHT.exec(text)
  return ms ? Math.round(Number(ms[1]) / 1000) : undefined
}

/**
 * Classify ONE failure's text — a Hurl `error:` block, or a Playwright failure message/body.
 *
 * The transport is read first: a block that carries a connection error AND an assertion is a
 * request whose assertion never ran, so it is a connection failure. Only a block that carries no
 * failure signature at all answers null — unknown is never a connection failure, because a
 * misread transport hides a real app failure behind "just re-run it".
 *
 * @param text - One failure's text, as the runner printed it.
 * @returns The classification, or null when the text carries no failure this reads.
 */
export function classifyRunFailure(text: string): RunFailureClass | null {
  const body = String(text ?? '')
  if (body.trim().length === 0) return null
  for (const [connection, pattern] of CONNECTION_FAILURES) {
    if (!pattern.test(body)) continue
    const result: RunFailureClass = { kind: 'connection', connection }
    const at = failureLocation(body)
    if (at !== undefined) result.at = at
    const seconds = waitedSeconds(body)
    if (seconds !== undefined) result.seconds = seconds
    return result
  }
  const at = failureLocation(body)
  const kind: RunFailureKind | null = STATUS_FAILURE.test(body)
    ? 'status'
    : ASSERTION_FAILURE.test(body)
      ? 'assertion'
      : null
  if (kind === null) return null
  return at === undefined ? { kind } : { kind, at }
}

/**
 * Whether every one of the classified failures is a connection failure — the only shape in which
 * no response the app produced was measured.
 *
 * @param failures - The run's classifications, in printed order.
 * @returns True when there is at least one and none of them is the app's.
 */
export function allConnectionFailures(
  failures: ReadonlyArray<RunFailureClass | null>,
): failures is ReadonlyArray<RunFailureClass & { kind: 'connection' }> {
  return failures.length > 0 && failures.every((failure) => failure?.kind === 'connection')
}
