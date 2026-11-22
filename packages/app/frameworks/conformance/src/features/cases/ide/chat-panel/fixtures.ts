/**
 * What every `ChatPanel` case starts from: the clock, the selectors, the model catalog, the
 * requests a mount makes, the stream events a case plays and one helper per kind of step.
 *
 * Every case fakes timers at {@link NOW}: text and tool events reach the chat store through a
 * 50 ms flush, and mounting starts a 45 s git-status interval and a 1.5 s skills-seed retry.
 *
 * @module
 */

import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase, FeatureCaseContext } from '../../../spec.js'

/** The case clock (2023-11-14T22:13:20.000Z). */
export const NOW = 1_700_000_000_000

/** The composer. */
export const TA = 'textarea[data-mol-chat-input]'
/** The send button. */
export const SEND = '[data-mol-id="chat-send-button"]'
/** The stop button (while a turn streams). */
export const STOP = '[data-mol-id="chat-stop-button"]'
/** The message log. */
export const LOG = '[role="log"]'
/** The conversation header's history toggle. */
export const HDR_TOGGLE = '[data-mol-id="chat-conversation-toggle"]'
/** The header's new-conversation button. */
export const NEW_CHAT = '[data-mol-id="chat-new-conversation"]'
/** The history dropdown's search box. */
export const CONV_SEARCH = 'input[placeholder="Search conversations…"]'

/**
 * One conversation row in the history dropdown.
 *
 * @param id - The conversation id.
 * @returns Its selector.
 */
export const CONV_ROW = (id: string): string => `[data-mol-id="chat-conversation-${id}"]`

/**
 * A model catalog entry with every required field (`@molecule/app-ai-models`).
 *
 * @param id - The model id.
 * @param provider - Its provider.
 * @param label - Its display name (also its description).
 * @param extra - Fields that differ from the defaults.
 * @returns The model definition.
 */
export const model = (
  id: string,
  provider: string,
  label: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  provider,
  label,
  description: label,
  contextWindow: 200_000,
  maxOutputTokens: 8_192,
  supportsThinking: false,
  thinkingBudgetTokens: 0,
  thinkingConfigurable: false,
  supportsVision: false,
  supportsPromptCaching: false,
  supportsTools: true,
  inputPricePerMTok: 1,
  outputPricePerMTok: 2,
  cacheReadPricePerMTok: 0.1,
  cacheWritePricePerMTok: 1.25,
  knowledgeCutoff: '2025-01-01',
  ...extra,
})

/** A free model with effort levels and two regions. */
export const M_FREE = model('m-free', 'deepseek', 'M Free', {
  freeTier: true,
  supportedEffortLevels: ['low', 'medium', 'high'],
  defaultEffortLevel: 'medium',
  regions: ['us', 'cn'],
})
/** A paid model. */
export const M_PRO = model('m-pro', 'anthropic', 'M Pro')
/** The catalog `GET /ai/models` answers. */
export const MODELS = {
  models: [M_FREE, M_PRO],
  defaults: { plan: 'm-free', execute: 'm-free', commit: 'm-free', compact: 'm-free' },
}

/**
 * A `message_start` event: every content event needs one first (the session drops content that
 * arrives with no message open).
 *
 * @param id - The assistant message id.
 * @returns The event.
 */
export const START = (id = 'a1'): Record<string, unknown> => ({
  type: 'message_start',
  id,
  timestamp: NOW + 1,
})

/**
 * A text event.
 *
 * @param content - The text.
 * @returns The event.
 */
export const TEXT = (content: string): Record<string, unknown> => ({ type: 'text', content })

/**
 * A tool call event.
 *
 * @param id - The tool call id.
 * @param name - The tool.
 * @param input - Its input.
 * @returns The event.
 */
export const TOOL = (id: string, name: string, input: unknown): Record<string, unknown> => ({
  type: 'tool_use',
  id,
  name,
  input,
})

/**
 * A file diff event.
 *
 * @param path - The file.
 * @param oldContent - Its content before.
 * @param newContent - Its content after.
 * @returns The event.
 */
export const DIFF = (
  path: string,
  oldContent: string,
  newContent: string,
): Record<string, unknown> => ({
  type: 'file_diff',
  path,
  oldContent,
  newContent,
})

/** The event that ends a turn. */
export const DONE = { type: 'done' }

/** A team side-channel command, as a host registers one. */
export const TEAM_COMMAND = {
  id: 'teamsay',
  label: '/teamsay',
  description: 'Send a team note',
  category: 'collaborate',
  aliases: ['t'],
  sideChannel: true,
  viewerSafe: true,
}

/** The host callbacks every case records (`onConversationId` is left out: it turns the panel's own conversation persistence off). */
export const CALLBACKS = [
  'onFileOpen',
  'onFileChange',
  'onCommit',
  'onTurnComplete',
  'onReadyToBuild',
  'onClientAction',
  'onInitialMessageSent',
]

/**
 * The five requests a mount makes, with empty answers. A case that needs a different answer
 * passes its own entry for that request (see {@link base}).
 */
export const BASE_HTTP: readonly HttpScript[] = [
  { method: 'GET', url: '/ai/models?projectId=p1', data: MODELS },
  { method: 'GET', url: '/projects/p1', data: { settings: {} } },
  { method: 'GET', url: '/projects/p1/git-status', data: { files: [] } },
  { method: 'GET', url: '/projects/p1/files-list', data: { files: [] } },
  { method: 'GET', url: '/projects/p1/conversations', data: { conversations: [] } },
]

