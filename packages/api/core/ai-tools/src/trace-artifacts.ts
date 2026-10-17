/**
 * What a failed Playwright run's own trace files say about the requests its page made — read
 * headlessly, in the sandbox, from the `trace.zip` files the run left behind.
 *
 * X1 xr-molecule-flash-m100 (+51:19 → +53:00, 2026-10-16) ended with three failures against the
 * deployed URL — `social.spec.ts:22` and `:153` waited for a "Unfollow" button that never appeared
 * after the click, and `url-navigation.spec.ts:234` was bounced to `/login` mid-test — and nothing
 * in the run's result said why. The app's own `toggleFollow` swallowed the error of its request
 * with a bare `catch` and a comment, so the page showed nothing; the ONE artifact
 * that held the answer, the failing tests' own traces, was never read. The executor spent the
 * last minutes of the run writing throwaway Chromium probes against localhost — where the same
 * tests passed — and finished chasing an artifact of its own probe
 * (`waitForURL('/')` resolved against a `baseURL` its script did not have).
 *
 * A trace is not a debugging aid that has to be enabled by hand: Playwright writes the request
 * log and the console into `test-results/<test>/trace.zip` whenever a run retains traces, and the
 * evidence a swallowed failure hides is exactly one line of it — `POST /api/articles/x/favorite →
 * 401`. So the platform reads it (bounded, per test) and puts it in the run's result
 * ({@link failureTraceNote}), instead of leaving the executor to build its own browser to find out.
 *
 * Everything here is text in, text out: the sandbox runs {@link traceArtifactsScript} (Node, no
 * dependencies — Playwright's zip reader is not importable from a project) and prints one
 * `TRACE <json>` line per trace; the platform parses those lines ({@link parseTraceArtifacts}) and
 * writes the note ({@link failureTraceNote}). Both halves are covered by a test that runs the
 * script against a `trace.zip` produced by a real Playwright run, in the sandbox's own shape.
 *
 * @module
 */

import { locatedCommandSegments } from './command-position.js'
import { isDiagnosisRun } from './suite-overlap.js'
import { isPlaywrightRunCommand } from './utilities.js'

/** One request a traced page made, as `*.network` records it. */
export interface TraceRequest {
  /** The HTTP method (`POST`). */
  method: string
  /** The request's path (`/api/articles/x/favorite`), or the whole URL when it is cross-origin. */
  path: string
  /** The response status, or 0 when the request never got a response. */
  status: number
}

/** What one trace says: the test it belongs to, the requests it made, and its console errors. */
export interface TraceArtifact {
  /** The failure's spec file, relative to the run's directory, when the trace names one. */
  spec: string | null
  /** The line of the test's last traced step, 0 when the trace names no spec. */
  line: number
  /** The requests the page made, the interesting ones first ({@link traceArtifactsScript}). */
  requests: TraceRequest[]
  /** The console errors and page errors the page raised. */
  console: string[]
}

/** How many traces one read reports, newest first. */
export const MAX_TRACE_ARTIFACTS = 12

/** How many requests one test's trace contributes. */
export const MAX_TRACED_REQUESTS = 6

/** How many console errors one test's trace contributes. */
export const MAX_TRACED_CONSOLE = 4

/** How many tests the note in a run's result names. */
export const MAX_TRACE_NOTE_TESTS = 5

/** How many requests the note names per test. */
export const MAX_TRACE_NOTE_REQUESTS = 4

/** How long a URL the note prints, before the middle is cut. */
export const TRACE_NOTE_URL_CHARS = 96

/**
 * The Node program the sandbox runs to read a failed run's traces: `node <script> <dir>` prints one
 * `TRACE <json>` line per `trace.zip` under `<dir>` (newest first, {@link MAX_TRACE_ARTIFACTS} of
 * them), each with the test it belongs to, the requests its page made and its console errors.
 *
 * It is a standalone program, not an import, for the reason `@molecule/api-code-sandbox` runs it:
 * Playwright's own zip reader is not reachable from a project's `node_modules`, and a dependency
 * on `unzip` would make the read fail on every sandbox that has none. The zip is read with the
 * central directory and `zlib.inflateRawSync` — about forty lines, and the only thing that has to
 * be true of a `trace.zip` is that it IS one.
 *
 * A request is kept over a static asset when it failed (`status >= 400`) or never answered
 * (`status === 0`), and over anything else when it is the page talking to the app
 * (`fetch`/`xhr`/`document`): a failing test's trace holds the whole page load, and the answer is
 * always at the end of it.
 *
 * @returns The program's source, to write to a file and run.
 */
