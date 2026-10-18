/**
 * Reading a failed run's own traces (../trace-artifacts.ts), against a `trace.zip` a real
 * Playwright run produced.
 *
 * The fixture is not synthesised: it is the output of
 * `playwright test --reporter=line` over a one-test suite that clicks a "Follow" button, sends
 * `POST /api/articles/x/favorite`, and gets a 401 from a local server — the shape of X1
 * xr-molecule-flash-m100's `social.spec.ts:22` failure, whose cause the run's result never
 * carried. Every test below runs {@link traceArtifactsScript} under node exactly as the sandbox
 * does (write it to a file, run it against a directory tree) and then parses what it printed, so
 * the zip reader, the NDJSON reading and the note are covered end to end.
 *
 * Without the module this file exists for, no result carries any of it: the harness would find the
 * trace and have nothing that reads it.
 */
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  DIAGNOSIS_TRACE_FLAG,
  diagnosisTraceCommand,
  failureTraceNote,
  MAX_TRACE_NOTE_TESTS,
  MAX_TRACED_BODY_CHARS,
  parseTraceArtifacts,
  suiteRecordsTraces,
  type TraceArtifact,
  traceArtifactsScript,
} from '../trace-artifacts.js'
import { streamingBackgroundCommand } from '../utilities.js'

/** The real trace.zip this module is tested against. */
const FIXTURE = fileURLToPath(new URL('./fixtures/trace-follow-401.zip', import.meta.url))

/**
 * A real trace.zip of a POST answered 422 — xr-molecule-flash-m111's registration shape, where the
 * body the page sent was `{"data":{…}}` and the API validated nothing (`can't be blank`).
 */
const REGISTER_422 = fileURLToPath(new URL('./fixtures/trace-register-422.zip', import.meta.url))

/**
 * A real trace whose one request was still in flight when the test ended: Playwright records it
 * with status `-1` and NO `_failureText`. X1 xr-molecule-flash-m112's note read exactly this as a
 * failed request (`GET /api/tags → -1`) and told the run the click's request had failed (+30:45).
 */
const PENDING_MINUS_ONE = fileURLToPath(
  new URL('./fixtures/trace-pending-minus-one.zip', import.meta.url),
)

/** A real trace of a request refused by the peer: status `-1` WITH `net::ERR_CONNECTION_REFUSED`. */
const NETWORK_ERROR = fileURLToPath(new URL('./fixtures/trace-network-error.zip', import.meta.url))

/**
 * A real trace of a page that made seven requests where the FIRST got a 401: the read keeps the
 * failures at the head of its order, so the 401 must survive the per-trace bound.
 */
const MANY_REQUESTS_401 = fileURLToPath(
  new URL('./fixtures/trace-many-requests-with-401.zip', import.meta.url),
)

/**
 * A real trace of a click whose `fetch` DID send `Authorization: Bearer …` and got a 401 back —
 * the other half of m148's wire: the client attached a token and the SERVER refused it. The
 * header's value in the fixture is a fake (`secret-token-abc123`) so a test can prove the reader
 * carries the scheme word and never the credential.
 */
const BEARER_401 = fileURLToPath(new URL('./fixtures/trace-bearer-401.zip', import.meta.url))

/** A real trace of the same click answered `403` — a permission answer, not a credential one. */
const BEARER_403 = fileURLToPath(new URL('./fixtures/trace-bearer-403.zip', import.meta.url))

/**
 * A real trace whose `Authorization` header carried a value with NO scheme word (the credential
 * pasted straight in). Only the header's PRESENCE may leave the trace — never the value.
 */
const RAW_AUTH_VALUE = fileURLToPath(
  new URL('./fixtures/trace-raw-auth-value.zip', import.meta.url),
)

/** How Playwright names the folder for the fixture's test. */
const FOLDER = 'realworld-social-should-follow-a-user-chromium'

/**
 * A REAL two-browser-context trace — Playwright 1.63's own output for a test that creates its
 * article through a helper context, then navigates the primary page to the profile it asserts on
 * and fails a strict-mode `getByRole('button', { name: 'Follow' })` there (xr-molecule-flash-m160's
 * `social.spec.ts:90`).
 *
 * Its members are re-ordered so the helper context's file FOLLOWS the primary page's in the
 * archive, the order m160's own zip had and the order the old concatenation followed: the last
 * user action of the concatenation was the helper's editor click, the last frame snapshot was
 * `/editor`, and the note called that the failing page.
 */
const TWO_CONTEXT_M160 = fileURLToPath(
  new URL('./fixtures/trace-two-context-m160.zip', import.meta.url),
)

/** A directory that looks like a run's: `<root>/test-results/<test>/trace.zip`. */
const layout = (zips: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), 'mol-traces-'))
  for (const [folder, zip] of Object.entries(zips)) {
    const dir = join(root, 'test-results', folder)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'trace.zip'), execFileSync('cat', [zip]))
  }
  return root
}

/** What {@link traceArtifactsScript} prints for a tree, run the way the sandbox runs it. */
const readTraces = (root: string): string => {
  const script = join(root, 'read-traces.cjs')
  writeFileSync(script, traceArtifactsScript())
  const out = execFileSync('node', [script, root], { encoding: 'utf8', timeout: 30_000 })
  rmSync(script, { force: true })
  return out
}

