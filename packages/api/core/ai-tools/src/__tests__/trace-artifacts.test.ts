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

/** How Playwright names the folder for the fixture's test. */
const FOLDER = 'realworld-social-should-follow-a-user-chromium'

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
        // A 4xx also carries what came back (the request itself had no body).
        got: '{"error":"unauthorized"}',
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
      expect(note).toContain('stop `catch`-ing')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
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
      const note = String(failureTraceNote(items, 'the deployed app'))
      // Unlike the aborted request above, this one IS evidence of failure.
      expect(note).toContain('failed: GET http://127.0.0.1:')
      expect(note).toContain('→ no response (net::ERR_CONNECTION_REFUSED)')
      expect(note).not.toContain('not a server failure')
      expect(note).toContain(
        'A click that changed nothing is usually one of these requests failing',
      )
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
      expect(note).toContain('failed: GET /api/fail → 401')
      expect(note).toContain(
        'A click that changed nothing is usually one of these requests failing',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('splits a row into failures and unanswered requests, and only promises a failure when one is listed', () => {
    // m112's own first row, verbatim: four requests, every one `-1` (the page closed under them).
    // One answered request keeps this a row at all (+53:46: a trace of nothing but `-1`s is not
    // one — the note is about what a page sent and got).
    const m112: TraceArtifact = {
      spec: 'e2e/realworld-specs/url-navigation.spec.ts',
      line: 107,
      requests: [
        { method: 'GET', path: '/sw.js', status: 200 },
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
    expect(withFailure).toContain(
      'A click that changed nothing is usually one of these requests failing',
    )
    expect(withFailure).toContain('no response recorded')
    expect(withFailure).not.toMatch(/→ -1/)
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
    expect(note).toContain('MOL_E2E_PREVIEW_PLUGIN=0 npx vite preview --port 4173 --strictPort')
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
    // Inside the step, right after `test` — where Playwright reads it as its own option.
    expect(out.command).toBe(
      DIAGNOSIS.replace('playwright test ', `playwright test ${DIAGNOSIS_TRACE_FLAG} `),
    )
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
    expect(out.command).toBe(
      DIAGNOSIS.replace('playwright test ', `playwright test ${DIAGNOSIS_TRACE_FLAG} `),
    )
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
    expect(traced.command).toContain(`playwright test ${DIAGNOSIS_TRACE_FLAG} --max-failures=15`)
    expect(traced.command.endsWith('| tail -60')).toBe(true)

    // The rewrite that runs next still finds a TRAILING tail — the shape it drops — and the
    // splices after it still see the Playwright step they expect: one printing reporter, and
    // `--retries=0` for a capped diagnosis run.
    const streamed = streamingBackgroundCommand(traced.command)
    expect(streamed.changes.join(' ')).toContain('Dropped the trailing `| tail -60`')
    expect(streamed.command).not.toContain('tail')
    // The flag is still on the step, not left dangling where the tail was.
    expect(streamed.command).toContain(`playwright test ${DIAGNOSIS_TRACE_FLAG} --max-failures=15`)
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
    expect(traced.command).toContain(`playwright test ${DIAGNOSIS_TRACE_FLAG} --max-failures=15`)
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
    // The flag is an option of the RUN, right after `test` — never inside the body it writes.
    expect(traced.command).toContain(`playwright test ${DIAGNOSIS_TRACE_FLAG} --config`)
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
        `<${DIAGNOSIS_TRACE_FLAG}>`,
        '<--max-failures=15>',
        '<--config>',
        '<e2e-suite.config.ts>',
        '<--reporter=line>',
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
