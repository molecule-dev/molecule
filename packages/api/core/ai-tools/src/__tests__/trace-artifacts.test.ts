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
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  DIAGNOSIS_TRACE_FLAG,
  diagnosisTraceCommand,
  failureTraceNote,
  MAX_TRACE_NOTE_TESTS,
  parseTraceArtifacts,
  suiteRecordsTraces,
  type TraceArtifact,
  traceArtifactsScript,
} from '../trace-artifacts.js'

/** The real trace.zip this module is tested against. */
const FIXTURE = fileURLToPath(new URL('./fixtures/trace-follow-401.zip', import.meta.url))

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
      })
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
})
