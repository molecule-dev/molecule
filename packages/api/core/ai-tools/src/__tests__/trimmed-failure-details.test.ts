import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { summarizePlaywrightReport } from '../playwright-report.js'
import { failureBlocks, truncateMiddle } from '../utilities.js'
import { installedPlaywright } from './fixtures/playwright-run.js'

const error = 'Error: expect(locator).toHaveText(expected) failed'
const diagnostics = 'Locator: locator(\'[data-cart-total]\')\nExpected: "$25"\nReceived: "$0"'
function block(n: number, long = false): string {
  return `  ${n}) [chromium] › checkout.spec.ts:${n + 10}:3 › Checkout › total ${n} ─────\n    ${error}\n${long ? '    call detail\n'.repeat(500) : ''}    ${diagnostics}\n`
}
function log(n = 2, long = false): string {
  return `Running ${n} tests using 1 worker\n${'progress\n'.repeat(1500)}${Array.from({ length: n }, (_, i) => block(i + 1, long && i === 0)).join('\n')}  ${n} failed\n${'hurl request passed\n'.repeat(800)}Executed files: 13\nSucceeded files: 13\nFailed files: 0\n`
}
function native(n = 20, long = false): string {
  return JSON.stringify({
    stats: { expected: 0, unexpected: n, skipped: 0, flaky: 0, duration: 1 },
    errors: [],
    suites: [
      {
        title: 'checkout.spec.ts',
        specs: Array.from({ length: n }, (_, i) => ({
          id: `case-${i}`,
          file: 'checkout.spec.ts',
          line: i + 11,
          column: 3,
          title: `total ${i + 1}`,
          tests: [
            {
              projectName: 'chromium',
              status: 'unexpected',
              results: [
                {
                  status: 'failed',
                  errors: [
                    {
                      message: `${error}\n${long ? 'call detail\n'.repeat(500) : ''}${diagnostics}`,
                    },
                  ],
                },
              ],
            },
          ],
        })),
      },
    ],
  })
}

describe('trimmed failure details for ordinary checkout suites', () => {
  it.each(['list', 'line'])(
    'keeps both %s failure bodies before a trailing Hurl run',
    (reporter) => {
      const text = reporter === 'line' ? log().replace(/\n/g, '\u001b[2K\u001b[1G\n') : log()
      const cut = truncateMiddle(text, 8000)
      for (let n = 1; n <= 2; n++)
        expect(cut).toContain(`checkout.spec.ts:${n + 10}:3 › Checkout › total ${n}`)
      expect(cut).toContain(error)
      expect(cut).toContain(diagnostics)
    },
  )
  it('names every failure after the total detail cap is exhausted', () => {
    const cut = truncateMiddle(log(40), 8000)
    for (let n = 1; n <= 40; n++)
      expect(cut).toContain(`checkout.spec.ts:${n + 10}:3 › Checkout › total ${n}`)
    expect(cut).toContain('details omitted')
  })
  it('keeps late locator and expected/received lines in a long single failure', () => {
    const cut = truncateMiddle(log(1, true), 8000)
    expect(cut).toContain(error)
    expect(cut).toContain(diagnostics)
    expect(cut.length).toBeLessThan(8500)
  })
  it('changes nothing when a failing log fits', () => {
    const text = block(1)
    expect(truncateMiddle(text, 8000)).toBe(text)
  })
  it('adds no failure text to passing or non-test numbered output', () => {
    for (const text of [
      'progress\n'.repeat(2000) + '  200 passed',
      '1) install dependencies\n'.repeat(500),
    ]) {
      expect(failureBlocks(text)).toEqual([])
      expect(truncateMiddle(text, 8000)).not.toContain('failure blocks')
    }
  })
  it('keeps all native failure names beyond the report detail cap', () => {
    const report = summarizePlaywrightReport(native(), { path: '/tmp/checkout.json' })
    expect(JSON.stringify(report)).toContain('total 20')
    expect(JSON.stringify(report)).toContain('checkout.spec.ts:30:3')
  })
  it('keeps diagnostic lines in a native error whose call log is long', () => {
    const report = summarizePlaywrightReport(native(1, true), { path: '/tmp/checkout.json' })
    expect(report.failures[0].error).toContain(error)
    expect(report.failures[0].error).toContain(diagnostics)
  })
  it('keeps a native non-Error thrown value', () => {
    const report = JSON.parse(native(1))
    report.suites[0].specs[0].tests[0].results[0].errors = [{ value: 'checkout threw a string' }]
    expect(
      summarizePlaywrightReport(JSON.stringify(report), { path: '/tmp/checkout.json' }).failures[0]
        .error,
    ).toBe('checkout threw a string')
  })
})

