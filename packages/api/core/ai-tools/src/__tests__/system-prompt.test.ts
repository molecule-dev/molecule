import { describe, expect, it, vi } from 'vitest'

import { buildAgentPrompt, discoverSkills } from '../system-prompt.js'
import type { ExecutionBackend, PromptContext } from '../types.js'

function basicCtx(overrides: Partial<PromptContext> = {}): PromptContext {
  return {
    agentName: 'TestBot',
    projectRoot: '/proj',
    tools: ['read_file', 'write_file'],
    ...overrides,
  }
}

describe('buildAgentPrompt — identity', () => {
  it('includes the agent name and project root in the identity line', () => {
    const out = buildAgentPrompt(basicCtx())
    expect(out).toContain('TestBot')
    expect(out).toContain('/proj')
    expect(out).toContain('AI coding agent')
  })
})

describe('buildAgentPrompt — tool listing', () => {
  it('lists tools by name', () => {
    const out = buildAgentPrompt(basicCtx({ tools: ['read_file', 'write_file', 'exec_command'] }))
    expect(out).toContain('## Available Tools')
    expect(out).toContain('**read_file**')
    expect(out).toContain('**write_file**')
    expect(out).toContain('**exec_command**')
  })

  it('omits the tools section when no recognised tools are provided', () => {
    const out = buildAgentPrompt(basicCtx({ tools: ['bogus_unknown_tool'] }))
    expect(out).not.toContain('## Available Tools')
  })

  it('emits one line per tool', () => {
    const tools = ['read_file', 'write_file', 'edit_file']
    const out = buildAgentPrompt(basicCtx({ tools }))
    for (const t of tools) {
      const linePattern = new RegExp(`- \\*\\*${t}\\*\\* —`)
      expect(linePattern.test(out)).toBe(true)
    }
  })
})

describe('buildAgentPrompt — coding rules', () => {
  it('always emits the Coding Rules section', () => {
    const out = buildAgentPrompt(basicCtx())
    expect(out).toContain('## Coding Rules')
  })

  it('includes the "Implement fully" / never-stop rule (#3)', () => {
    const out = buildAgentPrompt(basicCtx())
    expect(out).toContain('Implement fully')
    expect(out).toMatch(/Do not stop partway/)
  })

  it('includes the JSON-newline guidance section', () => {
    const out = buildAgentPrompt(basicCtx())
    expect(out).toContain('Tool Argument Formatting')
    expect(out).toContain('real newlines')
  })
})

describe('buildAgentPrompt — optional sections', () => {
  it('appends project docs when supplied', () => {
    const out = buildAgentPrompt(basicCtx({ projectDocs: '# RULES\nNo flushes.' }))
    expect(out).toContain('## Project Guidelines')
    expect(out).toContain('No flushes.')
  })

  it('omits project docs section when not supplied', () => {
    const out = buildAgentPrompt(basicCtx())
    expect(out).not.toContain('## Project Guidelines')
  })

  it('lists discovered skills with name/description/path arrow', () => {
    const out = buildAgentPrompt(
      basicCtx({
        discoveredSkills: [
          { name: 'tdd', description: 'Test-first dev', path: '.agents/skills/tdd/SKILL.md' },
        ],
      }),
    )
    expect(out).toContain('## Available Skills')
    expect(out).toContain('**tdd**')
    expect(out).toContain('Test-first dev')
    expect(out).toContain('.agents/skills/tdd/SKILL.md')
  })

  it('omits "Available Skills" section when none discovered', () => {
    const out = buildAgentPrompt(basicCtx())
    expect(out).not.toContain('## Available Skills')
  })

  it('appends inline skills as a Reference block', () => {
    const out = buildAgentPrompt(basicCtx({ skills: ['skill A content', 'skill B content'] }))
    expect(out).toContain('## Reference')
    expect(out).toContain('skill A content')
    expect(out).toContain('skill B content')
  })

  it('appends each custom section verbatim', () => {
    const out = buildAgentPrompt(
      basicCtx({ customSections: ['## CUSTOM-1\nfoo', '## CUSTOM-2\nbar'] }),
    )
    expect(out).toContain('## CUSTOM-1')
    expect(out).toContain('## CUSTOM-2')
    expect(out).toContain('foo')
    expect(out).toContain('bar')
  })

  it('orders sections: identity → tools → coding rules → docs → skills → reference → custom', () => {
    const out = buildAgentPrompt(
      basicCtx({
        projectDocs: 'DOCS',
        discoveredSkills: [{ name: 's', description: 'd', path: 'p' }],
        skills: ['INLINE'],
        customSections: ['CUSTOM-END'],
      }),
    )
    const idxTools = out.indexOf('## Available Tools')
    const idxRules = out.indexOf('## Coding Rules')
    const idxDocs = out.indexOf('## Project Guidelines')
    const idxSkills = out.indexOf('## Available Skills')
    const idxRef = out.indexOf('## Reference')
    const idxCustom = out.indexOf('CUSTOM-END')
    expect(idxTools).toBeLessThan(idxRules)
    expect(idxRules).toBeLessThan(idxDocs)
    expect(idxDocs).toBeLessThan(idxSkills)
    expect(idxSkills).toBeLessThan(idxRef)
    expect(idxRef).toBeLessThan(idxCustom)
  })
})

