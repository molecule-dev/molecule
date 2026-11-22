/**
 * `MessageItem` cases: one row of the chat timeline.
 *
 * The three user-facing row kinds keep their documented looks — a real user
 * message (the signed-in user's avatar, the blue accent ring, the Slack-style
 * header), an auto-sent message (the green agent-sent card, no header), and a
 * human-only team note (the gold border and badge) — plus the dictated-message
 * mic badge, the author's clickable name and avatar opening their profile, an
 * author whose account is gone keeping the name without a profile, the
 * attachments row, and the discovery spacing.
 *
 * The assistant reply renders its stored block order: a thinking block, text
 * (including the context-compaction notice), a verification badge, a
 * resource-limit banner and a tool-call card; then the calls of a message with
 * no blocks, the orphan pending `ask_user` card, the "Response stopped" note and
 * the loop-limit card's three choices (`Change model`, `Increase max loops`,
 * `Continue`) with the first disabled while a turn runs.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

import type { FeatureComponentCases } from '../../spec.js'

/** The case clock (2023-11-14T22:13:20.000Z), for the timestamps the header shows. */
const NOW = 1_700_000_000_000

/** The loop-limit card's three choice buttons, in their rendered order. */
const CHANGE_MODEL = 'button:nth-of-type(1)'
const INCREASE_LOOPS = 'button:nth-of-type(2)'
const CONTINUE = 'button:nth-of-type(3)'

/** The callbacks `MessageItem` renders with, none of them clicked unless a case does. */
const CALLBACKS = [
  'sendMessage',
  'handleAskUserResponse',
  'handleUndoToggle',
  'handleFileRevert',
  'setInputAndCursorEnd',
  'setModelPicker',
  'onNavigatePreview',
  'onFileOpen',
  'onFileDoubleClick',
  'onFileDiff',
  'onProfileClick',
  'onSkipToolCall',
]

/** The non-callback props every case starts from. */
const BASE = {
  isLoading: false,
  streamingStatus: null,
  undoneTcIds: new Set<string>(),
  chatMode: 'plan' as const,
}

/**
 * One message.
 *
 * @param overrides - Fields over a plain assistant message.
 * @returns The message.
 */
const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1',
  role: 'assistant',
  content: '',
  timestamp: NOW,
  ...overrides,
})