export const traceArtifactsScript = (): string => `
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const ROOT = process.argv[2] || '/workspace'
const MAX_TRACES = ${MAX_TRACE_ARTIFACTS}
const MAX_REQUESTS = ${MAX_TRACED_REQUESTS}
const MAX_CONSOLE = ${MAX_TRACED_CONSOLE}
const MAX_URL = 200

function walk(dir, depth, out) {
  if (depth < 0) return
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch (e) { return }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { walk(full, depth - 1, out); continue }
    if (entry.name !== 'trace.zip') continue
    let mtime = 0
    try { mtime = fs.statSync(full).mtimeMs } catch (e) { mtime = 0 }
    out.push({ file: full, mtime: mtime })
  }
}

function zipEntries(buf) {
  let eocd = -1
  const floor = Math.max(0, buf.length - 66000)
  for (let i = buf.length - 22; i >= floor; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd === -1) return []
  const count = buf.readUInt16LE(eocd + 10)
  let at = buf.readUInt32LE(eocd + 16)
  const out = []
  for (let n = 0; n < count; n++) {
    if (at + 46 > buf.length || buf.readUInt32LE(at) !== 0x02014b50) break
    const nameLen = buf.readUInt16LE(at + 28)
    const extraLen = buf.readUInt16LE(at + 30)
    const commentLen = buf.readUInt16LE(at + 32)
    out.push({
      name: buf.toString('utf8', at + 46, at + 46 + nameLen),
      method: buf.readUInt16LE(at + 10),
      size: buf.readUInt32LE(at + 20),
      at: buf.readUInt32LE(at + 42),
    })
    at += 46 + nameLen + extraLen + commentLen
  }
  return out
}

function zipData(buf, entry) {
  const at = entry.at
  if (at + 30 > buf.length || buf.readUInt32LE(at) !== 0x04034b50) return null
  const start = at + 30 + buf.readUInt16LE(at + 26) + buf.readUInt16LE(at + 28)
  const raw = buf.subarray(start, start + entry.size)
  if (entry.method === 0) return raw
  if (entry.method === 8) { try { return zlib.inflateRawSync(raw) } catch (e) { return null } }
  return null
}

function ndjson(buf) {
  const out = []
  if (!buf) return out
  for (const line of buf.toString('utf8').split('\\n')) {
    if (!line) continue
    try { out.push(JSON.parse(line)) } catch (e) { /* a partial final line */ }
  }
  return out
}

function messageOf(value) {
  let at = value
  for (let i = 0; i < 4 && at && typeof at === 'object'; i++) {
    if (typeof at.message === 'string') return at.message
    at = at.error
  }
  return null
}

let origin = ''
function pathOf(url) {
  try {
    const parsed = new URL(url)
    return parsed.origin === origin ? parsed.pathname + parsed.search : url
  } catch (e) { return url }
}
function originOf(url) {
  try { return new URL(url).origin } catch (e) { return '' }
}
const SUITE_DIRS = ['e2e', 'specs', 'tests', 'test', '__tests__']
function specPathOf(file) {
  const parts = file.split('/')
  for (let i = 0; i < parts.length - 1; i++) {
    if (SUITE_DIRS.indexOf(parts[i]) !== -1) return parts.slice(i).join('/')
  }
  const rel = path.relative(ROOT, file)
  return rel && rel.slice(0, 2) !== '..' ? rel : file
}

const found = []
walk(ROOT, 5, found)
found.sort(function (a, b) { return b.mtime - a.mtime })

for (const one of found.slice(0, MAX_TRACES)) {
  let buf
  try { buf = fs.readFileSync(one.file) } catch (e) { continue }
  let entries
  try { entries = zipEntries(buf) } catch (e) { continue }
  const network = []
  const trace = []
  for (const entry of entries) {
    if (/\\.network$/.test(entry.name)) network.push.apply(network, ndjson(zipData(buf, entry)))
    else if (/\\.trace$/.test(entry.name)) trace.push.apply(trace, ndjson(zipData(buf, entry)))
  }
  const requests = []
  for (const line of network) {
    if (!line || line.type !== 'resource-snapshot') continue
    const snapshot = line.snapshot || {}
    const request = snapshot.request || {}
    if (!request.url || !request.method) continue
    const response = snapshot.response || {}
    const type = String(snapshot._resourceType || '')
    if (!origin) origin = type === 'document' ? originOf(String(request.url)) : ''
    requests.push({
      method: String(request.method).toUpperCase(),
      path: String(request.url).slice(0, MAX_URL),
      status: Number(response.status) || 0,
      type: type,
    })
  }
  if (!origin) {
    const first = requests.find(function (r) { return r.type === 'document' }) || requests[0]
    origin = first ? originOf(first.path) : ''
  }
  for (const r of requests) r.path = pathOf(r.path).slice(0, MAX_URL)
  const failing = []
  const api = []
  const rest = []
  for (let i = 0; i < requests.length; i++) {
    const r = requests[i]
    if (r.status === 0 || r.status >= 400) failing.push(i)
    else if (r.type === 'fetch' || r.type === 'xhr' || r.type === 'document') api.push(i)
    else rest.push(i)
  }
  const keep = failing.slice(-MAX_REQUESTS).concat(api.slice(-MAX_REQUESTS)).concat(rest.slice(-2))
  const chosen = []
  const seen = new Set()
  for (const i of keep.sort(function (a, b) {
    const wrong = requests[a].status === 0 || requests[a].status >= 400 ? 0 : 1
    const other = requests[b].status === 0 || requests[b].status >= 400 ? 0 : 1
    return wrong === other ? a - b : wrong - other
  })) {
    const r = requests[i]
    const key = r.method + ' ' + r.path + ' ' + r.status
    if (seen.has(key)) continue
    seen.add(key)
    chosen.push({ method: r.method, path: r.path, status: r.status })
  }
  const consoleErrors = []
  let spec = null
  let line = 0
  for (const entry of trace) {
    if (!entry) continue
    if (entry.type === 'console' && entry.messageType === 'error' && typeof entry.text === 'string')
      consoleErrors.push(entry.text)
    else if (entry.type === 'event' && entry.method === 'pageError') {
      const message = messageOf(entry.params)
      if (message) consoleErrors.push(message)
    } else if (entry.type === 'before' && Array.isArray(entry.stack) && entry.stack.length) {
      const frame = entry.stack[0] || {}
      if (typeof frame.file === 'string' && /\\.(?:spec|test)\\.[cm]?[jt]sx?$/.test(frame.file)) {
        spec = specPathOf(frame.file)
        line = Number(frame.line) || 0
      }
    }
  }
  // Chromium reports every failed request as a console error too; where the page logged something
  // of its own about it, that is the line worth reading.
  const specific = consoleErrors.filter(function (text) { return !/^Failed to load resource/.test(text) })
  const keptConsole = specific.length > 0 ? specific : consoleErrors
  if (chosen.length === 0 && keptConsole.length === 0) continue
  process.stdout.write('TRACE ' + JSON.stringify({
    dir: path.relative(ROOT, path.dirname(one.file)),
    spec: spec,
    line: line,
    requests: chosen.slice(-MAX_REQUESTS),
    console: keptConsole.slice(0, MAX_CONSOLE).map(function (text) { return text.slice(0, 300) }),
  }) + '\\n')
}
`

