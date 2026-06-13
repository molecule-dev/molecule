/**
 * Tests for the `/skills` discovery + filter helpers.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  deriveSkillNameFromPath,
  filterSkills,
  isSkillFile,
  loadProjectSkills,
  parseSkillMeta,
  type SkillInfo,
  toRelativePath,
} from '../components/chat-skills-utilities.js'

describe('toRelativePath', () => {
  it('strips the /workspace/ prefix and any leading slash', () => {
    expect(toRelativePath('/workspace/.agents/skills/auth.md')).toBe('.agents/skills/auth.md')
    expect(toRelativePath('/.agents/skills/auth.md')).toBe('.agents/skills/auth.md')
    expect(toRelativePath('.agents/skills/auth.md')).toBe('.agents/skills/auth.md')
  })
})

describe('isSkillFile', () => {
  it('matches Markdown files under .agents/skills/ (any prefix form)', () => {
    expect(isSkillFile('.agents/skills/patterns/styling.md')).toBe(true)
    expect(isSkillFile('/workspace/.agents/skills/examples/SKILL.md')).toBe(true)
    expect(isSkillFile('.agents/skills/auth.md')).toBe(true)
  })

  it('rejects non-skill or non-markdown paths', () => {
    expect(isSkillFile('src/index.ts')).toBe(false)
    expect(isSkillFile('README.md')).toBe(false)
    expect(isSkillFile('.agents/plans/plan.md')).toBe(false)
    expect(isSkillFile('.agents/skills/notes.txt')).toBe(false)
    expect(isSkillFile('.agents/skills')).toBe(false)
  })
})

describe('deriveSkillNameFromPath', () => {
  it('uses the filename without extension', () => {
    expect(deriveSkillNameFromPath('.agents/skills/patterns/styling.md')).toBe('styling')
  })

  it('uses the parent dir for SKILL.md / INDEX.md / README.md entry files', () => {
    expect(deriveSkillNameFromPath('.agents/skills/examples/SKILL.md')).toBe('examples')
    expect(deriveSkillNameFromPath('.agents/skills/examples/INDEX.md')).toBe('examples')
    expect(deriveSkillNameFromPath('/workspace/.agents/skills/foo/README.md')).toBe('foo')
  })
})

describe('parseSkillMeta', () => {
  it('prefers frontmatter name + description (quotes stripped)', () => {
    const content = [
      '---',
      'name: styling',
      'description: "Styling with the ClassMap system."',
      '---',
      '',
      '# Styling',
      '',
      'Body text.',
    ].join('\n')
    expect(parseSkillMeta('.agents/skills/patterns/styling.md', content)).toEqual({
      name: 'styling',
      description: 'Styling with the ClassMap system.',
    })
  })

  it('falls back to the first heading + first paragraph when there is no frontmatter', () => {
    const content = '# My Skill\n\nThis is the first paragraph.\n\nMore.'
    expect(parseSkillMeta('.agents/skills/my-skill.md', content)).toEqual({
      name: 'My Skill',
      description: 'This is the first paragraph.',
    })
  })

  it('falls back to a path-derived name and empty description for empty content', () => {
    expect(parseSkillMeta('.agents/skills/patterns/foo.md', '')).toEqual({
      name: 'foo',
      description: '',
    })
  })

  it('ignores headings when choosing the description fallback', () => {
    const content = '## Heading only\n\nActual description line.'
    expect(parseSkillMeta('.agents/skills/x.md', content).description).toBe(
      'Actual description line.',
    )
  })
})

describe('filterSkills', () => {
  const skills: SkillInfo[] = [
    { path: '.agents/skills/auth.md', name: 'auth', description: 'Authentication patterns.' },
    { path: '.agents/skills/styling.md', name: 'styling', description: 'ClassMap styling.' },
    { path: '.agents/skills/db.md', name: 'database', description: 'DataStore CRUD.' },
  ]

  it('returns all skills for an empty/blank query', () => {
    expect(filterSkills(skills, '')).toHaveLength(3)
    expect(filterSkills(skills, '   ')).toHaveLength(3)
  })

  it('matches on name, description, or path (case-insensitive)', () => {
    expect(filterSkills(skills, 'AUTH').map((s) => s.name)).toEqual(['auth'])
    expect(filterSkills(skills, 'classmap').map((s) => s.name)).toEqual(['styling'])
    expect(filterSkills(skills, 'db.md').map((s) => s.name)).toEqual(['database'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterSkills(skills, 'nonexistent')).toEqual([])
  })
})

describe('loadProjectSkills', () => {
  it('discovers, parses, and sorts skills by name', async () => {
    const files = [
      '/workspace/.agents/skills/patterns/styling.md',
      '/workspace/.agents/skills/auth.md',
      '/workspace/src/index.ts',
      '/workspace/README.md',
    ]
    const contents: Record<string, string> = {
      '.agents/skills/patterns/styling.md': '---\nname: styling\ndescription: Styling.\n---\n',
      '.agents/skills/auth.md': '---\nname: auth\ndescription: Auth.\n---\n',
    }
    const skills = await loadProjectSkills(
      async () => files,
      async (path) => contents[path] ?? '',
    )
    expect(skills.map((s) => s.name)).toEqual(['auth', 'styling'])
    expect(skills.map((s) => s.path)).toEqual([
      '.agents/skills/auth.md',
      '.agents/skills/patterns/styling.md',
    ])
  })

  it('tolerates an unreadable skill file (path-derived name, no description)', async () => {
    const skills = await loadProjectSkills(
      async () => ['.agents/skills/patterns/styling.md'],
      async () => {
        throw new Error('boom')
      },
    )
    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('styling')
    expect(skills[0].description).toBe('')
  })
})