describe('traceArtifactsScript — a real trace, read headlessly', () => {
  it('prints the failing request and its status', () => {
    const root = layout({ [FOLDER]: FIXTURE })
    try {
      const printed = readTraces(root)
      const line = printed.split('\n').find((l) => l.startsWith('TRACE '))
      expect(line, printed).toBeDefined()
      const artifact = JSON.parse(String(line).slice('TRACE '.length)) as {
        spec: string
        line: number
        requests: Array<{ method: string; path: string; status: number }>
      }
      expect(artifact.spec).toBe('e2e/realworld/social.spec.ts')
      expect(artifact.line).toBeGreaterThan(0)
      expect(artifact.requests[0]).toEqual({
        method: 'POST',
        path: '/api/articles/x/favorite',
        status: 401,
        // The browser's own resource type rides along, so the note can tell the page shell from
        // the test's own API calls (m125 +29:33).
        type: 'fetch',
        // A 4xx also carries what came back (the request itself had no body).
        got: '{"error":"unauthorized"}',
        // The trace's monotonic clock rides with the request, so a pending asset can be told from
        // one that was already in flight before the navigation the runner reported (m153).
        startedAt: expect.any(Number),
        // And the member and page ref it was recorded on: a request belongs to the page that
        // made it, which is what keeps a two-context test's helper requests out of the failing
        // page's row (m160).
        context: expect.any(String),
        pageId: expect.any(String),
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reads the page actions with the trace’s own timing, so a repeated action measures one repeat', () => {
    const root = layout({ [FOLDER]: FIXTURE })
    try {
      const line = readTraces(root)
        .split('\n')
        .find((l) => l.startsWith('TRACE '))
      const raw = JSON.parse(String(line).slice('TRACE '.length)) as {
        actions: Array<{ api: string; start: number; end: number | null }>
      }
      const goto = raw.actions.filter((a) => a.api === 'Frame.goto')
      expect(goto.length).toBeGreaterThan(0)
      // A finished action carries both ends, and the end is after the start.
      expect(goto[0].start).toBeGreaterThan(0)
      expect(Number(goto[0].end)).toBeGreaterThan(goto[0].start)
      // The runner's own hooks and fixtures are not page actions.
      expect(raw.actions.some((a) => a.api.startsWith('Test.'))).toBe(false)
      // And the parsed form keeps it.
      const items = parseTraceArtifacts(line + '\n')
      expect(items[0].actions.length).toBeGreaterThan(0)
      expect(items[0].actions[0].api).toMatch(/^[A-Za-z]+\.[A-Za-z]+$/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('is read into the note the failed run carries, with the request the click sent', () => {
    const root = layout({ [FOLDER]: FIXTURE })
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items).toHaveLength(1)
      const note = failureTraceNote(items, 'https://app.apps.mlcl.dev')
      expect(note).toContain('POST /api/articles/x/favorite → 401')
      expect(note).toContain('e2e/realworld/social.spec.ts:')
      expect(note).toContain('https://app.apps.mlcl.dev')
      // m148 +29:18: the trace proves the request carried no Authorization header, so the note
      // answers on the CLIENT side — the handler is not the problem.
      expect(note).toContain('with NO `Authorization` header')
      expect(note).not.toContain('stop `catch`-ing')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  /**
   * m135's Follow test: the click sent an UNFOLLOW (a `DELETE`, because the page's `following`
   * state was stale) and got a 200 back. The row must lead with that exchange and its response,
   * whether or not the request failed — the result's old rows named only the test's earlier
   * answered requests, so the run never saw the verb the click used.
   */
  it('leads each row with the request the failing step sent, answered or not (m135)', () => {
    const root = layout({ [FOLDER]: FIXTURE })
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items[0].lead).toMatchObject({
        method: 'POST',
        path: '/api/articles/x/favorite',
        status: 401,
        type: 'fetch',
      })
      const row = String(failureTraceNote(items, 'https://app.apps.mlcl.dev'))
        .split('\n')
        .find((line) => /^\s+1\./.test(line))
      // The last action the trace recorded is the click, and the request it caused leads the row.
      expect(row).toContain("the test's last action was Frame.click")
      expect(row).toContain('POST /api/articles/x/favorite → 401')
      // It leads the row once; the buckets below do not repeat it.
      expect(String(row).match(/POST \/api\/articles\/x\/favorite/g)).toHaveLength(1)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('prints the failing step’s ANSWERED response and names a stale click state (m135)', () => {
    const note = String(
      failureTraceNote(
        [
          {
            spec: 'e2e/realworld/social.spec.ts',
            line: 22,
            requests: [{ method: 'GET', path: '/api/profiles/probe2', status: 200, type: 'fetch' }],
            lead: {
              method: 'DELETE',
              path: '/api/profiles/probe2/follow',
              status: 200,
              type: 'fetch',
              got: '{"profile":{"username":"probe2","following":false}}',
            },
            console: [],
          },
        ],
        'the local app',
      ),
    )
    const row = note.split('\n').find((line) => /^\s+1\./.test(line))
    expect(row).toContain(
      'the failing step sent DELETE /api/profiles/probe2/follow → 200 got {"profile":{"username":"probe2","following":false}}',
    )
    expect(note).toContain('the state the action read was stale')
  })

  /**
   * X1 xr-molecule-flash-m111 (+11:36 → +17:55): every frontend POST/PUT shipped `{"data":{…}}`
   * because the app's `api()` helper passed `{ data: body }` as app-http's DATA argument. The run's
   * own trace held the answer — `POST /api/users → 422` plus the body — and status alone said
   * nothing about the wrapping. This fixture is a real Playwright trace of exactly that exchange.
   */
  it('quotes what a 4xx request sent and got, so a wrapped `{"data":…}` body is visible (m111)', () => {
    const root = layout({ 'register-chromium': REGISTER_422 })
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items).toHaveLength(1)
      const post = items[0].requests.find((request) => request.method === 'POST')
      expect(post).toMatchObject({ path: '/api/users', status: 422 })
      expect(post?.sent).toContain('{"data":{"user":')
      expect(post?.sent?.length).toBeLessThanOrEqual(MAX_TRACED_BODY_CHARS)
      expect(post?.got).toContain('"errors"')

      const note = String(failureTraceNote(items, 'app.apps.mlcl.dev'))
      expect(note).toContain('POST /api/users → 422 sent {"data":')
      expect(note).toContain('got {"errors"')
      // The wrapping is named with the call shape that produces it.
      expect(note).toContain('wrapped in `data`')
      expect(note).toContain("post('/users', { user })")
      // The registration body's password is masked in the note (the trace keeps it).
      expect(note).toContain('"password":"[REDACTED]"')
      expect(note).not.toContain('secret-pw')
      expect(post?.sent).toContain('secret-pw')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('keeps no body for a 4xx that carried none, and claims no wrapper', () => {
    const root = layout({ [FOLDER]: FIXTURE })
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items[0].requests[0]?.status).toBe(401)
      expect(items[0].requests[0]?.sent).toBeUndefined()
      const note = String(failureTraceNote(items, 'https://app.apps.mlcl.dev'))
      expect(note).not.toContain(' sent {')
      expect(note).not.toContain('wrapped in `data`')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reads nothing out of a tree that holds no trace', () => {
    const root = mkdtempSync(join(tmpdir(), 'mol-traces-'))
    try {
      mkdirSync(join(root, 'test-results', 'a-test-chromium'), { recursive: true })
      expect(readTraces(root)).toBe('')
      expect(failureTraceNote([], 'https://app.apps.mlcl.dev')).toBeNull()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('skips a trace.zip that is not one instead of failing the read', () => {
    const root = layout({ [FOLDER]: FIXTURE })
    try {
      const broken = join(root, 'test-results', 'broken-chromium')
      mkdirSync(broken, { recursive: true })
      writeFileSync(join(broken, 'trace.zip'), 'not a zip at all')
      const items = parseTraceArtifacts(readTraces(root))
      expect(items).toHaveLength(1)
      expect(items[0].requests[0]?.status).toBe(401)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

/**
 * Playwright's `-1` is "no response recorded", not a status: its HAR entry starts at `-1` and only
 * a response event overwrites it, and a request that FAILED without a response carries its own
 * `_failureText` instead. The five tests below are the note's honesty about that distinction
 * (xr-molecule-flash-m112 +30:45: the note listed only `-1`s and 200s and called them failures).
 */
describe('failureTraceNote — a request with no response is not a failed request', () => {
  it('reads a request left in flight as `-1` with no failure text (m112)', () => {
    const root = layout({ 'pending-chromium': PENDING_MINUS_ONE })
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items).toHaveLength(1)
      expect(items[0].requests[0]).toMatchObject({ status: -1, path: '/api/tags' })
      expect(items[0].requests[0]?.failure).toBeUndefined()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('never prints a `-1` and never calls an unanswered request a failure (m112 +30:45)', () => {
    const root = layout({ 'pending-chromium': PENDING_MINUS_ONE })
    try {
      const items = parseTraceArtifacts(readTraces(root))
      // A trace whose only request got NO response is not a row at all: there is nothing in it
      // the note can explain, and the +53:46 note's five rows were exactly this shape.
      expect(failureTraceNote(items, 'loopcheck-xr-molecule-flash-m112')).toBeNull()

      // Where the same trace also raised a page error it IS a row, and the request is named under
      // what it actually is — never as a `-1` status.
      const note = String(
        failureTraceNote(
          items.map((item) => ({ ...item, console: ['favorite failed'] })),
          'loopcheck-xr-molecule-flash-m112',
        ),
      )
      // The raw trace status is not a status a reader can act on.
      expect(note).not.toMatch(/→ -1/)
      // The request is named, under what it actually is.
      expect(note).toContain('/api/tags')
      expect(note).toContain('no response recorded')
      expect(note).toContain('not a server failure')
      // And the closing line sends the run to the page, not to the API.
      expect(note).not.toContain('usually one of these requests failing')
      expect(note).toContain('No listed request failed')
      expect(note).toContain('the cause is in the page')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reads a refused connection as a real failure, with Playwright’s own error text', () => {
    const root = layout({ 'network-error-chromium': NETWORK_ERROR })
    try {
      const items = parseTraceArtifacts(readTraces(root))
      const refused = items[0].requests.find((request) => request.failure !== undefined)
      expect(refused).toMatchObject({
        status: -1,
        failure: 'net::ERR_CONNECTION_REFUSED',
      })
      // This fixture's refused request IS the page shell's `/sw.js` probe (m125 +29:33): its
      // refusal is not the failing step's dependency, so the note names the console error and not
      // the request — exactly the line that sent a run to write a caching service worker.
      expect(refused?.path.endsWith('/sw.js')).toBe(true)
      const shell = String(failureTraceNote(items, 'the deployed app'))
      expect(shell).not.toContain('/sw.js')
      expect(shell).not.toContain('failed:')
      // A refused request the APP made is still a real failure, with Playwright's own text.
      const app = String(
        failureTraceNote(
          [
            {
              ...items[0],
              requests: [
                {
                  method: 'GET',
                  path: '/api/tags',
                  status: -1,
                  failure: 'net::ERR_CONNECTION_REFUSED',
                },
                { method: 'GET', path: '/', status: 200, type: 'document' },
              ],
            },
          ],
          'the deployed app',
        ),
      )
      expect(app).toContain('failed: GET /api/tags')
      expect(app).toContain('→ no response (net::ERR_CONNECTION_REFUSED)')
      expect(app).not.toContain('not a server failure')
      expect(app).toContain('A click that changed nothing is usually one of these requests failing')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('keeps the failing request a page made before its other requests (m112’s 200-filled rows)', () => {
    const root = layout({ 'many-chromium': MANY_REQUESTS_401 })
    try {
      const items = parseTraceArtifacts(readTraces(root))
      // Seven requests, and the read's bound must keep the 401 rather than the last six answers.
      expect(items[0].requests.map((request) => request.path)).toContain('/api/fail')
      expect(items[0].requests.find((request) => request.path === '/api/fail')?.status).toBe(401)
      const note = String(failureTraceNote(items, 'the deployed app'))
      // The last action caused the 401, so the row leads with the action's requests — the failed
      // one included, once, with its status.
      expect(note).toContain('GET /api/fail → 401')
      const row = String(note.split('\n').find((line) => /^\s+1\./.test(line)))
      expect(row.match(/GET \/api\/fail/g)).toHaveLength(1)
      // Its only failure is a credential refusal, so the closing answer is the client's omission
      // (m148 +29:18), not the handler sentence.
      expect(note).toContain('with NO `Authorization` header')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('splits a row into failures and unanswered requests, and only promises a failure when one is listed', () => {
    // m112's own first row: four page requests, every one `-1` (the page closed under them), plus
    // the app's own answered request. That answer keeps this a row at all (+53:46: a trace of
    // nothing but `-1`s is not one — the note is about what a page sent and got); the `/sw.js` it
    // also recorded is the page shell and no longer counts as that answer (m125 +29:33).
    const m112: TraceArtifact = {
      spec: 'e2e/realworld-specs/url-navigation.spec.ts',
      line: 107,
      requests: [
        { method: 'GET', path: '/sw.js', status: 200 },
        { method: 'GET', path: '/api/user', status: 200 },
        { method: 'GET', path: '/api/articles?limit=20&offset=0', status: -1 },
        { method: 'GET', path: '/api/tags', status: -1 },
        { method: 'GET', path: '/default-avatar.svg', status: -1 },
        {
          method: 'GET',
          path: 'https://code.ionicframework.com/ionicons/2.0.1/fonts/ionicons.ttf?v=2.0.1',
          status: -1,
        },
      ],
      console: [],
    }
    const withoutFailure = String(failureTraceNote([m112], 'the deployed app'))
    expect(withoutFailure).not.toMatch(/→ -1/)
    expect(withoutFailure).not.toContain('failed:')
    expect(withoutFailure).toContain('no response recorded')
    expect(withoutFailure).toContain('No listed request failed')

    // The same row with one real 401: the failure leads, and the closing answer is the click's.
    const withFailure = String(
      failureTraceNote(
        [
          {
            ...m112,
            requests: [
              { method: 'GET', path: '/api/tags', status: 401 },
              ...m112.requests.slice(1),
            ],
          },
        ],
        'the deployed app',
      ),
    )
    expect(withFailure).toContain('failed: GET /api/tags → 401')
    // The one real failure is a credential refusal: the note answers on the client's side (m148).
    expect(withFailure).toContain('with NO `Authorization` header')
    expect(withFailure).not.toContain('No listed request failed')
    expect(withFailure).toContain('no response recorded')
    expect(withFailure).not.toMatch(/→ -1/)
  })
})

/**
 * xr-molecule-flash-m125 (+29:33): the note's item 2 read "no response recorded — still in flight
 * when the test ended … GET /sw.js; GET /fonts/ionicons.woff", and the model answered it by writing
 * a CACHING service worker into the app — in front of `/assets/*`, exactly what makes a redeployed
 * fix invisible to the next proof run. Neither request is the failing step's dependency.
 */
describe('failureTraceNote — the page shell is not the step (xr-molecule-flash-m125)', () => {
  const shellOnly = (requests: TraceArtifact['requests']): TraceArtifact => ({
    spec: 'e2e/null-fields.spec.ts',
    line: 18,
    requests,
    console: [],
  })

  it('never lists a service worker, a font or an asset as a missing response', () => {
    const note = String(
      failureTraceNote(
        [
          shellOnly([
            { method: 'GET', path: '/sw.js', status: -1 },
            { method: 'GET', path: '/fonts/ionicons.woff', status: -1 },
            { method: 'GET', path: '/api/users', status: 200 },
          ]),
        ],
        'the deployed app',
      ),
    )
    expect(note).not.toContain('no response recorded')
    expect(note).not.toContain('/sw.js')
    expect(note).not.toContain('ionicons.woff')
    // The test's own call is still the row.
    expect(note).toContain('GET /api/users → 200')
  })

  it('never calls a 404 on the shell a failure', () => {
    const note = String(
      failureTraceNote(
        [
          shellOnly([
            { method: 'GET', path: '/sw.js', status: 404 },
            { method: 'GET', path: '/manifest.webmanifest', status: 404 },
            { method: 'GET', path: '/favicon.ico', status: 404 },
            { method: 'GET', path: '/api/tags', status: 200 },
          ]),
        ],
        'the deployed app',
      ),
    )
    expect(note).not.toContain('failed:')
    expect(note).not.toContain('/sw.js')
    expect(note).toContain('No listed request failed')
  })

  it('keeps naming the request the failing step depends on', () => {
    const note = String(
      failureTraceNote(
        [
          shellOnly([
            { method: 'GET', path: '/sw.js', status: -1 },
            { method: 'PUT', path: '/api/user', status: 422 },
          ]),
        ],
        'the deployed app',
      ),
    )
    expect(note).toContain('failed: PUT /api/user → 422')
    expect(note).not.toContain('/sw.js')
  })

  it('reads a resource type when the path does not say (an image the page owns)', () => {
    const note = String(
      failureTraceNote(
        [
          shellOnly([
            { method: 'GET', path: '/media/logo', status: -1, type: 'image' },
            { method: 'GET', path: '/api/tags', status: 200 },
          ]),
        ],
        'the deployed app',
      ),
    )
    expect(note).not.toContain('no response recorded')
    expect(note).toContain('GET /api/tags → 200')
  })
})

/**
 * xr-molecule-flash-m118 (+37:09 → +44:23): a `vite preview` walk's 14 failures were all
 * `page.goto` timeouts whose document request had ended `net::ERR_CONTENT_DECODING_FAILED` (a
 * gzipped HTML body the published preview plugin corrupted). The note said nothing about it, and
 * the run spent seven minutes treating a transport failure as app code. A page that never loaded
 * leads with the browser's own line and the document it hit.
 */
describe('failureTraceNote — a page that never loaded (xr-molecule-flash-m118)', () => {
  const timedOut = (path: string, failure?: string): TraceArtifact => ({
    spec: 'url-navigation.spec.ts',
    line: 13,
    requests: [
      {
        method: 'GET',
        path,
        status: -1,
        type: 'document',
        ...(failure === undefined ? {} : { failure }),
      },
      { method: 'GET', path: '/assets/index.js', status: 200 },
    ],
    console:
      failure === undefined ? ['Failed to load resource: net::ERR_CONTENT_DECODING_FAILED'] : [],
    actions: [{ api: 'Frame.goto', start: 1, end: null }],
  })

  it('leads with the transport error and the document it hit', () => {
    const note = String(
      failureTraceNote(
        [timedOut('http://localhost:4173/', 'net::ERR_CONTENT_DECODING_FAILED')],
        'localhost:4173',
      ),
    )
    expect(
      note.startsWith('Every failure this run traced is the same browser TRANSPORT failure'),
    ).toBe(true)
    expect(note).toContain('net::ERR_CONTENT_DECODING_FAILED')
    expect(note).toContain('http://localhost:4173/')
    expect(note).toContain(
      'MOL_E2E_PREVIEW_PLUGIN=0 npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    )
  })

  it('reads the error from the console when the request carried no failure text', () => {
    const note = String(failureTraceNote([timedOut('http://localhost:4173/')], 'localhost:4173'))
    expect(note.startsWith('Every failure this run traced')).toBe(true)
    expect(note).toContain('net::ERR_CONTENT_DECODING_FAILED')
    expect(note).toContain('http://localhost:4173/')
  })

  it('does not lead with it when the page loaded and a request was the failure', () => {
    const loaded: TraceArtifact = {
      spec: 'social.spec.ts',
      line: 6,
      requests: [{ method: 'POST', path: '/api/articles/x/favorite', status: 401 }],
      console: [],
      actions: [{ api: 'Frame.goto', start: 1, end: 9 }],
    }
    const note = String(failureTraceNote([loaded], 'the deployed app'))
    expect(note).not.toContain('TRANSPORT failure')
    expect(note).toContain('POST /api/articles/x/favorite → 401')
  })
})

/**
 * xr-molecule-flash-m148 +29:18: `POST /api/articles/…/favorite → 401
 * {"errors":{"token":["is missing"]}}` was answered with "read the handler this route reaches in
 * your own source" for six local walks. The API's own body says the request arrived with no
 * `Authorization` header — the client's omission, not the handler's. The trace's request record
 * now carries the header's scheme word (never its value), and the note branches on it.
 */
describe('failureTraceNote — which half of the wire refused the request (m148 +29:18)', () => {
  /** The fixture's generated suite: `<root>/test-results/<folder>/trace.zip`. */
  const fixtureNote = (zip: string, folder: string): string => {
    const root = layout({ [folder]: zip })
    try {
      return String(failureTraceNote(parseTraceArtifacts(readTraces(root)), 'the deployed app'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  it('reads a 401 with NO Authorization header as the client not attaching the token', () => {
    const root = layout({ [FOLDER]: FIXTURE })
    try {
      const printed = readTraces(root)
      const items = parseTraceArtifacts(printed)
      const refused = items[0]?.requests.find((request) => request.status === 401)
      // The record says what the request lacked — and keeps nothing that could be a credential.
      expect(refused?.authorization).toBeUndefined()
      expect(refused?.sentAuthorization).toBeUndefined()
      // No header VALUE is ever serialized: only the scheme word, when one parsed.
      expect(printed).not.toMatch(/"authorization":"(?!Bearer|Token|Basic)[^"]+"/i)

      const note = String(failureTraceNote(items, 'https://app.apps.mlcl.dev'))
      expect(note).toContain('with NO `Authorization` header')
      expect(note).toContain('the client did not attach the token')
      expect(note).toContain('the app’s HTTP client that the auth bond configures')
      expect(note).toContain('that the token is stored where the client reads it')
      // The fix the once-only split-store note states, beside the request that proves it.
      expect(note).toContain('setAuthToken')
      expect(note).toContain('The API handler is not the problem.')
      // The handler sentence is the wrong half of the wire and is gone.
      expect(note).not.toContain('read the handler this route reaches')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reads a 401 that carried a Bearer token as the server refusing what it was sent', () => {
    const root = layout({ 'bearer-401-chromium': BEARER_401 })
    try {
      const printed = readTraces(root)
      // Only the scheme word leaves the trace — the fixture's fake token never does.
      expect(printed).not.toContain('secret-token-abc123')
      expect(printed).toContain('"authorization":"Bearer"')
      const items = parseTraceArtifacts(printed)
      expect(
        items[0]?.requests.find(
          (request) => request.status === 401 && request.path === '/api/bearer',
        ),
      ).toMatchObject({ authorization: 'Bearer', sentAuthorization: true })
      expect(
        items[0]?.requests.find(
          (request) => request.status === 401 && request.path === '/api/bearer',
        )?.sentCookie,
      ).toBeUndefined()

      const note = String(failureTraceNote(items, 'the deployed app'))
      expect(note).toContain('with `Authorization: Bearer …`')
      expect(note).toContain('the token was sent and rejected')
      expect(note).toContain('read the verify middleware this route reaches')
      expect(note).not.toContain('with NO `Authorization` header')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('never records a scheme-less Authorization value, and still reads the header as sent', () => {
    const root = layout({ 'raw-auth-chromium': RAW_AUTH_VALUE })
    try {
      const printed = readTraces(root)
      // A value pasted with no scheme is the credential itself: presence is kept, the value is not.
      expect(printed).not.toContain('rawtokenvalue-not-a-scheme')
      expect(printed).not.toContain('rawtokenvalue')
      expect(printed).toContain('"sentAuthorization":true')
      const items = parseTraceArtifacts(printed)
      const refused = items[0]?.requests.find((request) => request.status === 401)
      expect(refused?.sentAuthorization).toBe(true)
      expect(refused?.authorization).toBeUndefined()

      const note = String(failureTraceNote(items, 'the deployed app'))
      expect(note).toContain('with an `Authorization` header')
      expect(note).toContain('the token was sent and rejected')
      expect(note).not.toContain('rawtokenvalue')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('answers a 403 with the route’s permission check, not the handler', () => {
    const note = fixtureNote(BEARER_403, 'bearer-403-chromium')
    expect(note).toContain('the API answered 403')
    expect(note).toContain('with `Authorization: Bearer …`')
    expect(note).toContain('role/permission check')
    expect(note).toContain('the token was accepted but this user may not do it')
    expect(note).not.toContain('read the handler this route reaches')
  })

  it('names the browser’s cookies when a 401 carried them but no Authorization header', () => {
    const note = String(
      failureTraceNote(
        [
          {
            spec: 'e2e/auth.spec.ts',
            line: 4,
            requests: [
              { method: 'GET', path: '/api/user', status: 401, type: 'fetch', sentCookie: true },
            ],
            console: [],
          },
        ],
        'the deployed app',
      ),
    )
    expect(note).toContain('with NO `Authorization` header')
    expect(note).toContain('did carry a `Cookie` header')
  })

  it('keeps the handler sentence for a 422 and for a mixed 401/422 run', () => {
    const register = fixtureNote(REGISTER_422, 'register-chromium')
    expect(register).toContain('read the handler this route reaches')
    expect(register).not.toContain('with NO `Authorization` header')

    const mixed = String(
      failureTraceNote(
        [
          {
            spec: 'e2e/auth.spec.ts',
            line: 9,
            requests: [
              { method: 'POST', path: '/api/articles/x/favorite', status: 401, type: 'fetch' },
              { method: 'POST', path: '/api/users', status: 422, type: 'fetch' },
            ],
            console: [],
          },
        ],
        'the deployed app',
      ),
    )
    // Both are true in a mixed run: the handler sentence stays, and the credential refusal is
    // named beside it.
    expect(mixed).toContain('read the handler this route reaches')
    expect(mixed).toContain('with NO `Authorization` header')
  })

  it('names the setup order when the page logged no client is bonded (m156)', () => {
    // xr-molecule-flash-m156 (+16:15): 14 of 15 failures were one 401 after a reload.
    // The page's own console carried `@molecule/app-http: no client is bonded …` —
    // `setupAuthDefault()` had read `getClient()` before `setupHttpDefault()` ran and
    // mirrored the restored token into a client the scaffold then replaced. The 401
    // sentence names that mechanism instead of leaving the run to re-derive it.
    const traced: TraceArtifact = {
      spec: 'e2e/social.spec.ts',
      line: 12,
      requests: [{ method: 'POST', path: '/api/articles', status: 401, type: 'fetch' }],
      console: [
        '@molecule/app-http: no client is bonded — requests go to the page origin with no "baseURL". Bond one: setClient(createFetchClient({ baseURL: \'/api\' })).',
      ],
      actions: [],
    }

    const note = String(failureTraceNote([traced], 'the deployed app'))
    expect(note).toContain('with NO `Authorization` header')
    expect(note).toContain('The page logged `no client is bonded`')
    expect(note).toContain('call `setupHttpDefault()` before `setupAuthDefault()`')
    expect(note).toContain('read the client per request instead of capturing it at setup')

    // Without the console line the note does not guess at the ordering.
    const withoutConsole = String(
      failureTraceNote([{ ...traced, console: [] }], 'the deployed app'),
    )
    expect(withoutConsole).not.toContain('setupHttpDefault()')
  })
})

/**
 * X0 xr-molecule-flash-m112's +53:46 deployed walk is the case: the note's five rows were
 * `url-navigation.spec.ts:268` and FOUR traces of `:107`'s `afterEach` line, every request `→ -1`,
 * while the favorite cause — `articles.spec.ts:123/:139`, `social.spec.ts:115`, the one failure
 * that repeated in all three walks — sat in "… and 7 more traced failures". The rows are spent on
 * evidence now: a recorded response, deduplicated by location, ranked real-failures-first.
 */
describe('failureTraceNote — the rows it spends (m112 +53:46)', () => {
  /** One of the +53:46 walk's `-1`-only rows: the page closed under every request it made. */
  const teardown = (line: number, paths: readonly string[]): TraceArtifact => ({
    spec: 'e2e/realworld-specs/url-navigation.spec.ts',
    line,
    requests: paths.map((path) => ({ method: 'GET', path, status: -1 })),
    console: [],
  })

  /**
   * The favorite cause's trace: the click's own request was ANSWERED, the button never changed.
   * Declared at `articles.spec.ts:123`; the last traced step (the click) is the line below it.
   */
  const favorite = (line: number, status = 200): TraceArtifact => ({
    spec: 'e2e/realworld-specs/articles.spec.ts',
    line,
    requests: [
      { method: 'GET', path: '/api/articles?limit=10&offset=0', status: 200 },
      { method: 'POST', path: '/api/articles/some-article/favorite', status },
    ],
    console: [],
  })

  it('spends no row on requests that got no response, and shows the cause those rows hid', () => {
    // The walk's +53:46 note, in the order the traces were read (newest first): five rows of
    // `-1`s, then the causes.
    const items: TraceArtifact[] = [
      teardown(268, [
        '/api/articles?limit=10&offset=0',
        '/api/tags',
        '/default-avatar.svg',
        '/index.html',
      ]),
      teardown(107, [
        '/api/articles?limit=10&offset=0',
        '/api/tags',
        '/default-avatar.svg',
        '/logo.svg',
      ]),
      teardown(107, [
        '/logo.svg',
        '/api/articles?limit=10&offset=0',
        '/api/tags',
        '/default-avatar.svg',
      ]),
      teardown(107, [
        '/logo.svg',
        '/api/articles?limit=10&offset=0',
        '/api/tags',
        '/default-avatar.svg',
      ]),
      teardown(107, [
        '/og-image.svg',
        '/api/articles?limit=10&offset=0',
        '/api/tags',
        '/default-avatar.svg',
      ]),
      favorite(133),
      {
        spec: 'e2e/realworld-specs/articles.spec.ts',
        line: 145,
        requests: [{ method: 'POST', path: '/api/articles/some-article/favorite', status: 200 }],
        console: [],
      },
      {
        spec: 'e2e/realworld-specs/social.spec.ts',
        line: 120,
        requests: [{ method: 'GET', path: '/api/profiles/some-user', status: 200 }],
        console: [],
      },
    ]
    const note = String(failureTraceNote(items, 'the deployed app'))
    // Not one `-1`-only trace occupies a row any more (the note had five).
    expect(note).not.toContain('url-navigation.spec.ts')
    expect(note).not.toMatch(/→ -1/)
    // The favorite cause the note hid is in it.
    expect(note).toContain('e2e/realworld-specs/articles.spec.ts:133')
    expect(note).toContain('POST /api/articles/some-article/favorite → 200')
    expect(note).toContain('e2e/realworld-specs/social.spec.ts:120')
    // Every listed request was answered, so the note does not send the run at the API.
    expect(note).toContain('No listed request failed')
    expect(note).not.toContain('usually one of these requests failing')
  })

  it('is null when every trace is `-1` only — there is no request to explain', () => {
    expect(failureTraceNote([teardown(107, ['/api/tags'])], 'the deployed app')).toBeNull()
    expect(
      failureTraceNote([teardown(268, ['/api/tags', '/default-avatar.svg'])], 'the deployed app'),
    ).toBeNull()
  })

  it('orders a real failure first, then a failure an earlier walk repeated, then the rest', () => {
    const oneOff: TraceArtifact = {
      spec: 'e2e/realworld-specs/social.spec.ts',
      line: 120,
      requests: [{ method: 'GET', path: '/api/profiles/some-user', status: 200 }],
      console: [],
    }
    const failing = favorite(150, 500)
    const list = failureTraceNote(
      [oneOff, favorite(133), failing],
      'the deployed app',
      // The previous walk failed the test declared at `articles.spec.ts:123`; this walk's trace
      // of the same test names the step it got to (:133), the click.
      ['/workspace/my-app/app/e2e/realworld-specs/articles.spec.ts:123'],
    )
    const rows = String(list)
      .split('\n')
      .filter((line) => /^\s+\d+\./.test(line))
    // The 500 leads even though its trace was read last.
    expect(rows[0]).toContain('failed: POST /api/articles/some-article/favorite → 500')
    expect(rows[0]).toContain('articles.spec.ts:150')
    // Then the test the previous walk also failed — above the one-off read first.
    expect(rows[1]).toContain('e2e/realworld-specs/articles.spec.ts:133')
    expect(rows[2]).toContain('e2e/realworld-specs/social.spec.ts:120')
  })

  it('does not read a hook line ABOVE an earlier failure as that test', () => {
    // `:107` is the Pagination suite's `afterEach`, shared by every test below it. The earlier
    // walk failed the test declared at `:111`; a line before it is not that test.
    const hook: TraceArtifact = {
      spec: 'e2e/realworld-specs/url-navigation.spec.ts',
      line: 107,
      requests: [{ method: 'GET', path: '/api/tags', status: 200 }],
      console: [],
    }
    const oneOff: TraceArtifact = {
      spec: 'e2e/realworld-specs/social.spec.ts',
      line: 120,
      requests: [{ method: 'GET', path: '/api/profiles/some-user', status: 200 }],
      console: [],
    }
    const rows = String(
      failureTraceNote([oneOff, hook], 'the deployed app', [
        '/workspace/my-app/app/e2e/realworld-specs/url-navigation.spec.ts:111',
      ]),
    )
      .split('\n')
      .filter((line) => /^\s+\d+\./.test(line))
    expect(rows[0]).toContain('social.spec.ts:120')
  })

  it('keeps one row per location, and the copy that carries the real failure', () => {
    const answered: TraceArtifact = {
      spec: 'e2e/realworld-specs/articles.spec.ts',
      line: 123,
      requests: [{ method: 'POST', path: '/api/articles/some-article/favorite', status: 200 }],
      console: [],
    }
    const failed: TraceArtifact = {
      ...answered,
      requests: [{ method: 'POST', path: '/api/articles/some-article/favorite', status: 500 }],
    }
    const note = String(failureTraceNote([answered, failed], 'the deployed app'))
    expect(note.match(/e2e\/realworld-specs\/articles\.spec\.ts:123/g)).toHaveLength(1)
    // The row kept is the one with evidence — not whichever trace was read first.
    expect(note).toContain('failed: POST /api/articles/some-article/favorite → 500')
    expect(note).not.toContain('answered: POST /api/articles/some-article/favorite → 200')
  })
})

describe('failureTraceNote — bounded, and honest about what it has', () => {
  const artifact = (n: number, status = 401): TraceArtifact => ({
    spec: `e2e/spec${n}.spec.ts`,
    line: n,
    requests: [{ method: 'POST', path: `/api/thing${n}`, status }],
    console: [],
  })

  it('names at most the first traces and says how many it left out', () => {
    const items = [1, 2, 3, 4, 5, 6, 7].map((n) => artifact(n))
    const note = String(failureTraceNote(items, 'the deployed URL'))
    expect(note).toContain('e2e/spec1.spec.ts:1')
    expect(note).toContain(`e2e/spec${MAX_TRACE_NOTE_TESTS}.spec.ts`)
    expect(note).not.toContain(`e2e/spec${MAX_TRACE_NOTE_TESTS + 1}.spec.ts`)
    expect(note).toContain('and 2 more traced failures')
  })

  it('is null when no trace held a request or a console error', () => {
    expect(failureTraceNote([{ spec: null, line: 0, requests: [], console: [] }], 'x')).toBeNull()
  })
})

describe('diagnosisTraceCommand — the trace a diagnosis run must record', () => {
  /** The m100 shape: a run narrowed to the failing files, named explicitly. */
  const DIAGNOSIS =
    'cd /workspace/my-app/app && TEST_MODE=fullstack npx playwright test --config e2e/realworld.config.ts ' +
    'e2e/realworld/social.spec.ts:22 --retries=0 --reporter=list'
  /** The proof run: the whole suite, no cap, no named file. */
  const PROOF =
    'cd /workspace/my-app/app && TEST_MODE=fullstack npx playwright test --max-failures=0 ' +
    '--config e2e/realworld.config.ts --retries=0 --reporter=list'
  const config = (text: string) => async (): Promise<string> => text

  it('reads the trace setting of the config the run names, with its spread base', () => {
    expect(suiteRecordsTraces("use: { trace: 'on-first-retry' }")).toBe(false)
    expect(suiteRecordsTraces("use: { trace: 'on' }")).toBe(true)
    expect(suiteRecordsTraces("use: { trace: 'retain-on-failure' }")).toBe(true)
    expect(suiteRecordsTraces("use: { trace: { mode: 'retain-on-failure' } }")).toBe(true)
    expect(suiteRecordsTraces("// trace: 'on'\nuse: {}")).toBe(false)
    expect(suiteRecordsTraces('')).toBe(false)
  })

  it('adds the flag to a diagnosis run whose config records no trace', async () => {
    const out = await diagnosisTraceCommand({
      command: DIAGNOSIS,
      cwd: '/workspace/my-app/app',
      readFile: config("use: { trace: 'on-first-retry' }"),
    })
    // Inside the step, at the end of the RUN's own arguments — where Playwright reads it as its
    // own option, and before any redirection or group closer.
    expect(out.command).toBe(`${DIAGNOSIS} ${DIAGNOSIS_TRACE_FLAG}`)
    expect(out.change).toContain(DIAGNOSIS_TRACE_FLAG)
  })

  it('reads the config through the cd the command does first', async () => {
    const seen: string[] = []
    await diagnosisTraceCommand({
      command: DIAGNOSIS,
      cwd: '/workspace',
      readFile: async (path) => {
        seen.push(path)
        return path === '/workspace/my-app/app/e2e/realworld.config.ts'
          ? "use: { trace: 'on' }"
          : ''
      },
    })
    expect(seen).toContain('/workspace/my-app/app/e2e/realworld.config.ts')
  })

  it('leaves the proof run alone', async () => {
    const out = await diagnosisTraceCommand({
      command: PROOF,
      cwd: '/workspace/my-app/app',
      readFile: config(''),
    })
    expect(out.command).toBe(PROOF)
    expect(out.change).toBeNull()
  })

  it('leaves a run whose config already records traces alone', async () => {
    const out = await diagnosisTraceCommand({
      command: DIAGNOSIS,
      cwd: '/workspace/my-app/app',
      readFile: config("use: { trace: 'retain-on-failure' }"),
    })
    expect(out.change).toBeNull()
  })

  it('never adds a second trace flag, and never touches a non-Playwright command', async () => {
    const already = await diagnosisTraceCommand({
      command: `${DIAGNOSIS} --trace=on`,
      cwd: '/workspace/my-app/app',
      readFile: config(''),
    })
    expect(already.change).toBeNull()
    const vitest = await diagnosisTraceCommand({
      command: 'npx vitest run src/thing.test.ts',
      cwd: '/workspace/my-app/app',
      readFile: config(''),
    })
    expect(vitest.change).toBeNull()
  })

  it('reports the flag without a config to read', async () => {
    const out = await diagnosisTraceCommand({
      command: DIAGNOSIS,
      cwd: '/workspace/my-app/app',
      readFile: async () => {
        throw new Error('no such file')
      },
    })
    expect(out.command).toBe(`${DIAGNOSIS} ${DIAGNOSIS_TRACE_FLAG}`)
  })

  /**
   * m102's two commands, verbatim — the shapes Flash sends for almost every background run: one
   * whose output is cut by `| tail -60`, one that redirects to a log and appends `echo`/`grep`.
   * The flag went to the END of the whole string, so `tail`/`grep` received it and Playwright
   * never did (xr-molecule-flash-m102 +07:40 → +07:53).
   */
  const M102_TAIL =
    'cd /workspace/my-app/app && TEST_MODE=fullstack APP_BASE=http://localhost:5173 npx playwright test ' +
    '--max-failures=15 --config e2e-suite.config.ts --reporter=line 2>&1 | tail -60'
  const M102_LOG =
    'cd /workspace/my-app/app && TEST_MODE=fullstack APP_BASE=http://localhost:5173 npx playwright test ' +
    '--max-failures=15 --config e2e-suite.config.ts --reporter=line > /tmp/pw-run1.log 2>&1; ' +
    'echo "exit=$?"; grep -c "" /tmp/pw-run1.log'

  it('puts the flag in the step a `| tail -60` hangs off, and the tail drop still fires (m102 +07:40)', async () => {
    const traced = await diagnosisTraceCommand({
      command: M102_TAIL,
      cwd: '/workspace/my-app/app',
      readFile: config(''),
    })
    expect(traced.command).toContain(
      `--config e2e-suite.config.ts --reporter=line ${DIAGNOSIS_TRACE_FLAG} 2>&1`,
    )
    expect(traced.command.endsWith('| tail -60')).toBe(true)

    // The rewrite that runs next still finds a TRAILING tail — the shape it drops — and the
    // splices after it still see the Playwright step they expect: one printing reporter, and
    // `--retries=0` for a capped diagnosis run.
    const streamed = streamingBackgroundCommand(traced.command)
    expect(streamed.changes.join(' ')).toContain('Dropped the trailing `| tail -60`')
    expect(streamed.command).not.toContain('tail')
    // The flag is still on the step, not left dangling where the tail was.
    expect(streamed.command).toContain('--trace=retain-on-failure')
    expect(streamed.command).toContain('--config e2e-suite.config.ts --reporter=list')
    expect(streamed.changes.join(' ')).toContain('Switched the test reporters')
    expect(streamed.command).toContain('--retries=0')
  })

  it('leaves the `echo`/`grep` after the step untouched (m102 +07:53)', async () => {
    const traced = await diagnosisTraceCommand({
      command: M102_LOG,
      cwd: '/workspace/my-app/app',
      readFile: config(''),
    })
    expect(traced.command).toContain(
      `--config e2e-suite.config.ts --reporter=line ${DIAGNOSIS_TRACE_FLAG} > /tmp/pw-run1.log 2>&1`,
    )
    expect(traced.command.endsWith('; echo "exit=$?"; grep -c "" /tmp/pw-run1.log')).toBe(true)
    expect(traced.command.match(/--trace=/g)).toHaveLength(1)
    // Nothing in this command is a tail or a last-step Playwright run: the other rewrites make no
    // change, so what bash runs is the spliced command itself.
    expect(streamingBackgroundCommand(traced.command).command).toBe(traced.command)
  })

  /**
   * m105's +08:12 shape: the wrapper config is WRITTEN in the same command, by a heredoc whose
   * first line carries grouping braces, and the run follows on the next line. Locating the step by
   * searching for the re-joined segment text found nothing, so the flag was never added — on the
   * very run whose failing tests someone was about to read a trace for.
   */
  const M105_HEREDOC = `cat > /workspace/.mol-scratch/realworld-e2e/playwright.config.ts <<'EOF'
import { defineConfig, devices } from '@playwright/test'
import { baseConfig } from './playwright.base'

export default defineConfig({ ...baseConfig, use: { ...baseConfig.use, baseURL: 'http://localhost:5173' } })
EOF
cd /workspace/.mol-scratch/realworld-e2e && npx playwright test --config playwright.config.ts e2e/realworld/social.spec.ts:22 --retries=0 2>&1 | tail -60`

  it('finds the step after a heredoc body, and only there (m105 +08:12)', async () => {
    const traced = await diagnosisTraceCommand({
      command: M105_HEREDOC,
      cwd: '/workspace',
      readFile: config(''),
    })
    // The flag is an option of the RUN, at the end of its arguments — never inside the body it
    // writes, and never after the `| tail` that follows it.
    expect(traced.command).toContain(`--retries=0 ${DIAGNOSIS_TRACE_FLAG} 2>&1`)
    expect(traced.command.match(/--trace=/g)).toHaveLength(1)
    // The body is untouched, byte for byte.
    expect(traced.command).toContain("import { defineConfig, devices } from '@playwright/test'")
    expect(traced.command.endsWith('| tail -60')).toBe(true)
  })
})

describe('diagnosisTraceCommand — the rewritten command a real shell runs', () => {
  const config = async (): Promise<string> => ''
  /**
   * Recording stubs for every program m102's commands invoke. Each appends its own name and argv
   * to `$ARGV_LOG.<name>` and exits 0, so running the rewritten command through a real bash says
   * which program received the flag — the only thing this test needs from the sandbox. One file
   * per program: the steps of a pipeline run at the same time, and a shared `>>` log interleaves
   * their writes.
   */
  const stubs = (dir: string): void => {
    for (const name of ['npx', 'tail', 'grep']) {
      writeFileSync(
        join(dir, name),
        '#!/bin/sh\n' +
          `printf '%s' '${name}' >> "$ARGV_LOG.${name}"\n` +
          `for a in "$@"; do printf ' <%s>' "$a" >> "$ARGV_LOG.${name}"; done\n` +
          `printf '\\n' >> "$ARGV_LOG.${name}"\n`,
      )
      chmodSync(join(dir, name), 0o755)
    }
  }
  /** One recorded invocation, as `<name> <arg> <arg>` — or undefined when it never ran. */
  const invocation = (log: string, name: string): string | undefined => {
    try {
      return readFileSync(`${log}.${name}`, 'utf8')
        .split('\n')
        .find((line) => line.length > 0)
    } catch (_error) {
      // The program never ran, so the stub never created its file: there is nothing to read.
      return undefined
    }
  }
  /** A temp directory holding the recording stubs, and the run's own cwd. */
  const sandbox = (): { dir: string; path: string; log: string; cwd: string } => {
    const dir = mkdtempSync(join(tmpdir(), 'mol-trace-argv-'))
    stubs(dir)
    const cwd = join(dir, 'app')
    mkdirSync(cwd)
    return { dir, path: `${dir}:${process.env.PATH ?? ''}`, log: join(dir, 'argv.log'), cwd }
  }
  /** The command as a shell would run it here: only the directory it `cd`s into is this test's. */
  const here = (command: string, cwd: string): string =>
    command.replace('cd /workspace/my-app/app && ', `cd ${cwd} && `)
  const run = (command: string, s: ReturnType<typeof sandbox>): void => {
    execFileSync('bash', ['-c', here(command, s.cwd)], {
      env: { ...process.env, PATH: s.path, ARGV_LOG: s.log },
      cwd: s.cwd,
    })
  }

  it('delivers the flag to playwright and to nobody else, with `| tail -60` behind it', async () => {
    const s = sandbox()
    try {
      const traced = await diagnosisTraceCommand({
        command:
          'cd /workspace/my-app/app && TEST_MODE=fullstack APP_BASE=http://localhost:5173 ' +
          'npx playwright test --max-failures=15 --config e2e-suite.config.ts --reporter=line ' +
          '2>&1 | tail -60',
        cwd: '/workspace/my-app/app',
        readFile: config,
      })
      // The diagnosis output on its own: the tail is still there to be given its own argv.
      run(traced.command, s)
      const playwright = invocation(s.log, 'npx')
      expect(playwright?.split(' ')).toEqual([
        'npx',
        '<playwright>',
        '<test>',
        '<--max-failures=15>',
        '<--config>',
        '<e2e-suite.config.ts>',
        '<--reporter=line>',
        `<${DIAGNOSIS_TRACE_FLAG}>`,
      ])
      // `tail` got its own operand and nothing of Playwright's.
      expect(invocation(s.log, 'tail')).toBe('tail <-60>')

      // The whole production chain: diagnosis, then the streaming rewrite, then bash.
      const after = sandbox()
      try {
        run(streamingBackgroundCommand(traced.command).command, after)
        const streamed = invocation(after.log, 'npx')
        expect(streamed).toContain(`<${DIAGNOSIS_TRACE_FLAG}>`)
        expect(streamed?.match(/--trace=/g)).toHaveLength(1)
        expect(invocation(after.log, 'tail')).toBeUndefined()
      } finally {
        rmSync(after.dir, { recursive: true, force: true })
      }
    } finally {
      rmSync(s.dir, { recursive: true, force: true })
    }
  })

  it('delivers the flag to playwright and to nobody else, with a log and `grep -c` after it', async () => {
    const s = sandbox()
    try {
      const log = join(s.dir, 'pw-run1.log')
      const traced = await diagnosisTraceCommand({
        command:
          'cd /workspace/my-app/app && TEST_MODE=fullstack APP_BASE=http://localhost:5173 ' +
          'npx playwright test --max-failures=15 --config e2e-suite.config.ts --reporter=line ' +
          `> ${log} 2>&1; echo "exit=$?"; grep -c "" ${log}`,
        cwd: '/workspace/my-app/app',
        readFile: config,
      })
      run(traced.command, s)
      const playwright = invocation(s.log, 'npx')
      expect(playwright).toContain(`<${DIAGNOSIS_TRACE_FLAG}>`)
      expect(playwright?.match(/--trace=/g)).toHaveLength(1)
      // `grep` is handed its own words, not Playwright's option.
      expect(invocation(s.log, 'grep')).toBe(`grep <-c> <> <${log}>`)
      expect(invocation(s.log, 'grep')).not.toContain('--trace')
    } finally {
      rmSync(s.dir, { recursive: true, force: true })
    }
  })
})

/**
 * A stored-method (uncompressed) zip built in memory.
 *
 * The reader only needs a central directory and entries it can slice (`zipEntries`/`zipData` in
 * {@link traceArtifactsScript}), so a synthetic `trace.zip` is enough to cover the shape below —
 * and building one by hand keeps the test independent of a browser run that would have to stall
 * a real stylesheet for 27 seconds to produce it.
 */
function storedZip(entries: Record<string, string>): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const [name, text] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name, 'utf8')
    const data = Buffer.from(text, 'utf8')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 8) // stored
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 10) // stored
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, nameBytes, data)
    centrals.push(central, nameBytes)
    offset += local.length + nameBytes.length + data.length
  }
  const centralBytes = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(Object.keys(entries).length, 8)
  eocd.writeUInt16LE(Object.keys(entries).length, 10)
  eocd.writeUInt32LE(centralBytes.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBytes, eocd])
}

/** A trace.zip with a `page.goto` that never ended and a stylesheet that never got a response. */
function stalledNavigationZip(options: { gotoFinished: boolean; withStylesheet: boolean }): Buffer {
  const network = [
    {
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'document',
        _monotonicTime: 150,
        request: { url: 'https://app.apps.mlcl.dev/jobs', method: 'GET' },
        response: { status: 200 },
      },
    },
    ...(options.withStylesheet
      ? [
          {
            type: 'resource-snapshot',
            snapshot: {
              _resourceType: 'stylesheet',
              _monotonicTime: 160,
              request: { url: 'https://app.apps.mlcl.dev/assets/index-abc123.css', method: 'GET' },
              // No response at all: still in flight when the test's budget ran out.
              response: {},
            },
          },
        ]
      : []),
    {
      // The page shell's own probe: noise even when it never answered (m125).
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'script',
        _monotonicTime: 170,
        request: { url: 'https://app.apps.mlcl.dev/sw.js', method: 'GET' },
        response: {},
      },
    },
  ]
  const trace: unknown[] = [
    {
      type: 'before',
      class: 'Frame',
      method: 'goto',
      callId: 'call-1',
      startTime: 100,
      stack: [{ file: 'e2e/navigation.spec.ts', line: 160 }],
    },
  ]
  if (options.gotoFinished) trace.push({ type: 'after', callId: 'call-1', endTime: 250 })
  const ndjson = (rows: unknown[]): string => rows.map((row) => JSON.stringify(row)).join('\n')
  return storedZip({ 'trace.trace': ndjson(trace), 'trace.network': ndjson(network) })
}

/** A run's directory holding one synthetic trace. */
function stalledRun(zip: Buffer): string {
  const root = mkdtempSync(join(tmpdir(), 'mol-traces-'))
  const dir = join(root, 'test-results', 'navigation-should-paginate-chromium')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'trace.zip'), zip)
  return root
}

/**
 * The runner's report for the m135 walk: the test at `e2e/navigation.spec.ts:160` failed on its
 * `page.goto` after the suite's 15 s per-test budget. Without this the note must not call a
 * pending asset the cause — the gate is the runner's own failing operation (m153).
 */
const STALLED_GOTO_REPORT = {
  failures: [
    {
      spec: 'e2e/navigation.spec.ts',
      line: 160,
      operation: 'page.goto',
      budgetMs: 15_000,
    },
  ],
}

describe('traceArtifactsScript — a document subresource that never finished (m135)', () => {
  it('keeps the pending stylesheet of a navigation that never finished, and not the service worker', () => {
    const root = stalledRun(stalledNavigationZip({ gotoFinished: false, withStylesheet: true }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items).toHaveLength(1)
      const paths = items[0].requests.map((request) => request.path)
      expect(paths).toContain('/assets/index-abc123.css')
      // m125: the PWA probe stays out even when it never answered.
      expect(paths).not.toContain('/sw.js')
      expect(items[0].requests.find((r) => r.path.endsWith('.css'))?.status).toBe(0)
      expect(items[0].actions.some((a) => a.api === 'Frame.goto' && a.end === null)).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('names the stalled asset in the note, ahead of any page-state reading', () => {
    const root = stalledRun(stalledNavigationZip({ gotoFinished: false, withStylesheet: true }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      const note = String(
        failureTraceNote(items, 'https://app.apps.mlcl.dev', [], [], STALLED_GOTO_REPORT),
      )
      expect(note).toContain('never finished: GET /assets/index-abc123.css')
      expect(note).toContain('never got a response')
      expect(note).toContain('re-run the same tests once, unchanged')
      // The old reading — "the cause is in the page, not the API" — must not be the conclusion.
      expect(note).not.toContain('the cause is in the page')
      // And the shell probe is never named.
      expect(note).not.toContain('/sw.js')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('treats a pending subresource as evidence only while the navigation is still open', () => {
    const root = stalledRun(stalledNavigationZip({ gotoFinished: true, withStylesheet: true }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      // The goto finished, so a request still in flight at the end is the ordinary aborted noise
      // every finished test leaves (m112 +30:45): no stalled-asset row and no stalled-asset
      // reading, even though the trace holds the same pending CSS.
      const note = String(failureTraceNote(items, 'https://app.apps.mlcl.dev'))
      expect(note).not.toContain('never finished')
      expect(note).not.toContain('never got a response')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('still leads with the stalled asset, never with the action that waited on it', () => {
    // The goto is the test's last action and the document it requested started after it, but the
    // navigation never finished because the CSS never answered: that asset is the row's first
    // fact (deployed-asset-stall), not "the goto sent GET /jobs".
    const root = stalledRun(stalledNavigationZip({ gotoFinished: false, withStylesheet: true }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      const row = String(
        failureTraceNote(items, 'https://app.apps.mlcl.dev', [], [], STALLED_GOTO_REPORT),
      )
        .split('\n')
        .find((line) => /^\s+1\./.test(line))
      expect(row).toContain('never finished: GET /assets/index-abc123.css')
      expect(row).not.toContain("the test's last action")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

/**
 * xr-molecule-flash-m153 (+13:43): the navigation re-run passed its four original failures but
 * failed `url-navigation.spec.ts:206` with `Test timeout of 15000ms exceeded` at a
 * `page.waitForSelector` (`.article-preview`). Its trace carried an open `Frame.goto` and a
 * `/src/components/ArticleBody.tsx` module still pending when the context closed — the teardown
 * trace, placed at `:107`, the Pagination suite's `afterEach`. The note called the pending module
 * the cause and told the run to re-run the same tests unchanged on the same dev server, while the
 * same result's `testRunNote` said "Before changing app code, run the same suite against a
 * production build".
 *
 * The gate is the RUNNER's reported failing operation: a selector wait that spent the test budget
 * is not a navigation, and an `afterEach` trace is not the failing test.
 */
function urlNavigationTeardownZip(): Buffer {
  const network = [
    {
      // An answered app call keeps the trace as evidence, as it was on the real run.
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'fetch',
        _monotonicTime: 80,
        request: { url: 'http://localhost:5173/api/tags', method: 'GET' },
        response: { status: 200 },
      },
    },
    {
      // The dev server's unbundled module, still in flight when the test budget ran out.
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'script',
        _monotonicTime: 120,
        request: { url: 'http://localhost:5173/src/components/ArticleBody.tsx', method: 'GET' },
        response: {},
      },
    },
  ]
  const trace: unknown[] = [
    // The navigation that was open when the test was cut off.
    {
      type: 'before',
      class: 'Frame',
      method: 'goto',
      callId: 'call-goto',
      startTime: 100,
      stack: [
        { file: '/workspace/fixtures/realworld/specs/e2e/url-navigation.spec.ts', line: 221 },
      ],
    },
    // The afterEach hook the trace's last recorded step belongs to (line 107, before the failing
    // test's declaration at 206): `Test` entries are not page actions, only the location.
    {
      type: 'before',
      class: 'Test',
      method: 'afterEach',
      callId: 'call-after',
      startTime: 16_000,
      stack: [
        { file: '/workspace/fixtures/realworld/specs/e2e/url-navigation.spec.ts', line: 107 },
      ],
    },
  ]
  const ndjson = (rows: unknown[]): string => rows.map((row) => JSON.stringify(row)).join('\n')
  return storedZip({ 'trace.trace': ndjson(trace), 'trace.network': ndjson(network) })
}

/** The runner's report for the m153 failure: a selector wait, declared at :206, budget 15 s. */
const WAIT_FOR_SELECTOR_REPORT = {
  failures: [
    {
      spec: 'fixtures/realworld/specs/e2e/url-navigation.spec.ts',
      line: 206,
      operation: 'page.waitForSelector',
      budgetMs: 15_000,
    },
  ],
}

describe('failureTraceNote — a pending asset is not a cause the runner did not report (m153)', () => {
  it('does not turn a selector-wait timeout in an afterEach trace into an asset hang', () => {
    const root = stalledRun(urlNavigationTeardownZip())
    try {
      const items = parseTraceArtifacts(readTraces(root))
      const note = String(
        failureTraceNote(items, 'http://localhost:5173', [], [], WAIT_FOR_SELECTOR_REPORT),
      )
      // The reported operation is a selector wait, and this trace belongs to the afterEach hook —
      // neither the stalled row nor the run-wide asset-hang lead is honest here.
      expect(note).not.toContain('never finished')
      expect(note).not.toContain('Every failure this run traced')
      expect(note).not.toContain('re-run the same tests once, unchanged')
      // The pending module is named for what it is: no evidence of a cause.
      expect(note).toContain('had no recorded response when the test ended')
      expect(note).toContain('that alone does not establish the cause')
      expect(note).toContain('/src/components/ArticleBody.tsx')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('keeps the note silent about a cause when the trace maps to the test but its operation is not a navigation', () => {
    const root = stalledRun(urlNavigationTeardownZip())
    try {
      const items = parseTraceArtifacts(readTraces(root))
      // The SAME trace, placed at the failing test's own last step (221, inside :206's body).
      const atTest = items.map((item) => ({ ...item, line: 221 }))
      const note = String(
        failureTraceNote(atTest, 'http://localhost:5173', [], [], WAIT_FOR_SELECTOR_REPORT),
      )
      expect(note).not.toContain('never finished')
      expect(note).not.toContain('Every failure this run traced')
      expect(note).toContain('that alone does not establish the cause')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('composes ONE next step when the run’s own test note already names a production build', () => {
    const root = stalledRun(stalledNavigationZip({ gotoFinished: false, withStylesheet: true }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      const note = String(
        failureTraceNote(items, 'http://localhost:5173', [], [], {
          ...STALLED_GOTO_REPORT,
          productionBuildAdvised: true,
        }),
      )
      // The stall reading survives, but the same-target unchanged re-run — the opposite of the
      // production-build advice the same result carries — does not.
      expect(note).toContain('never finished: GET /assets/index-abc123.css')
      expect(note).not.toContain('re-run the same tests once, unchanged')
      expect(note).not.toContain('re-run these tests against the same URL first')
      expect(note).toContain('production build')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('says "Every failure" only when every traced test meets the bar', () => {
    const root = stalledRun(stalledNavigationZip({ gotoFinished: false, withStylesheet: true }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      // A second traced test — a selector-wait failure with its own pending module (m153) — means
      // the run is not "every failure a navigation that never finished".
      const selectorTrace = {
        ...items[0],
        spec: 'e2e/url-navigation.spec.ts',
        line: 260,
        actions: [{ api: 'Frame.waitForSelector', start: 9_000, end: null }],
        // A console line keeps this trace a row of its own, the way the real run's own page error
        // did — the point is that it is TRACED and its runner-reported operation is not a
        // navigation.
        console: ['TimeoutError: page.waitForSelector: Timeout 2000ms exceeded'],
        requests: [
          {
            method: 'GET',
            path: '/src/components/ArticleBody.tsx',
            status: 0,
            type: 'script',
            startedAt: 120,
          },
        ],
      }
      const note = String(
        failureTraceNote([...items, selectorTrace], 'http://localhost:5173', [], [], {
          failures: [
            ...(STALLED_GOTO_REPORT.failures ?? []),
            {
              spec: 'e2e/url-navigation.spec.ts',
              line: 240,
              operation: 'page.waitForSelector',
              budgetMs: 15_000,
            },
          ],
        }),
      )
      expect(note).not.toContain('Every failure this run traced')
      // The navigation trace still keeps its own stalled row.
      expect(note).toContain('never finished: GET /assets/index-abc123.css')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

/**
 * xr-molecule-flash-m148 (+17:51 and +21:09): two local walks, 13 then 12 tests red on one cause —
 * the app never showed a signed-in state after register. Every trace row led with the Home page's
 * own `GET /api/tags → 200`, and the register `POST /api/users` (answered 201, with a token) was
 * pushed out by the PWA's `/workbox-*.js` and its `/icons/*.svg`. The trace's own action clock says
 * which requests the test's LAST action caused; those lead, with their response bodies.
 */
function registerWalkZip(options: { actionSendsRequest: boolean }): Buffer {
  const network = [
    {
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'document',
        _monotonicTime: 1000,
        request: { url: 'http://127.0.0.1:5173/register', method: 'GET' },
        response: { status: 200 },
      },
    },
    ...(options.actionSendsRequest
      ? [
          {
            type: 'resource-snapshot',
            snapshot: {
              _resourceType: 'fetch',
              _monotonicTime: 1250,
              request: {
                url: 'http://127.0.0.1:5173/api/users',
                method: 'POST',
                postData: { text: '{"user":{"username":"testuser","password":"secret-pw"}}' },
              },
              response: {
                status: 201,
                content: { text: '{"user":{"username":"testuser","token":"jwt-token-1"}}' },
              },
            },
          },
          {
            // The page the app landed on fetches its own data — the request the old lead chose.
            type: 'resource-snapshot',
            snapshot: {
              _resourceType: 'fetch',
              _monotonicTime: 1300,
              request: { url: 'http://127.0.0.1:5173/api/tags', method: 'GET' },
              response: { status: 200, content: { text: '{"tags":["a","b"]}' } },
            },
          },
        ]
      : [
          {
            // The page's own load, BEFORE the action: not what the action caused.
            type: 'resource-snapshot',
            snapshot: {
              _resourceType: 'fetch',
              _monotonicTime: 900,
              request: { url: 'http://127.0.0.1:5173/api/user', method: 'GET' },
              response: { status: 200, content: { text: '{"user":null}' } },
            },
          },
        ]),
    {
      // The PWA worker's own script and the manifest's splash icons: typed `other`/`fetch` by the
      // shell, so only their paths identify them.
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'other',
        _monotonicTime: 1310,
        request: { url: 'http://127.0.0.1:5173/workbox-d8ed3718.js', method: 'GET' },
        response: { status: 200 },
      },
    },
    {
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'fetch',
        _monotonicTime: 1320,
        request: { url: 'http://127.0.0.1:5173/icons/splash-1125x2436.svg', method: 'GET' },
        response: { status: 200 },
      },
    },
  ]
  const trace: unknown[] = [
    // The page load the test did first; the relative clock is measured from it.
    {
      type: 'before',
      class: 'Frame',
      method: 'goto',
      callId: 'goto-1',
      startTime: 800,
      stack: [{ file: 'e2e/auth.spec.ts', line: 40 }],
    },
    { type: 'after', callId: 'goto-1', endTime: 900 },
    // The submit whose result the failing assertion waits on (auth.spec.ts:63).
    {
      type: 'before',
      class: 'Locator',
      method: 'click',
      callId: 'click-1',
      startTime: 1200,
      stack: [{ file: 'e2e/auth.spec.ts', line: 63 }],
    },
    { type: 'after', callId: 'click-1', endTime: 1240 },
    // The main frame around the action, and where the app ended up.
    {
      type: 'frame-snapshot',
      snapshot: {
        isMainFrame: true,
        frameUrl: options.actionSendsRequest
          ? 'http://127.0.0.1:5173/register'
          : 'http://127.0.0.1:5173/settings',
        timestamp: 1100,
      },
    },
    {
      type: 'frame-snapshot',
      snapshot: {
        isMainFrame: true,
        frameUrl: options.actionSendsRequest
          ? 'http://127.0.0.1:5173/'
          : 'http://127.0.0.1:5173/settings',
        timestamp: 1400,
      },
    },
  ]
  const ndjson = (rows: unknown[]): string => rows.map((row) => JSON.stringify(row)).join('\n')
  return storedZip({ 'trace.trace': ndjson(trace), 'trace.network': ndjson(network) })
}

/** A run's directory holding the register walk's synthetic trace. */
function registerRun(zip: Buffer): string {
  return stalledRun(zip)
}

/**
 * xr-molecule-flash-m148 (+38:21): the app's register flow answered 201, then `@molecule/app-auth`'s
 * refresh timer logged `Token refresh failed, logging out — No refresh token available` at WARNING
 * level and signed the user out. The trace reader kept `error` console entries only, so the note
 * carried the browser's own `Failed to load resource: 401` and never the line that explained it —
 * walks 1–12 were spent on the symptom (a `POST …/favorite → 401`) while the cause sat in every
 * trace's console. This trace is that shape: a real request/action clock and the warning itself.
 */
function consoleLinesZip(lines: { errors?: string[]; warnings?: string[] }): Buffer {
  const network = [
    {
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'document',
        _monotonicTime: 1000,
        request: { url: 'http://127.0.0.1:4173/register', method: 'GET' },
        response: { status: 200 },
      },
    },
    {
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'fetch',
        _monotonicTime: 1250,
        request: { url: 'http://127.0.0.1:4173/api/articles/x/favorite', method: 'POST' },
        response: { status: 401, content: { text: '{"error":"unauthorized"}' } },
      },
    },
  ]
  const consoleLine = (messageType: 'error' | 'warning', text: string, index: number): unknown => ({
    type: 'console',
    messageType,
    text,
    args: [],
    location: { url: 'http://127.0.0.1:4173/', lineNumber: 0, columnNumber: 0 },
    time: 1210 + index,
    pageId: 'page@1',
  })
  const trace: unknown[] = [
    {
      type: 'before',
      class: 'Frame',
      method: 'goto',
      callId: 'goto-1',
      startTime: 800,
      stack: [{ file: 'e2e/auth.spec.ts', line: 40 }],
    },
    { type: 'after', callId: 'goto-1', endTime: 900 },
    {
      type: 'before',
      class: 'Locator',
      method: 'click',
      callId: 'click-1',
      startTime: 1200,
      stack: [{ file: 'e2e/auth.spec.ts', line: 63 }],
    },
    { type: 'after', callId: 'click-1', endTime: 1240 },
    ...(lines.errors ?? []).map((text, index) => consoleLine('error', text, index)),
    ...(lines.warnings ?? []).map((text, index) =>
      consoleLine('warning', text, (lines.errors ?? []).length + index),
    ),
  ]
  const ndjson = (rows: unknown[]): string => rows.map((row) => JSON.stringify(row)).join('\n')
  return storedZip({ 'trace.trace': ndjson(trace), 'trace.network': ndjson(network) })
}

describe('traceArtifactsScript — a console warning the level filter dropped (m148 +38:21)', () => {
  /** The line `@molecule/app-auth` wrote through `logger.warn`, exactly as the page printed it. */
  const LOGOUT =
    'Token refresh failed, logging out I18nError: No refresh token available\n' +
    '    at Object.refresh (http://127.0.0.1:4173/assets/index-Cz-weqOV.js:65:44491)'

  it('keeps the app-auth logout warning, so the failing test’s note quotes it', () => {
    const root = registerRun(consoleLinesZip({ warnings: [LOGOUT] }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items).toHaveLength(1)
      // The reader kept it at warning level, which it used to drop for not being an error.
      expect(items[0].console[0]).toContain('Token refresh failed, logging out')
      const note = String(failureTraceNote(items, 'http://127.0.0.1:4173'))
      const consoleRow = note.split('\n').find((line) => line.includes('console:'))
      expect(consoleRow).toContain('Token refresh failed, logging out')
      expect(consoleRow).toContain('No refresh token available')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('ranks errors, then the session line, then other warnings — bounded per test', () => {
    const noisy = [
      'Warning: Each child in a list should have a unique "key" prop.',
      'The resource http://127.0.0.1:4173/assets/index.js was preloaded using link preload but not used within a few seconds.',
      'Third-party cookie will be blocked.',
      'Deprecated feature used.',
      'Slow network is detected.',
      // Last in the trace, so only the ranking can put it first among the warnings.
      LOGOUT,
    ]
    const root = registerRun(consoleLinesZip({ errors: ['favorite failed 401'], warnings: noisy }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      // The read's own bound (MAX_TRACED_CONSOLE), spent on what ranks highest.
      expect(items[0].console).toHaveLength(4)
      expect(items[0].console[0]).toBe('favorite failed 401')
      expect(items[0].console[1]).toContain('Token refresh failed, logging out')
      const note = String(failureTraceNote(items, 'http://127.0.0.1:4173'))
      const consoleRow = String(note.split('\n').find((line) => line.includes('console:')))
      // The note's existing per-test cap: two console lines, so one separator.
      expect(consoleRow.split(' | ')).toHaveLength(2)
      expect(consoleRow).toContain('favorite failed 401')
      expect(consoleRow).toContain('Token refresh failed, logging out')
      expect(consoleRow).not.toContain('preloaded using link preload')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('traceArtifactsScript — the last action, not the page it landed on (m148)', () => {
  it('leads with the register POST the click sent, not the Home page’s GET /api/tags', () => {
    const root = registerRun(registerWalkZip({ actionSendsRequest: true }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items[0].lastAction).toMatchObject({ api: 'Locator.click' })
      expect(items[0].lastAction?.requests[0]).toMatchObject({
        method: 'POST',
        path: '/api/users',
        status: 201,
      })
      expect(items[0].lastAction?.requests[0]?.got).toContain('"token":"jwt-token-1"')

      const note = String(failureTraceNote(items, 'http://127.0.0.1:5173'))
      const row = note.split('\n').find((line) => /^\s+1\./.test(line))
      expect(row).toContain("the test's last action was Locator.click")
      // The response body leads the row (the note is egress, so the token is masked).
      expect(row).toContain(
        'POST /api/users → 201 sent {"user":{"username":"testuser","password":"[REDACTED]"}} got {"user":{"username":"testuser","token":"[REDACTED]"}}',
      )
      expect(row).not.toContain('jwt-token-1')
      expect(row).not.toContain('secret-pw')
      // The Home page's own fetch is listed after it — and the action's request leads the row.
      expect(row?.indexOf('POST /api/users')).toBeLessThan(row?.indexOf('GET /api/tags') ?? -1)
      expect(row).toContain('GET /api/tags → 200')
      // What the page did next, from the main frame the trace recorded.
      expect(row).toContain('the page then navigated to /')
      // The PWA's own files are not the step's, even though they answer 200.
      expect(note).not.toContain('/workbox-')
      expect(note).not.toContain('/icons/')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('says an action that sent no request, then the page’s own state', () => {
    const root = registerRun(registerWalkZip({ actionSendsRequest: false }))
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items[0].lastAction?.requests).toEqual([])
      const note = String(failureTraceNote(items, 'http://127.0.0.1:5173'))
      const row = note.split('\n').find((line) => /^\s*1\./.test(line))
      expect(row).toContain('and it sent no request')
      expect(row).toContain('the page stayed at /settings')
      // The page's own load, which started before the action, is named for what it is.
      expect(row).toContain('also answered (started before the action)')
      expect(row).toContain('GET /api/user → 200')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

/**
 * m145's walk (+21:18 → +31:08): `main.tsx` stopped calling `setupProviders()`, so the HTTP bond
 * never ran, `getClient()` had no baseURL, and the browser posted `/users` to `vite preview` on
 * `:4173` — which answered 404. The note printed the 404 and told the run to "read the handler
 * this route reaches", which presumes the API saw a request that never reached it. These are that
 * trace's rows.
 */
describe('failureTraceNote — a 404 that never reached the API prefix (m145)', () => {
  const m145 = (path = '/users'): TraceArtifact[] => [
    {
      spec: 'e2e/auth.spec.ts',
      line: 9,
      requests: [
        {
          method: 'POST',
          path,
          status: 404,
          type: 'fetch',
          sent: '{"user":{"username":"testuser"}}',
        },
        { method: 'GET', path: '/workbox-d8ed3718.js', status: 200, type: 'script' },
        { method: 'GET', path: '/icons/splash-1536x2048.svg', status: 200, type: 'image' },
      ],
      console: ['Failed to load resource: the server responded with a status of 404 (Not Found)'],
      actions: [],
    },
  ]

  it('names the missing prefix and the unset client base URL', () => {
    const note = String(failureTraceNote(m145(), 'http://127.0.0.1:4173', [], ['/api']))
    expect(note).toContain('POST /users → 404')
    expect(note).toContain('this request went to `/users` without the `/api` prefix')
    expect(note).toContain("the HTTP client's base URL is not set")
    expect(note).toContain(
      '`setupProviders()` (which runs the HTTP bond setup) called in `main.tsx`',
    )
    // The route advice goes: a request the API never saw has no handler to read.
    expect(note).not.toContain('read the handler this route reaches')
  })

  it('learns the prefix from another request in the same trace, with no literal', () => {
    const items = m145()
    items[0]!.requests.push({ method: 'GET', path: '/api/users', status: 200, type: 'fetch' })
    const note = String(failureTraceNote(items, 'http://127.0.0.1:4173'))
    expect(note).toContain('this request went to `/users` without the `/api` prefix')
  })

  it('says nothing when the path already carries the prefix', () => {
    const note = String(failureTraceNote(m145('/api/users'), 'http://127.0.0.1:4173', [], ['/api']))
    expect(note).not.toContain('without the `/api` prefix')
    // A 404 that DOES carry the prefix keeps the ordinary reading.
    expect(note).toContain('read the handler this route reaches')
  })

  it('says nothing when no prefix is known', () => {
    const note = String(failureTraceNote(m145(), 'http://127.0.0.1:4173'))
    expect(note).not.toContain('without the')
    // Not knowing the prefix leaves the ordinary reading in place — a wrong prefix is worse.
    expect(note).toContain('read the handler this route reaches')
  })

  it('says nothing about a 404 on a document navigation', () => {
    const items = m145('/articles')
    items[0]!.requests[0]!.type = 'document'
    const note = String(failureTraceNote(items, 'http://127.0.0.1:4173', [], ['/api']))
    expect(note).not.toContain('without the `/api` prefix')
  })
})

describe('a 4xx on the logout endpoint with the page unmoved (xr-molecule-flash-m156 +24:02)', () => {
  /** The failing step m156's trace carried: the logout click, its 401, and a page that stayed. */
  const logoutRequest = {
    method: 'POST',
    path: '/api/users/logout',
    status: 401,
    type: 'fetch',
    got: 'Unauthorized',
  } as const
  const logoutTrace = (pageAfter = '/settings'): TraceArtifact => ({
    spec: 'e2e/auth.spec.ts',
    line: 19,
    requests: [{ ...logoutRequest }],
    lastAction: {
      api: 'Frame.click',
      start: 100,
      end: 150,
      requests: [{ ...logoutRequest }],
      pageBefore: '/settings',
      pageAfter,
    },
    console: [],
    actions: [{ api: 'Frame.click', start: 100, end: 150 }],
  })

  it('says the auth client ignores it and the page has to navigate itself', () => {
    const note = String(failureTraceNote([logoutTrace()], 'https://app.apps.mlcl.dev'))
    expect(note).toContain('POST /api/users/logout → 401')
    expect(note).toContain('is ignored by the auth client')
    expect(note).toContain('clears the session in `finally`')
    expect(note).toContain('the page has to navigate itself after `logout()`')
    // The backend is explicitly not the fix (m156 added a logout route and paid a redeploy).
    expect(note).toContain('do not add or change a logout route')
    // The generic 401 reading (the client never attached the token) is not said about a logout.
    expect(note).not.toContain('with NO `Authorization` header')
  })

  it('says nothing when the page moved after the logout', () => {
    const note = String(failureTraceNote([logoutTrace('/')], 'https://app.apps.mlcl.dev'))
    expect(note).toContain('the page then navigated to /')
    expect(note).not.toContain('is ignored by the auth client')
  })

  it('keeps the ordinary 401 reading for a request that is not the logout endpoint', () => {
    const item = logoutTrace()
    item.requests[0]!.path = '/api/user'
    item.lastAction!.requests[0]!.path = '/api/user'
    const note = String(failureTraceNote([item], 'https://app.apps.mlcl.dev'))
    expect(note).not.toContain('is ignored by the auth client')
    expect(note).toContain('with NO `Authorization` header')
  })
})

/**
 * A trace.zip whose page opened Vite's HMR socket and received the error frame that
 * xr-molecule-flash-m157's failure notes cut off: `main.tsx` imported `/styles.css` from
 * `public/`, the dev server answered `GET /src/main.tsx` with 500, and the socket carried
 * `{"type":"error","err":{"message":"Cannot import non-asset file …"}}`. The raw frame's own
 * envelope is ~35 characters, so every note stopped at `{"type":"error","err":{"message":"Cannot…`
 * before the words that name the cause.
 */
function viteHmrErrorZip(): Buffer {
  const network = [
    {
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'document',
        _monotonicTime: 150,
        request: { url: 'http://localhost:5173/register', method: 'GET' },
        response: { status: 200, content: { text: '<!doctype html><html></html>' } },
      },
    },
    {
      type: 'resource-snapshot',
      snapshot: {
        _resourceType: 'websocket',
        _monotonicTime: 160,
        request: { url: 'http://localhost:5173/?token=abc123', method: 'GET' },
        response: { status: 101, content: { _file: 'ws-frames.jsonl' } },
      },
    },
  ]
  const frames = [
    { type: 'send', time: 1, opcode: 1, data: '{"type":"connected"}' },
    {
      type: 'receive',
      time: 2,
      opcode: 1,
      // Exactly the frame m157's trace recorded: Vite's HMR error, with the message, the id of
      // the module it came from, and its location.
      data: JSON.stringify({
        type: 'error',
        err: {
          message:
            'Cannot import non-asset file /styles.css which is inside /public. JS/CSS files ' +
            'inside /public are copied as-is on build and can only be referenced via ' +
            '<script src> or <link href> in html. If you want to get the URL of that file, use ' +
            '/styles.css?url instead.',
          id: '/workspace/my-app/app/src/main.tsx',
          loc: { file: '/workspace/my-app/app/src/main.tsx', line: 1, column: 0 },
        },
      }),
    },
    {
      type: 'receive',
      time: 3,
      opcode: 1,
      // A non-error JSON frame: its envelope would eat the cut too, so the note prints the JSON.
      data: JSON.stringify({
        type: 'update',
        updates: [{ type: 'js-update', path: '/src/App.tsx' }],
      }),
    },
  ]
  const trace = [
    {
      type: 'before',
      class: 'Frame',
      method: 'goto',
      callId: 'call-1',
      startTime: 100,
      stack: [{ file: 'specs/e2e/health.spec.ts', line: 9 }],
    },
    { type: 'after', callId: 'call-1', endTime: 250 },
  ]
  const ndjson = (rows: unknown[]): string => rows.map((row) => JSON.stringify(row)).join('\n')
  return storedZip({
    'trace.trace': ndjson(trace),
    'trace.network': ndjson(network),
    'ws-frames.jsonl': ndjson(frames),
  })
}

describe('traceArtifactsScript — a Vite HMR error frame (xr-molecule-flash-m157)', () => {
  it('quotes err.message instead of cutting the frame’s envelope', () => {
    const root = stalledRun(viteHmrErrorZip())
    try {
      const printed = readTraces(root)
      const line = printed.split('\n').find((l) => l.startsWith('TRACE '))
      expect(line, printed).toBeDefined()
      const artifact = JSON.parse(String(line).slice('TRACE '.length)) as {
        lastAction?: { requests: Array<{ path: string; got?: string }> }
        requests: Array<{ path: string; got?: string }>
      }
      const socket = [...(artifact.lastAction?.requests ?? []), ...artifact.requests].find(
        (request) => request.path.includes('/?token='),
      )
      expect(socket?.got).toContain('vite error: Cannot import non-asset file /styles.css')
      expect(socket?.got).toContain('(id: /workspace/my-app/app/src/main.tsx)')
      expect(socket?.got).toContain('(loc: /workspace/my-app/app/src/main.tsx:1:0)')
      // The non-error JSON frame prints its own data, not its envelope.
      expect(socket?.got).toContain(
        '{"type":"update","updates":[{"type":"js-update","path":"/src/App.tsx"}]}',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('writes the message into the note the failing run carries', () => {
    const root = stalledRun(viteHmrErrorZip())
    try {
      const items = parseTraceArtifacts(readTraces(root))
      const note = String(failureTraceNote(items, 'http://localhost:5173'))
      expect(note).toContain('Cannot import non-asset file /styles.css')
      expect(note).toContain('which is inside /public')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('traceArtifactsScript — the failing assertion’s page, not the archive’s last context (m160)', () => {
  const FOLDER_M160 = 'social-should-view-another-user-profile-chromium'

  it('names the profile page and the strict-mode failure, not the helper context’s /editor', () => {
    const root = layout({ [FOLDER_M160]: TWO_CONTEXT_M160 })
    try {
      const items = parseTraceArtifacts(readTraces(root))
      expect(items).toHaveLength(1)
      const item = items[0]
      // The runner's own failure location — the strict-mode assertion at :90 — not the afterEach's
      // `context.close()` at :13, which the last spec stack used to win.
      expect(item.spec).toBe('e2e/social.spec.ts')
      expect(item.line).toBe(90)
      // The failing page's own last action: the profile navigation. It is LATER on the trace's
      // clock than the helper's editor click, although the helper's member comes later in the zip.
      expect(item.lastAction?.api).toBe('Frame.goto')
      expect(item.lastAction?.pageBefore).toBe('/')
      expect(item.lastAction?.pageAfter).toBe('/profile/alice')
      // The helper context's requests are not the failing action's effects, and its page is not
      // the one the trace says the assertion ran on.
      const stepPaths = (item.lastAction?.requests ?? []).map((request) => request.path)
      expect(stepPaths).not.toContain('/api/articles')
      const paths = item.requests.map((request) => request.path)
      expect(paths).not.toContain('/api/articles')
      expect(paths).not.toContain('/editor')
      expect(paths).toContain('/api/profiles/alice')
      // Every action the row reasons about belongs to the one page on the primary context.
      expect(item.actions.every((action) => action.context === '1')).toBe(true)
      expect(new Set(item.actions.map((action) => action.pageId)).size).toBe(1)
      expect(item.actions.some((action) => action.api === 'Frame.click')).toBe(false)
      // The helper context's evidence is kept, separated and labelled with its context id.
      expect(item.otherContexts).toHaveLength(1)
      expect(item.otherContexts?.[0]?.context).toBe('3')
      expect(
        item.otherContexts?.[0]?.requests.map((request) => `${request.method} ${request.path}`),
      ).toContain('POST /api/articles')

      const note = String(failureTraceNote(items, 'http://127.0.0.1:4173'))
      expect(note).toContain('e2e/social.spec.ts:90')
      expect(note).toContain('the page then navigated to /profile/alice')
      expect(note).toContain('a second browser context')
      expect(note).toContain('POST /api/articles')
      // The old reading: the helper's click was the last action and /editor was where the page
      // "stayed". Neither may be said about the failing page.
      expect(note).not.toContain("the test's last action was Frame.click")
      expect(note).not.toContain('the page stayed at /editor')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('drops the page claim and every causal reading when two contexts leave no page to identify', () => {
    // Two context members, no runner failure and no frame snapshots: nothing says which page the
    // assertion ran on. The reader may not pick the archive's last action or URL, so it makes no
    // causal claim at all — the requests stay as evidence, unattributed.
    const ndjson = (rows: unknown[]): string => rows.map((row) => JSON.stringify(row)).join('\n')
    const zip = storedZip({
      '1-trace.trace': ndjson([
        {
          type: 'before',
          class: 'Frame',
          method: 'goto',
          callId: 'c1',
          startTime: 100,
          stack: [{ file: 'e2e/x.spec.ts', line: 10 }],
        },
      ]),
      '1-trace.network': ndjson([
        {
          type: 'resource-snapshot',
          snapshot: {
            _resourceType: 'fetch',
            _monotonicTime: 120,
            request: { url: 'http://app.test/api/a', method: 'GET' },
            response: { status: 200 },
          },
        },
      ]),
      '2-trace.trace': ndjson([
        {
          type: 'before',
          class: 'Frame',
          method: 'click',
          callId: 'c2',
          startTime: 110,
          stack: [{ file: 'e2e/x.spec.ts', line: 10 }],
        },
      ]),
      '2-trace.network': ndjson([
        {
          type: 'resource-snapshot',
          snapshot: {
            _resourceType: 'fetch',
            _monotonicTime: 130,
            request: { url: 'http://app.test/api/b', method: 'POST' },
            response: { status: 201 },
          },
        },
      ]),
    })
    const root = stalledRun(zip)
    try {
      const item = parseTraceArtifacts(readTraces(root))[0]
      expect(item).toBeDefined()
      expect(item?.lastAction).toBeUndefined()
      expect(item?.lead).toBeUndefined()
      expect((item?.requests ?? []).map((request) => request.path).sort()).toEqual([
        '/api/a',
        '/api/b',
      ])
      const note = String(failureTraceNote(item === undefined ? [] : [item], 'http://app.test'))
      expect(note).not.toContain('the page stayed')
      expect(note).not.toContain("the test's last action")
      expect(note).not.toContain('the failing step sent')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
