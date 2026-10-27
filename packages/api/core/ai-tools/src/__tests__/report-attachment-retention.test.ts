import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  truncateSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import type { PlaywrightRunReport } from '../playwright-report.js'
import {
  MAX_RETAINED_ATTACHMENT_BYTES,
  MAX_RETAINED_RUN_BYTES,
  retainPlaywrightArtifacts,
} from '../report-attachment-retention.js'
import { readPlaywrightRunReport } from '../tools.js'
import { parseTraceArtifacts, traceArtifactsScript } from '../trace-artifacts.js'
import type { ExecutionBackend } from '../types.js'
import { installedPlaywright, runTinyPlaywright } from './fixtures/playwright-run.js'

const cleanup: Array<() => void> = []
afterEach(() => {
  for (const dispose of cleanup.splice(0)) dispose()
})
const backend = {
  readFile: async (path: string): Promise<string> => readFileSync(path, 'utf8'),
  run: async (command: string, options?: Parameters<ExecutionBackend['run']>[1]) => {
    try {
      return {
        stdout: execFileSync('bash', ['-c', command], {
          encoding: 'utf8',
          timeout: options?.timeout,
        }),
        stderr: '',
        exitCode: 0,
      }
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string; status?: number }
      return {
        stdout: String(e.stdout ?? ''),
        stderr: String(e.stderr ?? ''),
        exitCode: e.status ?? 1,
      }
    }
  },
}

function fixture(paths: string[]): PlaywrightRunReport {
  const directory = mkdtempSync(join(tmpdir(), 'report-attachments-'))
  cleanup.push(() => rmSync(directory, { recursive: true, force: true }))
  return {
    status: 'complete',
    path: join(directory, 'known-call.playwright.json'),
    stats: { expected: 0, unexpected: 1, flaky: 0, skipped: 0, durationMs: 1 },
    omittedFailures: 0,
    failures: [
      {
        id: 'inventory',
        project: 'chromium',
        file: 'inventory.spec.ts',
        line: 1,
        column: 1,
        titlePath: ['Inventory', 'detail'],
        title: 'detail',
        status: 'unexpected',
        attempts: 1,
        retry: 0,
        durationMs: 1,
        error: 'failed',
        attachments: paths.map((path) => ({
          name: 'trace',
          path,
          contentType: 'application/zip',
        })),
      },
    ],
  }
}

