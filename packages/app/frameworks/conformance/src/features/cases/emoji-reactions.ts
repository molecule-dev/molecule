/**
 * `@molecule/app-emoji-reactions-react` cases: the reaction chips with their
 * counts and default titles, the add button and its quick-pick popover, and
 * the custom tooltip render prop.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Two ordinary reactions: one plain, one the current user reacted to. */
const reactions = [
  { emoji: '👍', count: 3 },
  { emoji: '❤️', count: 1, reactedByMe: true },
]

/** A reaction list whose first entry is explicitly NOT the current user's. */
const plainReactions = [
  { emoji: '👍', count: 0, reactedByMe: false },
  { emoji: '🎉', count: 12, reactedByMe: true },
]

/** The content `renderTooltip` returns: the chip's own count, interpolated from its reaction. */
const tooltipNodes = [{ tag: 'span', attrs: { 'data-tip': '' }, children: ['who: {0.count}'] }]

/** The second reaction chip's button (each chip is a sibling `<span>` of the wrapper). */
const secondChip = 'div > span:nth-of-type(2) > button'

/** `@molecule/app-emoji-reactions-react`. */
export const emojiReactionsFeature: FeatureCases = {
  package: '@molecule/app-emoji-reactions-react',
  families: [
    {
      component: 'EmojiReactions',
      cases: [
        { name: 'a chip per reaction with its count', props: { reactions } },
        {
          name: 'an explicit reactedByMe false renders aria-pressed false',
          props: { reactions: plainReactions },
        },
        { name: 'an empty reaction list', props: { reactions: [] } },
        { name: 'className on the wrapper', props: { reactions, className: 'parity-token' } },
        {
          name: 'toggling a chip reports its emoji',
          props: { reactions },
          callbacks: ['onToggle'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="emoji-reaction"]' },
            { type: 'click', selector: secondChip },
          ],
        },
        {
          name: 'a chip click without onToggle does nothing',
          props: { reactions },
          interactions: [{ type: 'click', selector: '[data-mol-id="emoji-reaction"]' }],
        },
        {
          name: 'the add button opens the default quick picks',
          props: { reactions },
          callbacks: ['onAdd'],
          interactions: [{ type: 'click', selector: '[data-mol-id="emoji-reaction-add"]' }],
        },
        {
          name: 'picking an emoji calls onAdd and closes the picker',
          props: { reactions },
          callbacks: ['onAdd'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="emoji-reaction-add"]' },
            { type: 'click', selector: '[data-mol-id="emoji-reaction-pick"]' },
          ],
        },
        {
          name: 'clicking add twice closes the picker',
          props: { reactions },
          callbacks: ['onAdd'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="emoji-reaction-add"]' },
            { type: 'click', selector: '[data-mol-id="emoji-reaction-add"]' },
          ],
        },
        {
          name: 'custom quick picks',
          props: { reactions, quickPicks: ['🚀', '🌮'] },
          callbacks: ['onAdd'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="emoji-reaction-add"]' },
            { type: 'click', selector: '[data-mol-id="emoji-reaction-pick"]:nth-of-type(2)' },
          ],
        },
        {
          name: 'quick picks follow a prop change while open',
          props: { reactions: [], quickPicks: ['🚀'] },
          callbacks: ['onAdd'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="emoji-reaction-add"]' },
            { type: 'props', props: { quickPicks: ['🌮'] } },
          ],
        },
        {
          name: 'no add button without onAdd',
          props: { reactions, quickPicks: ['🚀'] },
        },
        {
          name: 'renderTooltip content replaces the default title',
          props: {
            reactions,
            renderTooltip: { $fn: 'renderTooltip', nodes: tooltipNodes },
          },
          interactions: [
            { type: 'mouseenter', selector: '[data-mol-id="emoji-reaction"]' },
            { type: 'mouseleave', selector: '[data-mol-id="emoji-reaction"]' },
            { type: 'focus', selector: secondChip },
            { type: 'blur', selector: secondChip },
          ],
        },
        {
          name: 'reactions change',
          props: { reactions },
          interactions: [
            { type: 'props', props: { reactions: [{ emoji: '🎉', count: 9, reactedByMe: true }] } },
          ],
        },
        {
          name: 'titles and the add label follow a locale switch',
          props: { reactions },
          callbacks: ['onAdd'],
          context: {
            translations: {
              'en-XA': {
                reactions: { count: '{{count}} réactions', add: 'Ajouter une réaction' },
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
  ],
}
