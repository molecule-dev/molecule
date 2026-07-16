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
    expect(result.error).toMatch(/re-read the file/i)
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
})
