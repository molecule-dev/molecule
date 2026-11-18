/**
 * `@molecule/app-chatbot-tester-react` cases: the composed tester (bot picker,
 * transcript, composer, error region), the composer row on its own, and the
 * scrollable transcript pane. Covers every prop and branch of the three
 * components — the bot picker's 2+ rule, the empty-state / loading /
 * error regions, user vs assistant bubbles and their timestamps, the
 * Enter / Shift+Enter / send-button paths, the bot-picker change, prop
 * changes and every passthrough.
 *
 * All three components are stateless about transport, and their own labels
 * (picker label, composer placeholder, send label) come through `t()` with
 * `chatbotTester.*` keys, so no case needs `composition: 'app'`, i18n keys or
 * a router route — the derived locale-switch case brackets them.
 * `ChatbotTester` owns its composer text as internal state; `ChatbotTesterInput`
 * is controlled by `value`, so typing into it reports the text and then keeps
 * the prop value (React's controlled-input restore).
 *
 * @module
 */

import type { FeatureCases, FeatureComponentCases } from '../spec.js'

/** Two bots, the second with a display name and the first without. */
const twoBots = [{ id: 'b1' }, { id: 'b2', name: 'Second bot' }]

/** Three bots, so a selected middle bot is unambiguous. */
const threeBots = [
  { id: 'b1', name: 'First' },
  { id: 'b2', name: 'Second' },
  { id: 'b3', name: 'Third' },
]

/** The bot picker's select, selected by its id. */
const botSelect = '#chatbot-tester-bot-select'
/** The composer's send button, selected by its `data-mol-id`. */
const sendButton = 'button[data-mol-id="chatbot-tester-send"]'
/** The composer's textarea. */
const composer = 'textarea'

/** A node-valued empty state, passed as a slot. */
const emptyStateNodes = [
  { tag: 'p', attrs: { 'data-empty': '' }, children: ['Start a conversation'] },
]
/** A node-valued error, passed as a slot. */
const errorNodes = [{ tag: 'strong', attrs: { 'data-error': '' }, children: ['Boom'] }]
/** A node-valued bot-picker label, passed as a slot. */
const botLabelNodes = [{ tag: 'em', attrs: { 'data-bot-label': '' }, children: ['Pick one'] }]

/** A user message with a timestamp and an assistant message without one. */
const twoMessages = [
  { id: 'm1', role: 'assistant', content: 'Hi there' },
  { id: 'm2', role: 'user', content: 'Hello', timestamp: '10:00' },
]