/**
 * The traces {@link traceArtifactsScript} printed, parsed.
 *
 * A line that is not a complete `TRACE <json>` (a truncated read, a program that died mid-write) is
 * dropped: a partial trace is not evidence about the test it came from.
 *
 * @param stdout - The program's output.
 * @returns One entry per trace it printed.
 */
export function parseTraceArtifacts(stdout: string): TraceArtifact[] {
  const out: TraceArtifact[] = []
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('TRACE ')) continue
    try {
      const raw = JSON.parse(line.slice('TRACE '.length)) as Record<string, unknown>
      const requests = Array.isArray(raw.requests) ? raw.requests : []
      const consoleMessages = Array.isArray(raw.console) ? raw.console : []
      out.push({
        spec: typeof raw.spec === 'string' ? raw.spec : null,
        line: typeof raw.line === 'number' ? raw.line : 0,
        requests: requests
          .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
          .map((r) => ({
            method: String(r.method ?? ''),
            path: String(r.path ?? ''),
            status: Number(r.status ?? 0) || 0,
          })),
        console: consoleMessages.map(String),
      })
    } catch (_error) {
      continue
    }
  }
  return out
}

/** Where a trace's test is: the spec and line it names, else the folder Playwright wrote it in. */
function whereOf(item: TraceArtifact): string {
  if (!item.spec) return 'a failing test'
  return item.line > 0 ? `${item.spec}:${item.line}` : item.spec
}

