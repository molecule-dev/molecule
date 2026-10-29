/**
 * A failing locator COUNT, read from the trace that already held the answer (xr-molecule-flash-m321).
 *
 * The failing assertion printed only `Expected: 3 / Received: 4`. The helper it came from counted
 * `.card:not(.comment-form) .card-block`, and the app's comment form was a `.comment-form` WRAPPER
 * around a plain `.card`, so the form's own `.card-block` was the fourth match — a fact the run
 * spent ~30 minutes and three whole-suite walks looking for, while the trace held both the locator
 * (`Frame.queryCount`) and the four elements (the failure snapshot).
 *
 * These fixtures are REAL Playwright 1.63 traces of that shape (a static page with three comment
 * cards and a comment-form card), not synthesised JSON: {@link M321} is `locator.count()` followed
 * by `expect(count).toBe(3)`, {@link TO_HAVE} is `expect(locator).toHaveCount(3)`, and
 * {@link ROLE} is `getByRole(...).count()` — the locator a snapshot cannot be replayed with.
 *
 * A `locator.count()` locator is replayed by the project's own installed Playwright: a
 * javascript-disabled, offline, isolated context holds only the recorded snapshot and answers the
 * selector with `document.querySelectorAll`. The positive control is a selector the old hand-written
 * plain-CSS subset rejected (`:is()` and a selector list); another proves a snapshot `<script>` never
 * runs and a snapshot `<img>` never reaches the network.
 *
 * The negative controls REWRITE the real trace's own files: a snapshot whose DOM no longer holds
 * the fourth match, a trace with no snapshots, an unresolvable snapshot reference, a
 * `locator.count()` whose recorded value is not the assertion's `Received:` number, and a project
 * where Playwright cannot be resolved. Each must name NO elements — a reading that guessed there
 * would be worse than the silence it replaces.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  countMismatchNote,
  countMismatchSentence,
  failureTraceNote,
  parseTraceArtifacts,
  type TraceArtifact,
  traceArtifactsScript,
} from '../trace-artifacts.js'

/** The m321 class: `locator.count()` then `expect(count).toBe(3)`. */
const M321 = fileURLToPath(new URL('./fixtures/trace-count-m321.zip', import.meta.url))

/** The same failure asserted with `expect(locator).toHaveCount(3)`. */
const TO_HAVE = fileURLToPath(new URL('./fixtures/trace-count-tohave.zip', import.meta.url))

/** `getByRole('button', { name: 'Post Comment' }).count()` — readable locator, unreplayable one. */
const ROLE = fileURLToPath(new URL('./fixtures/trace-count-role.zip', import.meta.url))

/** How Playwright names each fixture's results folder. */
const FOLDER = 'comments-Comments-should-display-multiple-comments-chromium'

/** What the trace's own failure entry says — the evidence the platform had BEFORE this reading. */
function failureErrorOf(zip: string): string {
  const trace = execFileSync('unzip', ['-p', zip, 'test.trace'], { encoding: 'utf8' })
  for (const line of trace.split('\n')) {
    if (!line) continue
    const entry = JSON.parse(line) as {
      type?: string
      error?: { message?: string }
    }
    if (entry.type === 'after' && typeof entry.error?.message === 'string')
      // Playwright colours the numbers; strip the ANSI, as the reader does.
      return entry.error.message.replace(
        new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'),
        '',
      )
  }
  throw new Error('the fixture carries no failing assertion')
}

/** A directory that looks like a run's: `<root>/test-results/<test>/trace.zip`. */
function layout(zip: string, parent = tmpdir()): string {
  const root = mkdtempSync(join(parent, 'mol-count-traces-'))
  const dir = join(root, 'test-results', FOLDER)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'trace.zip'), execFileSync('cat', [zip]))
  // A rewritten fixture's working directory is scratch: remove it once copied.
  if (zip.includes('mol-count-edit-')) rmSync(dirname(zip), { recursive: true, force: true })
  return root
}

/** How the reader is run: from the project root, or from a directory with no Playwright. */
interface ReadOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  /** Parent for the trace project when the host's temp directory itself belongs to a project. */
  rootParent?: string
}

/** What {@link traceArtifactsScript} prints for a tree, run the way the sandbox runs it. */
function readTraces(root: string, options: ReadOptions = {}): string {
  const script = join(root, 'read-traces.cjs')
  writeFileSync(script, traceArtifactsScript())
  return execFileSync('node', [script, root], {
    encoding: 'utf8',
    timeout: 60_000,
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.env === undefined ? {} : { env: options.env }),
  })
}

