import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import { streamingBackgroundCommand } from '../utilities.js'

const roots: string[] = []
afterEach(() =>
  roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })),
)
const context = { approvedExclusions: ['cannot remove [draft]?'] }

describe('request test exclusions apply before the first background walk', () => {
  it('also applies request scope on the foreground execution path', async () => {
    const run = vi.fn(async (_command: string) => ({ stdout: '2 passed', stderr: '', exitCode: 0 }))
    const backend = {
      projectRoot: '/test',
      readFile: vi.fn(async () => {
        throw new Error('ENOENT')
      }),
      readDir: vi.fn(async () => []),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      run,
    } as unknown as ExecutionBackend
    const tools = buildTools(backend, { excludedTestTitles: () => context.approvedExclusions })
    const result = (await tools
      .find((tool) => tool.name === 'exec_command')!
      .execute({ command: 'npx playwright test --reporter=list' })) as { note?: string }
    expect(run.mock.calls.some(([command]) => String(command).includes('--grep-invert'))).toBe(true)
    expect(result.note).toContain('request excludes')
  })
  it.each(['http://localhost:5173', 'https://example.invalid'])(
    'places request scope on %s',
    (url) => {
      const result = streamingBackgroundCommand(
        `BASE_URL=${url} npx playwright test --reporter=line`,
        context,
      )
      expect(result.command).toContain('--grep-invert')
      expect(result.command).toContain('cannot remove \\[draft\\]\\?')
      expect(result.changes.join(' ')).toContain('request excludes')
    },
  )

  it('preserves an existing exclusion instead of replacing its meaning', () => {
    const result = streamingBackgroundCommand("npx playwright test -G 'slow|flaky'", context)
    expect(result.command).toContain('(?:slow|flaky)|')
    expect(result.command).toContain('cannot remove \\[draft\\]\\?')
  })

  it('does not add an exclusion twice when a prepared command is replayed', () => {
    const first = streamingBackgroundCommand('npx playwright test', context)
    const second = streamingBackgroundCommand(first.command, context)
    expect(second.command.match(/--grep-invert/g)).toHaveLength(1)
  })

  it('leaves discovery and commands without request exclusions alone', () => {
    expect(streamingBackgroundCommand('npx playwright test --list', context).command).not.toContain(
      '--grep-invert',
    )
    expect(streamingBackgroundCommand('npx playwright test').command).not.toContain('--grep-invert')
  })

  it('keeps a dynamic existing filter and an opaque shell launcher unchanged', () => {
    expect(
      streamingBackgroundCommand('npx playwright test -G "$FILTER"', context).command,
    ).not.toContain('cannot remove')
    expect(
      streamingBackgroundCommand("sh -c 'npx playwright test'", context).command,
    ).not.toContain('cannot remove')
  })

  it('runs the native suite with exact request exclusions and keeps similar titles', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'request-exclusion-'))
    roots.push(root)
    const require = createRequire(import.meta.url)
    const playwright = path.dirname(require.resolve('playwright/package.json'))
    const modules = path.dirname(
      path.dirname(path.dirname(require.resolve('@playwright/test/package.json'))),
    )
    fs.symlinkSync(modules, path.join(root, 'node_modules'))
    fs.writeFileSync(
      path.join(root, 'scope.spec.cjs'),
      `const { test, expect } = require('@playwright/test')
test('cannot remove [draft]?', () => { throw new Error('the request excludes this case') })
test('cannot remove [draft]? with permission', () => expect(true).toBe(true))
test('ordinary preferences flow', () => expect(true).toBe(true))
test('slow', () => { throw new Error('the caller excludes this case') })`,
    )
    fs.writeFileSync(
      path.join(root, 'playwright.config.cjs'),
      'module.exports = { testDir: __dirname, retries: 0, workers: 1 }',
    )
    const prepared = streamingBackgroundCommand(
      `cd '${root}' && node '${playwright}/cli.js' test -G 'slow'`,
      context,
    )
    expect(prepared.command).toContain('cannot remove')
    const output = execFileSync('sh', ['-c', prepared.command], {
      encoding: 'utf8',
      timeout: 30_000,
    })
    expect(output).toContain('2 passed')
    expect(output).not.toContain('failed')
  })
})
