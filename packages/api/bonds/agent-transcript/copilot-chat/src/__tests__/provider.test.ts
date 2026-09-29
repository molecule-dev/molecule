import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { provider } from '../provider.js'

// Built from VS Code's chatModel.ts toExport() — 2026-09-29.
const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
const chat = fixture('chat.json')
const other = fixture('other-participant.json')

describe('detect', () => {
  it('recognizes a VS Code chat export', () => {
    expect(provider.detect({ text: chat })).toBe(true)
    expect(provider.detect({ text: other })).toBe(true)
  })

  it('refuses other JSON', () => {
    expect(provider.detect({ text: '{"requests":[]}' })).toBe(false)
    expect(
      provider.detect({ text: '{"info":{"id":"x","time":{"created":1}},"messages":[]}' }),
    ).toBe(false)
    expect(() => provider.read({ text: 'hello', fileName: 'x.json' })).toThrow(
      /Not a GitHub Copilot Chat transcript \(x\.json\)/,
    )
  })
})

describe('the export', () => {
  const s = provider.read({ text: chat })

  it('reads the requests as typed (object and plain-string messages), the replies and the model', () => {
    expect(s).toMatchObject({
      format: 'copilot-chat',
      harness: 'GitHub Copilot Chat',
      model: 'copilot/gpt-5.3',
      startedAt: new Date(1790582400000).toISOString(),
    })
    expect(s.turns.map((t) => [t.role, t.text])).toEqual([
      ['user', 'Add a greet function to #file:app.ts that says hello.'],
      [
        'assistant',
        'I added `greet` to `app.ts`.\n\n```ts\nexport function greet(name: string): string {\n  return `Hello, ${name}`\n}\n```',
      ],
      ['user', 'Explain what it returns.'],
      ['assistant', 'It returns a greeting string.'],
    ])
  })

  it('reads a text edit group as an edit, and ignores thinking and tool parts', () => {
    expect(s.turns[1].files).toEqual([
      {
        path: '/home/user/demo/src/app.ts',
        kind: 'edit',
        text: 'export function greet(name: string): string {\n  return `Hello, ${name}`\n}\n',
        complete: true,
      },
    ])
    expect(s.turns[1].text).not.toContain('Plan the edit')
  })

  it('names another participant', () => {
    expect(provider.read({ text: other }).harness).toBe('VS Code Chat (Workspace Helper)')
  })
})
