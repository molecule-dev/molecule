import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { AgentTranscriptReader } from '@molecule/api-agent-transcript'

import { createReader, harnessReaders, provider } from '../provider.js'

// The real fixtures each reader is tested against.
const bond = (name: string, file: string): string =>
  readFileSync(
    join(__dirname, '..', '..', '..', name, 'src', '__tests__', 'fixtures', file),
    'utf8',
  )

describe('the bundled reader', () => {
  it('reads each harness’s file with its own reader', () => {
    const cases: Array<[string, string, string]> = [
      ['claude-code', 'export-v2.1.281.txt', 'claude-code'],
      ['claude-code', 'session-v2.1.281.jsonl', 'claude-code'],
      ['codex', 'export-v0.156.1.md', 'codex'],
      ['codex', 'rollout-v0.156.1.jsonl', 'codex'],
      ['molecule-ide', 'conversation.json', 'molecule-ide'],
      ['gemini-cli', 'session-2026-09-29T10-00-a1b2c3d4.jsonl', 'gemini-cli'],
      ['cline', 'cline-ui_messages.json', 'cline'],
      ['opencode', 'opencode-export.json', 'opencode'],
      ['pi', 'session-v1.0.0.jsonl', 'pi'],
      ['copilot-chat', 'chat.json', 'copilot-chat'],
      ['aider', '.aider.chat.history.md', 'aider'],
    ]
    for (const [dir, file, format] of cases) {
      const text = bond(dir, file)
      expect(provider.detect({ text, fileName: file })).toBe(true)
      const s = provider.read({ text, fileName: file })
      expect(s.format).toBe(format)
      expect(s.turns[0].role).toBe('user')
      expect(s.turns.some((t) => t.role === 'assistant' && t.files.length > 0)).toBe(true)
    }
  })

  it('reads a hand-written chat as a Markdown chat, never as a harness — and the harness list refuses it', () => {
    // A "Human:/Assistant:" imitation is not any harness's real export.
    const imitation = 'Claude Code · 2026-08-14\n\nHuman: write a post\n\nAssistant: Here it is.\n'
    expect(provider.read({ text: imitation }).format).toBe('markdown-chat')
    const harnessOnly = createReader(harnessReaders)
    expect(harnessOnly.detect({ text: imitation })).toBe(false)
    expect(() => harnessOnly.read({ text: imitation, fileName: 'fake.txt' })).toThrow(
      /No transcript reader recognizes fake\.txt\. Readers tried: Claude Code, Codex CLI, Molecule IDE, Gemini CLI, Cline \/ Roo Code, OpenCode, Pi, GitHub Copilot Chat, Cursor, Aider\./,
    )
  })

  it('throws on a file no reader recognizes, naming it', () => {
    expect(() => provider.read({ text: 'just some notes', fileName: 'notes.txt' })).toThrow(
      /No transcript reader recognizes notes\.txt\. Readers tried: .*Markdown chat\./,
    )
  })

  it('claims every fixture of every reader bond with exactly its own reader', () => {
    const dirs: Array<[string, string]> = [
      ['claude-code', 'claude-code'],
      ['codex', 'codex'],
      ['molecule-ide', 'molecule-ide'],
      ['gemini-cli', 'gemini-cli'],
      ['cline', 'cline'],
      ['opencode', 'opencode'],
      ['pi', 'pi'],
      ['copilot-chat', 'copilot-chat'],
      ['cursor', 'cursor'],
      ['aider', 'aider'],
      ['markdown-chat', 'markdown-chat'],
    ]
    const all = [...harnessReaders]
    let checked = 0
    for (const [dir, format] of dirs) {
      const fixtures = join(__dirname, '..', '..', '..', dir, 'src', '__tests__', 'fixtures')
      for (const file of readdirSync(fixtures)) {
        const text = readFileSync(join(fixtures, file), 'utf8')
        const input = { text, fileName: file }
        expect(provider.read(input).format, `${dir}/${file}`).toBe(format)
        // No OTHER harness reader accepts it, whatever the order.
        const claimants = all.filter((r) => r.detect(input)).map((r) => r.format)
        expect(claimants, `${dir}/${file}`).toEqual(format === 'markdown-chat' ? [] : [format])
        checked++
      }
    }
    expect(checked).toBeGreaterThanOrEqual(20)
  })
})

describe('createReader', () => {
  it('delegates to the first reader that detects the input', () => {
    const mk = (format: string, match: string): AgentTranscriptReader => ({
      format,
      label: format,
      detect: (i) => i.text.includes(match),
      read: () => ({ format, harness: format, turns: [] }),
    })
    const r = createReader([mk('a', 'x'), mk('b', 'x'), mk('c', 'y')])
    expect(r.read({ text: 'x' }).format).toBe('a')
    expect(r.read({ text: 'y' }).format).toBe('c')
    expect(r.detect({ text: 'z' })).toBe(false)
  })
})
