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
  /**
   * Whether the request carried an `Authorization` header at all. Its VALUE is never recorded.
   *
   * A 401 cannot be read without this: the API's own body said
   * `{"errors":{"token":["is missing"]}}` while the note told the run to read the API handler,
   * when the header's absence proved the CLIENT never attached the token
   * (xr-molecule-flash-m148 +29:18). A header present moves the answer to the server: the API
   * refused a token it was sent.
   */
  sentAuthorization?: boolean
  /**
   * The scheme WORD of an `Authorization` header (`Bearer`, `Token`), or undefined when there is
   * no header or its first word does not parse as a scheme (a value pasted without one is a
   * credential, and is never copied here).
   */
  authorization?: string
  /**
   * Whether the request carried a `Cookie` header — never the cookies themselves. An app that
   * signs in with a session cookie has no `Authorization` header by design, so this tells a
   * credential-less request from one whose credential is a cookie.
   */
  sentCookie?: boolean
  /**
   * The trace member this request came from — the browser context Playwright numbered (`1`, `3`).
   * A test that opens a second browser context writes one trace member per context, and a test's
   * request is only evidence about the page it was made on (xr-molecule-flash-m160).
   */
  context?: string
  /** The page the request was made on, as the HAR entry's `pageref` records it. */
  pageId?: string
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
  /** The browser context the action was recorded in (`1`, `3`), when the trace names one. */
  context?: string
  /** The page the action ran on, from the frame snapshot the trace paired with it. */
  pageId?: string
  /** The frame the action ran in, from the same snapshot. */
  frameId?: string
  /**
   * The selector a `fill`/`type`/`selectOption` acted on (`textarea[name="bio"]`), from the
   * trace's own params. Kept so the note can compare what the test typed with what the page
   * submitted (m173: the field it typed into was sent empty).
   */
  selector?: string
  /**
   * The value a `fill`/`type`/`selectOption` typed or chose, from the trace's own params —
   * absent when the action carried none (a `selectOption` by label only).
   */
  value?: string
}

/**
 * What a browser context OTHER than the failing page's recorded — the second context a
 * two-context test opens for its own setup.
 *
 * Its actions and requests belong to a different page: a request it sent is not the failing
 * action's effect, and the URL it left the page on is not where the assertion's page went
 * (xr-molecule-flash-m160: the helper context created an article in an editor page while the
 * primary page moved to the profile the assertion then failed on, and the note called the
 * editor page the failing page).
 */
export interface TraceContextEvidence {
  /** The trace member's context id (`3`). */
  context: string
  /**
   * The app requests that context made, bounded — failures first, then the answered ones — each
   * labelled by the note as set-up work rather than the failing page's.
   */
  requests: TraceRequest[]
}

/**
 * The text a failing assertion waited for that a same-page API response carried and the page never
 * rendered.
 *
 * The assertion's own error names the text (a `has-text(…)` / `getByText(…)` / `toContainText(…)`
 * argument), and the trace's network log holds the response that contained it. That pair is the
 * whole diagnosis: the API returned the value and the page dropped it before rendering, so the cut
 * is in the component that maps the response onto the list — not in the API, the route or the
 * selector. xr-molecule-flash-m169 (+13:09) spent its fix rounds on the wrong component and on a
 * markup detail while `GET /api/tags` was returning the missing "trending" and `PopularTags`
 * sliced the response to its first 20 entries (the m99 top-N class, in the frontend).
 */
export interface TraceMissingText {
  /** The text the assertion waited for (`trending`). */
  text: string
  /** The method of the response that carried it (`GET`). */
  method: string
  /** The path of the response that carried it (`/api/tags`). */
  path: string
}

/**
 * A write the trace recorded answering a boolean field, and a LATER GET of the same resource
 * answering the opposite for that field.
 *
 * This is the pair that reads as a frontend race and is not one: xr-molecule-flash-m181's follow
 * test sent `POST /api/profiles/:username/follow` and the API answered
 * `{"profile":{…,"following":true}}`, then a `GET /api/profiles/:username` answered
 * `{"profile":{…,"following":false}}` — the READ route never saw the viewer, so it hydrated
 * `following` from nobody. The run rewrote the profile component twice, the API client once, and
 * added optimistic state before anyone read the route's middleware; the write itself was fine.
 */
