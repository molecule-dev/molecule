import { describe, it, expect, vi } from 'vitest'
import { buildTools, createLocalBackend, buildAgentPrompt, discoverSkills, shellQuote, resolvePath, redactSecrets, isValidGlob, TOOL_SCHEMAS } from '../index.js'
import type { ExecutionBackend } from '../types.js'

// ── Utilities ───────────────────────────────────────────────────────────────

describe('shellQuote', () => {
  it('wraps in single quotes', () => {
    expect(shellQuote('hello')).toBe("'hello'")
  })

  it('escapes single quotes', () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'")
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
    const expected = ['list_files', 'read_file', 'write_file', 'edit_file', 'search_files', 'find_files', 'create_directory', 'rename_file', 'delete_file', 'exec_command', 'save_plan', 'load_skill']
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
    const names = tools.map(t => t.name)
    expect(names).toContain('read_file')
    expect(names).toContain('write_file')
    expect(names).toContain('edit_file')
    expect(names).toContain('search_files')
    expect(names).toContain('exec_command')
    expect(names).toContain('list_files')
    expect(names).toContain('find_files')
    expect(names).toContain('load_skill')
  })

  it('respects include filter', () => {
    const tools = buildTools(mockBackend(), { include: ['read_file', 'write_file'] })
    expect(tools.length).toBe(2)
    expect(tools.map(t => t.name)).toEqual(['read_file', 'write_file'])
  })

  it('respects exclude filter', () => {
    const tools = buildTools(mockBackend(), { exclude: ['save_plan', 'load_skill'] })
    expect(tools.find(t => t.name === 'save_plan')).toBeUndefined()
    expect(tools.find(t => t.name === 'load_skill')).toBeUndefined()
    expect(tools.find(t => t.name === 'read_file')).toBeDefined()
  })

  it('read_file returns structured result', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend)
    const readFile = tools.find(t => t.name === 'read_file')!
    const result = await readFile.execute({ path: '/test/file.ts' }) as Record<string, unknown>
    expect(result.path).toBe('/test/file.ts')
    expect(result.content).toBe('file content')
  })

  it('edit_file supports backwards-compatible single replacement', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('hello world')
    const tools = buildTools(backend)
    const editFile = tools.find(t => t.name === 'edit_file')!
    const result = await editFile.execute({ path: '/test/file.ts', old_string: 'hello', new_string: 'goodbye' }) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.replacementsApplied).toBe(1)
  })

  it('edit_file supports batch replacements', async () => {
    const backend = mockBackend()
    ;(backend.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('aaa bbb ccc')
    const tools = buildTools(backend)
    const editFile = tools.find(t => t.name === 'edit_file')!
    const result = await editFile.execute({
      path: '/test/file.ts',
      replacements: [
        { old_string: 'aaa', new_string: 'xxx' },
        { old_string: 'bbb', new_string: 'yyy' },
      ],
    }) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.replacementsApplied).toBe(2)
  })

  it('exec_command blocks dangerous commands when configured', async () => {
    const tools = buildTools(mockBackend(), { blockDangerousCommands: true })
    const execCmd = tools.find(t => t.name === 'exec_command')!
    const result = await execCmd.execute({ command: 'env' }) as Record<string, unknown>
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
      discoveredSkills: [{ name: 'styling', description: 'ClassMap patterns', path: '.agents/skills/styling/SKILL.md' }],
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
