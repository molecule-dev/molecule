import { describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import { isReadOnlyInspection, printsOnlySource } from '../utilities.js'

/** The executor's own config, as a redacted command output handed it back (flash m396). */
const ORDINARY_CODE = [
  "authScheme: 'Token'",
  "tokenKey: 'jwtToken'",
  "credentials: 'include'",
].join('\n')

/** Synthetic output only: unsafe controls are classified, never executed. */
function backend(stdout: string): ExecutionBackend {
  return {
    projectRoot: '/workspace/my-app',
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    readDir: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ stdout, stderr: '', exitCode: 0 }),
  }
}

function execTool(execution: ExecutionBackend) {
  return buildTools(execution).find((tool) => tool.name === 'exec_command')!
}

describe('isReadOnlyInspection', () => {
  it.each([
    // The shapes that used to fall back to the env-dump grade (xr-molecule-flash-m396).
    'cat app/src/config.ts; echo ====; ls app/src | head',
    'grep -rn authScheme .',
    'grep -rn "tokenKey" src',
    'rg -n "credentials" src',
    'ls -la app/src | head -20',
    'find . -name "*.ts" | head',
    'wc -l app/src/config.ts',
    'cd app && grep -rn Token src',
    'cat app/src/a.ts | grep authScheme',
  ])('reads inspection output at the code grade: %s', (command) => {
    expect(isReadOnlyInspection(command)).toBe(true)
  })

  it.each([
    // Env dumps keep the full name-keyed grade.
    'cat .env',
    'cat .env.local',
    'printenv',
    'env',
    'node -e "console.log(process.env)"',
    'python -c "print(os.environ)"',
    'ls; env',
    'grep -rn SECRET /proc/self/environ',
    'find . -exec env {} \\;',
    // A real FILE operand is still not a directory search root.
    'grep -rn authScheme config.json',
  ])('keeps the env-dump grade for: %s', (command) => {
    expect(isReadOnlyInspection(command)).toBe(false)
  })

  it('leaves the strict source-read predicate answering as before', () => {
    // The inspection grade is ADDITIVE: `printsOnlySource` is the narrower question other
    // callers ask, and a directory search does not become a source read for them.
    expect(printsOnlySource('grep -rn authScheme .')).toBe(false)
    expect(printsOnlySource('ls app/src | head')).toBe(false)
    expect(printsOnlySource('cat app/src/a.ts')).toBe(true)
  })
})

describe('exec_command output grade', () => {
  it.each(['cat app/src/config.ts; echo ====; ls app/src | head', 'grep -rn authScheme .'])(
    'keeps ordinary code values in inspection output: %s',
    async (command) => {
      const result = (await execTool(backend(ORDINARY_CODE)).execute({ command })) as {
        stdout?: string
      }
      expect(result.stdout).toContain("authScheme: 'Token'")
      expect(result.stdout).toContain("tokenKey: 'jwtToken'")
      expect(result.stdout).toContain("credentials: 'include'")
      expect(result.stdout).not.toContain('[REDACTED]')
    },
  )

  it.each([
    'cat .env',
    'printenv',
    'node -e "console.log(process.env)"',
    'python -c "print(os.environ)"',
  ])('still masks an env dump: %s', async (command) => {
    // Name-keyed shapes only: no credential value shape, so this exercises the grade itself.
    const dump = "DATABASE_URL=postgres://devdb.internal/app\n{ SECRET_KEY: 'synthetic-value' }"
    const result = (await execTool(backend(dump)).execute({ command })) as { stdout?: string }
    expect(result.stdout).toContain('[REDACTED]')
    expect(result.stdout).not.toContain('devdb.internal')
    expect(result.stdout).not.toContain('synthetic-value')
  })
})
