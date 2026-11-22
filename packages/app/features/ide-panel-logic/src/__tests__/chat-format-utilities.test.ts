// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

import {
  allowanceResetCountdown,
  fileToBase64,
  formatSize,
  formatThinkingDuration,
  panelOverlayHeading,
  relativeTime,
  streamingActivityLabel,
} from '../components/chat-format-utilities.js'

/**
 * {@link allowanceResetCountdown} and the other `t()`-taking helpers travel
 * through the CALLER's translate function, so the tests use the same pair of
 * translators the sibling i18n tests use: a key-returning marker proves the
 * literal keys, an interpolating default-returning one proves the English
 * sentence.
 */

/** Marker translator that names the key it was called with: `@@<key>@@`. */
const keyT: TranslateFunction = (key) => `@@${key}@@`

/** Translator that interpolates the English default — what an unbuilt bond renders. */
const enT: TranslateFunction = (key, values, opts) =>
  (opts?.defaultValue ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    String(values?.[k] ?? `{{${k}}}`),
  )

/** ISO timestamp `ms` before the frozen now. */
const isoAgo = (ms: number): string => new Date(Date.now() - ms).toISOString()

describe('relativeTime', () => {
  it('says "just now" under a minute', () => {
    expect(relativeTime(isoAgo(0))).toBe('just now')
    expect(relativeTime(isoAgo(59_000))).toBe('just now')
  })

  it('formats minutes then hours then days', () => {
    expect(relativeTime(isoAgo(5 * 60_000))).toBe('5m ago')
    expect(relativeTime(isoAgo(59 * 60_000))).toBe('59m ago')
    expect(relativeTime(isoAgo(60 * 60_000))).toBe('1h ago')
    expect(relativeTime(isoAgo(23 * 60 * 60_000))).toBe('23h ago')
    expect(relativeTime(isoAgo(24 * 60 * 60_000))).toBe('1d ago')
    expect(relativeTime(isoAgo(3 * 24 * 60 * 60_000))).toBe('3d ago')
  })
})

describe('allowanceResetCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('routes every branch through its literal key', () => {
    const now = Date.now()
    expect(allowanceResetCountdown(keyT, now - 1)).toBe('@@ide.chat.resetSoon@@')
    expect(allowanceResetCountdown(keyT, Number.NaN)).toBe('@@ide.chat.resetSoon@@')
    expect(allowanceResetCountdown(keyT, now + 30 * 60_000)).toBe('@@ide.chat.resetUnderHour@@')
    expect(allowanceResetCountdown(keyT, now + 24.2 * 60 * 60_000)).toBe(
      '@@ide.chat.resetTomorrow@@',
    )
    expect(allowanceResetCountdown(keyT, now + 3 * 24 * 60 * 60_000)).toBe(
      '@@ide.chat.resetInDays@@',
    )
    expect(allowanceResetCountdown(keyT, now + 3 * 60 * 60_000)).toBe('@@ide.chat.resetInHours@@')
  })

  it('renders the English defaults with interpolation', () => {
    const now = Date.now()
    expect(allowanceResetCountdown(enT, now - 60_000)).toBe('soon')
    expect(allowanceResetCountdown(enT, now + 10 * 60_000)).toBe('in under an hour')
    expect(allowanceResetCountdown(enT, now + 25 * 60 * 60_000)).toBe('tomorrow')
    expect(allowanceResetCountdown(enT, now + 3 * 24 * 60 * 60_000)).toBe('in about 3 days')
    expect(allowanceResetCountdown(enT, now + 3 * 60 * 60_000)).toBe('in about 3 hours')
  })

  it('reads ≥6h out on a LATER LOCAL calendar day as tomorrow', () => {
    // 20:00 local: +6.5h lands on the next calendar day → tomorrow.
    const evening = new Date()
    evening.setHours(20, 0, 0, 0)
    vi.setSystemTime(evening)
    expect(allowanceResetCountdown(enT, Date.now() + 6.5 * 60 * 60_000)).toBe('tomorrow')

    // The same 6.5h gap from noon stays on today's calendar day → hours phrase.
    const noon = new Date()
    noon.setHours(12, 0, 0, 0)
    noon.setDate(noon.getDate() + 1)
    vi.setSystemTime(noon)
    expect(allowanceResetCountdown(enT, Date.now() + 6.5 * 60 * 60_000)).toBe('in about 7 hours')
  })

  it('keeps a 24h-ish window at tomorrow rather than "2 days"', () => {
    expect(allowanceResetCountdown(enT, Date.now() + 24.2 * 60 * 60_000)).toBe('tomorrow')
  })
})

