import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { provider } from '../provider.js'

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
// Real files from one Claude Code 2.1.281 session: its `/export` and its session log.
const exportText = fixture('export-v2.1.281.txt')
const jsonl = fixture('session-v2.1.281.jsonl')

const FIRST_PROMPT =
  'Reply with a markdown heading "## Why logs first", then two short paragraphs about reading logs before code, one with bold words, then a bullet list of two items. Do not use any tools.'

describe('detect', () => {
  it('recognizes the /export text and the session log', () => {
    expect(provider.detect({ text: exportText })).toBe(true)
    expect(provider.detect({ text: jsonl })).toBe(true)
  })

  it('refuses other formats', () => {
    expect(provider.detect({ text: '# Codex conversation\n\n## User\n\nhi\n' })).toBe(false)
    expect(provider.detect({ text: '{"messages":[{"role":"user","content":"hi"}]}' })).toBe(false)
    expect(provider.detect({ text: 'Human: hi\n\nAssistant: hello\n' })).toBe(false)
    expect(() => provider.read({ text: 'plain notes', fileName: 'notes.txt' })).toThrow(
      /Not a Claude Code transcript \(notes\.txt\)/,
    )
  })
})

describe('the /export text', () => {
  const s = provider.read({ text: exportText })

  it('reads the header: version and the model display name', () => {
    expect(s).toMatchObject({
      format: 'claude-code',
      harness: 'Claude Code',
      harnessVersion: '2.1.281',
      model: 'Haiku 4.5',
    })
  })

  it('reads each prompt as one line of what was typed, not the terminal wrapping', () => {
    expect(s.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
    expect(s.turns[0].text).toBe(FIRST_PROMPT)
    expect(s.turns[2].text).toMatch(
      /^Now use the Write tool .* change "Notes" to "Field notes"\. Then say: written$/,
    )
  })

  it('re-joins wrapped paragraphs and keeps list items apart', () => {
    const reply = s.turns[1].text.split('\n\n')
    expect(reply[0]).toBe('Why logs first')
    expect(reply[1]).toMatch(
      /^When debugging, logs are your most direct window into what the code actually did\. .* logs tell you what did happen\.$/,
    )
    expect(reply[1]).not.toContain('\n')
    expect(reply[3].split('\n')).toHaveLength(2)
    expect(reply[3]).toMatch(
      /^- Log context is temporal — it captures the full sequence of events leading up to the failure/,
    )
  })

  it('reads what Write and Update put into the file, joining lines broken mid-word', () => {
    expect(s.turns[3].files).toEqual([
      {
        path: 'notes.md',
        kind: 'create',
        text: '# Notes\n\nThis is the first sentence of my notes. This is the second sentence of my notes.',
        complete: true,
      },
      { path: 'notes.md', kind: 'edit', text: '# Field notes', complete: true },
    ])
    expect(s.turns[3].text).toBe('written')
  })

  it('drops the collapsed activity line that follows a prompt', () => {
    const text = exportText.replace(
      '❯ Now use',
      '  Made 1 scratchpad edit +1 (ctrl+o to expand)\n\n❯ Now use',
    )
    expect(provider.read({ text }).turns[2].text).toMatch(/^Now use the Write tool/)
  })
})

describe('the session log', () => {
  const s = provider.read({ text: jsonl, fileName: 'session.jsonl' })

  it('reads the version, the model and the start time', () => {
    expect(s).toMatchObject({ harnessVersion: '2.1.281', model: 'claude-haiku-4-5-20251001' })
    expect(s.startedAt).toMatch(/^2026-09-24T/)
  })

  it('has the same conversation as the export, with markdown as written', () => {
    expect(s.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
    expect(s.turns[0].text).toContain('## Why logs first')
    expect(s.turns[1].text.startsWith('## Why logs first')).toBe(true)
    expect(s.turns[1].text).toContain('**')
    expect(s.turns[1].model).toBe('claude-haiku-4-5-20251001')
  })

  it('drops the /export command and its output, and reads writes in full', () => {
    expect(
      s.turns.some((t) => /command-name|local-command|Conversation exported/.test(t.text)),
    ).toBe(false)
    const [write, edit] = s.turns[3].files
    expect(write).toMatchObject({
      kind: 'create',
      complete: true,
      text: expect.stringContaining('# Notes'),
    })
    expect(write.path.endsWith('/notes.md')).toBe(true)
    expect(edit).toMatchObject({ kind: 'edit', text: expect.stringContaining('Field notes') })
    expect(s.turns[3].text).toBe('written')
  })

  it('skips a torn last line and a subagent’s own messages', () => {
    const side = JSON.stringify({
      type: 'user',
      isSidechain: true,
      uuid: 'x',
      message: { role: 'user', content: 'subagent task' },
    })
    const s2 = provider.read({ text: `${jsonl}${side}\n{"type":"assistant","mess` })
    expect(s2.turns.map((t) => t.text)).not.toContain('subagent task')
    expect(s2.turns).toHaveLength(4)
  })
})
