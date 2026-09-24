import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { findPatches, writesOfPatch } from '../patch.js'
import { provider } from '../provider.js'

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
// Real files from one Codex CLI 0.156.1 session: its Markdown export and its rollout.
const md = fixture('export-v0.156.1.md')
const rollout = fixture('rollout-v0.156.1.jsonl')

const PROMPT =
  'Reply with a markdown heading "## Why logs first" and two short paragraphs, one with **bold** words, then a two-item bullet list. Then create a file notes.md containing "# Notes" and two sentences, then change "Notes" to "Field notes" in it.'
const NOTES =
  '# Notes\n\nLogs show what happened before an issue appeared.\nReview them first to guide the investigation.'

describe('detect', () => {
  it('recognizes the Markdown export and the rollout', () => {
    expect(provider.detect({ text: md })).toBe(true)
    expect(provider.detect({ text: rollout })).toBe(true)
  })

  it('refuses other formats', () => {
    expect(provider.detect({ text: '# My notes\n\n## User\n\nhi' })).toBe(false)
    expect(
      provider.detect({
        text: '{"type":"user","uuid":"a","message":{"role":"user","content":"hi"}}',
      }),
    ).toBe(false)
    expect(() => provider.read({ text: 'hello', fileName: 'x.md' })).toThrow(
      /Not a Codex CLI transcript \(x\.md\)/,
    )
  })
})

describe('the Markdown export', () => {
  const s = provider.read({ text: md })

  it('reads one user turn as typed and one assistant turn, keeping the reply’s own ## heading', () => {
    expect(s).toMatchObject({ format: 'codex', harness: 'Codex CLI' })
    expect(s.model).toBeUndefined()
    expect(s.turns.map((t) => t.role)).toEqual(['user', 'assistant'])
    expect(s.turns[0].text).toBe(PROMPT)
    expect(s.turns[1].text).toContain('## Why logs first\n\n**Logs provide evidence**')
    expect(s.turns[1].text).toMatch(/- Review errors and timestamps\.\n- Use the findings/)
  })

  it('reads the Activity file changes: the added file whole, the update’s added lines', () => {
    expect(s.turns[1].files).toEqual([
      { path: '/home/user/logs-demo/notes.md', kind: 'create', text: NOTES, complete: true },
      {
        path: '/home/user/logs-demo/notes.md',
        kind: 'edit',
        text: '# Field notes',
        complete: true,
      },
    ])
  })
})

describe('the rollout', () => {
  const s = provider.read({ text: rollout, fileName: 'rollout.jsonl' })

  it('reads version, model, start time and the same conversation as the export', () => {
    expect(s).toMatchObject({
      harnessVersion: '0.156.1',
      model: 'gpt-6-astra',
      startedAt: '2026-09-24T05:48:54.289Z',
    })
    expect(s.turns.map((t) => t.role)).toEqual(['user', 'assistant'])
    expect(s.turns[0].text).toBe(PROMPT)
    expect(s.turns[1].model).toBe('gpt-6-astra')
    expect(s.turns[1].text).toBe(provider.read({ text: md }).turns[1].text)
  })

  it('drops the injected environment context and developer messages', () => {
    expect(s.turns.some((t) => /environment_context|permissions instructions/.test(t.text))).toBe(
      false,
    )
  })

  it('reads the patches the code-mode call passed to tools.apply_patch', () => {
    expect(s.turns[1].files).toEqual([
      { path: 'notes.md', kind: 'create', text: NOTES, complete: true },
      { path: 'notes.md', kind: 'edit', text: '# Field notes', complete: true },
    ])
  })
})

describe('apply_patch', () => {
  const patch =
    '*** Begin Patch\n*** Add File: a.md\n+one\n+two\n*** Update File: b.ts\n@@\n-old\n+new\n context\n*** Delete File: c.txt\n*** End Patch'

  it('finds a patch raw, in JSON arguments, and in a quoted string', () => {
    expect(findPatches(patch)).toEqual([patch])
    expect(findPatches(JSON.stringify({ input: patch }))).toEqual([patch])
    expect(findPatches(`text(await tools.apply_patch(${JSON.stringify(patch)}))`)).toEqual([patch])
  })

  it('reads added files whole and updates as their added lines', () => {
    expect(writesOfPatch(patch)).toEqual([
      { path: 'a.md', kind: 'create', text: 'one\ntwo', complete: true },
      { path: 'b.ts', kind: 'edit', text: 'new', complete: true },
    ])
  })
})
