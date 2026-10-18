import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  buildAgentPrompt,
  buildTools,
  discoverSkills,
  isValidGlob,
  redactSecrets,
  resolvePath,
  runningOutputSliceCommand,
  shellQuote,
  SPLIT_WORK_ADVICE,
  streamingBackgroundCommand,
  SUITE_OVER_BUDGET_ADVICE,
  TOOL_SCHEMAS,
} from '../index.js'
import type { ExecutionBackend } from '../types.js'
import {
  MAX_READ_CALL_CHARS,
  MAX_READ_RETURN_CHARS,
  printsOnlySource,
  TOOL_RESULT_CHARS,
} from '../utilities.js'

// ── Utilities ───────────────────────────────────────────────────────────────

describe('shellQuote', () => {
  it('wraps in single quotes', () => {
    expect(shellQuote('hello')).toBe("'hello'")
  })

  it('escapes single quotes', () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'")
  })

  it('throws a clear error on a non-string (missing tool arg)', () => {
    // deliberately invalid input — a tool handler passing a missing arg used to throw
    // the cryptic "Cannot read properties of undefined (reading 'replace')".
    expect(() => shellQuote(undefined as unknown as string)).toThrow(/expected a string/)
  })
})

describe('resolvePath', () => {
  it('returns root for empty string', () => {
    expect(resolvePath('', '/workspace')).toBe('/workspace')
  })

  it('returns root for /', () => {
    expect(resolvePath('/', '/workspace')).toBe('/workspace')
  })

  it('resolves relative paths within root', () => {
    expect(resolvePath('src/index.ts', '/workspace')).toBe('/workspace/src/index.ts')
  })

  it('blocks traversal outside root', () => {
    expect(resolvePath('../../etc/passwd', '/workspace')).toBe('/workspace')
  })
})

describe('redactSecrets', () => {
  it('redacts KEY=VALUE patterns', () => {
    expect(redactSecrets('API_KEY=sk-12345')).toBe('API_KEY=[REDACTED]')
  })

  it('redacts vault-classified names the keyword list used to miss (H4)', () => {
    // These are encrypted by the vault but previously egressed unmasked into
    // stored AI transcripts because the redactor keyword set lacked them.
    expect(redactSecrets('DB_PWD=hunter2real')).toBe('DB_PWD=[REDACTED]')
    expect(redactSecrets('MYSQL_PWD=abc123xyz')).toBe('MYSQL_PWD=[REDACTED]')
    expect(redactSecrets('MAILGUN_APIKEY=key-abcdef')).toBe('MAILGUN_APIKEY=[REDACTED]')
    expect(redactSecrets('GOOGLE_SERVICE_ACCOUNT=some-json-blob')).toBe(
      'GOOGLE_SERVICE_ACCOUNT=[REDACTED]',
    )
  })

  it('leaves non-secret values alone', () => {
    expect(redactSecrets('NODE_ENV=production')).toBe('NODE_ENV=production')
  })

  it('keeps WHATWG autocomplete tokens verbatim (frontend auth code is not a secret)', () => {
    // The JSX ternary parses to the JSON patterns as `…password" : "current-password"` — the
    // value was masked to "[REDACTED]", corrupting what the model reads from its own auth files.
    const jsx = 'autoComplete={mode === "signup" ? "new-password" : "current-password"}'
    expect(redactSecrets(jsx)).toBe(jsx)
    const obj = "{ autocomplete: 'current-password' }"
    expect(redactSecrets(obj)).toBe(obj)
    // i18n-style dictionaries keep their labels too.
    expect(redactSecrets('"password": "Password"')).toBe('"password": "Password"')
    // An empty value hides nothing (a suite fixture's blank password, flash-m52).
    expect(redactSecrets('{"user":{"password": ""}}')).toBe('{"user":{"password": ""}}')
  })

  it('keeps a dependency version next to a keyword-holding package name (flash-m57)', () => {
    expect(redactSecrets('"jsonwebtoken": "9.0.2"')).toBe('"jsonwebtoken": "9.0.2"')
    expect(redactSecrets('"jsonwebtoken": "^9.0.2"')).toBe('"jsonwebtoken": "^9.0.2"')
  })

  it('never masks a TypeScript type literal (flash-m58)', () => {
    const union = "export type AuthState = 'authenticated' | 'unauthenticated' | 'loading'"
    expect(redactSecrets(union)).toBe(union)
    expect(redactSecrets("type Token = 'jwt'")).toBe("type Token = 'jwt'")
  })

  it('reads a command that only prints source files as code (flash-m58)', () => {
    expect(printsOnlySource('cat app/src/conduit/AuthContext.tsx')).toBe(true)
    expect(printsOnlySource('cd my-app && ' + 'se' + "d -n '1,40p' api/src/auth.ts")).toBe(true)
    expect(printsOnlySource('head -50 specs/api/hurl/auth.hurl')).toBe(true)
    expect(printsOnlySource('cat api/.env')).toBe(false)
    // A pipe through a text filter, or a grep of named source files, still prints source (flash-m61).
    expect(printsOnlySource('cat app/src/a.tsx | grep x')).toBe(true)
    expect(printsOnlySource('grep -n "password" specs/api/hurl/auth.hurl | head -20')).toBe(true)
    expect(printsOnlySource('grep -n "sign\\|verify" src/a.ts')).toBe(true)
    // A recursive grep may reach an env file; a filter that reads its own file is not a filter.
    expect(printsOnlySource('grep -rn password specs/')).toBe(false)
    expect(printsOnlySource('cat a.ts | tee out.json')).toBe(false)
    expect(printsOnlySource('grep -n x app/src/a.tsx 2>/dev/null | sort | uniq')).toBe(true)
    expect(printsOnlySource('env')).toBe(false)
    expect(printsOnlySource('cat config.json')).toBe(false)
  })

  it('still redacts a REAL quoted secret next to a keyword name', () => {
    expect(redactSecrets('"password": "hunter2-real"')).toBe('"password": "[REDACTED]"')
    expect(redactSecrets("API_TOKEN: 'abc123xyz'")).toBe("API_TOKEN: '[REDACTED]'")
  })
})

describe('isValidGlob', () => {
  it('allows valid patterns', () => {
    expect(isValidGlob('*.tsx')).toBe(true)
    expect(isValidGlob('src/**/*.ts')).toBe(true)
  })

  it('rejects shell metacharacters', () => {
    expect(isValidGlob('$(cmd)')).toBe(false)
    expect(isValidGlob('file;rm')).toBe(false)
  })
})

// ── Tool Schemas ────────────────────────────────────────────────────────────

describe('TOOL_SCHEMAS', () => {
  it('has all expected tools', () => {
    const expected = [
      'list_files',
      'read_file',
      'write_file',
      'edit_file',
      'search_files',
      'find_files',
      'create_directory',
      'rename_file',
      'delete_file',
      'exec_command',
      'save_plan',
      'load_skill',
    ]
    for (const name of expected) {
      expect(TOOL_SCHEMAS[name]).toBeDefined()
      expect(TOOL_SCHEMAS[name].name).toBe(name)
      expect(TOOL_SCHEMAS[name].parameters.type).toBe('object')
    }
  })
})

// ── buildTools ──────────────────────────────────────────────────────────────

