/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real agent-transcript
 * core. Only the filesystem is redirected: the example's directory is served
 * from the bundled readers' real fixtures plus a README that must be skipped.
 *
 * @module
 */
import type * as Fs from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

const fixture = (bond: string, file: string): string =>
  join(__dirname, '..', '..', '..', bond, 'src', '__tests__', 'fixtures', file)

const files: Record<string, string> = {
  'claude-code-export.txt': fixture('claude-code', 'export-v2.1.281.txt'),
  'rollout.jsonl': fixture('codex', 'rollout-v0.156.1.jsonl'),
  'conversation.json': fixture('molecule-ide', 'conversation.json'),
}

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof Fs>()
  return {
    ...actual,
    readdirSync: (path: string) =>
      path === 'transcripts/my-post' ? [...Object.keys(files), 'README.md'] : [],
    readFileSync: (path: string, encoding: BufferEncoding) => {
      const name = path.replace('transcripts/my-post/', '')
      if (name === 'README.md') return '# My post\n\nThese are the transcripts.\n'
      const real = files[name]
      if (!real) throw new Error(`Unexpected read: ${path}`)
      return actual.readFileSync(real, encoding)
    },
  }
})

import { readdirSync, readFileSync } from 'node:fs'

import { canReadTranscript, readTranscript, setProvider } from '@molecule/api-agent-transcript'

import { provider } from '../index.js'

describe('README @example', () => {
  it('reads every harness file in a directory and skips non-transcripts', () => {
    setProvider(provider)

    const dir = 'transcripts/my-post'
    const sessions = readdirSync(dir)
      .map((fileName) => ({ text: readFileSync(join(dir, fileName), 'utf8'), fileName }))
      .filter((input) => canReadTranscript(input))
      .map((input) => readTranscript(input))

    expect(sessions.map((s) => s.format)).toEqual(['claude-code', 'codex', 'molecule-ide'])
    for (const session of sessions) {
      const prompt = session.turns.find((turn) => turn.role === 'user')?.text
      expect(prompt).toBeTruthy()
      expect(session.turns.some((turn) => turn.role === 'assistant')).toBe(true)
    }
  })
})
