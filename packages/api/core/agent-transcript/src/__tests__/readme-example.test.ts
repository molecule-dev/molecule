/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the autodetect reader bond.
 * Only the filesystem is redirected: the example's path is served from the
 * Claude Code bond's real export fixture.
 *
 * @module
 */
import type * as Fs from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

const fixture = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'bonds',
  'agent-transcript',
  'claude-code',
  'src',
  '__tests__',
  'fixtures',
  'export-v2.1.281.txt',
)

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof Fs>()
  return {
    ...actual,
    readFileSync: (path: string, encoding: BufferEncoding) =>
      actual.readFileSync(
        path === 'transcripts/my-post/claude-code-export.txt' ? fixture : path,
        encoding,
      ),
  }
})

import { readFileSync } from 'node:fs'

import { provider } from '@molecule/api-agent-transcript-autodetect'

import { readTranscript, setProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the autodetect reader and reads a Claude Code export into turns', () => {
    setProvider(provider)

    const session = readTranscript({
      text: readFileSync('transcripts/my-post/claude-code-export.txt', 'utf8'),
      fileName: 'claude-code-export.txt',
    })

    expect(session.format).toBe('claude-code')
    expect(session.harnessVersion).toBe('2.1.281')
    expect(session.turns[0]?.role).toBe('user')
    expect(session.turns[0]?.text).toContain('Why logs first')
    expect(session.turns.some((turn) => turn.role === 'assistant')).toBe(true)
    for (const turn of session.turns) {
      expect(Array.isArray(turn.files.map((f) => f.path))).toBe(true)
    }
  })
})
