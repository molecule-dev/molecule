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

import { locatedCommandSegments, statementArgumentEnd } from './command-position.js'
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
  /**
   * The browser's own resource type (`document`, `fetch`, `xhr`, `font`, `image`, `stylesheet`,
   * `script`, …). `document` when the request was the page load itself; when it ended in a
   * `net::ERR_*`, nothing rendered and no selector or app request was measured.
   */
  type?: string
  /**
   * When the request started, on the trace's own monotonic clock (ms) — the same clock the
   * {@link TraceAction}s carry, so a request can be attributed to the action that caused it.
   * Absent on traces whose network entries recorded no clock (an older Playwright, a synthetic
   * fixture), in which case only recording order is available.
   */
  startedAt?: number
}

/**
 * The test's LAST user action before the failing assertion, and the requests it caused.
 *
 * An assertion after a navigation is not explained by the page's last call (`GET /api/tags` on
 * whatever page the app redirected to); it is explained by what the action the test took sent and
 * what came back (xr-molecule-flash-m148: 13 then 12 failing tests, every trace row leading with
 * `GET /api/tags → 200`, while the register `POST /api/users` and its answer — the fact that
 * explains the signed-out page — was never shown).
 */
export interface TraceLastAction {
  /** The Playwright API the trace names: `Locator.click`, `Locator.fill`, `Frame.goto`. */
  api: string
  /** When the action started, on the trace's monotonic clock (ms). */
  start: number
  /** When it finished, or null when the run ended before it did. */
  end: number | null
  /**
   * The requests the action caused — started after it and before the failing assertion, the app's
   * own API calls first, static assets and the page shell's own files left out. Empty when the
   * action sent none.
   */
  requests: TraceRequest[]
  /** The main frame's URL when the action ran, when the trace recorded frame snapshots. */
  pageBefore?: string
  /** The last main-frame URL the trace recorded — where the page ended up. */
  pageAfter?: string
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

/** What one trace says: the test it belongs to, the requests it made, and its console lines. */
export interface TraceArtifact {
  /** The failure's spec file, relative to the run's directory, when the trace names one. */
  spec: string | null
  /** The line of the test's last traced step, 0 when the trace names no spec. */
  line: number
  /** The requests the page made, the interesting ones first ({@link traceArtifactsScript}). */
  requests: TraceRequest[]
  /**
   * The request the failing step itself sent: the first answered request the test's last user
   * action caused ({@link TraceArtifact.lastAction}), else — on a trace with no action clock — the
   * trace's LAST `fetch`/`xhr` in recording order, else its document. It leads the note's row when
   * {@link lastAction} is absent, because a click that changed nothing is explained by the request
   * the click sent and what came back — xr-molecule-flash-m135's Follow click sent
   * `DELETE /api/profiles/x/follow → 200` (its `following` state was stale) and the note listed only
   * the test's earlier, answered requests.
   *
   * Absent when the trace recorded neither, and on traces read before this field existed.
   */
  lead?: TraceRequest
  /**
   * The console lines and page errors the page raised: its errors first, then a line that names a
   * session decision or comes from a molecule package, then any other warning, then the browser's
   * own resource error ({@link traceArtifactsScript}).
   */
  console: string[]
  /**
   * The test's LAST user action before the failing assertion and the requests it caused — what the
   * row leads with, when the trace carries the action times ({@link TraceLastAction}).
   *
   * Absent on traces read before this field existed, and on traces whose network entries recorded
   * no clock; the row then falls back to {@link lead}.
   */
  lastAction?: TraceLastAction
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

/**
 * How many console lines one test's trace contributes: errors ahead of a session or molecule-package
 * line, both ahead of a plain warning and of the browser's own resource error.
 */
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

/**
 * How much of the FAILING STEP's response body the note prints. Longer than
 * {@link TRACE_NOTE_GOT_CHARS}: it is the one line that answers "what did the click actually get
 * back", and an app's own body (`{"profile":{…}}`) can carry the answer past its first clause.
 */
export const TRACE_NOTE_LEAD_GOT_CHARS = 200

/** How much of a network error's own text (`net::ERR_CONNECTION_REFUSED`) the note prints. */
const TRACE_NOTE_FAILURE_CHARS = 120

/**
 * The Node program the sandbox runs to read a failed run's traces: `node <script> <dir>` prints one
 * `TRACE <json>` line per `trace.zip` under `<dir>` (newest first, {@link MAX_TRACE_ARTIFACTS} of
 * them), each with the test it belongs to, the requests its page made and its console lines.
 *
 * The console lines are ranked, because the level alone is not enough: errors first, then a line
 * that names a session decision or comes from a molecule package, then any other warning, then the
 * browser's own resource error. `@molecule/app-auth`'s "Token refresh failed, logging out" is a
 * WARNING, and keeping errors only dropped the one line that explained a whole signed-out run
 * (xr-molecule-flash-m148 +38:21).
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
const MAX_NOTE = ${MAX_TRACE_NOTE_REQUESTS}
const MAX_CONSOLE = ${MAX_TRACED_CONSOLE}
const MAX_ACTIONS = ${MAX_TRACED_ACTIONS}
const MAX_BODY = ${MAX_TRACED_BODY_CHARS}
const MAX_URL = 200
// A console line that is not an error but still has to reach the note (m148): one a molecule
// package wrote — it names the package, the \`[molecule/…]\` prefix, or the \`[scope]\` prefix
// molecule's own logger writes for a named module ([auth], [http], [i18n]) — or one that names a
// session decision in the page's own words. \`@molecule/app-auth\` logged "Token refresh failed,
// logging out" at WARNING level, and this reader kept error entries only, so every trace note
// carried the browser's generic "Failed to load resource: 401" while the platform's own package was
// saying, in words, that it had signed the user out.
const MOLECULE_CONSOLE = /@molecule\\/|\\[molecule[:\\/][^\\]]*\\]|^\\s*\\[[a-z][a-z0-9-]*\\]/
const SESSION_CONSOLE = /\\b(?:auth(?:entication|enticated|orization|orized)?|session|token|sign(?:ed|ing)?[\\s-]?out|log(?:ged|ging)?[\\s-]?out|refresh(?:ed|ing)?\\s+failed|no\\s+provider)\\b/i

// Whether a console line belongs in the note even though it is not at error level.
function consoleSignal(text) {
  return MOLECULE_CONSOLE.test(text) || SESSION_CONSOLE.test(text)
}

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
      // The HAR entry carries the monotonic clock the trace's action entries use, so a request
      // can be attributed to the action that caused it (see \`lastAction\` below).
      startedAt: typeof snapshot._monotonicTime === 'number' ? snapshot._monotonicTime : undefined,
      postData: request.postData,
      content: response.content,
    })
  }
  if (!origin) {
    const first = requests.find(function (r) { return r.type === 'document' }) || requests[0]
    origin = first ? originOf(first.path) : ''
  }
  for (const r of requests) r.path = pathOf(r.path).slice(0, MAX_URL)
  // The page's own actions, timed. before/after pair on the call id, and only the LIBRARY
  // traces carry a class and a method (Frame.goto, Locator.fill); the test runner's own
  // trace times its hooks and fixtures with class Test, which is not a page action. Read BEFORE
  // the request buckets: whether the navigation itself finished decides whether a subresource
  // with no response is evidence (see \`navigationOpen\` below).
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
  // A \`page.goto\` that has no end time: the page never finished loading. When that is the
  // failure, a document subresource with no response is the reason — the navigation waits for
  // its stylesheets and scripts — and it is evidence, not the aborted noise a finished
  // navigation leaves behind (xr-molecule-flash-m135: three goto timeouts on a deployed app
  // where one 88 KB stylesheet fetch stalled 27 s, and the trace of each held the pending CSS).
  const navigationOpen = actions.some(function (a) { return /\\.goto$/.test(a.api) && a.end === null })
  // The page shell's own requests (a service worker probe, a manifest, a font) are not the
  // failing step's dependencies: a 404 on one, or no response at all, is not a cause and takes
  // no row (xr-molecule-flash-m125 +29:33 — "GET /sw.js; GET /fonts/ionicons.woff" sent the
  // model to write a caching service worker into the app). A document's OWN stylesheet or
  // script is not shell noise: the navigation blocks on it.
  const SHELL_TYPE = { font: 1, image: 1, stylesheet: 1, script: 1, manifest: 1 }
  // The PWA worker's own hashed script (\`/workbox-d8ed3718.js\`), the manifest's touch icons
  // (\`/icons/splash-*.svg\`), the favicons and fonts: the shell's files. They are typed \`other\` or
  // \`fetch\` by the worker and the shell rather than \`script\`/\`image\`, so the type alone never
  // caught them — on xr-molecule-flash-m148 they took three of the note's four slots on every
  // failing test and pushed the register \`POST /api/users\` out.
  function shellPath(path) {
    var p = path
    try { p = new URL(path, 'http://trace.local').pathname } catch (e) { p = String(path).split(/[?#]/)[0] }
    return /^\\/(?:sw|service-worker)\\.js(?:[?#]|$)|\\/manifest\\.webmanifest(?:[?#]|$)|\\/favicon[^/]*(?:[?#]|$)|\\/fonts?\\//.test(p) ||
      /^\\/(?:assets|@vite|__mol)\\//.test(p) ||
      /^\\/workbox-[^/]*\\.js(?:[?#]|$)/.test(p) ||
      /^\\/icons\\//.test(p) ||
      /^\\/(?:apple-touch-icon|og-image|splash)[^/]*(?:[?#]|$)/.test(p)
  }
  function shellRequest(r) {
    if (r.type === 'document') return false
    return SHELL_TYPE[r.type] === 1 || shellPath(r.path)
  }
  // The shell requests that stay noise even when they never finished: the PWA worker, the
  // manifest, a favicon, a font, the worker's own script and the manifest's icons. A pending
  // \`/assets/*.css\` is NOT one of these — the navigation blocks on it (m135).
  function incidentalShell(r) {
    if (r.type === 'document') return false
    if (r.type === 'font' || r.type === 'manifest') return true
    var p = r.path
    try { p = new URL(r.path, 'http://trace.local').pathname } catch (e) { p = String(r.path).split(/[?#]/)[0] }
    return /^\\/(?:sw|service-worker)\\.js(?:[?#]|$)|\\/manifest\\.webmanifest(?:[?#]|$)|\\/favicon[^/]*(?:[?#]|$)|\\/fonts?\\//.test(p) ||
      /^\\/workbox-[^/]*\\.js(?:[?#]|$)/.test(p) ||
      /^\\/icons\\//.test(p) ||
      /^\\/(?:apple-touch-icon|og-image|splash)[^/]*(?:[?#]|$)/.test(p)
  }
  // A failed request: a 4xx/5xx, or no response at all WITH Playwright's error text (a refused
  // connection). No response and no text is an aborted/pending request, not a failure. A 404 on
  // the page shell is excepted, for the reason above.
  function failedRequest(r) {
    if (shellRequest(r) && r.status === 404) return false
    return r.status >= 400 || (r.status <= 0 && typeof r.failure === 'string')
  }
  // No response and no error text at all — still in flight when the test ended.
  function neverFinished(r) {
    return r.status <= 0 && typeof r.failure !== 'string'
  }
  // Whether a request can lead a row: it got an answer (or failed for its own recorded reason),
  // and it is the app's own call — a fetch/xhr of the page, or its document — never the page
  // shell's own probe (a refused \`/sw.js\` is not the step's request — m125 +29:33).
  //
  // It ranks the requests the test's last action caused (see \`lastAction\` below), and it is the
  // whole rule on a trace with no action clock (the fallback lead: the page's LAST call to the
  // app's own origin, else the document load). That fallback is right for a click that changed
  // nothing — xr-molecule-flash-m135 clicked Follow and sent a DELETE (its \`following\` state was
  // stale) — and wrong for an assertion after a navigation (m148), which is why the action's
  // clock, when the trace has one, decides.
  //
  // Never a request that is still in flight (no response, no error text): it says nothing about
  // what came back, and the note has its own honest row for it (m112 +30:45).
  function leadCandidate(r) {
    if (r.status <= 0 && typeof r.failure !== 'string') return false
    if (r.type === 'document') return true
    if (r.type !== 'fetch' && r.type !== 'xhr') return false
    // The request the page makes for its own shell is not the step's (m125 +29:33). The recorded
    // path can be an absolute URL when the probe's origin differs from the document's, so judge
    // its pathname.
    var p = r.path
    try { p = new URL(r.path, 'http://trace.local').pathname } catch (e) { p = String(r.path).split(/[?#]/)[0] }
    return !shellPath(p)
  }
  // The test's LAST user action before the failing assertion, and the requests it caused.
  //
  // The old lead was "the page's LAST call to the app's own origin", which is right for a click
  // that changed nothing (m135) and wrong for an assertion after a navigation: the last call
  // belongs to the page the app landed on (xr-molecule-flash-m148's \`GET /api/tags\` on Home),
  // not to the action the test took. The trace records both clocks — the action's \`startTime\`
  // and each HAR entry's \`_monotonicTime\` — so the requests that started after the last action
  // are exactly the ones it caused, and the register \`POST /api/users\` (answered 201, the page
  // then rendering signed-out) leads instead of the Home page's own fetch.
  const USER_ACTION = /\\.(?:click|dblclick|tap|fill|press|pressSequentially|selectOption|check|uncheck|setInputFiles|goto|type)$/
  const userActions = actions.filter(function (a) { return USER_ACTION.test(a.api) })
  const lastAction = userActions.length > 0 ? userActions[userActions.length - 1] : null
  // A request the action caused started after it (a millisecond of clock slack) and before the
  // assertion — which is everything later in the trace. A request that started before it is the
  // page's own load, not the action's; the page shell's files are never the step's, except a
  // document subresource the open navigation is waiting on (m135).
  function causedIndexes(action) {
    const out = []
    for (let i = 0; i < requests.length; i++) {
      const r = requests[i]
      if (typeof r.startedAt !== 'number' || r.startedAt < action.start - 1) continue
      if (shellRequest(r) && !(navigationOpen && neverFinished(r) && !incidentalShell(r))) continue
      out.push(i)
    }
    return out
  }
  // API requests first, then the navigation the page made; a stalled asset outranks both when the
  // navigation it belongs to never finished (m135's goto timeout was waiting on the CSS).
  function causedOrder(indexes) {
    const stalled = []
    const apiCalls = []
    const documents = []
    const other = []
    for (const i of indexes) {
      const r = requests[i]
      if (r.type === 'document') documents.push(i)
      else if (navigationOpen && neverFinished(r) && !incidentalShell(r)) stalled.push(i)
      else if (r.type === 'fetch' || r.type === 'xhr') apiCalls.push(i)
      else other.push(i)
    }
    return stalled.concat(apiCalls, documents, other)
  }
  const actionIndexes = lastAction === null ? [] : causedOrder(causedIndexes(lastAction))
  // Both the action's own requests and a 4xx from the app's own API keep what the page sent and
  // what came back. The action's requests keep the RESPONSE whatever its status — an answered
  // \`POST /api/users → 201\` and its body is the fact that explains a signed-out page.
  for (const i of actionIndexes) {
    const r = requests[i]
    const sent = bodyText(buf, entries, r.postData, MAX_BODY)
    const got = bodyText(buf, entries, r.content, MAX_BODY)
    if (sent) r.sent = sent
    if (got) r.got = got
  }
  for (const r of requests) {
    if (r.status < 400 || r.status >= 500) continue
    if (/^https?:/i.test(r.path)) continue
    const sent = bodyText(buf, entries, r.postData, MAX_BODY)
    const got = bodyText(buf, entries, r.content, MAX_BODY)
    if (sent) r.sent = sent
    if (got) r.got = got
  }
  function wire(r) {
    return {
      method: r.method,
      path: r.path,
      status: r.status,
      failure: r.failure,
      ...(r.sent ? { sent: r.sent } : {}),
      ...(r.got ? { got: r.got } : {}),
      type: r.type || undefined,
    }
  }
  // The main frame's URL, timed: what the page showed when the action ran, and where it ended up.
  // The trace records these around every action, which is how the note can say what the page did
  // after the request — a client-side redirect never appears in the network log as a document.
  const frames = []
  for (const entry of trace) {
    if (!entry || entry.type !== 'frame-snapshot') continue
    const snap = entry.snapshot || {}
    if (snap.isMainFrame === false) continue
    if (typeof snap.frameUrl !== 'string' || typeof snap.timestamp !== 'number') continue
    frames.push({ url: pathOf(snap.frameUrl).slice(0, MAX_URL), at: snap.timestamp })
  }
  let last = null
  if (lastAction !== null) {
    let pageBefore
    for (const frame of frames) { if (frame.at <= lastAction.start) pageBefore = frame.url }
    if (pageBefore === undefined && frames.length > 0) pageBefore = frames[0].url
    const pageAfter = frames.length > 0 ? frames[frames.length - 1].url : undefined
    last = {
      api: lastAction.api,
      start: lastAction.start,
      end: lastAction.end,
      requests: actionIndexes.slice(0, MAX_NOTE).map(function (i) { return wire(requests[i]) }),
      ...(pageBefore === undefined ? {} : { pageBefore: pageBefore }),
      ...(pageAfter === undefined ? {} : { pageAfter: pageAfter }),
    }
  }
  // The lead stays for traces that carry no action clock: the last answered fetch/xhr, else the
  // document. With an action, its first answered request is the lead.
  let lead = null
  for (const i of actionIndexes) {
    if (leadCandidate(requests[i])) { lead = wire(requests[i]); break }
  }
  // The fallback lead stays for traces with no action clock. With an action, only a request it
  // caused is the lead; an action that sent none leaves the page's own load to the row's
  // "also answered" bucket, not to a lead that would hide it.
  if (lead === null && lastAction === null) {
    let leadIndex = -1
    for (let i = requests.length - 1; i >= 0; i--) {
      const r = requests[i]
      if ((r.type === 'fetch' || r.type === 'xhr') && leadCandidate(r)) { leadIndex = i; break }
    }
    if (leadIndex === -1) {
      for (let i = requests.length - 1; i >= 0; i--) {
        if (requests[i].type === 'document' && leadCandidate(requests[i])) { leadIndex = i; break }
      }
    }
    if (leadIndex !== -1) {
      const r = requests[leadIndex]
      const sent = bodyText(buf, entries, r.postData, MAX_BODY)
      const got = bodyText(buf, entries, r.content, MAX_BODY)
      lead = wire(r)
      if (sent) lead.sent = sent
      if (got) lead.got = got
    }
  }
  const failing = []
  const api = []
  const pending = []
  const rest = []
  for (let i = 0; i < requests.length; i++) {
    const r = requests[i]
    // An answered/aborted shell request is no evidence at all — do not spend a kept row on it.
    // The exception is a document subresource that never finished while the navigation was
    // still open: that IS what the timeout waited on.
    if (shellRequest(r) && !failedRequest(r) && !(navigationOpen && neverFinished(r) && !incidentalShell(r))) continue
    if (failedRequest(r)) failing.push(i)
    else if (r.type === 'fetch' || r.type === 'xhr' || r.type === 'document') api.push(i)
    else if (navigationOpen && neverFinished(r)) pending.push(i)
    else rest.push(i)
  }
  // The action's own requests are kept whatever the cap: they are the row's first line.
  const actionSet = new Set(actionIndexes)
  const keep = failing.slice(-MAX_REQUESTS).concat(actionIndexes.slice(0, MAX_NOTE))
    .concat(api.slice(-MAX_REQUESTS))
    .concat(pending.slice(-MAX_REQUESTS)).concat(rest.slice(-2))
  const chosen = []
  const seen = new Set()
  for (const i of keep.sort(function (a, b) {
    function rank(index) {
      if (failedRequest(requests[index])) return 0
      return actionSet.has(index) ? 1 : 2
    }
    const left = rank(a)
    const right = rank(b)
    return left === right ? a - b : left - right
  })) {
    const r = requests[i]
    const key = r.method + ' ' + r.path + ' ' + r.status
    if (seen.has(key)) continue
    seen.add(key)
    chosen.push(wire(r))
  }
  const consoleErrors = []
  const consoleSignals = []
  const consoleWarnings = []
  let spec = null
  let line = 0
  for (const entry of trace) {
    if (!entry) continue
    if (entry.type === 'console' && typeof entry.text === 'string') {
      if (entry.messageType === 'error') consoleErrors.push(entry.text)
      else if (consoleSignal(entry.text)) consoleSignals.push(entry.text)
      else if (entry.messageType === 'warning' || entry.messageType === 'warn')
        consoleWarnings.push(entry.text)
    } else if (entry.type === 'event' && entry.method === 'pageError') {
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
  // of its own about it, that is the line worth reading. Errors lead, then the lines that name a
  // session decision or come from a molecule package (m148), then any other warning — the browser's
  // resource error is last, because it is evidence of a failed request, not of a cause, and the
  // platform's own package saying "logging out" must not be ranked below it.
  const specific = consoleErrors.filter(function (text) { return !/^Failed to load resource/.test(text) })
  const keptConsole = specific.concat(consoleSignals, consoleWarnings)
  if (specific.length === 0) keptConsole.push.apply(keptConsole, consoleErrors)
  if (chosen.length === 0 && keptConsole.length === 0 && actions.length === 0) continue
  process.stdout.write('TRACE ' + JSON.stringify({
    dir: path.relative(ROOT, path.dirname(one.file)),
    spec: spec,
    line: line,
    lead: lead,
    lastAction: last,
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
 * One request out of a `TRACE` line's json, or null when the value is not an object.
 *
 * @param value - One entry of the line's `requests` array, or its `lead`.
 * @returns The request, or null.
 */
function parseTraceRequest(value: unknown): TraceRequest | null {
  if (typeof value !== 'object' || value === null) return null
  const r = value as Record<string, unknown>
  return {
    method: String(r.method ?? ''),
    path: String(r.path ?? ''),
    status: Number(r.status ?? 0) || 0,
    ...(typeof r.failure === 'string' && r.failure ? { failure: r.failure } : {}),
    ...(typeof r.sent === 'string' && r.sent ? { sent: r.sent } : {}),
    ...(typeof r.got === 'string' && r.got ? { got: r.got } : {}),
    ...(typeof r.type === 'string' && r.type ? { type: r.type } : {}),
    ...(Number.isFinite(Number(r.startedAt)) ? { startedAt: Number(r.startedAt) } : {}),
  }
}

/**
 * One `lastAction` out of a `TRACE` line's json, or null when the value is not one.
 *
 * @param value - The line's `lastAction`.
 * @returns The action and its requests, or null.
 */
function parseLastAction(value: unknown): TraceLastAction | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (typeof raw.api !== 'string' || !Number.isFinite(Number(raw.start))) return null
  const requests = Array.isArray(raw.requests) ? raw.requests : []
  return {
    api: raw.api,
    start: Number(raw.start),
    end: raw.end === null || raw.end === undefined ? null : Number(raw.end),
    requests: requests
      .map(parseTraceRequest)
      .filter((request): request is TraceRequest => request !== null),
    ...(typeof raw.pageBefore === 'string' ? { pageBefore: raw.pageBefore } : {}),
    ...(typeof raw.pageAfter === 'string' ? { pageAfter: raw.pageAfter } : {}),
  }
}

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
      const lead = parseTraceRequest(raw.lead)
      const lastAction = parseLastAction(raw.lastAction)
      out.push({
        spec: typeof raw.spec === 'string' ? raw.spec : null,
        line: typeof raw.line === 'number' ? raw.line : 0,
        requests: requests
          .map(parseTraceRequest)
          .filter((request): request is TraceRequest => request !== null),
        ...(lead === null ? {} : { lead }),
        ...(lastAction === null ? {} : { lastAction }),
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

/**
 * One request as the note writes it when the body matters as much as the status: the app's own
 * answer, printed to `gotChars`.
 *
 * @param request - The request.
 * @param gotChars - How much of the response body to print.
 * @returns The request's clause.
 */
function requestWithBody(request: TraceRequest, gotChars: number): string {
  const status =
    request.status > 0
      ? String(request.status)
      : request.failure
        ? `no response (${bodyLine(redactSecrets(request.failure), TRACE_NOTE_FAILURE_CHARS)})`
        : 'no response'
  const sent = request.sent
    ? ` sent ${bodyLine(redactSecrets(request.sent), TRACE_NOTE_SENT_CHARS)}`
    : ''
  const got = request.got ? ` got ${bodyLine(redactSecrets(request.got), gotChars)}` : ''
  return `${requestLabel(request)} → ${status}${sent}${got}`
}

/**
 * The failing step's own request as the note writes it first: `the failing step sent DELETE
 * /api/profiles/x/follow → 200 got {"profile":{…}}`.
 *
 * It prints the response body whatever the status — an ANSWERED request is the point: m135's
 * Follow click sent the DELETE an unfollow sends, got a 200 and a profile with `following: false`,
 * and nothing in the result said which verb the click used.
 *
 * @param request - The trace's `lead` request.
 * @returns The clause the test's row opens with.
 */
function leadRequestLine(request: TraceRequest): string {
  return `the failing step sent ${requestWithBody(request, TRACE_NOTE_LEAD_GOT_CHARS)}`
}

/** A request's identity in a trace: method, path and status. */
function requestKey(request: TraceRequest): string {
  return `${request.method} ${request.path} ${request.status}`
}

/**
 * When an action ran, relative to the first action the trace recorded — `+2.9 s`.
 *
 * The trace's clock starts with the worker process, so the raw value is meaningless to a reader;
 * a relative time keeps the trace's own ordering visible without inventing a wall-clock time.
 *
 * @param item - The trace.
 * @param start - The action's start, on the trace's clock.
 * @returns The time to print.
 */
function actionClock(item: TraceArtifact, start: number): string {
  const first = item.actions?.[0]?.start
  if (first === undefined || !Number.isFinite(first) || start < first)
    return `${Math.round(start)} ms`
  return `+${((start - first) / 1000).toFixed(1)} s`
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

/**
 * A request the page made for its own shell rather than for the step under test: the PWA's
 * service worker (`/sw.js` — the scaffold registers one there and a project without one answers
 * 404), the manifest, a favicon, the fonts a stylesheet pulls, and Vite's/dev's own asset paths.
 *
 * These are not the failing step's dependencies, so neither a missing response nor a 404 on one is
 * a cause. xr-molecule-flash-m125 (+29:33) was handed "no response recorded — still in flight when
 * the test ended … GET /sw.js; GET /fonts/ionicons.woff" and answered it by writing a CACHING
 * service worker into the app — in front of `/assets/*`, exactly what makes a redeployed fix
 * invisible to the next proof run. The note is about the test's own API calls.
 */
const STATIC_ASSET_PATH =
  /^\/(?:sw|service-worker)\.js(?:[?#]|$)|\/manifest\.webmanifest(?:[?#]|$)|\/favicon[^/]*(?:[?#]|$)|\/fonts?\//i

/**
 * The PWA worker's own hashed script, the manifest's touch icons and the splash images.
 *
 * The worker and the shell type these `other`/`fetch`, not `script`/`image`, so
 * {@link STATIC_ASSET_TYPES} alone never caught them: on xr-molecule-flash-m148 every failing
 * test's row filled three of its four request slots with `GET /workbox-d8ed3718.js → 200` and
 * `GET /icons/splash-1125x2436.svg → 200`, and the register `POST /api/users` that explains the
 * signed-out page never appeared.
 */
const SHELL_FILE_PATH =
  /^\/workbox-[^/]*\.js(?:[?#]|$)|^\/icons\/|^\/(?:apple-touch-icon|og-image|splash)[^/]*(?:[?#]|$)/i

/** The build/dev output paths the page shell loads (Vite's bundle, the platform's own files). */
const STATIC_ASSET_DIR = /^\/(?:assets|@vite|__mol)\//i

/** The resource types a page loads for itself rather than for the step under test. */
const STATIC_ASSET_TYPES = new Set(['font', 'image', 'stylesheet', 'script', 'manifest'])

/** The path part of a request, for the static-asset test. */
function requestPath(request: TraceRequest): string {
  const url = String(request.path ?? '')
  try {
    const parsed = new URL(url, 'http://trace.local')
    return parsed.pathname
  } catch (_error) {
    // Not a URL this can parse: judge the text itself, up to any query or fragment.
    return url.split(/[?#]/)[0] ?? url
  }
}

/**
 * Whether a request is one of the page shell's, not the test's (`STATIC_ASSET_PATH`).
 *
 * The document itself is never incidental — a page that never loaded IS the failure — and a
 * request whose type is the app's own API (`fetch`/`xhr`) is judged by its path alone.
 *
 * @param request - One request a trace recorded.
 * @returns True when the request is incidental to the step under test.
 */
export function isStaticAssetRequest(request: TraceRequest): boolean {
  if (request.type === 'document') return false
  if (request.type !== undefined && STATIC_ASSET_TYPES.has(request.type)) return true
  const path = requestPath(request)
  return STATIC_ASSET_PATH.test(path) || STATIC_ASSET_DIR.test(path) || SHELL_FILE_PATH.test(path)
}

/**
 * Whether a trace recorded a request the server actually failed: a 4xx/5xx, or a network error.
 *
 * A 404 on a static asset is excepted: `/sw.js` and `/fonts/*` 404 on an app that never shipped
 * them, and naming one as a failure sent m125 into writing the caching worker it had asked about.
 * A 5xx on an asset, or a network error, still counts — the server did fail.
 *
 * @param request - One request a trace recorded.
 * @returns True when the request failed in a way the note should name.
 */
export function failedRequest(request: TraceRequest): boolean {
  if (isStaticAssetRequest(request) && request.status === 404) return false
  return request.status >= 400 || (request.status <= 0 && request.failure !== undefined)
}

/**
 * Whether a trace recorded NO response and no reason for it — a request that was aborted or still
 * in flight when the test ended. It is not evidence that the server failed (m112 +30:45), and one
 * the page shell made is not evidence about the step at all (m125 +29:33).
 *
 * @param request - One request a trace recorded.
 * @returns True when the request is still in flight and worth naming.
 */
export function unansweredRequest(request: TraceRequest): boolean {
  if (isStaticAssetRequest(request)) return false
  return request.status <= 0 && request.failure === undefined
}

/**
 * Whether a trace recorded a DOCUMENT SUBRESOURCE that never finished: a stylesheet, script or
 * other asset the page itself loads, with no response and no error text — still in flight when
 * the navigation timed out.
 *
 * The page shell's own incidental requests (`/sw.js`, the manifest, a favicon, a font) are
 * excepted for the reason {@link isStaticAssetRequest} documents: m125's run was sent to write a
 * caching service worker by an aborted `/sw.js`. A pending `/assets/*.css` is different — the
 * navigation blocks on it, so it is the reason `page.goto` ran out of time rather than one of the
 * app's API calls (xr-molecule-flash-m135 +34:10: three deployed `page.goto` timeouts on tests that
 * pass locally, one 88 KB stylesheet fetch measured at 27 s, and the failing tests' traces each
 * held the never-answered CSS while the note said "the cause is in the page").
 *
 * @param request - One request a trace recorded.
 * @returns True when the request is a document subresource that never finished.
 */
export function stalledDocumentSubresource(request: TraceRequest): boolean {
  if (request.status > 0 || request.failure !== undefined) return false
  if (request.type === 'document') return false
  if (request.type === 'font' || request.type === 'manifest') return false
  if (STATIC_ASSET_PATH.test(requestPath(request))) return false
  return isStaticAssetRequest(request)
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
 * real failure (4xx/5xx or a network error), or a console line. A request with no response is
 * not evidence (m112 +53:46): four of the note's five rows were traces of one `afterEach` line
 * whose every request was `-1`, so the favorite cause — repeated in all three walks — stayed
 * hidden in "… and 7 more traced failures".
 *
 * A request the page shell made (m125 +29:33: `/sw.js`, a font) is not evidence about the step
 * either, answered or not. The exception is a document subresource that never finished while the
 * page's own navigation was still open: the navigation waits on it, so it is the reason the
 * `page.goto` timed out ({@link stalledDocumentSubresource}).
 *
 * @param item - One traced failure.
 * @returns True when the trace holds a request or console line worth a row.
 */
function traceRowEvidence(item: TraceArtifact): boolean {
  return (
    item.console.length > 0 ||
    item.requests.some(
      (request) => !isStaticAssetRequest(request) && !unansweredRequest(request),
    ) ||
    // The one shape in which a subresource with no response IS the cause: the navigation it was
    // part of never finished (see {@link stalledDocumentSubresource}).
    (navigationNeverFinished(item) && item.requests.some(stalledDocumentSubresource))
  )
}

/**
 * The note's row order: a row with a REAL failure first, then a row whose failure an earlier walk
 * also had, then the rest. A recurrence is the only evidence a row carries when its requests were
 * all answered (m112's favorite cause: the click's own request answered, the button never
 * changed).
 */
function traceRowTier(item: TraceArtifact, earlier: readonly string[]): number {
  if (item.requests.some(failedRequest)) return 0
  // A navigation that never finished because its own subresource never got a response is as
  // strong a cause as a failed request — it is the one fact the timeout was waiting on (m135).
  if (navigationNeverFinished(item) && item.requests.some(stalledDocumentSubresource)) return 0
  if (repeatsEarlierFailure(item, earlier)) return 1
  return 2
}

/** A browser-level transport failure Chromium and Firefox both record (`net::ERR_*`). */
const NETWORK_ERROR = /\bnet::ERR_[A-Z0-9_]+\b/

/**
 * Whether the trace's page never finished a navigation: its own `Frame.goto` has no end time.
 *
 * A page that never loaded is not a set of app failures: a `page.goto` timeout on a document that
 * ended in a `net::ERR_*` is the one line that explains every test that timed out on it, and it is
 * what m118's preview walk never saw (`net::ERR_CONTENT_DECODING_FAILED` on a gzipped HTML body).
 *
 * @param item - One traced failure.
 * @returns True when the page's navigation started and never ended.
 */
function navigationNeverFinished(item: TraceArtifact): boolean {
  return item.actions?.some((action) => /\.goto$/.test(action.api) && action.end === null) ?? false
}

/** The browser transport failure behind a page that never loaded. */
interface TransportFailure {
  /** The browser's own error (`net::ERR_CONTENT_DECODING_FAILED`). */
  error: string
  /** The request/URL it hit, as the trace recorded it. */
  where: string
}

/**
 * The `net::ERR_*` the traced pages recorded, with the request it hit — or null.
 *
 * The request's own `_failureText` is preferred (Playwright records the browser's error there);
 * a console error is the fallback, because the browser logs the same failure as
 * `Failed to load resource: net::ERR_…` and a page that timed out on its document has no request
 * failure text at all.
 *
 * @param items - The traces the note is about.
 * @returns The first transport failure, or null when the browser reported none.
 */
function transportFailure(items: readonly TraceArtifact[]): TransportFailure | null {
  for (const item of items) {
    const document = item.requests.find((request) => request.type === 'document')
    const failed = item.requests.find(
      (request) => request.failure !== undefined && NETWORK_ERROR.test(request.failure),
    )
    if (failed !== undefined) {
      const error = NETWORK_ERROR.exec(failed.failure ?? '')?.[0] ?? failed.failure ?? ''
      return { error, where: failed.path }
    }
    for (const line of item.console) {
      const error = NETWORK_ERROR.exec(line)?.[0]
      if (error !== undefined)
        return {
          error,
          where: document?.path ?? item.requests[0]?.path ?? 'the page',
        }
    }
  }
  return null
}

/**
 * A failed 404 whose path carries none of the API prefixes the app's own calls name — the shape a
 * dropped `setupProviders()` leaves: the shared HTTP client has no `baseURL`, so a call written as
 * `/users` reaches the page origin without the `/api` the app's API is mounted under.
 */
interface MissingApiPrefixRequest {
  /** The method as the trace recorded it (`POST`). */
  method: string
  /** The path the request went to (`/users`). */
  path: string
  /** The prefix the app's other API calls carry or its client config names (`/api`). */
  prefix: string
}

/**
 * A request's path when the trace recorded a same-origin path — `/users` — or null for an
 * absolute URL (another origin's path is no evidence about this app's API).
 *
 * @param request - One request a trace recorded.
 * @returns The path without a query or trailing slash, or null.
 */
function sameOriginPath(request: TraceRequest): string | null {
  const raw = String(request.path ?? '').split(/[?#]/)[0] ?? ''
  if (!raw.startsWith('/') || raw === '/') return null
  return raw.replace(/\/+$/, '')
}

/**
 * The API path prefixes the traced requests themselves show.
 *
 * A request whose path ends with another traced request's path carries that other path's prefix
 * (`/api/users` beside `/users` → `/api`) — the trace's own evidence, with no literal in the code.
 *
 * @param items - The traces the note is about.
 * @returns The one-segment prefixes (`/api`), sorted; empty when the traces show none.
 */
function tracedApiPrefixes(items: readonly TraceArtifact[]): string[] {
  const paths = items.flatMap((item) =>
    item.requests.map(sameOriginPath).filter((path): path is string => path !== null),
  )
  const prefixes = new Set<string>()
  for (const longer of paths) {
    for (const shorter of paths) {
      if (longer === shorter || shorter.length < 2 || !longer.endsWith(shorter)) continue
      const prefix = longer.slice(0, longer.length - shorter.length)
      if (/^\/[^/]+$/.test(prefix)) prefixes.add(prefix)
    }
  }
  return [...prefixes].sort()
}

/**
 * The failed 404s whose path carries none of the known API prefixes.
 *
 * Only a run where the prefix is KNOWABLE diagnoses: the caller reads it from the app's client
 * config, and the traces' own requests add what they show ({@link tracedApiPrefixes}). With no
 * known prefix, an unprefixed path is just a path — assuming `/api` is how a correct request gets
 * a wrong note.
 *
 * @param items - The traces the note is about.
 * @param apiPrefixes - Prefixes the app's client config names (`['/api']`), never a literal.
 * @returns One entry per distinct failed 404, in trace order.
 */
function missingApiPrefixRequests(
  items: readonly TraceArtifact[],
  apiPrefixes: readonly string[],
): MissingApiPrefixRequest[] {
  const prefixes = new Set(
    [...apiPrefixes, ...tracedApiPrefixes(items)]
      .map((prefix) => `/${String(prefix).replace(/^\/+|\/+$/g, '')}`)
      .filter((prefix) => prefix !== '/'),
  )
  if (prefixes.size === 0) return []
  const known = [...prefixes]
  const out: MissingApiPrefixRequest[] = []
  const seen = new Set<string>()
  for (const item of items) {
    for (const request of item.requests) {
      // A document navigation is a page route, never an API call — a 404 on one says nothing
      // about the client's base URL.
      if (request.status !== 404 || request.type === 'document' || !failedRequest(request)) continue
      const path = sameOriginPath(request)
      if (path === null) continue
      if (known.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) continue
      const key = `${request.method} ${path}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ method: request.method, path, prefix: known[0] ?? '' })
    }
  }
  return out
}

/**
 * The sentence naming a request that reached the page origin without the app's API prefix.
 *
 * @param request - The failed request and the prefix its sibling calls carry.
 * @returns The sentence the note appends.
 */
function missingApiPrefixSentence(request: MissingApiPrefixRequest): string {
  return (
    `\`${request.method} ${request.path}\` → 404: this request went to \`${request.path}\` ` +
    `without the \`${request.prefix}\` prefix — the HTTP client's base URL is not set: is ` +
    '`setupProviders()` (which runs the HTTP bond setup) called in `main.tsx`?'
  )
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
 * Every row opens with the test's LAST user action before the failing assertion and the requests
 * that action caused ({@link TraceArtifact.lastAction}) — started after it, before the assertion,
 * the app's own API calls first, each with its status and the first 200 characters of its response,
 * then where the page went next. The trace's action clock and each request's `_monotonicTime` are
 * the same clock, so "caused" is the trace's own fact rather than a guess from recording order.
 * xr-molecule-flash-m148 failed 13 then 12 tests on one unnamed cause while every row led with
 * `GET /api/tags → 200` — the Home page's own fetch after the redirect — and filled its answered
 * slots with the PWA's `/workbox-*.js` and its `/icons/*.svg`; the register `POST /api/users`
 * (answered 201, the page still rendering signed-out) never appeared. With no action clock, the
 * row falls back to {@link TraceArtifact.lead}: the page's last answered fetch/xhr.
 *
 * WHICH rows it spends is evidence, not artifact order (xr-molecule-flash-m112 +53:46): a row
 * needs a recorded response, a real failure or a console line ({@link traceRowEvidence}), rows are
 * deduplicated by the test's location, and they are ordered real failure → repeated from an
 * earlier walk → the rest ({@link traceRowTier}). Without that the note spent all five rows on four
 * traces of one `afterEach` line whose every request was `-1`, and left the favorite cause — the
 * one failure that repeated in every walk — in its "… and N more".
 *
 * A run whose every traced page never finished its navigation leads with the browser's own
 * transport error (`net::ERR_CONTENT_DECODING_FAILED` and friends) and the document it hit: nothing
 * rendered, so no row below is app evidence (xr-molecule-flash-m118 +37:09).
 *
 * When a navigation never finished and one of the document's own subresources (a stylesheet, a
 * script, an asset under `/assets/`) never got a response either, that request takes a row and the
 * note says the page was waiting on it. It is not an API call, but on a `page.goto` timeout it is
 * the only request that can explain the timeout — the deployed app was serving the page while one
 * fetch stalled for 27 s (xr-molecule-flash-m135 +34:10). The page shell's incidental requests
 * (`/sw.js`, the manifest, a favicon, a font) stay out, for m125's reason.
 *
 * A 404 whose path lacks the API prefix the app's own calls carry is called out with that prefix
 * ({@link missingApiPrefixRequests}): xr-molecule-flash-m145 posted `/users` to `vite preview`,
 * whose 404 was answered by the static server because the HTTP client's `baseURL` was never set —
 * and the note printed "read the handler this route reaches in your own source", which presumes a
 * request that never reached the API. The prefix is READ (the caller passes what the app's client
 * config names; the traces add what their own requests show) and never assumed to be `/api`.
 *
 * @param items - The traces {@link parseTraceArtifacts} read.
 * @param target - Where the run went — the deployed host, as the note names it.
 * @param earlierFailures - The failing `file:line`s earlier walks of this suite left, so a repeat
 *   is ranked above a one-off. Empty when the caller knows of no earlier walk.
 * @param apiPrefixes - The API path prefixes the app's client config names (`['/api']`), read from
 *   the app by the caller. Empty when the caller could not read one; the traces' own requests may
 *   still supply it. Never a hard-coded literal.
 * @returns The note, or null when no trace held a recorded response, a real failure or a console
 *   error.
 */
export function failureTraceNote(
  items: readonly TraceArtifact[],
  target: string,
  earlierFailures: readonly string[] = [],
  apiPrefixes: readonly string[] = [],
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
  // m145's shape: the app's HTTP client lost its base URL, so every API call reached the page
  // origin without the prefix the app mounts its routes under. The prefix is READ — the caller's
  // client config plus what the traces show — never assumed to be `/api`.
  const missingPrefix = missingApiPrefixRequests(traced, apiPrefixes)
  const failedRequests = traced.flatMap((item) => item.requests.filter(failedRequest))
  const missingKeys = new Set(missingPrefix.map((request) => `${request.method} ${request.path}`))
  const everyFailureLacksPrefix =
    failedRequests.length > 0 &&
    failedRequests.every((request) => {
      const path = sameOriginPath(request)
      return path !== null && missingKeys.has(`${request.method} ${path}`)
    })
  // The route advice goes when every failure is one of these: a request that never reached the
  // API has no handler to read (m145's note sent the run to the PWA and then to the handler).
  const prefixAdvice =
    missingPrefix.length > 0
      ? ` ${missingPrefix.slice(0, 2).map(missingApiPrefixSentence).join(' ')}`
      : ''
  // The document subresources that never finished anywhere in this read — the assets a timed-out
  // navigation was waiting on, when there is no failed request to explain the timeout.
  const stalledAssets = [
    ...new Set(
      traced
        .filter(navigationNeverFinished)
        .flatMap((item) => item.requests.filter(stalledDocumentSubresource))
        .map(requestLabel),
    ),
  ]
  const rows: string[] = []
  for (const [index, item] of traced.entries()) {
    // The test's LAST action before the failing assertion leads the row (m148): the requests it
    // caused and what came back explain a page that never showed the signed-in state, while the
    // page's own last call (a redirect target's `GET /api/tags`) and the shell's files do not.
    const lead = item.lead
    const step = item.lastAction
    // A navigation that never finished has one explanation — the stalled asset it was waiting on
    // (m135) — and that leads the row instead of the action's own document request.
    const stalledNav =
      navigationNeverFinished(item) && item.requests.some(stalledDocumentSubresource)
    const stepRequests = step !== undefined && !stalledNav ? step.requests : []
    const stepKeys = new Set(stepRequests.map(requestKey))
    const isLead = (request: TraceRequest): boolean =>
      lead !== undefined && requestKey(request) === requestKey(lead)
    // The page shell's own requests take no row, in any bucket: an aborted `/sw.js` would
    // otherwise be printed as an "answered" request with no response (m125 +29:33).
    const requests = item.requests.filter(
      (request) =>
        !isStaticAssetRequest(request) && !isLead(request) && !stepKeys.has(requestKey(request)),
    )
    const failed = requests.filter(failedRequest)
    const unanswered = requests.filter(unansweredRequest)
    const answered = requests.filter(
      (request) => !failedRequest(request) && !unansweredRequest(request),
    )
    // A document subresource that never finished, on a trace whose navigation never finished:
    // the page was waiting on it when the test's budget ran out (m135).
    const stalled = navigationNeverFinished(item)
      ? item.requests.filter(stalledDocumentSubresource)
      : []
    let room = MAX_TRACE_NOTE_REQUESTS
    const parts: string[] = []
    if (step !== undefined && !stalledNav) {
      const head = `the test's last action was ${step.api} at ${actionClock(item, step.start)}`
      if (step.requests.length === 0) {
        parts.push(`${head}, and it sent no request`)
      } else {
        const shown = step.requests.slice(0, room)
        room -= shown.length
        // The response body is the point (m148: the register `POST /api/users` answered 201 and
        // the page rendered signed-out anyway) — printed whatever the status.
        parts.push(
          `${head}, and it sent ${shown.map((request) => requestWithBody(request, TRACE_NOTE_LEAD_GOT_CHARS)).join('; ')}`,
        )
      }
      // What the page did next: a navigation shows in the main frame's URL even when the app moved
      // client-side and the network log recorded no document request.
      if (step.pageAfter !== undefined) {
        parts.push(
          step.pageBefore !== undefined && step.pageBefore !== step.pageAfter
            ? `the page then navigated to ${step.pageAfter}`
            : `the page stayed at ${step.pageAfter}`,
        )
      }
    } else if (lead !== undefined) {
      parts.push(leadRequestLine(lead))
      room -= 1
    }
    if (failed.length > 0) {
      const shown = failed.slice(0, room)
      room -= shown.length
      parts.push(`failed: ${shown.map(requestLine).join('; ')}`)
    }
    if (stalled.length > 0 && room > 0) {
      const shown = stalled.slice(0, room)
      room -= shown.length
      parts.push(
        `never finished: ${shown.map(requestLabel).join('; ')} — a document subresource with no ` +
          'response, still in flight when the navigation timed out',
      )
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
      // An action that sent nothing leaves the page's own load as the only requests there are:
      // name them for what they are, not as the action's answer.
      const label =
        step !== undefined && !stalledNav && step.requests.length === 0
          ? 'also answered (started before the action)'
          : 'answered'
      parts.push(`${label}: ${answered.slice(0, room).map(requestLine).join('; ')}`)
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
  // A run whose pages never loaded has one cause, and it is not in the app: every traced failure is
  // a `page.goto` that timed out on a document the browser could not load. The transport error is
  // the first line the executor needs — m118 (+37:09) read 14 goto timeouts as app failures while
  // the trace held `net::ERR_CONTENT_DECODING_FAILED` on every one.
  const transport =
    candidates.length > 0 && candidates.every(navigationNeverFinished)
      ? transportFailure(candidates)
      : null
  const transportLead =
    transport === null
      ? ''
      : `Every failure this run traced is the same browser TRANSPORT failure: \`page.goto\` timed out ` +
        `because the document at ${transport.where} ended \`${transport.error}\` — the page never ` +
        `loaded, so none of these failures is the app's code or a selector. ` +
        (transport.error === 'net::ERR_CONTENT_DECODING_FAILED'
          ? 'A body whose gzip `content-encoding` no longer matches its bytes does this; a ' +
            '`vite preview` over a build must be started with ' +
            '`MOL_E2E_PREVIEW_PLUGIN=0 npx vite preview --host 127.0.0.1 --port 4173 --strictPort`. '
          : '') +
        'Fix the server before the app.\n\n'
  // A navigation that never finished WITH a subresource that never got a response, and no
  // transport error: the page was waiting on the asset when the budget ran out. That is the host
  // or the network serving that file, not the app's state — say it before any app-side reading
  // (xr-molecule-flash-m135 +34:10: three deployed goto timeouts on tests passing locally in
  // 1.2-5.6 s, one 88 KB stylesheet fetch measured at 27 s, and the note said "the cause is in
  // the page").
  const stalledLead =
    transport !== null || stalledAssets.length === 0
      ? ''
      : `Every failure this run traced is a \`page.goto\` that never finished, and the document's ` +
        `own ${stalledAssets.length === 1 ? 'subresource' : 'subresources'} ${stalledAssets.join(', ')} ` +
        `never got a response — the navigation was waiting on ${stalledAssets.length === 1 ? 'it' : 'them'} ` +
        `when the test's budget ran out. That is the host or the network serving the asset, not the ` +
        `app's state or a selector: re-run the same tests once, unchanged, against ${target} before ` +
        `editing anything, and if the stall repeats measure that exact fetch ` +
        `(\`curl -o /dev/null -w '%{time_starttransfer} %{time_total}' <url>\`) before treating it as ` +
        `the app's.\n\n`
  return (
    transportLead +
    stalledLead +
    `The platform read the failing tests' own Playwright traces from the run against ${target} ` +
    `(what each page sent and got — first what the test's last action sent and where the page went ` +
    `next, then the requests that failed, the ones that got no response, and its last answered ` +
    `ones):\n` +
    `${rows.join('\n')}${more}\n` +
    (anyFailed
      ? everyFailureLacksPrefix
        ? ''
        : 'A click that changed nothing is usually one of these requests failing, not the selector: ' +
          'read the handler this route reaches in your own source, and stop `catch`-ing the request of a ' +
          'user action silently — log it.'
      : stalledAssets.length > 0
        ? 'No listed request failed — none got a 4xx/5xx or a network error — but the document did ' +
          'not finish loading because its own subresource never answered. Do not read this as a ' +
          'page-state bug: re-run these tests against the same URL first, and change the app only ' +
          'if the same navigation times out again with no stalled asset in the trace.'
        : 'No listed request failed — none got a 4xx/5xx or a network error — so the cause is in the ' +
          "page, not the API. Start with what the test's last action sent (the first line of each " +
          'row) and what the page did next: a request that answered (2xx included) while the page ' +
          'still did not show the state the assertion waited on is the fact to read — its status ' +
          'and response body, not the selector. If the request is not the one the test meant — an ' +
          'unfollow sent where the test clicked follow — the state the action read was stale ' +
          'before it.') +
    prefixAdvice +
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
 * Where an option of the command's Playwright run belongs, or null when the shell parse cannot
 * place the run or its arguments.
 *
 * The flag has to land INSIDE the Playwright step, in the run's own argument list — never at the
 * end of the whole command: a run Flash sends almost every time ends `… 2>&1 | tail -60` or
 * `… > log 2>&1; echo "exit=$?"; grep -c "" log`, and a flag appended after those is an operand of
 * `tail`/`grep` — GNU `tail` refuses it outright (`tail: option used in invalid context -- 6`) and
 * Playwright never sees it (xr-molecule-flash-m102 +07:40 → +07:53). A step inside a subshell
 * (`( … playwright test … 2>&1)`) is the same rule the other way: a flag written after the `)`
 * closes the group before the shell has read the flag at all
 * (`sh: Syntax error: word unexpected`, xr-molecule-flash-m129 +34:29).
 *
 * The step and the offset are the package's own shell parse's answers
 * ({@link locatedCommandSegments}, {@link statementArgumentEnd}): the parse says which STATEMENT
 * runs `playwright test` in command position, and where that statement's own arguments end — before
 * a trailing redirection and before any group closer. Never a search for the re-joined text: that
 * text drops grouping braces and single-space-joins the words, so a command carrying a heredoc body
 * or a `"quoted"` program found nothing at all and the flag was not added.
 *
 * @param command - The shell command.
 * @returns The offset to write the flag at, or null.
 */
function playwrightOptionOffset(command: string): number | null {
  for (const located of locatedCommandSegments(command)) {
    const segment = located.segment
    if (!segment || located.programOffset === null) continue
    if (!/^playwright\s+test\b/.test(segment.text)) continue
    return statementArgumentEnd(command, located.start, located.end)
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
  // The flag goes into the Playwright step's own argument list, at the end of it — an option of
  // the run itself, whatever the command opens with, whatever pipes or redirects its output, and
  // before the `)` that may close a subshell around it. Appended at the end of the whole command
  // it belonged to the LAST pipeline stage instead (`tail`, `grep`), which either refused it or
  // silently ran without it (xr-molecule-flash-m102 +07:40 → +07:53); written after a subshell's
  // `)` it was a shell syntax error (xr-molecule-flash-m129 +34:29). The step's shape is untouched
  // otherwise, so the rewrites that run on this command afterwards still see what they expect: a
  // trailing `| tail -60` is still trailing and is still dropped
  // (`streamingBackgroundCommand`).
  const at = playwrightOptionOffset(args.command)
  if (at === null) return unchanged
  return {
    command: `${args.command.slice(0, at)} ${DIAGNOSIS_TRACE_FLAG}${args.command.slice(at)}`,
    change:
      `Added \`${DIAGNOSIS_TRACE_FLAG}\`: the suite's config records no trace for a failure` +
      `${/trace:/.test(config) ? '' : ' (it sets none)'}, and this diagnosis run's failures are ` +
      'what the platform reads the network log from. The proof run keeps the suite’s own settings.',
  }
}