describe('buildTools', () => {
  function mockBackend(): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn().mockResolvedValue('file content'),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      readDir: vi.fn().mockResolvedValue([{ name: 'file.ts', type: 'file' }]),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('returns all tools by default', () => {
    const tools = buildTools(mockBackend())
    expect(tools.length).toBeGreaterThanOrEqual(10)
    const names = tools.map((t) => t.name)
    expect(names).toContain('read_file')
    expect(names).toContain('write_file')
    expect(names).toContain('edit_file')
    expect(names).toContain('search_files')
    expect(names).toContain('exec_command')
    expect(names).toContain('list_files')
    expect(names).toContain('find_files')
    expect(names).toContain('load_skill')
  })

  // ── the X0 R83 shape ──────────────────────────────────────────────────────
  // The executor sent `{ cmd, timeout }` instead of `{ command }`, twice in a
  // row, on the `npm test` that would have caught seven failing acceptance
  // checks. Both calls died inside checkBlockedCommand with "Cannot read
  // properties of undefined (reading 'match')". The executor's next words were
  // "The shell tool is failing consistently now. Let me stop and report" — and
  // it ended a 135-minute build turn claiming "All checks pass. The build is
  // clean." One parameter name cost the run its verification.

  it('exec_command accepts the command under `cmd` and runs it', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { blockDangerousCommands: true })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      cmd: 'cd /workspace/my-app/app && npm test',
      timeout: 900000,
    })) as { error?: string; exitCode?: number }
    expect(result.error).toBeUndefined()
    expect(result.exitCode).toBe(0)
    expect(backend.run).toHaveBeenCalledWith(
      'cd /workspace/my-app/app && npm test',
      expect.anything(),
    )
  })

  it('exec_command never crashes when no command arrives under any name', async () => {
    const tools = buildTools(mockBackend(), { blockDangerousCommands: true })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({ timeout: 900000 })) as { error?: string }
    expect(result.error).toContain('exec_command needs the parameter "command"')
    expect(result.error).toContain('not a broken tool')
    expect(result.error).not.toMatch(/Cannot read properties of undefined/)
  })

  it('exec_command says which stage the exit code came from when a pipe hides the check’s (m117)', async () => {
    // `npx tsc --noEmit 2>&1 | head -40` reported `exitCode: 0` with a type error printed above
    // it (xr-molecule-flash-m117 +04:06): the shell reports the pipeline's LAST stage's code, and
    // a model that trusts the number concludes "clean".
    const backend = mockBackend()
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      stdout: 'src/handlers/conduit.ts(867,24): error TS2339: Property does not exist.\n',
      stderr: '',
      exitCode: 0,
    })
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      command: 'cd /workspace/my-app/api && npx tsc --noEmit 2>&1 | head -40',
    })) as { exitCode?: number; exitCodeNote?: string }
    expect(result.exitCode).toBe(0)
    expect(result.exitCodeNote).toContain('exit code 0')
    expect(result.exitCodeNote).toContain('head')
    expect(result.exitCodeNote).toContain('1 type error')
  })

  it('exec_command leaves exitCodeNote off when no checker runs behind the pipe', async () => {
    const backend = mockBackend()
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      stdout: 'src/a.ts:3 TODO x\n',
      stderr: '',
      exitCode: 0,
    })
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({ command: 'grep -rn TODO src | head -20' })) as {
      exitCodeNote?: string
    }
    expect(result.exitCodeNote).toBeUndefined()
  })

  it('every tool survives an empty input without throwing', async () => {
    const tools = buildTools(mockBackend(), { blockDangerousCommands: true })
    for (const tool of tools) {
      const result = await tool.execute({})
      expect(result, tool.name).toBeDefined()
      expect(JSON.stringify(result), tool.name).not.toMatch(/Cannot read properties of undefined/)
    }
  })

  it('honors a smaller requested timeout and reports the ceiling for a larger one', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    // The note is for a command that actually neared the ceiling: it says to
    // split the work, which only means something when the run was long.
    let clock = 1_000_000
    const now = vi.spyOn(Date, 'now').mockImplementation(() => clock)
    backend.run = vi.fn(async () => {
      clock += 250_000
      return { stdout: '', stderr: '', exitCode: 0 }
    })

    const clamped = (await exec.execute({ command: 'npm test', timeout: 900_000 })) as {
      note?: string
    }
    expect(clamped.note).toContain('ceiling is 290s')
    expect(backend.run).toHaveBeenLastCalledWith(
      'npm test',
      expect.objectContaining({ budgetMs: 290_000 }),
    )

    const smaller = (await exec.execute({ command: 'npm test', timeout: 30_000 })) as {
      note?: string
    }
    expect(smaller.note).toBeUndefined()
    expect(backend.run).toHaveBeenLastCalledWith(
      'npm test',
      expect.objectContaining({ budgetMs: 30_000 }),
    )
    now.mockRestore()
  })

  // xr-molecule-flash-m83 +53:11: a 25 s Hurl run carried "You asked for 600s;
  // this tool's ceiling is 290s" — a warning about splitting work, attached to
  // work that had already finished cleanly in a tenth of the budget. The ask was
  // clamped and the clamp never mattered, so the call says nothing about it.
  it('does not report the ceiling clamp for a command that finished well inside it', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    let clock = 1_000_000
    const now = vi.spyOn(Date, 'now').mockImplementation(() => clock)
    backend.run = vi.fn(async () => {
      clock += 25_000
      return { stdout: '13/13', stderr: '', exitCode: 0 }
    })

    const fast = (await exec.execute({
      command: 'HOST=https://x bash api/run-api-tests-hurl.sh',
      timeout: 600_000,
    })) as { note?: string; exitCode?: number }
    expect(fast.exitCode).toBe(0)
    expect(fast.note).toBeUndefined()
    now.mockRestore()
  })

  // ── the trace a diagnosis run must record (trace-artifacts.ts) ─────────────
  // X1 xr-molecule-flash-m100 (+51:19) ended on three failures against the deployed URL with the
  // app swallowing the request's error; the run's own config asked for `trace: 'on-first-retry'`
  // and every run carried `--retries=0`, so no trace existed to read the network log from.

  it('adds --trace=retain-on-failure to a diagnosis run whose config records no trace', async () => {
    const backend = mockBackend()
    backend.readFile = vi.fn(async () => "export default { use: { trace: 'on-first-retry' } }")
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      command: 'npx playwright test e2e/realworld/social.spec.ts:22 --reporter=list',
    })) as { note?: string }
    const ran = String(backend.run.mock.calls[0]?.[0])
    expect(ran).toContain('--trace=retain-on-failure')
    expect(result.note).toContain('--trace=retain-on-failure')
  })

  it('leaves the whole-suite proof run, and an existing --trace, exactly as sent', async () => {
    const backend = mockBackend()
    backend.readFile = vi.fn(async () => "export default { use: { trace: 'on-first-retry' } }")
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!

    await exec.execute({ command: 'npx playwright test --max-failures=0 --config p.config.ts' })
    expect(String(backend.run.mock.calls[0]?.[0])).not.toContain('--trace')

    await exec.execute({
      command: 'npx playwright test e2e/a.spec.ts:3 --trace=on --config p.config.ts',
    })
    expect(String(backend.run.mock.calls[1]?.[0])).toContain('--trace=on')
    expect(String(backend.run.mock.calls[1]?.[0])).not.toContain('retain-on-failure')
  })

  it('says nothing when the suite’s own config already records failures', async () => {
    const backend = mockBackend()
    backend.readFile = vi.fn(async () => "export default { use: { trace: 'retain-on-failure' } }")
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      command: 'npx playwright test e2e/a.spec.ts:3 --config playwright.config.ts',
    })) as { note?: string }
    expect(String(backend.run.mock.calls[0]?.[0])).not.toContain('--trace')
    expect(result.note).toBeUndefined()
  })

  // ── batched reads ─────────────────────────────────────────────────────────
  // The executor issues one tool call per round-trip 89% of the time, so a
  // survey of 93 files cost 121 sequential calls and ten minutes of wall clock.

  it('read_file reads several paths in one call, in the order given', async () => {
    const backend = mockBackend()
    backend.readFile = vi.fn(async (p: string) => `content of ${p}`)
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({
      paths: ['a.ts', 'b.ts', 'c.ts'],
    })) as { files: Array<{ path: string; content: string }>; note?: string }
    expect(result.files).toHaveLength(3)
    expect(result.files.map((f) => f.content)).toEqual([
      'content of /test/a.ts',
      'content of /test/b.ts',
      'content of /test/c.ts',
    ])
    expect(result.note).toBeUndefined()
  })

  it('read_file still takes a single path, unchanged', async () => {
    const tools = buildTools(mockBackend())
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: 'a.ts' })) as { content: string; files?: never }
    expect(result.content).toBe('file content')
    expect(result.files).toBeUndefined()
  })

  it('read_file reports one bad path per entry without failing the batch', async () => {
    const backend = mockBackend()
    backend.readFile = vi.fn(async (p: string) => {
      if (p.endsWith('missing.ts')) throw new Error('No such file or directory')
      return 'ok'
    })
    backend.readDir = vi.fn().mockResolvedValue([{ name: 'real.ts', type: 'file' }])
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({
      paths: ['good.ts', 'missing.ts', 'also-good.ts'],
    })) as {
      files: Array<{ content?: string; error?: string }>
    }
    expect(result.files).toHaveLength(3)
    expect(result.files[0].content).toBe('ok')
    expect(result.files[1].error).toContain('No such file')
    // …and the ENOENT DWIM listing still fires inside a batch entry.
    expect(result.files[1].error).toContain('real.ts')
    expect(result.files[2].content).toBe('ok')
  })

  it('read_file caps a batch and says where to resume', async () => {
    const backend = mockBackend()
    backend.readFile = vi.fn(async () => 'x')
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const paths = Array.from({ length: 30 }, (_, i) => `f${i}.ts`)
    const result = (await readFile.execute({ paths })) as {
      files: Array<{ path: string; content?: string; error?: string }>
      note: string
    }
    // One entry per path in the order given (the schema's contract), so the model
    // can see exactly which files it does NOT have — the 25-file cap names the
    // rest instead of dropping them.
    expect(result.files).toHaveLength(30)
    expect(result.files.slice(0, 25).every((f) => f.content === 'x')).toBe(true)
    expect(result.files.slice(25).every((f) => f.error?.startsWith('not returned'))).toBe(true)
    expect(result.note).toContain('25 of 30')
    expect(result.note).toContain('f25.ts')
  })

  it('read_file rejects an empty paths array with a usable message', async () => {
    const tools = buildTools(mockBackend())
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ paths: [] })) as { error: string }
    expect(result.error).toContain('empty')
  })

  // ── the ceiling a command cannot survive ──────────────────────────────────
  // Ten commands across six agent runs asked for 600-1200s, were stopped at
  // 290s, and returned a few hundred bytes — every one of them piped into
  // tail/grep, which print nothing until the pipeline ends. 49 minutes, 11% of
  // all measured wall clock, for no information.

  it('runs a declared-long command whose output cannot survive the ceiling in the background', async () => {
    // It used to be refused ("Nothing was run"), costing a step in 48 of 48
    // production conversations that tried one; now the step does the work.
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      command: 'cd app && timeout 900 node scripts/verify-all.mjs --browser 2>&1 | tail -60',
    })) as { error?: string; taskId?: string; note?: string }
    expect(result.error).toBeUndefined()
    expect(result.taskId).toMatch(/^mol-bg-/)
    expect(result.note).toContain('asks for 900s')
    expect(result.note).toContain('290s')
    expect(backend.writeFile).toHaveBeenCalled()
  })

  it('returns a declared-long command that finishes in the grace like a foreground run', async () => {
    // X1 flash-m20: a Hurl suite asked for 300s, finished in 37 ms, and came back as a task id twice.
    const backend = mockBackend()
    backend.readFile = vi.fn(async (path: string) =>
      path.endsWith('.exit') ? '0\n' : 'Executed files: 13\nSucceeded files: 13\n',
    )
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 5_000 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      command: 'HOST=http://localhost:4000 bash run-api-tests-hurl.sh 2>&1 | tail -60',
      timeout: 300_000,
    })) as { taskId?: string; exitCode?: number; stdout?: string }
    expect(result.taskId).toBeUndefined()
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Succeeded files: 13')
  })

  it('backgrounds a piped Playwright run that declares no budget (flash-m29)', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      command: 'TEST_MODE=fullstack npx playwright test 2>&1 | tail -40',
    })) as { taskId?: string; note?: string }
    expect(result.taskId).toMatch(/^mol-bg-/)
    expect(result.note).toContain('A Playwright run can take longer')
  })

  it('backgrounds a Playwright run redirected to a file (flash-m36)', async () => {
    const backend = mockBackend()
    const exec = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 }).find(
      (t) => t.name === 'exec_command',
    )!
    const r = (await exec.execute({ command: 'npx playwright test > /tmp/pw.txt 2>&1' })) as {
      taskId?: string
    }
    expect(r.taskId).toMatch(/^mol-bg-/)
  })

  it('lifts the executor’s own `timeout` when the PLATFORM backgrounds the run (m143 +24:45)', async () => {
    // The executor wrote `timeout 280` to fit the 290 s ceiling; the tool then moved the run to
    // the background, where that ceiling no longer applies — and the prefix killed the 31-test
    // walk at 280 s with no tally. The command handed to the background runner carries no bound.
    const backend = mockBackend()
    const exec = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 }).find(
      (t) => t.name === 'exec_command',
    )!
    const command =
      'cd /workspace/my-app/app && rm -rf test-results && timeout 280 npx playwright test ' +
      '--config e2e-suite.config.ts auth.spec.ts navigation.spec.ts 2>&1 | tail -40'
    const r = (await exec.execute({ command })) as { taskId?: string; note?: string }
    expect(r.taskId).toMatch(/^mol-bg-/)
    expect(r.note).toContain('Dropped your `timeout 280`')
    // The one reading that matters: the file the background runner executes.
    const written = vi.mocked(backend.writeFile).mock.calls.at(-1)?.[1] as string
    expect(written).not.toContain('timeout 280')
    expect(written).toContain(
      'npx playwright test --config e2e-suite.config.ts auth.spec.ts navigation.spec.ts',
    )
  })

  it('keeps the bound on a run the EXECUTOR detached itself', async () => {
    // `run_in_background: true` is the executor's own choice, and it wrote the bound knowing the
    // run is detached — the platform rewrites nothing there.
    const backend = mockBackend()
    const exec = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 }).find(
      (t) => t.name === 'exec_command',
    )!
    const r = (await exec.execute({
      command: 'timeout 280 npx playwright test',
      run_in_background: true,
    })) as { taskId?: string; note?: string }
    expect(r.taskId).toMatch(/^mol-bg-/)
    expect(r.note).not.toContain('Dropped your `timeout')
    const written = vi.mocked(backend.writeFile).mock.calls.at(-1)?.[1] as string
    expect(written).toContain('timeout 280 npx playwright test')
  })

  it('reads the declared budget from the timeout PARAMETER too', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      command: "npm test 2>&1 | grep -E 'Tests |Test Files'",
      timeout: 900_000,
    })) as { error?: string; taskId?: string; note?: string }
    expect(result.error).toBeUndefined()
    expect(result.taskId).toMatch(/^mol-bg-/)
    expect(result.note).toContain('asks for 900s')
  })

  it('still RUNS a declared-long command whose partial output would survive', async () => {
    // Without a buffering pipe, an overrun hands back everything printed so
    // far — there is something to learn, so it is not refused.
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      command: 'timeout 900 npx playwright test --reporter=line',
    })) as { error?: string }
    expect(result.error).toBeUndefined()
    expect(backend.run).toHaveBeenCalled()
  })

  it('still RUNS a piped command that declares no budget of its own', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({ command: 'npm run build 2>&1 | tail -20' })) as {
      error?: string
    }
    expect(result.error).toBeUndefined()
    expect(backend.run).toHaveBeenCalled()
  })

  it("does not read a filename that merely contains 'timeout' as a budget", async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({ command: 'cat src/timeout900.ts | grep foo' })) as {
      error?: string
    }
    expect(result.error).toBeUndefined()
    expect(backend.run).toHaveBeenCalled()
  })

  it('find_files returns a clear error when pattern is missing (no crash)', async () => {
    const tools = buildTools(mockBackend())
    const findFiles = tools.find((t) => t.name === 'find_files')
    expect(findFiles).toBeDefined()
    const result = (await findFiles!.execute({})) as { error?: string }
    expect(result.error).toMatch(/requires a non-empty "pattern"/)
  })

  it('respects include filter', () => {
    const tools = buildTools(mockBackend(), { include: ['read_file', 'write_file'] })
    expect(tools.length).toBe(2)
    expect(tools.map((t) => t.name)).toEqual(['read_file', 'write_file'])
  })

  it('respects exclude filter', () => {
    const tools = buildTools(mockBackend(), { exclude: ['save_plan', 'load_skill'] })
    expect(tools.find((t) => t.name === 'save_plan')).toBeUndefined()
    expect(tools.find((t) => t.name === 'load_skill')).toBeUndefined()
    expect(tools.find((t) => t.name === 'read_file')).toBeDefined()
  })

  it('save_plan rejects a plan with no checklist items (plans must be checklists)', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend)
    const savePlan = tools.find((t) => t.name === 'save_plan')
    expect(savePlan).toBeDefined()
    const result = (await savePlan!.execute({
      name: 'My Plan',
      content: '# Plan\n\n1. Do the thing\n2. Do the other thing\n',
    })) as { error?: string }
    expect(result.error).toMatch(/markdown checklist/)
    expect(backend.writeFile).not.toHaveBeenCalled()
  })

  it('save_plan accepts a checklist plan and writes it', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend)
    const savePlan = tools.find((t) => t.name === 'save_plan')
    const result = (await savePlan!.execute({
      name: 'My Plan',
      content:
        '# Plan\n\n## Setup\n\n- [ ] Create api/src/handlers/todos.ts\n- [x] Verify the existing dashboard\n',
    })) as { ok?: boolean; path?: string; error?: string }
    expect(result.error).toBeUndefined()
    expect(result.ok).toBe(true)
    expect(result.path).toMatch(/\.agents\/plans\/\d+-my-plan-.+\.md$/)
    expect(backend.writeFile).toHaveBeenCalled()
  })

  it('save_plan accepts the plan under the `body` alias the weak executor often uses', async () => {
    // Regression: deepseek sent the plan as `body`, not `content`; reading only `content`
    // left it undefined and a VALID checklist got the "not a checklist" error, looping the
    // whole plan phase. The tool now accepts body/plan/markdown aliases.
    const backend = mockBackend()
    const savePlan = buildTools(backend).find((t) => t.name === 'save_plan')
    const result = (await savePlan!.execute({
      name: 'Search',
      body: '- [ ] Create lib/search/index.ts\n- [ ] Create app/actions/search.ts\n',
    })) as { ok?: boolean; error?: string }
    expect(result.error).toBeUndefined()
    expect(result.ok).toBe(true)
    expect(backend.writeFile).toHaveBeenCalled()
  })

  it('save_plan reports missing plan text (not a format error) when no content field is present', async () => {
    const backend = mockBackend()
    const savePlan = buildTools(backend).find((t) => t.name === 'save_plan')
    const result = (await savePlan!.execute({ name: 'Empty' })) as { error?: string }
    expect(result.error).toMatch(/no plan text/i)
    expect(result.error).toMatch(/`content`/)
    expect(backend.writeFile).not.toHaveBeenCalled()
  })

  it('load_skill enforces the symlink guard like every other read tool [C3-2]', async () => {
    const backend = mockBackend()
    // readlink -f resolves the (planted-symlink) candidate to a path OUTSIDE the workspace root.
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '/etc/mol/env',
      stderr: '',
      exitCode: 0,
    })
    const tools = buildTools(backend, { symlinkGuards: true })
    const loadSkill = tools.find((t) => t.name === 'load_skill')!
    const result = (await loadSkill.execute({ name: 'evil/SKILL.md' })) as {
      error?: string
      content?: string
    }
    expect(result.error).toMatch(/resolves outside the project workspace/)
    expect(result.content).toBeUndefined()
    expect(backend.readFile).not.toHaveBeenCalled() // never read the out-of-workspace target
  })

  // The run's FIRST file tool was refused with `SandboxNotFoundError` while the
  // sandbox it had just claimed was still attaching — and the same tool answered
  // 300 ms later (xr-molecule-flash-m120 +00:29). A channel that is still coming up
  // gets a longer, failure-aware retry budget than a plain slow answer.
  describe('the symlink guard waits for a sandbox that is still attaching (m120)', () => {
    const notFound = (): Error =>
      Object.assign(new Error('Sandbox is probably not running anymore'), {
        name: 'SandboxNotFoundError',
      })

    it('answers the read when the channel attaches on a later retry', async () => {
      vi.useFakeTimers()
      try {
        const backend = mockBackend()
        const run = backend.run as ReturnType<typeof vi.fn>
        run.mockRejectedValueOnce(notFound()).mockRejectedValueOnce(notFound())
        run.mockResolvedValue({ stdout: '/test/file.ts', stderr: '', exitCode: 0 })
        const readFile = buildTools(backend, { symlinkGuards: true }).find(
          (t) => t.name === 'read_file',
        )!
        const pending = readFile.execute({ path: '/test/file.ts' })
        // Two backoffs (300 ms, then 800 ms) before the third attempt succeeds.
        await vi.advanceTimersByTimeAsync(300)
        await vi.advanceTimersByTimeAsync(800)
        const result = (await pending) as { content?: string; error?: string }
        expect(result.error).toBeUndefined()
        expect(result.content).toBe('file content')
        expect(run).toHaveBeenCalledTimes(3)
      } finally {
        vi.useRealTimers()
      }
    })

    it('says the sandbox is still STARTING (not gone) when it never attaches', async () => {
      vi.useFakeTimers()
      try {
        const backend = mockBackend()
        const run = backend.run as ReturnType<typeof vi.fn>
        run.mockRejectedValue(notFound())
        const readFile = buildTools(backend, { symlinkGuards: true }).find(
          (t) => t.name === 'read_file',
        )!
        const pending = readFile.execute({ path: '/test/file.ts' })
        // Four attempts: 300 + 800 + 1500 ms of backoff.
        await vi.advanceTimersByTimeAsync(300)
        await vi.advanceTimersByTimeAsync(800)
        await vi.advanceTimersByTimeAsync(1_500)
        const result = (await pending) as { error?: string }
        expect(result.error).toMatch(/still starting/)
        expect(result.error).toMatch(/Retry in a few seconds/)
        expect(result.error).not.toMatch(/needs a restart/)
        expect(run).toHaveBeenCalledTimes(4)
      } finally {
        vi.useRealTimers()
      }
    })

    it('keeps the single quick retry for an error that is not about a starting sandbox', async () => {
      vi.useFakeTimers()
      try {
        const backend = mockBackend()
        const run = backend.run as ReturnType<typeof vi.fn>
        run.mockRejectedValue(new Error('readlink exploded'))
        const readFile = buildTools(backend, { symlinkGuards: true }).find(
          (t) => t.name === 'read_file',
        )!
        const pending = readFile.execute({ path: '/test/file.ts' })
        await vi.advanceTimersByTimeAsync(300)
        const result = (await pending) as { error?: string }
        expect(result.error).toMatch(/command channel failed/)
        expect(run).toHaveBeenCalledTimes(2)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  it('read_file returns structured result', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/file.ts' })) as Record<string, unknown>
    expect(result.path).toBe('/test/file.ts')
    expect(result.content).toBe('file content')
  })

  it('read_file returns source verbatim — the agent writes back what it reads', async () => {
    // The redactor is name-keyed, so over source it replaced legitimate values and the
    // literal token then landed in users' projects on the next write. Source files get
    // the code-safe grade; only value-shape/env-assignment secrets are masked.
    const source = [
      "  forgotPasswordEndpoint: '/users/forgot-password',",
      "  apiKeys: 'API keys',",
      '      auth={authClient}',
      "const TEST_PASSWORD = 'TestPass!1'",
    ].join('\n')
    const backend = mockBackend()
    backend.readFile = vi.fn().mockResolvedValue(source)
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/config.ts' })) as { content: string }
    expect(result.content).toBe(source)
    expect(result.content).not.toContain('[REDACTED]')
  })

  it('read_file still applies full env-dump redaction to .env files', async () => {
    const backend = mockBackend()
    backend.readFile = vi.fn().mockResolvedValue('PORT=3000\nDB_PASSWORD=hunter2\n')
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/.env' })) as { content: string }
    expect(result.content).toContain('PORT=3000')
    expect(result.content).toContain('DB_PASSWORD=[REDACTED]')
    expect(result.content).not.toContain('hunter2')
  })

  it('read_file returns a clear error when path is missing (no undefined.replace crash)', async () => {
    // Regression: a real build crashed with "Cannot read properties of undefined
    // (reading 'replace')" when the model called read_file with no path — resolvePath
    // did path.replace on undefined. Validate first, with an actionable message.
    const tools = buildTools(mockBackend())
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({})) as { error?: string }
    // NO argument at all is the truncated-call shape, and says so (see the
    // edit_file case below); a call that carried arguments but no path still
    // gets the path message (the next test).
    expect(result.error).toMatch(/arrived with no arguments/)
    expect(result.error).toMatch(/truncated/)
  })

  // x0 flash-m83 +29:32: `edit_file {}` — the provider cut the call short, and
  // "requires a non-empty path argument" told the model its PATH was the problem,
  // so it re-sent the same empty call instead of sending it whole. One round lost.
  it('edit_file with no arguments at all says the call was truncated, not that the path is missing', async () => {
    const tools = buildTools(mockBackend())
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const empty = (await editFile.execute({})) as { error?: string }
    expect(empty.error).toMatch(/edit_file arrived with no arguments/)
    expect(empty.error).toMatch(/truncated/)
    expect(empty.error).toMatch(/Send the whole call again/)
    expect(empty.error).not.toMatch(/requires a non-empty "path"/)
    expect(empty.error).not.toMatch(/\n/)
    // A call that DID carry arguments and left out the path keeps the path message.
    const noPath = (await editFile.execute({ old_string: 'a', new_string: 'b' })) as {
      error?: string
    }
    expect(noPath.error).toMatch(/requires a non-empty "path"/)
  })

  it('read_file returns the directory listing (DWIM) when the target is a directory', async () => {
    // A real custom build read_file'd handlers/ and migrations/ (directories) — 3 such
    // misses + a follow-up list_files each. Rather than erroring and costing a retry loop,
    // read_file now returns the directory's contents directly so the model proceeds.
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('cat: /workspace/api/src/handlers: Is a directory'),
    )
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/handlers' })) as {
      error?: string
      isDirectory?: boolean
      entries?: { name: string; type: string }[]
      note?: string
    }
    expect(result.error).toBeUndefined()
    expect(result.isDirectory).toBe(true)
    expect(result.entries).toEqual([{ name: 'file.ts', type: 'file' }])
    expect(result.note).toMatch(/directory/i)
  })

  it('read_file falls back to the list_files hint when the directory listing also fails', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('cat: /x: Is a directory'),
    )
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('permission denied'))
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/x' })) as { error?: string }
    expect(result.error).toMatch(/is a directory/i)
    expect(result.error).toMatch(/list_files/)
  })

  it('refuses a path outside the workspace instead of answering about the workspace', async () => {
    // list_files /tmp/x used to return the workspace listing as if it were /tmp/x
    // (X1 runs sonnet-m17 and sol-m05, 2026-10-14).
    const backend = mockBackend()
    const tools = buildTools(backend)
    for (const name of ['list_files', 'read_file']) {
      const tool = tools.find((t) => t.name === name)!
      const result = (await tool.execute({ path: '/tmp/conduit-tools/run.log' })) as {
        error?: string
      }
      expect(result.error).toMatch(/outside the workspace \(\/test\)/)
      expect(result.error).toMatch(/exec_command/)
    }
    expect(backend.readDir).not.toHaveBeenCalled()
    expect(backend.readFile).not.toHaveBeenCalled()
  })

  it('read_file on a MISSING file lists the parent directory instead of a bare error', async () => {
    // A weak model guesses paths from framework priors — 65 of 89 reads in one imported-app
    // build were misses on files that never existed, each answered with a doubly-wrapped
    // "Failed to read X: Failed to read X: cat: …". The miss must return ground truth: the
    // parent's REAL entries, unwrapped, so the next read uses a real name.
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error(
        'Failed to read /test/src/routes/login.tsx: cat: /test/src/routes/login.tsx: No such file or directory',
      ),
    )
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'auth.tsx', type: 'file' },
      { name: '_authenticated', type: 'directory' },
    ])
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/src/routes/login.tsx' })) as {
      error?: string
    }
    expect(result.error).toContain('No such file: /test/src/routes/login.tsx')
    expect(result.error).toContain(
      '/test/src/routes exists and contains: auth.tsx, _authenticated/',
    )
    expect(result.error).toMatch(/do not guess paths/)
    // The stuttering double-wrap is gone.
    expect(result.error).not.toMatch(/Failed to read .*Failed to read/)
  })

  it("read_file gives the same parent listing for E2B's not-found wording (flash-m44)", async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("path '/test/specs/api/hurl/01-register.hurl' does not exist"),
    )
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'auth.hurl', type: 'file' },
    ])
    const readFile = buildTools(backend).find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/specs/api/hurl/01-register.hurl' })) as {
      error?: string
    }
    expect(result.error).toContain('/test/specs/api/hurl exists and contains: auth.hurl')
  })

  it('the path-safety check retries once and names a failure that was not a timeout (flash-m44)', async () => {
    const backend = mockBackend()
    const run = backend.run as ReturnType<typeof vi.fn>
    run.mockRejectedValueOnce(new Error('socket hang up')).mockResolvedValueOnce({
      stdout: '/test/a.ts\n',
      stderr: '',
      exitCode: 0,
    })
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('x')
    const tools = buildTools(backend, { symlinkGuards: true } as never)
    const readFile = tools.find((t) => t.name === 'read_file')!
    expect(await readFile.execute({ path: '/test/a.ts' })).not.toHaveProperty('error')
    run.mockRejectedValue(new Error('socket hang up'))
    const refused = (await readFile.execute({ path: '/test/b.ts' })) as { error?: string }
    expect(refused.error).toContain('command channel failed (Error: socket hang up)')
  })

  it('read_file on a missing file says so when the parent directory is missing too', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('cat: /test/src/routes/_auth/login.tsx: No such file or directory'),
    )
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Failed to list /test/src/routes/_auth: No such file or directory'),
    )
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/src/routes/_auth/login.tsx' })) as {
      error?: string
    }
    expect(result.error).toContain('No such file: /test/src/routes/_auth/login.tsx')
    expect(result.error).toContain('/test/src/routes/_auth does not exist either')
  })

  it('read_file reports a FAILED read (never empty content) when the backend returns "" for a file with bytes on disk', async () => {
    // Observed in production (X0 rehearsal 84): several read_file calls on two real
    // components came back with no content at all; an exec shell showed both files present
    // (3,617 and 25,746 bytes). A later read of the same paths succeeded, so the read
    // failure was TRANSIENT — but the tool reported it as a successful read of an EMPTY
    // file, which a weak model acts on by writing the file from scratch.
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('')
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '3617\n',
      stderr: '',
      exitCode: 0,
    })
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({
      path: '/test/app/src/components/AnnotatedProse.tsx',
    })) as { error?: string; content?: string }
    expect(result.content).toBeUndefined()
    expect(result.error).toContain('/test/app/src/components/AnnotatedProse.tsx')
    expect(result.error).toMatch(/3617 bytes/)
    expect(result.error).toMatch(/not an empty file/i)
    expect(result.error).toMatch(/read_file/)
  })

  it('read_file recovers transparently when the immediate retry returns the bytes', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('')
      .mockResolvedValue('export const AnnotatedProse = () => null\n')
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '41',
      stderr: '',
      exitCode: 0,
    })
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/x.tsx' })) as {
      error?: string
      content?: string
      note?: string
    }
    expect(result.error).toBeUndefined()
    expect(result.content).toBe('export const AnnotatedProse = () => null\n')
    expect(result.note).toMatch(/retry/i)
  })

  it('read_file still returns a GENUINELY empty file as empty, marked so it is not mistaken for a failure', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('')
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '0\n',
      stderr: '',
      exitCode: 0,
    })
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/empty.ts' })) as {
      error?: string
      content?: string
      empty?: boolean
      note?: string
    }
    expect(result.error).toBeUndefined()
    expect(result.content).toBe('')
    expect(result.empty).toBe(true)
    expect(result.note).toMatch(/0 bytes/)
  })

  it('read_file treats an UNVERIFIABLE empty read as a failure, not as an empty file', async () => {
    // The size probe itself failed (the sandbox is wedged / the exec came back empty too).
    // "I could not look" must never read as "I looked and the file is empty".
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('')
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 1,
    })
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/x.tsx' })) as {
      error?: string
      content?: string
    }
    expect(result.content).toBeUndefined()
    expect(result.error).toMatch(/no content/i)
    expect(result.error).toMatch(/could not confirm/i)
  })

  it('read_file reports a failed read when the backend hands back a non-string (empty transport body)', async () => {
    // deliberately invalid backend return — an HTTP file read that yields no body can
    // resolve `undefined`, which used to surface as "Cannot read properties of undefined
    // (reading 'length')": an error, but one the model cannot act on.
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '512',
      stderr: '',
      exitCode: 0,
    })
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/x.tsx' })) as {
      error?: string
      content?: string
    }
    expect(result.content).toBeUndefined()
    expect(result.error).toMatch(/512 bytes/)
    expect(result.error).not.toMatch(/Cannot read properties/)
  })

  it('edit_file does not blame old_string when the file read came back empty but has bytes on disk', async () => {
    // Same conflation, different tool: an empty read made every old_string "not found",
    // steering the model to re-read and then rewrite a file it had never seen.
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('')
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '25746',
      stderr: '',
      exitCode: 0,
    })
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/AnnotatedBody.tsx',
      old_string: 'const body',
      new_string: 'const annotatedBody',
    })) as { error?: string }
    expect(result.error).toMatch(/25746 bytes/)
    expect(result.error).not.toMatch(/old_string not found/)
    expect(backend.writeFile).not.toHaveBeenCalled()
  })

  it('list_files surfaces a THROWN readDir (missing directory) as an error, never an empty list', async () => {
    // The docker backend once returned [] for a nonexistent directory — the model read that
    // as "empty dir exists" and spent a turn theorizing about virtual files. The backend now
    // throws; list_files must pass that truth through.
    const backend = mockBackend()
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error(
        "Failed to list /test/ghost: ls: cannot access '/test/ghost/': No such file or directory",
      ),
    )
    const tools = buildTools(backend)
    const listFiles = tools.find((t) => t.name === 'list_files')!
    const result = (await listFiles.execute({ path: '/test/ghost' })) as {
      error?: string
      entries?: unknown[]
    }
    expect(result.entries).toBeUndefined()
    expect(result.error).toMatch(/No such directory: \/test\/ghost/)
  })

  it('list_files on node_modules/@molecule returns a bounded summary pointing at find_package', async () => {
    // X0 xr-molecule-flash-m151 (+01:54): the 1,032 package directories came back as a plain
    // ~53 KB listing with no note, so the executor used it as its catalog (read_molecule_doc on
    // names it had scrolled past) and every later model call carried the list. The catalog is
    // one tool call away: find_package names the package, read_molecule_doc its API.
    const backend = mockBackend()
    const packages = Array.from({ length: 1032 }, (_, i) => ({
      name: `package-${String(i).padStart(4, '0')}`,
      type: 'directory' as const,
    }))
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockResolvedValue(packages)
    const listFiles = buildTools(backend).find((t) => t.name === 'list_files')!
    const result = (await listFiles.execute({ path: 'node_modules/@molecule' })) as {
      path: string
      count?: number
      entries?: Array<{ name: string; type: string }>
      note?: string
    }
    expect(result.count).toBe(1032)
    expect(result.entries).toHaveLength(20)
    // Well under the cap molecule-dev puts on one tool result (8,000 chars): the whole point is
    // that the catalog stops riding every model call.
    expect(JSON.stringify(result).length).toBeLessThan(TOOL_RESULT_CHARS / 4)
    expect(result.note).toContain('1032')
    expect(result.note).toContain('find_package(query)')
    expect(result.note).toContain('read_molecule_doc(name)')
  })

  it('list_files leaves a normal app directory listing that fits unchanged', async () => {
    const backend = mockBackend()
    const entries = [
      { name: 'App.tsx', type: 'file' as const },
      { name: 'main.tsx', type: 'file' as const },
    ]
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockResolvedValue(entries)
    const listFiles = buildTools(backend).find((t) => t.name === 'list_files')!
    const result = await listFiles.execute({ path: 'app/src' })
    expect(result).toEqual({ path: '/test/app/src', entries })
  })

  it('list_files bounds a large non-node_modules directory with its count', async () => {
    // Any listing that would not fit one tool result is bounded the same way — the cap is the
    // platform's, not a node_modules special case.
    const backend = mockBackend()
    const entries = Array.from({ length: 500 }, (_, i) => ({
      name: `generated-${String(i).padStart(4, '0')}.ts`,
      type: 'file' as const,
    }))
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockResolvedValue(entries)
    const listFiles = buildTools(backend).find((t) => t.name === 'list_files')!
    const result = (await listFiles.execute({ path: 'app/generated' })) as {
      count?: number
      entries?: Array<{ name: string; type: string }>
      note?: string
    }
    expect(result.count).toBe(500)
    expect(result.entries).toHaveLength(20)
    expect(JSON.stringify(result).length).toBeLessThan(TOOL_RESULT_CHARS)
    expect(result.note).toContain('500')
    expect(result.note).toContain('find_files')
  })

  it('edit_file with an ambiguous old_string names the lines it matched', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('a\nfoo()\nb\nfoo()\nc\n')
    const editFile = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/x.ts',
      old_string: 'foo()',
      new_string: 'bar()',
    })) as { error?: string }
    expect(result.error).toMatch(/found 2 times .*lines 2, 4/)
    expect(result.error).toMatch(/replace_all: true/)
    expect(backend.writeFile).not.toHaveBeenCalled()
  })

  it('edit_file with replace_all changes every occurrence, literally', async () => {
    // A rename used to need one edit per occurrence, and builders fell back to
    // python heredocs for it (X1 sol-m02: ten of them).
    for (const input of [
      { path: '/test/x.ts', old_string: 'foo()', new_string: "bar('$&')", replace_all: true },
      {
        path: '/test/x.ts',
        replacements: [{ old_string: 'foo()', new_string: "bar('$&')", replaceAll: true }],
      },
    ]) {
      const backend = mockBackend()
      ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('a\nfoo()\nb\nfoo()\nc\n')
      const editFile = buildTools(backend).find((t) => t.name === 'edit_file')!
      const result = (await editFile.execute(input)) as { ok?: boolean; error?: string }
      expect(result.error).toBeUndefined()
      expect(backend.writeFile).toHaveBeenCalledWith(
        '/test/x.ts',
        "a\nbar('$&')\nb\nbar('$&')\nc\n",
      )
    }
  })

  it('read_file of a missing @molecule README in node_modules points at read_molecule_doc', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("path '/x' does not exist: No such file or directory"),
    )
    const readFile = buildTools(backend).find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({
      path: '/test/app/node_modules/@molecule/api-feed-rss/README.md',
    })) as { error?: string }
    expect(result.error).toMatch(/read_molecule_doc\("@molecule\/api-feed-rss"\)/)
  })

  it('steers a SUCCESSFUL read of a package’s built output, not just a failed one', async () => {
    // X0 flash-m70: 24 reads of node_modules/@molecule/*/dist/*.js in 57 s, not one of
    // them steered — the redirect above fires only when the read FAILS.
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('exports.a = 1\n')
    const readFile = buildTools(backend).find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({
      path: '/test/app/node_modules/@molecule/api-feed-rss/dist/index.js',
    })) as { content?: string; distNote?: string }
    expect(result.content).toBe('exports.a = 1\n')
    expect(result.distNote).toMatch(/read_molecule_doc\("@molecule\/api-feed-rss"\)/)
    expect(result.distNote).toMatch(/matching \.d\.ts file/)
  })

  it('steers a .d.ts read at the README without sending it back to the file it just read', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      'export declare const a: number\n',
    )
    const readFile = buildTools(backend).find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({
      path: '/test/app/node_modules/@molecule/app-ui/dist/types.d.ts',
    })) as { distNote?: string }
    expect(result.distNote).toMatch(/read_molecule_doc\("@molecule\/app-ui"\)/)
    expect(result.distNote).not.toMatch(/matching \.d\.ts file/)
  })

  it('leaves a read of a project file (or a package’s src) unsteered', async () => {
    const backend = mockBackend()
    const readFile = buildTools(backend).find((t) => t.name === 'read_file')!
    for (const path of [
      '/test/app/src/index.ts',
      '/test/app/node_modules/@molecule/api-feed-rss/package.json',
      // `src/` is not built output (and does not exist in an installed package).
      '/test/app/node_modules/@molecule/api-feed-rss/src/index.ts',
    ]) {
      const result = (await readFile.execute({ path })) as { distNote?: string }
      expect(result.distNote).toBeUndefined()
    }
  })

  it('refuses a write INTO an installed package, and names it', async () => {
    // X0 xr-molecule-flash-m91 (+04:43): `write_file` of a reconstructed `.d.ts` over
    // the package's own declaration file answered `ok: true`, and the next call put
    // `module.exports = {}` over its runtime module — a CommonJS stub over the ESM
    // handler the app's own code imports. 18 s and an `npm pack` to undo.
    const backend = mockBackend()
    // The guard asks the backend what is installed: this mock's node_modules is a
    // real install (a package.json resolves under every package named).
    ;(backend.run as ReturnType<typeof vi.fn>).mockImplementation(async (command: string) => ({
      stdout: command.includes('package.json') ? 'installed\n' : '',
      stderr: '',
      exitCode: 0,
    }))
    const writeFile = buildTools(backend).find((t) => t.name === 'write_file')!
    const result = (await writeFile.execute({
      path: '/test/app/node_modules/@molecule/api-resource-comment/dist/numbers.d.ts',
      content: 'export declare const createNumberedComment: unknown\n',
    })) as { error?: string; ok?: boolean }
    expect(result.ok).toBeUndefined()
    expect(result.error).toMatch(/@molecule\/api-resource-comment/)
    expect(result.error).toMatch(/read-only/)
    // The repair route is named, because the obvious one is refused in the
    // pre-installed sandbox where the fleet lives at the workspace root.
    expect(result.error).toMatch(/npm pack @molecule\/api-resource-comment@<version>/)
    expect(result.error).toMatch(/node_modules\/@molecule\/api-resource-comment/)
    expect(backend.writeFile).not.toHaveBeenCalled()
  })

  it('refuses every other way into an installed package, and still reads it', async () => {
    const backend = mockBackend()
    // What the guard asks the backend: a package.json resolves under each name.
    ;(backend.run as ReturnType<typeof vi.fn>).mockImplementation(async (command: string) => ({
      stdout: command.includes('package.json') ? 'installed\n' : '',
      stderr: '',
      exitCode: 0,
    }))
    const tools = buildTools(backend)
    const call = (name: string, input: Record<string, unknown>): Promise<unknown> =>
      tools.find((t) => t.name === name)!.execute(input)
    const pkg = '/test/app/node_modules/@molecule/api-feed-rss/dist/index.js'
    for (const [name, input] of [
      ['edit_file', { path: pkg, old_string: 'a', new_string: 'b' }],
      ['delete_file', { path: pkg }],
      ['create_directory', { path: '/test/app/node_modules/@molecule/api-feed-rss/new' }],
      ['rename_file', { old_path: pkg, new_path: '/test/app/src/index.js' }],
      ['rename_file', { old_path: '/test/app/src/index.js', new_path: pkg }],
      // A NESTED node_modules is an installed package too.
      ['write_file', { path: '/test/app/vendor/node_modules/left-pad/index.js', content: 'x' }],
    ] as Array<[string, Record<string, unknown>]>) {
      const result = (await call(name, input)) as { error?: string }
      expect(result.error, `${name} ${JSON.stringify(input)}`).toMatch(/node_modules/)
      expect(result.error).toMatch(/read-only/)
    }
    expect(backend.writeFile).not.toHaveBeenCalled()
    expect(backend.deleteFile).not.toHaveBeenCalled()
    // Reading it is how a package's declarations are read at all — never refused.
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('exports.a = 1\n')
    const read = (await call('read_file', { path: pkg })) as { content?: string }
    expect(read.content).toBe('exports.a = 1\n')
  })

  it("list_files on a missing path answers with the parent's real contents", async () => {
    const backend = mockBackend()
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockImplementation(async (p: string) => {
      if (p === '/test/.agents')
        return [
          { name: 'skills', type: 'directory' },
          { name: 'plans', type: 'directory' },
        ]
      throw new Error(`ls: cannot access '${p}': No such file or directory`)
    })
    const listFiles = buildTools(backend).find((t) => t.name === 'list_files')!
    const result = (await listFiles.execute({ path: '/test/.agents/settings.json' })) as {
      error?: string
    }
    expect(result.error).toMatch(/No such directory: \/test\/\.agents\/settings\.json/)
    expect(result.error).toMatch(/\/test\/\.agents contains: skills\/, plans\//)
  })

  it('write_file and edit_file also guard a missing path (no crash)', async () => {
    const tools = buildTools(mockBackend())
    const writeFile = tools.find((t) => t.name === 'write_file')!
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const w = (await writeFile.execute({ content: 'x' })) as { error?: string }
    const e = (await editFile.execute({ old_string: 'a', new_string: 'b' })) as { error?: string }
    expect(w.error).toMatch(/requires a non-empty "path"/)
    expect(e.error).toMatch(/requires a non-empty "path"/)
  })

  it('edit_file supports backwards-compatible single replacement', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('hello world')
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/file.ts',
      old_string: 'hello',
      new_string: 'goodbye',
    })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.replacementsApplied).toBe(1)
  })

  it('edit_file supports batch replacements', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('aaa bbb ccc')
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/file.ts',
      replacements: [
        { old_string: 'aaa', new_string: 'xxx' },
        { old_string: 'bbb', new_string: 'yyy' },
      ],
    })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.replacementsApplied).toBe(2)
  })

  it('names EVERY failed replacement of a batch in one refusal, and writes nothing (flash-m98)', async () => {
    // m98's six-replacement batch carried two bad hunks. The refusal named the first,
    // the model fixed it and re-sent the whole batch, and only then heard about the
    // second — 7 s and a full re-send apart. Both are checked before the refusal now,
    // and the file on disk is untouched either way.
    const backend = mockBackend()
    let written: string | null = null
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      'import { a } from "a"\nconst tags = await popularTags(100)\nfunction profileOf(row) {\n  return row\n}\n',
    )
    ;(backend.writeFile as ReturnType<typeof vi.fn>).mockImplementation(
      async (_p: string, c: string) => {
        written = c
      },
    )
    const editFile = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/handlers.ts',
      replacements: [
        { old_string: 'const tags = await popularTags(100)', new_string: 'x' },
        { old_string: 'import { MISSING_A } from "miss"', new_string: 'x' },
        { old_string: 'function profileOf(row) {', new_string: 'x' },
        { old_string: 'const gone = 1\nconst alsoGone = 2', new_string: 'x' },
      ],
    })) as Record<string, unknown>
    expect(result.ok).toBeUndefined()
    expect(written).toBeNull() // atomic: the two that DID match were not written either
    const error = String(result.error)
    expect(error).toContain('Replacement 2 of 4 failed')
    expect(error).toContain('MISSING_A')
    expect(error).toContain('Replacement 4 of 4 failed')
    expect(error).toContain('const gone = 1')
    // …and the ones that matched are not listed as failures.
    expect(error).not.toContain('Replacement 1 of 4')
    expect(error).not.toContain('Replacement 3 of 4')
  })

  it('gives each failing replacement of a batch its own divergence point', async () => {
    // The per-replacement detail the single-failure message computes (where the match
    // stops agreeing with the file) is what makes one round trip enough; it has to be
    // there for every listed failure, not just for the first.
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      'const a = 1\nfunction profileOf(row) {\n  return row\n}\n',
    )
    const editFile = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/x.ts',
      replacements: [
        { old_string: 'const a = 1', new_string: 'const a = 2' },
        { old_string: 'function profileOf(row) {\n  return ROW\n}', new_string: 'y' },
        { old_string: 'const zzz = 3', new_string: 'z' },
      ],
    })) as Record<string, unknown>
    const error = String(result.error)
    expect(error).toContain('Replacement 2 of 3 failed')
    expect(error).toContain('then diverges at your line 2 of 3')
    expect(error).toContain('Replacement 3 of 3 failed')
    expect(error).toContain('NONE of its lines appear anywhere')
  })

  it('keeps a single replacement’s own message, with no batch framing', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('only one line\n')
    const editFile = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/x.ts',
      old_string: 'nothing like this is here',
      new_string: 'x',
    })) as Record<string, unknown>
    expect(String(result.error)).toMatch(/^old_string not found in /)
    expect(String(result.error)).not.toContain('Replacement 1 of 1')
  })

  it('edit_file writes new_string verbatim when it contains $ replacement patterns (no corruption)', async () => {
    // Regression: String.replace(oldString, newString) interprets `$&`, `$$`,
    // `` $` ``, `$'` in the replacement — so regex-replacement code or literal
    // dollars in new_string would be silently corrupted (written with ok:true).
    // The handler splices by index instead, so new_string lands byte-for-byte.
    const backend = mockBackend()
    let written: string | null = null
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('const v = OLD;')
    ;(backend.writeFile as ReturnType<typeof vi.fn>).mockImplementation(
      async (_p: string, c: string) => {
        written = c
      },
    )
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const newString = `slug.replace(/\\s+/g, '$&-') + "$$" + "$\`" + "$'"`
    const result = (await editFile.execute({
      path: '/test/file.ts',
      old_string: 'OLD',
      new_string: newString,
    })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    // The $-bearing text is present exactly as authored — not expanded to the
    // matched text ($&), collapsed ($$ -> $), or replaced by surrounding content.
    expect(written).toBe(`const v = ${newString};`)
  })

  it('edit_file rejects a batch element missing new_string (no silent "undefined" insert)', async () => {
    const backend = mockBackend()
    let written: string | null = null
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('aaa bbb')
    ;(backend.writeFile as ReturnType<typeof vi.fn>).mockImplementation(
      async (_p: string, c: string) => {
        written = c
      },
    )
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/file.ts',
      replacements: [{ old_string: 'aaa' }], // new_string omitted
    })) as Record<string, unknown>
    expect(result.error).toMatch(/new_string/)
    expect(written).toBeNull() // nothing written — fails fast, no corruption
  })

  it('edit_file allows new_string: "" (deletion) but rejects empty old_string', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('keep DELETE keep')
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const del = (await editFile.execute({
      path: '/test/file.ts',
      old_string: 'DELETE ',
      new_string: '',
    })) as Record<string, unknown>
    expect(del.ok).toBe(true)
    const empty = (await editFile.execute({
      path: '/test/file.ts',
      old_string: '',
      new_string: 'x',
    })) as Record<string, unknown>
    expect(empty.error).toMatch(/non-empty string old_string/)
  })

  it('edit_file auto-applies a UNIQUE whitespace-only mismatch (rescues indentation churn)', async () => {
    const backend = mockBackend()
    // Extra spaces — exact match fails, but a unique normalized line-run matches,
    // so the edit is applied instead of bouncing the model into a re-read loop.
    let written = ''
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('  hello   world  ')
    ;(backend.writeFile as ReturnType<typeof vi.fn>).mockImplementation(
      async (_p: string, c: string) => {
        written = c
      },
    )
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/file.ts',
      old_string: 'hello world',
      new_string: 'hi world',
    })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(written).toBe('hi world')
  })

  it('edit_file still errors on an AMBIGUOUS whitespace mismatch (not unique)', async () => {
    const backend = mockBackend()
    // old_string (4-space indent) matches neither line exactly, but normalizes to
    // BOTH — ambiguous, so it must NOT be auto-applied.
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('\ttarget()\n  target()')
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/file.ts',
      old_string: '    target()',
      new_string: 'x()',
    })) as Record<string, unknown>
    expect(result.ok).toBeUndefined()
    expect(result.error).toMatch(/whitespace\/indentation differs/i)
  })

  it('edit_file returns the actual nearby content when an anchor line matches', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      'line1\nfunction target() {\n  return 1\n}\nline5',
    )
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/file.ts',
      old_string: 'function target() {\n  return 2\n}',
      new_string: 'function target() {\n  return 3\n}',
    })) as Record<string, unknown>
    expect(result.ok).toBeUndefined()
    expect(result.error).toMatch(/ACTUAL content/i)
    expect(result.error).toContain('return 1') // shows the real line so it can fix
  })

  it('edit_file anchors on a DISTINCTIVE later line when the first line is mis-remembered', async () => {
    const backend = mockBackend()
    // The model mis-remembered the wrapper lines (function name + return tag) but
    // the distinctive middle line is intact. The first-line probe would miss
    // (`ScoreCard` ≠ `ScorePanel`), so the distinctive-line probe must find it.
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      'export function ScorePanel({ player }) {\n' +
        '  const points = tallyPlayerPoints(player.id, session.rounds)\n' +
        '  return <span className="score">{points}</span>\n' +
        '}',
    )
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/ScorePanel.tsx',
      old_string:
        'export function ScoreCard({ player }) {\n' +
        '  const points = tallyPlayerPoints(player.id, session.rounds)\n' +
        '  return <div>{points}</div>\n' +
        '}',
      new_string: 'x',
    })) as Record<string, unknown>
    expect(result.ok).toBeUndefined()
    expect(result.error).toMatch(/ACTUAL content/i)
    // shows the real region anchored on the distinctive line, not a bare re-read
    expect(result.error).toContain('tallyPlayerPoints')
    expect(result.error).not.toMatch(/^.*re-read the file with read_file/)
  })

  it('reports where a long old_string DIVERGES, not the part it already matches (m89 router.ts)', async () => {
    // X0 m89 +05:12: a 39-line old_string whose first 38 lines were verbatim — the
    // model had read only lines 1-60, so after \`Article.favorite)\` it invented
    // \`router.post(\`/devices\`,\`, while the file continues with the unfavorite
    // route and the Bookmark block. The old anchor snippet showed lines 23-33 of
    // the file, every one of which MATCHED, so the model re-sent the same
    // old_string (same snippet, same error), re-read the whole file and rewrote
    // it. The file head below is verbatim from that run's read.
    const fileLines = [
      "import { Router } from 'express'",
      '',
      "import handlers from '../handlers/index.js'",
      "import { requestHandlerMap as Article } from './Resource/Article/index.js'",
      "import { requestHandlerMap as Bookmark } from './Resource/Bookmark/index.js'",
      "import { requestHandlerMap as Comment } from './Resource/Comment/index.js'",
      "import { requestHandlerMap as Device } from './Resource/Device/index.js'",
      "import { requestHandlerMap as Follow } from './Resource/Follow/index.js'",
      "import { requestHandlerMap as Reaction } from './Resource/Reaction/index.js'",
      "import { requestHandlerMap as Tag } from './Resource/Tag/index.js'",
      "import { authorization as userAuthorization } from './Resource/User/index.js'",
      "import { requestHandlerMap as User } from './Resource/User/index.js'",
      '',
      'export const router = Router()',
      '',
      'router.use(userAuthorization.verifyMiddleware({ allowCookieSession: false }))',
      '',
      '// Conduit owns the RealWorld paths (/users, /user, /articles, /profiles, …),',
      "// which the framework's own user/device/resources handlers below would",
      '// otherwise answer first — Express replies with the FIRST match. Mounting the',
      '// Conduit router here puts it in front of every built-in. `allowCookieSession:',
      '// false` keeps this a token-only JSON API: no session cookie is written or',
      '// honored, so a request with no Authorization header is a real 401.',
      'router.use(handlers)',
      '',
      "// The app's own routes come first: Express answers with the first match, so a route",
      '// in ../handlers takes precedence over a built-in route below at the same path.',
      'router.use(handlers)',
      '',
      'router.post(`/articles`,',
      '  Article.create',
      ')',
      '',
      'router.get(`/articles`,',
      '  Article.list',
      ')',
      '',
      'router.get(`/articles/feed`,',
      '  Article.feed',
      ')',
      '',
      'router.get(`/articles/tags`,',
      '  Article.tags',
      ')',
      '',
      'router.get(`/articles/:slug`,',
      '  Article.read',
      ')',
      '',
      'router.put(`/articles/:slug`,',
      '  Article.update',
      ')',
      '',
      'router.delete(`/articles/:slug`,',
      '  Article.del',
      ')',
      '',
      'router.post(`/articles/:slug/favorite`,',
      '  Article.favorite',
      ')',
      '',
      'router.delete(`/articles/:slug/favorite`,',
      '  Article.unfavorite',
      ')',
      '',
      'router.post(`/bookmarks`,',
      '  Bookmark.create',
    ]
    const oldLines = [
      'router.use(handlers)',
      '',
      "// The app's own routes come first: Express answers with the first match, so a route",
      '// in ../handlers takes precedence over a built-in route below at the same path.',
      'router.use(handlers)',
      '',
      'router.post(`/articles`,',
      '  Article.create',
      ')',
      '',
      'router.get(`/articles`,',
      '  Article.list',
      ')',
      '',
      'router.get(`/articles/feed`,',
      '  Article.feed',
      ')',
      '',
      'router.get(`/articles/tags`,',
      '  Article.tags',
      ')',
      '',
      'router.get(`/articles/:slug`,',
      '  Article.read',
      ')',
      '',
      'router.put(`/articles/:slug`,',
      '  Article.update',
      ')',
      '',
      'router.delete(`/articles/:slug`,',
      '  Article.del',
      ')',
      '',
      'router.post(`/articles/:slug/favorite`,',
      '  Article.favorite',
      ')',
      '',
      'router.post(`/devices`,',
    ]
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(fileLines.join('\n'))
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/router.ts',
      old_string: oldLines.join('\n'),
      new_string: 'router.use(handlers)',
    })) as Record<string, unknown>
    expect(result.ok).toBeUndefined()
    const error = result.error as string
    // It matched through line 61 and stops at the file's line 62, where the run's
    // old_string had gone on to \`router.post(\`/devices\`,\`.
    expect(error).toMatch(/matches the file through line 61/i)
    expect(error).toContain('Your old_string line 39: router.post(`/devices`,')
    expect(error).toContain("The file's line 62: router.delete(`/articles/:slug/favorite`,")
    // …and the snippet is centred on THAT line, not on the anchor it had right.
    expect(error).toContain('62: router.delete(`/articles/:slug/favorite`,')
    expect(error).toContain('63:   Article.unfavorite')
    expect(error).not.toMatch(/\n2[0-9]: /)
  })

  it('shows the whitespace when the divergence is whitespace-only', async () => {
    // The one whitespace difference the tolerant match cannot absorb: a space
    // dropped between two words (the run's own m42 shape, one space missing).
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      'export function ScorePanel({ player }) {\n' +
        '  // the request handler map for every resource\n' +
        '  return <span className="score">{points}</span>\n' +
        '}',
    )
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/ScorePanel.tsx',
      old_string:
        'export function ScorePanel({ player }) {\n' +
        '  // the request handler map for everyresource\n' +
        '  return <span className="score">{points}</span>\n' +
        '}',
      new_string: 'x',
    })) as Record<string, unknown>
    expect(result.ok).toBeUndefined()
    const error = result.error as string
    expect(error).toMatch(/matches the file through line 1,/i)
    expect(error).toMatch(/whitespace only/)
    // Both lines, with the invisible difference made visible.
    expect(error).toContain(
      'Your old_string line 2: ··//·the·request·handler·map·for·everyresource',
    )
    expect(error).toContain("The file's line 2: ··//·the·request·handler·map·for·every·resource")
    expect(error).toContain('2:   // the request handler map for every resource')
  })

  it('edit_file tells the model to re-read when nothing matches at all', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('completely different')
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/file.ts',
      old_string: 'nonexistent text',
      new_string: 'x',
    })) as Record<string, unknown>
    expect(result.ok).toBeUndefined()
    // "Not in this file at all" and "here but ambiguous" call for different
    // next moves, so the error says which one this is.
    expect(result.error).toMatch(/NONE of its lines appear/i)
    expect(result.error).toMatch(/read_file/i)
    expect(result.error).toMatch(/do not retry the same old_string/i)
  })

  it('edit_file names a rebuilt import block and shows the real one (flash-m42)', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      "import {\n  errorMap,\n  Optional,\n  publicUser,\n  type ConduitUser,\n} from './helpers.js'\n\nexport const x = 1\n",
    )
    const editFile = buildTools(backend).find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/users.ts',
      old_string:
        "import {\n  type ConduitUser,\n  Optional,\n  errorMap,\n  publicUser,\n} from './helpers.js'",
      new_string:
        "import {\n  type ConduitUser,\n  Optional,\n  errorMap,\n  publicUser,\n  signToken,\n} from './helpers.js'",
    })) as Record<string, unknown>
    expect(result.error).toMatch(/import sort decides its order/)
    expect(result.error).toContain('1: import {')
    expect(result.error).toContain("6: } from './helpers.js'")
  })

  it('exec_command blocks dangerous commands when configured', async () => {
    const tools = buildTools(mockBackend(), { blockDangerousCommands: true })
    const execCmd = tools.find((t) => t.name === 'exec_command')!
    const result = (await execCmd.execute({ command: 'env' })) as Record<string, unknown>
    expect(result.error).toContain('blocked')
  })

  it('exec_command honors the consumer blockCommand hook (blocks with its message, allows on null)', async () => {
    const seen: Array<[string, string]> = []
    const tools = buildTools(mockBackend(), {
      blockCommand: (command, cwd) => {
        seen.push([command, cwd])
        return command.includes('forbidden') ? 'BLOCKED: environment rule — do X instead.' : null
      },
    })
    const execCmd = tools.find((t) => t.name === 'exec_command')!

    const blocked = (await execCmd.execute({ command: 'run forbidden thing' })) as Record<
      string,
      unknown
    >
    expect(blocked.error).toBe('BLOCKED: environment rule — do X instead.')

    const allowed = (await execCmd.execute({ command: 'echo ok' })) as Record<string, unknown>
    expect(allowed.error).toBeUndefined()
    // The hook receives the command AND the resolved cwd.
    expect(seen.map(([c]) => c)).toEqual(['run forbidden thing', 'echo ok'])
    expect(seen[0][1]).toBeTruthy()
  })

  it('exec_command uses execTimeoutMs — default 120s (not the old 30s), consumer-raisable', async () => {
    // Regression: the 30s hardcap silently killed npm install / build / test at
    // 30s even though the caller (molecule-dev) grants exec_command ~300s.
    const backend = mockBackend()
    const execCmd = buildTools(backend).find((t) => t.name === 'exec_command')!
    await execCmd.execute({ command: 'npm install some-lib' })
    const runOpts = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(runOpts).toMatchObject({ timeout: 120_000 })
    expect(runOpts.timeout).not.toBe(30000) // the old, too-short value

    // A consumer can raise it to match its own outer per-tool budget.
    const backend2 = mockBackend()
    const execCmd2 = buildTools(backend2, { execTimeoutMs: 300_000 }).find(
      (t) => t.name === 'exec_command',
    )!
    await execCmd2.execute({ command: 'npm run build' })
    expect((backend2.run as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({
      timeout: 300_000,
    })
  })

  it('exec_command with commandBudgetMs asks the backend for the budget and hands back the output an overrun produced', async () => {
    // Without a budget the command runs as given, and no budget is requested.
    const bare = mockBackend()
    await buildTools(bare)
      .find((t) => t.name === 'exec_command')!
      .execute({ command: 'npm test' })
    const bareCall = (bare.run as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(bareCall[0]).toBe('npm test')
    expect(bareCall[1]).not.toHaveProperty('budgetMs')

    // With one, the BACKEND is asked to enforce it (inside its own shell, after
    // any environment sourcing), and exit code 124 is read as "stopped at the
    // budget": the partial output survives and the error names the remedy.
    const backend = mockBackend()
    const execCmd = buildTools(backend, { commandBudgetMs: 290_000 }).find(
      (t) => t.name === 'exec_command',
    )!
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      stdout: '  ✓ home.spec.ts (4)\n  ✘ post.spec.ts (1)\n',
      stderr: '',
      exitCode: 124,
    })
    const result = (await execCmd.execute({
      command: 'cd app && npm run build && npm run test:e2e',
    })) as { stdout: string; exitCode: number; error?: string }
    const call = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toBe('cd app && npm run build && npm run test:e2e')
    expect(call[1]).toMatchObject({ budgetMs: 290_000 })
    expect(result.stdout).toContain('post.spec.ts')
    expect(result.exitCode).toBe(124)
    expect(result.error).toMatch(/stopped after 290s/)
    expect(result.error).toMatch(/one test file/)
    expect(result.error).not.toMatch(/tail\/head/)

    // A pipe through tail/head buffers EVERYTHING until the command ends, so an
    // overrun hands back nothing at all (X0 R64: `… | tail -40` → empty stdout,
    // exit 124). The error has to say so, or the model retries the same pipe.
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      stdout: '',
      stderr: '',
      exitCode: 124,
    })
    const piped = (await execCmd.execute({
      // (A piped `playwright test` is backgrounded before it can overrun — see the flash-m29 test.)
      command: 'cd app && npm run test:e2e 2>&1 | tail -40',
    })) as { stdout: string; exitCode: number; error?: string }
    expect(piped.stdout).toBe('')
    expect(piped.error).toMatch(/pipe through tail\/head holds everything back/)
    expect(piped.error).toMatch(/run it without the pipe/)
  })

  it('the over-budget message sends a SUITE to the background, not to a smaller unit', async () => {
    // xr-molecule-flash-m93 (+06:22, 2026-10-16): a Hurl suite whose one unanswered request held
    // the run until the budget stopped it. "Run a smaller unit per command" is the wrong direction
    // for a suite — splitting its files changes nothing about a request the app never answers, and
    // a run stopped here reports no tally at all, so nothing says which one it was.
    const backend = mockBackend()
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      stdout: '',
      stderr: '',
      exitCode: 124,
    })
    const execCmd = buildTools(backend, { commandBudgetMs: 290_000 }).find(
      (t) => t.name === 'exec_command',
    )!
    const result = (await execCmd.execute({
      command: 'hurl --test --jobs 1 --variable host=http://localhost:4000 hurl/*.hurl',
    })) as { exitCode: number; error?: string }
    expect(result.exitCode).toBe(124)
    expect(result.error).toContain(SUITE_OVER_BUDGET_ADVICE)
    expect(result.error).toMatch(/run_in_background/)
    expect(result.error).not.toContain(SPLIT_WORK_ADVICE)

    // A command that is NOT a suite keeps the advice that fits it — and so does a runner named
    // only in an argument (`head -30 run-api-tests-hurl.sh` reads a file and starts nothing).
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      stdout: 'building…\n',
      stderr: '',
      exitCode: 124,
    })
    const build = (await execCmd.execute({
      command: 'cd app && npm run build && head -30 run-api-tests-hurl.sh',
    })) as { error?: string }
    expect(build.error).toContain(SPLIT_WORK_ADVICE)
  })
})