/** The composed tester. */
const testerCases: FeatureComponentCases = {
  component: 'ChatbotTester',
  cases: [
    // The family's first case also derives the locale-switch case.
    {
      name: 'empty transcript with the default composer',
      props: { messages: [] },
      callbacks: ['onSend'],
    },
    {
      name: 'assistant and user messages, with and without a timestamp',
      props: { messages: twoMessages },
      callbacks: ['onSend'],
    },
    {
      name: 'a system message renders as a bot bubble',
      props: { messages: [{ id: 3, role: 'system', content: 'System note', timestamp: '09:00' }] },
      callbacks: ['onSend'],
    },
    {
      name: 'typing enables send and Enter sends the trimmed text',
      props: { messages: [] },
      callbacks: ['onSend'],
      interactions: [
        { type: 'input', selector: composer, value: '  Hello  ' },
        { type: 'keydown', selector: composer, key: 'Enter' },
      ],
    },
    {
      name: 'Shift+Enter does not send',
      props: { messages: [] },
      callbacks: ['onSend'],
      interactions: [
        { type: 'input', selector: composer, value: 'line one' },
        { type: 'keydown', selector: composer, key: 'Enter', shiftKey: true },
        { type: 'keydown', selector: composer, key: 'a' },
      ],
    },
    {
      name: 'Enter with only whitespace sends nothing',
      props: { messages: [] },
      callbacks: ['onSend'],
      interactions: [
        { type: 'input', selector: composer, value: '   ' },
        { type: 'keydown', selector: composer, key: 'Enter' },
      ],
    },
    {
      name: 'clicking send sends and clears the composer',
      props: { messages: [] },
      callbacks: ['onSend'],
      interactions: [
        { type: 'input', selector: composer, value: 'Hey' },
        { type: 'click', selector: sendButton },
        { type: 'input', selector: composer, value: 'Again' },
        { type: 'click', selector: sendButton },
      ],
    },
    {
      name: 'loading disables the composer and shows the typing indicator',
      props: { messages: [], loading: true },
      callbacks: ['onSend'],
    },
    {
      name: 'loading suppresses the empty state and keeps the transcript',
      props: { messages: [twoMessages[0]], loading: true },
      callbacks: ['onSend'],
      slots: { emptyState: emptyStateNodes },
    },
    {
      name: 'empty state as a slot',
      props: { messages: [] },
      callbacks: ['onSend'],
      slots: { emptyState: emptyStateNodes },
    },
    {
      name: 'empty state as a node prop',
      props: { messages: [], emptyState: { $nodes: emptyStateNodes } },
      callbacks: ['onSend'],
    },
    {
      name: 'empty state as a plain string',
      props: { messages: [], emptyState: 'No messages yet' },
      callbacks: ['onSend'],
    },
    {
      name: 'empty state is ignored when messages exist',
      props: { messages: twoMessages },
      callbacks: ['onSend'],
      slots: { emptyState: emptyStateNodes },
    },
    {
      name: 'error renders an alert paragraph',
      props: { messages: [], error: 'Network failed' },
      callbacks: ['onSend'],
    },
    {
      name: 'error as a node prop',
      props: { messages: [], error: { $nodes: errorNodes } },
      callbacks: ['onSend'],
    },
    {
      name: 'error as a slot',
      props: { messages: [] },
      callbacks: ['onSend'],
      slots: { error: errorNodes },
    },
    {
      name: 'no alert when error is null',
      props: { messages: [], error: null },
      callbacks: ['onSend'],
    },
    {
      name: 'bot picker with two bots',
      props: { messages: [], bots: twoBots },
      callbacks: ['onSend', 'onBotChange'],
    },
    {
      name: 'bot picker hides a single bot',
      props: { messages: [], bots: [{ id: 'b1' }] },
      callbacks: ['onSend'],
    },
    {
      name: 'bot picker hides an empty bot list',
      props: { messages: [], bots: [] },
      callbacks: ['onSend'],
    },
    {
      name: 'bot picker selects the fixed botId',
      props: { messages: [], bots: threeBots, botId: 'b2' },
      callbacks: ['onSend', 'onBotChange'],
    },
    {
      name: 'bot picker falls back to the first bot for an unmatched botId',
      props: { messages: [], bots: twoBots, botId: 'missing' },
      callbacks: ['onSend', 'onBotChange'],
    },
    {
      name: 'bot picker with a custom label',
      props: { messages: [], bots: twoBots, botPickerLabel: 'Choose a bot' },
      callbacks: ['onSend'],
    },
    {
      name: 'bot picker label as a node prop',
      props: { messages: [], bots: twoBots, botPickerLabel: { $nodes: botLabelNodes } },
      callbacks: ['onSend'],
    },
    {
      name: 'bot picker label as a slot',
      props: { messages: [], bots: twoBots },
      callbacks: ['onSend'],
      slots: { botPickerLabel: botLabelNodes },
    },
    {
      name: 'changing the bot calls onBotChange and keeps the controlled value',
      props: { messages: [], bots: threeBots, botId: 'b1' },
      callbacks: ['onSend', 'onBotChange'],
      interactions: [{ type: 'input', selector: botSelect, value: 'b3' }],
    },
    {
      name: 'changing the bot without a controlled value keeps the first bot',
      props: { messages: [], bots: threeBots },
      callbacks: ['onSend', 'onBotChange'],
      interactions: [{ type: 'input', selector: botSelect, value: 'b2' }],
    },
    {
      name: 'className is forwarded',
      props: { messages: [], className: 'parity-token' },
      callbacks: ['onSend'],
    },
    {
      name: 'custom composer placeholder and send label',
      props: { messages: [], inputPlaceholder: 'Ask anything', sendLabel: 'Go' },
      callbacks: ['onSend'],
    },
    {
      name: 'every prop at once',
      props: {
        messages: twoMessages,
        bots: twoBots,
        botId: 'b2',
        error: 'Careful',
        emptyState: 'Unused empty state',
        botPickerLabel: 'Bot',
        inputPlaceholder: 'Ask',
        sendLabel: 'Send it',
        className: 'parity-token',
      },
      callbacks: ['onSend', 'onBotChange'],
    },
    {
      name: 'props change after mount',
      props: { messages: [], className: 'first-token' },
      callbacks: ['onSend', 'onBotChange'],
      interactions: [
        { type: 'props', props: { loading: true, error: 'Late failure' } },
        {
          type: 'props',
          props: { bots: twoBots, botId: 'b2', loading: false, error: null },
        },
        { type: 'props', props: { bots: [{ id: 'b1' }], className: 'second-token' } },
      ],
    },
    {
      name: 'composer text survives a props change',
      props: { messages: [] },
      callbacks: ['onSend'],
      interactions: [
        { type: 'input', selector: composer, value: 'draft' },
        { type: 'props', props: { loading: false, error: null } },
      ],
    },
  ],
}

