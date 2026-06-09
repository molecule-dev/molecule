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

  it('read_file returns structured result', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend)
    const readFile = tools.find((t) => t.name === 'read_file')!
    const result = (await readFile.execute({ path: '/test/file.ts' })) as Record<string, unknown>
    expect(result.path).toBe('/test/file.ts')
    expect(result.content).toBe('file content')
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