/** The first (only) reading a fixture produces. */
function readOne(zip: string, options: ReadOptions = {}): TraceArtifact {
  const root = layout(zip, options.rootParent)
  try {
    const items = parseTraceArtifacts(readTraces(root, options))
    expect(items).toHaveLength(1)
    return items[0]
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

/**
 * The real trace's own files with an edit applied, re-zipped — the negative controls. Only the
 * files a trace archive holds are rewritten; the zip is rebuilt from the edited directory.
 */
function rewritten(zip: string, edit: (files: Map<string, string>) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 'mol-count-edit-'))
  execFileSync('unzip', ['-q', zip, '-d', dir])
  const files = new Map<string, string>()
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.trace') && !name.endsWith('.network')) continue
    files.set(name, readFileSync(join(dir, name), 'utf8'))
  }
  edit(files)
  for (const [name, text] of files) writeFileSync(join(dir, name), text)
  rmSync(join(dir, 'trace.zip'), { force: true })
  execFileSync('zip', ['-q', '-r', 'trace.zip', '.'], { cwd: dir })
  return join(dir, 'trace.zip')
}

/** Replace every occurrence of `from` in the trace files, failing when there was none. */
function replaceInFiles(files: Map<string, string>, from: string, to: string): void {
  let replaced = 0
  for (const [name, text] of files) {
    if (!text.includes(from)) continue
    files.set(name, text.split(from).join(to))
    replaced += text.split(from).length - 1
  }
  expect(replaced).toBeGreaterThan(0)
}

describe('the m321 count assertion — the error itself names no locator', () => {
  it('carries only the two numbers, which is why the trace reading exists', () => {
    const message = failureErrorOf(M321)
    expect(message).toContain('Expected: 3')
    expect(message).toContain('Received: 4')
    // The evidence the platform printed before this reading: no selector, no element.
    expect(message).not.toContain('locator')
    expect(message).not.toContain('.card-block')
  })

  it('is read as the locator the trace recorded and the four elements it matched', () => {
    const item = readOne(M321)
    const reading = item.countMismatch
    expect(reading).toBeDefined()
    expect(reading).toMatchObject({
      locator: "locator('.card:not(.comment-form) .card-block')",
      selector: '.card:not(.comment-form) .card-block',
      expected: 3,
      received: 4,
      source: 'locator-count',
      matchedFrom: 'selector-replay',
      matchedTotal: 4,
    })
    const matches = reading?.matched ?? []
    expect(matches.map((match) => match.text)).toEqual([
      'comment one',
      'comment two',
      'comment three',
      'Post Comment',
    ])
    // The extra match is the form's own card, and its ancestor chain says so.
    expect(matches[3].path).toContain('div.comment-form')
    expect(matches[0].path).toContain('section.comments')
  })

  it('puts the locator and the extra element in the note the run reads', () => {
    const note = failureTraceNote([readOne(M321)], 'https://app.apps.mlcl.dev')
    expect(note).toContain("counted `locator('.card:not(.comment-form) .card-block')`")
    expect(note).toContain('4 matched where 3 were expected')
    expect(note).toContain('`div.card-block` "Post Comment"')
    expect(note).toContain('div.comment-form')
    // The generic "read the response body, not the selector" advice would contradict the reading.
    expect(note).not.toContain('not the selector')
    expect(countMismatchNote([readOne(M321)])).toContain('Every failure here is a')
  })
})

describe('expect(locator).toHaveCount — Playwright marks its own matches', () => {
  it('reads the locator from the assertion and the elements from the snapshot marks', () => {
    const reading = readOne(TO_HAVE).countMismatch
    expect(reading).toMatchObject({
      locator: "locator('.card:not(.comment-form) .card-block')",
      expected: 3,
      received: 4,
      source: 'assertion',
      matchedFrom: 'snapshot-targets',
      matchedTotal: 4,
    })
    expect(reading?.matched?.map((match) => match.text)).toEqual([
      'comment one',
      'comment two',
      'comment three',
      'Post Comment',
    ])
  })
})

