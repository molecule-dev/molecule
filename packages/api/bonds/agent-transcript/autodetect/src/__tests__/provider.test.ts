import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { AgentTranscriptReader } from '@molecule/api-agent-transcript'

import { createReader, provider } from '../provider.js'

// The real fixtures each reader is tested against.
const bond = (name: string, file: string): string =>
  readFileSync(
    join(__dirname, '..', '..', '..', name, 'src', '__tests__', 'fixtures', file),
    'utf8',
  )

describe('the bundled reader', () => {
  it('reads each harness’s file with its own reader', () => {
    const cases: Array<[string, string, string]> = [
      ['claude-code', 'export-v2.1.281.txt', 'claude-code'],
      ['claude-code', 'session-v2.1.281.jsonl', 'claude-code'],
      ['codex', 'export-v0.156.1.md', 'codex'],
      ['codex', 'rollout-v0.156.1.jsonl', 'codex'],
      ['molecule-ide', 'conversation.json', 'molecule-ide'],
    ]
    for (const [dir, file, format] of cases) {
      const text = bond(dir, file)
      expect(provider.detect({ text, fileName: file })).toBe(true)
      const s = provider.read({ text, fileName: file })
      expect(s.format).toBe(format)
      expect(s.turns[0].role).toBe('user')
      expect(s.turns.some((t) => t.role === 'assistant' && t.files.length > 0)).toBe(true)
    }
  })

  it('throws on a file no reader recognizes, naming it and the readers tried', () => {
    // A hand-written "Human:/Assistant:" imitation is not any harness's real export.
    const imitation = 'Claude Code · 2026-08-14\n\nHuman: write a post\n\nAssistant: Here it is.\n'
    expect(provider.detect({ text: imitation })).toBe(false)
    expect(() => provider.read({ text: imitation, fileName: 'fake.txt' })).toThrow(
      /No transcript reader recognizes fake\.txt\. Readers tried: Claude Code, Codex CLI, Molecule IDE\./,
    )
  })
})

describe('createReader', () => {
  it('delegates to the first reader that detects the input', () => {
    const mk = (format: string, match: string): AgentTranscriptReader => ({
      format,
      label: format,
      detect: (i) => i.text.includes(match),
      read: () => ({ format, harness: format, turns: [] }),
    })
    const r = createReader([mk('a', 'x'), mk('b', 'x'), mk('c', 'y')])
    expect(r.read({ text: 'x' }).format).toBe('a')
    expect(r.read({ text: 'y' }).format).toBe('c')
    expect(r.detect({ text: 'z' })).toBe(false)
  })
})
