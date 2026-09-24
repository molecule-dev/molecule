/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real agent-transcript
 * core. Only the filesystem is redirected: the example's path is served from
 * this package's real Molecule IDE conversation fixture.
 *
 * @module
 */
import type * as Fs from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

const fixture = join(__dirname, 'fixtures', 'conversation.json')

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof Fs>()
  return {
    ...actual,
    readFileSync: (path: string, encoding: BufferEncoding) =>
      actual.readFileSync(path === 'transcripts/conversation.json' ? fixture : path, encoding),
  }
})

import { readFileSync } from 'node:fs'

import { readTranscript, setProvider } from '@molecule/api-agent-transcript'

import { provider } from '../index.js'

describe('README @example', () => {
  it('bonds the reader and reads the file into turns with their file writes', () => {
    setProvider(provider)

    const session = readTranscript({
      text: readFileSync('transcripts/conversation.json', 'utf8'),
      fileName: 'conversation.json',
    })

    expect(session.format).toBe('molecule-ide')
    expect(session.harness).toBe('Molecule IDE')
    expect(session.model).toBe('deepseek-flash')

    const lines = session.turns.map((turn) => {
      const files = turn.files.map((f) => `${f.kind} ${f.path}${f.complete ? '' : ' (elided)'}`)
      return { role: turn.role, text: turn.text.slice(0, 40), files }
    })
    expect(lines[0]?.role).toBe('user')
    expect(lines[0]?.text).not.toBe('')
    expect(lines.some((l) => l.role === 'assistant')).toBe(true)
    expect(lines[1]?.files[0]).toBe('edit /workspace/my-app/app/src/bonds/ai-anthropic.ts')
    expect(lines.flatMap((l) => l.files).some((f) => f.endsWith(' (elided)'))).toBe(true)
  })
})
