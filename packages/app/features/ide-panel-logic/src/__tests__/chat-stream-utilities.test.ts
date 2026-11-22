/**
 * Tests for the streaming token estimate.
 *
 * estimateStreamTokens runs on every ~50ms stream flush. The bug it now guards
 * against: it used to JSON.stringify EVERY tool call's input (a write_file input
 * is the whole file) on every flush — O(total content) per flush, O(n²) across a
 * build, which froze the IDE. toolInputChars now caches each completed input's
 * length by object identity, so repeat calls are O(1).
 */

import { describe, expect, it } from 'vitest'

import type { SoundsConfig } from '../components/chat-settings-utilities.js'
import { DEFAULT_SOUNDS_CONFIG } from '../components/chat-settings-utilities.js'
import {
  AUTO_FIX_IDLE,
  autoFixCountdownReducer,
  type AutoFixState,
  estimateStreamTokens,
  estimateTurnTokens,
  streamEventEffects,
  toolInputChars,
} from '../components/chat-stream-utilities.js'

describe('toolInputChars', () => {
  it('counts streamed bytes while the input is still arriving', () => {
    expect(toolInputChars({ streamInputChars: 120 })).toBe(120)
    expect(toolInputChars({})).toBe(0)
  })

  it('returns the serialized length of a completed input', () => {
    const input = { path: 'a.ts', content: 'hello' }
    expect(toolInputChars({ input })).toBe(JSON.stringify(input).length)
  })

  it('caches by object identity (does not re-serialize the same input)', () => {
    const input: { path: string; content: string } = { path: 'a.ts', content: 'x'.repeat(400) }
    const first = toolInputChars({ input })
    // Mutating the same object after the first call must NOT change the result —
    // proving the length was cached, not recomputed (the per-flush O(1) guarantee).
    input.content = 'y'.repeat(9000)
    expect(toolInputChars({ input })).toBe(first)
  })
})

describe('estimateStreamTokens', () => {
  it('estimates ~4 chars/token from text + thinking + tool inputs', () => {
    const msg = {
      content: 'a'.repeat(40), // 40 chars
      blocks: [
        { type: 'thinking', content: 'b'.repeat(40) }, // counts (40)
        { type: 'text', content: 'c'.repeat(1000) }, // text blocks NOT counted here
      ],
      toolCalls: [{ input: { path: 'x.ts', content: 'd'.repeat(16) } }],
    }
    const toolChars = JSON.stringify(msg.toolCalls[0].input).length
    expect(estimateStreamTokens(msg)).toBe(Math.round((40 + 40 + toolChars) / 4))
  })

  it('handles an empty message', () => {
    expect(estimateStreamTokens({})).toBe(0)
  })

  it('counts an in-flight tool call by streamed bytes', () => {
    expect(estimateStreamTokens({ toolCalls: [{ streamInputChars: 400 }] })).toBe(100)
  })
})

describe('estimateTurnTokens', () => {
  const assistant = (content: string): { role: string; content: string } => ({
    role: 'assistant',
    content,
  })

  it('sums every assistant message back to the last user message', () => {
    const messages = [
      assistant('old turn — must NOT be counted'.repeat(10)),
      { role: 'user', content: 'do the thing' },
      assistant('a'.repeat(40)), // 10 tokens
      assistant('b'.repeat(80)), // 20 tokens
    ]
    expect(estimateTurnTokens(messages)).toBe(30)
  })

  it('does not reset or drop during a tool-execution gap (no streaming message)', () => {
    // Mid-turn: a finalized assistant message + a finalized user-invisible gap where
    // the loop is running tools. The count must hold at the finalized total, not 0.
    const beforeGap = [{ role: 'user', content: 'q' }, assistant('a'.repeat(120))] // 30 tokens
    expect(estimateTurnTokens(beforeGap)).toBe(30)
    // The next assistant message has only just started (empty) — total still climbs
    // from the prior message rather than restarting at ~0.
    const newMsgStarted = [...beforeGap, assistant('')]
    expect(estimateTurnTokens(newMsgStarted)).toBe(30)
  })

  it('treats hidden auto-continue user messages as part of the same turn', () => {
    // The verify→fix loop injects HIDDEN user messages; they must not end the turn,
    // so assistant work on both sides of them is summed together.
    const messages = [
      { role: 'user', content: 'real prompt' },
      assistant('a'.repeat(40)), // 10
      { role: 'user', hidden: true, content: '[auto-continue] Fix EVERY error' },
      assistant('b'.repeat(40)), // 10
    ]
    expect(estimateTurnTokens(messages)).toBe(20)
  })

  it('counts thinking blocks and tool inputs across the turn, not just text', () => {
    const messages = [
      { role: 'user', content: 'q' },
      { role: 'assistant', blocks: [{ type: 'thinking', content: 't'.repeat(40) }] }, // 10
      { role: 'assistant', toolCalls: [{ streamInputChars: 400 }] }, // 100
    ]
    expect(estimateTurnTokens(messages)).toBe(110)
  })

  it('with no user-message boundary, sums all assistant messages (empty → 0)', () => {
    expect(estimateTurnTokens([])).toBe(0)
    expect(estimateTurnTokens([assistant('a'.repeat(40))])).toBe(10)
  })
})

