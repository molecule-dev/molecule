import { describe, expect, it } from 'vitest'

import type { CardEvent, ChatMessage } from '@molecule/app-ai-chat'

import {
  buildChatTimeline,
  type BuildChatTimelineInput,
  isStaleAnonymousLimit,
  isWorkVisible,
  planAwaitingUser,
  selectQueuedMessages,
  selectVisibleMessages,
  timelineSortKey,
  timestampSlotFor,
} from '../chatTimelineOrdering.js'
import type { ActivityStatus } from '../components/activity-utilities.js'
import type {
  ActivityCardEntry,
  CommitCard,
  SystemCard,
  TipCardEntry,
} from '../components/chat-card-event-utilities.js'
import { ENTRY_TIP } from '../components/chat-tips-utilities.js'

/** Build a message item. */
const msg = (
  timestamp: number,
  opts: { isStreaming?: boolean; content?: string; blocks?: unknown[]; queued?: boolean } = {},
) => ({ kind: 'message' as const, msg: { timestamp, ...opts } })
/** Build a card item. */
const card = (timestamp: number) => ({ kind: 'system' as const, card: { timestamp } })

/** Build a full chat message. */
const message = (over: Partial<ChatMessage> & { id: string; timestamp: number }): ChatMessage => ({
  role: 'assistant',
  content: '',
  ...over,
})

/** Build a plain system card. */
const systemCard = (over: Partial<SystemCard> & { id: string; timestamp: number }): SystemCard => ({
  text: 'notice',
  ...over,
})

/** Build a commit card. */
const commitCard = (over: Partial<CommitCard> & { id: string; timestamp: number }): CommitCard => ({
  message: 'commit',
  files: [],
  status: 'done',
  ...over,
})

/** Build an activity card entry. */
const activityCard = (over: {
  id: string
  timestamp: number
  status?: ActivityStatus
}): ActivityCardEntry => ({
  id: over.id,
  timestamp: over.timestamp,
  activity: {
    id: `activity-${over.id}`,
    type: 'email',
    status: over.status ?? 'sent',
    timestamp: new Date(0).toISOString(),
  },
})

/** Build a tip card entry. */
const tipCard = (id: string, timestamp: number): TipCardEntry => ({
  id,
  timestamp,
  tip: ENTRY_TIP,
})

/** Build a timeline input, overriding only what a case needs. */
const timelineInput = (over: Partial<BuildChatTimelineInput> = {}): BuildChatTimelineInput => ({
  visibleMessages: [],
  cardEventToSystemCard: () => null,
  commitCards: [],
  systemCards: [],
  activityCards: [],
  tipCards: [],
  error: null,
  errorMeta: null,
  isStaleAnonymousLimit: false,
  ...over,
})