/** The composer row on its own. */
const inputCases: FeatureComponentCases = {
  component: 'ChatbotTesterInput',
  cases: [
    {
      name: 'empty value with the default placeholder and label',
      props: { value: '' },
      callbacks: ['onChange', 'onSend'],
    },
    {
      name: 'a value enables send',
      props: { value: 'Hello' },
      callbacks: ['onChange', 'onSend'],
    },
    {
      name: 'a whitespace-only value keeps send disabled',
      props: { value: '   ' },
      callbacks: ['onChange', 'onSend'],
    },
    {
      name: 'loading disables the field and the button',
      props: { value: 'Hello', loading: true },
      callbacks: ['onChange', 'onSend'],
    },
    {
      name: 'loading with an empty value',
      props: { value: '', loading: true },
      callbacks: ['onChange', 'onSend'],
    },
    {
      name: 'custom placeholder and send label',
      props: { value: 'x', placeholder: 'Ask anything', sendLabel: 'Go' },
      callbacks: ['onChange', 'onSend'],
    },
    {
      name: 'typing reports the text and restores the controlled value',
      props: { value: '' },
      callbacks: ['onChange', 'onSend'],
      interactions: [{ type: 'input', selector: composer, value: 'Hey there' }],
    },
    {
      name: 'typing over an existing value reports the new text',
      props: { value: 'old' },
      callbacks: ['onChange', 'onSend'],
      interactions: [{ type: 'input', selector: composer, value: 'new text' }],
    },
    {
      name: 'clicking send calls onSend with the event',
      props: { value: 'Hello' },
      callbacks: ['onChange', 'onSend'],
      interactions: [{ type: 'click', selector: sendButton }],
    },
    {
      name: 'Enter sends without an argument',
      props: { value: 'Hello' },
      callbacks: ['onChange', 'onSend'],
      interactions: [{ type: 'keydown', selector: composer, key: 'Enter' }],
    },
    {
      name: 'Shift+Enter does not send',
      props: { value: 'Hello' },
      callbacks: ['onChange', 'onSend'],
      interactions: [{ type: 'keydown', selector: composer, key: 'Enter', shiftKey: true }],
    },
    {
      name: 'another key does not send',
      props: { value: 'Hello' },
      callbacks: ['onChange', 'onSend'],
      interactions: [{ type: 'keydown', selector: composer, key: 'a' }],
    },
    {
      name: 'the value follows prop changes',
      props: { value: '' },
      callbacks: ['onChange', 'onSend'],
      interactions: [
        { type: 'props', props: { value: 'growing' } },
        { type: 'props', props: { value: '' } },
      ],
    },
    {
      name: 'placeholder, label and loading change through props',
      props: { value: 'x', placeholder: 'First', sendLabel: 'One' },
      callbacks: ['onChange', 'onSend'],
      interactions: [
        { type: 'props', props: { placeholder: 'Second', sendLabel: 'Two', loading: true } },
        { type: 'props', props: { loading: false } },
      ],
    },
  ],
}

/** The transcript pane on its own. */
const messagesCases: FeatureComponentCases = {
  component: 'ChatbotTesterMessages',
  cases: [
    { name: 'empty transcript with no empty state', props: { messages: [] } },
    { name: 'assistant and user bubbles', props: { messages: twoMessages } },
    {
      name: 'timestamps on both bubble sides',
      props: {
        messages: [
          { id: 'a', role: 'assistant', content: 'Bot', timestamp: '10:00' },
          { id: 'u', role: 'user', content: 'Me', timestamp: '10:01' },
        ],
      },
    },
    { name: 'a system message renders as a bot bubble', props: { messages: [twoMessages[0]] } },
    {
      name: 'loading appends the typing indicator',
      props: { messages: twoMessages, loading: true },
    },
    { name: 'loading with no messages', props: { messages: [], loading: true } },
    {
      name: 'empty state as a slot',
      props: { messages: [] },
      slots: { emptyState: emptyStateNodes },
    },
    {
      name: 'empty state as a node prop',
      props: { messages: [], emptyState: { $nodes: emptyStateNodes } },
    },
    { name: 'empty state as a plain string', props: { messages: [], emptyState: 'Nothing yet' } },
    {
      name: 'empty state is ignored when messages exist',
      props: { messages: twoMessages },
      slots: { emptyState: emptyStateNodes },
    },
    {
      name: 'empty state is ignored while loading',
      props: { messages: [], loading: true },
      slots: { emptyState: emptyStateNodes },
    },
    {
      name: 'messages change through props',
      props: { messages: [] },
      interactions: [
        { type: 'props', props: { messages: twoMessages } },
        { type: 'props', props: { messages: [] } },
        { type: 'props', props: { loading: true } },
      ],
    },
    {
      name: 'message content is rendered as text',
      props: { messages: [{ id: 'x', role: 'user', content: '<b>not bold</b> & more' }] },
    },
  ],
}

/** `@molecule/app-chatbot-tester-react`. */
export const chatbotTesterFeature: FeatureCases = {
  package: '@molecule/app-chatbot-tester-react',
  families: [testerCases, inputCases, messagesCases],
}
