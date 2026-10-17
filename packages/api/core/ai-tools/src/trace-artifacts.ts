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
import { isPlaywrightRunCommand, redactSecrets } from './utilities.js'

/** One request a traced page made, as `*.network` records it. */
export interface TraceRequest {
  /** The HTTP method (`POST`). */
  method: string
  /** The request's path (`/api/articles/x/favorite`), or the whole URL when it is cross-origin. */
  path: string
  /**
   * The response status as the trace recorded it. Playwright writes `-1` when a request was never
   * answered (its HAR entry starts at `-1` and only a response event overwrites it); `0` is the
   * same absence when the snapshot carried no response at all. Neither is a server failure.
   */
  status: number
  /**
   * Playwright's own error text for a request that failed WITHOUT a response
   * (`net::ERR_CONNECTION_REFUSED`) — a real failure. A request that got no response and recorded
   * no text was aborted or still in flight when the test ended (the page closed under it), so it
   * says nothing about the server (xr-molecule-flash-m112 +30:45).
   */
  failure?: string
  /**
   * What the page SENT, for a 4xx answered by the app's own API — bounded (see
   * {@link MAX_TRACED_BODY_CHARS}). A body wrapped as `{"data":{…}}` is visible here in one line:
   * app-http's verbs take the body as their second argument, so a helper that passes
   * `{ data: body }` there ships the wrapper (xr-molecule-flash-m111 +11:36).
   */
  sent?: string
  /** What came back for that 4xx, bounded the same way — the API's own error body. */
  got?: string
}

/** One action the traced page performed, with the trace's own timing for it. */
export interface TraceAction {
  /** The Playwright API the entry names: `Frame.goto`, `Locator.fill`, `Locator.click`. */
  api: string
  /** When the action started, on the trace's own monotonic clock (ms). */
  start: number
  /** When it finished, or null when the run ended before it did. */
  end: number | null
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
  /**
   * The page's own actions in the order the trace recorded them, bounded — what a test that ran
   * out of a per-test budget spends its time on. A test that repeats one action prints it once per
   * repeat, so the gap between two starts is one repeat's measured cost.
   */
  actions: TraceAction[]
}

/** How many traces one read reports, newest first. */
export const MAX_TRACE_ARTIFACTS = 12

/** How many requests one test's trace contributes. */
export const MAX_TRACED_REQUESTS = 6

/** How many console errors one test's trace contributes. */
export const MAX_TRACED_CONSOLE = 4

/** How many of the page's own actions one test's trace contributes, the LAST ones. */
export const MAX_TRACED_ACTIONS = 40

/** How much of a 4xx request's sent body (or its response body) the trace read keeps. */
export const MAX_TRACED_BODY_CHARS = 300

/** How many tests the note in a run's result names. */
export const MAX_TRACE_NOTE_TESTS = 5

/** How many requests the note names per test. */
export const MAX_TRACE_NOTE_REQUESTS = 4

/** How long a URL the note prints, before the middle is cut. */
export const TRACE_NOTE_URL_CHARS = 96

/** How much of the sent body the note prints — enough to see a `{"data":…}` wrapper. */
export const TRACE_NOTE_SENT_CHARS = 160

/** How much of the response body the note prints — the API's first error line. */
export const TRACE_NOTE_GOT_CHARS = 120

/** How much of a network error's own text (`net::ERR_CONNECTION_REFUSED`) the note prints. */
const TRACE_NOTE_FAILURE_CHARS = 120

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
 * A request is kept over a static asset when it failed — a `status >= 400`, or no response at all
 * together with Playwright's own error text (`-1` plus `_failureText`, a refused connection) — and
 * over anything else when it is the page talking to the app (`fetch`/`xhr`/`document`): a failing
 * test's trace holds the whole page load. A request with no response and NO error text was aborted
 * or still in flight when the test ended; it is kept too, but as what it is, not as a failure.
 *
 * A request answered 4xx by the app's OWN API also keeps what the page SENT and the first of what
 * came back: Playwright stores either inline (`text`) or in a resource entry (`_file`), and both
 * are read. That is where a wrapped body shows: xr-molecule-flash-m111's helper passed
 * `{ data: body }` as app-http's second argument, so every POST/PUT was `{"data":{…}}` and the API
 * validated `{}`. Status alone said only "422".
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
const MAX_ACTIONS = ${MAX_TRACED_ACTIONS}
const MAX_BODY = ${MAX_TRACED_BODY_CHARS}
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

