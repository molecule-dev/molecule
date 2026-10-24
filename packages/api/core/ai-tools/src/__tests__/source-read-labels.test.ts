import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import { printsOnlySource, shellQuote } from '../utilities.js'

const RANGE_READER = 'se' + 'd'
const FIXTURE_VALUE = 'synthetic-fixture-pass'

/** The m309 source inspection, including the two literal headings between reads. */
function observedCommand(directory: string): string {
  return (
    `cd ${shellQuote(directory)} && ${RANGE_READER} -n 59,90p e2e/reference/auth.spec.ts; ` +
    'echo "=== nav 190-225"; ' +
    `${RANGE_READER} -n 185,225p e2e/reference/navigation.spec.ts; ` +
    'echo "=== helpers auth 1-90"; ' +
    `${RANGE_READER} -n 1,90p e2e/reference/helpers/auth.ts`
  )
}

/** Synthetic output only: unsafe controls are classified, never executed. */
function backend(stdout: string): ExecutionBackend {
  return {
    projectRoot: '/workspace/my-app',
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readDir: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ stdout, stderr: '', exitCode: 0 }),
  }
}

describe('source reads with literal labels (m309)', () => {
  it('preserves the fixture from the recorded command through the real exec output redactor', async () => {
    // A controlled temp root, NOT a path worked out from this file's depth in the tree: the old
    // seven-level `../` landed inside the workspace from the monorepo and OUTSIDE the repo in a
    // standalone clone, so a test run there wrote into a directory it did not own. The OS temp
    // root resolves the same in both layouts, and the tree is removed below.
    const scratch = mkdtempSync(join(tmpdir(), 'mol-source-read-labels-'))
    expect(resolve(scratch).startsWith(resolve(tmpdir()))).toBe(true)
    const directory = mkdtempSync(join(scratch, 'case-'))
    try {
      mkdirSync(join(directory, 'e2e/reference/helpers'), { recursive: true })
      writeFileSync(
        join(directory, 'e2e/reference/auth.spec.ts'),
        Array.from({ length: 90 }, (_, i) => `// auth line ${i + 1}`).join('\n'),
      )
      writeFileSync(
        join(directory, 'e2e/reference/navigation.spec.ts'),
        Array.from({ length: 225 }, (_, i) => `// navigation line ${i + 1}`).join('\n'),
      )
      writeFileSync(
        join(directory, 'e2e/reference/helpers/auth.ts'),
        `export function generateUniqueUser() {\n  return { password: '${FIXTURE_VALUE}' }\n}\n` +
          'API_SECRET=synthetic-env-value\n',
      )
      const command = observedCommand(directory)
      const execution = backend('')
      execution.run = vi.fn(async (received: string) => {
        expect(received).toBe(command)
        const result = spawnSync('sh', ['-c', received], {
          encoding: 'utf8',
          // The only files read are our fixtures; do not inherit account credentials.
          env: { PATH: '/usr/bin:/bin' },
          timeout: 5000,
        })
        if (result.error) throw result.error
        return { stdout: result.stdout, stderr: result.stderr, exitCode: result.status ?? 1 }
      })
      const exec = buildTools(execution).find((tool) => tool.name === 'exec_command')!
      const result = (await exec.execute({ command })) as { stdout: string; exitCode: number }
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('=== helpers auth 1-90')
      expect(result.stdout).toContain(`password: '${FIXTURE_VALUE}'`)
      expect(result.stdout).toContain('API_SECRET=[REDACTED]')
      expect(result.stdout).not.toContain('synthetic-env-value')
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  })

  it.each([
    'cat src/auth.ts; echo "=== helpers auth 1-90"; cat e2e/helpers/auth.ts',
    'echo === auth; cat src/auth.ts',
    'cat src/auth.ts && printf "%s\\n" "=== helpers"; cat e2e/helpers/auth.ts',
    'cat src/auth.ts\nprintf "=== helpers\\n"\ncat e2e/helpers/auth.ts',
    'cat src/auth.ts; echo "=== helpers; auth && navigation | fixture"; cat e2e/helpers/auth.ts',
    'cat src/auth.ts; echo "=== helpers\nnext section"; cat e2e/helpers/auth.ts',
    'cat "src/auth file.ts"; printf "%s\\n" "=== done"',
    'cat src/auth.ts | grep "password"; echo "=== helpers"; head -20 e2e/helpers/auth.ts',
    'grep -n "password" src/auth.ts 2>/dev/null | sort | uniq; echo "=== helpers"',
    'cat src/auth.ts | cut -d : -f 1 | wc -l; echo "=== helpers"',
    'grep -e "password" "src/auth file.ts" | head -n 20; printf "%s\\n" "=== helpers"',
    'grep -e password -e token src/auth.ts; echo "=== helpers"',
  ])('accepts literal labels alongside actual source reads: %s', (command) => {
    expect(printsOnlySource(command)).toBe(true)
  })

  const unsafeCommands = [
    'echo "=== helpers"',
    'printf "%s\\n" "=== helpers"',
    'cd src; echo "=== helpers"',
    'echo "cat src/auth.ts"',
    'cat src/auth.ts; echo "$API_SECRET"',
    'cat src/auth.ts; printf "%s\\n" "${API_SECRET}"',
    'cat src/auth.ts; echo "$(env)"',
    'cat src/auth.ts; echo `env`',
    'cat src/auth.ts; echo $(cat config.json)',
    'cat src/auth.ts; echo *',
    'cat src/auth.ts; printf -v PATH "%s" elsewhere',
    'cat src/auth.ts; printf "%n" PATH',
    'cat src/auth.ts; echo "=== helpers" > label.txt',
    'cat src/auth.ts; echo "=== helpers" 2>/dev/null',
    'cat src/auth.ts; echo "=== helpers" < config.json',
    'cat src/auth.ts; echo "=== helpers" | cat',
    'echo "=== helpers" | cat src/auth.ts',
    'cat src/auth.ts; printf "%s\\n" "=== helpers" | env',
    'cat src/auth.ts; echo "=== helpers" &',
    'cat src/auth.ts; echo "=== helpers"; env',
    'env; cat src/auth.ts',
    'cat src/auth.ts; env; echo "=== helpers"',
    'cat src/auth.ts | env',
    'cat src/auth.ts; sh -c "env"',
    'cat src/auth.ts; echo "=== helpers"; cat .env',
    'cat src/auth.ts; echo "=== helpers"; cat config.json',
    'cat src/auth.ts; echo "=== helpers"; cat private.pem',
    'cat src/auth.ts "config.json"',
    'cat "$SOURCE.ts"; echo "=== helpers"',
    'cat src/$(env).ts; echo "=== helpers"',
    'cat src/auth.ts < config.json',
    'cat src/auth.ts > output.ts',
    'cat src/auth.ts | cat config.json',
    'cat src/auth.ts | head "config.json"',
    'cat src/auth.ts | grep password /proc/self/environ',
    'cat src/auth.ts | grep config.json -e password',
    'grep config.json -e password src/auth.ts',
    'cat src/auth.ts | sort --files0-from=config.json',
    'cat src/auth.ts | tee output.ts',
    'cd "$(env)"; cat src/auth.ts',
    'env cat src/auth.ts; echo "=== helpers"',
    'sh -c "cat src/auth.ts"; echo "=== helpers"',
    `${RANGE_READER} -n '1p; e env' src/auth.ts; echo "=== helpers"`,
    `${RANGE_READER} -n 1p '-e1e env #.ts'`,
    `${RANGE_READER} -n 1p -fconfig.ts`,
    'rg --pre=env password src/auth.ts; echo "=== helpers"',
  ]

  it.each(unsafeCommands)(
    'keeps full redaction for nonliteral or non-source output: %s',
    async (command) => {
      expect(printsOnlySource(command)).toBe(false)
      const execution = backend(`{ password: '${FIXTURE_VALUE}' }`)
      const exec = buildTools(execution, { blockDangerousCommands: false }).find(
        (tool) => tool.name === 'exec_command',
      )!
      const result = (await exec.execute({ command })) as { stdout?: string; error?: string }
      // A tool-level refusal is safe too; when output is returned it must retain full redaction.
      if (result.stdout !== undefined) {
        expect(result.stdout).toContain("password: '[REDACTED]'")
        expect(result.stdout).not.toContain(FIXTURE_VALUE)
      } else {
        expect(result.error).toBeTruthy()
      }
    },
  )
})
