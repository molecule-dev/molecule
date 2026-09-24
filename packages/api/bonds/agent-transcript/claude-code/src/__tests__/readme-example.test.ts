/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real agent-transcript
 * core. Only the filesystem is redirected: the example's path is served from
 * this package's real Claude Code session log fixture.
 *
 * @module
 */
import type * as Fs from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

const fixture = join(__dirname, 'fixtures', 'session-v2.1.281.jsonl')

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof Fs>()
  return {
    ...actual,
    readFileSync: (path: string, encoding: BufferEncoding) =>
      actual.readFileSync(path === 'transcripts/session.jsonl' ? fixture : path, encoding),
  }
})

import { readFileSync } from 'node:fs'

import { readTranscript, setProvider } from '@molecule/api-agent-transcript'

import { provider } from '../index.js'

describe('README @example', () => {
  it('bonds the reader and reads the file into turns with their file writes', () => {
    setProvider(provider)

    const session = readTranscript({
      text: readFileSync('transcripts/session.jsonl', 'utf8'),
      fileName: 'session.jsonl',
    })

    expect(session.format).toBe('claude-code')
    expect(session.harnessVersion).toBe('2.1.281')
    expect(session.model).toBe('claude-haiku-4-5-20251001')

    const lines = session.turns.map((turn) => {
      const files = turn.files.map((f) => `${f.kind} ${f.path}`)
      return { role: turn.role, text: turn.text.slice(0, 40), files }
    })
    expect(lines[0]?.role).toBe('user')
    expect(lines[0]?.text).not.toBe('')
    expect(lines.some((l) => l.role === 'assistant')).toBe(true)
    expect(lines.at(-1)?.files).toEqual([
      'create /home/user/logs-demo/notes.md',
      'edit /home/user/logs-demo/notes.md',
    ])
  })
})