describe('timelineSortKey', () => {
  it('orders a normal message by its timestamp', () => {
    expect(timelineSortKey(msg(42))).toBe(42)
  })

  it('orders a card by its timestamp', () => {
    expect(timelineSortKey(card(42))).toBe(42)
  })

  it('sorts an empty streaming message after every timestamped item', () => {
    expect(timelineSortKey(msg(10, { isStreaming: true }))).toBe(Number.MAX_SAFE_INTEGER - 1)
  })

  it('sorts a queued message dead last — below even the streaming placeholder', () => {
    expect(timelineSortKey(msg(10, { queued: true, content: 'next task' }))).toBe(
      Number.MAX_SAFE_INTEGER,
    )
  })

  it('orders a streaming message that already has content by its timestamp', () => {
    // After useChat re-stamps it to first-content time, it sorts by time again.
    expect(timelineSortKey(msg(20, { isStreaming: true, blocks: [{}] }))).toBe(20)
    expect(timelineSortKey(msg(20, { isStreaming: true, content: 'hi' }))).toBe(20)
  })

  it('does NOT special-case a finished (non-streaming) empty message', () => {
    expect(timelineSortKey(msg(15, { isStreaming: false }))).toBe(15)
  })

  it('places the turn preamble ABOVE the still-thinking response (the reported bug)', () => {
    // Live: user + empty streaming placeholder share the send-time ts (34); the
    // preamble cards arrive a beat later (35..37). The empty response must sort last.
    const items = [
      msg(34), // user prompt
      msg(34, { isStreaming: true }), // empty streaming assistant placeholder
      card(35), // "Building your app"
      card(36), // "now using deepseek"
      card(37), // "loaded 9 skills"
    ]
    const order = [...items].sort((a, b) => timelineSortKey(a) - timelineSortKey(b))
    // The empty streaming response is last; the three cards sit above it.
    expect(order[order.length - 1]).toBe(items[1])
    expect(order.slice(0, 4)).toEqual([items[0], items[2], items[3], items[4]])
  })

  it('keeps the preamble above once the response has content (re-stamped after them)', () => {
    const items = [
      msg(34), // user prompt
      card(35),
      card(36),
      card(37),
      msg(40, { isStreaming: true, content: 'reading files…' }), // re-stamped to first-content
    ]
    const order = [...items].sort((a, b) => timelineSortKey(a) - timelineSortKey(b))
    expect(order).toEqual(items) // already in the right order; response stays last
  })

  it('pins queued messages to the very bottom while the turn keeps streaming (the reported bug)', () => {
    const queued = msg(50, { queued: true, content: 'also add dark mode' })
    const items = [
      msg(34), // user prompt
      msg(40, { isStreaming: true, content: 'building…' }), // in-flight response
      queued, // queued at t=50 mid-stream
      msg(60, { content: 'verify round output' }), // later assistant message (auto-continue)
      card(65), // later card
      msg(70, { isStreaming: true }), // fresh empty placeholder for the next round
    ]
    const order = [...items].sort((a, b) => timelineSortKey(a) - timelineSortKey(b))
    // Everything the turn streams AFTER queueing still renders above the queued message.
    expect(order[order.length - 1]).toBe(queued)
  })

  it('keeps multiple queued messages in queue order (stable sort)', () => {
    const q1 = msg(50, { queued: true, content: 'first' })
    const q2 = msg(51, { queued: true, content: 'second' })
    const items = [msg(34), q1, q2, msg(60, { content: 'streamed later' })]
    const order = [...items].sort((a, b) => timelineSortKey(a) - timelineSortKey(b))
    expect(order.slice(-2)).toEqual([q1, q2])
  })
})

describe('selectVisibleMessages', () => {
  it('drops hidden driver messages and keeps the rest in order', () => {
    const shown = message({ id: 'a', timestamp: 1, content: 'hello' })
    const hidden = message({ id: 'b', timestamp: 2, hidden: true })
    const alsoShown = message({ id: 'c', timestamp: 3, content: 'bye' })
    expect(selectVisibleMessages([shown, hidden, alsoShown])).toEqual([shown, alsoShown])
  })

  it('returns an empty array for no messages', () => {
    expect(selectVisibleMessages([])).toEqual([])
  })
})

describe('selectQueuedMessages', () => {
  it('keeps only the queued messages, in queue order', () => {
    const first = message({ id: 'a', timestamp: 1, queued: true })
    const sent = message({ id: 'b', timestamp: 2 })
    const second = message({ id: 'c', timestamp: 3, queued: true })
    expect(selectQueuedMessages([first, sent, second])).toEqual([first, second])
  })

  it('returns an empty array when nothing is queued', () => {
    expect(selectQueuedMessages([message({ id: 'a', timestamp: 1 })])).toEqual([])
  })
})

describe('isStaleAnonymousLimit', () => {
  it('is stale when the limit requires signup and the viewer is signed in', () => {
    expect(isStaleAnonymousLimit({ requiresSignup: true }, false)).toBe(true)
  })

  it('is not stale while the viewer is still anonymous', () => {
    expect(isStaleAnonymousLimit({ requiresSignup: true }, true)).toBe(false)
  })

  it('is not stale without limit metadata', () => {
    expect(isStaleAnonymousLimit(null, false)).toBe(false)
  })

  it('is not stale for a limit that does not require signup', () => {
    expect(isStaleAnonymousLimit({ limitType: 'budget' }, false)).toBe(false)
  })
})

