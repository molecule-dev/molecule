import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { provider } from '../provider.js'

// Written in the exact layout of real Cursor exports (1.1.7, 2.1.46, 2.3.41) — 2026-09-29.
const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
const md = fixture('cursor_log_notes.md')
const zh = fixture('cursor_zh_locale.md')

describe('detect', () => {
  it('recognizes exports in any locale', () => {
    expect(provider.detect({ text: md })).toBe(true)
    expect(provider.detect({ text: zh })).toBe(true)
  })

  it('refuses a hand-written chat and other exports', () => {
    expect(provider.detect({ text: '# Chat\n\n**User**\n\nhi\n\n**Cursor**\n\nhello' })).toBe(false)
    expect(provider.detect({ text: '# Codex conversation\n\n## User\n\nhi' })).toBe(false)
    expect(() => provider.read({ text: 'hello', fileName: 'x.md' })).toThrow(
      /Not a Cursor transcript \(x\.md\)/,
    )
  })
})

describe('the export', () => {
  const s = provider.read({ text: md })

  it('reads the turns, the version, and no model or files', () => {
    expect(s).toMatchObject({ format: 'cursor', harness: 'Cursor', harnessVersion: '2.3.41' })
    expect(s.model).toBeUndefined()
    expect(s.turns.map((t) => [t.role, t.files.length])).toEqual([
      ['user', 0],
      ['assistant', 0],
      ['user', 0],
      ['assistant', 0],
    ])
    expect(s.turns[0].text).toBe(
      'Write notes.md with a heading and two sentences about reading logs first.',
    )
    expect(s.turns[3].text).toBe('Done — the heading now reads **Field notes**.')
  })

  it('drops the separator before each speaker but keeps a reply’s own rule and headings', () => {
    expect(s.turns[1].text).toBe(
      "I'll create `notes.md`.\n\n## Why logs first\n\nLogs show what happened before an issue appeared.\n\n---\n\nReview them before guessing at causes.",
    )
  })

  it('reads a non-US export', () => {
    const z = provider.read({ text: zh })
    expect(z.harnessVersion).toBe('1.1.7')
    expect(z.turns.map((t) => t.text)).toEqual(['帮我创建一个主页。', '好的，我来创建。'])
  })
})