/** `MessageItem`. */
export const messageItemCases: FeatureComponentCases = {
  component: 'MessageItem',
  cases: [
    // ── The user row ────────────────────────────────────────────────────────
    {
      name: 'a user message renders its body under the author name',
      props: { ...BASE, msg: message({ role: 'user', content: 'Please fix the header.' }) },
      callbacks: CALLBACKS,
    },
    {
      name: 'a teammate message shows the author name and avatar initial',
      props: {
        ...BASE,
        msg: message({
          role: 'user',
          content: 'I pushed the fix.',
          author: { id: 'u2', name: 'Ada', avatar: null },
        }),
        showTimestamp: true,
      },
      callbacks: CALLBACKS,
      now: NOW,
    },
    {
      name: 'an author-less message belongs to the signed-in user',
      props: {
        ...BASE,
        msg: message({ role: 'user', content: 'My own note.' }),
        currentUserId: 'me',
        userAvatar: null,
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'an author whose account is gone keeps the name without a profile click',
      props: {
        ...BASE,
        msg: message({ role: 'user', content: 'Old note.', author: { name: 'Deleted user' } }),
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'an automatic message is an agent-sent card with no header',
      props: {
        ...BASE,
        msg: message({ role: 'user', content: 'Fixing the failing test.', automatic: true }),
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'a team note carries the gold team-only badge',
      props: {
        ...BASE,
        msg: message({
          role: 'system',
          content: 'Heads up: I am taking the deploy.',
          teamOnly: true,
          author: { id: 'u2', name: 'Ada' },
        }),
        agentName: 'Synthase',
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'a dictated message carries the mic badge',
      props: {
        ...BASE,
        msg: message({ role: 'user', content: 'Add a footer.', viaDictation: true }),
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'the light theme renders the dictated badge in its own red',
      props: {
        ...BASE,
        msg: message({ role: 'user', content: 'Add a footer.', viaDictation: true }),
      },
      callbacks: CALLBACKS,
      context: { theme: 'light' },
    },
    {
      name: 'attachments list each file with its kind glyph and size',
      props: {
        ...BASE,
        msg: message({
          role: 'user',
          content: 'See the files.',
          attachments: [
            { filename: 'shot.png', mediaType: 'image/png', size: 2048 },
            { filename: 'note.mp3', mediaType: 'audio/mpeg', size: 4096 },
            { filename: 'clip.mp4', mediaType: 'video/mp4', size: 8192 },
            { filename: 'spec.pdf', mediaType: 'application/pdf', size: 1024 },
          ],
        }),
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'discovery spacing gives the row its roomier bottom margin',
      props: {
        ...BASE,
        msg: message({ role: 'user', content: 'A discovery question.' }),
        discovery: true,
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'clicking the author name opens the author’s profile',
      props: {
        ...BASE,
        msg: message({
          role: 'user',
          content: 'I pushed the fix.',
          author: { id: 'u2', name: 'Ada' },
        }),
      },
      callbacks: CALLBACKS,
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-user-name-button"]' }],
    },
    {
      name: 'clicking the avatar opens the author’s profile',
      props: {
        ...BASE,
        msg: message({
          role: 'user',
          content: 'I pushed the fix.',
          author: { id: 'u2', name: 'Ada' },
        }),
      },
      callbacks: CALLBACKS,
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-user-avatar-button"]' }],
    },

    // ── The assistant reply ─────────────────────────────────────────────────
    {
      name: 'a plain reply renders its content as markdown',
      props: { ...BASE, msg: message({ content: '## Done\n\nI updated the header.' }) },
      callbacks: CALLBACKS,
    },
    {
      name: 'an empty reply renders an empty row',
      props: { ...BASE, msg: message() },
      callbacks: CALLBACKS,
    },
    {
      name: 'a reply renders its thinking, text and verification blocks in order',
      props: {
        ...BASE,
        msg: message({
          blocks: [
            { type: 'thinking', content: 'Check the header first.' },
            { type: 'text', content: 'The header is fixed.' },
            { type: 'verification', status: 'ok', workspaces: ['@molecule/app-app'] },
          ],
        }),
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'a streaming thinking block auto-expands as the reply’s last block',
      props: {
        ...BASE,
        msg: message({
          isStreaming: true,
          blocks: [
            { type: 'text', content: 'Looking into it.' },
            { type: 'thinking', content: 'Reading the file.' },
          ],
        }),
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'a resource-limit block renders the host’s upgrade call to action',
      props: {
        ...BASE,
        msg: message({
          blocks: [{ type: 'resource_limit', resource: 'memory', message: 'Out of memory.' }],
        }),
        buildUpgradeCta: {
          $fn: 'buildUpgradeCta',
          returns: [{ label: 'Upgrade', href: '/pricing' }],
        },
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'a tool-call block renders its tool card',
      props: {
        ...BASE,
        msg: message({
          blocks: [{ type: 'tool_call', id: 't1' }],
          toolCalls: [
            { id: 't1', name: 'bash', input: { command: 'ls' }, output: 'a.ts', status: 'done' },
          ],
        }),
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'a reply with tool calls but no blocks lists every call',
      props: {
        ...BASE,
        msg: message({
          toolCalls: [
            { id: 't1', name: 'bash', input: { command: 'ls' }, output: 'a.ts', status: 'done' },
            { id: 't2', name: 'bash', input: { command: 'pwd' }, output: '/app', status: 'error' },
          ],
        }),
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'an orphan pending ask_user still renders a card for it',
      props: {
        ...BASE,
        msg: message({
          content: 'Waiting on you.',
          blocks: [{ type: 'text', content: 'Waiting on you.' }],
          toolCalls: [
            {
              id: 'q1',
              name: 'ask_user',
              input: { question: 'Which route should the login link use?' },
              output: { status: 'awaiting_response' },
              status: 'done',
            },
          ],
        }),
      },
      callbacks: CALLBACKS,
    },
    {
      name: 'a compaction notice splits its headline and summary',
      props: {
        ...BASE,
        msg: message({
          blocks: [
            { type: 'text', content: '**Context compacted**\n\nEarlier work is summarised here.' },
          ],
        }),
      },
      callbacks: CALLBACKS,
      interactions: [
        { type: 'mouseenter', selector: 'summary' },
        { type: 'mouseleave', selector: 'summary' },
      ],
    },
    {
      name: 'an aborted reply says the response stopped',
      props: { ...BASE, msg: message({ content: 'Partial answer', aborted: true }) },
      callbacks: CALLBACKS,
    },

    // ── The loop-limit card ─────────────────────────────────────────────────
    {
      name: 'the loop-limit card’s Change model action pre-fills the composer',
      props: {
        ...BASE,
        msg: message({ toolCalls: [], content: 'Stopped.', loopLimitReached: 12 }),
      },
      callbacks: CALLBACKS,
      interactions: [{ type: 'click', selector: CHANGE_MODEL }],
    },
    {
      name: 'the loop-limit card’s Increase max loops action pre-fills the command',
      props: {
        ...BASE,
        msg: message({ content: 'Stopped.', loopLimitReached: 12 }),
      },
      callbacks: CALLBACKS,
      interactions: [{ type: 'click', selector: INCREASE_LOOPS }],
    },
    {
      name: 'the loop-limit card’s Continue action sends the continue prompt',
      props: {
        ...BASE,
        msg: message({ content: 'Stopped.', loopLimitReached: 12 }),
      },
      callbacks: CALLBACKS,
      interactions: [{ type: 'click', selector: CONTINUE }],
    },
    {
      name: 'a running turn disables the Change model action',
      props: {
        ...BASE,
        isLoading: true,
        msg: message({ content: 'Stopped.', loopLimitReached: 12 }),
      },
      callbacks: CALLBACKS,
      interactions: [{ type: 'click', selector: CHANGE_MODEL }],
    },
    {
      name: 'the loop-limit card’s choices tint on hover and clear on leave',
      props: {
        ...BASE,
        msg: message({ content: 'Stopped.', loopLimitReached: 12 }),
      },
      callbacks: CALLBACKS,
      interactions: [
        { type: 'mouseenter', selector: CONTINUE },
        { type: 'mouseleave', selector: CONTINUE },
      ],
    },
    {
      name: 'the light theme tints a loop-limit choice in its own grey',
      props: {
        ...BASE,
        msg: message({ content: 'Stopped.', loopLimitReached: 12 }),
      },
      context: { theme: 'light' },
      callbacks: CALLBACKS,
      interactions: [{ type: 'mouseenter', selector: CHANGE_MODEL }],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-labels the user header and the loop-limit card',
      props: {
        ...BASE,
        msg: message({ content: 'Stopped.', loopLimitReached: 12 }),
      },
      callbacks: CALLBACKS,
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                you: 'Vous',
                responseStopped: 'Réponse arrêtée',
                loopLimitReached: 'Limite de {{max}} itérations atteinte.',
                changeModel: 'Changer de modèle',
                increaseLoops: 'Augmenter le maximum',
                continueButton: 'Continuer',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