// A request/response body exactly as Playwright stored it: inline on the value, or in a resource
// entry the value names. Bounded, and binary is dropped — a JSON body is what this is for, and a
// multipart upload would print bytes.
function bodyText(buf, entries, value, max) {
  if (!value || typeof value !== 'object') return ''
  const inline = typeof value.text === 'string' ? value.text : ''
  if (inline) return inline.slice(0, max)
  if (typeof value._file !== 'string') return ''
  const entry = entries.find(function (e) { return e.name === value._file })
  if (!entry) return ''
  const data = zipData(buf, entry)
  if (!data) return ''
  const text = data.toString('utf8').slice(0, max)
  return text.indexOf('\\u0000') === -1 ? text : ''
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
      failure: typeof response._failureText === 'string' ? response._failureText : undefined,
      type: type,
      postData: request.postData,
      content: response.content,
    })
  }
  if (!origin) {
    const first = requests.find(function (r) { return r.type === 'document' }) || requests[0]
    origin = first ? originOf(first.path) : ''
  }
  for (const r of requests) r.path = pathOf(r.path).slice(0, MAX_URL)
  // A 4xx from the app's own API is where a body SHAPE is diagnosed: keep what the page sent and
  // what came back (bounded). A relative path here means the same origin as the traced document.
  for (const r of requests) {
    if (r.status < 400 || r.status >= 500) continue
    if (/^https?:/i.test(r.path)) continue
    const sent = bodyText(buf, entries, r.postData, MAX_BODY)
    const got = bodyText(buf, entries, r.content, MAX_BODY)
    if (sent) r.sent = sent
    if (got) r.got = got
  }
  // A failed request: a 4xx/5xx, or no response at all WITH Playwright's error text (a refused
  // connection). No response and no text is an aborted/pending request, not a failure.
  function failedRequest(r) {
    return r.status >= 400 || (r.status <= 0 && typeof r.failure === 'string')
  }
  const failing = []
  const api = []
  const rest = []
  for (let i = 0; i < requests.length; i++) {
    const r = requests[i]
    if (failedRequest(r)) failing.push(i)
    else if (r.type === 'fetch' || r.type === 'xhr' || r.type === 'document') api.push(i)
    else rest.push(i)
  }
  const keep = failing.slice(-MAX_REQUESTS).concat(api.slice(-MAX_REQUESTS)).concat(rest.slice(-2))
  const chosen = []
  const seen = new Set()
  for (const i of keep.sort(function (a, b) {
    const wrong = failedRequest(requests[a]) ? 0 : 1
    const other = failedRequest(requests[b]) ? 0 : 1
    return wrong === other ? a - b : wrong - other
  })) {
    const r = requests[i]
    const key = r.method + ' ' + r.path + ' ' + r.status
    if (seen.has(key)) continue
    seen.add(key)
    chosen.push({
      method: r.method,
      path: r.path,
      status: r.status,
      failure: r.failure,
      sent: r.sent,
      got: r.got,
    })
  }
  // The page's own actions, timed. before/after pair on the call id, and only the LIBRARY
  // traces carry a class and a method (Frame.goto, Locator.fill); the test runner's own
  // trace times its hooks and fixtures with class Test, which is not a page action.
  const ended = {}
  for (const entry of trace) {
    if (entry && entry.type === 'after' && typeof entry.callId === 'string' && typeof entry.endTime === 'number')
      ended[entry.callId] = entry.endTime
  }
  const actions = []
  for (const entry of trace) {
    if (!entry || entry.type !== 'before') continue
    if (typeof entry.class !== 'string' || typeof entry.method !== 'string') continue
    if (entry.class === 'Test' || typeof entry.startTime !== 'number') continue
    actions.push({
      api: entry.class + '.' + entry.method,
      start: entry.startTime,
      end: typeof ended[entry.callId] === 'number' ? ended[entry.callId] : null,
    })
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
  if (chosen.length === 0 && keptConsole.length === 0 && actions.length === 0) continue
  process.stdout.write('TRACE ' + JSON.stringify({
    dir: path.relative(ROOT, path.dirname(one.file)),
    spec: spec,
    line: line,
    // Failures first, per the sort above; the keep-window is the HEAD of that order. Taking the
    // tail here dropped every failed request as soon as a page made more than MAX_REQUESTS of them
    // plus the answered ones (xr-molecule-flash-m112's note listed only -1s and 200s).
    requests: chosen.slice(0, MAX_REQUESTS),
    console: keptConsole.slice(0, MAX_CONSOLE).map(function (text) { return text.slice(0, 300) }),
    actions: actions.slice(-MAX_ACTIONS),
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
      const actions = Array.isArray(raw.actions) ? raw.actions : []
      out.push({
        spec: typeof raw.spec === 'string' ? raw.spec : null,
        line: typeof raw.line === 'number' ? raw.line : 0,
        requests: requests
          .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
          .map((r) => ({
            method: String(r.method ?? ''),
            path: String(r.path ?? ''),
            status: Number(r.status ?? 0) || 0,
            ...(typeof r.failure === 'string' && r.failure ? { failure: r.failure } : {}),
            ...(typeof r.sent === 'string' && r.sent ? { sent: r.sent } : {}),
            ...(typeof r.got === 'string' && r.got ? { got: r.got } : {}),
          })),
        console: consoleMessages.map(String),
        actions: actions
          .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
          .filter((a) => typeof a.api === 'string' && Number.isFinite(Number(a.start)))
          .map((a) => ({
            api: String(a.api),
            start: Number(a.start),
            end: a.end === null || a.end === undefined ? null : Number(a.end),
          })),
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

/** One body as the note writes it: one line, bounded. */
function bodyLine(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine
}

/** One request named the way the note names it — `GET /api/tags`, its URL bounded. */
function requestLabel(request: TraceRequest): string {
  const url =
    request.path.length > TRACE_NOTE_URL_CHARS
      ? `${request.path.slice(0, TRACE_NOTE_URL_CHARS)}…`
      : request.path
  return `${request.method} ${url}`
}

/**
 * One request as the note writes it: `POST /api/articles/x/favorite → 401`, plus what a 4xx
 * request sent and got — `POST /api/users → 422 sent {"data":{…}} got {"errors":{…}}`.
 */
function requestLine(request: TraceRequest): string {
  // Playwright records `-1` for every request it never got a response for, so `-1` is never a
  // status to print: a request that failed without one carries its own error text, and one with
  // neither was still in flight when the test ended (xr-molecule-flash-m112 +30:45).
  const status =
    request.status > 0
      ? String(request.status)
      : request.failure
        ? `no response (${bodyLine(redactSecrets(request.failure), TRACE_NOTE_FAILURE_CHARS)})`
        : 'no response'
  const head = `${requestLabel(request)} → ${status}`
  // The body a page sends to its own API can carry a credential (a registration's password, a
  // token in a form) — the note is egress, so it goes through the same redactor command output
  // does. The parsed trace keeps the body; only the text the model reads is masked.
  const sent = request.sent
    ? ` sent ${bodyLine(redactSecrets(request.sent), TRACE_NOTE_SENT_CHARS)}`
    : ''
  const got = request.got
    ? ` got ${bodyLine(redactSecrets(request.got), TRACE_NOTE_GOT_CHARS)}`
    : ''
  return `${head}${sent}${got}`
}

/** Whether a sent body is an object whose only top-level key is `data` — the wrapped-body trap. */
function wrappedInData(text: string): boolean {
  try {
    const parsed: unknown = JSON.parse(text)
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length === 1 &&
      'data' in parsed
    )
  } catch (_error) {
    // The body was cut at MAX_TRACED_BODY_CHARS, so it need not parse; the wrapper is still the
    // first thing in it — `{"data":…}` with no other top-level key before the cut.
    return /^\{\s*"data"\s*:/.test(text.trim())
  }
}

/** Whether a trace recorded a request the server actually failed: a 4xx/5xx, or a network error. */
function failedRequest(request: TraceRequest): boolean {
  return request.status >= 400 || (request.status <= 0 && request.failure !== undefined)
}

/**
 * Whether a trace recorded NO response and no reason for it — a request that was aborted or still
 * in flight when the test ended. It is not evidence that the server failed (m112 +30:45).
 */
function unansweredRequest(request: TraceRequest): boolean {
  return request.status <= 0 && request.failure === undefined
}

/**
 * How far a trace's last recorded step can sit after an earlier walk's failing test and still be
 * that test. The trace names the LINE of the last step it recorded (the click, the wait), while the
 * run's own summary names the test's DECLARATION line, so a row that repeats a failure sits a few
 * lines below the declaration it repeats: m112's favorite test is declared at
 * `articles.spec.ts:123` and its last step, the click that changed nothing, was on `:133`.
 */
const RECURRENCE_LINE_WINDOW = 40

/** A `file:line` split, with a leading `./` dropped: the two readers spell the same file apart. */
function splitLocation(location: string): { file: string; line: number } {
  const trimmed = location.trim().replace(/^\.\//, '')
  const match = /^(.*):(\d+)$/.exec(trimmed)
  if (match === null) return { file: trimmed, line: 0 }
  return { file: match[1] ?? trimmed, line: Number(match[2]) }
}

/** Whether two locations name the same file — one may be absolute where the other is relative. */
function sameLocationFile(left: string, right: string): boolean {
  return left === right || left.endsWith(`/${right}`) || right.endsWith(`/${left}`)
}

/**
 * Whether this trace's test is one an EARLIER walk of the suite failed.
 *
 * The earlier walk's locations come from the run's own summary — the test's DECLARATION line —
 * while the trace names the last step's line, so a repeat is the same file with its step inside
 * {@link RECURRENCE_LINE_WINDOW} lines after the NEAREST earlier declaration before it (the test
 * body it belongs to). A line BEFORE the declaration is a hook, not the test: m112's
 * `url-navigation.spec.ts:107` is the Pagination suite's `afterEach`, which four different tests
 * share. A trace that names no spec cannot be placed at all.
 *
 * @param item - The trace.
 * @param earlier - The failing `file:line`s earlier walks of the suite left.
 * @returns True when the trace repeats one of them.
 */
function repeatsEarlierFailure(item: TraceArtifact, earlier: readonly string[]): boolean {
  if (item.spec === null) return false
  for (const location of earlier) {
    const before = splitLocation(location)
    if (!sameLocationFile(item.spec, before.file)) continue
    // Either side without a line is the same file alone, which is all that can be compared.
    if (item.line === 0 || before.line === 0) return true
    if (before.line <= item.line && item.line - before.line <= RECURRENCE_LINE_WINDOW) return true
  }
  return false
}

/**
 * Whether a trace holds evidence the note can explain: a request that got a RECORDED response, a
 * real failure (4xx/5xx or a network error), or a console error. A request with no response is
 * not evidence (m112 +53:46): four of the note's five rows were traces of one `afterEach` line
 * whose every request was `-1`, so the favorite cause — repeated in all three walks — stayed
 * hidden in "… and 7 more traced failures".
 */
function traceRowEvidence(item: TraceArtifact): boolean {
  return item.console.length > 0 || item.requests.some((request) => !unansweredRequest(request))
}

/**
 * The note's row order: a row with a REAL failure first, then a row whose failure an earlier walk
 * also had, then the rest. A recurrence is the only evidence a row carries when its requests were
 * all answered (m112's favorite cause: the click's own request answered, the button never
 * changed).
 */
function traceRowTier(item: TraceArtifact, earlier: readonly string[]): number {
  if (item.requests.some(failedRequest)) return 0
  if (repeatsEarlierFailure(item, earlier)) return 1
  return 2
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
 * The three kinds are kept apart, because they mean different things. A FAILED request (4xx/5xx, or
 * a network error with Playwright's own text) is a cause. A request with NO RESPONSE RECORDED —
 * Playwright's `-1`, no error text — was still in flight when the test ended (the page closed under
 * it); listing it as a failure sent a run hunting an API that never answered anything wrong
 * (xr-molecule-flash-m112 +30:45). The rest are the page's last answered requests.
 *
 * A 4xx request carries what the page SENT beside its status, so a wrapped body is visible in one
 * line rather than inferred from the status; when one of those bodies is an object whose only key
 * is `data`, the note names the call shape that produces it (xr-molecule-flash-m111 +11:36).
 *
 * WHICH rows it spends is evidence, not artifact order (xr-molecule-flash-m112 +53:46): a row
 * needs a recorded response, a real failure or a console error ({@link traceRowEvidence}), rows are
 * deduplicated by the test's location, and they are ordered real failure → repeated from an
 * earlier walk → the rest ({@link traceRowTier}). Without that the note spent all five rows on four
 * traces of one `afterEach` line whose every request was `-1`, and left the favorite cause — the
 * one failure that repeated in every walk — in its "… and N more".
 *
 * @param items - The traces {@link parseTraceArtifacts} read.
 * @param target - Where the run went — the deployed host, as the note names it.
 * @param earlierFailures - The failing `file:line`s earlier walks of this suite left, so a repeat
 *   is ranked above a one-off. Empty when the caller knows of no earlier walk.
 * @returns The note, or null when no trace held a recorded response, a real failure or a console
 *   error.
 */
export function failureTraceNote(
  items: readonly TraceArtifact[],
  target: string,
  earlierFailures: readonly string[] = [],
): string | null {
  const candidates = items.filter(traceRowEvidence)
  if (candidates.length === 0) return null
  // Ranked, then deduplicated BY LOCATION — in that order, so the row kept for a location is the
  // one carrying the strongest evidence (m112's duplicate `afterEach` rows).
  const ranked = candidates
    .map((item, index) => ({ item, index, tier: traceRowTier(item, earlierFailures) }))
    .sort((left, right) => left.tier - right.tier || left.index - right.index)
  const traced: TraceArtifact[] = []
  const seen = new Set<string>()
  for (const { item, index } of ranked) {
    // A trace that names no spec cannot be placed; it is never collapsed onto another one.
    const where = item.spec === null ? `#${index}` : whereOf(item)
    if (seen.has(where)) continue
    seen.add(where)
    traced.push(item)
    if (traced.length === MAX_TRACE_NOTE_TESTS) break
  }
  const wrapped = traced.some((item) =>
    item.requests.some((request) => request.sent !== undefined && wrappedInData(request.sent)),
  )
  // The "one of these requests failing" answer is only honest when a listed request really failed.
  const anyFailed = traced.some((item) => item.requests.some(failedRequest))
  const rows: string[] = []
  for (const [index, item] of traced.entries()) {
    const failed = item.requests.filter(failedRequest)
    const unanswered = item.requests.filter(unansweredRequest)
    const answered = item.requests.filter(
      (request) => !failedRequest(request) && !unansweredRequest(request),
    )
    let room = MAX_TRACE_NOTE_REQUESTS
    const parts: string[] = []
    if (failed.length > 0) {
      const shown = failed.slice(0, room)
      room -= shown.length
      parts.push(`failed: ${shown.map(requestLine).join('; ')}`)
    }
    if (unanswered.length > 0 && room > 0) {
      const shown = unanswered.slice(0, room)
      room -= shown.length
      parts.push(
        `no response recorded — still in flight when the test ended, so not a server failure: ` +
          shown.map(requestLabel).join('; '),
      )
    }
    if (answered.length > 0 && room > 0) {
      parts.push(`answered: ${answered.slice(0, room).map(requestLine).join('; ')}`)
    }
    if (item.console.length > 0)
      parts.push(
        `console: ${item.console
          .slice(0, 2)
          .map((text) => text.replace(/\s+/g, ' ').trim().slice(0, 160))
          .join(' | ')}`,
      )
    rows.push(`  ${index + 1}. ${whereOf(item)} — ${parts.join(' — ')}`)
  }
  // Distinct locations the note did not name: the repeats collapse, so the count is what is left
  // to look at, not how many zips Playwright wrote.
  const distinct = new Set(
    candidates.map((item, index) => (item.spec === null ? `#${index}` : whereOf(item))),
  )
  const more =
    distinct.size > traced.length
      ? `\n  … and ${distinct.size - traced.length} more traced failures`
      : ''
  return (
    `The platform read the failing tests' own Playwright traces from the run against ${target} ` +
    `(what each page sent and got: the requests that failed, the ones that got no response, and ` +
    `its last answered ones):\n` +
    `${rows.join('\n')}${more}\n` +
    (anyFailed
      ? 'A click that changed nothing is usually one of these requests failing, not the selector: ' +
        'read the handler this route reaches in your own source, and stop `catch`-ing the request of a ' +
        'user action silently — log it.'
      : 'No listed request failed — none got a 4xx/5xx or a network error — so the cause is in the ' +
        'page, not the API: read the state the failing test waited on.') +
    (wrapped
      ? ' The API received a body wrapped in `data`: app-http’s `post(url, data, config)` / ' +
        '`put(url, data, config)` / `patch(url, data, config)` take the body as their SECOND ' +
        "argument — `post('/users', { user })`, not `post('/users', { data: { user } })`."
      : '')
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
