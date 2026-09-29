import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { chatStyleOf } from '../chat.js'
import { provider } from '../provider.js'

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
const headings = fixture('headings.md')
const bold = fixture('bold.md')
const plain = fixture('plain.txt')

describe('detect', () => {
  it('recognizes the three marker styles', () => {
    expect(chatStyleOf(headings)).toBe('heading')
    expect(chatStyleOf(bold)).toBe('bold')
    expect(chatStyleOf(plain)).toBe('plain')
  })

  it('refuses anything without both a user and an assistant marker', () => {
    expect(provider.detect({ text: '# Guide\n\nUser: set this in your config.' })).toBe(false)
    expect(provider.detect({ text: '## Assistant\n\nOnly the assistant speaks here.' })).toBe(false)
    expect(provider.detect({ text: 'Just some notes.\n\nNo speakers at all.' })).toBe(false)
    expect(provider.detect({ text: '```\nUser: hi\nAssistant: hello\n```' })).toBe(false)
    expect(() => provider.read({ text: 'hello', fileName: 'x.md' })).toThrow(
      /Not a Markdown chat \(x\.md\)/,
    )
  })
})

describe('reading', () => {
  it('splits on headings, keeping fenced markers and other-style labels in the reply', () => {
    const s = provider.read({ text: headings })
    expect(s).toMatchObject({ format: 'markdown-chat', harness: 'Markdown chat' })
    expect(s.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
    expect(s.turns[1].text).toContain('## User\nthis line is inside a code block')
    expect(s.turns[1].text).toContain('Model: this line is part of the reply.')
    expect(s.turns[1].text.endsWith('---')).toBe(false)
    expect(s.turns[3].text).toBe('Read the logs first.')
  })

  it('reads bold labels with the text on the same line and continuing lines', () => {
    const s = provider.read({ text: bold })
    expect(s.turns.map((t) => [t.role, t.text])).toEqual([
      ['user', 'Add a README to the project.'],
      ['assistant', 'Added `README.md` with a one-paragraph overview.\nIt also lists the scripts.'],
      ['user', 'Great.'],
    ])
  })

  it('reads plain labels, with Human / AI names', () => {
    const s = provider.read({ text: plain })
    expect(s.turns.map((t) => t.text)).toEqual([
      'What does the build script do?',
      'It compiles TypeScript into dist/.',
      'And the test script?',
      'It runs vitest once.',
    ])
    expect(s.turns.every((t) => t.files.length === 0 && t.model === undefined)).toBe(true)
  })
})