// ── buildAgentPrompt ────────────────────────────────────────────────────────

describe('buildAgentPrompt', () => {
  it('includes agent name and project root', () => {
    const prompt = buildAgentPrompt({
      agentName: 'Test Agent',
      projectRoot: '/workspace',
      tools: ['read_file', 'write_file'],
    })
    expect(prompt).toContain('Test Agent')
    expect(prompt).toContain('/workspace')
  })

  it('lists tools', () => {
    const prompt = buildAgentPrompt({
      agentName: 'Test',
      projectRoot: '/test',
      tools: ['read_file', 'exec_command'],
    })
    expect(prompt).toContain('read_file')
    expect(prompt).toContain('exec_command')
  })

  it('includes project docs when provided', () => {
    const prompt = buildAgentPrompt({
      agentName: 'Test',
      projectRoot: '/test',
      tools: [],
      projectDocs: '# My Project Rules\nAlways use TypeScript.',
    })
    expect(prompt).toContain('My Project Rules')
  })

  it('includes discovered skills', () => {
    const prompt = buildAgentPrompt({
      agentName: 'Test',
      projectRoot: '/test',
      tools: ['load_skill'],
      discoveredSkills: [
        {
          name: 'styling',
          description: 'ClassMap patterns',
          path: '.agents/skills/styling/SKILL.md',
        },
      ],
    })
    expect(prompt).toContain('styling')
    expect(prompt).toContain('ClassMap patterns')
  })
})