describe('fileToBase64', () => {
  it('encodes text bytes without the data-URL prefix', async () => {
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
    await expect(fileToBase64(file)).resolves.toBe('aGVsbG8=')
  })

  it('encodes binary bytes exactly', async () => {
    const bytes = new Uint8Array([0, 255, 128, 1])
    const file = new File([bytes], 'blob.bin', { type: 'application/octet-stream' })
    await expect(fileToBase64(file)).resolves.toBe('AP+AAQ==')
  })

  it('encodes an empty file as the empty string', async () => {
    const file = new File([], 'empty.txt')
    await expect(fileToBase64(file)).resolves.toBe('')
  })
})

describe('formatSize', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatSize(0)).toBe('0B')
    expect(formatSize(999)).toBe('999B')
    expect(formatSize(1024)).toBe('1KB')
    expect(formatSize(1500)).toBe('1KB')
    expect(formatSize(2048)).toBe('2KB')
    expect(formatSize(1048576)).toBe('1.0MB')
    expect(formatSize(1.5 * 1048576)).toBe('1.5MB')
  })
})

describe('formatThinkingDuration', () => {
  it('uses the brief label under a second', () => {
    expect(formatThinkingDuration(keyT, 0)).toBe('@@ide.chat.thoughtBriefly@@')
    expect(formatThinkingDuration(enT, 999)).toBe('Thought briefly')
  })

  it('splits seconds singular/plural on distinct keys', () => {
    expect(formatThinkingDuration(keyT, 1000)).toBe('@@ide.chat.thoughtForSecond@@')
    expect(formatThinkingDuration(keyT, 59_000)).toBe('@@ide.chat.thoughtForSeconds@@')
    expect(formatThinkingDuration(enT, 1000)).toBe('Thought for 1 second')
    expect(formatThinkingDuration(enT, 5_400)).toBe('Thought for 5 seconds')
    expect(formatThinkingDuration(enT, 59_000)).toBe('Thought for 59 seconds')
  })

  it('splits minutes singular/plural on distinct keys', () => {
    expect(formatThinkingDuration(keyT, 60_000)).toBe('@@ide.chat.thoughtForMinute@@')
    expect(formatThinkingDuration(keyT, 120_000)).toBe('@@ide.chat.thoughtForMinutes@@')
    expect(formatThinkingDuration(enT, 60_000)).toBe('Thought for 1 minute')
    expect(formatThinkingDuration(enT, 300_000)).toBe('Thought for 5 minutes')
  })
})

describe('panelOverlayHeading', () => {
  it('routes each overlay through its literal key', () => {
    expect(panelOverlayHeading(keyT, 'skills')).toBe('@@ide.chat.skills.heading@@')
    expect(panelOverlayHeading(keyT, 'scripts')).toBe('@@ide.chat.scripts.heading@@')
    expect(panelOverlayHeading(keyT, 'tests')).toBe('@@ide.tests.heading@@')
    expect(panelOverlayHeading(keyT, 'settings')).toBe('@@ide.chat.settings.heading@@')
  })

  it('renders each English heading', () => {
    expect(panelOverlayHeading(enT, 'skills')).toBe('Skills')
    expect(panelOverlayHeading(enT, 'scripts')).toBe('Scripts')
    expect(panelOverlayHeading(enT, 'tests')).toBe('Tests')
    expect(panelOverlayHeading(enT, 'settings')).toBe('Settings')
  })
})

