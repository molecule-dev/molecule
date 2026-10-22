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

  it('leaves a file with no cheap parser alone', () => {
    expect(parseCheckCommand('/workspace/config.yaml')).toBeNull()
    expect(parseCheckCommand('/workspace/README.md')).toBeNull()
  })

  it('quotes a config path that needs it', () => {
    const command = parseCheckCommand('/tmp/my app/tsconfig.json')
    expect(command).toContain("'/tmp/my app/tsconfig.json'")
  })
})

/**
 * `tsconfig.json`, `tsconfig.*.json` and the `jsconfig` counterparts are JSONC:
 * `tsc` accepts comments and trailing commas there. The after-write check used
 * strict `JSON.parse` for every `.json` and told the executor a valid config
 * broke every build and test (X0 flash-m436: a commented
 * `tsconfig.conduit-suite.json` cost a corrective rewrite).
 */
describe('parse check treats TypeScript config files as JSONC', () => {
  it('accepts a leading comment and trailing commas in tsconfig.json', () => {
    expect(
      check(
        'tsconfig.json',
        '/** Project config for the Conduit suite. */\n{\n  // strict mode\n  "compilerOptions": { "strict": true, "noUncheckedIndexedAccess": true, },\n}\n',
      ),
    ).toBeNull()
  })

  it('accepts the observed tsconfig.<name>.json shape', () => {
    expect(check('tsconfig.conduit-suite.json', '/* suite */\n{ "include": [], }\n')).toBeNull()
  })

  it('accepts jsconfig.json and jsconfig.<name>.json', () => {
    expect(check('jsconfig.json', '{ // js\n  "compilerOptions": {}, }\n')).toBeNull()
    expect(check('jsconfig.base.json', '{ /* base */ "compilerOptions": {} }\n')).toBeNull()
  })

  it('reports a real diagnostic for a malformed config', () => {
    const problem = check('tsconfig.broken.json', '{ "compilerOptions": { "strict": } }\n')
    expect(problem).toMatch(/^1:\d+: Expression expected\./m)
    expect(problem).toContain('{ "compilerOptions": { "strict": } }')
    expect(problem).toMatch(/\^$/)
  })

  it('keeps strict JSON for package.json and unrelated .json files', () => {
    // Trailing commas and comments are not legal in ordinary JSON, and the
    // check must not become a general comment stripper.
    expect(check('package.json', '{ "name": "app", }\n')).not.toBeNull()
    expect(check('data.json', '// not JSONC here\n{ "a": 1 }\n')).not.toBeNull()
    expect(check('unrelated.json', '{ "a": 1, }\n')).not.toBeNull()
  })

  it('does not mistake a false-positive basename for a config', () => {
    expect(check('not-tsconfig.json', '{ /* no */ "a": 1 }\n')).not.toBeNull()
    expect(check('tsconfig-example.json', '{ /* no */ "a": 1 }\n')).not.toBeNull()
    expect(check('my-tsconfig.json', '{ /* no */ "a": 1 }\n')).not.toBeNull()
  })

  it('still rejects malformed strict JSON', () => {
    expect(check('data.json', '{ "a": 1,, }\n')).not.toBeNull()
  })

  it('treats a missing typescript parser as no check, not broken syntax', () => {
    expect(
      parseCheckProblem({
        stdout: '',
        stderr: "Error: Cannot find module 'typescript'\nRequire stack:",
        exitCode: 1,
      }),
    ).toBeNull()
  })
})