// ── discoverSkills ──────────────────────────────────────────────────────────

describe('discoverSkills', () => {
  it('returns empty array when no skills directory exists', async () => {
    const backend = mockBackend()
    ;(backend.readDir as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'))
    const skills = await discoverSkills(backend)
    expect(skills).toEqual([])

    function mockBackend(): ExecutionBackend {
      return {
        projectRoot: '/test',
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
        writeFile: vi.fn(),
        deleteFile: vi.fn(),
        readDir: vi.fn().mockRejectedValue(new Error('ENOENT')),
        run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
      }
    }
  })
})

describe('search excludes (VS Code search.exclude semantics)', () => {
  function mockBackend(): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn().mockResolvedValue(''),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      readDir: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('search_files excludes the default dirs (node_modules, .git, …)', async () => {
    const backend = mockBackend()
    const tool = buildTools(backend).find((t) => t.name === 'search_files')!
    await tool.execute({ pattern: 'useState' })
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(cmd).toContain("--exclude-dir='node_modules'")
    expect(cmd).toContain("--exclude-dir='.git'")
    expect(cmd).toContain("--exclude-dir='molecule'")
  })

  it('search_files always prints the file, so a one-file search has locations (flash-m62)', async () => {
    const backend = mockBackend()
    const tool = buildTools(backend).find((t) => t.name === 'search_files')!
    await tool.execute({ pattern: 'useState', path: 'app/src/App.tsx' })
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(cmd).toContain('-rnH ')
  })

  it('find_files uses the same synchronized set', async () => {
    const backend = mockBackend()
    const tool = buildTools(backend).find((t) => t.name === 'find_files')!
    await tool.execute({ pattern: '*.ts' })
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    // Pruned below the root, by name, from the same set grep excludes.
    expect(cmd).toContain("-name 'node_modules'")
    expect(cmd).toContain("-name '.git'")
    expect(cmd).toContain("-name 'molecule'")
    expect(cmd).toMatch(/-mindepth 1 .*-prune/)
  })

  it('honors a per-project searchExcludedDirs override and drops unsafe names', async () => {
    const backend = mockBackend()
    const tool = buildTools(backend, {
      searchExcludedDirs: ['vendor', 'tmp', 'bad;rm -rf /'],
    }).find((t) => t.name === 'search_files')!
    await tool.execute({ pattern: 'x' })
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(cmd).toContain("--exclude-dir='vendor'")
    expect(cmd).toContain("--exclude-dir='tmp'")
    expect(cmd).not.toContain('node_modules')
    expect(cmd).not.toContain('rm -rf')
  })
  describe('host-backend guard warning', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>
    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })
    afterEach(() => {
      warnSpy.mockRestore()
    })

    it('warns loudly when symlinkGuards/pathGuards are off on a LOCAL-HOST backend', () => {
      const backend = { ...mockBackend(), hostFs: true }
      buildTools(backend) // defaults: pathGuards on, symlinkGuards OFF
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`symlinkGuards` disabled on a LOCAL-HOST backend'),
      )

      warnSpy.mockClear()
      buildTools(backend, { pathGuards: false, symlinkGuards: false })
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`pathGuards` and `symlinkGuards` disabled'),
      )
    })

    it('does not warn when both guards are on, or on a sandbox (non-host) backend', () => {
      const backend = { ...mockBackend(), hostFs: true }
      buildTools(backend, { pathGuards: true, symlinkGuards: true })
      expect(warnSpy).not.toHaveBeenCalled()

      // Sandbox backend (no hostFs marker) with default guards: silent.
      buildTools(mockBackend())
      expect(warnSpy).not.toHaveBeenCalled()
    })
  })
})

// ── windowed reads and search context ───────────────────────────────────────
// Across six real agent runs, 260 of 377 shell-inspection commands (69%) were
// head/tail/sed -n windowing a file, and another 57 were grep — work the file
// tools could not express, so the executor shelled out despite a prompt rule
// forbidding exactly that in capital letters.

// xr-molecule-flash-m155 +09:58: two `read_file` calls on a `.png` returned the
// file's raw bytes as 21,191 and 24,934 chars of replacement characters — ~46 KB
// of context the model cannot look at, spent asking for an image.
describe('read_file refuses binary files', () => {
  function binaryBackend(content: string): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn().mockResolvedValue(content),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      readDir: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('names a .png by kind and size instead of returning its bytes', async () => {
    // A real PNG decodes as U+FFFD + "PNG" + control bytes + NULs.
    const png = '\uFFFDPNG\r\n\u001a\n' + '\u0000'.repeat(1000) + 'IDATx\uFFFDeff'
    const readFile = buildTools(binaryBackend(png)).find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: 'logo.png' })) as {
      error?: string
      content?: string
    }
    expect(result.content).toBeUndefined()
    expect(result.error).toContain('logo.png is a binary file (png, 1 KB)')
    expect(result.error).toContain('read_file returns text only')
    expect(result.error).toContain('screenshot_preview')
    expect(result.error).toContain('measure it in a script')
  })

  it('catches binary content at a path with no binary extension', async () => {
    const blob = '\u0000\u0001binary\u0000payload\u0000' + '\u0000'.repeat(64)
    const readFile = buildTools(binaryBackend(blob)).find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: 'assets/blob' })) as { error?: string }
    expect(result.error).toContain('is a binary file (binary data')
  })

  it('still reads a source file that contains a literal U+FFFD in a string', async () => {
    const source = "export const label = 'caf\uFFFD'\n"
    const readFile = buildTools(binaryBackend(source)).find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: 'src/labels.ts' })) as {
      content?: string
      error?: string
    }
    expect(result.error).toBeUndefined()
    expect(result.content).toBe(source)
  })
})

describe('read_file windows', () => {
  it('returns the whole small file on the second window of it', async () => {
    const readFile = buildTools(windowBackend(120)).find((t) => t.name === 'read_file')!
    const first = (await readFile.execute({ path: '/test/a.ts', offset: 1, limit: 40 })) as {
      lines?: number
    }
    expect(first.lines).toBe(40)
    const second = (await readFile.execute({ path: '/test/a.ts', offset: 41, limit: 40 })) as {
      content?: string
      note?: string
    }
    expect(second.content).toContain('line 120')
    expect(second.note).toContain('not paged')
  })

  it('returns a file the one-call bound covers whole on its second window, past 24 KB (flash-m67)', async () => {
    // 600 lines of ~42 chars: ~25 KB, the size of RealWorld's openapi.yml.
    const readFile = buildTools(windowBackend(600, 'x'.repeat(32))).find(
      (t) => t.name === 'read_file',
    )!
    await readFile.execute({ path: '/test/a.ts', offset: 200, limit: 100 })
    const second = (await readFile.execute({ path: '/test/a.ts', offset: 40, limit: 100 })) as {
      content?: string
      note?: string
    }
    expect(second.content).toContain('line 600')
    expect(second.note).toContain('not paged')
  })

  it('hands the whole file back once, then gives later windows their window (flash-m67)', async () => {
    const readFile = buildTools(windowBackend(120)).find((t) => t.name === 'read_file')!
    await readFile.execute({ path: '/test/a.ts', offset: 1, limit: 40 })
    const whole = (await readFile.execute({ path: '/test/a.ts', offset: 41, limit: 40 })) as {
      lines?: number
    }
    expect(whole.lines).toBe(120)
    const third = (await readFile.execute({ path: '/test/a.ts', offset: 81, limit: 10 })) as {
      lines?: number
      note?: string
    }
    expect(third.lines).toBe(10)
    expect(third.note).toContain('returned earlier')
    expect(third.note).not.toContain('read it again')
  })

  function windowBackend(lines: number, pad = ''): ExecutionBackend {
    const content = Array.from({ length: lines }, (_, i) => `line ${i + 1}${pad}`).join('\n')
    return {
      projectRoot: '/test',
      readFile: vi.fn().mockResolvedValue(content),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('returns only the requested window, 1-based, with its position', async () => {
    const tools = buildTools(windowBackend(500))
    const readFile = tools.find((t) => t.name === 'read_file')!
    const r = (await readFile.execute({ path: 'a.ts', offset: 100, limit: 3 })) as {
      content: string
      offset: number
      lines: number
      totalLines: number
      note: string
    }
    expect(r.content).toBe('line 100\nline 101\nline 102')
    expect(r.offset).toBe(100)
    expect(r.lines).toBe(3)
    expect(r.totalLines).toBe(500)
    expect(r.note).toContain('Lines 100-102 of 500')
  })

  it('treats limit alone as "the first N lines" (the head case)', async () => {
    const tools = buildTools(windowBackend(500))
    const readFile = tools.find((t) => t.name === 'read_file')!
    const r = (await readFile.execute({ path: 'a.ts', limit: 2 })) as { content: string }
    expect(r.content).toBe('line 1\nline 2')
  })

  it('reads to the end when only offset is given', async () => {
    const tools = buildTools(windowBackend(5))
    const readFile = tools.find((t) => t.name === 'read_file')!
    const r = (await readFile.execute({ path: 'a.ts', offset: 4 })) as {
      content: string
      note?: string
    }
    expect(r.content).toBe('line 4\nline 5')
  })

  it('reads the LAST n lines when offset is negative (the tail case)', async () => {
    const tools = buildTools(windowBackend(500))
    const readFile = tools.find((t) => t.name === 'read_file')!
    const r = (await readFile.execute({ path: 'a.ts', offset: -3 })) as {
      content: string
      offset: number
      lines: number
    }
    expect(r.content).toBe('line 498\nline 499\nline 500')
    expect(r.offset).toBe(498)
    expect(r.lines).toBe(3)
  })

  it('clamps a negative offset larger than the file to its start', async () => {
    const tools = buildTools(windowBackend(3))
    const readFile = tools.find((t) => t.name === 'read_file')!
    const r = (await readFile.execute({ path: 'a.ts', offset: -99 })) as {
      content: string
      offset: number
    }
    expect(r.offset).toBe(1)
    expect(r.content).toBe('line 1\nline 2\nline 3')
  })

  it('returns the whole file, unchanged, when no window is asked for', async () => {
    const tools = buildTools(windowBackend(3))
    const readFile = tools.find((t) => t.name === 'read_file')!
    const r = (await readFile.execute({ path: 'a.ts' })) as {
      content: string
      offset?: number
      totalLines?: number
    }
    expect(r.content).toBe('line 1\nline 2\nline 3')
    expect(r.offset).toBeUndefined()
    expect(r.totalLines).toBeUndefined()
  })

  it('clamps an offset past the end instead of erroring', async () => {
    const tools = buildTools(windowBackend(3))
    const readFile = tools.find((t) => t.name === 'read_file')!
    const r = (await readFile.execute({ path: 'a.ts', offset: 9_999 })) as {
      content: string
      offset: number
    }
    expect(r.offset).toBe(3)
    expect(r.content).toBe('line 3')
  })

  it('windows every entry of a BATCHED read', async () => {
    const tools = buildTools(windowBackend(10))
    const readFile = tools.find((t) => t.name === 'read_file')!
    const r = (await readFile.execute({ paths: ['a.ts', 'b.ts'], offset: 2, limit: 1 })) as {
      files: Array<{ content: string; offset: number }>
    }
    expect(r.files.map((f) => f.content)).toEqual(['line 2', 'line 2'])
    expect(r.files[0].offset).toBe(2)
  })
})

describe('search_files context lines', () => {
  function grepBackend(stdout: string): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn(),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout, stderr: '', exitCode: 0 }),
    }
  }

  it('asks grep for context and marks matches apart from context', async () => {
    // grep -C emits `file-line-content` for context and `file:line:content` for
    // hits, with `--` between groups.
    const backend = grepBackend(
      ['/test/a.ts-9-before', '/test/a.ts:10:HIT', '/test/a.ts-11-after', '--'].join('\n'),
    )
    const tools = buildTools(backend)
    const search = tools.find((t) => t.name === 'search_files')!
    const r = (await search.execute({ pattern: 'HIT', contextLines: 1 })) as {
      matches: Array<{ line: number; content: string; match: boolean }>
    }
    expect((backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('-C 1')
    expect(r.matches).toHaveLength(3)
    expect(r.matches.map((m) => m.match)).toEqual([false, true, false])
    expect(r.matches.map((m) => m.line)).toEqual([9, 10, 11])
    expect(r.matches[1].content).toBe('HIT')
  })

  it('passes no context flag and keeps the old shape when none is asked for', async () => {
    const backend = grepBackend('/test/a.ts:10:HIT')
    const tools = buildTools(backend)
    const search = tools.find((t) => t.name === 'search_files')!
    const r = (await search.execute({ pattern: 'HIT' })) as {
      matches: Array<{ line: number; match?: boolean }>
    }
    expect((backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0]).not.toContain('-C')
    expect(r.matches[0].match).toBeUndefined()
    expect(r.matches[0].line).toBe(10)
  })

  it('caps a generous context request rather than passing it through', async () => {
    const backend = grepBackend('')
    const tools = buildTools(backend)
    const search = tools.find((t) => t.name === 'search_files')!
    await search.execute({ pattern: 'x', contextLines: 10_000 })
    expect((backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('-C 40')
  })
})

describe('edit_file — which kind of miss it was', () => {
  function fileBackend(content: string): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn().mockResolvedValue(content),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('says so plainly when the text is nowhere in the file', async () => {
    const tools = buildTools(fileBackend('export const a = 1\nexport const b = 2\n'))
    const edit = tools.find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'f.ts',
      replacements: [
        { old_string: 'function totallyElsewhere() {\n  return 3\n}', new_string: 'x' },
      ],
    })) as { error: string }
    expect(r.error).toContain('NONE of its lines appear')
    expect(r.error).toContain('already applied')
  })

  it('reports an edit that is already in the file as applied, and writes nothing', async () => {
    const backend = fileBackend('export function greet() {\n  return "hello, reader"\n}\n')
    const tools = buildTools(backend)
    const edit = tools.find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'f.ts',
      replacements: [{ old_string: 'return "hi"', new_string: 'return "hello, reader"' }],
    })) as { ok: boolean; alreadyApplied: number; note: string }
    expect(r.ok).toBe(true)
    expect(r.alreadyApplied).toBe(1)
    expect(r.note).toContain('already in the file')
    expect(backend.writeFile).not.toHaveBeenCalled()
  })

  it('says nothing changed when new_string is identical to old_string (flash-m51)', async () => {
    const backend = fileBackend('const count = 1\n')
    const tools = buildTools(backend)
    const edit = tools.find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'f.ts',
      replacements: [{ old_string: 'const count = 1', new_string: 'const count = 1' }],
    })) as { ok: boolean; replacementsApplied: number; note: string }
    expect(r).toMatchObject({ ok: true, replacementsApplied: 0 })
    expect(r.note).toContain('identical to old_string')
    expect(backend.writeFile).not.toHaveBeenCalled()
  })

  it('applies the rest of a batch when one of its edits is already in the file', async () => {
    const backend = fileBackend('const title = "Provenance blog"\nconst count = 1\n')
    const tools = buildTools(backend)
    const edit = tools.find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'f.ts',
      replacements: [
        { old_string: 'const title = "Blog"', new_string: 'const title = "Provenance blog"' },
        { old_string: 'const count = 1', new_string: 'const count = 2' },
      ],
    })) as { ok: boolean; replacementsApplied: number; alreadyApplied: number }
    expect(r).toMatchObject({ ok: true, replacementsApplied: 1, alreadyApplied: 1 })
    expect(backend.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      'const title = "Provenance blog"\nconst count = 2\n',
    )
  })

  it('still errors when a SHORT new_string happens to be in the file', async () => {
    const tools = buildTools(fileBackend('let x = 2\nlet y = 3\n'))
    const edit = tools.find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'f.ts',
      replacements: [{ old_string: 'let z = 9', new_string: 'let y = 3' }],
    })) as { error?: string }
    expect(r.error).toBeDefined()
  })

  it('says the opposite when parts ARE present but nothing is unique', async () => {
    // The first line is invented (so the snippet fallback cannot anchor) while a
    // later line exists twice (so no anchor is unique).
    const dup = 'function a() {\n  sharedHelper()\n}\nfunction b() {\n  sharedHelper()\n}\n'
    const tools = buildTools(fileBackend(dup))
    const edit = tools.find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'f.ts',
      replacements: [{ old_string: 'function invented() {\n  sharedHelper()\n}', new_string: 'y' }],
    })) as { error: string }
    expect(r.error).toContain('Parts of it ARE in the file')
    expect(r.error).not.toContain('NONE of its lines')
  })

  it('still prefers showing real file content when it can anchor', async () => {
    // The most useful answer of all — unchanged by the two branches above.
    const tools = buildTools(fileBackend('if (x) {\n  run()\n}\n'))
    const edit = tools.find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'f.ts',
      replacements: [{ old_string: 'if (x) {\n  runDifferently()\n}', new_string: 'y' }],
    })) as { error: string }
    expect(r.error).toContain('ACTUAL content')
    expect(r.error).toContain('run()')
  })
})

// ── background execution ────────────────────────────────────────────────────
// A command that outran the 290s ceiling was simply lost: ten of them across
// six agent runs, 49 minutes, 11% of all wall clock, every one returning
// nothing because it was piped through tail/grep. A full test suite could not
// be run at all.