/** One request as the note writes it: `POST /api/articles/x/favorite → 401`. */
function requestLine(request: TraceRequest): string {
  const url =
    request.path.length > TRACE_NOTE_URL_CHARS
      ? `${request.path.slice(0, TRACE_NOTE_URL_CHARS)}…`
      : request.path
  return `${request.method} ${url} → ${request.status === 0 ? 'no response' : request.status}`
}

/**
 * The note a failed suite run's result carries: what each failing test's page actually sent, and
 * what came back.
 *
 * This is the answer to the question a swallowed error hides — a click that changed nothing is
 * usually a request that failed — so the note leads with the failing requests and says what to do
 * with them: read the handler the route reaches, not the selector. It is BOUNDED to
 * {@link MAX_TRACE_NOTE_TESTS} tests with {@link MAX_TRACE_NOTE_REQUESTS} requests each, because it
 * rides in a result the model pays for.
 *
 * @param items - The traces {@link parseTraceArtifacts} read.
 * @param target - Where the run went — the deployed host, as the note names it.
 * @returns The note, or null when no trace held a request or a console error.
 */
export function failureTraceNote(items: readonly TraceArtifact[], target: string): string | null {
  const withEvidence = items.filter((item) => item.requests.length > 0 || item.console.length > 0)
  if (withEvidence.length === 0) return null
  const rows: string[] = []
  for (const [index, item] of withEvidence.slice(0, MAX_TRACE_NOTE_TESTS).entries()) {
    const requests = item.requests.slice(-MAX_TRACE_NOTE_REQUESTS).map(requestLine)
    const parts: string[] = []
    if (requests.length > 0) parts.push(requests.join('; '))
    if (item.console.length > 0)
      parts.push(
        `console: ${item.console
          .slice(0, 2)
          .map((text) => text.replace(/\s+/g, ' ').trim().slice(0, 160))
          .join(' | ')}`,
      )
    rows.push(`  ${index + 1}. ${whereOf(item)} — ${parts.join(' — ')}`)
  }
  const more =
    withEvidence.length > MAX_TRACE_NOTE_TESTS
      ? `\n  … and ${withEvidence.length - MAX_TRACE_NOTE_TESTS} more traced failures`
      : ''
  return (
    `The platform read the failing tests' own Playwright traces from the run against ${target} ` +
    `(the last requests each page made and what came back):\n${rows.join('\n')}${more}\n` +
    'A click that changed nothing is usually one of these requests failing, not the selector: ' +
    'read the handler this route reaches in your own source, and stop `catch`-ing the request of a ' +
    'user action silently — log it.'
  )
}

/** The Playwright trace modes that leave a zip behind for a FAILING test, whatever the retries. */
const RECORDING_TRACE_MODES: readonly string[] = ['on', 'retain-on-failure']

/**
 * A `trace:` setting and its value, however the config spells it (`trace: 'on'`,
 * `trace: "on-first-retry"`, `trace: { mode: 'retain-on-failure', screenshots: true }`). The value
 * is captured from the object form's `mode` or from the plain one.
 */