describe('buildChatTimeline', () => {
  it('renders a plain message as a message item, ordered by timestamp', () => {
    const later = message({ id: 'later', timestamp: 20, content: 'second' })
    const earlier = message({ id: 'earlier', timestamp: 10, content: 'first' })
    const timeline = buildChatTimeline(timelineInput({ visibleMessages: [later, earlier] }))
    expect(timeline).toEqual([
      { kind: 'message', msg: earlier },
      { kind: 'message', msg: later },
    ])
  })

  it('skips queued messages — they render in the anchored bar, not inline', () => {
    const queued = message({ id: 'q', timestamp: 5, queued: true })
    const shown = message({ id: 'm', timestamp: 10, content: 'hi' })
    const timeline = buildChatTimeline(timelineInput({ visibleMessages: [queued, shown] }))
    expect(timeline).toEqual([{ kind: 'message', msg: shown }])
  })

  it('turns a card-message into a system card via the supplied builder', () => {
    const cardEvent: CardEvent = { kind: 'skills', count: 3 }
    const cardMessage = message({
      id: 'card-1',
      timestamp: 7,
      role: 'system',
      cardEvent,
      content: 'loaded skills',
    })
    const built = systemCard({ id: 'card-1', timestamp: 7, text: 'loaded 3 skills' })
    const timeline = buildChatTimeline(
      timelineInput({
        visibleMessages: [cardMessage],
        cardEventToSystemCard: (event, id, timestamp) => {
          expect(event).toBe(cardEvent)
          expect(id).toBe('card-1')
          expect(timestamp).toBe(7)
          return built
        },
      }),
    )
    expect(timeline).toEqual([{ kind: 'system', card: built }])
  })

  it('drops a card-message whose builder returns null', () => {
    const cardMessage = message({
      id: 'card-1',
      timestamp: 7,
      cardEvent: { kind: 'skills', count: 3 },
    })
    const timeline = buildChatTimeline(timelineInput({ visibleMessages: [cardMessage] }))
    expect(timeline).toEqual([])
  })

  it('drops a plain card that repeats the live limit banner while the error is up', () => {
    const cardMessage = message({
      id: 'card-1',
      timestamp: 7,
      cardEvent: { kind: 'skills', count: 3 },
    })
    const built = systemCard({ id: 'card-1', timestamp: 7, coversLimitType: 'budget' })
    const timeline = buildChatTimeline(
      timelineInput({
        visibleMessages: [cardMessage],
        cardEventToSystemCard: () => built,
        error: 'limit reached',
        errorMeta: { limitType: 'budget' },
      }),
    )
    expect(timeline).toEqual([])
  })

  it('keeps that card when the anonymous limit is stale', () => {
    const cardMessage = message({
      id: 'card-1',
      timestamp: 7,
      cardEvent: { kind: 'skills', count: 3 },
    })
    const built = systemCard({ id: 'card-1', timestamp: 7, coversLimitType: 'budget' })
    const timeline = buildChatTimeline(
      timelineInput({
        visibleMessages: [cardMessage],
        cardEventToSystemCard: () => built,
        error: 'limit reached',
        errorMeta: { limitType: 'budget' },
        isStaleAnonymousLimit: true,
      }),
    )
    expect(timeline).toEqual([{ kind: 'system', card: built }])
  })

  it('keeps a card whose coversLimitType differs from the live limit', () => {
    const cardMessage = message({
      id: 'card-1',
      timestamp: 7,
      cardEvent: { kind: 'skills', count: 3 },
    })
    const built = systemCard({ id: 'card-1', timestamp: 7, coversLimitType: 'spend' })
    const timeline = buildChatTimeline(
      timelineInput({
        visibleMessages: [cardMessage],
        cardEventToSystemCard: () => built,
        error: 'limit reached',
        errorMeta: { limitType: 'budget' },
      }),
    )
    expect(timeline).toEqual([{ kind: 'system', card: built }])
  })

  it('drops a local commit card once the same commit is persisted as a message record', () => {
    const persisted = message({
      id: 'm',
      timestamp: 10,
      commitRecord: { message: 'fix', files: ['a.ts'], hash: 'abc123' },
    })
    const duplicate = commitCard({ id: 'local-1', timestamp: 11, hash: 'abc123' })
    const pending = commitCard({ id: 'local-2', timestamp: 12, hash: 'def456' })
    const hashless = commitCard({ id: 'local-3', timestamp: 13 })
    const timeline = buildChatTimeline(
      timelineInput({
        visibleMessages: [persisted],
        commitCards: [duplicate, pending, hashless],
      }),
    )
    expect(timeline.map((item) => item.kind)).toEqual(['message', 'commit', 'commit'])
    expect(timeline.slice(1)).toEqual([
      { kind: 'commit', card: pending },
      { kind: 'commit', card: hashless },
    ])
  })

  it('appends system, activity and tip cards and orders everything by timestamp', () => {
    const tip = tipCard('tip-1', 40)
    const activity = activityCard({ id: 'act-1', timestamp: 30 })
    const system = systemCard({ id: 'sys-1', timestamp: 20 })
    const chat = message({ id: 'm', timestamp: 10, content: 'hi' })
    const timeline = buildChatTimeline(
      timelineInput({
        visibleMessages: [chat],
        systemCards: [system],
        activityCards: [activity],
        tipCards: [tip],
      }),
    )
    expect(timeline.map((item) => item.kind)).toEqual(['message', 'system', 'activity', 'tip'])
  })

  it('sorts an empty streaming placeholder below every card (the preamble rule)', () => {
    const placeholder = message({ id: 'p', timestamp: 10, isStreaming: true })
    const system = systemCard({ id: 'sys-1', timestamp: 20 })
    const timeline = buildChatTimeline(
      timelineInput({ visibleMessages: [placeholder], systemCards: [system] }),
    )
    expect(timeline.map((item) => item.kind)).toEqual(['system', 'message'])
  })
})