describe('exec_command run_in_background', () => {
  function bgBackend(): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('returns a handle at once instead of waiting', async () => {
    const backend = bgBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({
      command: 'npx playwright test',
      run_in_background: true,
    })) as { taskId: string; log: string; exitFile: string; note: string }
    expect(r.taskId).toMatch(/^mol-bg-/)
    expect(r.log).toBe(`/tmp/${r.taskId}.log`)
    expect(r.exitFile).toBe(`/tmp/${r.taskId}.exit`)
    expect(r.note).toContain('read_file')
    expect(r.note).toContain('never sleep')
    // The one concrete instruction used to be a hand peek ("peek with exec_command: tail …"),
    // which the executor implemented as `sleep N; tail` (X1 xr-molecule-flash-m105). The note
    // names wait_for_task as the way to wait and hands over no tail recipe.
    expect(r.note).toContain('wait_for_task')
    expect(r.note).not.toContain('peek with exec_command')
    expect(r.note).not.toMatch(/tail \/tmp/)
  })

  it('writes the command to a FILE rather than re-quoting it into sh -c', async () => {
    // Executor commands carry quotes, heredocs and newlines; re-quoting them
    // into a nested sh -c is how a background runner corrupts what it runs.
    const backend = bgBackend()
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!
    const gnarly = `node -e "console.log('a\\"b')" <<'EOF'\nline\nEOF`
    const r = (await exec.execute({ command: gnarly, run_in_background: true })) as {
      taskId: string
    }
    const written = (backend.writeFile as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(written[0]).toBe(`/tmp/${r.taskId}.sh`)
    expect(written[1]).toBe(`${gnarly}\n`)
  })

  it('detaches, and records the exit code where the executor can read it', async () => {
    const backend = bgBackend()
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({ command: 'npm test', run_in_background: true })) as {
      taskId: string
    }
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(cmd).toContain('nohup')
    expect(cmd).toContain('> /dev/null 2>&1 &')
    expect(cmd).toContain(`${r.taskId}.log`)
    expect(cmd).toContain(`echo $? > /tmp/${r.taskId}.exit`)
  })

  it('is not applied unless asked for', async () => {
    const backend = bgBackend()
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({ command: 'ls' })) as { taskId?: string; exitCode?: number }
    expect(r.taskId).toBeUndefined()
    expect(r.exitCode).toBe(0)
    expect(backend.writeFile).not.toHaveBeenCalled()
  })

  it('starts a background suite run at lower CPU and IO priority (flash-m75)', async () => {
    // flash-m75 (2026-10-16): the executor backgrounded a 139-test Playwright run and
    // the two-word command it sent next returned nothing for 2 min 40 s — the suite
    // saturates the one container the app, its API and every other command share.
    const backend = bgBackend()
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({
      command: 'npx playwright test --retries=1',
      run_in_background: true,
    })) as { taskId: string; note: string }
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    // The priority is put on the shell that runs the script file, so the suite's own
    // workers (children of it) inherit both — and the probes are run, not guessed,
    // so a sandbox without either tool runs the suite exactly as before.
    expect(cmd).toBe(
      `nohup sh -c ${shellQuote(
        `p=''; nice -n 10 true >/dev/null 2>&1 && p='nice -n 10'; ` +
          'ionice -c3 true >/dev/null 2>&1 && p="$p ionice -c3"; ' +
          `$p sh /tmp/${r.taskId}.sh > /tmp/${r.taskId}.log 2>&1; ` +
          `echo $? > /tmp/${r.taskId}.exit`,
      )} > /dev/null 2>&1 & echo $! > /tmp/${r.taskId}.pid`,
    )
    // The command itself only carries the reporter and the inline-failure switch; lowering
    // priority is the launcher's.
    expect((backend.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe(
      'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; npx playwright test --retries=1 --reporter=list\n',
    )
    expect(r.note).toContain('lower CPU and IO priority')
  })

  it('leaves a background command that is not a suite run untouched (flash-m75)', async () => {
    const backend = bgBackend()
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({ command: 'npm run build', run_in_background: true })) as {
      taskId: string
    }
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(cmd).toContain(`sh -c 'sh /tmp/${r.taskId}.sh`)
    expect(cmd).not.toContain('nice')
    expect(cmd).not.toContain('ionice')
  })

  it('never lowers a foreground command, suite run or not (flash-m75)', async () => {
    const backend = bgBackend()
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    await exec.execute({ command: 'npx playwright test' })
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(cmd).not.toContain('nice')
    expect(cmd).not.toContain('ionice')
  })

  it('keeps the log growing: drops a trailing | tail and streams a playwright run', async () => {
    // flash-m15 (2026-10-15): `playwright test … | tail -70` in the background left a
    // 0-byte log, wait_for_task called it stuck twice, and two working suites were killed.
    const backend = bgBackend()
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({
      command: 'cd e2e && npx playwright test 2>&1 | tail -70',
      run_in_background: true,
    })) as { note: string }
    const written = (backend.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(written).toBe(
      'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; cd e2e && npx playwright test --reporter=list --retries=0 2>&1\n',
    )
    expect(r.note).toContain('Dropped the trailing `| tail -70`')
    expect(r.note).toContain('--reporter=list')
    // The run names no URL, so it measures the sandbox's own app: each failure walks once.
    expect(r.note).toContain('--retries=0')
    // The run's failures are readable while it walks (flash-m99).
    expect(r.note).toContain('as that test fails')
  })

  it('switches a backgrounded run off the line reporter, which the fail-fast cannot read', async () => {
    // flash-m62: `--reporter=line` writes `[n/N] <title>` and no ✓/✘ durations, so the
    // running suite could never trip the platform's fail-fast note (X0 m62 walked 139
    // tests for 8.3 min with one cause repeating).
    const backend = bgBackend()
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({
      command: 'cd spec/run && npx playwright test --retries=0 --reporter=line',
      run_in_background: true,
    })) as { note: string }
    const written = (backend.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(written).toBe(
      'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; cd spec/run && npx playwright test --retries=0 --reporter=list\n',
    )
    expect(r.note).toContain('Switched the test reporters to `--reporter=list`')
  })

  it('names the file a background command redirects its output to (flash-m29)', async () => {
    const backend = bgBackend()
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({
      command: 'npx playwright test > /tmp/pw.txt 2>&1',
      run_in_background: true,
    })) as { note: string }
    expect(r.note).toContain('writes its own output to /tmp/pw.txt')
    // …and the way to read it while the command runs is wait_for_task, not a hand `sleep; tail`.
    expect(r.note).toContain('wait_for_task reads that file')
    expect(r.note).not.toContain('peek with exec_command')
  })

  it('stays silent about output when only the preview launch redirects (flash-m136)', async () => {
    // The platform's own composed production walk: the preview server is backgrounded inside
    // the prelude's `( … )` group with `>'/tmp/mol-preview-4173.log' 2>&1 &`, and the suite's
    // foreground command follows. The note — and the progress read behind it — must follow the
    // suite, which writes to the task log.
    const composed =
      "MOL_LOCAL_WALK_BASE='http://127.0.0.1:4173'; if [ -d '/workspace/my-app/app' ]; then " +
      "( cd '/workspace/my-app/app' || exit 1; npm run build; " +
      `if ! curl -sf -o /dev/null 'http://127.0.0.1:4173/'; then ` +
      `MOL_E2E_PREVIEW_PLUGIN=0 setsid nohup npx vite preview --host 127.0.0.1 --port 4173 ` +
      `--strictPort >'/tmp/mol-preview-4173.log' 2>&1 & fi; ` +
      `for _i in $(seq 1 60); do curl -sf -o /dev/null 'http://127.0.0.1:4173/' && break; ` +
      `sleep 0.5; done ) || { echo 'preview failed' >&2; }; fi; ` +
      'export BASE_URL="$MOL_LOCAL_WALK_BASE"; ' +
      'TEST_MODE=fullstack BASE_URL="$MOL_LOCAL_WALK_BASE" npx playwright test --config e2e-suite.config.ts'
    const backend = bgBackend()
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({ command: composed, run_in_background: true })) as {
      note: string
    }
    expect(r.note).not.toContain('writes its own output')
    expect(r.note).not.toContain('mol-preview-4173.log')
    await exec.execute({ command: 'sleep 30' })
    const reads = (backend.run as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      String(call[0]),
    )
    expect(reads.some((command) => command.includes('mol-preview-4173.log'))).toBe(false)
  })

  it('resolves a quoted redirect target, and the probe reads that file (flash-m134)', async () => {
    // The platform's own composed walk writes `>'/tmp/mol-preview-4173.log'`: the quotes made
    // the target relative, so the note named `/workspace/'/tmp/…'` and the running-suite slice
    // read a file that cannot exist.
    const backend = bgBackend()
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({
      command: "npx playwright test > '/tmp/pw-quoted.log' 2>&1",
      run_in_background: true,
    })) as { taskId: string; note: string }
    expect(r.note).toContain('writes its own output to /tmp/pw-quoted.log')
    expect(r.note).not.toContain("/test/'")
    // The sleep peek is answered from the same map wait_for_task fills: it must read the file
    // the command names, at the absolute path it names.
    await exec.execute({ command: 'sleep 30' })
    const slice = (backend.run as ReturnType<typeof vi.fn>).mock.calls
      .map((call) => String(call[0]))
      .find((command) => command.includes('grep -aE'))
    expect(slice).toBeDefined()
    expect(slice).toContain("'/tmp/pw-quoted.log'")
    expect(slice).not.toContain("/test/'")
  })

  it('resolves a relative redirect target under the cwd it ran in (flash-m134)', async () => {
    const backend = bgBackend()
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({
      command: 'npx playwright test > out.log 2>&1',
      run_in_background: true,
    })) as { note: string }
    expect(r.note).toContain('writes its own output to /test/out.log')
  })

  it('leaves a command with its own reporter, or no tail, exactly as sent', async () => {
    const backend = bgBackend()
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!
    const command = 'npx playwright test --reporter=list > out.txt'
    const r = (await exec.execute({ command, run_in_background: true })) as { note: string }
    expect((backend.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe(`${command}\n`)
    expect(r.note).not.toContain('Dropped')
  })

  it('reports a failure to start rather than throwing', async () => {
    const backend = bgBackend()
    backend.writeFile = vi.fn().mockRejectedValue(new Error('read-only filesystem'))
    const tools = buildTools(backend)
    const exec = tools.find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({ command: 'ls', run_in_background: true })) as { error: string }
    expect(r.error).toContain('Could not start the background command')
    expect(r.error).toContain('read-only filesystem')
  })
})

// ── a sleep that was really a poll ──────────────────────────────────────────
// X1 xr-molecule-flash-m105 (+08:49 → +10:53, 2026-10-17): 225 s of run clock
// inside three `exec_command` calls of the shape `sleep N; <read a task's log>`.
// Two were provably dead — the task had ended 0.1 s in (exit 127) and another had
// already printed `Error: No tests found` — and the third slept 120 s beside a
// live 139-test run whose failures were already in the log.
describe('exec_command does not sleep through a background task (m105)', () => {
  /**
   * A backend for one background task: `files` answers its `/tmp` reads (an `.exit`
   * entry means it has ended; a missing one means it is still running) and `slice`
   * is what its log holds.
   */
  function peekBackend(files: Record<string, string>, slice = ''): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (path in files) return files[path]
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async (command: string) => ({
        stdout: command.includes('grep -aE') ? slice : '',
        stderr: '',
        exitCode: 0,
      })),
    }
  }
  const exec = (backend: ExecutionBackend) =>
    buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 }).find(
      (t) => t.name === 'exec_command',
    )!
  const ran = (backend: ExecutionBackend): string[] =>
    (backend.run as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]))

  /** Start the task the peeks follow, so it is in the tool's own registry. */
  async function launch(backend: ExecutionBackend): Promise<string> {
    const r = (await exec(backend).execute({
      command: 'npx playwright test > /tmp/rw-e2e.log 2>&1',
      run_in_background: true,
    })) as { taskId: string }
    return r.taskId
  }

  it('answers the +08:49 peek at a task that had already died, without sleeping', async () => {
    const files: Record<string, string> = {}
    const backend = peekBackend(files, 'playwright: not found\n')
    const taskId = await launch(backend)
    files[`/tmp/${taskId}.exit`] = '127'
    const startedAt = Date.now()
    const r = (await exec(backend).execute({
      command: 'sleep 45; tail -30 /tmp/rw-e2e.log',
    })) as { note: string }
    expect(Date.now() - startedAt).toBeLessThan(1000)
    expect(r.note).toContain('had already ended')
    expect(r.note).toContain('exit code 127')
    expect(r.note).toContain(`wait_for_task ${taskId}`)
    // The sleep was dropped; the tail the executor asked for still ran.
    expect(ran(backend).some((command) => /\bsleep\b/.test(command))).toBe(false)
    expect(ran(backend)).toContain('tail -30 /tmp/rw-e2e.log')
  })

  it('answers the +09:38 peek at a finished "No tests found" run with its log', async () => {
    const files: Record<string, string> = {}
    const backend = peekBackend(files, 'Error: No tests found\n')
    const taskId = await launch(backend)
    files[`/tmp/${taskId}.exit`] = '1'
    const r = (await exec(backend).execute({
      command:
        'sleep 60; grep -cE "✓" /tmp/rw-e2e.log; grep -E "✘|passed|failed|Error" /tmp/rw-e2e.log',
    })) as { note: string; outputSoFar?: string }
    expect(r.note).toContain('had already ended (exit code 1)')
    expect(r.outputSoFar).toContain('Error: No tests found')
    expect(ran(backend).some((command) => /\bsleep\b/.test(command))).toBe(false)
    expect(ran(backend).some((command) => command.startsWith('grep -cE'))).toBe(true)
  })

  it('answers the +10:53 peek at a live run with progress and its failures, in under a second', async () => {
    const slice =
      '[72/139] [chromium] › e2e/navigation.spec.ts:44:3 › tag filter\n' +
      '  ✘  41 [chromium] › e2e/tags.spec.ts:12:3 › popular tags (1.2s)\n'
    const backend = peekBackend({}, slice)
    const taskId = await launch(backend)
    const startedAt = Date.now()
    const r = (await exec(backend).execute({
      command: 'sleep 120; tail -c 3000 /tmp/rw-e2e.log',
    })) as { note: string; outputSoFar?: string }
    expect(Date.now() - startedAt).toBeLessThan(1000)
    expect(r.note).toContain('is live')
    expect(r.note).toContain('72 of 139')
    expect(r.note).toContain(`wait_for_task ${taskId}`)
    expect(r.outputSoFar).toContain('popular tags')
    expect(ran(backend).some((command) => /\bsleep\b/.test(command))).toBe(false)
  })

  it('answers a bare `sleep 30` with the live task state, running nothing for 30 s', async () => {
    const backend = peekBackend({}, '[12/139] x\n')
    const taskId = await launch(backend)
    const startedAt = Date.now()
    const r = (await exec(backend).execute({ command: 'sleep 30' })) as {
      status: string
      note: string
    }
    expect(Date.now() - startedAt).toBeLessThan(1000)
    expect(r.status).toBe('task_state')
    expect(r.note).toContain('is live')
    expect(r.note).toContain(`wait_for_task ${taskId}`)
    expect(ran(backend).some((command) => /\bsleep\b/.test(command))).toBe(false)
  })

  it('runs a sleep as sent when no background task this process started is live', async () => {
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        // Every task the process ever started reads as ended.
        if (/^\/tmp\/mol-bg-[a-z0-9]+-[a-z0-9]+\.exit$/.test(path)) return '0'
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async () => ({ stdout: 'done', stderr: '', exitCode: 0 })),
    }
    const r = (await exec(backend).execute({ command: 'sleep 6; echo done' })) as {
      note?: string
    }
    expect(ran(backend)).toContain('sleep 6; echo done')
    expect(r.note ?? '').not.toContain('Did not sleep')
  })
})

describe('the wait notes name wait_for_task, not a hand peek (m105)', () => {
  it('gives the running note no tail recipe', async () => {
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(async () => {
        throw new Error('ENOENT')
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async (command: string) => ({
        stdout: /wc -c/.test(command) ? '1000' : '[1/139] [chromium] › e2e/a.spec.ts:1:1 › x\n',
        stderr: '',
        exitCode: 0,
      })),
    }
    const wait = buildTools(backend).find((t) => t.name === 'wait_for_task')!
    const taskId = `mol-bg-${Date.now().toString(36)}-abc123`
    const r = (await wait.execute({ taskId, timeout: 20 })) as { note: string }
    expect(r.note).toContain('Call wait_for_task again')
    expect(r.note).not.toContain('peek with exec_command')
    expect(r.note).not.toMatch(/tail \/tmp/)
  })
})

// ── waiting on a background command ─────────────────────────────────────────
// The handle alone made the executor wait by calling `sleep 75; cat <log>`
// through exec_command — a round trip per poll, each at the full context.

describe('wait_for_task', () => {
  function backendWith(files: Record<string, string>): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (!(path in files)) throw new Error(`ENOENT: ${path}`)
        return files[path]
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(),
    }
  }
  const id = 'mol-bg-abc123-def456'

  it("reads a command's own output file when the task log holds almost nothing (flash-m48)", async () => {
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (path.endsWith('.exit')) return '1\n'
        if (path === '/tmp/e2e.log') return '  14 failed\n  60 passed (5.3m)'
        if (path.startsWith('/tmp/mol-bg-')) return 'started'
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
    }
    const tools = buildTools(backend)
    const started = (await tools
      .find((t) => t.name === 'exec_command')!
      .execute({
        command: 'npx playwright test > /tmp/e2e.log 2>&1',
        run_in_background: true,
      })) as {
      taskId: string
    }
    const r = (await tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId: started.taskId })) as {
      stdout: string
    }
    expect(r.stdout).toContain('14 failed')
  })

  /**
   * m105's +08:12 command: a wrapper config WRITTEN by a heredoc in the same call, then the run
   * with its output piped through `tail -60`. The heredoc body made the stage placement fail, the
   * answer fell through to "piped", and `wait_for_task` reported no exit code at all — with a note
   * claiming a stage after the runner that the rewrite had already dropped.
   */
  const M105_HEREDOC = `cat > /workspace/.mol-scratch/realworld-e2e/playwright.config.ts <<'EOF'
import { defineConfig, devices } from '@playwright/test'
import { baseConfig } from './playwright.base'
EOF
cd /workspace/.mol-scratch/realworld-e2e && npx playwright test --config playwright.config.ts --retries=0 2>&1 | tail -60`

  it('keeps the run’s own code after a heredoc, and claims no stage that is not there (m105 +08:12)', async () => {
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (path.endsWith('.exit')) return '1\n'
        if (path.startsWith('/tmp/mol-bg-')) return 'Error: No tests found'
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
    }
    const tools = buildTools(backend)
    const started = (await tools
      .find((t) => t.name === 'exec_command')!
      .execute({
        command: M105_HEREDOC,
        run_in_background: true,
      })) as { taskId: string }
    const r = (await tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId: started.taskId })) as { exitCode: number | null; note?: string }
    // The tail was dropped by the rewrite, so nothing follows the runner any more: the code the
    // exit file holds is the RUN's, and it is reported.
    expect(r.exitCode).toBe(1)
    expect(r.note ?? '').not.toContain('No exit code is reported')
  })

  it('still reports no code, and says why, when a stage really does follow the runner', async () => {
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (path.endsWith('.exit')) return '1\n'
        if (path.startsWith('/tmp/mol-bg-')) return '  1 failed\n  1 passed (3.1s)'
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
    }
    const tools = buildTools(backend)
    const started = (await tools
      .find((t) => t.name === 'exec_command')!
      .execute({
        command: 'npx playwright test 2>&1 | tee /tmp/run.log',
        run_in_background: true,
      })) as { taskId: string }
    const r = (await tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId: started.taskId })) as {
      exitCode: number | null
      status?: string
      note?: string
    }
    // `tee` is not provably output-only, so it stays: its code is the pipeline's, not the run's.
    expect(r.exitCode).toBeNull()
    // …but the run HAS finished: the result says so, because a caller cannot read a withheld code
    // as "this is the delivered result, not a progress return" (m152 +29:40).
    expect(r.status).toBe('completed')
    expect(r.note).toContain('No exit code is reported')
    expect(r.note).toContain('a stage after the test runner')
  })

  it('says plainly that a `sh -c` suite could not be placed, and keeps its code', async () => {
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (path.endsWith('.exit')) return '1\n'
        if (path.startsWith('/tmp/mol-bg-')) return 'Error: No tests found'
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
    }
    const tools = buildTools(backend)
    const started = (await tools
      .find((t) => t.name === 'exec_command')!
      .execute({
        command: "sh -c 'cd /workspace/my-app && npx playwright test'",
        run_in_background: true,
      })) as { taskId: string }
    const r = (await tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId: started.taskId })) as { exitCode: number | null; note?: string }
    // Nothing follows the runner inside the nested string, so the code is the run's own — and the
    // note says the stages could not be placed rather than naming a stage that does not exist.
    expect(r.exitCode).toBe(1)
    expect(r.note).toContain('cannot be placed')
    expect(r.note).not.toContain('a stage after the test runner')
  })

  it('groups a finished run’s failures by cause, so one round of fixes covers them all (flash-m83)', async () => {
    // X1 flash-m83 spent three deploys (6.7 minutes) each fixing a single cause; the result the
    // executor reads at the end says `3 failed` and prints the bodies with nothing tying them
    // together, so the grouping is what makes a finished run worth finishing.
    const finished = [
      'Running 139 tests using 1 worker',
      '',
      '  1) [chromium] › ../fixtures/realworld/specs/e2e/articles.spec.ts:32:3 › Articles › should create ────────',
      '',
      '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
      '',
      '  2) [chromium] › ../fixtures/realworld/specs/e2e/auth.spec.ts:78:3 › Authentication › should sign up ────────',
      '',
      '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
      '',
      '  3) [chromium] › ../fixtures/realworld/specs/e2e/tags.spec.ts:12:3 › Tags › shows the pill ────────',
      '',
      '    Expected class "active" but got ""',
      '',
      '  3 failed',
      '  136 passed',
    ].join('\n')
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (path.endsWith('.exit')) return '1\n'
        if (path.endsWith('.log')) return finished
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
    }
    const tools = buildTools(backend)
    const started = (await tools
      .find((t) => t.name === 'exec_command')!
      .execute({ command: 'npx playwright test', run_in_background: true })) as {
      taskId: string
    }
    const r = (await tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId: started.taskId })) as { note?: string }
    expect(r.note).toContain('3 failures in this run, grouped by cause')
    // The cause signature, with the timeout — the suite's own number, not the cause's — normalized
    // (flash-m84).
    expect(r.note).toContain(
      '1. `TimeoutError: page.waitForURL: Timeout <n> exceeded.` — 2 tests in 2 files',
    )
    expect(r.note).toContain('2. `Expected class "active" but got ""` — 1 test in 1 file')
  })

  it('drops the request’s excluded test and narrows the re-run (xr-molecule-flash-m101)', async () => {
    // m101's +12:00 result, verbatim: three failures, one of them `except "should require login
    // to post comment"`. The note used to name it as cause #1 while the same result carried
    // `excludedTestNote` telling the executor not to spend time on it; the executor spent a turn
    // and an edit on it, then re-ran all 139 tests (~4 min) to check two fixes.
    const m101 = [
      'Running 139 tests using 1 worker',
      '',
      '  1) [chromium] › comments.spec.ts:102:3 › Comments › should require login to post comment ─────────',
      '',
      '    Error: expect(locator).toBeVisible() failed',
      '',
      '    Error: strict mode violation: locator(\'a[href="/login"]\') resolved to 2 elements:',
      '',
      '  2) [chromium] › navigation.spec.ts:200:3 › Navigation and Filtering › should show article count on profile tabs ',
      '',
      '    TimeoutError: page.click: Timeout 5000ms exceeded.',
      '',
      '  3) [chromium] › social.spec.ts:115:3 › Social Features › should display favorited articles on profile ',
      '',
      '    TimeoutError: page.waitForSelector: Timeout 3000ms exceeded.',
      '',
      '  3 failed',
      '  65 skipped',
      '  71 passed (4.1m)',
    ].join('\n')
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (path.endsWith('.exit')) return '1\n'
        if (path.endsWith('.log')) return m101
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
    }
    const tools = buildTools(backend, {
      excludedTestTitles: () => ['should require login to post comment'],
    })
    const started = (await tools
      .find((t) => t.name === 'exec_command')!
      .execute({
        command:
          'cd /workspace/fixtures/realworld/specs/e2e && npx playwright test --config playwright.run.config.ts',
        run_in_background: true,
      })) as { taskId: string }
    const r = (await tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId: started.taskId })) as { note?: string }
    expect(r.note).toContain('2 failures in this run, grouped by cause')
    expect(r.note).not.toContain('expect(locator).toBeVisible()')
    expect(r.note).toContain(
      'Ignored (excluded by the request): should require login to post comment.',
    )
    // The narrowed re-run: the two surviving locations, the exclusion inverted out.
    expect(r.note).toContain(
      'playwright test navigation.spec.ts:200 social.spec.ts:115 --retries=0 ' +
        "--grep-invert 'should require login to post comment'",
    )
    expect(r.note).not.toContain('comments.spec.ts:102')
  })

  it("recovers a command's own output file after the process that started it is gone (flash-m63)", async () => {
    // Which file a task redirects its output to is process memory, and the task
    // is not: a release or a patch swaps the API process mid-run while the
    // command keeps running in the sandbox. The script the task was started from
    // names the target, so a wait that outlives the process still reads the run's
    // output instead of handing back the near-empty task log as the whole result.
    // The map has no entry for this id — the same state the fresh process is in.
    const restarted = 'mol-bg-restart-abc999'
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (path === `/tmp/${restarted}.sh`) return 'npx playwright test > e2e.out 2>&1\n'
        if (path === `/tmp/${restarted}.exit`) return '1\n'
        if (path === `/tmp/${restarted}.log`) return 'started'
        if (path === '/test/e2e.out') return '  14 failed\n  60 passed (5.3m)'
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
    }
    const wait = buildTools(backend).find((t) => t.name === 'wait_for_task')!
    const r = (await wait.execute({ taskId: restarted })) as { exitCode: number; stdout: string }
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toContain('14 failed')
  })

  it('returns the exit code and output when the command has already finished', async () => {
    const backend = backendWith({ [`/tmp/${id}.exit`]: '1\n', [`/tmp/${id}.log`]: '3 failed' })
    const wait = buildTools(backend).find((t) => t.name === 'wait_for_task')!
    const r = (await wait.execute({ taskId: id })) as { exitCode: number; stdout: string }
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe('3 failed')
  })

  it('polls until the exit file appears', async () => {
    const files: Record<string, string> = {}
    const backend = backendWith(files)
    const wait = buildTools(backend).find((t) => t.name === 'wait_for_task')!
    setTimeout(() => {
      files[`/tmp/${id}.log`] = 'built'
      files[`/tmp/${id}.exit`] = '0'
    }, 50)
    const r = (await wait.execute({ taskId: id, timeout: 5_000 })) as { exitCode: number }
    expect(r.exitCode).toBe(0)
    expect(backend.readFile).toHaveBeenCalled()
  })

  it('says it is still running when the budget ends, without an error', async () => {
    const wait = buildTools(backendWith({})).find((t) => t.name === 'wait_for_task')!
    const r = (await wait.execute({ taskId: id, timeout: 30 })) as {
      status?: string
      error?: string
      note?: string
    }
    expect(r.error).toBeUndefined()
    expect(r.status).toBe('running')
    expect(r.note).toContain('wait_for_task again')
  })

  it('refuses an id it did not mint — the id names files under /tmp', async () => {
    const wait = buildTools(backendWith({})).find((t) => t.name === 'wait_for_task')!
    const r = (await wait.execute({ taskId: '../etc/passwd' })) as { error: string }
    expect(r.error).toContain('taskId')
  })

  it('the handle tells the executor to wait with this tool, not with sleep', async () => {
    const backend = backendWith({})
    backend.writeFile = vi.fn().mockResolvedValue(undefined)
    backend.run = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({ command: 'npm test', run_in_background: true })) as {
      note: string
    }
    expect(r.note).toContain('wait_for_task')
    expect(r.note).toContain('never sleep')
  })
})

