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

/** A name-keyed dump: ordinary-looking values, masked only by the NAME beside them. */
const ENV_DUMP = "DATABASE_URL=postgres://devdb.internal/app\n{ SECRET_KEY: 'synthetic-value' }"

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
    // The shape that used to fall back to the env-dump grade (xr-molecule-flash-m396):
    // a source read with a name listing beside it.
    'cat app/src/config.ts; echo ====; ls app/src | head',
    'ls -la app/src | head -20',
    'find . -name "*.ts" | head',
    'wc -l app/src/config.ts',
    'cd app && ls src',
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
    'find . -exec env {} \\;',
    // A RECURSIVE SEARCH prints whichever files matched — `.env` and JSON secret dumps
    // included — so it is never inspection output. A device file is not a directory either.
    'grep -rn authScheme .',
    'grep -rn "tokenKey" src',
    'rg -n "credentials" src',
    'cd app && grep -rn Token src',
    'grep -n SECRET /dev/stdin',
    'grep -rn SECRET secrets',
  ])('keeps the env-dump grade for: %s', (command) => {
    expect(isReadOnlyInspection(command)).toBe(false)
  })

  it('leaves the strict source-read predicate answering as before', () => {
    // The inspection grade is ADDITIVE: `printsOnlySource` is the narrower question other
    // callers ask, and listing names does not become a source read for them.
    expect(printsOnlySource('grep -rn authScheme .')).toBe(false)
    expect(printsOnlySource('ls app/src | head')).toBe(false)
    expect(printsOnlySource('cat app/src/a.ts')).toBe(true)
  })
})

describe('exec_command output grade', () => {
  it('keeps ordinary code values in a source read with a name listing beside it', async () => {
    const command = 'cat app/src/config.ts; echo ====; ls app/src | head'
    const result = (await execTool(backend(ORDINARY_CODE)).execute({ command })) as {
      stdout?: string
    }
    expect(result.stdout).toContain("authScheme: 'Token'")
    expect(result.stdout).toContain("tokenKey: 'jwtToken'")
    expect(result.stdout).toContain("credentials: 'include'")
    expect(result.stdout).not.toContain('[REDACTED]')
  })

  it.each([
    'cat .env',
    'printenv',
    'node -e "console.log(process.env)"',
    'python -c "print(os.environ)"',
    // The disclosed class: a recursive search's output is content of whatever matched.
    'grep -rn SECRET .',
    'grep -n SECRET /dev/stdin',
  ])('still masks an env dump: %s', async (command) => {
    const result = (await execTool(backend(ENV_DUMP)).execute({ command })) as { stdout?: string }
    expect(result.stdout).toContain('[REDACTED]')
    expect(result.stdout).not.toContain('devdb.internal')
    expect(result.stdout).not.toContain('synthetic-value')
  })
})
