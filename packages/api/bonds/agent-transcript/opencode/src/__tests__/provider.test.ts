import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { writesOfPatch } from '../export.js'
import { provider } from '../provider.js'

// Built from OpenCode's session-v1 schema (packages/schema/src/v1/session.ts) — 2026-09-29.
const exported = readFileSync(join(__dirname, 'fixtures', 'opencode-export.json'), 'utf8')

describe('detect', () => {
  it('recognizes an opencode export', () => {
    expect(provider.detect({ text: exported })).toBe(true)
  })

  it('refuses other JSON', () => {
    expect(provider.detect({ text: '{"info":{"id":"x"},"messages":[]}' })).toBe(false)
    expect(provider.detect({ text: '{"sessionId":"a","projectHash":"b","messages":[]}' })).toBe(
      false,
    )
    expect(provider.detect({ text: '[{"ts":1,"type":"say","say":"task","text":"hi"}]' })).toBe(
      false,
    )
    expect(() => provider.read({ text: 'hello', fileName: 'x.json' })).toThrow(
      /Not an OpenCode transcript \(x\.json\)/,
    )
  })
})

describe('the export', () => {
  const s = provider.read({ text: exported })

  it('reads the session: version, start, one model', () => {
    expect(s).toMatchObject({
      format: 'opencode',
      harness: 'OpenCode',
      harnessVersion: '1.14.2',
      model: 'claude-sonnet-4-5',
      startedAt: new Date(1790582400000).toISOString(),
    })
  })

  it('reads what the person typed without the synthetic @file part, and the replies without reasoning', () => {
    expect(s.turns.map((t) => [t.role, t.text])).toEqual([
      ['user', 'Create @notes.md with a heading and one sentence about logs.'],
      ['assistant', 'Creating `notes.md` now.\n\nDone.'],
      ['user', 'Rename the heading to Field notes, and add a changelog.'],
      ['assistant', 'Renamed it and added CHANGELOG.md.'],
    ])
    expect(s.turns[1].model).toBe('claude-sonnet-4-5')
  })

  it('reads completed write, edit and apply_patch calls, and skips a failed one', () => {
    expect(s.turns[1].files).toEqual([
      {
        path: '/home/user/demo/notes.md',
        kind: 'create',
        text: '# Notes\n\nLogs show what happened first.',
        complete: true,
      },
    ])
    expect(s.turns[3].files).toEqual([
      { path: '/home/user/demo/notes.md', kind: 'edit', text: '# Field notes', complete: true },
      {
        path: 'CHANGELOG.md',
        kind: 'create',
        text: '# Changelog\n\n- Renamed the notes heading.',
        complete: true,
      },
    ])
  })
})

describe('writesOfPatch', () => {
  it('reads an update’s added lines', () => {
    expect(
      writesOfPatch('*** Begin Patch\n*** Update File: a.md\n@@\n-old\n+new\n*** End Patch'),
    ).toEqual([{ path: 'a.md', kind: 'edit', text: 'new', complete: true }])
  })
})