/** A sounds config with every event off, so only the event under test can ring. */
const SILENT: SoundsConfig = {
  message: 'off',
  done: 'off',
  error: 'off',
  tool_result: 'off',
  file_diff: 'off',
  commit_suggestion: 'off',
  mode: 'off',
  loop_limit_reached: 'off',
  verification_result: 'off',
  preview_error: 'off',
}

/** The default effect-deciding state: silent, focused, not a pushed frame. */
const STATE = { soundsConfig: SILENT, hasFocus: true, applyingPushed: false }

/** A complete usage sample. */
const USAGE = {
  requestId: 'r1',
  at: '2023-11-14T22:13:21.000Z',
  inputTokens: 5_000,
  contextWindow: 100_000,
}

describe('streamEventEffects', () => {
  it('turns context_usage into one usage effect', () => {
    expect(streamEventEffects({ type: 'context_usage', usage: USAGE }, STATE)).toEqual([
      { type: 'contextUsage', usage: USAGE, done: false },
    ])
  })

  it('turns done with usage into usage + turn-complete, in order', () => {
    expect(streamEventEffects({ type: 'done', usage: USAGE }, STATE)).toEqual([
      { type: 'contextUsage', usage: USAGE, done: true },
      { type: 'turnComplete' },
    ])
  })

  it('ignores a usage sample missing its window or token count', () => {
    expect(streamEventEffects({ type: 'context_usage', usage: { inputTokens: 1 } }, STATE)).toEqual(
      [],
    )
    expect(
      streamEventEffects({ type: 'context_usage', usage: { contextWindow: 100 } }, STATE),
    ).toEqual([])
  })

  it('adds a compaction card only when every field is present', () => {
    expect(
      streamEventEffects(
        {
          type: 'compaction',
          at: '2023-11-14T22:13:23.000Z',
          compactedCount: 10,
          elapsedMs: 3_000,
          beforeChars: 50_000,
          afterChars: 5_000,
        },
        STATE,
      ),
    ).toEqual([
      {
        type: 'compaction',
        compaction: {
          at: '2023-11-14T22:13:23.000Z',
          compactedCount: 10,
          elapsedMs: 3_000,
          beforeChars: 50_000,
          afterChars: 5_000,
        },
      },
    ])
    expect(
      streamEventEffects({ type: 'compaction', at: 'x', compactedCount: 1, elapsedMs: 2 }, STATE),
    ).toEqual([])
  })

  it('turns an activity event into an activity card', () => {
    const effects = streamEventEffects(
      {
        type: 'activity',
        activity: {
          id: 'act-9',
          type: 'email',
          status: 'captured',
          recipient: 'ada@example.test',
          summary: 'Welcome',
          timestamp: '2023-11-14T22:13:22.000Z',
        },
      },
      STATE,
    )
    expect(effects).toEqual([
      {
        type: 'activityCard',
        activity: {
          id: 'act-9',
          type: 'email',
          status: 'captured',
          recipient: 'ada@example.test',
          summary: 'Welcome',
          timestamp: '2023-11-14T22:13:22.000Z',
        },
      },
    ])
  })

  it('ignores an activity event with no payload', () => {
    expect(streamEventEffects({ type: 'activity' }, STATE)).toEqual([])
  })

  it('signals ready_to_build only for the sender', () => {
    expect(streamEventEffects({ type: 'ready_to_build' }, STATE)).toEqual([
      { type: 'readyToBuild' },
    ])
    expect(
      streamEventEffects({ type: 'ready_to_build' }, { ...STATE, applyingPushed: true }),
    ).toEqual([])
  })

  it('forwards every client-action field, and only what the event carries', () => {
    expect(
      streamEventEffects(
        {
          type: 'client_action',
          action: 'preview_ui',
          requestId: 'req-7',
          command: 'fill',
          molId: 'login-email',
          selector: '#email',
          text: 'Email',
          value: 'ada@example.test',
          path: '/login',
        },
        STATE,
      ),
    ).toEqual([
      {
        type: 'clientAction',
        action: {
          action: 'preview_ui',
          path: '/login',
          requestId: 'req-7',
          command: 'fill',
          molId: 'login-email',
          selector: '#email',
          text: 'Email',
          value: 'ada@example.test',
        },
      },
    ])
    expect(
      streamEventEffects({ type: 'client_action', action: 'reload_preview', extra: 1 }, STATE),
    ).toEqual([
      {
        type: 'clientAction',
        action: {
          action: 'reload_preview',
          path: undefined,
          requestId: undefined,
          command: undefined,
          molId: undefined,
          selector: undefined,
          text: undefined,
          value: undefined,
        },
      },
    ])
    expect(streamEventEffects({ type: 'client_action' }, STATE)).toEqual([])
  })

  it('signals turn-complete on error as well as done', () => {
    expect(streamEventEffects({ type: 'error', message: 'boom' }, STATE)).toEqual([
      { type: 'turnComplete' },
    ])
  })

  it("plays the team chime for a teammate's note and stays silent for the sender's echo", () => {
    const config: SoundsConfig = { ...DEFAULT_SOUNDS_CONFIG, message: 'always' }
    expect(
      streamEventEffects(
        { type: 'message' },
        { ...STATE, soundsConfig: config, applyingPushed: true },
      ),
    ).toEqual([{ type: 'playSound', variant: 'team' }])
    expect(
      streamEventEffects(
        { type: 'message' },
        { ...STATE, soundsConfig: config, applyingPushed: false },
      ),
    ).toEqual([])
  })

  it('plays a status sound only when its mode and focus allow it', () => {
    const config: SoundsConfig = { ...DEFAULT_SOUNDS_CONFIG, done: 'whenNotFocused' }
    expect(
      streamEventEffects({ type: 'done' }, { ...STATE, soundsConfig: config, hasFocus: false }),
    ).toEqual([{ type: 'turnComplete' }, { type: 'playSound', variant: 'default' }])
    expect(
      streamEventEffects({ type: 'done' }, { ...STATE, soundsConfig: config, hasFocus: true }),
    ).toEqual([{ type: 'turnComplete' }])
  })

  it('plays nothing for an event type that has no sound', () => {
    const config: SoundsConfig = { ...DEFAULT_SOUNDS_CONFIG, message: 'always' }
    expect(
      streamEventEffects({ type: 'custom', name: 'x' }, { ...STATE, soundsConfig: config }),
    ).toEqual([])
  })
})