describe('timestampSlotFor', () => {
  it('puts a typed user message in its header row and always shows it', () => {
    const item = {
      kind: 'message' as const,
      msg: message({ id: 'u1', timestamp: 5, role: 'user', content: 'hi' }),
    }
    expect(timestampSlotFor(item)).toEqual({
      id: 'u1',
      timestamp: 5,
      align: 'left',
      alwaysShown: true,
      placement: 'header',
    })
  })

  it('puts an automatic user message on a line, not the header', () => {
    const item = {
      kind: 'message' as const,
      msg: message({ id: 'u1', timestamp: 5, role: 'user', automatic: true, content: 'fix it' }),
    }
    expect(timestampSlotFor(item)).toEqual({
      id: 'u1',
      timestamp: 5,
      align: 'left',
      alwaysShown: false,
      placement: 'line',
    })
  })

  it('puts a team note in its header row and always shows it', () => {
    const item = {
      kind: 'message' as const,
      msg: message({ id: 't1', timestamp: 5, role: 'system', teamOnly: true }),
    }
    expect(timestampSlotFor(item)).toMatchObject({
      id: 't1',
      alwaysShown: true,
      placement: 'header',
    })
  })

  it('returns null for an assistant placeholder with nothing rendered yet', () => {
    const item = { kind: 'message' as const, msg: message({ id: 'a1', timestamp: 5 }) }
    expect(timestampSlotFor(item)).toBeNull()
  })

  it('shows an assistant reply with content on a line, not always', () => {
    const item = {
      kind: 'message' as const,
      msg: message({ id: 'a1', timestamp: 5, content: 'done' }),
    }
    expect(timestampSlotFor(item)).toEqual({
      id: 'a1',
      timestamp: 5,
      align: 'left',
      alwaysShown: false,
      placement: 'line',
    })
  })

  it('marks a reply that failed verification as critical (always shown)', () => {
    const item = {
      kind: 'message' as const,
      msg: message({
        id: 'a1',
        timestamp: 5,
        blocks: [{ type: 'verification', status: 'error', workspaces: ['app'] }],
      }),
    }
    expect(timestampSlotFor(item)).toMatchObject({ alwaysShown: true, placement: 'line' })
  })

  it('marks a resource-limit reply as critical (always shown)', () => {
    const item = {
      kind: 'message' as const,
      msg: message({
        id: 'a1',
        timestamp: 5,
        blocks: [{ type: 'resource_limit', resource: 'tokens', message: 'out of tokens' }],
      }),
    }
    expect(timestampSlotFor(item)).toMatchObject({ alwaysShown: true })
  })

  it('shows the time of a commit card only when it failed', () => {
    const failed = {
      kind: 'commit' as const,
      card: commitCard({ id: 'c1', timestamp: 5, status: 'error' }),
    }
    const done = { kind: 'commit' as const, card: commitCard({ id: 'c2', timestamp: 6 }) }
    expect(timestampSlotFor(failed)).toMatchObject({ id: 'c1', alwaysShown: true, align: 'left' })
    expect(timestampSlotFor(done)).toMatchObject({ id: 'c2', alwaysShown: false, align: 'left' })
  })

  it('shows the time of an activity card only when it failed', () => {
    const failed = {
      kind: 'activity' as const,
      card: activityCard({ id: 'act1', timestamp: 5, status: 'failed' }),
    }
    const sent = {
      kind: 'activity' as const,
      card: activityCard({ id: 'act2', timestamp: 6, status: 'sent' }),
    }
    expect(timestampSlotFor(failed)).toMatchObject({ alwaysShown: true, align: 'left' })
    expect(timestampSlotFor(sent)).toMatchObject({ alwaysShown: false, align: 'left' })
  })

  it('never always-shows a tip card', () => {
    expect(timestampSlotFor({ kind: 'tip', card: tipCard('tip-1', 5) })).toMatchObject({
      alwaysShown: false,
      placement: 'line',
      align: 'left',
    })
  })

  it('returns null for the /help card', () => {
    const help = systemCard({ id: 'sys-1', timestamp: 5, variant: 'help' })
    expect(timestampSlotFor({ kind: 'system', card: help })).toBeNull()
  })

  it('centers a skillsLoaded notice', () => {
    const loaded = systemCard({ id: 'sys-1', timestamp: 5, variant: 'skillsLoaded' })
    expect(timestampSlotFor({ kind: 'system', card: loaded })).toMatchObject({
      alwaysShown: false,
      align: 'center',
    })
  })

  it('centers a plain single-line notice with no tone or action', () => {
    const plain = systemCard({ id: 'sys-1', timestamp: 5, text: 'one line' })
    expect(timestampSlotFor({ kind: 'system', card: plain })).toMatchObject({ align: 'center' })
  })

  it('left-aligns a plain notice that carries a tone', () => {
    const toned = systemCard({ id: 'sys-1', timestamp: 5, tone: 'info' })
    expect(timestampSlotFor({ kind: 'system', card: toned })).toMatchObject({ align: 'left' })
  })

  it('left-aligns a plain multi-line notice', () => {
    const multi = systemCard({ id: 'sys-1', timestamp: 5, text: 'line one\nline two' })
    expect(timestampSlotFor({ kind: 'system', card: multi })).toMatchObject({ align: 'left' })
  })

  it('always-shows a critical plain notice', () => {
    const critical = systemCard({ id: 'sys-1', timestamp: 5, critical: true })
    expect(timestampSlotFor({ kind: 'system', card: critical })).toMatchObject({
      alwaysShown: true,
    })
  })
})

