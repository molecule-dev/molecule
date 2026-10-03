import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { provider } from '../provider.js'

// The first four lines (header, model_change, thinking_level_change, system
// message) were written by a real Pi 1.0.0 run; the rest follows
// docs/session-format.md + docs/message-types.md (2026-10-03), including an
// abandoned branch, a failed write, and every `edits` shape edit.ts accepts.
const session = readFileSync(join(__dirname, 'fixtures', 'session-v1.0.0.jsonl'), 'utf8')
// What `pi --mode json` prints (docs/json.md).
const stream = readFileSync(join(__dirname, 'fixtures', 'pi-mode-json.jsonl'), 'utf8')

describe('detect', () => {
  it('recognizes a Pi session file and a pi --mode json stream', () => {
    expect(provider.detect({ text: session })).toBe(true)
    expect(provider.detect({ text: stream })).toBe(true)
  })

  it('refuses other JSONL and JSON', () => {
    expect(provider.detect({ text: '{"type":"session_meta","payload":{}}\n' })).toBe(false)
    expect(provider.detect({ text: '{"type":"session","id":"x"}\n' })).toBe(false)
    expect(provider.detect({ text: '{"type":"session","version":9,"id":"x","cwd":"/"}\n' })).toBe(
      false,
    )
    expect(provider.detect({ text: '{"parentUuid":null,"type":"user","message":{}}\n' })).toBe(
      false,
    )
    expect(() => provider.read({ text: 'hello', fileName: 'x.jsonl' })).toThrow(
      /Not a Pi transcript \(x\.jsonl\)/,
    )
  })
})

describe('a session file', () => {
  const s = provider.read({ text: session })

  it('reads the session: format, harness, start, one model', () => {
    expect(s).toMatchObject({
      format: 'pi',
      harness: 'Pi',
      model: 'claude-sonnet-5-5',
      startedAt: '2026-10-03T10:15:34.739Z',
    })
    expect(s.harnessVersion).toBeUndefined()
  })

  it('reads the active branch only, without the system prompt, images or thinking', () => {
    expect(s.turns.map((t) => [t.role, t.text])).toEqual([
      ['user', 'Create notes.md with a heading and one line about logs.'],
      ['assistant', 'Creating `notes.md`.\n\nDone   created it.'],
      ['user', 'Rename the heading to Field notes and add a changelog line.'],
      ['assistant', 'Renaming.\n\nRenamed it and added the changelog line.'],
    ])
    expect(s.turns[0].timestamp).toBe('2026-10-03T10:16:00.000Z')
    expect(s.turns[1].model).toBe('claude-sonnet-5-5')
  })

  it('reads successful writes and every edits shape, and skips a failed write', () => {
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
      { path: 'notes.md', kind: 'edit', text: 'first, then why.', complete: true },
      {
        path: 'CHANGELOG.md',
        kind: 'edit',
        text: '# Changelog\n\n- Renamed the heading.',
        complete: true,
      },
      { path: 'README.md', kind: 'edit', text: 'b', complete: true },
      { path: 'LEGACY.md', kind: 'edit', text: 'y', complete: true },
    ])
  })

  it('follows the branch that ends at the last entry, wherever the branches sit in the file', () => {
    const lines = session.trimEnd().split('\n')
    // Move the abandoned branch's last entry to the end: the conversation is now that branch.
    const abandoned = lines.findIndex((l) => l.includes('"id":"b0000003"'))
    const reordered = [...lines.filter((_, i) => i !== abandoned), lines[abandoned]].join('\n')
    const alt = provider.read({ text: reordered })
    expect(alt.turns.map((t) => t.text)).toEqual([
      'Create notes.md with a heading and one line about logs.',
      'Creating `notes.md`.\n\nDone   created it.',
      'Delete it instead.',
      '',
    ])
    expect(alt.turns[3].files).toEqual([
      { path: 'notes.md', kind: 'create', text: '', complete: true },
    ])
  })
})

describe('a pi --mode json stream', () => {
  it('reads the completed messages in order, with tool success from tool_execution_end', () => {
    const s = provider.read({ text: stream, fileName: 'events.jsonl' })
    expect(s.turns.map((t) => [t.role, t.text])).toEqual([
      ['user', 'Fix the failing test.'],
      ['assistant', 'Fixing the test.\n\nDone   the sum now adds.'],
    ])
    expect(s.turns[1].files).toEqual([
      { path: 'src/math.ts', kind: 'edit', text: 'a + b', complete: true },
    ])
    expect(s.turns[0].timestamp).toBe(new Date(1791022599000).toISOString())
  })
})
