/**
 * The parse check `write_file` runs after a write, executed for real: a
 * TypeScript syntax error comes back as `line:column: message`, the offending
 * source line and a caret, so the executor can fix the character instead of
 * re-emitting the file (X1 runs sol-m05, sol-m06 saw only `<stdin>:7:44`).
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { parseCheckCommand, parseCheckProblem } from '../utilities.js'

const dir = mkdtempSync(join(tmpdir(), 'parse-check-'))
afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

const check = (name: string, text: string): string | null => {
  const path = join(dir, name)
  writeFileSync(path, text)
  const command = parseCheckCommand(path)
  if (!command) throw new Error(`${name} is not parse-checkable`)
  // Run from this package so `require('esbuild')` resolves its devDependency.
  const r = spawnSync('sh', ['-c', command], { encoding: 'utf8', cwd: process.cwd() })
  return parseCheckProblem({ stdout: r.stdout, stderr: r.stderr, exitCode: r.status ?? 1 })
}

describe('parse check after write_file', () => {
  it('names the line, shows it, and points at the column', () => {
    const problem = check(
      'Header.tsx',
      "import { x } from './x.js'\nexport const title = 'Conduit\nexport const Header = () => <h1>{title}</h1>\n",
    )
    // esbuild locates an unterminated string at the end of its line.
    expect(problem).toBe(
      `2:30: Unterminated string literal\nexport const title = 'Conduit\n${' '.repeat(29)}^`,
    )
  })

  it('passes a file that parses', () => {
    expect(check('Ok.tsx', 'export const Ok = (n: number) => <b>{n}</b>\n')).toBeNull()
  })

  it('reports JavaScript errors from node --check', () => {
    expect(check('bad.mjs', 'export const a = (\n')).toMatch(/SyntaxError/)
  })
})