describe('streamingActivityLabel', () => {
  /** A streaming message whose last block is one tool call. */
  function message(name: string, input: unknown): Parameters<typeof streamingActivityLabel>[1] {
    return {
      blocks: [{ type: 'tool_call', id: 'call-1' }],
      toolCalls: [{ id: 'call-1', name, input }],
    }
  }

  it('returns undefined with no blocks, an empty list, or a non-tool-call last block', () => {
    expect(streamingActivityLabel(keyT, {})).toBeUndefined()
    expect(streamingActivityLabel(keyT, { blocks: [] })).toBeUndefined()
    expect(
      streamingActivityLabel(keyT, { blocks: [{ type: 'text', content: 'hi' }] }),
    ).toBeUndefined()
  })

  it('labels a thinking last block', () => {
    expect(streamingActivityLabel(keyT, { blocks: [{ type: 'thinking', content: '' }] })).toBe(
      '@@ide.chat.activity.thinking@@',
    )
    expect(streamingActivityLabel(enT, { blocks: [{ type: 'thinking', content: '' }] })).toBe(
      'Synthesizing',
    )
  })

  it('returns undefined when the last tool_call block has no matching tool call', () => {
    expect(
      streamingActivityLabel(keyT, { blocks: [{ type: 'tool_call', id: 'missing' }] }),
    ).toBeUndefined()
  })

  it('returns undefined for an unknown tool name', () => {
    expect(streamingActivityLabel(keyT, message('deploy_thing', {}))).toBeUndefined()
  })

  it('names the file being read, with a +N overflow for batch reads', () => {
    expect(streamingActivityLabel(enT, message('read_file', { paths: ['src/App.tsx'] }))).toBe(
      'Reading App.tsx',
    )
    expect(
      streamingActivityLabel(enT, message('read_file', { paths: ['src/App.tsx', 'src/main.tsx'] })),
    ).toBe('Reading App.tsx +1')
  })

  it('labels write, edit, search, exec, fetch and plan tools', () => {
    expect(streamingActivityLabel(enT, message('write_file', { path: 'a/b/App.tsx' }))).toBe(
      'Writing App.tsx',
    )
    expect(streamingActivityLabel(enT, message('edit_file', { path: 'a/b/App.tsx' }))).toBe(
      'Editing App.tsx',
    )
    expect(streamingActivityLabel(enT, message('search_files', { query: 'useState' }))).toBe(
      'Searching useState',
    )
    expect(streamingActivityLabel(enT, message('exec_command', { command: 'npm test' }))).toBe(
      'Running npm test',
    )
    expect(streamingActivityLabel(enT, message('sandbox_fetch', { url: 'https://x.dev/a' }))).toBe(
      'Fetching https://x.dev/a',
    )
    expect(streamingActivityLabel(enT, message('save_plan', {}))).toBe('Writing the plan')
  })

  it('labels the exploring tools without a target', () => {
    expect(streamingActivityLabel(enT, message('list_files', {}))).toBe('Exploring files')
    expect(streamingActivityLabel(enT, message('find_files', {}))).toBe('Exploring files')
    expect(streamingActivityLabel(keyT, message('list_files', {}))).toBe(
      '@@ide.chat.activity.exploring@@',
    )
  })

  it('labels set_mode', () => {
    expect(streamingActivityLabel(enT, message('set_mode', {}))).toBe('Switching mode')
  })

  it('clips a long query/command to 48 characters with an ellipsis', () => {
    const long = 'x'.repeat(60)
    expect(streamingActivityLabel(enT, message('search_files', { query: long }))).toBe(
      `Searching ${'x'.repeat(48)}…`,
    )
    expect(streamingActivityLabel(enT, message('exec_command', { command: long }))).toBe(
      `Running ${'x'.repeat(48)}…`,
    )
  })

  it('does not throw when a declared-string field arrives as a non-string', () => {
    for (const name of ['write_file', 'edit_file']) {
      for (const value of [42, null, { deep: true }, ['a', 'b'], true]) {
        expect(() => streamingActivityLabel(enT, message(name, { path: value }))).not.toThrow()
      }
    }
    expect(streamingActivityLabel(enT, message('write_file', { path: 42 }))).toBe('Writing 42')
  })

  it('drops a path segment that is only separators rather than rendering an empty name', () => {
    expect(streamingActivityLabel(enT, message('write_file', { path: '' }))).toBe('Writing ')
  })
})