describe('repeated cuts retain the failure inventory', () => {
  it('keeps every name even with a tiny progress budget', () => {
    const cut = truncateMiddle(log(3), 80)
    for (let n = 1; n <= 3; n++)
      expect(cut).toContain(`checkout.spec.ts:${n + 10}:3 › Checkout › total ${n}`)
  })
  it('keeps action-timeout locators after a long call log', () => {
    const text = log(1, true).replace(
      diagnostics,
      "Call log:\n  - waiting for locator('[data-pay]')",
    )
    const cut = truncateMiddle(text, 8000)
    expect(cut).toContain("waiting for locator('[data-pay]')")
  })

  it('retains every name even when names alone exceed the character budget', () => {
    const text = log(150)
    const once = truncateMiddle(text, 8000)
    const twice = truncateMiddle(once, 8000)
    for (let n = 1; n <= 150; n++)
      expect(twice).toContain(`checkout.spec.ts:${n + 10}:3 › Checkout › total ${n}`)
    expect(failureBlocks(twice)).toHaveLength(150)
  })
})

describe('native Playwright checkout output', () => {
  it.each(['list', 'line'])(
    'preserves real %s reporter failures before trailing Hurl output',
    (reporter) => {
      const playwright = installedPlaywright()
      if (!playwright) throw new Error('Installed Playwright is required for this regression')
      const dir = mkdtempSync(join(tmpdir(), 'checkout-report-'))
      try {
        symlinkSync(join(playwright.testPackage, '../../..'), join(dir, 'node_modules'))
        writeFileSync(
          join(dir, 'playwright.config.cjs'),
          "module.exports = {testDir:'.',testMatch:'checkout.spec.cjs',workers:1,retries:0};\n",
        )
        writeFileSync(
          join(dir, 'checkout.spec.cjs'),
          `const {test,expect}=require(${JSON.stringify(playwright.testPackage)});\ntest('cart displays its total',()=>{throw new Error(${JSON.stringify(error + '\n' + diagnostics)})});\ntest('checkout updates its total',()=>{expect(1).toBe(2)});\ntest('currency formats',()=>{expect('USD').toBe('USD')});\n`,
        )
        let stdout = ''
        let exitCode = 0
        try {
          stdout = execFileSync(
            playwright.cli,
            ['test', '--config', join(dir, 'playwright.config.cjs'), `--reporter=${reporter},json`],
            {
              cwd: dir,
              env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: join(dir, 'report.json') },
              encoding: 'utf8',
              timeout: 30_000,
              stdio: 'pipe',
            },
          )
        } catch (error) {
          const failure = error as { stdout?: string; stderr?: string; status?: number }
          exitCode = failure.status ?? -1
          stdout = String(failure.stdout ?? '') + String(failure.stderr ?? '')
        }
        expect(exitCode).toBe(1)
        const native = summarizePlaywrightReport(readFileSync(join(dir, 'report.json'), 'utf8'), {
          path: '/tmp/checkout-report.json',
        })
        expect(native.stats).toMatchObject({ expected: 1, unexpected: 2 })
        expect(native.failures).toHaveLength(2)
        const whole =
          stdout +
          '\n' +
          'hurl request passed\n'.repeat(1000) +
          'Executed files: 13\nFailed files: 0\n'
        const cut = truncateMiddle(whole, 8000)
        expect(cut).toContain('cart displays its total')
        expect(cut).toContain('checkout updates its total')
        expect(cut).toContain('checkout.spec.cjs:2')
        for (const line of diagnostics.split('\n')) expect(cut).toContain(line)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    },
    60_000,
  )
})