/** A pending verification, as a failed event arms it. */
const PENDING = {
  output: 'src/app.ts:4 — error',
  categories: ['type'],
  changedPaths: ['src/app.ts'],
}

/** The state after a failed verification arms the countdown at three seconds. */
const ARMED: AutoFixState = {
  pending: null,
  countdown: { ...PENDING, secondsLeft: 3, paused: false },
}

describe('autoFixCountdownReducer', () => {
  it('starts idle', () => {
    expect(AUTO_FIX_IDLE).toEqual({ pending: null, countdown: null })
  })

  it('records a sender verification error, defaulting the lists', () => {
    expect(
      autoFixCountdownReducer(AUTO_FIX_IDLE, {
        type: 'verificationResult',
        status: 'error',
        output: 'src/app.ts:4 — error',
        applyingPushed: false,
      }),
    ).toEqual({
      pending: { output: 'src/app.ts:4 — error', categories: [], changedPaths: [] },
      countdown: null,
    })
    expect(
      autoFixCountdownReducer(AUTO_FIX_IDLE, {
        type: 'verificationResult',
        status: 'error',
        ...PENDING,
        applyingPushed: false,
      }),
    ).toEqual({ pending: PENDING, countdown: null })
  })

  it("ignores a teammate's pushed error and an error with no output", () => {
    expect(
      autoFixCountdownReducer(AUTO_FIX_IDLE, {
        type: 'verificationResult',
        status: 'error',
        ...PENDING,
        applyingPushed: true,
      }),
    ).toBe(AUTO_FIX_IDLE)
    expect(
      autoFixCountdownReducer(AUTO_FIX_IDLE, {
        type: 'verificationResult',
        status: 'error',
        applyingPushed: false,
      }),
    ).toBe(AUTO_FIX_IDLE)
  })

  it('clears pending errors on a clean verification, pushed or not', () => {
    const state: AutoFixState = { pending: PENDING, countdown: null }
    expect(
      autoFixCountdownReducer(state, {
        type: 'verificationResult',
        status: 'ok',
        applyingPushed: false,
      }),
    ).toEqual({ pending: null, countdown: null })
    expect(
      autoFixCountdownReducer(state, {
        type: 'verificationResult',
        status: 'ok',
        applyingPushed: true,
      }),
    ).toEqual({ pending: null, countdown: null })
  })

  it('arms a three-second countdown when the turn ends with pending errors', () => {
    expect(
      autoFixCountdownReducer({ pending: PENDING, countdown: null }, { type: 'done' }),
    ).toEqual(ARMED)
    expect(autoFixCountdownReducer(AUTO_FIX_IDLE, { type: 'done' })).toBe(AUTO_FIX_IDLE)
  })

  it('ticks down while more than a second is left', () => {
    expect(autoFixCountdownReducer(ARMED, { type: 'tick' })).toEqual({
      pending: null,
      countdown: { ...PENDING, secondsLeft: 2, paused: false },
    })
  })

  it('clears the countdown on the last second (the panel then sends)', () => {
    const last: AutoFixState = {
      pending: null,
      countdown: { ...PENDING, secondsLeft: 1, paused: false },
    }
    expect(autoFixCountdownReducer(last, { type: 'tick' })).toEqual({
      pending: null,
      countdown: null,
    })
  })

  it('ignores ticks when paused or idle', () => {
    const paused: AutoFixState = {
      pending: null,
      countdown: { ...PENDING, secondsLeft: 2, paused: true },
    }
    expect(autoFixCountdownReducer(paused, { type: 'tick' })).toBe(paused)
    expect(autoFixCountdownReducer(AUTO_FIX_IDLE, { type: 'tick' })).toBe(AUTO_FIX_IDLE)
  })

  it('pauses, resumes at three seconds, and cancels', () => {
    expect(autoFixCountdownReducer(ARMED, { type: 'pause' })).toEqual({
      pending: null,
      countdown: { ...PENDING, secondsLeft: 3, paused: true },
    })
    const paused: AutoFixState = {
      pending: null,
      countdown: { ...PENDING, secondsLeft: 3, paused: true },
    }
    expect(autoFixCountdownReducer(paused, { type: 'resume' })).toEqual(ARMED)
    expect(autoFixCountdownReducer(ARMED, { type: 'cancel' })).toEqual({
      pending: null,
      countdown: null,
    })
  })

  it('ignores pause/resume/cancel when idle', () => {
    expect(autoFixCountdownReducer(AUTO_FIX_IDLE, { type: 'pause' })).toBe(AUTO_FIX_IDLE)
    expect(autoFixCountdownReducer(AUTO_FIX_IDLE, { type: 'resume' })).toBe(AUTO_FIX_IDLE)
    expect(autoFixCountdownReducer(AUTO_FIX_IDLE, { type: 'cancel' })).toBe(AUTO_FIX_IDLE)
  })

  it('resets pending errors and the countdown together', () => {
    expect(autoFixCountdownReducer(ARMED, { type: 'reset' })).toEqual(AUTO_FIX_IDLE)
    expect(
      autoFixCountdownReducer({ pending: PENDING, countdown: null }, { type: 'reset' }),
    ).toEqual(AUTO_FIX_IDLE)
  })
})