describe('discoverSkills', () => {
  function makeBackend(
    layout: Record<string, Array<{ name: string; type: 'file' | 'directory' }>>,
    files: Record<string, string> = {},
  ): ExecutionBackend {
    return {
      projectRoot: '/proj',
      readDir: vi.fn(async (path: string) => layout[path] ?? []),
      readFile: vi.fn(async (path: string) => {
        const content = files[path]
        if (content === undefined) throw new Error(`ENOENT: ${path}`)
        return content
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      run: vi.fn(),
    }
  }

  it('discovers skills from .agents/skills/', async () => {
    const backend = makeBackend(
      {
        '/proj/.agents/skills': [{ name: 'tdd', type: 'directory' }],
      },
      {
        '/proj/.agents/skills/tdd/SKILL.md': `---
name: tdd
description: Test-first development practice
---
body`,
      },
    )
    const skills = await discoverSkills(backend)
    expect(skills.length).toBeGreaterThanOrEqual(1)
    const tdd = skills.find((s) => s.name === 'tdd')
    expect(tdd).toMatchObject({
      name: 'tdd',
      description: 'Test-first development practice',
      path: '.agents/skills/tdd/SKILL.md',
    })
  })

  it('falls back to directory name when frontmatter has no name', async () => {
    const backend = makeBackend(
      {
        '/proj/.agents/skills': [{ name: 'no-name-skill', type: 'directory' }],
      },
      {
        '/proj/.agents/skills/no-name-skill/SKILL.md': `---
description: A description-only skill
---
body`,
      },
    )
    const skills = await discoverSkills(backend)
    const found = skills.find((s) => s.path.includes('no-name-skill'))
    expect(found?.name).toBe('no-name-skill')
  })

  it('falls back to dir name when frontmatter has no description', async () => {
    const backend = makeBackend(
      {
        '/proj/.agents/skills': [{ name: 'plain', type: 'directory' }],
      },
      {
        '/proj/.agents/skills/plain/SKILL.md': `---
name: plain
---
body`,
      },
    )
    const skills = await discoverSkills(backend)
    const found = skills[0]
    expect(found?.description).toBe('plain')
  })

  it('skips entries without a SKILL.md', async () => {
    const backend = makeBackend({
      '/proj/.agents/skills': [{ name: 'no-md', type: 'directory' }],
    }) // no files map → readFile throws
    const skills = await discoverSkills(backend)
    expect(skills.find((s) => s.path.includes('no-md'))).toBeUndefined()
  })

  it('also scans .claude/skills/', async () => {
    const backend = makeBackend(
      {
        '/proj/.claude/skills': [{ name: 'claude-skill', type: 'directory' }],
      },
      {
        '/proj/.claude/skills/claude-skill/SKILL.md': `---
name: claude-skill
description: A claude skill
---`,
      },
    )
    const skills = await discoverSkills(backend)
    expect(skills.find((s) => s.path.startsWith('.claude/skills/'))).toBeDefined()
  })

  it('returns [] when no skills directories exist', async () => {
    const backend: ExecutionBackend = {
      projectRoot: '/proj',
      readDir: vi.fn(async () => {
        throw new Error('ENOENT')
      }),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      run: vi.fn(),
    }
    const skills = await discoverSkills(backend)
    expect(skills).toEqual([])
  })

  it('ignores file entries (only directories count as skills)', async () => {
    const backend = makeBackend({
      '/proj/.agents/skills': [{ name: 'random.txt', type: 'file' }],
    })
    const skills = await discoverSkills(backend)
    expect(skills).toEqual([])
  })
})
