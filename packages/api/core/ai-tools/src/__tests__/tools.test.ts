import { describe, expect, it, vi } from 'vitest'

import {
  buildAgentPrompt,
  buildTools,
  discoverSkills,
  isValidGlob,
  redactSecrets,
  resolvePath,
  shellQuote,
  TOOL_SCHEMAS,
} from '../index.js'
import type { ExecutionBackend } from '../types.js'
import { MAX_READ_RETURN_CHARS } from '../utilities.js'

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
    const tools = buildTools(backend, { commandBudgetMs: 290_000 })
    const exec = tools.find((t) => t.name === 'exec_command')!

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
      files: unknown[]
      note: string
    }
    expect(result.files).toHaveLength(25)
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
    const tools = buildTools(backend, { commandBudgetMs: 290_000 })
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

  it('reads the declared budget from the timeout PARAMETER too', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000 })
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
    const tools = buildTools(backend, { commandBudgetMs: 290_000 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({
      command: 'timeout 900 npx playwright test --reporter=line',
    })) as { error?: string }
    expect(result.error).toBeUndefined()
    expect(backend.run).toHaveBeenCalled()
  })

  it('still RUNS a piped command that declares no budget of its own', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const result = (await exec.execute({ command: 'npm run build 2>&1 | tail -20' })) as {
      error?: string
    }
    expect(result.error).toBeUndefined()
    expect(backend.run).toHaveBeenCalled()
  })

  it("does not read a filename that merely contains 'timeout' as a budget", async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000 })
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
    expect(result.error).toMatch(/requires a non-empty "path"/)
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
    const result = (await readFile.execute({ path: '/x' })) as { error?: string }
    expect(result.error).toMatch(/is a directory/i)
    expect(result.error).toMatch(/list_files/)
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
    expect(result.error).toMatch(/No such file or directory/)
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
      command: 'cd app && npx playwright test 2>&1 | tail -40',
    })) as { stdout: string; exitCode: number; error?: string }
    expect(piped.stdout).toBe('')
    expect(piped.error).toMatch(/pipe through tail\/head holds everything back/)
    expect(piped.error).toMatch(/run it without the pipe/)
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

  it('find_files uses the same synchronized set', async () => {
    const backend = mockBackend()
    const tool = buildTools(backend).find((t) => t.name === 'find_files')!
    await tool.execute({ pattern: '*.ts' })
    const cmd = (backend.run as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(cmd).toContain("-not -path '*/node_modules/*'")
    expect(cmd).toContain("-not -path '*/.git/*'")
    expect(cmd).toContain("-not -path '*/molecule/*'")
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

describe('read_file windows', () => {
  function windowBackend(lines: number): ExecutionBackend {
    const content = Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join('\n')
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
    const tools = buildTools(backend, { commandBudgetMs: 290_000 })
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

  it('bounds a batch to the ceiling per file, so one giant file cannot fill the call', async () => {
    const read = buildTools(backendWith(huge)).find((t) => t.name === 'read_file')!
    const r = (await read.execute({ paths: ['a.md', 'b.md', 'c.md'] })) as {
      files: Array<{ content: string }>
      note?: string
    }
    for (const f of r.files)
      expect(f.content.length).toBeLessThanOrEqual(MAX_READ_RETURN_CHARS + 100)
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

describe('wait_for_task on a stuck command', () => {
  it('reports it stuck once the total waiting crosses the threshold, then refuses to wait again', async () => {
    process.env.MOL_AI_BG_STUCK_AFTER_MS = '40'
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
      const first = (await wait.execute({ taskId: id, timeout: 30 })) as { status: string }
      expect(first.status).toBe('running')
      const second = (await wait.execute({ taskId: id, timeout: 30 })) as {
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