const TRACE_SETTING =
  /trace:\s*(?:\{[^{}]*?mode:\s*)?['"]?(on-first-retry|on-all-retries|retain-on-failure|on|off)(?![\w-])/g

/**
 * Whether a Playwright config records traces for the tests that fail.
 *
 * Only `on` and `retain-on-failure` keep a `trace.zip` for a failure whatever the retries do: the
 * two retry modes need a retry to happen at all, and a diagnosis run is given `--retries=0`
 * (`streamingBackgroundCommand`), so on X1 xr-molecule-flash-m100 the run's own
 * `trace: 'on-first-retry'` recorded nothing — which is what left the failing tests' network log
 * unreadable. A config that sets no `trace:` at all records nothing either (Playwright's default
 * is off); so does one that cannot be read.
 *
 * @param configText - The config's source, or '' when none could be read.
 * @returns True when the config records traces for failures.
 */
export function suiteRecordsTraces(configText: string): boolean {
  const text = configText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  return [...text.matchAll(TRACE_SETTING)].some((m) => RECORDING_TRACE_MODES.includes(m[1] ?? ''))
}

/** The `--trace` flag this platform adds, and the only value it adds it with. */
export const DIAGNOSIS_TRACE_FLAG = '--trace=retain-on-failure'

/**
 * Whether a command already decides its own tracing: `--trace=on`, `--trace retain-on-failure`.
 * A run that names one is left exactly as the executor wrote it.
 */
function namesTraceMode(command: string): boolean {
  return /(?:^|[\s;&|(])--trace(?:=|\s)/.test(command)
}

/**
 * Where the `test` word of the command's Playwright run ends, or null when it has none that the
 * shell parse can place.
 *
 * The flag has to land INSIDE the Playwright step, not at the end of the whole command: a run
 * Flash sends almost every time ends `… 2>&1 | tail -60` or `… > log 2>&1; echo "exit=$?"; grep -c
 * "" log`, and a flag appended after those is an operand of `tail`/`grep` — GNU `tail` refuses it
 * outright (`tail: option used in invalid context -- 6`) and Playwright never sees it
 * (xr-molecule-flash-m102 +07:40 → +07:53).
 *
 * The step is found by the package's own shell parse ({@link locatedCommandSegments}), the one
 * every runner classifier reads: it answers which STATEMENT runs `playwright test` in command
 * position, and where that statement's program word sits in the command. The offset is the parse's
 * own token position, never a search for the re-joined text — that text drops grouping braces and
 * single-space-joins the words, so a command carrying a heredoc body or a `"quoted"` program found
 * nothing at all and the flag was not added.
 *
 * @param command - The shell command.
 * @returns The offset just after `test`, or null.
 */
function playwrightTestWordEnd(command: string): number | null {
  for (const located of locatedCommandSegments(command)) {
    const segment = located.segment
    if (!segment || located.programOffset === null) continue
    if (!/^playwright\s+test\b/.test(segment.text)) continue
    // `playwright` and `test` are the statement's own first two words; the flag follows `test`.
    const words = new RegExp(/\S+/.source, 'g')
    words.lastIndex = located.programOffset
    const program = words.exec(command)
    if (!program) continue
    const second = words.exec(command)
    return second ? second.index + second[0].length : null
  }
  return null
}

/** The config paths a candidate directory could hold, in the order Playwright itself looks. */
const CONFIG_NAMES: readonly string[] = [
  'playwright.config.ts',
  'playwright.config.mts',
  'playwright.config.js',
  'playwright.config.mjs',
  'playwright.config.cjs',
]

/** The directories a command changes into, in order, as it writes them. */
function cdDirectories(command: string): string[] {
  const out: string[] = []
  for (const m of command.matchAll(/(?:^|[\s;&|(])cd\s+(?:'([^']+)'|"([^"]+)"|([^\s;&|)]+))/g)) {
    const dir = m[1] ?? m[2] ?? m[3]
    if (dir && !out.includes(dir)) out.push(dir)
  }
  return out
}

/** A path joined under a base, unless it is already absolute. */
function under(base: string, path: string): string {
  if (path.startsWith('/')) return path
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\.\//, '')}`
}

/**
 * The config a Playwright command reads, read from the backend — the file its own `--config`
 * names (resolved against the directory the command starts in, then against each `cd` it does
 * first), else the first `playwright.config.*` in those directories.
 *
 * Best-effort and bounded: at most four candidate files are read, and a read that fails is a
 * config that records nothing — the caller's `--trace` flag is what makes a missing trace
 * impossible either way.
 *
 * @param command - The shell command.
 * @param cwd - The directory the command starts in.
 * @param readFile - The backend's file read.
 * @returns The config's text, or '' when none could be read.
 */
async function readRunConfig(
  command: string,
  cwd: string,
  readFile: (path: string) => Promise<string>,
): Promise<string> {
  const bases = [cwd, ...cdDirectories(command).map((dir) => under(cwd, dir))].slice(0, 2)
  const config = /(?:^|[\s;&|(])--config(?:=|\s+)(?:'([^']+)'|"([^"]+)"|([^\s;&|)]+))/.exec(command)
  const explicit = config?.[1] ?? config?.[2] ?? config?.[3] ?? null
  const candidates = explicit
    ? bases.map((base) => under(base, explicit))
    : bases.flatMap((base) => CONFIG_NAMES.map((name) => `${base.replace(/\/+$/, '')}/${name}`))
  for (const candidate of candidates.slice(0, 4)) {
    try {
      const text = await readFile(candidate)
      if (text) return text
    } catch (_error) {
      continue
    }
  }
  return ''
}

/** A command with the trace flag this platform decided to add, and the sentence to report it in. */
export interface DiagnosisTraceRewrite {
  /** The command to run. */
  command: string
  /** One sentence naming the flag and why, or null when nothing was added. */
  change: string | null
}

/**
 * The command a DIAGNOSIS run needs to leave a readable trace behind, when the suite's config
 * would record none.
 *
 * The failing tests' requests are only readable if the run wrote them down (see the module doc),
 * and the config is where the decision about that lives — the platform does not edit the suite's
 * config, so it passes the flag instead, and only where it can do no harm: on a run narrowed to a
 * part of the suite or capped ({@link isDiagnosisRun}), never on the whole-suite proof run, and
 * never over a `--trace` the executor wrote itself. A capped walk is exactly the run whose
 * failures someone is about to work on; the proof run is graded as it is.
 *
 * @param args - The command, the directory it starts in, and the backend's file read.
 * @returns The command to run and the sentence to report, or the command unchanged.
 */
export async function diagnosisTraceCommand(args: {
  command: string
  cwd: string
  readFile: (path: string) => Promise<string>
}): Promise<DiagnosisTraceRewrite> {
  const unchanged = { command: args.command, change: null }
  // The proof run is the one run this must never touch: its flags are graded.
  if (!isDiagnosisRun(args.command)) return unchanged
  if (namesTraceMode(args.command)) return unchanged
  // Only a Playwright run leaves a trace to read.
  if (!isPlaywrightRunCommand(args.command)) return unchanged
  const config = await readRunConfig(args.command, args.cwd, args.readFile)
  if (suiteRecordsTraces(config)) return unchanged
  // The flag goes into the Playwright step, right after its `test` word — an option of the run
  // itself, whatever the command opens with and wherever it pipes or redirects its output. Appended
  // at the end of the whole command it belonged to the LAST pipeline stage instead (`tail`, `grep`),
  // which either refused it or silently ran without it (xr-molecule-flash-m102 +07:40 → +07:53). The
  // step's shape is untouched otherwise, so the rewrites that run on this command afterwards still
  // see what they expect: a trailing `| tail -60` is still trailing and is still dropped
  // (`streamingBackgroundCommand`).
  const at = playwrightTestWordEnd(args.command)
  if (at === null) return unchanged
  return {
    command: `${args.command.slice(0, at)} ${DIAGNOSIS_TRACE_FLAG}${args.command.slice(at)}`,
    change:
      `Added \`${DIAGNOSIS_TRACE_FLAG}\`: the suite's config records no trace for a failure` +
      `${/trace:/.test(config) ? '' : ' (it sets none)'}, and this diagnosis run's failures are ` +
      'what the platform reads the network log from. The proof run keeps the suite’s own settings.',
  }
}