describe('planAwaitingUser', () => {
  it('is true when the last message carries an awaiting_response tool call', () => {
    const last = message({
      id: 'm',
      timestamp: 1,
      toolCalls: [
        {
          id: 't1',
          name: 'ask_user',
          input: {},
          status: 'running',
          output: { status: 'awaiting_response' },
        },
      ],
    })
    expect(planAwaitingUser([last])).toBe(true)
  })

  it('is false when the last tool call finished', () => {
    const last = message({
      id: 'm',
      timestamp: 1,
      toolCalls: [
        { id: 't1', name: 'ask_user', input: {}, status: 'done', output: { status: 'answered' } },
      ],
    })
    expect(planAwaitingUser([last])).toBe(false)
  })

  it('only reads the LAST message', () => {
    const earlier = message({
      id: 'm1',
      timestamp: 1,
      toolCalls: [
        {
          id: 't1',
          name: 'ask_user',
          input: {},
          status: 'running',
          output: { status: 'awaiting_response' },
        },
      ],
    })
    const last = message({ id: 'm2', timestamp: 2, content: 'carry on' })
    expect(planAwaitingUser([earlier, last])).toBe(false)
  })

  it('is false for an empty transcript', () => {
    expect(planAwaitingUser([])).toBe(false)
  })
})

describe('isWorkVisible', () => {
  const noWork = {
    commandMenu: null,
    modelPicker: null,
    effortPicker: null,
    panelOverlay: null,
    plan: [],
    backgroundTasks: [],
    showTests: false,
    showFiles: false,
  }

  it('is false when there is no work to show', () => {
    expect(isWorkVisible(noWork)).toBe(false)
  })

  it('is true when there is a plan', () => {
    expect(isWorkVisible({ ...noWork, plan: [{ content: 'step' }] })).toBe(true)
  })

  it('is true when background tasks are in flight', () => {
    expect(isWorkVisible({ ...noWork, backgroundTasks: [{ id: 'bg' }] })).toBe(true)
  })

  it('is true when the tests strip shows', () => {
    expect(isWorkVisible({ ...noWork, showTests: true })).toBe(true)
  })

  it('is true when the files strip shows', () => {
    expect(isWorkVisible({ ...noWork, showFiles: true })).toBe(true)
  })

  it('is hidden while any popup is open, even with work in flight', () => {
    const work = { ...noWork, plan: [{ content: 'step' }] }
    expect(isWorkVisible({ ...work, commandMenu: {} })).toBe(false)
    expect(isWorkVisible({ ...work, modelPicker: {} })).toBe(false)
    expect(isWorkVisible({ ...work, effortPicker: {} })).toBe(false)
    expect(isWorkVisible({ ...work, panelOverlay: 'settings' })).toBe(false)
  })
})
