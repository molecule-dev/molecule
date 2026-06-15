/**
 * Tests for the `/skills` discovery + filter helpers.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  buildNewSkillTemplate,
  deriveSkillNameFromPath,
  filterSkills,
  isSkillFile,
  loadProjectSkills,
  newSkillPath,
  parseSkillMeta,
  recentUserText,
  type SkillInfo,
  slugifySkillName,
  suggestRelevantSkills,
  toRelativePath,
} from '../components/chat-skills-utilities.js'

describe('toRelativePath', () => {
  it('strips the /workspace/ prefix and any leading slash', () => {
    expect(toRelativePath('/workspace/.agents/skills/auth.md')).toBe('.agents/skills/auth.md')
    expect(toRelativePath('/.agents/skills/auth.md')).toBe('.agents/skills/auth.md')
    expect(toRelativePath('.agents/skills/auth.md')).toBe('.agents/skills/auth.md')
  })
})

describe('isSkillFile (SKILL.md folder convention)', () => {
  it('matches a SKILL.md entry inside a skill folder (any prefix form)', () => {
    expect(isSkillFile('.agents/skills/auth/SKILL.md')).toBe(true)
    expect(isSkillFile('/workspace/.agents/skills/styling/SKILL.md')).toBe(true)
    expect(isSkillFile('/.agents/skills/bond-system/SKILL.md')).toBe(true)
    // The entry filename is matched case-insensitively.
    expect(isSkillFile('.agents/skills/auth/skill.md')).toBe(true)
  })

  it('excludes loose pattern fragments and the examples corpus (the buried-skills bug)', () => {
    // The exact corpus the audit flagged: ~15 pattern fragments + ~52 example
    // READMEs must NOT be surfaced as skills, only the real SKILL.md folders.
    expect(isSkillFile('.agents/skills/patterns/dashboard-shell-layout.md')).toBe(false)
    expect(isSkillFile('.agents/skills/patterns/SKILL.md')).toBe(false)
    expect(isSkillFile('/workspace/.agents/skills/examples/SKILL.md')).toBe(false)
    expect(isSkillFile('.agents/skills/examples/personal-finance/README.md')).toBe(false)
  })

  it('rejects non-skill, loose, or non-markdown paths', () => {
    expect(isSkillFile('src/index.ts')).toBe(false)
    expect(isSkillFile('README.md')).toBe(false)
    expect(isSkillFile('.agents/plans/plan.md')).toBe(false)
    expect(isSkillFile('.agents/skills/notes.txt')).toBe(false)
    expect(isSkillFile('.agents/skills')).toBe(false)
    // A loose .md directly inside a skill folder is not the SKILL.md entry file.
    expect(isSkillFile('.agents/skills/auth/NOTES.md')).toBe(false)
    // A bare .md directly under skills/ (no enclosing folder) is not a skill.
    expect(isSkillFile('.agents/skills/auth.md')).toBe(false)
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

describe('slugifySkillName (SYN4 — skill authoring)', () => {
  it('lowercases and hyphenates a display name', () => {
    expect(slugifySkillName('Auth & Sessions')).toBe('auth-sessions')
    expect(slugifySkillName('My New Skill')).toBe('my-new-skill')
  })

  it('collapses runs of non-alphanumerics and trims surrounding hyphens', () => {
    expect(slugifySkillName('  Payments / Stripe!!  ')).toBe('payments-stripe')
    expect(slugifySkillName('--edge--case--')).toBe('edge-case')
  })

  it('falls back to "new-skill" when the name has no usable characters', () => {
    expect(slugifySkillName('   ')).toBe('new-skill')
    expect(slugifySkillName('!@#$')).toBe('new-skill')
  })
})

describe('newSkillPath (SYN4 — skill authoring)', () => {
  it('builds a .agents/skills/<slug>/SKILL.md path the browser will rediscover', () => {
    const path = newSkillPath('Auth & Sessions')
    expect(path).toBe('.agents/skills/auth-sessions/SKILL.md')
    // The created path must be exactly the shape discovery recognizes, else the
    // new skill would never show up in the /skills browser.
    expect(isSkillFile(path)).toBe(true)
  })
})

describe('buildNewSkillTemplate (SYN4 — skill authoring)', () => {
  it('emits frontmatter that round-trips through the SAME parser discovery uses', () => {
    const content = buildNewSkillTemplate('My New Skill')
    // The starter file must parse back to a real name + a non-empty description,
    // so the freshly created skill is listed (not blank) right away.
    const meta = parseSkillMeta(newSkillPath('My New Skill'), content)
    expect(meta.name).toBe('My New Skill')
    expect(meta.description.length).toBeGreaterThan(0)
    // Frontmatter block + a body heading the author fills in.
    expect(content.startsWith('---\n')).toBe(true)
    expect(content).toContain('name: My New Skill')
    expect(content).toContain('# My New Skill')
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
  it('discovers only SKILL.md folders (skipping patterns/examples noise), parses, and sorts', async () => {
    const files = [
      '/workspace/.agents/skills/styling/SKILL.md',
      '/workspace/.agents/skills/auth/SKILL.md',
      // Noise that the SKILL.md-folder convention must exclude:
      '/workspace/.agents/skills/patterns/dashboard-shell-layout.md',
      '/workspace/.agents/skills/examples/SKILL.md',
      '/workspace/.agents/skills/examples/personal-finance/README.md',
      '/workspace/src/index.ts',
      '/workspace/README.md',
    ]
    const contents: Record<string, string> = {
      '.agents/skills/styling/SKILL.md': '---\nname: styling\ndescription: Styling.\n---\n',
      '.agents/skills/auth/SKILL.md': '---\nname: auth\ndescription: Auth.\n---\n',
    }
    const skills = await loadProjectSkills(
      async () => files,
      async (path) => contents[path] ?? '',
    )
    expect(skills.map((s) => s.name)).toEqual(['auth', 'styling'])
    expect(skills.map((s) => s.path)).toEqual([
      '.agents/skills/auth/SKILL.md',
      '.agents/skills/styling/SKILL.md',
    ])
  })

  it('tolerates an unreadable skill file (path-derived name, no description)', async () => {
    const skills = await loadProjectSkills(
      async () => ['.agents/skills/styling/SKILL.md'],
      async () => {
        throw new Error('boom')
      },
    )
    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('styling')
    expect(skills[0].description).toBe('')
  })
})

describe('recentUserText', () => {
  const messages = [
    { role: 'user', content: 'first ask' },
    { role: 'assistant', content: 'sure thing' },
    { role: 'user', content: 'second ask' },
    { role: 'system', content: 'noise' },
    { role: 'user', content: 'third ask' },
  ]

  it('joins only the trailing user messages, excluding assistant/system turns', () => {
    expect(recentUserText(messages)).toBe('first ask\nsecond ask\nthird ask')
    expect(recentUserText(messages, 2)).toBe('second ask\nthird ask')
  })

  it('returns an empty string when there are no user messages', () => {
    expect(recentUserText([{ role: 'assistant', content: 'hi' }])).toBe('')
  })
})

describe('suggestRelevantSkills', () => {
  const skills: SkillInfo[] = [
    {
      path: '.agents/skills/auth/SKILL.md',
      name: 'auth',
      description: 'Authentication, login, OAuth and sessions.',
    },
    {
      path: '.agents/skills/styling/SKILL.md',
      name: 'styling',
      description: 'ClassMap styling and theme tokens.',
    },
    {
      path: '.agents/skills/database/SKILL.md',
      name: 'database',
      description: 'DataStore CRUD and migrations.',
    },
  ]

  it('ranks the skill whose description matches the recent text first', () => {
    const out = suggestRelevantSkills(skills, 'How do I add a login page with OAuth sessions?')
    expect(out).toHaveLength(1)
    expect(out[0].skill.name).toBe('auth')
    expect(out[0].score).toBeGreaterThanOrEqual(2)
  })

  it('weighs a name match heavier than a single description term', () => {
    // "styling" hits the skill NAME (×3), so it wins over a lone description hit.
    const out = suggestRelevantSkills(skills, 'fix the styling', { max: 3 })
    expect(out[0].skill.name).toBe('styling')
  })

  it('suggests nothing when nothing clears the threshold (or the text is empty)', () => {
    expect(suggestRelevantSkills(skills, 'deploy to production tomorrow')).toEqual([])
    expect(suggestRelevantSkills(skills, '')).toEqual([])
  })

  it('respects the max cap and orders by score then name', () => {
    const out = suggestRelevantSkills(
      skills,
      'login oauth sessions classmap theme migrations crud',
      { max: 2, minScore: 1 },
    )
    expect(out).toHaveLength(2)
    expect(out[0].skill.name).toBe('auth')
    expect(out.map((s) => s.skill.name)).not.toContain('styling') // tie lost to 'database' by name
  })
})
