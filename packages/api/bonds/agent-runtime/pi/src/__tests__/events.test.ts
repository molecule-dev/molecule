import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { splitJsonlRecords, summarizePiEvents } from '../events.js'

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')

// Captured from a real `pi --mode json` run of @earendil-works/pi-coding-agent@1.0.0
// with an invalid Anthropic key (2026-10-03): the process exited 0.
const errorRun = fixture('error-401-v1.0.0.jsonl')
// Built from docs/json.md + docs/message-types.md: CRLF framing, a U+2028
// inside a string, a tool call, a compaction, and agent_settled.
const successRun = fixture('success-synthetic.jsonl')

describe('splitJsonlRecords', () => {
  it('splits on LF only, strips one CR, and keeps U+2028/U+2029 inside a record', () => {
    const text = '{"a":"x y"}\r\n{"b":"p q"}\n\n'
    expect(splitJsonlRecords(text)).toEqual(['{"a":"x y"}', '{"b":"p q"}'])
  })

  it('keeps every record of a stream with a U+2028 string intact', () => {
    const records = splitJsonlRecords(successRun)
    expect(records).toHaveLength(18)
    for (const r of records) expect(() => JSON.parse(r)).not.toThrow()
  })
})

describe('summarizePiEvents', () => {
  it('reads a real failed run that exited 0: settled, stopReason error, the 401 message', () => {
    const s = summarizePiEvents(errorRun)
    expect(s.sawSessionHeader).toBe(true)
    expect(s.settled).toBe(true)
    expect(s.lastStopReason).toBe('error')
    expect(s.lastErrorMessage).toContain('401')
    expect(s.answeredBy).toEqual(['anthropic/claude-haiku-4-5'])
    expect(s.lines.some((l) => l.startsWith('[pi] assistant error'))).toBe(true)
  })

  it('sums usage over every assistant message_end plus compaction, ignoring message_update', () => {
    const s = summarizePiEvents(successRun)
    expect(s.settled).toBe(true)
    expect(s.lastStopReason).toBe('stop')
    expect(s.lastText).toBe('Done   the sum now adds.')
    expect(s.usage).toEqual({
      inputTokens: 1200 + 1400 + 300,
      outputTokens: 80 + 20 + 40,
      cacheReadTokens: 1100,
      cacheCreationTokens: 1100,
    })
    expect(s.lines).toContain('[pi] edit src/math.ts')
    expect(s.lines).toContain('[pi] context compacted (threshold)')
    expect(s.unparsed).toBe(0)
  })

  it('reports a stream that ended before agent_settled', () => {
    const cut = splitJsonlRecords(successRun).slice(0, 9).join('\n')
    const s = summarizePiEvents(cut)
    expect(s.settled).toBe(false)
    expect(s.lastStopReason).toBe('toolUse')
  })

  it('records a retry sequence that gave up, and clears it when a later one succeeds', () => {
    const failed = summarizePiEvents(
      [
        '{"type":"auto_retry_start","attempt":1,"maxAttempts":3,"delayMs":2000,"errorMessage":"529 overloaded"}',
        '{"type":"auto_retry_end","success":false,"attempt":3,"finalError":"529 overloaded"}',
        '{"type":"agent_settled"}',
      ].join('\n'),
    )
    expect(failed.retryFailure).toBe('529 overloaded')
    const recovered = summarizePiEvents(
      [
        '{"type":"auto_retry_end","success":false,"finalError":"x"}',
        '{"type":"auto_retry_end","success":true,"attempt":2}',
      ].join('\n'),
    )
    expect(recovered.retryFailure).toBeUndefined()
  })

  it('counts non-JSON stdout records instead of throwing', () => {
    const s = summarizePiEvents('not json\n{"type":"agent_settled"}\n')
    expect(s.unparsed).toBe(1)
    expect(s.sawSessionHeader).toBe(false)
    expect(s.settled).toBe(true)
  })
})
