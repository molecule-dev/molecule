/**
 * `ThinkingBlock` cases: the collapsible AI reasoning block above a reply. The
 * block is PRESENTATIONAL — the content arrives already gathered — and its open
 * state is the one piece of state it owns: it auto-expands while the turn
 * streams, and once the turn ends the reader's own toggle takes over.
 *
 * The cases cover the streaming label and the auto-expanded body, the finished
 * label from a duration (`5 seconds`, the singular minute, the plural minutes,
 * a sub-second "Thought briefly"), a finished block with no duration, the
 * click-toggle in both directions, a stream that ends and folds the block away,
 * multi-line body text, and a locale switch re-labelling the block.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The disclosure button (the block's chevron + label). */
const TOGGLE = 'button'

/** `ThinkingBlock`. */
export const thinkingBlockCases: FeatureComponentCases = {
  component: 'ThinkingBlock',
  cases: [
    // ── While the turn streams ──────────────────────────────────────────────
    {
      name: 'a streaming turn auto-expands the body under a Thinking label',
      props: { content: 'Considering the options.', isStreaming: true },
    },
    {
      name: 'multi-line reasoning keeps its line breaks',
      props: { content: 'First I check the schema.\nThen I write the handler.', isStreaming: true },
    },
    {
      name: 'a stream that ends folds the block away and reports its duration',
      props: { content: 'Considering the options.', isStreaming: true },
      interactions: [{ type: 'props', props: { isStreaming: false, durationMs: 5000 } }],
    },

    // ── A finished thought ──────────────────────────────────────────────────
    {
      name: 'a finished thought reports its seconds',
      props: { content: 'Considering the options.', durationMs: 5000 },
    },
    {
      name: 'a sub-second thought says it thought briefly',
      props: { content: 'A quick check.', durationMs: 300 },
    },
    {
      name: 'exactly one minute uses the singular minute',
      props: { content: 'A long deliberation.', durationMs: 60_000 },
    },
    {
      name: 'several minutes use the plural minutes',
      props: { content: 'A longer deliberation.', durationMs: 125_000 },
    },
    {
      name: 'a finished thought with no duration says it thought briefly',
      props: { content: 'A quick check.' },
    },

    // ── The reader's toggle ─────────────────────────────────────────────────
    {
      name: 'clicking a finished block opens it and clicking again closes it',
      props: { content: 'Considering the options.', durationMs: 5000 },
      interactions: [
        { type: 'click', selector: TOGGLE },
        { type: 'click', selector: TOGGLE },
      ],
    },
    {
      name: 'clicking an open streaming block closes it',
      props: { content: 'Considering the options.', isStreaming: true },
      interactions: [{ type: 'click', selector: TOGGLE }],
    },
    {
      name: 'a reader who closed a streaming block keeps it closed as it continues',
      props: { content: 'Considering the options.', isStreaming: true },
      interactions: [
        { type: 'click', selector: TOGGLE },
        { type: 'props', props: { content: 'Considering the options further.' } },
      ],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-labels the block and its duration',
      props: { content: 'Considering the options.', durationMs: 5000 },
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                thinking: 'Réflexion',
                thoughtBriefly: 'A réfléchi brièvement',
                thoughtForSecond: 'A réfléchi pendant {{count}} seconde',
                thoughtForSeconds: 'A réfléchi pendant {{count}} secondes',
                thoughtForMinute: 'A réfléchi pendant {{count}} minute',
                thoughtForMinutes: 'A réfléchi pendant {{count}} minutes',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
