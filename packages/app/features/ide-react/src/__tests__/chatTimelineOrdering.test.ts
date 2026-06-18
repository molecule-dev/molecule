import { describe, expect, it } from 'vitest'

import { repositionBeforeResponseCards } from '../chatTimelineOrdering.js'

/** Build a message item. */
const msg = (role: string, timestamp: number) => ({
  kind: 'message' as const,
  msg: { role, timestamp },
})
/** Build a card item (flagged 'before-response' by default). */
const card = (timestamp: number, placement?: string) => ({
  kind: 'system' as const,
  card: { timestamp, ...(placement ? { placement } : {}) },
})

/** Compact label for a positional assertion. */
const label = (it: {
  kind: string
  msg?: { role: string }
  card?: { placement?: string }
}): string =>
  it.kind === 'message' ? `msg:${it.msg?.role}` : `card${it.card?.placement ? ':flagged' : ''}`

describe('repositionBeforeResponseCards', () => {
  it('returns the same reference when nothing is flagged', () => {
    const items = [msg('user', 10), msg('assistant', 10), card(50)]
    expect(repositionBeforeResponseCards(items)).toBe(items)
  })

  it('moves a flagged card between the user prompt and the assistant response (the reported bug)', () => {
    // The live scenario: user + streaming assistant placeholder share a send-time
    // timestamp (34); the onboarding tip arrives ~83ms later (117) and a plain sort
    // drops it below the question.
    const items = [msg('user', 34), msg('assistant', 34), card(117, 'before-response')]
    expect(repositionBeforeResponseCards(items).map(label)).toEqual([
      'msg:user',
      'card:flagged',
      'msg:assistant',
    ])
  })

  it('anchors to the correct turn in a multi-turn transcript (prealpha on turn 2)', () => {
    const items = [
      msg('user', 10),
      msg('assistant', 20),
      msg('user', 30),
      msg('assistant', 30),
      card(40, 'before-response'),
    ]
    expect(repositionBeforeResponseCards(items).map(label)).toEqual([
      'msg:user',
      'msg:assistant',
      'msg:user',
      'card:flagged',
      'msg:assistant',
    ])
  })

  it('keeps a turn-1 card at turn 1 even after the conversation grows', () => {
    // models_intro (ts 117, turn 1) must not drift down to a later turn's response.
    const items = [
      msg('user', 10),
      msg('assistant', 200),
      msg('user', 300),
      msg('assistant', 500),
      card(117, 'before-response'),
    ]
    expect(repositionBeforeResponseCards(items).map(label)).toEqual([
      'msg:user',
      'card:flagged',
      'msg:assistant',
      'msg:user',
      'msg:assistant',
    ])
  })

  it('falls back to the end when the turn has no assistant response yet', () => {
    const items = [msg('user', 10), card(20, 'before-response')]
    expect(repositionBeforeResponseCards(items).map(label)).toEqual(['msg:user', 'card:flagged'])
  })

  it('leaves an unflagged card ordered purely by timestamp', () => {
    const items = [msg('user', 10), msg('assistant', 10), card(50)]
    expect(repositionBeforeResponseCards(items).map(label)).toEqual([
      'msg:user',
      'msg:assistant',
      'card',
    ])
  })
})