export interface TraceReadContradiction {
  /** The boolean field both answered (`following`, `favorited`). */
  field: string
  /** What the write's response said it is. */
  writeValue: boolean
  /** What the later read's response said it is. */
  readValue: boolean
  /** The write that answered it (`POST /api/profiles/x/follow`). */
  write: TraceRequest
  /** The later GET of the same resource (`GET /api/profiles/x`). */
  read: TraceRequest
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
   * The test's LAST user action before the failing assertion ON THE PAGE THE ASSERTION RAN ON, and
   * the requests it caused — what the row leads with, when the trace carries the action times
   * ({@link TraceLastAction}).
   *
   * A test that opens a second browser context writes one trace member per context, and the
   * archive does not order them by time: the last action of the concatenation may belong to the
   * helper's page while the assertion failed on another (xr-molecule-flash-m160). The action is
   * therefore the failing page's own, and its `pageAfter` is that page's last frame snapshot.
   *
   * Absent on traces read before this field existed, on traces whose network entries recorded no
   * clock, and on a trace with more than one used context whose failing page cannot be identified
   * ({@link TraceArtifact.unattributed}) — the row then falls back to {@link lead}, or to no
   * causal claim at all.
   */
  lastAction?: TraceLastAction
  /**
   * The page's own actions in the order the trace recorded them, bounded — what a test that ran
   * out of a per-test budget spends its time on. A test that repeats one action prints it once per
   * repeat, so the gap between two starts is one repeat's measured cost. Scoped to the page the
   * failing assertion ran on; a second browser context's actions are not this test's page.
   */
  actions: TraceAction[]
  /**
   * True when the trace held more than one browser context and none of them could be tied to the
   * failing assertion's page. The note then makes no causal claim — no "the test's last action",
   * no "the page stayed at …" — rather than attributing one context's click and URL to another
   * context's assertion (xr-molecule-flash-m160).
   */
  unattributed?: true
  /**
   * The browser contexts the test opened BESIDES the failing assertion's page, with the app
   * requests each made. Kept apart so the note can name them as set-up work instead of printing
   * their requests as the failing action's effects (xr-molecule-flash-m160).
   *
   * Absent when the trace recorded one context only, when every other context made no request,
   * and on traces read before this field existed.
   */
  otherContexts?: TraceContextEvidence[]
  /**
   * The text the failing assertion waited for and a same-page API response carried, when the trace
   * recorded both. The note leads with it: the value reached the browser and the page did not
   * render it, so the next read is where that response is mapped — never the API or the selector
   * (xr-molecule-flash-m169).
   *
   * Absent when the assertion waited for no text (a text-free selector, a strict-mode violation),
   * when no page-scoped `fetch`/`xhr` answered 2xx/3xx with the text in its body, and on traces
   * read before this field existed.
   */
  missingText?: TraceMissingText
  /**
   * A write's answer a later GET of the same resource contradicted — the read route does not see
   * the viewer (xr-molecule-flash-m181's `following`). The note leads with it and sends the run at
   * the route's middleware, not the page's state handling.
   *
   * Absent when no write and later read in the trace answered the same boolean field differently,
   * and on traces read before this field existed.
   */
  readContradiction?: TraceReadContradiction
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

/**
 * How much of a websocket's frames the trace read keeps. Longer than {@link MAX_TRACED_BODY_CHARS}
 * because a frame read back to its own message still has the message, the module id and the
 * location to carry — Vite's transform error alone is a sentence longer than the plain body cap,
 * and the note prints its first 120–200 characters anyway (xr-molecule-flash-m157).
 */
const MAX_TRACED_WEBSOCKET_CHARS = 600

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
 * A trace.zip holds ONE trace member per browser context the test used (beside the runner's own
 * `test.trace`), and the archive's member order is not the test's chronology. Each member is read
 * as its own context: actions and requests keep their context id, requests and frame snapshots
 * keep the pageId Playwright records, and the failing assertion's page — the page its own step id
 * ran on — decides which actions, snapshots and requests become the test's row. What the test's
 * other browser contexts recorded is reported apart, as `otherContexts` (xr-molecule-flash-m160).
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
const MAX_WS = ${MAX_TRACED_WEBSOCKET_CHARS}
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

// A fill/type/selectOption records what the test typed; the note compares it with the body the
// page submitted (m173: the Settings form sent bio:"" although the test had just typed a value).
// Only those actions keep it, so a click's selector does not ride every row.
const FILLING_ACTION = /\\.(?:fill|type|pressSequentially|selectOption)$/

// The text a failing assertion waited for, named by its own error: a \`has-text(…)\` CSS
// pseudo-class, a \`getByText(…)\` locator, or a \`toContainText(…)\` expectation. A strict-mode
// violation is not this shape — two elements DID match the text — and neither is a wait on a
// selector with no text argument. The ANSI colouring Playwright leaves in the message is dropped
// before the read, or the quotes it wraps around a locator would never parse.
function waitedTextOf(message) {
  if (!message) return null
  const text = String(message).replace(/\\u001b\\[[0-9;]*m/g, '')
  if (text.indexOf('strict mode violation') !== -1) return null
  const quoted = function (pattern) {
    const m = pattern.exec(text)
    return m === null ? null : m[2]
  }
  const hasText = quoted(/has-text\\(\\s*(['"])((?:(?!\\1).)*)\\1/)
  if (hasText !== null) return hasText
  const byText = quoted(/getByText\\(\\s*(['"])((?:(?!\\1).)*)\\1/)
  if (byText !== null) return byText
  if (text.indexOf('toContainText') === -1) return null
  return quoted(/Expected(?: string)?:\\s*(["'])((?:(?!\\1).)*)\\1/)
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

// A websocket's content is a JSONL stream of frames (\`{type, time, opcode, data}\`), and the data
// is the page's own message. The envelope is ~35 characters on every frame, so cutting the raw
// stream lands inside it and never reaches the text that names a cause: xr-molecule-flash-m157's
// Vite HMR error frame was \`{"type":"receive","time":…,"opcode":1,"data":"{\\"type\\":\\"error\\",
// \\"err\\":{\\"message\\":\\"Cannot import non-asset file /styles.css which is inside /public …\` and
// every note stopped at \`{"type":"error","err":{"message":"Cannot…\`. Read the frames and print
// what they carry — a Vite error's message, id and loc, or the JSON a frame sends — so the cut
// lands in the message itself.
function websocketText(raw) {
  const errors = []
  const others = []
  for (const line of String(raw).split('\\n')) {
    if (!line.trim()) continue
    let frame
    try { frame = JSON.parse(line) } catch (e) { continue }
    if (!frame || typeof frame.data !== 'string') continue
    let data = frame.data
    try { data = JSON.parse(frame.data) } catch (e) { /* a text frame: print the data as it is */ }
    const err = data && typeof data === 'object' && data.type === 'error' ? data.err : null
    if (err && typeof err.message === 'string') {
      let text = 'vite error: ' + err.message
      if (err.id !== undefined && err.id !== null && err.id !== '')
        text += ' (id: ' + String(err.id) + ')'
      const loc = err.loc
      if (loc && typeof loc === 'object') {
        const file = typeof loc.file === 'string' && loc.file ? loc.file : String(err.id || '')
        text += ' (loc: ' + file +
          (typeof loc.line === 'number' ? ':' + loc.line + ':' + (typeof loc.column === 'number' ? loc.column : 0) : '') +
          ')'
      } else if (typeof loc === 'string' && loc) text += ' (loc: ' + loc + ')'
      errors.push(text)
    } else if (typeof data === 'string') others.push(data)
    else others.push(JSON.stringify(data))
  }
  return errors.concat(others).join(' ')
}

// What a request got back, as the note reads it: a websocket's frames are read as the messages
// they carry (m157), every other request's body as stored.
function gotText(buf, entries, r) {
  if (r.type !== 'websocket') return bodyText(buf, entries, r.content, MAX_BODY)
  const raw = bodyText(buf, entries, r.content, 8000)
  return (websocketText(raw) || raw).slice(0, MAX_WS)
}

// The boolean-valued fields a response body carries, however deeply its entity is wrapped
// ({"profile":{…,"following":true}}) — what a read of the same field can contradict.
// A body that does not parse (the trace read bounds what it keeps) names no field.
function booleanFieldsOf(text) {
  let parsed
  try { parsed = JSON.parse(text) } catch (e) { return null }
  const out = {}
  function walk(value, depth) {
    if (depth > 4 || value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) walk(value[i], depth + 1)
      return
    }
    for (const key of Object.keys(value)) {
      const item = value[key]
      if (typeof item === 'boolean') {
        if (!Object.prototype.hasOwnProperty.call(out, key)) out[key] = item
      } else walk(item, depth + 1)
    }
  }
  walk(parsed, 0)
  return Object.keys(out).length > 0 ? out : null
}

// The resource a write acts on: its last path segment is the action (follow, favorite), so
// /api/profiles/alice/follow is the resource a GET /api/profiles/alice reads.
function resourceBaseOf(path) {
  const clean = String(path).split(/[?#]/)[0]
  const parts = clean.split('/').filter(function (segment) { return segment !== '' })
  if (parts.length === 0) return clean
  parts.pop()
  return '/' + parts.join('/')
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

// A trace.zip holds ONE trace member per browser context the test used (1-trace.trace,
// 3-trace.trace, …) beside the test runner's own test.trace. The archive ORDER of those members
// is not the test's chronology: xr-molecule-flash-m160's helper context was written after the
// primary page's, so the concatenation's last user action was the helper's editor click and the
// last frame snapshot was /editor, while the assertion had failed on the primary page at
// /profile/:username. Each member is read as its own context, and everything below attributes a
// request, an action and a frame snapshot to the page and context that recorded it.
function traceContextOf(name) {
  if (name === 'test.trace') return 'test'
  if (name === 'trace.trace') return '0'
  const m = /^(.+)-trace\\.trace$/.exec(name)
  return m === null ? null : m[1]
}
function networkContextOf(name) {
  if (name === 'trace.network') return '0'
  const m = /^(.+)-trace\\.network$/.exec(name)
  return m === null ? null : m[1]
}

for (const one of found.slice(0, MAX_TRACES)) {
  let buf
  try { buf = fs.readFileSync(one.file) } catch (e) { continue }
  let entries
  try { entries = zipEntries(buf) } catch (e) { continue }
  const runner = []
  const contexts = []
  const contextById = {}
  function contextFor(id) {
    let ctx = contextById[id]
    if (!ctx) {
      ctx = { id: id, trace: [], network: [], requests: [], actions: [], frames: [] }
      contextById[id] = ctx
      contexts.push(ctx)
    }
    return ctx
  }
  for (const entry of entries) {
    const traceContext = traceContextOf(entry.name)
    if (traceContext === 'test') {
      runner.push.apply(runner, ndjson(zipData(buf, entry)))
      continue
    }
    if (traceContext !== null) {
      const ctx = contextFor(traceContext)
      ctx.trace.push.apply(ctx.trace, ndjson(zipData(buf, entry)))
      continue
    }
    const networkContext = networkContextOf(entry.name)
    if (networkContext !== null) {
      const ctx = contextFor(networkContext)
      ctx.network.push.apply(ctx.network, ndjson(zipData(buf, entry)))
    }
  }
  const requestsAll = []
  for (const ctx of contexts) {
    for (const line of ctx.network) {
      if (!line || line.type !== 'resource-snapshot') continue
      const snapshot = line.snapshot || {}
      const request = snapshot.request || {}
      if (!request.url || !request.method) continue
      const response = snapshot.response || {}
      const type = String(snapshot._resourceType || '')
      if (!origin) origin = type === 'document' ? originOf(String(request.url)) : ''
    // What the request carried for CREDENTIALS — never the secret itself. A 401 on the app's own
    // API cannot be read without this: m148's favorite POST answered 401 with no Authorization
    // header at all, so the client never attached the token, and the note sent the run to the
    // API handler instead (xr-molecule-flash-m148 +29:18). Presence is recorded as a boolean and
    // only the scheme WORD (\`Bearer\`, \`Token\`) is kept; the value is a live credential and never
    // leaves the trace. A first word that does not parse as a scheme (\`Authorization: <raw jwt>\`)
    // is recorded as presence only, so a pasted token can never ride along as a "scheme".
    const headerList = Array.isArray(request.headers) ? request.headers : []
    const authHeader = headerList.find(function (h) {
      return h && typeof h.name === 'string' && /^authorization$/i.test(h.name)
    })
    const authValue =
      authHeader && typeof authHeader.value === 'string' ? String(authHeader.value).trim() : ''
    const authSpace = authValue.search(/\\s/)
    const authWord = authSpace > 0 ? authValue.slice(0, authSpace) : ''
    const authScheme = /^[A-Za-z][A-Za-z0-9._~+/-]{0,23}$/.test(authWord) ? authWord : undefined
      const sentCookie = headerList.some(function (h) {
        return h && typeof h.name === 'string' && /^cookie$/i.test(h.name)
      })
      const parsed = {
        method: String(request.method).toUpperCase(),
        path: String(request.url).slice(0, MAX_URL),
        status: Number(response.status) || 0,
        failure: typeof response._failureText === 'string' ? response._failureText : undefined,
        type: type,
        sentAuthorization: authHeader !== undefined,
        authorization: authScheme,
        sentCookie: sentCookie,
        // The HAR entry carries the monotonic clock the trace's action entries use, so a request
        // can be attributed to the action that caused it (see \`lastAction\` below).
        startedAt: typeof snapshot._monotonicTime === 'number' ? snapshot._monotonicTime : undefined,
        // The context member and the page ref the HAR entry records: a request made by the test's
        // helper context is not the failing page's, however late the archive wrote it (m160).
        context: ctx.id,
        pageId: typeof snapshot.pageref === 'string' ? snapshot.pageref : undefined,
        postData: request.postData,
        content: response.content,
      }
      ctx.requests.push(parsed)
      requestsAll.push(parsed)
    }
  }
  if (!origin) {
    const first = requestsAll.find(function (r) { return r.type === 'document' }) || requestsAll[0]
    origin = first ? originOf(first.path) : ''
  }
  for (const r of requestsAll) r.path = pathOf(r.path).slice(0, MAX_URL)
  // The page's own actions, timed. before/after pair on the call id, and only the LIBRARY
  // traces carry a class and a method (Frame.goto, Locator.fill); the test runner's own
  // trace times its hooks and fixtures with class Test, which is not a page action. Each action
  // keeps the context it came from and the page/frame its frame snapshot names, so the failing
  // assertion's own page can be selected below (m160).
  const actionsAll = []
  const framesAll = []
  for (const ctx of contexts) {
    const ended = {}
    for (const entry of ctx.trace) {
      if (entry && entry.type === 'after' && typeof entry.callId === 'string' && typeof entry.endTime === 'number')
        ended[entry.callId] = entry.endTime
    }
    const pageByCall = {}
    for (const entry of ctx.trace) {
      if (!entry || entry.type !== 'frame-snapshot') continue
      const snap = entry.snapshot || {}
      if (typeof snap.callId === 'string' && typeof snap.pageId === 'string' && pageByCall[snap.callId] === undefined)
        pageByCall[snap.callId] = snap.pageId
      if (snap.isMainFrame === false) continue
      if (typeof snap.frameUrl !== 'string' || typeof snap.timestamp !== 'number') continue
      ctx.frames.push({
        url: pathOf(snap.frameUrl).slice(0, MAX_URL),
        at: snap.timestamp,
        context: ctx.id,
        pageId: typeof snap.pageId === 'string' ? snap.pageId : undefined,
        frameId: typeof snap.frameId === 'string' ? snap.frameId : undefined,
      })
    }
    for (const entry of ctx.trace) {
      if (!entry || entry.type !== 'before') continue
      if (typeof entry.class !== 'string' || typeof entry.method !== 'string') continue
      if (entry.class === 'Test' || typeof entry.startTime !== 'number') continue
      const api = entry.class + '.' + entry.method
      const params = entry.params && typeof entry.params === 'object' ? entry.params : {}
      const filling = FILLING_ACTION.test(api)
      const action = {
        api: api,
        start: entry.startTime,
        end: typeof ended[entry.callId] === 'number' ? ended[entry.callId] : null,
        context: ctx.id,
        pageId: typeof entry.callId === 'string' ? pageByCall[entry.callId] : undefined,
        frameId: undefined,
        stepId: typeof entry.stepId === 'string' ? entry.stepId : undefined,
        ...(filling && typeof params.selector === 'string' ? { selector: params.selector } : {}),
        ...(filling && typeof params.value === 'string' ? { value: params.value } : {}),
      }
      if (action.pageId !== undefined) {
        for (const frame of ctx.frames) {
          if (frame.pageId !== action.pageId) continue
          action.frameId = frame.frameId
          break
        }
      }
      ctx.actions.push(action)
    }
    // Monotonic time, not archive order: two contexts interleave in the zip, and one context's
    // own actions still have to be read in the order the page performed them.
    ctx.actions.sort(function (a, b) { return a.start - b.start })
    ctx.frames.sort(function (a, b) { return a.at - b.at })
    for (const action of ctx.actions) actionsAll.push(action)
    for (const frame of ctx.frames) framesAll.push(frame)
  }
  // The step the runner itself reports as failed, and the location it names. The runner writes
  // the error on the failed step's \`after\` entry; taking the LAST step with a spec stack instead
  // named the afterEach's \`context.close()\` (m160's social.spec.ts:13) rather than the strict-mode
  // assertion at :90. The first error is the test's own failure — an afterEach that also fails
  // runs after it.
  let failedStepId = null
  let failedStep = null
  let failedEnd = null
  let failedError = ''
  let failureSpec = null
  let failureLine = 0
  let lastSpec = null
  let lastSpecLine = 0
  for (const entry of runner) {
    if (!entry) continue
    if (entry.type === 'after' && entry.error && typeof entry.callId === 'string' && failedStepId === null) {
      failedStepId = entry.callId
      failedEnd = typeof entry.endTime === 'number' ? entry.endTime : null
      failedError = messageOf(entry.error) || ''
    }
  }
  // The fallback location — the last step that names a spec — is read from every member, runner
  // and library alike: a trace written without a test.trace (a synthetic fixture, an older
  // Playwright) still names its spec on the library entries, and dropping that would leave the
  // row placeless.
  for (const traceEntries of [runner].concat(contexts.map(function (ctx) { return ctx.trace }))) {
    for (const entry of traceEntries) {
      if (!entry || entry.type !== 'before' || !Array.isArray(entry.stack)) continue
      for (const frame of entry.stack) {
        if (typeof frame.file !== 'string' || !/\\.(?:spec|test)\\.[cm]?[jt]sx?$/.test(frame.file)) continue
        lastSpec = specPathOf(frame.file)
        lastSpecLine = Number(frame.line) || 0
        break
      }
    }
  }
  if (failedStepId !== null) {
    for (const entry of runner) {
      if (!entry || entry.type !== 'before' || entry.callId !== failedStepId) continue
      failedStep = entry
      if (!Array.isArray(entry.stack)) break
      for (const frame of entry.stack) {
        if (typeof frame.file !== 'string' || !/\\.(?:spec|test)\\.[cm]?[jt]sx?$/.test(frame.file)) continue
        failureSpec = specPathOf(frame.file)
        failureLine = Number(frame.line) || 0
        break
      }
      break
    }
  }
  const spec = failureSpec !== null ? failureSpec : lastSpec
  const line = failureSpec !== null ? failureLine : lastSpecLine
  // The page the failing step ran on. The library trace records the runner's step id on every
  // action it performed for that step, and each action's frame snapshot carries its pageId — so
  // the failing assertion's page is the step's own page, never the last page any context left
  // behind (m160: the helper context's /editor won because its member came later in the zip).
  let failedPageIds = []
  if (failedStepId !== null) {
    for (const action of actionsAll) {
      if (action.stepId !== failedStepId || action.pageId === undefined) continue
      if (failedPageIds.indexOf(action.pageId) === -1) failedPageIds.push(action.pageId)
    }
    // A step with no library action of its own (a plain \`page.waitForTimeout\`, a runner-only
    // step) falls back to the actions that ran inside its own interval.
    if (failedPageIds.length === 0 && failedStep !== null && typeof failedStep.startTime === 'number') {
      for (const action of actionsAll) {
        if (action.pageId === undefined) continue
        if (action.start < failedStep.startTime - 1) continue
        if (failedEnd !== null && action.start > failedEnd + 1) continue
        if (failedPageIds.indexOf(action.pageId) === -1) failedPageIds.push(action.pageId)
      }
    }
  }
  let failedPage = failedPageIds.length === 1 ? failedPageIds[0] : null
  // A member with no action, request or frame is not a context the test used: Playwright writes
  // a trace entry for a context it opened and closed without a page, and counting that as a
  // second context would make every ordinary trace unattributable.
  const usedContexts = contexts.filter(function (ctx) {
    return ctx.actions.length > 0 || ctx.requests.length > 0 || ctx.frames.length > 0
  })
  // One context, one page: nothing to attribute, and no second context to merge.
  if (failedPage === null && usedContexts.length === 1) {
    const pages = []
    for (const frame of framesAll) {
      if (frame.pageId !== undefined && pages.indexOf(frame.pageId) === -1) pages.push(frame.pageId)
    }
    if (pages.length === 1) failedPage = pages[0]
  }
  let failedContext = null
  if (failedPage !== null) {
    for (const frame of framesAll) {
      if (frame.pageId !== failedPage) continue
      failedContext = frame.context
      break
    }
    if (failedContext === null) {
      for (const action of actionsAll) {
        if (action.pageId !== failedPage) continue
        failedContext = action.context
        break
      }
    }
    if (failedContext === null) {
      for (const r of requestsAll) {
        if (r.pageId !== failedPage) continue
        failedContext = r.context
        break
      }
    }
  }
  // Two used contexts and no identified page: the note makes no causal claim rather than
  // merging them (m160's rule). With one used context everything in it belongs to the test's page.
  const unattributed = failedPage === null && usedContexts.length > 1
  const actions = failedPage === null ? actionsAll : actionsAll.filter(function (a) { return a.pageId === failedPage })
  const frames = failedPage === null ? (usedContexts.length === 1 ? framesAll : []) : framesAll.filter(function (f) { return f.pageId === failedPage })
  let requests = failedPage === null ? requestsAll : requestsAll.filter(function (r) { return r.pageId === failedPage })
  // A trace whose HAR entries carry no page ref: the failing context's own requests are still
  // its page's, because a context in a test with one page has nowhere else to send them.
  if (failedPage !== null && requests.length === 0 && failedContext !== null)
    requests = requestsAll.filter(function (r) { return r.context === failedContext })
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
  // With two contexts and no identified page there is no causal claim to make: the last action
  // of the concatenation could belong to the helper's page (m160).
  const lastAction = unattributed || userActions.length === 0 ? null : userActions[userActions.length - 1]
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
    const got = gotText(buf, entries, r)
    if (sent) r.sent = sent
    if (got) r.got = got
  }
  for (const r of requests) {
    if (r.status < 400 || r.status >= 500) continue
    if (/^https?:/i.test(r.path)) continue
    const sent = bodyText(buf, entries, r.postData, MAX_BODY)
    const got = gotText(buf, entries, r)
    if (sent) r.sent = sent
    if (got) r.got = got
  }
  // The text the failing assertion waited for, and a response the SAME page received that carried
  // it (m169). The assertion's own error names the text; the network log says whether it ever
  // reached the browser. Only an answered fetch/xhr can say the API returned it — a 4xx body is an
  // error message, not data. The most focused response wins (smallest body): an articles list also
  // carries tag names in its \`tagList\`, while the tags response is the collection whose membership
  // the assertion tests.
  const waitedText = waitedTextOf(failedError)
  let missingText = null
  if (waitedText !== null && !unattributed) {
    let best = null
    for (const r of requests) {
      if (r.type !== 'fetch' && r.type !== 'xhr') continue
      if (r.status < 200 || r.status >= 400) continue
      const got = gotText(buf, entries, r)
      if (!got || got.indexOf(waitedText) === -1) continue
      if (best === null || got.length < best.got.length) best = { request: r, got: got }
    }
    if (best !== null)
      missingText = { text: waitedText, method: best.request.method, path: best.request.path }
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
      // The trace's own clock, so the note can tell a request the navigation was waiting on from
      // one that was already pending before it started (m135/m153).
      ...(typeof r.startedAt === 'number' ? { startedAt: r.startedAt } : {}),
      ...(r.sentAuthorization ? { sentAuthorization: true } : {}),
      ...(r.authorization ? { authorization: r.authorization } : {}),
      ...(r.sentCookie ? { sentCookie: true } : {}),
      ...(r.context ? { context: r.context } : {}),
      ...(r.pageId ? { pageId: r.pageId } : {}),
    }
  }
  // The failing page's own frame snapshots, timed: what the page showed when the action ran, and
  // where it ended up. They are the snapshots of the assertion's page only — another context's
  // editor page is not where this page went (m160) — and they are ordered by the trace's clock.
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
  // "also answered" bucket, not to a lead that would hide it. With two contexts and no identified
  // page there is no causal lead at all (m160).
  if (!unattributed && lead === null && lastAction === null) {
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
      const got = gotText(buf, entries, r)
      lead = wire(r)
      if (sent) lead.sent = sent
      if (got) lead.got = got
    }
  }
  // A write that answered a boolean field and a LATER GET of the same resource that answered the
  // opposite — the read route never saw the viewer (m181's follow: the write answered
  // {"following":true}, the next profile GET answered false). Both bodies are the trace's own
  // facts; the note leads with them and sends the run to the route's middleware, not the page.
  function readContradictionOf() {
    const writes = []
    for (let i = 0; i < requests.length; i++) {
      const r = requests[i]
      if (!/^(?:POST|PUT|PATCH|DELETE)$/.test(r.method)) continue
      if (r.status < 200 || r.status >= 300) continue
      if (r.type !== 'fetch' && r.type !== 'xhr') continue
      writes.push({ index: i, request: r })
    }
    for (let w = 0; w < writes.length; w++) {
      const write = writes[w].request
      const writeGot = gotText(buf, entries, write)
      const writeFields = writeGot ? booleanFieldsOf(writeGot) : null
      if (!writeFields) continue
      const base = resourceBaseOf(write.path)
      let read = null
      let readFields = null
      for (let j = writes[w].index + 1; j < requests.length; j++) {
        const candidate = requests[j]
        if (candidate.method !== 'GET') continue
        if (candidate.status < 200 || candidate.status >= 300) continue
        if (candidate.type !== 'fetch' && candidate.type !== 'xhr') continue
        // The same page only: another context's read is not this page's answer.
        if (candidate.pageId !== undefined && write.pageId !== undefined &&
          candidate.pageId !== write.pageId) continue
        if (candidate.context !== undefined && write.context !== undefined &&
          candidate.context !== write.context) continue
        // LATER, on the trace's own clock when it recorded one.
        if (typeof candidate.startedAt === 'number' && typeof write.startedAt === 'number' &&
          candidate.startedAt <= write.startedAt) continue
        if (String(candidate.path).split(/[?#]/)[0] !== base) continue
        const got = gotText(buf, entries, candidate)
        const fields = got ? booleanFieldsOf(got) : null
        if (!fields) continue
        read = candidate
        readFields = fields
        break
      }
      if (read === null || readFields === null) continue
      for (const key of Object.keys(writeFields)) {
        if (!Object.prototype.hasOwnProperty.call(readFields, key)) continue
        if (readFields[key] === writeFields[key]) continue
        write.got = writeGot
        read.got = gotText(buf, entries, read)
        return {
          field: key,
          writeValue: writeFields[key],
          readValue: readFields[key],
          write: wire(write),
          read: wire(read),
        }
      }
    }
    return null
  }
  const readContradiction = readContradictionOf()
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
  // The console lines of the page the assertion ran on; with no identified page, of every context.
  const consoleTraces =
    failedContext === null
      ? contexts.map(function (ctx) { return ctx.trace })
      : contexts.filter(function (ctx) { return ctx.id === failedContext }).map(function (ctx) { return ctx.trace })
  for (const traceEntries of consoleTraces) {
    for (const entry of traceEntries) {
      if (!entry) continue
      if (entry.type === 'console' && typeof entry.text === 'string') {
        if (entry.messageType === 'error') consoleErrors.push(entry.text)
        else if (consoleSignal(entry.text)) consoleSignals.push(entry.text)
        else if (entry.messageType === 'warning' || entry.messageType === 'warn')
          consoleWarnings.push(entry.text)
      } else if (entry.type === 'event' && entry.method === 'pageError') {
        const message = messageOf(entry.params)
        if (message) consoleErrors.push(message)
      }
    }
  }
  // Evidence from the OTHER browser contexts the test opened — kept apart from the failing page's
  // requests and labelled as set-up work, never as the failing action's effect (m160).
  const otherContexts = []
  if (failedContext !== null) {
    for (const ctx of usedContexts) {
      if (ctx.id === failedContext) continue
      const picked = []
      for (const r of ctx.requests) {
        if (shellRequest(r)) continue
        const sent = bodyText(buf, entries, r.postData, MAX_BODY)
        const got = gotText(buf, entries, r)
        if (sent) r.sent = sent
        if (got) r.got = got
        picked.push(r)
      }
      if (picked.length === 0 && ctx.actions.length === 0) continue
      // Failures first, then by the trace's clock: a 401 from the helper context is worth naming
      // even when its later answered calls would fill the bound.
      picked.sort(function (a, b) {
        const left = failedRequest(a) ? 0 : 1
        const right = failedRequest(b) ? 0 : 1
        return left === right ? (a.startedAt || 0) - (b.startedAt || 0) : left - right
      })
      otherContexts.push({ context: ctx.id, requests: picked.slice(0, MAX_NOTE).map(wire) })
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
    ...(missingText === null ? {} : { missingText: missingText }),
    ...(readContradiction === null ? {} : { readContradiction: readContradiction }),
    console: keptConsole.slice(0, MAX_CONSOLE).map(function (text) { return text.slice(0, 300) }),
    actions: actions.slice(-MAX_ACTIONS),
    ...(unattributed ? { unattributed: true } : {}),
    ...(otherContexts.length > 0 ? { otherContexts: otherContexts } : {}),
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
    // The scheme word only: a raw header value is a live credential and is never parsed in.
    ...(r.sentAuthorization === true ? { sentAuthorization: true } : {}),
    ...(typeof r.authorization === 'string' && r.authorization
      ? { authorization: r.authorization }
      : {}),
    ...(r.sentCookie === true ? { sentCookie: true } : {}),
    ...(typeof r.context === 'string' && r.context ? { context: r.context } : {}),
    ...(typeof r.pageId === 'string' && r.pageId ? { pageId: r.pageId } : {}),
  }
}

/**
 * One `missingText` out of a `TRACE` line's json, or null when the value is not one.
 *
 * @param value - The line's `missingText`.
 * @returns The awaited text and the response that carried it, or null.
 */
function parseMissingText(value: unknown): TraceMissingText | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (typeof raw.text !== 'string' || raw.text === '') return null
  if (typeof raw.method !== 'string' || raw.method === '') return null
  if (typeof raw.path !== 'string' || raw.path === '') return null
  return { text: raw.text, method: raw.method, path: raw.path }
}

/**
 * One `readContradiction` out of a `TRACE` line's json, or null when the value is not one.
 *
 * Both requests must parse and the two values must be booleans: a partial fact never becomes a
 * claim about the route.
 *
 * @param value - The line's `readContradiction`.
 * @returns The write, the later read and the field they disagree on, or null.
 */
function parseReadContradiction(value: unknown): TraceReadContradiction | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (typeof raw.field !== 'string' || raw.field === '') return null
  if (typeof raw.writeValue !== 'boolean' || typeof raw.readValue !== 'boolean') return null
  const write = parseTraceRequest(raw.write)
  const read = parseTraceRequest(raw.read)
  if (write === null || read === null) return null
  return { field: raw.field, writeValue: raw.writeValue, readValue: raw.readValue, write, read }
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
      const missingText = parseMissingText(raw.missingText)
      const readContradiction = parseReadContradiction(raw.readContradiction)
      const otherContexts = Array.isArray(raw.otherContexts)
        ? raw.otherContexts
            .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
            .filter((c) => typeof c.context === 'string')
            .map((c) => ({
              context: String(c.context),
              requests: (Array.isArray(c.requests) ? c.requests : [])
                .map(parseTraceRequest)
                .filter((request): request is TraceRequest => request !== null),
            }))
        : []
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
            ...(typeof a.context === 'string' ? { context: a.context } : {}),
            ...(typeof a.pageId === 'string' ? { pageId: a.pageId } : {}),
            ...(typeof a.frameId === 'string' ? { frameId: a.frameId } : {}),
            ...(typeof a.selector === 'string' && a.selector ? { selector: a.selector } : {}),
            ...(typeof a.value === 'string' ? { value: a.value } : {}),
          })),
        ...(otherContexts.length === 0 ? {} : { otherContexts }),
        ...(raw.unattributed === true ? { unattributed: true as const } : {}),
        ...(missingText === null ? {} : { missingText }),
        ...(readContradiction === null ? {} : { readContradiction }),
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
 * What the runner's own report says about ONE failing test: where the test is declared, which
 * Playwright call its failure names, and the per-test deadline the failure measured against.
 *
 * A trace cannot tell a navigation that ran out of budget from a selector wait that did. On
 * xr-molecule-flash-m153 a 15 s `page.waitForSelector` timeout left a trace whose `Frame.goto`
 * never finished (the test was cut off mid-navigation) with a `/src/components/*.tsx` module still
 * pending when the context closed — and the note read that as an asset hang, then sent the run to
 * re-run the same tests unchanged against the same dev server while the same result's
 * `testRunNote` was telling it to measure a production build.
 */
export interface TraceRunFailure {
  /** The spec file the runner's heading names (`e2e/url-navigation.spec.ts`). */
  spec: string
  /** The line the test is DECLARED on, from that heading (`206`). */
  line: number
  /** The Playwright call the failure names (`page.waitForSelector`, `page.goto`), or null. */
  operation: string | null
  /** The per-test deadline the failure names, in ms (`15000`), or null when it names none. */
  budgetMs: number | null
}

/** The runner's own report, beside the traces it wrote. */
export interface TraceRunReport {
  /**
   * One entry per failing test, as the runner printed them. Empty when the caller supplied none:
   * without the runner's reported operation a pending asset is never called the cause.
   */
  failures?: readonly TraceRunFailure[]
  /**
   * True when the same result's `testRunNote` already names a production build as the next
   * measurement (a local dev-server walk that ran out of its per-test budget). The note then
   * states the ONE next step instead of directing an unchanged same-target re-run that
   * contradicts it.
   */
  productionBuildAdvised?: boolean
  /**
   * The endpoints the app's own auth config names for a credential exchange — a login, a
   * registration, a token endpoint (`loginEndpoint: '/users/login'`, resolved from the app's
   * source). A 401/403 there answers credentials the app was ASKED to check, never a token the
   * client failed to attach, so the note says so even when the path is mounted somewhere unusual.
   * Empty when the caller could not read the app's config.
   */
  authEndpoints?: readonly string[]
}

/** The Playwright navigation calls whose wait a pending document subresource can explain. */
const NAVIGATION_OPERATIONS = new Set(['goto', 'waitForURL', 'waitForLoadState', 'reload'])

/**
 * The method a runner-reported operation names (`page.waitForSelector` → `waitForSelector`), or
 * null when it is not one of the navigation calls a stalled asset can explain.
 *
 * @param operation - The call the runner's error text names, or null.
 * @returns The navigation method, or null.
 */
function navigationMethod(operation: string | null): string | null {
  if (operation === null) return null
  const method = operation.slice(operation.lastIndexOf('.') + 1)
  return NAVIGATION_OPERATIONS.has(method) ? method : null
}

/**
 * The runner's report for the test THIS trace belongs to, or undefined when it belongs to none.
 *
 * The trace names the line of its LAST recorded step; the runner's summary names the test's
 * DECLARATION line, and the step sits inside the body just after it ({@link
 * RECURRENCE_LINE_WINDOW}). A line BEFORE the declaration is a hook — m153's teardown trace sits
 * at `url-navigation.spec.ts:107`, the Pagination suite's `afterEach`, while the failing test is
 * declared at `:206` — and a hook is not the failing test's operation.
 *
 * @param item - One traced failure.
 * @param failures - The runner's report, one entry per failing test.
 * @returns The matching failure, or undefined.
 */
function runFailureOf(
  item: TraceArtifact,
  failures: readonly TraceRunFailure[],
): TraceRunFailure | undefined {
  if (item.spec === null) return undefined
  for (const failure of failures) {
    if (!sameLocationFile(item.spec, failure.spec)) continue
    if (item.line < failure.line) continue
    if (item.line - failure.line <= RECURRENCE_LINE_WINDOW) return failure
  }
  return undefined
}

/**
 * Where the row names this failing test.
 *
 * The trace names the line of the step it recorded — the failing assertion when the runner wrote
 * its error on that step, and the suite's `afterEach` (`context.close()`) when it did not. The
 * runner's own summary names the test's DECLARATION line, and that is the location the result
 * quotes and the line a re-run command takes, so it wins whenever the run reported one for this
 * file: matched by the trace's own line inside the test body ({@link runFailureOf}), and otherwise
 * by the file alone when that file has exactly ONE reported failure — an `afterEach` line sits
 * BEFORE the declaration, so the line window cannot match it (xr-molecule-flash-m163's row said
 * `navigation.spec.ts:12`, the suite's `afterEach`, for the test declared at `:200`).
 *
 * @param item - One traced failure.
 * @param failures - The runner's report, one entry per failing test.
 * @returns The `file:line` the row names.
 */
function failureWhereOf(item: TraceArtifact, failures: readonly TraceRunFailure[]): string {
  const spec = item.spec
  if (spec === null) return whereOf(item)
  let reported = runFailureOf(item, failures)
  if (reported === undefined) {
    const sameFile = failures.filter((failure) => sameLocationFile(spec, failure.spec))
    if (sameFile.length === 1) reported = sameFile[0]
  }
  if (reported === undefined) return whereOf(item)
  return reported.line > 0 ? `${reported.spec}:${reported.line}` : reported.spec
}

/** A navigation the runner reported as the failure, with the pending assets its wait covered. */
interface StalledNavigation {
  /** The call as the runner named it (`page.goto`, `page.waitForURL`). */
  reported: string
  /** The trace's own record of that call; it never finished. */
  wait: TraceAction
  /** The document subresources that started inside the wait and never got a response. */
  assets: TraceRequest[]
  /** The per-test deadline the runner's failure named, or null. */
  budgetMs: number | null
}

/**
 * Whether a pending request's interval covers a navigation's wait: it started while the
 * navigation was loading (at or after the wait began) and it has no recorded response, so it was
 * still pending when the wait ran out. A request that started before the wait belongs to the page
 * already on screen, not to the navigation that never finished.
 *
 * @param request - One request the trace recorded.
 * @param wait - The navigation action the runner reported.
 * @returns True when the request's pending interval covers the wait.
 */
function requestCoversWait(request: TraceRequest, wait: TraceAction): boolean {
  if (typeof request.startedAt !== 'number') return false
  return request.startedAt >= wait.start - 1
}

/**
 * The stalled-navigation reading for one trace — or null.
 *
 * All three facts must hold together: the runner says THIS test's failing operation is a
 * navigation ({@link NAVIGATION_OPERATIONS}); the trace's record of that call never finished; and
 * a document subresource still pending at the end started inside that wait
 * ({@link requestCoversWait}). An asset merely unfinished when the test was cancelled, or one a
 * teardown/`afterEach` trace holds, meets none of these and is not a cause (m153).
 *
 * @param item - One traced failure.
 * @param report - The runner's report and the run's next step.
 * @returns The wait and the assets it was waiting on, or null.
 */
function stalledNavigation(item: TraceArtifact, report: TraceRunReport): StalledNavigation | null {
  const failure = runFailureOf(item, report.failures ?? [])
  if (failure === undefined) return null
  const method = navigationMethod(failure.operation)
  if (method === null) return null
  let wait: TraceAction | null = null
  for (const action of item.actions) {
    if (!action.api.endsWith(`.${method}`)) continue
    if (wait === null || action.start > wait.start) wait = action
  }
  // The navigation is the failure only while it is still running at the end of the test.
  if (wait === null || wait.end !== null) return null
  const assets = item.requests.filter(
    (request) => stalledDocumentSubresource(request) && requestCoversWait(request, wait),
  )
  if (assets.length === 0) return null
  return { reported: failure.operation ?? wait.api, wait, assets, budgetMs: failure.budgetMs }
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
 * navigation the RUNNER reports failing was still open: that navigation waits on it, so it is the
 * reason the `page.goto` timed out ({@link stalledNavigation}).
 *
 * @param item - One traced failure.
 * @param report - The runner's report and the run's next step.
 * @returns True when the trace holds a request or console line worth a row.
 */
function traceRowEvidence(item: TraceArtifact, report: TraceRunReport): boolean {
  return (
    item.console.length > 0 ||
    item.requests.some(
      (request) => !isStaticAssetRequest(request) && !unansweredRequest(request),
    ) ||
    // The one shape in which a subresource with no response IS the cause: the navigation the
    // runner reported was still running at the end (see {@link stalledNavigation}).
    stalledNavigation(item, report) !== null
  )
}

/**
 * The note's row order: a row with a REAL failure first, then a row whose failure an earlier walk
 * also had, then the rest. A recurrence is the only evidence a row carries when its requests were
 * all answered (m112's favorite cause: the click's own request answered, the button never
 * changed).
 *
 * @param item - One traced failure.
 * @param earlier - The failing `file:line`s earlier walks of this suite left.
 * @param report - The runner's report and the run's next step.
 * @returns The row's tier: 0 first, 2 last.
 */
function traceRowTier(
  item: TraceArtifact,
  earlier: readonly string[],
  report: TraceRunReport,
): number {
  if (item.requests.some(failedRequest)) return 0
  // A navigation the runner reported, still waiting on a subresource that never got a response,
  // is as strong a cause as a failed request — it is the one fact the timeout was waiting on
  // (m135).
  if (stalledNavigation(item, report) !== null) return 0
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
 * The path segments a request ASKS FOR a credential through — a login, a registration, a token
 * endpoint — as opposed to a protected resource that presents one.
 */
const CREDENTIAL_EXCHANGE_PATH =
  /(?:^|\/)(?:login|log-in|signin|sign-in|register|signup|sign-up|token)(?:\/|$)/i

/** The field a credential payload carries: a password, a grant, or a refresh token. */
const CREDENTIAL_FIELD = /"(?:password|credentials|grant_type|refresh_token)"\s*:/i

/** The field that pairs with a password in a login/registration body. */
const CREDENTIAL_IDENTITY = /"(?:email|username)"\s*:/i

/**
 * Whether a request's recorded body is a credential payload — the shape a login, a registration
 * or a token exchange sends, never a protected write (an article, a comment, a profile).
 *
 * @param sent - What the request sent, as the trace recorded it (bounded).
 * @returns True for a body carrying credentials.
 */
function credentialExchangeBody(sent: string | undefined): boolean {
  if (!sent) return false
  const text = sent.slice(0, MAX_TRACED_BODY_CHARS)
  // A password alone is a profile write as often as a login; the exchange is a password beside
  // an identity, or a token grant.
  if (!CREDENTIAL_FIELD.test(text)) return false
  return (
    CREDENTIAL_IDENTITY.test(text) || /"(?:credentials|grant_type|refresh_token)"\s*:/i.test(text)
  )
}

/**
 * Whether a request PATH asks the app to mint a credential — a login, a registration, a token
 * endpoint — as opposed to a protected resource that presents one.
 *
 * This is the path half of {@link isCredentialExchange}, exported so a caller holding only a
 * `METHOD path` reads the same classification: a Hurl failing entry says
 * `POST /api/users/login` and nothing about the body, and the whole-suite note must not explain
 * a wrong-password login that answered 200 as a cookie-jar effect (xr-molecule-flash-m176).
 *
 * @param path - The request path (`/api/users/login`); a query or fragment is ignored.
 * @param authEndpoints - The endpoints the app's auth config names (`/users/login`).
 * @returns True when the path names a credential exchange.
 */
export function isCredentialExchangePath(
  path: string,
  authEndpoints: readonly string[] = [],
): boolean {
  const clean = (path.split(/[?#]/)[0] ?? '').replace(/\/+$/, '')
  if (clean === '') return false
  // The app's own config names it: matched as a path suffix, because an auth config writes the
  // endpoint relative to its API base (`/users/login`) while the trace records the mounted path
  // (`/api/users/login`).
  if (
    authEndpoints.some((endpoint) => {
      const named = `/${String(endpoint).replace(/^\/+|\/+$/g, '')}`
      return named.length > 1 && (clean === named || clean.endsWith(named))
    })
  )
    return true
  return CREDENTIAL_EXCHANGE_PATH.test(clean)
}

/**
 * Whether a refused request is a CREDENTIAL EXCHANGE: the app was asked to mint a token (a login,
 * a registration, a token endpoint), so it never needed one attached.
 *
 * Three readings, weakest last: the app's own auth config names the endpoint (a project may mount
 * `/session` or `/auth/signin`), the path's own last segments name it (`/users/login`), or the
 * body is a credential payload (`{"user":{"email":…,"password":…}}` sends a registration).
 *
 * xr-molecule-flash-m165 (+10:22): `POST /api/users/login → 401
 * {"errors":{"credentials":["invalid"]}}` was answered with the missing-token sentence — "the
 * client did not attach the token … The API handler is not the problem" — for a request whose
 * whole purpose is to obtain a token. The model read helpers and configs for 40 minutes instead of
 * the real cause: the suite's setup had seeded `https://api.realworld.show`, not this app.
 *
 * @param request - The refused request (401/403).
 * @param authEndpoints - The endpoints the app's auth config names (`/users/login`).
 * @returns True when the request is a credential exchange.
 */
function isCredentialExchange(request: TraceRequest, authEndpoints: readonly string[]): boolean {
  if (request.method !== 'POST') return false
  const path = sameOriginPath(request)
  if (path === null) return false
  if (isCredentialExchangePath(path, authEndpoints)) return true
  return credentialExchangeBody(request.sent)
}

/**
 * The sentence a 401/403 on the app's own API gets: which half of the wire refused the request.
 *
 * A fixed "read the handler this route reaches" line is the wrong half for a credential refusal.
 * The request's own `Authorization` header — recorded by the trace reader as its scheme WORD, never
 * its value — decides: absent means the CLIENT never attached the token (a session store that the
 * HTTP client does not read, a bare `fetch`, an auth bond the app replaced), while present means
 * the SERVER refused a token it was sent (scheme or issuer). A 403 is a permission answer, not a
 * credential one, and says so.
 *
 * xr-molecule-flash-m148 (+29:18): `POST /api/articles/…/favorite → 401 {"errors":{"token":["is
 * missing"]}}` was answered with the handler sentence for six local walks, while the trace proved
 * the request carried no `Authorization` header at all and the app's hand-rolled session store
 * never handed its token to the shared client.
 *
 * xr-molecule-flash-m156 (+16:15): the same 401 shape after a reload, and the page's own console
 * named the cause — `@molecule/app-http` logged `no client is bonded`. The auth setup ran before
 * the HTTP setup and kept the fallback client, so the restored token landed on a client nothing
 * sent through. When the trace carries that line, the no-header sentence names the ordering fix
 * instead of leaving the run to re-derive it.
 *
 * xr-molecule-flash-m165 (+10:22): a `POST /api/users/login → 401
 * {"errors":{"credentials":["invalid"]}}` is a CREDENTIAL EXCHANGE — the request is how a token is
 * obtained, so an absent `Authorization` header is the request being what it is, not a client bug.
 * The note said "the client did not attach the token … The API handler is not the problem" and the
 * run went looking through the app instead of at the credentials or the setup's API origin. The
 * exchange branch names the credentials, the account's origin, and the response body; the
 * categorical handler sentence is gone from the no-header branch too, because a route that
 * requires a token where the app allows anonymous access is the handler's own mistake.
 *
 * The trace cannot name the file that made the call: a real HAR entry carries the request, response,
 * `_resourceType`, `_monotonicTime` and a frame ref, but no initiator stack. So the sentence names
 * the shared client and the auth bond instead of guessing a file.
 *
 * @param request - The refused request, a 401 or 403 on the app's own origin.
 * @param unbondedClient - Whether the traced page logged `no client is bonded`, which explains a
 *   request that carried no `Authorization` header.
 * @param authEndpoints - The endpoints the app's auth config names, so a credential exchange is
 *   recognised even under a path the segment list does not.
 * @returns The sentence the note appends.
 */
function authRefusalSentence(
  request: TraceRequest,
  unbondedClient = false,
  authEndpoints: readonly string[] = [],
): string {
  const label = requestLabel(request)
  // The header's scheme, when it parsed; presence alone is still the server's half of the wire.
  const carried =
    request.authorization !== undefined
      ? `with \`Authorization: ${request.authorization} …\``
      : 'with an `Authorization` header'
  // A credential exchange asks the app to MINT a token: no token is expected to be attached, so a
  // refusal here is about the credentials themselves — never the client's omission (m165).
  if (isCredentialExchange(request, authEndpoints)) {
    const got = request.got
      ? ` got ${bodyLine(redactSecrets(request.got), TRACE_NOTE_GOT_CHARS)}`
      : ''
    return (
      `The browser sent \`${label}\`${got} and the API answered ${request.status} — this is a ` +
      'credential exchange (a login/registration/token endpoint), so the client is not expected ' +
      'to attach a token: the credentials were rejected. Check that the account the test logs in ' +
      'with was created on THIS app — the same database and origin this run drives; a user seeded ' +
      'somewhere else is unknown here — and read the response body’s `errors` (a login answers 401 ' +
      '`{"errors":{"credentials":["invalid"]}}` for a wrong email/password or a user that does not ' +
      'exist here).'
    )
  }
  // The console line names the mechanism the no-header branch otherwise has to guess at:
  // `getClient()` ran before `setupHttpDefault()` and the token was mirrored into the
  // client that later setup replaced (xr-molecule-flash-m156).
  const unbonded = unbondedClient
    ? ' The page logged `no client is bonded` — something called `getClient()` from ' +
      '`@molecule/app-http` before `setupHttpDefault()` ran and kept that fallback client; ' +
      'in `app/src/bonds/index.ts` call `setupHttpDefault()` before `setupAuthDefault()`, ' +
      'and read the client per request instead of capturing it at setup.'
    : ''
  if (request.status === 403) {
    return request.sentAuthorization === true
      ? `The browser sent \`${label}\` ${carried} and the API answered 403 — the token was ` +
          'accepted but this user may not do it: read the route’s role/permission check in your ' +
          'own source, and the account the session belongs to.'
      : `The browser sent \`${label}\` and the API answered 403 — the request carried no ` +
          '`Authorization` header, so either the client did not attach the token (check that the ' +
          'request goes through the app’s HTTP client that the auth bond configures, and that the ' +
          'token is stored where the client reads it) or the route refuses this user: read the ' +
          'route’s role/permission check in your own source.' +
          unbonded
  }
  if (request.sentAuthorization === true) {
    return (
      `The browser sent \`${label}\` ${carried} and the API refused it: the token was sent and ` +
      'rejected — the scheme (the client’s `authScheme`, e.g. `Token` vs `Bearer`) or the ' +
      'token’s issuer differs from what the server verifies; read the verify middleware this ' +
      'route reaches.'
    )
  }
  return (
    `The browser sent \`${label}\` with NO \`Authorization\` header — the client did not attach ` +
    'the token: check that the request goes through the app’s HTTP client that the auth bond ' +
    'configures (not a bare `fetch`), and that the token is stored where the client reads it. ' +
    'The shared client carries it through `setAuthToken` — the auth bond ' +
    '(`createDefaultAuthClientWithHttpSync` in `@molecule/app-bonds-default-react`) mirrors the ' +
    'auth client’s token there, and a session store of your own has to call it too. ' +
    (request.sentCookie
      ? 'The request did carry a `Cookie` header, so if this app signs in with a session cookie ' +
        'that is the credential the server did not accept. '
      : '') +
    unbonded
  )
}

/**
 * The note's credential-refusal advice, one sentence per distinct shape — at most two.
 *
 * The shapes are `(status, Authorization scheme, cookie present, credential exchange)`: m148's ten
 * walks repeated one shape (`401`, no header) on every failing test, and repeating its sentence per
 * row would bury the fact rather than state it. A login and a protected request that both carry no
 * header are DIFFERENT shapes — one is the credentials being checked, the other is a token that was
 * never attached (m165).
 *
 * @param items - The traces the note is about.
 * @param authEndpoints - The endpoints the app's auth config names.
 * @returns The sentences to append (each led by a space), or '' when no same-origin 401/403 was
 *   traced.
 */
function authRefusalAdvice(
  items: readonly TraceArtifact[],
  authEndpoints: readonly string[] = [],
): string {
  const sentences: string[] = []
  const seen = new Set<string>()
  // A page that logged `no client is bonded` explains every request it sent without a
  // token, so the advice names that mechanism once for the run
  // (xr-molecule-flash-m156).
  const unbondedClient = items.some((item) =>
    item.console.some((line) => line.includes('no client is bonded')),
  )
  for (const item of items) {
    for (const request of item.requests) {
      if (request.status !== 401 && request.status !== 403) continue
      if (sameOriginPath(request) === null) continue
      // A 4xx on the logout endpoint is the shape the row itself answers: the auth client
      // ignores it and clears the session, and the page owes the navigation (m156).
      if (isLogoutRequest(request)) continue
      const exchange = isCredentialExchange(request, authEndpoints)
      const key = `${request.status} ${exchange ? 'exchange' : request.sentAuthorization ? (request.authorization ?? 'header') : 'none'} ${request.sentCookie ? 'cookie' : ''}`
      if (seen.has(key)) continue
      seen.add(key)
      sentences.push(authRefusalSentence(request, unbondedClient, authEndpoints))
      if (sentences.length === 2) return ` ${sentences.join(' ')}`
    }
  }
  return sentences.length === 0 ? '' : ` ${sentences.join(' ')}`
}

/**
 * Whether a request went to an auth client's logout endpoint. The client's default
 * `logoutEndpoint` is `/users/logout` (`@molecule/app-auth`), and a project may name its own
 * (`/auth/logout`), so the last segment is what identifies it — never a literal path.
 *
 * @param request - One request a trace recorded.
 * @returns True for a POST to a path ending in `/logout`.
 */
function isLogoutRequest(request: TraceRequest): boolean {
  if (request.method !== 'POST') return false
  return /\/(?:users\/)?logout$/i.test(requestPath(request))
}

/**
 * The sentence a 4xx on the auth client's logout endpoint owes when the page then stayed put.
 *
 * `@molecule/app-auth`'s `logout()` calls the endpoint inside a `.catch` and clears the session in
 * `finally` (`packages/app/core/auth/src/client.ts`): a 401 there is EXPECTED on a sign-out and is
 * not the failure. What the test waits for is the URL moving, which the page has to do itself.
 * xr-molecule-flash-m156 (+24:02 → +33:52) read `POST /api/users/logout → 401` as a broken
 * endpoint, added a backend logout route, and paid a re-run and a redeploy — while the real cause
 * was the `navigate('/')` the refactor had dropped.
 *
 * @param request - The 4xx logout request.
 * @param pageUrl - The URL the page stayed at, when the trace recorded one.
 * @returns The sentence the note appends to the row.
 */
function logoutIgnoredSentence(request: TraceRequest, pageUrl: string | undefined): string {
  const where = pageUrl === undefined ? 'The page' : `\`${pageUrl}\``
  return (
    `The ${request.status} on \`${requestLabel(request)}\` is ignored by the auth client — ` +
    '`logout()` catches that call and clears the session in `finally` (`@molecule/app-auth`), so ' +
    'the request is not what broke the test and the API is not the fix; do not add or change a ' +
    `logout route. ${where} stayed on the same URL: the page has to navigate itself after ` +
    "`logout()` (call `navigate('/')`, or the route the suite waits for) in the handler that " +
    'signs out.'
  )
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
 * Every API path prefix the traces support: the one the app's client config names and the ones the
 * traces' own same-origin requests show ({@link tracedApiPrefixes}).
 *
 * @param items - The traces the note is about.
 * @param apiPrefixes - Prefixes the app's client config names (`['/api']`), never a literal.
 * @returns The one-segment prefixes, without duplicates.
 */
function knownApiPrefixes(
  items: readonly TraceArtifact[],
  apiPrefixes: readonly string[],
): string[] {
  const prefixes = new Set(
    [...apiPrefixes, ...tracedApiPrefixes(items)]
      .map((prefix) => `/${String(prefix).replace(/^\/+|\/+$/g, '')}`)
      .filter((prefix) => prefix !== '/'),
  )
  return [...prefixes]
}

/** A URL written in full (`https://api.realworld.show/api/articles`). */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i

/** A request a trace made to an API on an origin other than the page's own. */
interface ForeignOriginRequest {
  /** The other origin (`https://api.realworld.show`). */
  origin: string
  /** The app's own API prefix its path carries (`/api`). */
  prefix: string
  /** The first such request, for the sentence's example. */
  request: TraceRequest
}

/**
 * The API requests a trace made to an origin other than the page's own — set-up traffic that ran
 * against someone else's server.
 *
 * The trace reader relativises every request whose origin is the page's (`pathOf`), so a request
 * recorded with an absolute URL went to ANOTHER origin by construction. It counts as set-up/API
 * traffic when its path carries a prefix the app's own API is known to use ({@link
 * knownApiPrefixes}) — a CDN font or a third-party script has no `/api` under it, and with no
 * known prefix nothing is claimed.
 *
 * xr-molecule-flash-m165 (+10:22): the suite's helper defaulted `API_BASE` to
 * `https://api.realworld.show/api` and its set-up seeded rows there, while the browser drove this
 * app — whose own `/api` answers a login for none of those users. The trace's absolute-URL rows
 * were the evidence, and the note said nothing about them.
 *
 * @param items - The traces the note is about.
 * @param apiPrefixes - Prefixes the app's client config names (`['/api']`).
 * @returns One entry per distinct (origin, prefix), in trace order.
 */
function foreignOriginApiRequests(
  items: readonly TraceArtifact[],
  apiPrefixes: readonly string[],
): ForeignOriginRequest[] {
  const prefixes = knownApiPrefixes(items, apiPrefixes)
  if (prefixes.length === 0) return []
  const out: ForeignOriginRequest[] = []
  const seen = new Set<string>()
  for (const item of items) {
    for (const request of item.requests) {
      const raw = String(request.path ?? '')
      if (!ABSOLUTE_URL.test(raw)) continue
      let parsed: URL
      try {
        parsed = new URL(raw)
      } catch (_error) {
        // Not a URL this can parse: it is not evidence of another origin.
        continue
      }
      const prefix = prefixes.find(
        (one) => parsed.pathname === one || parsed.pathname.startsWith(`${one}/`),
      )
      if (prefix === undefined) continue
      const key = `${parsed.origin}${prefix}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ origin: parsed.origin, prefix, request })
    }
  }
  return out
}

/**
 * The origin a run's target names, when it names one: a URL (`http://localhost:4173`), or the
 * deployed host the note prints (`loopcheck-….apps.mlcl.dev`). Null for the note's descriptive
 * targets ("the deployed app", "the local app").
 *
 * @param target - Where the run went, as {@link failureTraceNote} names it.
 * @returns The origin, or null.
 */
function appOriginOfTarget(target: string): string | null {
  const text = target.trim()
  try {
    if (ABSOLUTE_URL.test(text)) return new URL(text).origin
    if (/^[a-z0-9.-]+(?::\d+)?$/i.test(text)) return new URL(`https://${text}`).origin
  } catch (_error) {
    // A target that is not a URL names no origin.
  }
  return null
}

/**
 * The sentence naming the foreign origin a run's set-up traffic went to, and the setting that
 * points it at this app instead.
 *
 * It leads the note because it is the cheapest possible wrong result: every row the suite creates
 * lands in a database this app never reads, so the failure says nothing about the app's code.
 * xr-molecule-flash-m165 spent the walk after its failed login reading helpers and configs for a
 * missing token, when the command's `BASE_URL`/`API_BASE` disagreement was the cause.
 *
 * @param found - The foreign-origin request the trace holds.
 * @param target - Where the run went, for the app's own origin when the note knows it.
 * @returns The sentence, led by nothing and closed by a blank line.
 */
function foreignOriginSentence(found: ForeignOriginRequest, target: string): string {
  const appOrigin = appOriginOfTarget(target)
  const where = appOrigin ?? 'this app’s origin'
  const apiBase = `${appOrigin ?? '<this app’s origin>'}${found.prefix}`
  return (
    `The suite’s setup ran against ${found.origin}, not this app ` +
    `(\`${requestLabel(found.request)}\`) — its set-up/API traffic went to another origin while ` +
    `this app serves its own API at \`${found.prefix}\` on ${where}. Set ` +
    `\`API_BASE=${apiBase}\` on the run — the supplied suite reads it (verify the variable name ` +
    `in the suite’s own helpers before writing it) — so the rows it creates are in the database ` +
    `this app reads.\n\n`
  )
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
  const known = knownApiPrefixes(items, apiPrefixes)
  if (known.length === 0) return []
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
 * The sentence for a failing assertion whose awaited text a same-page API response carried.
 *
 * It names the response and the fact the trace proves — the value reached the browser and the page
 * did not render it — and stops there. Which cut drops it (a slice, a filter, a limit) is in the
 * component that maps the response, and the note cannot see that component; naming the mapping
 * step is the whole instruction (xr-molecule-flash-m169).
 *
 * @param missing - The awaited text and the response that carried it.
 * @returns The sentence the note leads with.
 */
function missingTextSentence(missing: TraceMissingText): string {
  return (
    `The API returned "${missing.text}" (in ${missing.method} ${missing.path}), but the page did ` +
    `not render it — the page drops it before rendering (a slice/filter/limit in the component ` +
    `that renders that list); find where that response is mapped.`
  )
}

/**
 * The `name` attribute a locator's selector reads (`textarea[name="bio"]` → `bio`), or null when
 * the selector names no field.
 *
 * Matching the form field to the request body's key is the whole point: a body that carries
 * `"bio": ""` says nothing unless the trace also says the test typed a bio.
 *
 * @param selector - The selector a `fill`/`type`/`selectOption` action carried.
 * @returns The field name, or null.
 */
function fieldNameOf(selector: string): string | null {
  const quoted = /\[\s*name\s*=\s*(["'])((?:(?!\1).)*)\1\s*\]/.exec(selector)
  if (quoted !== null) return quoted[2] === '' ? null : quoted[2]
  const bare = /\[\s*name\s*=\s*([^\s\]]+)\s*\]/.exec(selector)
  return bare === null ? null : (bare[1] ?? null)
}

/**
 * Whether a JSON request body carries `key` with an EMPTY value (`""` or null), looking inside the
 * wrapper object an API nests its entity under (`user`, `data`, `props`).
 *
 * A body that does not parse, or carries the key with a real value, is not evidence: the note only
 * claims the page sent a field empty when it did.
 *
 * @param sent - The body the page sent, as the trace recorded it.
 * @param key - The field name from the filled input's `name` attribute.
 * @returns True when the body carries that key empty.
 */
function bodyCarriesEmptyField(sent: string, key: string): boolean {
  let parsed: unknown
  try {
    parsed = JSON.parse(sent)
  } catch (_error) {
    // A truncated body (the trace read bounds what it keeps) names no field confidently.
    return false
  }
  const read = (value: unknown, level: number): boolean | null => {
    if (level > 4 || value === null || typeof value !== 'object') return null
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = read(item, level + 1)
        if (found !== null) return found
      }
      return null
    }
    const record = value as Record<string, unknown>
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key] === '' || record[key] === null
    }
    for (const nested of Object.values(record)) {
      const found = read(nested, level + 1)
      if (found !== null) return found
    }
    return null
  }
  return read(parsed, 0) === true
}

/** What a form-reset reading needs: the field the test typed, and the submit that sent it empty. */
interface FormResetEvidence {
  /** The value the test typed (`Bio updated at 1792345026196`). */
  value: string
  /** The locator the test filled (`textarea[name="bio"]`). */
  selector: string
  /** The body key the submit carried empty (`bio`). */
  field: string
  /** The submit request whose body carried it. */
  request: TraceRequest
}

/**
 * The field a test typed into that the same page submitted empty, when the trace recorded both.
 *
 * This is the Settings race of xr-molecule-flash-m173: `page.fill('textarea[name="bio"]', newBio)`
 * then `button[type=submit]`, and the `PUT /api/user` carried `"bio": ""`. The form's seeding
 * effect re-ran between the fill and the submit — on the deployed URL the background session
 * verification lands later than it does locally, and it handed the form a new user object. The
 * reading only pairs facts the trace holds: the filled value (its `selector`/`value`), the field
 * name the selector names, and the next call to the app's API on that page whose body carries
 * that key empty.
 *
 * @param item - One traced failure.
 * @returns The evidence, or null when no filled field was submitted empty.
 */
function formResetOf(item: TraceArtifact): FormResetEvidence | null {
  const requests = [...(item.lastAction?.requests ?? []), ...item.requests]
  // A trace read before `actions` existed (or a hand-built one) carries none: no claim.
  for (const action of item.actions ?? []) {
    if (action.selector === undefined || action.value === undefined || action.value === '') continue
    const field = fieldNameOf(action.selector)
    if (field === null) continue
    let next: TraceRequest | null = null
    for (const request of requests) {
      if (!/^(?:POST|PUT|PATCH)$/.test(request.method) || request.sent === undefined) continue
      // The submit follows the typing; a request that started before it cannot have sent it.
      if (typeof request.startedAt === 'number' && request.startedAt < action.start) continue
      // Same page only: another context's set-up call is not this form's submit.
      if (
        action.pageId !== undefined &&
        request.pageId !== undefined &&
        action.pageId !== request.pageId
      )
        continue
      if (!bodyCarriesEmptyField(request.sent, field)) continue
      const earlier =
        next === null ||
        (typeof request.startedAt === 'number' &&
          (typeof next.startedAt !== 'number' || request.startedAt < next.startedAt))
      if (earlier) next = request
    }
    if (next !== null)
      return { value: action.value, selector: action.selector, field, request: next }
  }
  return null
}

/**
 * The sentence for a submitted form field the test had just typed into, sent empty.
 *
 * It states the two recorded facts and the one inference they support — the form re-seeded after
 * the typing — then the fix at the source: copy the loaded data into the form once, on its first
 * load, instead of on every change of the data it was seeded from.
 *
 * @param reset - The filled field and the submit that carried it empty.
 * @returns The sentence the note leads with.
 */
function formResetSentence(reset: FormResetEvidence): string {
  return (
    `The test typed "${reset.value}" into ${reset.selector}, but ` +
    `${requestLabel(reset.request)} sent "${reset.field}": "" — the form's state was reset after ` +
    `typing (an effect re-seeding the form from data that changed identity ran again after the ` +
    `test typed). Seed the form once, not every time that data changes.`
  )
}

/**
 * The sentence for a write whose answer a later GET of the same resource contradicted.
 *
 * It states the two recorded facts and the one inference they support — the read route never saw
 * the viewer — then the place to look: the route's middleware, not the page. It names both
 * possibilities the trace cannot separate (a missing auth/optional-auth middleware on that route,
 * or a different user), so the run checks the route instead of rewriting the component.
 *
 * @param contradiction - The write's answer and the later read's opposite one.
 * @returns The sentence the note leads with.
 */
function readContradictionSentence(contradiction: TraceReadContradiction): string {
  return (
    `The server answered \`${contradiction.field}\`: ${contradiction.writeValue} to ` +
    `${requestLabel(contradiction.write)} and \`${contradiction.field}\`: ` +
    `${contradiction.readValue} to ${requestLabel(contradiction.read)} — the read route does not ` +
    `see the viewer (a missing auth/optional-auth middleware on that route, or a different user); ` +
    `check the route's middleware, not the page.`
  )
}

/**
 * Chromium's webfont decode failure: the URL it fetched, and OTS's reason.
 *
 * A page that serves its SPA fallback for a missing `.woff` produces exactly this line — the
 * browser downloads `index.html` and OTS rejects the first four bytes.
 */
const FONT_DECODE_FAILURE =
  /Failed to decode downloaded font:\s*(\S+)\s*\|\s*OTS parsing error:\s*(.+?)\s*$/i

/**
 * Whether an OTS `invalid sfntVersion: <n>` number is four ASCII bytes that start an HTML
 * document (`<!do` — `0x3C21646F` is the doctype's first four bytes).
 *
 * @param reason - The OTS reason text after `OTS parsing error:`.
 * @returns True when the codec read an HTML signature instead of a font signature.
 */
function sfntVersionIsHtml(reason: string): boolean {
  const raw = /invalid sfntVersion:\s*(\d+)/i.exec(reason)?.[1]
  if (raw === undefined) return false
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) return false
  const magic = String.fromCharCode(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  )
  return magic.startsWith('<')
}

/**
 * One line of a failure row's `console:` list, with the webfont-decode signature explained.
 *
 * `Failed to decode downloaded font: <url> | OTS parsing error: invalid sfntVersion: 1008821359`
 * is not a font to debug: the URL answered HTML (the app's `index.html`, the SPA fallback), so
 * the file the `@font-face` names is not there. xr-molecule-flash-m186's page fetched
 * `/fonts/ionicons.woff`, got the index document, and the note printed the raw decode error
 * while the model went looking elsewhere.
 *
 * @param text - The console line, as the trace recorded it.
 * @returns The line to print, naming the URL that served HTML when it is that failure.
 */
function consoleLine(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const failure = FONT_DECODE_FAILURE.exec(normalized)
  if (!failure) return normalized
  const [, url, reason] = failure
  if (!sfntVersionIsHtml(reason)) return normalized
  return (
    `${url} answered the app's index.html, not a font — the file is missing from ` +
    `\`app/public/\` (or the asset import); copy/import it`
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
 * The action, the URL and the requests are the FAILING ASSERTION'S PAGE's ({@link
 * TraceArtifact.lastAction}), never the archive's last context: a test that creates its data in a
 * second browser context writes that context's click and `/editor` snapshot into the same zip, and
 * reading the concatenation made them the failing page (xr-molecule-flash-m160). The other
 * contexts' requests are named separately as set-up work. When the trace holds more than one used
 * context and the assertion's page cannot be identified, the note lists the requests and makes NO
 * causal claim — no "the test's last action", no "the page stayed at …" — instead of merging them.
 *
 * A field the test filled and the page submitted EMPTY ({@link formResetOf}) leads the note: the
 * trace holds both facts — the value typed into `textarea[name="bio"]` and the `PUT /api/user`
 * whose body carried `"bio": ""` — so the form's state was reset between the typing and the
 * submit. The note names the effect that re-seeds a form from data whose identity changed and the
 * fix at the source (seed the form once). xr-molecule-flash-m173 lost a deploy-and-walk cycle to
 * this on the deployed URL only, where the background session verification lands later than it
 * does locally.
 *
 * A write whose response said a boolean field is true and a LATER GET of the same resource that
 * said it is false leads the note first ({@link readContradictionSentence}): the read route never
 * saw the viewer, so the fix is on that route's middleware, not in the page. xr-molecule-flash-m181
 * spent ~8 minutes rewriting the profile component over exactly that pair — the write answered
 * `{"following":true}` and the next profile GET answered `false`.
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
 * When a navigation the runner reports as the failure never finished and one of the document's
 * own subresources (a stylesheet, a script, an asset under `/assets/`) never got a response either
 * — having started inside that wait — the request takes a row and the note says the page was
 * waiting on it. It is not an API call, but on a `page.goto` timeout it is the only request that
 * can explain the timeout — the deployed app was serving the page while one fetch stalled for 27 s
 * (xr-molecule-flash-m135 +34:10). The page shell's incidental requests (`/sw.js`, the manifest, a
 * favicon, a font) stay out, for m125's reason. An asset merely unfinished when a selector wait
 * ran out the test budget, or one a teardown/`afterEach` trace holds, is not a cause: the note
 * says it "had no recorded response when the test ended; that alone does not establish the cause"
 * (xr-molecule-flash-m153 +13:43).
 *
 * A 404 whose path lacks the API prefix the app's own calls carry is called out with that prefix
 * ({@link missingApiPrefixRequests}): xr-molecule-flash-m145 posted `/users` to `vite preview`,
 * whose 404 was answered by the static server because the HTTP client's `baseURL` was never set —
 * and the note printed "read the handler this route reaches in your own source", which presumes a
 * request that never reached the API. The prefix is READ (the caller passes what the app's client
 * config names; the traces add what their own requests show) and never assumed to be `/api`.
 *
 * A 401/403 on the app's own origin is answered from the request's own credential record instead
 * ({@link authRefusalSentence}): no `Authorization` header means the CLIENT never attached the
 * token (the shared HTTP client's `setAuthToken` is what the auth bond mirrors it into), while a
 * header the API then refused moves the answer to the server. The handler sentence is kept for
 * the rest — 404/422/500 — and dropped when every failure was a credential refusal, because a
 * trace that proves the header was never sent cannot be explained by the handler.
 * xr-molecule-flash-m148 (+29:18) hit this exactly: six local walks read
 * `POST …/favorite → 401 {"errors":{"token":["is missing"]}}` as a handler bug.
 *
 * A credential EXCHANGE (a login/registration/token endpoint, read from the app's auth config, the
 * path or the body) is never that shape: the request's purpose is to obtain a token, so an absent
 * header is not a client omission ({@link isCredentialExchange}). xr-molecule-flash-m165's login
 * 401 was answered as one for 40 minutes; the trace also showed the suite's SET-UP traffic going
 * to `https://api.realworld.show/api` instead of this app, which is what the note leads with
 * ({@link foreignOriginApiRequests}).
 *
 * @param items - The traces {@link parseTraceArtifacts} read.
 * @param target - Where the run went — the deployed host, as the note names it.
 * @param earlierFailures - The failing `file:line`s earlier walks of this suite left, so a repeat
 *   is ranked above a one-off. Empty when the caller knows of no earlier walk.
 * @param apiPrefixes - The API path prefixes the app's client config names (`['/api']`), read from
 *   the app by the caller. Empty when the caller could not read one; the traces' own requests may
 *   still supply it. Never a hard-coded literal.
 * @param report - The runner's own report for this run ({@link TraceRunReport}): each failing
 *   test's declared location, the operation its failure names and the deadline it names, plus
 *   whether the same result's `testRunNote` already points at a production build. A pending asset
 *   is called the cause only when the runner says the failing operation for THAT test is the
 *   navigation it was loading; without the report nothing is called a navigation stall.
 * @returns The note, or null when no trace held a recorded response, a real failure or a console
 *   error.
 */
export function failureTraceNote(
  items: readonly TraceArtifact[],
  target: string,
  earlierFailures: readonly string[] = [],
  apiPrefixes: readonly string[] = [],
  report: TraceRunReport = {},
): string | null {
  const failures = report.failures ?? []
  const candidates = items.filter((item) => traceRowEvidence(item, report))
  if (candidates.length === 0) return null
  // Ranked, then deduplicated BY LOCATION — in that order, so the row kept for a location is the
  // one carrying the strongest evidence (m112's duplicate `afterEach` rows).
  const ranked = candidates
    .map((item, index) => ({ item, index, tier: traceRowTier(item, earlierFailures, report) }))
    .sort((left, right) => left.tier - right.tier || left.index - right.index)
  const traced: TraceArtifact[] = []
  const seen = new Set<string>()
  for (const { item, index } of ranked) {
    // A trace that names no spec cannot be placed; it is never collapsed onto another one.
    const where = item.spec === null ? `#${index}` : failureWhereOf(item, failures)
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
  // A credential refusal (401/403 on the app's own API) is not the handler's answer: the trace's
  // own `Authorization` record says whether the CLIENT attached the token at all (m148 +29:18).
  const authRefusals = failedRequests.filter(
    (request) =>
      sameOriginPath(request) !== null &&
      (request.status === 401 || request.status === 403) &&
      // A 4xx on the logout endpoint is not a credential refusal to diagnose: the auth client
      // ignores it and clears the session anyway, and the row says so itself (m156).
      !isLogoutRequest(request),
  )
  const everyFailureAuth =
    failedRequests.length > 0 && authRefusals.length === failedRequests.length
  // Every recorded failure is the logout endpoint answering 4xx: the row's own sentence explains
  // it, and neither the handler lead nor the credential reading applies (m156 +24:02).
  const onlyLogoutFailures =
    failedRequests.length > 0 && failedRequests.every((request) => isLogoutRequest(request))
  const authAdvice = authRefusalAdvice(traced, report.authEndpoints ?? [])
  // Set-up traffic the trace shows going to an origin other than the app's (m165): the rows it
  // creates are not in this app's database, so the note says it before any app-side reading.
  const foreignOrigins = foreignOriginApiRequests(traced, apiPrefixes)
  const [firstForeign] = foreignOrigins
  const setupOriginLead =
    firstForeign === undefined ? '' : foreignOriginSentence(firstForeign, target)
  // The stalled-navigation reading, per traced test: non-null only when the RUNNER says this
  // test's failing operation is a navigation and a document subresource still pending at the end
  // started inside that wait ({@link stalledNavigation}).
  const stalls = traced.map((item) => stalledNavigation(item, report))
  // "Every failure this run traced…" is only honest when every traced test meets that bar — one
  // stalled trace beside a selector-wait failure is not the cause of the run (m153).
  const everyTracedStalls = stalls.every((stall) => stall !== null)
  const stalledAssets = everyTracedStalls
    ? [...new Set(stalls.flatMap((stall) => stall?.assets.map(requestLabel) ?? []))]
    : []
  const stalledWaits = [
    ...new Set(stalls.flatMap((stall) => (stall === null ? [] : [stall.reported]))),
  ]
  const anyStalled = stalls.some((stall) => stall !== null)
  const rows: string[] = []
  // Rows whose failing action sent nothing and left the page on a new route: the page is still
  // showing the previous route's data. Counted so the note can say it once for the whole run.
  let staleRouteRows = 0
  for (const [index, item] of traced.entries()) {
    // The test's LAST action before the failing assertion leads the row (m148): the requests it
    // caused and what came back explain a page that never showed the signed-in state, while the
    // page's own last call (a redirect target's `GET /api/tags`) and the shell's files do not.
    const lead = item.lead
    const step = item.lastAction
    // A navigation the runner reported, still waiting on a stalled asset (m135), leads the row
    // instead of the action's own document request.
    const stall = stalls[index] ?? null
    const stalledNav = stall !== null
    // The document subresources that never finished inside the navigation the runner reported:
    // the page was waiting on them when the test's budget ran out (m135).
    const stalled = stall?.assets ?? []
    // The same kind of pending asset on a trace the runner does NOT report as a navigation
    // failure (a selector wait that ran out the test budget, an `afterEach`/teardown trace): it is
    // not a cause, and it is still worth naming so the executor does not have to guess (m153).
    const stalledKeys = new Set(stalled.map(requestKey))
    const pendingAssets = item.requests.filter(
      (request) => stalledDocumentSubresource(request) && !stalledKeys.has(requestKey(request)),
    )
    const pendingKeys = new Set(pendingAssets.map(requestKey))
    // A pending asset says nothing about what the action got back, so it never rides the action
    // lead — the honest bucket below names it (m153).
    const stepRequests =
      step !== undefined && !stalledNav
        ? step.requests.filter((request) => !pendingKeys.has(requestKey(request)))
        : []
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
    const budget = stall?.budgetMs ?? null
    let room = MAX_TRACE_NOTE_REQUESTS
    const parts: string[] = []
    if (step !== undefined && !stalledNav) {
      const head = `the test's last action was ${step.api} at ${actionClock(item, step.start)}`
      const pageBefore = step.pageBefore
      const pageAfter = step.pageAfter
      // The action asked the API for nothing and the page ended up on another route: the page is
      // still showing the data it fetched for the route before, which is why the new route's list
      // is wrong (xr-molecule-flash-m163 +10:00 — the note printed "it sent no request" beside
      // "the page then navigated to …", then pointed at a response body that never existed, and
      // the run spent six minutes on markup and CSS).
      const staleRoute =
        stepRequests.length === 0 &&
        pageBefore !== undefined &&
        pageAfter !== undefined &&
        pageBefore !== pageAfter
      if (staleRoute) {
        staleRouteRows += 1
        parts.push(
          `${head}, and it sent no request — the page moved from ${pageBefore} to ${pageAfter}. ` +
            `The page changed route but fetched nothing new, so it is still showing the previous ` +
            `route's data: check how the page reads the route (a param the route does not define ` +
            `is always undefined; a missing effect dependency on the route means the fetch never ` +
            `re-runs), not the markup or the CSS`,
        )
      } else if (stepRequests.length === 0) {
        parts.push(`${head}, and it sent no request`)
      } else {
        const shown = stepRequests.slice(0, room)
        room -= shown.length
        // The response body is the point (m148: the register `POST /api/users` answered 201 and
        // the page rendered signed-out anyway) — printed whatever the status.
        parts.push(
          `${head}, and it sent ${shown.map((request) => requestWithBody(request, TRACE_NOTE_LEAD_GOT_CHARS)).join('; ')}`,
        )
      }
      // What the page did next: a navigation shows in the main frame's URL even when the app moved
      // client-side and the network log recorded no document request.
      if (!staleRoute && pageAfter !== undefined) {
        parts.push(
          pageBefore !== undefined && pageBefore !== pageAfter
            ? `the page then navigated to ${pageAfter}`
            : `the page stayed at ${pageAfter}`,
        )
      }
      // A 4xx on the logout endpoint with the page unmoved is not a backend failure: the auth
      // client swallows the call and clears the session, and the URL can only move if the page
      // navigates itself (xr-molecule-flash-m156 +24:02: the refactor dropped `navigate('/')` and
      // the run went and added a logout route instead).
      const stepLast = stepRequests.length > 0 ? stepRequests[stepRequests.length - 1] : undefined
      if (
        stepLast !== undefined &&
        stepLast.status >= 400 &&
        stepLast.status < 500 &&
        isLogoutRequest(stepLast) &&
        step.pageBefore !== undefined &&
        step.pageAfter !== undefined &&
        step.pageBefore === step.pageAfter
      )
        parts.push(logoutIgnoredSentence(stepLast, step.pageAfter))
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
          `response, still in flight when the ${stall?.reported ?? 'navigation'} wait ran out` +
          (budget === null ? '' : ` of the suite's ${Math.round(budget / 1000)} s per-test budget`),
      )
    }
    if (pendingAssets.length > 0 && room > 0) {
      const shown = pendingAssets.slice(0, room)
      room -= shown.length
      parts.push(
        `had no recorded response when the test ended; that alone does not establish the cause: ` +
          shown.map(requestLabel).join('; '),
      )
    }
    if (unanswered.length > 0 && room > 0) {
      const shown = unanswered.slice(0, room)
      room -= shown.length
      parts.push(
        `no response recorded — still in flight when the test ended, so not a server failure; ` +
          `that alone does not establish the cause: ${shown.map(requestLabel).join('; ')}`,
      )
    }
    if (answered.length > 0 && room > 0) {
      // An action that sent nothing leaves the page's own load as the only requests there are:
      // name them for what they are, not as the action's answer.
      const label =
        step !== undefined && !stalledNav && stepRequests.length === 0
          ? 'also answered (started before the action)'
          : 'answered'
      parts.push(`${label}: ${answered.slice(0, room).map(requestLine).join('; ')}`)
    }
    if (item.console.length > 0)
      parts.push(
        `console: ${item.console
          .slice(0, 2)
          .map((text) => consoleLine(text).slice(0, 160))
          .join(' | ')}`,
      )
    // A request from another browser context the test opened is not the failing action's effect:
    // it is set-up work on a different page, and it is named as such rather than merged into the
    // row (xr-molecule-flash-m160: the helper context's POST /api/articles was printed as the
    // click's effect while the assertion had failed on the profile page).
    const others = (item.otherContexts ?? []).filter((context) => context.requests.length > 0)
    for (const [otherIndex, context] of others.slice(0, 2).entries()) {
      const label =
        otherIndex === 0
          ? 'a second browser context, opened by the test for set-up and not the page the assertion ran on'
          : 'another browser context the test opened'
      parts.push(`${label}: ${context.requests.slice(0, 2).map(requestLine).join('; ')}`)
    }
    rows.push(`  ${index + 1}. ${failureWhereOf(item, failures)} — ${parts.join(' — ')}`)
  }
  // Distinct locations the note did not name: the repeats collapse, so the count is what is left
  // to look at, not how many zips Playwright wrote.
  const distinct = new Set(
    candidates.map((item, index) =>
      item.spec === null ? `#${index}` : failureWhereOf(item, failures),
    ),
  )
  const more =
    distinct.size > traced.length
      ? `\n  … and ${distinct.size - traced.length} more traced failures`
      : ''
  // Every row came from a trace with more than one browser context and no page to tie the
  // assertion to: the note may list the requests, and may not say what action sent them or where
  // "the page" went (m160).
  const allUnattributed = traced.every((item) => item.unattributed === true)
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
  // A navigation the RUNNER reported failing, with a subresource that never got a response, and no
  // transport error: the page was waiting on the asset when the budget ran out. That is the host
  // or the network serving that file, not the app's state — say it before any app-side reading
  // (xr-molecule-flash-m135 +34:10: three deployed goto timeouts on tests passing locally in
  // 1.2-5.6 s, one 88 KB stylesheet fetch measured at 27 s, and the note said "the cause is in
  // the page"). Every traced test must meet the bar; one stalled trace beside a selector-wait
  // failure is not the run's cause (m153).
  const stalledLead =
    transport !== null || stalledAssets.length === 0
      ? ''
      : `Every failure this run traced is a navigation the runner reported failing ` +
        `(${stalledWaits.join(', ')}), and the document's own ` +
        `${stalledAssets.length === 1 ? 'subresource' : 'subresources'} ${stalledAssets.join(', ')} ` +
        `never got a response — the navigation was waiting on ${stalledAssets.length === 1 ? 'it' : 'them'} ` +
        `when the test's budget ran out. That is the host or the network serving the asset, not the ` +
        `app's state or a selector: ` +
        (report.productionBuildAdvised
          ? `the run's own test note already names the next measurement — the same suite against ` +
            `a production build, because the dev server's page load is not the built app's — take ` +
            `that one step first, and come back to the app only if the same navigation times out ` +
            `there too with a stalled asset in the trace.\n\n`
          : `re-run the same tests once, unchanged, against ${target} before editing anything, ` +
            `and if the stall repeats measure that exact fetch ` +
            `(\`curl -o /dev/null -w '%{time_starttransfer} %{time_total}' <url>\`) before ` +
            `treating it as the app's.\n\n`)
  // Every row is a route change that fetched nothing: the cause and the next read are the same
  // for the whole run, and the generic "read the response body" paragraph would point at a
  // response that never existed (xr-molecule-flash-m163 +10:00).
  const everyStaleRoute =
    staleRouteRows > 0 &&
    staleRouteRows === traced.length &&
    !anyFailed &&
    !anyStalled &&
    !allUnattributed &&
    transport === null
  const staleRouteLead = everyStaleRoute
    ? `Every failure this run traced is the same shape: the failing action asked the API for ` +
      `nothing and the page changed route, so the page is still showing the data it fetched for ` +
      `the route before. Read how each page derives its query from the route — a param the route ` +
      `does not define is always undefined, and a missing effect dependency on the route means ` +
      `the fetch never re-runs — before touching the markup or the CSS.\n\n`
    : ''
  // An assertion whose awaited text a same-page API response carried: the fact the run needs
  // first, before any row, is that the value arrived and the page dropped it (m169's missing
  // "trending" came back from GET /api/tags while the sidebar rendered a cut list). Each distinct
  // response is named once; the note makes no claim about which cut did it.
  const missingTexts = [
    ...new Map(
      traced
        .filter((item) => item.missingText !== undefined)
        .map((item) => {
          const missing = item.missingText as TraceMissingText
          return [`${missing.method} ${missing.path}\u0000${missing.text}`, missing] as const
        }),
    ).values(),
  ]
  const missingTextLead =
    missingTexts.length === 0
      ? ''
      : `${missingTexts.slice(0, 2).map(missingTextSentence).join(' ')}\n\n`
  // A write whose answer a later GET of the same resource contradicted: the read route does not
  // see the viewer (m181's `following` — the write answered true, the next profile GET answered
  // false). It reads as a frontend race and is not one, so it leads the note before any row and
  // before the form-reset reading.
  const readContradictions = [
    ...new Map(
      traced
        .filter((item) => item.readContradiction !== undefined)
        .map((item) => {
          const contradiction = item.readContradiction as TraceReadContradiction
          return [
            `${contradiction.field}\u0000${contradiction.write.method} ${contradiction.write.path}`,
            contradiction,
          ] as const
        }),
    ).values(),
  ]
  const readContradictionLead =
    readContradictions.length === 0
      ? ''
      : `${readContradictions.slice(0, 2).map(readContradictionSentence).join(' ')}\n\n`
  // A field the test typed and the page submitted empty: the form re-seeded itself after the
  // typing (m173's Settings race — the deployed URL lands the background session verification
  // later than a local run, and its new user object re-ran the form's seeding effect between the
  // fill and the submit). It is a direct cause of the failing request, so it leads the note.
  const formResets = [
    ...new Map(
      traced
        .map(formResetOf)
        .filter((reset): reset is FormResetEvidence => reset !== null)
        .map(
          (reset) =>
            [`${reset.request.method} ${reset.request.path}\u0000${reset.field}`, reset] as const,
        ),
    ).values(),
  ]
  const formResetLead =
    formResets.length === 0 ? '' : `${formResets.slice(0, 2).map(formResetSentence).join(' ')}\n\n`
  return (
    readContradictionLead +
    formResetLead +
    missingTextLead +
    transportLead +
    setupOriginLead +
    stalledLead +
    staleRouteLead +
    `The platform read the failing tests' own Playwright traces from the run against ${target} ` +
    (allUnattributed
      ? `(what each page sent and got — the requests their contexts recorded, with no claim about ` +
        `which action caused them, then the ones that failed, the ones that got no response, and ` +
        `the last answered ones):\n`
      : `(what each page sent and got — first what the test's last action sent and where the page ` +
        `went next, then the requests that failed, the ones that got no response, and its last ` +
        `answered ones):\n`) +
    `${rows.join('\n')}${more}\n` +
    (anyFailed
      ? everyFailureLacksPrefix
        ? ''
        : onlyLogoutFailures
          ? // The rows already say it: a 4xx on the logout endpoint is ignored by the auth client
            // and the page's own navigation is the missing step. The handler lead would send the
            // run at the backend (m156 +33:52 added a logout route).
            ''
          : everyFailureAuth
            ? // Every failure was a credential refusal: the handler is not the problem, and the
              // auth advice already names what is (m148 was sent to the handler six walks running).
              authAdvice
            : 'A click that changed nothing is usually one of these requests failing, not the selector: ' +
              'read the handler this route reaches in your own source, and stop `catch`-ing the request of a ' +
              'user action silently — log it.' +
              authAdvice
      : anyStalled
        ? report.productionBuildAdvised
          ? 'No listed request failed — none got a 4xx/5xx or a network error — but a navigation ' +
            'the runner reported failing was still waiting on a document subresource that never ' +
            'answered. Do not read this as a page-state bug, and do not re-run the same tests ' +
            'unchanged: the run’s own test note names the production build as the next ' +
            'measurement — take that one step first, and change the app only if the same ' +
            'navigation times out there with no stalled asset in the trace.'
          : 'No listed request failed — none got a 4xx/5xx or a network error — but the document did ' +
            'not finish loading because its own subresource never answered. Do not read this as a ' +
            'page-state bug: re-run these tests against the same URL first, and change the app only ' +
            'if the same navigation times out again with no stalled asset in the trace.'
        : allUnattributed
          ? 'No listed request failed — none got a 4xx/5xx or a network error. The trace held more ' +
            'than one browser context and nothing ties a page to the failing assertion, so no ' +
            'action or URL is attributed here: read the requests above together with the runner’s ' +
            'own failure text to tell which page the test asserted on, and read that page’s state, ' +
            'not the selector.'
          : everyStaleRoute
            ? 'No listed request failed — none got a 4xx/5xx or a network error — and the failing ' +
              'action sent no request at all, so there is no response to read. The page changed ' +
              'route and fetched nothing, which is why it still shows the previous route’s data: ' +
              'fix how the page reads the route, not the selector.'
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
 * The command a Playwright run needs to leave a readable trace behind, when the suite's config
 * would record none.
 *
 * The failing tests' requests are only readable if the run wrote them down (see the module doc),
 * and the config is where the decision about that lives — the platform does not edit the suite's
 * config, so it passes the flag instead, on every Playwright run that starts tests and does not
 * already decide its own `--trace`. That includes the whole-suite proof run, which an earlier
 * version of this function skipped on the reasoning that its flags are graded: the flag changes
 * what is RETAINED, not what passes. `retain-on-failure` keeps the trace only of a test that
 * fails — Playwright records it and deletes it when the test passes (playwright's
 * `_shouldAbandonTrace` unlinks the temporary trace files of a passing test) — so a green proof
 * run keeps nothing extra. A failing one keeps the network log its failures need.
 * xr-molecule-flash-m163 (+24:58) is why the proof run is no longer skipped: its one deployed
 * failure left only an `error-context.md`, the executor spent the next calls hunting a `trace.zip`
 * that could not exist, and then shipped a guessed fix.
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
      `${/trace:/.test(config) ? '' : ' (it sets none)'}, and a failing test's own network log is ` +
      'what the platform reads the cause from. It keeps a trace only for a test that fails, so a ' +
      'green run retains nothing.',
  }
}