// ── a running log comes back as its failures, not its tail ───────────────────
// A Playwright `list` run prints its failures as they happen and the end of the log is the
// skips, so `tail -c 3000` handed the executor the least useful bytes of the walk
// (X1 flash-m61: 61 failures were above the last 3 000 bytes of a 139-test log).

describe('wait_for_task output on a running task (flash-m61)', () => {
  const id = 'mol-bg-abc123-def456'

  it('the slice command leads with the failures and still shows the log end', () => {
    const dir = mkdtempSync(join(tmpdir(), 'runlog-'))
    try {
      const log = join(dir, 'task.log')
      const failures = [
        'Running 139 tests using 1 worker',
        '  ✘    1 [chromium] › e2e/articles.spec.ts:32:3 › Articles › should create a new article (13.2s)',
        '  ✘    2 [chromium] › e2e/articles.spec.ts:50:3 › Articles › should edit an existing article (12.7s)',
      ]
      // 120 skip lines — ~9 KB — so the failures are far above the last 3 000 bytes.
      const skips = Array.from(
        { length: 120 },
        (_, i) => `  -    ${i + 3} [chromium] › e2e/skip.spec.ts:${i + 1}:1 › Skipped › case ${i}`,
      )
      writeFileSync(log, `${[...failures, ...skips].join('\n')}\n`)
      const r = spawnSync('sh', ['-c', runningOutputSliceCommand(log)], { encoding: 'utf8' })
      expect(r.status).toBe(0)
      expect(r.stdout).toContain('should create a new article')
      expect(r.stdout).toContain('should edit an existing article')
      // And the end of the log rides along.
      expect(r.stdout).toContain('Skipped › case 119')
      expect(r.stdout.length).toBeLessThan(4000)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns the failures so far with a note that says to grep the log, not to tail it', async () => {
    const slice = '  ✘    1 [chromium] › e2e/a.spec.ts:1:1 › A › fails (12.0s)\n\n…the log end…'
    const run = vi.fn().mockResolvedValue({ stdout: slice, stderr: '', exitCode: 0 })
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      // No task files at all: the command is still running.
      readFile: vi.fn(async (path: string) => {
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run,
    }
    const wait = buildTools(backend).find((t) => t.name === 'wait_for_task')!
    const r = (await wait.execute({ taskId: id, timeout: 30 })) as {
      status?: string
      outputSoFar?: string
      note?: string
    }
    expect(r.status).toBe('running')
    expect(r.outputSoFar).toContain('A › fails')
    const commands = run.mock.calls.map((c) => String(c[0]))
    // The slice is the read that greps the failure lines out; the wait also makes a plain tail
    // read of the same log to look for a repeating failure (repeatingFailure), and that one has
    // no grep in it.
    const sliceCommand = commands.find((c) => c.includes('grep -aE'))
    expect(sliceCommand).toBeDefined()
    expect(sliceCommand).not.toContain('| tail -c 3000')
    expect(r.note).toContain(`grep -n '✘' /tmp/${id}.log`)
    expect(r.note).not.toContain('no need to tail it')
    // And the note says where those failures' errors are: written as each test fails (flash-m99),
    // not only in the summary at the end.
    expect(r.note).toContain('as that test fails')
  })

  it('hands over a recipe that reads one failure’s error out of a running log (flash-m99)', async () => {
    // xr-molecule-flash-m99 (+19:27 → +21:00, 2026-10-16). This note told the model
    // `grep -n -A 20 '<test name>' <log>` "reads one failure's error", and the run it was reading
    // was a bare `--reporter=list` one — whose failures print at `onEnd`, minutes later. The model
    // ran it four ways, got `✘` rows and nothing else, inferred the causes from the spec prose, and
    // edited `app/src` while the run was still walking, which voids the run.
    //
    // The `✘` rows below are that run's own log, verbatim. The numbered block under the second row
    // is what Playwright 1.63 writes for a failure with the inline switch the backgrounder sets on
    // a background suite (captured from a real run of a test with the same name) — which is the
    // whole difference between a recipe that returns the error and one that returns nothing.
    const log = [
      'Running 139 tests using 1 worker',
      '',
      '  ✓    6 [chromium] › specs/e2e/articles.spec.ts:160:7 › Articles › should show the article list (3.1s)',
      '  ✘    7 [chromium] › specs/e2e/articles.spec.ts:182:7 › Articles › should view article from home feed (4.5s)',
      '  ✘    9 [chromium] › specs/e2e/articles.spec.ts:229:7 › Articles › should remove all tags when editing an article (3.7s)',
      '',
      '  9) [chromium] › specs/e2e/articles.spec.ts:229:7 › Articles › should remove all tags when editing an article ────',
      '',
      '    Error: expect(locator).toHaveCount(expected) failed',
      '',
      "    Locator:  locator('.tag-pill')",
      '    Expected: 2',
      '    Received: 0',
      '    Timeout:  5000ms',
      '',
      '    Call log:',
      '      - Expect "toHaveCount" locator(\'.tag-pill\') with timeout 5000ms',
      "      - waiting for locator('.tag-pill')",
      '',
      "       8 | test('should remove all tags', async ({ page }) => {",
      "    > 10 |   await expect(page.locator('.tag-pill')).toHaveCount(2)",
      '         |                                           ^',
      '',
      '    Error Context: test-results/articles-should-remove-all-tags/error-context.md',
      '',
      '  ✘   25 [chromium] › specs/e2e/comments.spec.ts:141:7 › Comments › should handle long comments (8.7s)',
    ].join('\n')
    const run = vi.fn().mockResolvedValue({ stdout: log, stderr: '', exitCode: 0 })
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      // No task files at all: the command is still running.
      readFile: vi.fn(async (path: string) => {
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run,
    }
    const wait = buildTools(backend).find((t) => t.name === 'wait_for_task')!
    const note = String(
      ((await wait.execute({ taskId: id, timeout: 30 })) as { note?: string }).note ?? '',
    )
    // THE LOAD-BEARING HALF: the command the platform starts a background suite with is the one
    // whose log carries failures' errors mid-run. Without it the recipe below returns `✘` rows.
    const m99 =
      'cd /workspace/my-app && TEST_MODE=fullstack npx playwright test --config playwright.config.ts ' +
      '--max-failures=15 --retries=0 --reporter=list 2>&1 | tail -140'
    expect(streamingBackgroundCommand(m99).command).toBe(
      'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; cd /workspace/my-app && TEST_MODE=fullstack ' +
        'npx playwright test --config playwright.config.ts --max-failures=15 --retries=0 ' +
        '--reporter=list 2>&1',
    )
    // And the recipe the note hands over is the one that READS that log: the note's own text, run
    // against the run's log, returns the assertion, the locator and the values.
    const recipe = /`(grep -n -A 20 '<test name>' [^`]+)`/.exec(note)?.[1]
    expect(recipe).toBeDefined()
    const dir = mkdtempSync(join(tmpdir(), 'm99-midrun-'))
    try {
      const file = join(dir, 'mol-bg-mvblpdsm-8pxt4j.log')
      writeFileSync(file, `${log}\n`)
      // Exactly what the note asks the executor to do: name one failed test and read its error.
      const command = recipe!
        .replace(`/tmp/${id}.log`, file)
        .replace('<test name>', 'should remove all tags when editing an article')
      const r = spawnSync('sh', ['-c', command], { encoding: 'utf8' })
      expect(r.status).toBe(0)
      expect(r.stdout).toContain('Error: expect(locator).toHaveCount(expected) failed')
      expect(r.stdout).toContain('Received: 0')
      expect(r.stdout).toContain("Locator:  locator('.tag-pill')")
      // A test that PASSED carries no block under its row: the read stays about the failure named.
      expect(r.stdout).not.toContain('should show the article list')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// ── a file bigger than one call should return ────────────────────────────────
// MAX_READ_SIZE bounds what the tool will open (5 MB), not what a model should
// be handed: one 1.2 MB README in a batched read put three provider calls at
// 366k tokens against a 120k cap (X0 run x5).

describe('read_file return ceiling', () => {
  const huge = Array.from({ length: 4000 }, (_, i) => `line ${i} ${'x'.repeat(40)}`).join('\n')
  function backendWith(content: string): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn().mockResolvedValue(content),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('returns the first window of a huge file with a note, never the whole thing', async () => {
    const read = buildTools(backendWith(huge)).find((t) => t.name === 'read_file')!
    const r = (await read.execute({ path: 'README.md' })) as {
      content: string
      lines: number
      totalLines: number
      note?: string
    }
    expect(r.content.length).toBeLessThanOrEqual(MAX_READ_RETURN_CHARS + 100)
    expect(r.content.startsWith('line 0 ')).toBe(true)
    expect(r.totalLines).toBe(4000)
    expect(r.lines).toBeLessThan(4000)
    expect(r.note).toContain('Next window: offset')
  })

  it('still honours an explicit window on a huge file', async () => {
    const read = buildTools(backendWith(huge)).find((t) => t.name === 'read_file')!
    const r = (await read.execute({ path: 'README.md', offset: 3000, limit: 5 })) as {
      content: string
      offset: number
      lines: number
    }
    expect(r.offset).toBe(3000)
    expect(r.lines).toBe(5)
    expect(r.content.startsWith('line 2999 ')).toBe(true)
  })

  it('returns a small file whole, as before', async () => {
    const read = buildTools(backendWith('hello\nworld')).find((t) => t.name === 'read_file')!
    const r = (await read.execute({ path: 'a.txt' })) as { content: string; lines?: number }
    expect(r.content).toBe('hello\nworld')
    expect(r.lines).toBeUndefined()
  })

  it('bounds a batch by the call, so one giant file cannot fill it and the rest are named', async () => {
    const read = buildTools(backendWith(huge)).find((t) => t.name === 'read_file')!
    const r = (await read.execute({ paths: ['a.md', 'b.md', 'c.md'] })) as {
      files: Array<{ path: string; content?: string; truncated?: boolean; error?: string }>
      note?: string
    }
    // The first file alone is bigger than the whole call: it comes back as a
    // window (a contiguous prefix with its own next-window note), and the files
    // after it are listed rather than returned in part.
    expect(r.files).toHaveLength(3)
    expect(r.files[0].truncated).toBe(true)
    expect(r.files[0].content!.length).toBeLessThanOrEqual(MAX_READ_CALL_CHARS)
    expect(r.files.slice(1).every((f) => f.error?.startsWith('not returned'))).toBe(true)
    expect(r.note).toContain('Returned 1 of 3 files')
    expect(r.note).toContain('/test/b.md, /test/c.md')
    expect(JSON.stringify(r).length).toBeLessThanOrEqual(MAX_READ_CALL_CHARS)
  })
})

// ── the ten-file batch whose middle the request side cut ─────────────────────
// X0 flash-m81 (2026-10-16, +01:04): the planner read ten e2e specs in ONE call,
// 121,467 chars. The tool believed every file was whole (each was under the
// 80 KB one file gets), but the request side cuts any block over 60,000 to
// ~30 KB of head plus ~30 KB of tail — so the middle six files fell out between
// two `"content"` values and the planner re-read them in six further calls
// (52,908 chars), after a note that had promised each one "fits in one call".
// The batch now gets that same 60,000-char ceiling: whole files up to it, and
// every path it did not return named. The sizes below are the ones measured.

describe('read_file on a batch the request side would cut', () => {
  const sizes: Array<[string, number]> = [
    ['e2e/comments.spec.ts', 8065],
    ['e2e/error-handling.spec.ts', 34_332],
    ['e2e/health.spec.ts', 1283],
    ['e2e/null-fields.spec.ts', 8590],
    ['e2e/navigation.spec.ts', 9965],
    ['e2e/settings.spec.ts', 10_173],
    ['e2e/social.spec.ts', 8069],
    ['e2e/url-navigation.spec.ts', 12_830],
    ['e2e/user-fetch-errors.spec.ts', 11_966],
    ['e2e/xss-security.spec.ts', 12_030],
  ]
  /** Exactly `chars` long, in lines the shape of a Playwright spec. */
  const specOf = (chars: number): string => {
    const lines: string[] = []
    let left = chars
    while (left > 62) {
      const line = `  await expect(page.getByText('row ${lines.length}')).toBeVisible()`
      lines.push(line)
      left -= line.length + 1
    }
    lines.push('x'.repeat(left))
    return lines.join('\n')
  }
  const contents = new Map(sizes.map(([path, n]) => [path, specOf(n)]))

  function backend(): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn(async (p: string) => {
        const path = p.replace('/test/', '')
        const content = contents.get(path)
        if (content === undefined) throw new Error('No such file or directory')
        return content
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('returns whole files up to the ceiling and names every file it did not', async () => {
    for (const [path, n] of sizes) expect(contents.get(path)!.length).toBe(n)
    const read = buildTools(backend()).find((t) => t.name === 'read_file')!
    const paths = sizes.map(([path]) => path)
    const r = (await read.execute({ paths })) as {
      files: Array<{ path: string; content?: string; truncated?: boolean; error?: string }>
      note?: string
    }
    // One entry per path, in the order given (the schema's contract), each named
    // the way the tool reports a resolved path…
    const resolved = paths.map((p) => `/test/${p}`)
    expect(r.files.map((f) => f.path)).toEqual(resolved)
    // …the first files whole, and no file in part: this is what the request side
    // did instead — a head and a tail with the middle six files gone.
    const returned = r.files.filter((f) => typeof f.content === 'string')
    expect(returned.length).toBeGreaterThan(0)
    expect(returned.length).toBeLessThan(sizes.length)
    expect(returned.map((f) => f.path)).toEqual(resolved.slice(0, returned.length))
    for (const f of returned) expect(f.content).toBe(contents.get(f.path.replace('/test/', '')))
    expect(r.files.some((f) => f.truncated === true)).toBe(false)
    // The files it did not return are named, in order, in the note AND in the
    // batch itself — the planner can see exactly which reads are still owed.
    const missing = r.files.slice(returned.length)
    expect(missing.every((f) => f.error?.startsWith('not returned'))).toBe(true)
    expect(r.note).toContain(`Returned whole: ${returned.length} of 10 files`)
    for (const p of resolved.slice(returned.length)) expect(r.note).toContain(p)
    // Under the ceiling the request side enforces, so nothing is cut at all.
    expect(JSON.stringify(r).length).toBeLessThanOrEqual(MAX_READ_CALL_CHARS)
  })

  it('reads the rest in the calls the note points at, each of them whole', async () => {
    const read = buildTools(backend()).find((t) => t.name === 'read_file')!
    const paths = sizes.map(([path]) => path)
    const first = (await read.execute({ paths })) as {
      files: Array<{ path: string; content?: string }>
    }
    const owed = first.files.filter((f) => typeof f.content !== 'string').map((f) => f.path)
    expect(owed).toHaveLength(6)
    const next = (await read.execute({ paths: owed })) as {
      files: Array<{ path: string; content?: string }>
    }
    // A second call for the files it was told about comes back with them whole,
    // in order — and (the six specs total 64,953 chars) not all in one shot.
    expect(next.files.map((f) => f.path)).toEqual(owed)
    expect(next.files.some((f) => typeof f.content === 'string')).toBe(true)
    for (const f of next.files)
      if (typeof f.content === 'string')
        expect(f.content).toBe(contents.get(f.path.replace('/test/', '')))
  })
})

// ── a missing space next to punctuation ─────────────────────────────────────
// X0 run x6: with the file's exact text out of context, the executor sent
// `readdirSync,readFileSync` for a file that reads `readdirSync, readFileSync`.
// Runs of whitespace were already folded; a MISSING space is zero whitespace.

describe('edit_file tolerates spacing around punctuation', () => {
  const file = [
    "import { createHash } from 'node:crypto'",
    "import { existsSync, readdirSync, readFileSync } from 'node:fs'",
    "import { join } from 'node:path'",
    '',
    'export const x = 1',
  ].join('\n')
  function backendWith(): ExecutionBackend & { written: string[] } {
    const written: string[] = []
    return {
      projectRoot: '/test',
      written,
      readFile: vi.fn().mockResolvedValue(file),
      writeFile: vi.fn(async (_p: string, c: string) => {
        written.push(c)
      }),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('applies an edit whose old_string lacks the space after a comma', async () => {
    const backend = backendWith()
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'a.ts',
      old_string: "import { existsSync, readdirSync,readFileSync } from 'node:fs'",
      new_string: "import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'",
    })) as { ok?: boolean; error?: string }
    expect(r.error).toBeUndefined()
    expect(backend.written[0]).toContain('statSync')
    // The rest of the file is untouched.
    expect(backend.written[0]).toContain("import { join } from 'node:path'")
  })

  it('still refuses a genuinely different token', async () => {
    const backend = backendWith()
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'a.ts',
      old_string: "import { existsSync, readdirSync, readFileSyncX } from 'node:fs'",
      new_string: 'nope',
    })) as { error?: string }
    expect(r.error).toContain('not found')
    expect(backend.written).toHaveLength(0)
  })

  it('still refuses an ambiguous match', async () => {
    const backend = backendWith()
    backend.readFile = vi.fn().mockResolvedValue('a, b\na,b\n')
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({ path: 'a.ts', old_string: 'a ,b', new_string: 'z' })) as {
      error?: string
    }
    expect(r.error).toBeDefined()
    expect(backend.written).toHaveLength(0)
  })
})

// ── the window note decides the next call ───────────────────────────────────
// X0 run x7: a 44 KB README was read as seven 300-line windows because the note
// only ever said "read another window".

describe('read_file window notes', () => {
  const lines = Array.from({ length: 2000 }, (_, i) => `line ${i}`).join('\n') // ~19 KB
  function backendWith(content: string): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn().mockResolvedValue(content),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('tells the executor a small file fits in one call instead of inviting paging', async () => {
    const read = buildTools(backendWith(lines)).find((t) => t.name === 'read_file')!
    const r = (await read.execute({ path: 'README.md', offset: 300, limit: 300 })) as {
      note?: string
    }
    expect(r.note).toContain('fits in ONE call')
    expect(r.note).not.toContain('Next window')
  })

  it('names the exact next window for a file that does not fit', async () => {
    const huge = Array.from({ length: 6000 }, (_, i) => `line ${i} ${'x'.repeat(40)}`).join('\n')
    const read = buildTools(backendWith(huge)).find((t) => t.name === 'read_file')!
    const r = (await read.execute({ path: 'README.md', offset: 1, limit: 500 })) as {
      note?: string
    }
    expect(r.note).toContain('Next window: offset 501, limit 500')
  })
})

// ── a command that never exits ──────────────────────────────────────────────
// X0 run x9: five waits of 120 s each on an e2e suite that could never start.

describe('wait_for_task on a slow command whose output keeps growing', () => {
  it('stays "running" past the threshold while the log grows (X1 m21: a live suite called stuck)', async () => {
    process.env.MOL_AI_BG_STUCK_AFTER_MS = '200'
    try {
      let size = 100
      const backend: ExecutionBackend = {
        projectRoot: '/test',
        readFile: vi.fn(async () => {
          throw new Error('ENOENT')
        }),
        writeFile: vi.fn(),
        deleteFile: vi.fn(),
        readDir: vi.fn(),
        // Each look at the log finds it larger: the suite is still printing.
        run: vi.fn(async () => ({ stdout: String((size += 500)), stderr: '', exitCode: 0 })),
      }
      const wait = buildTools(backend).find((t) => t.name === 'wait_for_task')!
      const id = 'mol-bg-slow000-abc123'
      for (let i = 0; i < 4; i++) {
        const r = (await wait.execute({ taskId: id, timeout: 120 })) as { status: string }
        expect(r.status).toBe('running')
      }
    } finally {
      delete process.env.MOL_AI_BG_STUCK_AFTER_MS
    }
  })
})

// ── what a wait knows about the command it is waiting on ────────────────────
// X1 flash-m62 (2026-10-16): three 290 s waits on one 8.3-minute suite, every
// answer reading only "Still running after 280s".
describe('wait_for_task on a task that is still running', () => {
  /**
   * A backend for a task with no exit file yet: its log is `slice`, and it
   * answers the wait's two shell reads (the size probe and the log slice).
   */
  function runningBackend(slice: string, size = 40_000): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn(async () => {
        throw new Error('ENOENT')
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async (command: string) => ({
        stdout: /wc -c/.test(command) ? String(size) : slice,
        stderr: '',
        exitCode: 0,
      })),
    }
  }
  /** A task id whose embedded start stamp is `agoMs` before now (as the tool mints them). */
  const idStartedAgo = (agoMs: number): string =>
    `mol-bg-${(Date.now() - agoMs).toString(36)}-abc123`

  it('says how long the suite has been running and how much is left, from its id and its log', async () => {
    const id = idStartedAgo(6 * 60_000)
    const slice = '[120/139] [chromium] › e2e/navigation.spec.ts:44:3 › tag filter\n'
    const wait = buildTools(runningBackend(slice)).find((t) => t.name === 'wait_for_task')!
    const r = (await wait.execute({ taskId: id, timeout: 50 })) as { status: string; note: string }
    expect(r.status).toBe('running')
    expect(r.note).toContain('has been running 6 min')
    expect(r.note).toContain('its log is at 120 of 139')
    // 6 min at 120 of 139 tests is ~57 s of work left, inside one wait's ceiling.
    expect(r.note).toContain('one more wait covers it')
  })

  it('says how long it has been running even when the log carries no counter', async () => {
    const id = idStartedAgo(11 * 60_000)
    const wait = buildTools(runningBackend('npm install: still working\n')).find(
      (t) => t.name === 'wait_for_task',
    )!
    const r = (await wait.execute({ taskId: id, timeout: 50 })) as { status: string; note: string }
    expect(r.note).toContain('has been running 11 min')
    expect(r.note).not.toContain('its log is at')
  })

  it('counts the waits still owed when the rate says the suite outlasts one of them', async () => {
    const id = idStartedAgo(8 * 60_000)
    // 20 of 139 done after 8 minutes: the remaining 119 tests are ~47 min at that rate.
    const wait = buildTools(runningBackend('[20/139] [chromium] › e2e/a.spec.ts:1:1 › x\n')).find(
      (t) => t.name === 'wait_for_task',
    )!
    const r = (await wait.execute({ taskId: id, timeout: 50 })) as { note: string }
    expect(r.note).toMatch(/left at that rate \(\d+ more waits\)/)
    expect(r.note).not.toContain('one more wait covers it')
  })

  it('names the finished walk and the second one instead of "slow, not stuck" (m157 +14:02)', async () => {
    // The log at the +18:50 wait: the first walk's closing tally, then the second walk's header
    // and progress. The count keeps growing, which used to read as one slow run.
    const slice = [
      'Running 138 tests using 1 worker',
      '  ✘   1 [chromium] › e2e/articles.spec.ts:123:3 › Unfavorite (9.2s)',
      '  4 failed',
      '  65 skipped',
      '  70 passed (4.5m)',
      '',
      'Running 138 tests using 1 worker',
      '  [4/138] [chromium] › e2e/articles.spec.ts:3:1 › lists articles',
    ].join('\n')
    const id = idStartedAgo(4 * 60_000)
    const wait = buildTools(runningBackend(slice, 25_905)).find((t) => t.name === 'wait_for_task')!
    const r = (await wait.execute({ taskId: id, timeout: 50 })) as {
      status: string
      note: string
    }
    expect(r.status).toBe('running')
    expect(r.note).toContain('the first walk in this command has finished')
    expect(r.note).toContain('(4 failed / 65 skipped / 70 passed (4.5m))')
    expect(r.note).toContain('started a SECOND walk of the same suite')
    // The growth is the second walk printing, not a slow first one — and its counter is not this
    // run's progress.
    expect(r.note).not.toContain('slow, not stuck')
    expect(r.note).not.toContain('its log is at')
    // The advice follows the finding: stop the duplicate walk, do not wait it out.
    expect(r.note).not.toContain('Call wait_for_task again')
    expect(r.note).toContain('Stop it (')
  })

  it('carries the log slice on the "slow, not stuck" answer too, not just the plain one', async () => {
    process.env.MOL_AI_BG_STUCK_AFTER_MS = '100'
    try {
      const id = idStartedAgo(90_000)
      const slice = '✘ 41 [chromium] › e2e/tags.spec.ts:12:3 › popular tags\n[41/139] done so far\n'
      const wait = buildTools(runningBackend(slice, 900)).find((t) => t.name === 'wait_for_task')!
      const r = (await wait.execute({ taskId: id, timeout: 200 })) as {
        status: string
        note: string
        outputSoFar?: string
      }
      expect(r.status).toBe('running')
      expect(r.note).toContain('slow, not stuck')
      expect(r.note).toContain('has been running 1 min')
      expect(r.note).toContain('its log is at 41 of 139')
      expect(r.outputSoFar).toContain('popular tags')
    } finally {
      delete process.env.MOL_AI_BG_STUCK_AFTER_MS
    }
  })

  /**
   * The note's clauses. It joins facts with "; " and ends each sentence with a
   * period, so those are the boundaries; lowercased and trimmed so a clause that
   * repeats one already said still reads as the same one.
   */
  const noteClauses = (note: string): string[] =>
    note
      .split(/[.;]\s+/)
      .map((c) =>
        c
          .trim()
          .toLowerCase()
          .replace(/[.,;]+$/, ''),
      )
      .filter((c) => c.length > 12)
  /** The clause that repeats another, whole or inside a longer one, or null. */
  const repeatedClause = (note: string): string | null => {
    const clauses = noteClauses(note)
    for (const [i, clause] of clauses.entries())
      for (const other of clauses.slice(i + 1))
        if (clause.includes(other) || other.includes(clause)) return `${clause} / ${other}`
    return null
  }

  it('says each fact once — m87 §+47:20 read the elapsed time and the growth clause twice', async () => {
    process.env.MOL_AI_BG_STUCK_AFTER_MS = '100'
    try {
      // m87 §+47:20's answer, fact for fact: a 139-test suite 5 min 51 s into its
      // run at 105 of 139, its log 71 839 bytes and still growing, read by a wait
      // whose ceiling leaves "one more wait covers it".
      const id = idStartedAgo(351_000)
      const slice = '[105/139] [chromium] › e2e/settings.spec.ts:120:3 › tag filter\n'
      const wait = buildTools(runningBackend(slice, 71_839)).find(
        (t) => t.name === 'wait_for_task',
      )!
      const r = (await wait.execute({ taskId: id, timeout: 200 })) as {
        status: string
        note: string
      }
      expect(r.status).toBe('running')
      expect(r.note).toMatch(/has been running 5 min 5\d s/)
      expect(r.note).toContain('its log is at 105 of 139')
      expect(r.note).toContain('one more wait covers it')
      // The note used to read "Still running after 342s of waiting, and its output
      // is still growing (71839 bytes) — slow, not stuck." with the progress
      // sentence appended: one answer in which those two facts were each stated
      // twice. Each is stated once here, and no clause contains another.
      expect(r.note.match(/still growing \(71839 bytes\)/g) ?? []).toHaveLength(1)
      expect(
        noteClauses(r.note).filter((c) =>
          /has been running|\d+s of waiting|still running after/.test(c),
        ),
      ).toHaveLength(1)
      expect(repeatedClause(r.note)).toBeNull()
    } finally {
      delete process.env.MOL_AI_BG_STUCK_AFTER_MS
    }
  })

  it('states the elapsed time once on the plain answer too, before the stuck threshold', async () => {
    const id = idStartedAgo(6 * 60_000)
    const slice = '[120/139] [chromium] › e2e/navigation.spec.ts:44:3 › tag filter\n'
    const wait = buildTools(runningBackend(slice)).find((t) => t.name === 'wait_for_task')!
    const r = (await wait.execute({ taskId: id, timeout: 50 })) as { note: string }
    // "Still running after 0s. It has been running 6 min; …" said it twice in two
    // formats, the same defect as §+47:20 on the branch that fires before the
    // threshold.
    expect(r.note).not.toContain('of waiting')
    expect(r.note).not.toMatch(/Still running after/)
    expect(r.note.match(/has been running/g) ?? []).toHaveLength(1)
    expect(repeatedClause(r.note)).toBeNull()
  })
})

describe('wait_for_task on a stuck command', () => {
  it('reports it stuck once the total waiting crosses the threshold, then refuses to wait again', async () => {
    // Margins wide enough that a loaded test machine cannot flip the first
    // answer: 40 ms against a 30 ms wait read 'stuck' under a full-suite run.
    process.env.MOL_AI_BG_STUCK_AFTER_MS = '2000'
    try {
      const backend: ExecutionBackend = {
        projectRoot: '/test',
        readFile: vi.fn(async () => {
          throw new Error('ENOENT')
        }),
        writeFile: vi.fn(),
        deleteFile: vi.fn(),
        readDir: vi.fn(),
        run: vi.fn(),
      }
      const wait = buildTools(backend).find((t) => t.name === 'wait_for_task')!
      const id = 'mol-bg-stuck00-abc123'
      const first = (await wait.execute({ taskId: id, timeout: 1100 })) as { status: string }
      expect(first.status).toBe('running')
      const second = (await wait.execute({ taskId: id, timeout: 1100 })) as {
        status: string
        note: string
      }
      expect(second.status).toBe('stuck')
      expect(second.note).toContain('kill')
      expect(second.note).toContain(`${id}.pid`)
      // A third call does not wait at all.
      const t0 = Date.now()
      const third = (await wait.execute({ taskId: id, timeout: 5000 })) as { status: string }
      expect(third.status).toBe('stuck')
      expect(Date.now() - t0).toBeLessThan(500)
    } finally {
      delete process.env.MOL_AI_BG_STUCK_AFTER_MS
    }
  })

  it('records the pid of a background command so a stuck one can be killed', async () => {
    const backend: ExecutionBackend = {
      projectRoot: '/test',
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
    const exec = buildTools(backend).find((t) => t.name === 'exec_command')!
    const r = (await exec.execute({ command: 'npm test', run_in_background: true })) as {
      taskId: string
    }
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(cmd).toContain(`echo $! > /tmp/${r.taskId}.pid`)
  })
})

// ── a running suite whose failures repeat one cause ─────────────────────────
// X1 flash-m76: a capped diagnosis run walked 17 tests in 4.0 minutes and every one of its 15
// failures was the same page.waitForURL timeout from one missing `navigate('/')`, which the
// executor learned only when `wait_for_task(280s)` returned the finished log. It then fixed the
// cause in 51 s. The lines below are that run's own `list` output.
describe('wait_for_task on a suite repeating one failure', () => {
  const M76_LOG = [
    'Running 139 tests using 1 worker',
    '',
    '  ✘    1 [chromium] › ../../fixtures/realworld/specs/e2e/articles.spec.ts:32:3 › Articles › should create a new article (15.6s)',
    '  ✘    2 [chromium] › ../../fixtures/realworld/specs/e2e/articles.spec.ts:50:3 › Articles › should edit an existing article (15.6s)',
    '  ✘    3 [chromium] › ../../fixtures/realworld/specs/e2e/articles.spec.ts:71:3 › Articles › should delete an article (15.6s)',
  ].join('\n')

  /**
   * A backend for a task that has not exited: it answers the wait's log reads with `log`, its
   * size probe with a constant, and the pid walk with `pids` (empty when it cannot).
   */
  function repeatingBackend(log: string, pids: string): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn(async () => {
        throw new Error('ENOENT')
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async (command: string) => ({
        stdout: /wc -c/.test(command) ? '900' : /pgrep -P/.test(command) ? pids : log,
        stderr: '',
        exitCode: 0,
      })),
    }
  }

  /**
   * The other flash-m83 shape: the app is not answering, so every test the run walked — four
   * files — failed on the same `connect ECONNREFUSED`, with nothing passing between them. This
   * is the one shape the note is allowed to stop a run over.
   */
  const REFUSED_LOG = (() => {
    const block = (n: number, file: string, line: number, title: string): string =>
      [
        `  ${n}) [chromium] › ../../fixtures/realworld/specs/e2e/${file}:${line}:3 › ${title} ────────`,
        '',
        '    Error: connect ECONNREFUSED 127.0.0.1:4000',
        '',
        '       at helpers/request.ts:9',
      ].join('\n')
    const test = (n: number, file: string, line: number, title: string, seconds: string): string =>
      [
        `  ✘    ${n} [chromium] › ../../fixtures/realworld/specs/e2e/${file}:${line}:3 › ${title} (${seconds})`,
        block(n, file, line, title),
      ].join('\n')
    return [
      'Running 139 tests using 1 worker',
      test(1, 'articles.spec.ts', 32, 'Articles › should create a new article', '2.1s'),
      test(2, 'auth.spec.ts', 12, 'Authentication › should log in', '1.9s'),
      test(3, 'comments.spec.ts', 60, 'Comments › should delete a comment', '2.0s'),
      test(4, 'tags.spec.ts', 12, 'Tags › shows the pill', '2.2s'),
    ].join('\n')
  })()

  it('hands the failing test’s re-run over for AFTER the run ends (xr-molecule-flash-m89)', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      const tools = buildTools(repeatingBackend(M76_LOG, '412 419'))
      // The run is started HERE, so the process that writes the note knows how it was run — which
      // is what makes an exact re-run possible at all.
      const started = (await tools
        .find((t) => t.name === 'exec_command')!
        .execute({
          command:
            'cd /workspace/.mol-scratch/e2e && BASE_URL=http://localhost:5173 ' +
            'npx --no-install playwright test --max-failures=15',
          run_in_background: true,
        })) as { taskId: string }
      const r = (await tools
        .find((t) => t.name === 'wait_for_task')!
        .execute({ taskId: started.taskId, timeout: 300 })) as { status: string; note: string }
      // A shared duration is a LEAD: this log is `list`-only, so the three 15.6 s failures carry no
      // error to name a cause with, and the wait keeps going — the note rides its result instead
      // of ending it (`earlyReturnCause`).
      expect(r.status).toBe('running')
      // The mid-run note never offers the re-run for now: the platform refuses a second run
      // against the same app and database while this one walks, and m89 sent exactly what the old
      // wording suggested 23 s later to be refused.
      expect(r.note).not.toContain('reproduces the first one')
      expect(r.note).toContain('Read `../../fixtures/realworld/specs/e2e/articles.spec.ts:32`')
      expect(r.note).toContain('nothing may run against this app while the run walks')
      expect(r.note).toContain('Send this once the run ends:')
      // …and it names the exact command, composed from the run's own invocation in the directory
      // it was started in, narrowed to the test the log named — the location resolved against
      // that directory, since Playwright matches file arguments against absolute paths and the
      // reported `../../…` form matches nothing (m118 +16:34, m124 +18:38).
      expect(r.note).toContain('cd /workspace/.mol-scratch/e2e && BASE_URL=http://localhost:5173')
      expect(r.note).toContain(
        'playwright test /workspace/fixtures/realworld/specs/e2e/articles.spec.ts:32',
      )
      expect(r.note).toContain('--retries=0')
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })

  it('keeps waiting on a shared duration and attaches it as a note, with NO stop command (flash-m83, flash-m84)', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      const id = 'mol-bg-m76rep-abc123'
      const wait = buildTools(repeatingBackend(M76_LOG, '412 419')).find(
        (t) => t.name === 'wait_for_task',
      )!
      const t0 = Date.now()
      const r = (await wait.execute({ taskId: id, timeout: 300 })) as {
        status: string
        waitedMs: number
        note: string
      }
      // Nothing here names a cause, so nothing here ends the wait: the caller's own budget does,
      // and the wait has to spend it (xr-molecule-flash-m99: the early return this replaced made
      // the model stop waiting and edit the code the run was still testing).
      expect(r.status).toBe('running')
      expect(Date.now() - t0).toBeGreaterThanOrEqual(250)
      expect(r.waitedMs).toBeGreaterThanOrEqual(250)
      // A `list`-only log carries no failure bodies, so the duration is the only signature it
      // has — and the note says so rather than calling it one cause (flash-m84).
      expect(r.note).toContain('3 different tests in this run each failed after ~15.6s')
      expect(r.note).toContain('A shared duration is a lead, not a cause')
      // The row names the path the run's log wrote — the same one the reproduce hint
      // below names (flash-m82 took the shortened form for the app's own file).
      expect(r.note).toContain(
        '✘ ../../fixtures/realworld/specs/e2e/articles.spec.ts:32 › should create a new article (15.6s)',
      )
      // This task was not started by this process (no command to read a target from), so the note
      // assumes the sandbox's own app — the conservative reading — and plans the fix instead of
      // telling the executor to edit under the run (xr-molecule-flash-m122 +19:00).
      expect(r.note).toContain(
        'Work out the fixes now: apply them when the run ends, not while it walks.',
      )
      expect(r.note).not.toContain('Start on them now, while the run keeps walking')
      expect(r.note).toContain('Let the rest of the run finish')
      expect(r.note).toContain(`task ${id}`)
      // Three failures inside ONE file is not a broken run — X1 flash-m83 stopped eight runs at
      // their first repeating cause and never finished one, so this shape gets no kill command.
      // Neither does a shared duration: the status says `running`, and the lead's own words never
      // hand a run over to be stopped.
      expect(r.note).not.toContain('Stop it and fix')
      expect(r.note).not.toContain('kill')
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })

  /**
   * xr-molecule-flash-m99's own log at +43:23, as the run's chat dump recorded it: three
   * `url-navigation.spec.ts` tests, each ~16.2 s, in a `list` log with durations and no error
   * bodies — the suite's own `timeout: 15_000` plus teardown. `wait_for_task` was handed back
   * `status: 'repeating_failure'` on exactly this, 224 s into a 280 s wait, and the run's result
   * was voided by the edits that followed.
   */
  const M99_TIMEOUTS = [
    'Running 24 tests using 1 worker',
    '  ✘    7 [chromium] › e2e/url-navigation.spec.ts:111:3 › URL navigation › back button returns to the feed (16.1s)',
    '  ✘   11 [chromium] › e2e/url-navigation.spec.ts:137:3 › URL navigation › forward button returns to the article (16.2s)',
    '  ✘   14 [chromium] › e2e/url-navigation.spec.ts:182:3 › URL navigation › direct URL loads the article (16.4s)',
  ].join('\n')

  it('never ends a wait on three timeouts that only share the suite’s own timeout (xr-molecule-flash-m99)', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      const wait = buildTools(repeatingBackend(M99_TIMEOUTS, '412 419')).find(
        (t) => t.name === 'wait_for_task',
      )!
      const t0 = Date.now()
      const r = (await wait.execute({ taskId: 'mol-bg-m99to-abc130', timeout: 300 })) as {
        status: string
        note: string
      }
      expect(r.status).toBe('running')
      // The whole budget, not an early return: a duration the config produces is a lead, and the
      // run is the only thing that will say what those tests did.
      expect(Date.now() - t0).toBeGreaterThanOrEqual(250)
      expect(r.note).toContain('3 different tests in this run each failed after ~16.2s')
      expect(r.note).toContain('A shared duration is a lead, not a cause')
      expect(r.note).not.toContain('Stop it and fix')
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })

  it('still keeps waiting when a shared duration spans the whole run (three files, nothing passing)', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      // Every test the run walked failed, across three files, with nothing passing since the
      // first — `universalCause` says the run is failing WHOLE. The one thing this log does not
      // carry is an error: three 16.x s timeouts are the suite's `timeout: 15_000` and nothing
      // else, so this is still a lead and the wait still goes on. Only a PROVEN cause stops it.
      const log = [
        'Running 24 tests using 1 worker',
        '  ✘    3 [chromium] › e2e/auth.spec.ts:12:3 › Authentication › should log in (16.1s)',
        '  ✘    7 [chromium] › e2e/articles.spec.ts:32:3 › Articles › should create an article (16.2s)',
        '  ✘   14 [chromium] › e2e/url-navigation.spec.ts:111:3 › URL navigation › back button (16.4s)',
      ].join('\n')
      const wait = buildTools(repeatingBackend(log, '412 419')).find(
        (t) => t.name === 'wait_for_task',
      )!
      const r = (await wait.execute({ taskId: 'mol-bg-m99uni-abc131', timeout: 300 })) as {
        status: string
        note: string
      }
      expect(r.status).toBe('running')
      expect(r.note).not.toContain('Every remaining test will fail the same way too')
      expect(r.note).not.toContain('Stop it and fix')
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })

  it('hands over the stop command when one cause is failing the WHOLE run (flash-m83)', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      const id = 'mol-bg-m83ref-abc127'
      const wait = buildTools(repeatingBackend(REFUSED_LOG, '412 419')).find(
        (t) => t.name === 'wait_for_task',
      )!
      const r = (await wait.execute({ taskId: id, timeout: 60_000 })) as {
        status: string
        note: string
      }
      // The ONE finding that ends a wait early: a proven cause — the same `connect ECONNREFUSED`
      // verbatim in four files — failing every test the run walked.
      expect(r.status).toBe('repeating_failure')
      expect(r.note).toContain('Every test this run has walked so far has failed the same way')
      expect(r.note).toContain('across 4 files')
      expect(r.note).toContain('Every remaining test will fail the same way too')
      // Every pid the task owns, from the sandbox's own pid file — never a pattern.
      expect(r.note).toContain('`exec_command: kill 412 419`')
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })

  it('falls back to the platform’s pid-file command when the pid walk comes back empty', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      const id = 'mol-bg-m76pid-abc124'
      const wait = buildTools(repeatingBackend(REFUSED_LOG, '')).find(
        (t) => t.name === 'wait_for_task',
      )!
      const r = (await wait.execute({ taskId: id, timeout: 60_000 })) as { note: string }
      expect(r.note).toContain(`kill $(cat /tmp/${id}.pid)`)
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })

  it('keeps waiting when the failures are not the same shape', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      const log = [
        '  ✘   1 [chromium] › e2e/a.spec.ts:1:1 › A › one (0.2s)',
        '  ✘   2 [chromium] › e2e/b.spec.ts:2:2 › B › two (5.1s)',
        '  ✘   3 [chromium] › e2e/c.spec.ts:3:3 › C › three (12.0s)',
      ].join('\n')
      const wait = buildTools(repeatingBackend(log, '')).find((t) => t.name === 'wait_for_task')!
      const r = (await wait.execute({ taskId: 'mol-bg-m76mix-abc125', timeout: 300 })) as {
        status: string
      }
      expect(r.status).toBe('running')
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })

  it('names the lead once — a second wait on the same run just waits', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      const id = 'mol-bg-m76once-abc126'
      const wait = buildTools(repeatingBackend(M76_LOG, '')).find(
        (t) => t.name === 'wait_for_task',
      )!
      const first = (await wait.execute({ taskId: id, timeout: 300 })) as { note: string }
      expect(first.note).toContain('3 different tests in this run each failed after ~15.6s')
      const second = (await wait.execute({ taskId: id, timeout: 300 })) as { note: string }
      expect(second.note).not.toContain('A shared duration is a lead, not a cause')
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })
})

// ── what the running note says an edit does ─────────────────────────────────
// xr-molecule-flash-m122 (+19:00): one `wait_for_task` result told a run against
// `BASE_URL=https://…apps.mlcl.dev` that "editing app/src or api/src now changes the code the run is
// testing, and its result no longer counts", and then, in the same result, "Start fixing it now,
// while the run keeps walking". The run obeyed the first sentence and spent the rest of the suite
// waiting; it was measuring the deployed build, which no local edit can change.
describe('the running note knows what the run measures (xr-molecule-flash-m122)', () => {
  /**
   * A line-reporter log whose three failures share one body: the mid-run look names it, so the
   * wait's result carries the lead note whose wording has to agree with the wait's own sentence.
   */
  const REPEATING = (() => {
    const test = (n: number, line: number, title: string): string =>
      [
        `  ✘    ${n} ../../specs/specs/e2e/null-fields.spec.ts:${line}:3 › Nulls › ${title} (6.7s)`,
        `  ${n}) ../../specs/specs/e2e/null-fields.spec.ts:${line}:3 › Nulls › ${title} ────────`,
        '',
        '    TimeoutError: page.waitForURL: Timeout 5000ms exceeded.',
        '    Call log:',
        '      - waiting for navigation until "load"',
        '',
        '       at null-fields.spec.ts:71',
      ].join('\n')
    return [
      'Running 139 tests using 1 worker',
      test(4, 71, 'a'),
      test(5, 88, 'b'),
      test(6, 117, 'c'),
    ].join('\n')
  })()

  /**
   * A backend for a background run that has not exited: its log reads answer with the run's own
   * output (the size probe with a constant), so the mid-run look finds the repeating cause.
   *
   * @returns The backend.
   */
  function runningSuiteBackend(): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn(async () => {
        throw new Error('ENOENT')
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async (command: string) => ({
        stdout: /wc -c/.test(command) ? '900' : REPEATING,
        stderr: '',
        exitCode: 0,
      })),
    }
  }

  /**
   * Start `command` in the background and take the first wait answer.
   *
   * @param command - The suite command the executor sent.
   * @returns The wait's result.
   */
  async function firstWait(command: string): Promise<{ status: string; note: string }> {
    const tools = buildTools(runningSuiteBackend())
    const started = (await tools
      .find((t) => t.name === 'exec_command')!
      .execute({ command, run_in_background: true })) as { taskId: string }
    return (await tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId: started.taskId, timeout: 60 })) as { status: string; note: string }
  }

  it('tells a DEPLOYED-URL run that editing does not change what it tests, and to fix while it walks', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      const r = await firstWait(
        'cd /workspace/.mol-scratch/rw-e2e && TEST_MODE=fullstack ' +
          'BASE_URL=https://loopcheck-xr-molecule-flash-m122.apps.mlcl.dev ' +
          'npx playwright test --config ./playwright.config.ts --retries=0',
      )
      expect(r.status).toBe('running')
      expect(r.note).toContain('this run tests the deployed build')
      expect(r.note).toContain('editing app/src or api/src now does not change what it tests')
      // The two halves of the result agree: the fix can start while the run walks.
      expect(r.note).toContain('Start fixing it now, while the run keeps walking')
      expect(r.note).not.toContain('its result no longer counts')
      expect(r.note).not.toContain('apply it when the run ends')
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })

  it('keeps the local sentence for a localhost run, and the lead note plans instead of editing', async () => {
    process.env.MOL_AI_BG_CAUSE_LOOK_MS = '1'
    try {
      const r = await firstWait(
        'cd /workspace/.mol-scratch/rw-e2e && BASE_URL=http://localhost:5173 ' +
          'npx playwright test --config ./playwright.config.ts --retries=0',
      )
      expect(r.status).toBe('running')
      expect(r.note).toContain(
        'editing app/src or api/src now changes the code the run is testing, and its result no longer counts',
      )
      expect(r.note).not.toContain('this run tests the deployed build')
      // ONE result never says both "editing changes the code under test" and "Start fixing it now".
      expect(r.note).toContain(
        'Work out the fix now: apply it when the run ends, not while it walks.',
      )
      expect(r.note).not.toContain('Start fixing it now')
    } finally {
      delete process.env.MOL_AI_BG_CAUSE_LOOK_MS
    }
  })
})

