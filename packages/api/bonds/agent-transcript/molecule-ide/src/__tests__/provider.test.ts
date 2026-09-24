import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { provider } from '../provider.js'

// A stored molecule.dev conversation (a benchmark build, trimmed): a visible prompt, platform
// messages, a system card, assistant turns with write_file / edit_file calls.
const text = readFileSync(join(__dirname, 'fixtures', 'conversation.json'), 'utf8')
const stored = JSON.parse(text) as {
  messages: Array<{ role: string; hidden?: boolean; content: string }>
}

describe('detect', () => {
  it('recognizes a stored conversation and the bare messages array', () => {
    expect(provider.detect({ text })).toBe(true)
    expect(provider.detect({ text: JSON.stringify(stored.messages) })).toBe(true)
  })

  it('refuses a generic chat log, other formats and non-JSON', () => {
    expect(
      provider.detect({
        text: JSON.stringify({
          messages: [
            { role: 'user', content: 'hi' },
            { role: 'assistant', content: 'hello' },
          ],
        }),
      }),
    ).toBe(false)
    expect(provider.detect({ text: '{"type":"session_meta","payload":{}}' })).toBe(false)
    expect(provider.detect({ text: '# Codex conversation' })).toBe(false)
    expect(() => provider.read({ text: '[]' })).toThrow(/Not a Molecule IDE conversation/)
  })
})

describe('read', () => {
  const s = provider.read({ text })
  const users = stored.messages.filter((m) => m.role === 'user' && !m.hidden)

  it('keeps only what people typed as user turns', () => {
    expect(s).toMatchObject({ format: 'molecule-ide', harness: 'Molecule IDE' })
    const prompts = s.turns.filter((t) => t.role === 'user').map((t) => t.text)
    expect(prompts).toEqual(users.map((u) => u.content.trim()))
    expect(prompts.some((p) => /^\[(project-context|auto-continue)\]/.test(p))).toBe(false)
  })

  it('folds consecutive assistant messages into one turn, with the model and the files written', () => {
    expect(s.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
    const build = s.turns[1]
    expect(build.model).toBe('deepseek-flash')
    expect(build.text).toContain('Writing the new content now.')
    expect(build.files.length).toBeGreaterThanOrEqual(5)
    expect(build.files.every((f) => f.path.startsWith('/workspace/'))).toBe(true)
    expect(build.files.some((f) => f.kind === 'edit' && f.text.length > 0)).toBe(true)
  })

  it('keeps an elided write as incomplete, never as empty-but-complete', () => {
    const elided = s.turns.flatMap((t) => t.files).filter((f) => !f.complete)
    expect(elided.length).toBeGreaterThan(0)
    expect(elided.every((f) => f.text === '' && f.kind === 'create')).toBe(true)
  })

  it('treats [auto-continue] / [project-context] as platform messages even when not marked hidden', () => {
    const extra = {
      messages: [...stored.messages, { role: 'user', content: '[auto-continue] Keep going.' }],
    }
    const s2 = provider.read({ text: JSON.stringify(extra) })
    expect(s2.turns.filter((t) => t.role === 'user')).toHaveLength(users.length)
  })
})
