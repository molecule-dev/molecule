/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real transcript reader
 * and overlap provider. Only the filesystem is redirected: the transcript is
 * the Claude Code bond's real export fixture, and the post is composed from a
 * human paragraph plus one the agent wrote in that session.
 *
 * @module
 */
import type * as Fs from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

const FIXTURE = join(
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

const HUMAN =
  'I have been writing software for fifteen years and I still reach for the debugger before the log.'
const AI =
  'Reading logs first saves you from overthinking. You won’t waste time tracing through conditional branches the code never hit, or wondering about race conditions that didn’t occur.'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof Fs>()
  return {
    ...actual,
    readFileSync: (path: string, encoding: BufferEncoding) => {
      if (path === 'transcripts/why-logs-first/claude-code-export.txt') {
        return actual.readFileSync(FIXTURE, encoding)
      }
      if (path === 'posts/why-logs-first.txt') return `${HUMAN}\n\n${AI}\n`
      throw new Error(`Unexpected read: ${path}`)
    },
  }
})

import { readFileSync } from 'node:fs'

import { readTranscript, setProvider as setReader } from '@molecule/api-agent-transcript'
import { provider as reader } from '@molecule/api-agent-transcript-autodetect'
import { provider as overlap } from '@molecule/api-text-provenance-overlap'

import { attributeText, setProvider } from '../index.js'

describe('README @example', () => {
  it('marks the agent-written paragraph as AI with its prompt and model', () => {
    setReader(reader)
    setProvider(overlap)

    const fileName = 'transcripts/why-logs-first/claude-code-export.txt'
    const session = readTranscript({ text: readFileSync(fileName, 'utf8'), fileName })

    const post = readFileSync('posts/why-logs-first.txt', 'utf8')
    const paragraphs = post
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)

    const result = attributeText({ paragraphs, sessions: [session] })
    expect(result.paragraphs.map((p) => p.origin)).toEqual(['human', 'ai'])
    expect(result.paragraphs[0]?.prompt).toBeUndefined()
    expect(result.paragraphs[1]?.prompt).toMatch(/^Reply with a markdown heading/)
    expect(result.paragraphs[1]?.model).toBe('Haiku 4.5')
    expect(result.aiShare).toBeGreaterThan(0)
    expect(result.aiShare).toBeLessThan(1)
    expect(result.prompts).toHaveLength(1)
  })
})