describe('completed native run attachment ownership', () => {
  it.each(['default', 'custom'] as const)(
    'keeps the failed %s attempt after a later native passing run',
    async (kind) => {
      const first = runTinyPlaywright(`
const fs = require('node:fs');
test('inventory detail', async ({}, info) => {
  if (process.env.ARTIFACT_PASS !== 'yes') {
    const artifact = info.outputPath('detail.txt');
    fs.writeFileSync(artifact, 'evidence from the failing inventory attempt');
    await info.attach('error-context', {path: artifact, contentType: 'text/plain'});
  }
  expect(process.env.ARTIFACT_PASS).toBe('yes');
});`)
      if (!first) throw Error('This native regression requires the workspace Playwright install')
      cleanup.push(first.cleanup)
      const playwright = installedPlaywright()!
      const outputArgs = kind === 'custom' ? ['--output', 'custom inventory artifacts'] : []
      const rerun = (pass: boolean, reportPath: string): number => {
        try {
          execFileSync(
            playwright.cli,
            [
              'test',
              'tiny.spec.js',
              '--reporter=list,json',
              '--retries=0',
              '--workers=1',
              ...outputArgs,
            ],
            {
              cwd: first.dir,
              env: {
                ...process.env,
                ARTIFACT_PASS: pass ? 'yes' : '',
                PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
              },
              encoding: 'utf8',
              timeout: 30_000,
              stdio: 'pipe',
            },
          )
          return 0
        } catch (error) {
          return (error as { status?: number }).status ?? -1
        }
      }
      if (kind === 'custom') expect(rerun(false, first.reportPath)).toBe(1)
      const native = JSON.parse(readFileSync(first.reportPath, 'utf8'))
      if (kind === 'custom')
        expect(native.config.outputDir ?? native.config.projects[0].outputDir).toContain(
          'custom inventory artifacts',
        )
      const published = await readPlaywrightRunReport(backend, first.reportPath, (text) => text)
      const original = native.suites[0].specs[0].tests[0].results[0].attachments[0].path as string
      const retained = published.failures[0].attachments[0].path
      expect(rerun(true, join(first.dir, 'later-call.playwright.json'))).toBe(0)
      expect(existsSync(original)).toBe(false)
      // Load-bearing boundary: the old publisher returns the deleted native path.
      expect(existsSync(retained)).toBe(true)
      expect(readFileSync(retained, 'utf8')).toBe('evidence from the failing inventory attempt')
      expect(
        (await readPlaywrightRunReport(backend, first.reportPath, (text) => text)).failures[0]
          .attachments[0].path,
      ).toBe(retained)
      expect(published.status).toBe('complete')
      expect(published.stats?.unexpected).toBe(1)
    },
    60_000,
  )

  it('keeps a real trace readable in the standard retained per-test layout', async () => {
    const source = mkdtempSync(join(tmpdir(), 'retained-trace-'))
    cleanup.push(() => rmSync(source, { recursive: true, force: true }))
    const file = join(source, 'trace.zip')
    writeFileSync(
      file,
      readFileSync(fileURLToPath(new URL('./fixtures/trace-follow-401.zip', import.meta.url))),
    )
    const retained = await retainPlaywrightArtifacts(backend, fixture([file]))
    rmSync(file)
    const script = join(source, 'read-traces.cjs')
    writeFileSync(script, traceArtifactsScript())
    const items = parseTraceArtifacts(
      execFileSync(process.execPath, [script, retained.artifactRetention!.directory!], {
        encoding: 'utf8',
        timeout: 10_000,
      }),
    )
    expect(items[0]?.dir).toBe('0')
    expect(items[0]?.requests.some((request) => request.status === 401)).toBe(true)
  })

  it('preserves native newest-first trace ordering across retained copies', async () => {
    const source = mkdtempSync(join(tmpdir(), 'retained-trace-order-'))
    cleanup.push(() => rmSync(source, { recursive: true, force: true }))
    const zip = readFileSync(
      fileURLToPath(new URL('./fixtures/trace-follow-401.zip', import.meta.url)),
    )
    const files = [20_000, 10_000, 30_000].map((age, index) => {
      const directory = join(source, String(index))
      mkdirSync(directory)
      const file = join(directory, 'trace.zip')
      writeFileSync(file, zip)
      const stamp = new Date(Date.now() - age)
      utimesSync(file, stamp, stamp)
      return file
    })
    const report = fixture([files[0]])
    report.failures = files.map((path, index) => ({
      ...report.failures[0],
      id: String(index),
      attachments: [{ name: 'trace', path, contentType: 'application/zip' }],
    }))
    const retained = await retainPlaywrightArtifacts(backend, report)
    const script = join(source, 'read-traces.cjs')
    writeFileSync(script, traceArtifactsScript())
    const items = parseTraceArtifacts(
      execFileSync(process.execPath, [script, retained.artifactRetention!.directory!], {
        encoding: 'utf8',
        timeout: 10_000,
      }),
    )
    expect(items.map((item) => item.dir)).toEqual(['1', '0', '2'])
  })

  it('drops missing, symlinked and oversized references without changing the run verdict', async () => {
    const source = mkdtempSync(join(tmpdir(), 'attachment-sources-'))
    cleanup.push(() => rmSync(source, { recursive: true, force: true }))
    writeFileSync(join(source, 'large.zip'), '')
    truncateSync(join(source, 'large.zip'), MAX_RETAINED_ATTACHMENT_BYTES + 1)
    symlinkSync(join(source, 'large.zip'), join(source, 'link.zip'))
    const report = fixture([
      join(source, 'missing.zip'),
      join(source, 'large.zip'),
      join(source, 'link.zip'),
    ])
    const retained = await retainPlaywrightArtifacts(backend, report)
    expect(retained.failures[0].attachments).toEqual([])
    expect(retained.artifactRetention).toMatchObject({
      status: 'partial',
      omittedAttachments: 3,
      bytes: 0,
    })
    expect(retained.stats).toEqual(report.stats)
    expect(retained.status).toBe(report.status)
  })

  it.each([1, null])(
    'publishes no mutable fallback refs for an interrupted/failed copy (%s)',
    async (exitCode) => {
      const retained = await retainPlaywrightArtifacts(
        {
          run: async () => ({
            stdout: '',
            stderr: '',
            exitCode: exitCode as number,
          }),
        },
        fixture(['/tmp/native-trace.zip']),
      )
      expect(retained.failures[0].attachments).toEqual([])
      expect(retained.artifactRetention?.status).toBe('unavailable')
    },
  )

  it('caps total copied bytes across otherwise valid attachments', async () => {
    const source = mkdtempSync(join(tmpdir(), 'retention-total-'))
    cleanup.push(() => rmSync(source, { recursive: true, force: true }))
    const file = join(source, 'trace.zip')
    writeFileSync(file, '')
    truncateSync(file, MAX_RETAINED_ATTACHMENT_BYTES)
    const report = fixture([file])
    report.failures = Array.from({ length: 5 }, (_, index) => ({
      ...report.failures[0],
      id: `inventory-${index}`,
      line: index + 1,
    }))
    const retained = await retainPlaywrightArtifacts(backend, report)
    expect(retained.artifactRetention).toMatchObject({
      status: 'partial',
      omittedAttachments: 1,
      bytes: MAX_RETAINED_RUN_BYTES,
    })
    expect(retained.failures.map((test) => test.attachments.length)).toEqual([1, 1, 1, 1, 0])
  })
})