/** What a case adds to or replaces in {@link base}. */
export interface BaseExtra {
  /** Props over `{ projectId: 'p1' }`. */
  props?: Record<string, unknown>
  /** Context fields over the base context (`areas.chat` is merged, not replaced). */
  context?: FeatureCaseContext
  /**
   * Requests scripted before the base ones. Matching takes the first unused entry with the same
   * method and URL, so an entry here answers before the base entry for that URL, and a request
   * made more often than it is scripted gets a 404.
   */
  http?: HttpScript[]
  /** Base requests to leave out, by URL (a case that answers them itself, or makes them fail). */
  withoutHttp?: string[]
}

/**
 * A `ChatPanel` case over the shared baseline: fake timers at {@link NOW}, project `p1`, the
 * recorded host callbacks, an empty chat seed and the five mount requests.
 *
 * @param name - The case name.
 * @param interactions - Its steps.
 * @param extra - What this case adds or replaces.
 * @returns The case.
 */
export function base(
  name: string,
  interactions: Interaction[] = [],
  extra: BaseExtra = {},
): FeatureCase {
  const { props, context = {}, http = [], withoutHttp = [] } = extra
  const { areas = {}, ...restContext } = context
  return {
    name,
    fakeTimers: true,
    now: NOW,
    props: { projectId: 'p1', ...props },
    callbacks: CALLBACKS,
    context: {
      ...restContext,
      areas: { ...areas, chat: { ...areas.chat } },
      http: [...http, ...BASE_HTTP.filter((entry) => !withoutHttp.includes(entry.url))],
    },
    ...(interactions.length ? { interactions } : {}),
  }
}

/**
 * The requests a saved conversation adds to a mount (`mol-chat-conv:p1` in localStorage): its
 * context restore, and its activity cards read and written back.
 *
 * @param id - The conversation id.
 * @returns The scripted requests.
 */
export const CONV_HTTP = (id: string): HttpScript[] => [
  { method: 'GET', url: `/projects/p1/chat?conversationId=${id}`, data: {} },
  {
    method: 'GET',
    url: `/projects/p1/conversations/${id}/activity-cards`,
    data: { activityCards: [] },
  },
  {
    method: 'PUT',
    url: `/projects/p1/conversations/${id}/activity-cards`,
    data: { activityCards: [] },
  },
]

/**
 * Types into the composer.
 *
 * @param value - The composer's new value.
 * @returns The step.
 */
export const type = (value: string): Interaction => ({ type: 'input', selector: TA, value })

/**
 * Presses a key in the composer.
 *
 * @param key - The key.
 * @param modifiers - Held modifiers.
 * @returns The step.
 */
export const key = (
  key: string,
  modifiers: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean } = {},
): Interaction => ({ type: 'keydown', selector: TA, key, ...modifiers })

/**
 * Clicks an element.
 *
 * @param selector - The element.
 * @returns The step.
 */
export const click = (selector: string): Interaction => ({ type: 'click', selector })

/**
 * Presses the pointer down on an element (also fires `mousedown`).
 *
 * @param selector - The element.
 * @returns The step.
 */
export const down = (selector: string): Interaction => ({ type: 'pointerdown', selector })

/**
 * Plays a stream event on the main turn.
 *
 * @param event - The event.
 * @returns The step.
 */
export const emit = (event: unknown): Interaction => ({
  type: 'control',
  name: 'chat.emit',
  args: [event],
})

/** Ends the main turn's stream. */
export const finish: Interaction = { type: 'control', name: 'chat.finish' }

/**
 * Fails the main turn's stream.
 *
 * @param message - The error message.
 * @returns The step.
 */
export const fail = (message: string): Interaction => ({
  type: 'control',
  name: 'chat.fail',
  args: [message],
})

/**
 * Plays a stream event on the side channel.
 *
 * @param event - The event.
 * @returns The step.
 */
export const sideEmit = (event: unknown): Interaction => ({
  type: 'control',
  name: 'chat.sideEmit',
  args: [event],
})

/** Ends the side channel's stream. */
export const sideFinish: Interaction = { type: 'control', name: 'chat.sideFinish' }

/** Accepts the oldest queued message on the server. */
export const queueAccept: Interaction = { type: 'control', name: 'chat.queueAccept' }

/**
 * Advances the fake clock.
 *
 * @param ms - Milliseconds.
 * @returns The step.
 */
export const adv = (ms: number): Interaction => ({ type: 'advance', ms })

/**
 * How often a streaming message re-parses its markdown (`MarkdownContent`'s throttle): text
 * that arrives within this long of the last parse shows once it elapses, so advance by it
 * after the 50 ms flush to see a later frame of a message that is still streaming.
 */
export const MARKDOWN_THROTTLE_MS = 120

/**
 * Sets whether the server has a live turn, for this and every later history load. A turn
 * driven by pushed frames needs it: the panel confirms a pushed turn by loading history and
 * reading the flag, and a `false` there ends the remote turn, so later frames are not shown.
 * Set it `true` before the first pushed frame and `false` after the turn's `done`.
 *
 * @param live - Whether a turn is running on the server.
 * @returns The step.
 */
export const serverStreaming = (live: boolean): Interaction => ({
  type: 'control',
  name: 'chat.serverStreaming',
  args: [live],
})

/**
 * Changes props (merged over the current ones).
 *
 * @param props - The changed props.
 * @returns The step.
 */
export const props = (props: Record<string, unknown>): Interaction => ({ type: 'props', props })