describe('parse check after a write', () => {
  function mockBackend(): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn().mockResolvedValue('const a = 1\n'),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      readDir: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('names .tsx when a .ts file fails to parse on JSX (flash-m28)', async () => {
    const backend = mockBackend()
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '',
      stderr:
        '3:14: Expected ">" but found "className"\n  return <div className="x">\n             ^',
      exitCode: 1,
    })
    const write = buildTools(backend).find((t) => t.name === 'write_file')!
    const result = (await write.execute({ path: '/test/src/Page.ts', content: 'x' })) as {
      syntaxError?: string
    }
    expect(result.syntaxError).toContain('JSX only parses in a `.tsx` file')
  })

  it('edit_file returns the parse error in its own result when the file no longer parses', async () => {
    const backend = mockBackend()
    ;(backend.run as ReturnType<typeof vi.fn>).mockImplementation(async (command: string) =>
      command.startsWith('node --check')
        ? {
            stdout: '',
            stderr: '/test/scripts/prerender.mjs:162\n  `;\n   ^^^\nSyntaxError: Unexpected number',
            exitCode: 1,
          }
        : { stdout: '', stderr: '', exitCode: 0 },
    )
    const tools = buildTools(backend)
    const editFile = tools.find((t) => t.name === 'edit_file')!
    const result = (await editFile.execute({
      path: '/test/scripts/prerender.mjs',
      old_string: 'const a = 1',
      new_string: 'const a = `1',
    })) as { ok?: boolean; syntaxError?: string }
    expect(result.ok).toBe(true)
    expect(result.syntaxError).toMatch(/no longer parses/)
    expect(result.syntaxError).toMatch(/prerender\.mjs:162/)
    expect(backend.run).toHaveBeenCalledWith(
      expect.stringMatching(/^node --check/),
      expect.objectContaining({ cwd: '/test/scripts' }),
    )
  })

  it('write_file of a TypeScript file checks with esbuild and stays silent when it parses', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend)
    const writeFile = tools.find((t) => t.name === 'write_file')!
    const result = (await writeFile.execute({
      path: '/test/src/a.tsx',
      content: 'export const a = 1\n',
    })) as {
      ok?: boolean
      syntaxError?: string
    }
    expect(result.ok).toBe(true)
    expect(result.syntaxError).toBeUndefined()
    expect(backend.run).toHaveBeenCalledWith(
      expect.stringMatching(/esbuild.*tsx/),
      expect.anything(),
    )
  })

  it('a missing parser is not a syntax error, and a .md file is not checked at all', async () => {
    const backend = mockBackend()
    ;(backend.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '',
      stderr: "Error: Cannot find module 'esbuild'",
      exitCode: 1,
    })
    const tools = buildTools(backend)
    const writeFile = tools.find((t) => t.name === 'write_file')!
    const ts = (await writeFile.execute({ path: '/test/src/a.ts', content: 'x' })) as {
      syntaxError?: string
    }
    expect(ts.syntaxError).toBeUndefined()
    const md = (await writeFile.execute({ path: '/test/README.md', content: '# hi' })) as {
      syntaxError?: string
    }
    expect(md.syntaxError).toBeUndefined()
    expect(backend.run).toHaveBeenCalledTimes(1)
  })
})