describe('the selector is replayed by the browser’s own DOM', () => {
  it('answers a standard selector the old plain-CSS subset rejected', () => {
    // `:is()` and a selector list are standard CSS the previous hand-written parser refused. The
    // same four elements are selected, and the browser's own querySelectorAll is what says so.
    const selector = '.comments :is(.card) .card-block, .comment-form .card-block'
    const zip = rewritten(M321, (files) => {
      replaceInFiles(
        files,
        "locator('.card:not(.comment-form) .card-block')",
        `locator('${selector}')`,
      )
      replaceInFiles(
        files,
        '"selector":".card:not(.comment-form) .card-block"',
        `"selector":"${selector}"`,
      )
    })
    const reading = readOne(zip).countMismatch
    expect(reading).toMatchObject({
      locator: `locator('${selector}')`,
      selector,
      expected: 3,
      received: 4,
      source: 'locator-count',
      matchedFrom: 'selector-replay',
      matchedTotal: 4,
    })
    expect(reading?.matched?.map((match) => match.text)).toEqual([
      'comment one',
      'comment two',
      'comment three',
      'Post Comment',
    ])
  })

  it('never runs a snapshot script or fetches a snapshot resource', async () => {
    const hits: string[] = []
    const server = createServer((request, response) => {
      hits.push(request.url ?? '')
      response.end('x')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const port = (server.address() as AddressInfo).port
      // The snapshot gains a script that would empty the page and an image that would be fetched.
      // JavaScript is disabled and every request is aborted, so both stay inert and the replay
      // still names the four recorded elements.
      //
      // The failure snapshot is the reference `[[2,36]]` into its frame's third-earlier snapshot:
      // 36 is the post-order index of the `HTML` root there. The two inserted elements and the
      // script's text node move that root to 39, so both references (and the 1063 one) are moved
      // with it — an unchanged reference would point at a subtree and the control would prove
      // nothing about scripts.
      const zip = rewritten(M321, (files) => {
        replaceInFiles(
          files,
          '["BODY",{},',
          '["BODY",{},["IMG",{"src":"http://127.0.0.1:' +
            port +
            '/probe.png"}],["SCRIPT",{},"document.querySelectorAll(\'.card-block\')' +
            ".forEach(function (e) { e.className = 'gone' });document.body.remove()\"],",
        )
        replaceInFiles(files, '[[1,36]]', '[[1,39]]')
        replaceInFiles(files, '[[2,36]]', '[[2,39]]')
      })
      const reading = readOne(zip).countMismatch
      expect(reading).toMatchObject({ matchedFrom: 'selector-replay', matchedTotal: 4 })
      expect(reading?.matched?.map((match) => match.text)).toEqual([
        'comment one',
        'comment two',
        'comment three',
        'Post Comment',
      ])
      expect(hits).toEqual([])
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it('reports the elements unavailable when the project has no Playwright, still reading the rest', () => {
    // No Playwright resolvable from the trace root or the working directory: the replay names no
    // elements, says why, and every other fact (here the test's actions) still comes from plain
    // Node. The `toHaveCount` reading is unaffected — its marks need no browser at all.
    // A host may redirect tmpdir() into its workspace (the native runner does). Keep both the
    // trace project and cwd outside that workspace, or their ancestor node_modules is real input.
    const isolated = mkdtempSync('/tmp/mol-no-playwright-')
    const empty = mkdtempSync(join(isolated, 'cwd-'))
    const env = { ...process.env, NODE_PATH: '' }
    try {
      const item = readOne(M321, { cwd: empty, env, rootParent: isolated })
      expect(item.countMismatch).toMatchObject({
        locator: "locator('.card:not(.comment-form) .card-block')",
        selector: '.card:not(.comment-form) .card-block',
        expected: 3,
        received: 4,
        source: 'locator-count',
        unreadable: 'browser-unavailable',
      })
      expect(item.countMismatch?.matched).toBeUndefined()
      expect(item.actions.length).toBeGreaterThan(0)
      expect(countMismatchSentence(item.countMismatch!)).toContain('not available')

      const marked = readOne(TO_HAVE, { cwd: empty, env, rootParent: isolated }).countMismatch
      expect(marked).toMatchObject({ matchedFrom: 'snapshot-targets', matchedTotal: 4 })
    } finally {
      rmSync(isolated, { recursive: true, force: true })
    }
  })
})

describe('a locator the snapshot cannot replay fails closed', () => {
  it('names the readable locator and the count, and says the elements are not available', () => {
    const item = readOne(ROLE)
    expect(item.countMismatch).toMatchObject({
      locator: "getByRole('button', { name: 'Post Comment' })",
      expected: 3,
      received: 1,
      source: 'locator-count',
      unreadable: 'unsupported-selector',
    })
    expect(item.countMismatch?.matched).toBeUndefined()
    const note = failureTraceNote([item], 'https://app.apps.mlcl.dev')
    expect(note).toContain('not the elements it selected')
  })

  it('does not pair a locator.count() whose recorded value is not the assertion’s Received', () => {
    // The trace says the count was 4; a failing assertion that printed Received: 4 is the only
    // one this entry can belong to. Change the recorded value and the reading must disappear.
    const zip = rewritten(M321, (files) => {
      replaceInFiles(files, '"result":{"value":4}', '"result":{"value":7}')
    })
    expect(readOne(zip).countMismatch).toBeUndefined()
  })

  it('does not claim elements when the snapshot does not hold the received count', () => {
    // A snapshot DOM where one of the four matches is no longer a `.card-block`: the selector
    // matches 3, the assertion counted 4. The reading may not invent the element it is missing.
    const zip = rewritten(M321, (files) => {
      replaceInFiles(
        files,
        '{"class":"card-block"},"comment three"',
        '{"class":"card-block-renamed"},"comment three"',
      )
    })
    expect(readOne(zip).countMismatch).toMatchObject({
      expected: 3,
      received: 4,
      unreadable: 'count-mismatch',
    })
  })

  it('names no elements when the failure snapshot reference cannot be resolved', () => {
    // The failure snapshot is a reference into an earlier frame snapshot. Point it past the
    // frame's own list and the tree is incomplete: no element may be named from it.
    const zip = rewritten(M321, (files) => {
      replaceInFiles(files, '[[2,36]]', '[[9,36]]')
    })
    expect(readOne(zip).countMismatch).toMatchObject({
      expected: 3,
      received: 4,
      unreadable: 'no-snapshot',
    })
  })

  it('names no elements when the trace recorded no DOM snapshot', () => {
    const zip = rewritten(M321, (files) => {
      const trace = files.get('1-trace.trace')
      if (trace === undefined) throw new Error('the fixture carries no context trace')
      files.set(
        '1-trace.trace',
        trace
          .split('\n')
          .filter((line) => line && !line.includes('"type":"frame-snapshot"'))
          .join('\n'),
      )
    })
    expect(readOne(zip).countMismatch).toMatchObject({
      expected: 3,
      received: 4,
      unreadable: 'no-snapshot',
    })
  })
})

describe('the parsed reading is fail-closed too', () => {
  const line = (countMismatch: unknown): string =>
    `TRACE ${JSON.stringify({
      dir: 'test-results',
      spec: 'comments.spec.ts',
      line: 86,
      requests: [],
      console: [],
      actions: [],
      countMismatch,
    })}\n`

  it('drops a reading with no locator, a non-numeric count, or an unknown source', () => {
    const readingOf = (countMismatch: unknown) =>
      parseTraceArtifacts(line(countMismatch))[0]?.countMismatch
    expect(readingOf({ expected: 3, received: 4, source: 'assertion' })).toBeUndefined()
    expect(
      readingOf({ locator: 'locator(.x)', expected: '3', received: 4, source: 'assertion' }),
    ).toBeUndefined()
    expect(
      readingOf({ locator: 'locator(.x)', expected: 3, received: 4, source: 'guess' }),
    ).toBeUndefined()
  })

  it('keeps the browser-unavailable reason the reader can explain', () => {
    const [item] = parseTraceArtifacts(
      line({
        locator: "locator('.card')",
        expected: 3,
        received: 4,
        source: 'locator-count',
        unreadable: 'browser-unavailable',
      }),
    )
    expect(item.countMismatch).toMatchObject({
      locator: "locator('.card')",
      unreadable: 'browser-unavailable',
    })
    expect(item.countMismatch?.matched).toBeUndefined()
  })

  it('keeps a valid reading and drops an unreadable reason it cannot explain', () => {
    const [item] = parseTraceArtifacts(
      line({
        locator: "locator('.card')",
        expected: 3,
        received: 4,
        source: 'assertion',
        matched: [{ tag: 'div', classes: 'card' }],
        matchedTotal: 1,
        matchedFrom: 'selector-replay',
        unreadable: 'invented-reason',
      }),
    )
    expect(item.countMismatch).toMatchObject({
      locator: "locator('.card')",
      expected: 3,
      received: 4,
      matched: [{ tag: 'div', classes: 'card' }],
      matchedFrom: 'selector-replay',
    })
    expect(item.countMismatch?.unreadable).toBeUndefined()
  })
})
