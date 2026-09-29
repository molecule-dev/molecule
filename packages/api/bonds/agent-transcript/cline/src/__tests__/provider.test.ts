import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { provider } from '../provider.js'
import { replacementsOf } from '../ui-messages.js'

// Built from ClineMessage / ClineSayTool (cline/cline) and Roo Code's message
// schema (packages/types/src/message.ts) — 2026-09-29.
const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
const cline = fixture('cline-ui_messages.json')
const roo = fixture('roo-ui_messages.json')

describe('detect', () => {
  it('recognizes Cline and Roo Code ui_messages.json', () => {
    expect(provider.detect({ text: cline })).toBe(true)
    expect(provider.detect({ text: roo })).toBe(true)
  })

  it('refuses other formats, including the raw API history', () => {
    expect(
      provider.detect({
        text: '[{"role":"user","content":[{"type":"text","text":"<task>hi</task>"}]}]',
      }),
    ).toBe(false)
    expect(provider.detect({ text: '[]' })).toBe(false)
    expect(provider.detect({ text: '# Codex conversation\n\n## User\n\nhi' })).toBe(false)
    expect(() => provider.read({ text: 'hello', fileName: 'x.json' })).toThrow(
      /Not a Cline \/ Roo Code transcript \(x\.json\)/,
    )
  })
})

describe('a Cline task', () => {
  const s = provider.read({ text: cline })

  it('reads the task, the question, the reply and the result, skipping partial and system messages', () => {
    expect(s).toMatchObject({ format: 'cline', harness: 'Cline' })
    expect(s.model).toBeUndefined()
    expect(s.startedAt).toBe(new Date(1790582401500).toISOString())
    expect(s.turns.map((t) => [t.role, t.text])).toEqual([
      ['user', 'Create notes.md with a heading and one sentence about logs.'],
      [
        'assistant',
        'I will create the notes file.\n\nShould the heading say "Field notes" instead?',
      ],
      ['user', 'Yes, rename it.'],
      ['assistant', 'Created notes.md and renamed its heading to "Field notes".'],
    ])
  })

  it('reads a created file once (the ask and the say of one edit) and a SEARCH/REPLACE edit', () => {
    expect(s.turns[1].files).toEqual([
      {
        path: 'notes.md',
        kind: 'create',
        text: '# Notes\n\nLogs show what happened first.',
        complete: true,
      },
    ])
    expect(s.turns[3].files).toEqual([
      { path: 'notes.md', kind: 'edit', text: '# Field notes', complete: true },
    ])
  })
})

describe('a Roo Code task', () => {
  const s = provider.read({ text: roo })

  it('takes the first text message as the task', () => {
    expect(s.harness).toBe('Roo Code')
    expect(s.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
    expect(s.turns[0].text).toBe('Add a greeting function to app.ts.')
  })

  it('reads Roo’s <<<<<<< SEARCH diff, and marks an unreadable diff incomplete', () => {
    expect(s.turns[1].files).toEqual([
      {
        path: 'src/app.ts',
        kind: 'edit',
        text: 'export function greet(name: string): string {\n  return `Hello, ${name}`\n}',
        complete: true,
      },
    ])
    expect(s.turns[3].files).toEqual([
      { path: 'src/app.ts', kind: 'edit', text: '', complete: false },
    ])
  })
})

describe('replacementsOf', () => {
  it('reads *** Begin Patch files', () => {
    const patch =
      '*** Begin Patch\n*** Add File: a.md\n+# A\n+text\n*** Update File: b.md\n@@\n-old\n+new\n*** End Patch'
    expect(replacementsOf(patch)).toEqual([
      { text: '# A\ntext', create: true },
      { text: 'new', create: false },
    ])
  })
})