describe('edit_file — a dropped line break is said', () => {
  it('notes a replacement whose old text ended in a newline and new text does not (flash-m28)', async () => {
    let file = 'const a = 1\nconst b = 2\n'
    const backend = {
      projectRoot: '/test',
      readFile: vi.fn(async () => file),
      writeFile: vi.fn(async (_p: string, c: string) => {
        file = c
      }),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'a.ts',
      old_string: 'const a = 1\n',
      new_string: 'const a = 10',
    })) as { newlineNote?: string }
    expect(r.newlineNote).toContain('removed the line break')
    const ok = (await edit.execute({
      path: 'a.ts',
      old_string: 'const b = 2',
      new_string: 'const b = 3',
    })) as { newlineNote?: string }
    expect(ok.newlineNote).toBeUndefined()
  })

  it('folds the dropped newline and the parse error it caused into one message naming the fused line (flash-m55)', async () => {
    let file = 'const a = 1\nconst b = 2\nconst c = 3\n'
    const backend = {
      projectRoot: '/test',
      readFile: vi.fn(async () => file),
      writeFile: vi.fn(async (_p: string, c: string) => {
        file = c
      }),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      // The parse check runs the real esbuild command; its failure is faked in the
      // shape `parseCheckCommand` prints — `line:col: message`, the source line,
      // and a caret.
      run: vi.fn().mockResolvedValue({
        stdout: '',
        stderr:
          '2:22: Expected ";" but found "const"\nconst b = 22const c = 33\n                     ^',
        exitCode: 1,
      }),
    }
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    // One batch, exactly the shape flash-m55 re-fused three times: one replacement
    // drops the trailing newline and another edits what was the following line.
    const r = (await edit.execute({
      path: 'a.ts',
      replacements: [
        { old_string: 'const b = 2\n', new_string: 'const b = 22' },
        { old_string: 'const c = 3', new_string: 'const c = 33' },
      ],
    })) as { newlineNote?: string; syntaxError?: string }
    expect(r.syntaxError).toMatch(/no longer parses/)
    expect(r.syntaxError).toContain('replacement 1')
    // The two joined lines shown as the one line they now are, with its number.
    expect(r.syntaxError).toContain('2: const b = 22const c = 33')
    expect(r.syntaxError).toMatch(/restored on new_string/)
    // One message, not a hint beside an unrelated-looking parse error.
    expect(r.newlineNote).toBeUndefined()
  })

  it('says nothing when the dropped newline only ate a blank line (flash-m62)', async () => {
    let file =
      "import { compare, hash } from '@molecule/api-password'\n" +
      "import { findById, updateById } from '@molecule/api-database'\n" +
      '\n' +
      'import {\n' +
      '  type ConduitUserRow,\n' +
      '} from "@molecule/api-database"\n'
    const backend = {
      projectRoot: '/test',
      readFile: vi.fn(async () => file),
      writeFile: vi.fn(async (_p: string, c: string) => {
        file = c
      }),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    // The pair a weaker model sends for one line: the line minus its trailing
    // newline, then the line's own text edited. The newline the first replacement
    // consumed ended the import line and a blank line followed it, so the two
    // surviving lines are still on their own lines — nothing was joined, and there
    // is nothing to tell the model to undo.
    const r = (await edit.execute({
      path: 'conduit-auth.ts',
      replacements: [
        {
          old_string: "import { findById, updateById } from '@molecule/api-database'\n",
          new_string: "import { findById, updateById } from '@molecule/api-database'",
        },
        {
          old_string: "import { findById, updateById } from '@molecule/api-database'",
          new_string: "import { create, findById, updateById } from '@molecule/api-database'",
        },
      ],
    })) as { newlineNote?: string; syntaxError?: string }
    expect(r.newlineNote).toBeUndefined()
    expect(r.syntaxError).toBeUndefined()
    // The blank line is gone; the kept lines did not run together.
    expect(file).toContain(
      "import { create, findById, updateById } from '@molecule/api-database'\nimport {",
    )
  })
})

// The same shape as above, one step earlier: a replacement whose ONLY effect is the
// line break at its boundary is REFUSED rather than applied-and-noted. flash-m89 sent
// it as the last replacement of a batch twice in two calls — `comments.ts` at +07:25
// (the joined line was a parse error, so the dev API restarted on it) and
// `articles.ts` at +08:32 — and each cost a repair round trip. Five of these shapes
// appear in that one run's transcript, three of them in frontend files.
describe('edit_file — a boundary-newline-only replacement is refused', () => {
  function fileBackend(initial: string): {
    backend: ExecutionBackend
    file: () => string
    writes: () => number
  } {
    let file = initial
    let written = 0
    const backend = {
      projectRoot: '/test',
      readFile: vi.fn(async () => file),
      writeFile: vi.fn(async (_p: string, c: string) => {
        file = c
        written++
      }),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    } as unknown as ExecutionBackend
    return { backend, file: () => file, writes: () => written }
  }

  /** The `DELETE /articles/:slug/comments/:id` handler as flash-m89 had it, verbatim. */
  const COMMENTS_BEFORE = [
    "import { create, findById } from '@molecule/api-database'",
    '',
    'const router = Router()',
    '',
    "router.post('/articles/:slug/comments', async (req, res) => {",
    '  try {',
    "    const { data } = await create<CommentRow>('conduit_comments', {",
    '      articleId: article.id,',
    '      authorId: viewerId,',
    '      body: text,',
    '    })',
    '',
    '    res.status(200).json({ comment: await shapeComment(data, viewerId) })',
    '  } catch (error) {',
    "    sendErrors(res, 500, 'server', 'unexpected error')",
    '  }',
    '})',
    '',
    "router.delete('/articles/:slug/comments/:id', async (req, res) => {",
    '  if (!viewerId) return setUnauthorized(res)',
    '',
    '  const params = req.params as Record<string, string>',
    "  const comment = await findById<CommentRow>('conduit_comments', String(params.id))",
    "  if (!comment) return notFound(res, 'comment')",
    '  if (String(comment.authorId) !== String(viewerId)) {',
    "    return sendErrors(res, 403, 'comment', 'forbidden')",
    '  }',
    '})',
    '',
  ].join('\n')

  it('refuses it and applies the rest of the batch (flash-m89 comments.ts, +07:25)', async () => {
    const { backend, file, writes } = fileBackend(COMMENTS_BEFORE)
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    // The batch exactly as the run sent it: two real edits, then the anchor — the two
    // lines it means to keep, repeated with the trailing newline dropped.
    const r = (await edit.execute({
      path: 'handlers/comments.ts',
      replacements: [
        {
          new_string:
            '    res.status(201).json({ comment: await shapeComment(data as CommentRow, viewerId) })',
          old_string: '    res.status(200).json({ comment: await shapeComment(data, viewerId) })',
        },
        {
          new_string:
            "  if (!comment) return notFound(res, 'comment')\n\n  // The article in the path must exist too.\n  const article = await articleBySlug(String(params.slug))\n  if (!article) return notFound(res, 'article')\n\n  if (String(comment.authorId) !== String(viewerId)) {",
          old_string:
            "  if (!comment) return notFound(res, 'comment')\n  if (String(comment.authorId) !== String(viewerId)) {",
        },
        {
          new_string:
            "  const params = req.params as Record<string, string>\n  const comment = await findById<CommentRow>('conduit_comments', String(params.id))",
          old_string:
            "  const params = req.params as Record<string, string>\n  const comment = await findById<CommentRow>('conduit_comments', String(params.id))\n",
        },
      ],
    })) as {
      skippedNote?: string
      replacementsApplied?: number
      newlineNote?: string
      syntaxError?: string
      note?: string
    }
    // The file the run's own excerpt shows at line 117: `…String(params.id))  if (!comment)
    // return notFound(res, 'comment')`, a parse error the dev API restarted on.
    expect(file()).not.toContain('String(params.id))  if (!comment)')
    expect(file()).toContain("String(params.id))\n  if (!comment) return notFound(res, 'comment')")
    // The two real edits in the batch landed.
    expect(file()).toContain('  res.status(201).json(')
    expect(file()).toContain('  const article = await articleBySlug(String(params.slug))')
    expect(writes()).toBe(1)
    expect(r.skippedNote).toContain('replacement 3 was skipped')
    expect(r.skippedNote).toContain('include the next line in old_string')
    expect(r.replacementsApplied).toBe(2)
    // Nothing was joined, so the note about a joined line does not also fire.
    expect(r.newlineNote).toBeUndefined()
    expect(r.syntaxError).toBeUndefined()
  })

  it('leaves the later replacement that anchors on the same text landing (flash-m89 articles.ts, +08:32)', async () => {
    // `function pageLimit(req: Request): number {\n` → the same minus its newline, then a
    // third replacement that anchors on `function pageLimit(req: Request): number {`. The
    // join is what left `function pageLimit(req: Request): number {  const raw = …` on one
    // line; it still parsed, so only the newline note fired.
    const { backend, file } = fileBackend(
      [
        'const router = Router()',
        '',
        "router.get('/articles', async (req, res) => {",
        '  const limit = pageLimit(req)',
        '  res.json(await listArticles(limit))',
        '})',
        '',
        'function pageLimit(req: Request): number {',
        '  const raw = Number(req.query.limit)',
        '  if (!Number.isFinite(raw)) return 20',
        '  return Math.min(Math.max(Math.trunc(raw), 1), 100)',
        '}',
        '',
      ].join('\n'),
    )
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'handlers/articles.ts',
      replacements: [
        {
          new_string:
            '  const limit = pageLimit(req)\n  res.status(200).json(await listArticles(limit))',
          old_string: '  const limit = pageLimit(req)\n  res.json(await listArticles(limit))',
        },
        {
          new_string: 'function pageLimit(req: Request): number {',
          old_string: 'function pageLimit(req: Request): number {\n',
        },
        {
          new_string:
            '/**\n * The page size for a list route: `?limit=`, 1..100, 20 by default.\n */\nfunction pageLimit(req: Request): number {',
          old_string: 'function pageLimit(req: Request): number {',
        },
      ],
    })) as { skippedNote?: string; replacementsApplied?: number }
    // The signature keeps its own line, so the body is not on it; the doc block the third
    // replacement inserts lands directly above it.
    expect(file()).not.toContain('number {  const raw')
    expect(file()).toContain('function pageLimit(req: Request): number {\n  const raw')
    expect(file()).toContain('/**\n * The page size for a list route')
    expect(r.skippedNote).toContain('replacement 2 was skipped')
    expect(r.replacementsApplied).toBe(2)
  })

  it('refuses the reverse shape: a new_string that adds the newline its line continues past', async () => {
    // The same accident read the other way: adding a trailing newline to text the file
    // continues on the same line moves the rest of that line down.
    const { backend, file } = fileBackend(
      [
        "router.delete('/articles/:slug', async (req, res) => {",
        '  const params = req.params as Record<string, string> // { slug: string }',
        '  const article = await articleBySlug(String(params.slug))',
        '})',
        '',
      ].join('\n'),
    )
    const edit = buildTools(backend).find((t) => t.name === 'edit_file')!
    const r = (await edit.execute({
      path: 'handlers/articles.ts',
      old_string: '  const params = req.params as Record<string, string>',
      new_string: '  const params = req.params as Record<string, string>\n',
    })) as { skippedNote?: string; note?: string; replacementsApplied?: number }
    expect(file()).toContain(
      '  const params = req.params as Record<string, string> // { slug: string }',
    )
    expect(r.skippedNote).toContain('replacement 1 was skipped')
    expect(r.skippedNote).toContain('include the text that follows it in old_string')
    // Nothing else in the call changed anything, so the "exactly as it was" line must not
    // stand in for the reason.
    expect(r.note).toContain('replacement 1 was skipped')
    expect(r.replacementsApplied).toBe(0)
  })

  it('applies a boundary newline change at a line boundary, where nothing crosses lines', async () => {
    // Both shapes the file itself shows were intended: the edit is the LAST line of the
    // file (nothing follows), and the line it ends already ends at a boundary, so the
    // newline only adds a blank line.
    const last = fileBackend('const a = 1\nconst b = 2\n')
    const editLast = buildTools(last.backend).find((t) => t.name === 'edit_file')!
    const tail = (await editLast.execute({
      path: 'a.ts',
      old_string: 'const b = 2\n',
      new_string: 'const b = 2',
    })) as { skippedNote?: string }
    expect(tail.skippedNote).toBeUndefined()
    expect(last.file()).toBe('const a = 1\nconst b = 2')

    const blank = fileBackend('const a = 1\nconst b = 2\n')
    const editBlank = buildTools(blank.backend).find((t) => t.name === 'edit_file')!
    const gap = (await editBlank.execute({
      path: 'a.ts',
      old_string: 'const a = 1\n',
      new_string: 'const a = 1\n\n',
    })) as { skippedNote?: string }
    expect(gap.skippedNote).toBeUndefined()
    expect(blank.file()).toBe('const a = 1\n\nconst b = 2\n')
  })
})

/**
 * X1 xr-molecule-flash-m101 (+25:54): a background suite sent as
 * `… playwright test … 2>&1 | grep -E "✘|passed|failed|skipped" | tail -20` came back
 * `{"exitCode": 0}` while its log's own tally said `1 failed`. The exit file holds the code of
 * the command's LAST pipeline stage, so the filter's 0 was read as the run's verdict.
 */
describe('a background suite’s exit code is the runner’s, never a filter’s (m101 +25:54)', () => {
  /** A finished run's own tally: the runner announced 2, and one of them failed. */
  const TALLY = ['Running 2 tests using 1 worker', '', '  1 failed', '  1 passed (4.2m)'].join('\n')

  function backendWith(exit: string, log: string): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn(async (path: string) => {
        if (path.endsWith('.exit')) return exit
        if (path.endsWith('.log')) return log
        throw new Error(`ENOENT: ${path}`)
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
    }
  }

  /** Start a background command and wait on it, exactly as the executor does. */
  async function run(
    command: string,
    exit: string,
    log: string,
  ): Promise<{ exitCode?: number | null; note?: string }> {
    const tools = buildTools(backendWith(exit, log))
    const started = (await tools
      .find((t) => t.name === 'exec_command')!
      .execute({ command, run_in_background: true })) as { taskId: string }
    return (await tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId: started.taskId })) as { exitCode?: number | null; note?: string }
  }

  it('reports no code for a run a pipe still consumes, and says why', async () => {
    const r = await run('npx playwright test 2>&1 | tee /tmp/run.log', '0\n', TALLY)
    expect(r.exitCode).toBeNull()
    expect(r.note).toContain('No exit code is reported')
  })

  it('reports no 0 when a dropped filter masked the tally’s failure', async () => {
    const r = await run(
      'npx playwright test 2>&1 | grep -E "✘|passed|failed|skipped" | tail -20',
      '0\n',
      TALLY,
    )
    expect(r.exitCode).toBeNull()
    expect(r.note).toContain('No exit code is reported')
  })

  it('reports the runner’s own non-zero code unchanged', async () => {
    const r = await run('npx playwright test', '1\n', TALLY)
    expect(r.exitCode).toBe(1)
  })
})
