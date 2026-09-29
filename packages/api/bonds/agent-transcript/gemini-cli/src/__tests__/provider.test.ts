import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { provider } from '../provider.js'
import { partText } from '../session.js'

// Built from the record shapes in gemini-cli's chatRecordingTypes.ts / logger.ts (2026-09-29).
const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
const log = fixture('session-2026-09-29T10-00-a1b2c3d4.jsonl')
const legacy = fixture('session-legacy.json')
const checkpoint = fixture('checkpoint-notes.json')
const wrapped = fixture('checkpoint-notes-wrapped.json')

const NOTES = '# Notes\n\nLogs show what happened first.'

describe('detect', () => {
  it('recognizes the session log, the session file and both checkpoint shapes', () => {
    for (const text of [log, legacy, checkpoint, wrapped])
      expect(provider.detect({ text })).toBe(true)
  })

  it('refuses other formats', () => {
    expect(provider.detect({ text: '# Codex conversation\n\n## User\n\nhi' })).toBe(false)
    expect(
      provider.detect({ text: '{"type":"user","message":{"role":"user","content":"hi"}}' }),
    ).toBe(false)
    expect(
      provider.detect({
        text: '[{"role":"user","content":"hi"},{"role":"assistant","content":"yo"}]',
      }),
    ).toBe(false)
    expect(provider.detect({ text: '[{"role":"user","parts":[{"text":"hi"}]}]' })).toBe(false)
    expect(() => provider.read({ text: 'hello', fileName: 'x.json' })).toThrow(
      /Not a Gemini CLI transcript \(x\.json\)/,
    )
  })
})

describe('the session log', () => {
  const s = provider.read({ text: log })

  it('replays the log: injected context, notices, slash commands and the rewound turn are gone', () => {
    expect(s).toMatchObject({
      format: 'gemini-cli',
      harness: 'Gemini CLI',
      model: 'gemini-3-pro',
      startedAt: '2026-09-29T10:00:00.000Z',
    })
    expect(s.turns.map((t) => [t.role, t.text])).toEqual([
      ['user', 'Create notes.md with a heading and one sentence about logs.'],
      ['assistant', 'I will create `notes.md` now.'],
      ['user', 'Rename the heading to Field notes.'],
      ['assistant', 'Done — the heading is now "Field notes".'],
    ])
  })

  it('shows the user message as typed and keeps times and the model', () => {
    expect(s.turns[0].text).not.toContain('Content from referenced files')
    expect(s.turns[0].timestamp).toBe('2026-09-29T10:00:05.000Z')
    expect(s.turns[1].model).toBe('gemini-3-pro')
  })

  it('reads successful write_file and replace calls, and skips a failed one', () => {
    expect(s.turns[1].files).toEqual([
      { path: '/home/user/demo/notes.md', kind: 'create', text: NOTES, complete: true },
    ])
    expect(s.turns[3].files).toEqual([
      { path: '/home/user/demo/notes.md', kind: 'edit', text: '# Field notes', complete: true },
    ])
  })
})

describe('the older session file', () => {
  it('reads the same conversation', () => {
    const s = provider.read({ text: legacy })
    expect(s.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
    expect(s.turns[3].files[0].text).toBe('# Field notes')
  })
})

describe('a /chat save checkpoint', () => {
  it('drops the injected context and its reply, and folds a tool round trip into one assistant turn', () => {
    for (const text of [checkpoint, wrapped]) {
      const s = provider.read({ text })
      expect(s.model).toBeUndefined()
      expect(s.turns.map((t) => [t.role, t.text])).toEqual([
        ['user', 'Create notes.md with a heading and one sentence about logs.'],
        ['assistant', 'I will create `notes.md` now.\n\nCreated the file.'],
      ])
      expect(s.turns[1].files).toEqual([
        { path: '/home/user/demo/notes.md', kind: 'create', text: NOTES, complete: true },
      ])
    }
  })
})

describe('partText', () => {
  it('reads strings, single parts and part arrays, and skips thoughts', () => {
    expect(partText('plain')).toBe('plain')
    expect(partText({ text: 'one' })).toBe('one')
    expect(partText([{ text: 'a' }, { text: 'hidden', thought: true }, { text: 'b' }])).toBe('ab')
  })
})
