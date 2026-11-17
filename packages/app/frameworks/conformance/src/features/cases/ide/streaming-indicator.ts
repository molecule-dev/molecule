/**
 * `StreamingIndicator` cases: the spinner row ChatPanel shows while a reply is
 * streaming — the inline cursor replacement, the rotating status phrases, the
 * real-activity label that takes over from them, the live elapsed timer and
 * the estimated-output token counter with its tooltip, and the phone-width
 * viewport that drops the counter to keep the label readable.
 *
 * The component is PRESENTATIONAL: every prop arrives already decided, so the
 * states are plain prop sets moved forward with `advance` (fake timers drive
 * the rotation and the ticking `now`) and `props` steps. A case showing the
 * elapsed time pins `now`, so the rendered `m:ss` text is the same on every
 * day the suite runs.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** A turn start the timer cases share (`now` moves relative to it). */
const STARTED_AT = 1_700_000_000_000

/** `StreamingIndicator`. */
export const streamingIndicatorCases: FeatureComponentCases = {
  component: 'StreamingIndicator',
  cases: [
    // ── The row at rest ─────────────────────────────────────────────────────
    {
      name: 'defaults spin the first phrase with no metrics group',
      props: {},
    },
    {
      name: 'no estimate and no timer render no metrics group at all',
      props: { tokens: null },
    },

    // ── The inline cursor replacement ───────────────────────────────────────
    {
      name: 'inline renders only the spinner',
      props: { inline: true },
    },
    {
      name: 'inline never rotates',
      props: { inline: true },
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
      ],
    },

    // ── The rotating phrases ────────────────────────────────────────────────
    {
      name: 'the phrases rotate every three seconds',
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
      ],
    },
    {
      name: 'the rotation wraps back to the first phrase',
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
        { type: 'advance', ms: 3000 },
      ],
    },
    {
      name: 'unmount stops the rotation',
      fakeTimers: true,
      interactions: [{ type: 'unmount' }, { type: 'advance', ms: 3000 }],
    },

    // ── A real activity label ───────────────────────────────────────────────
    {
      name: 'a real label replaces the rotation',
      props: { label: 'Reading src/App.tsx' },
    },
    {
      name: 'a blank label falls back to rotation',
      props: { label: '   ' },
    },
    {
      name: 'a label change swaps the text and never rotates',
      props: { label: 'Reading src/App.tsx' },
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 3000 },
        { type: 'props', props: { label: 'Writing the plan' } },
        { type: 'advance', ms: 3000 },
      ],
    },

    // ── The live elapsed timer ──────────────────────────────────────────────
    {
      name: 'a live timer ticks sub-second while the wait is short',
      props: { startedAt: STARTED_AT },
      now: STARTED_AT + 500,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 100 },
        { type: 'advance', ms: 900 },
      ],
    },
    {
      name: 'past ten seconds the timer reads m:ss and slows to a second',
      props: { startedAt: STARTED_AT },
      now: STARTED_AT + 9_800,
      fakeTimers: true,
      interactions: [
        { type: 'advance', ms: 300 },
        { type: 'advance', ms: 1000 },
      ],
    },
    {
      name: 'a startedAt in the future clamps the timer at zero',
      props: { startedAt: STARTED_AT + 2_000 },
      now: STARTED_AT,
    },

    // ── The estimated-output token counter ──────────────────────────────────
    {
      name: 'the token estimate rides beside the label with its hint',
      props: { tokens: 40_500 },
    },
    {
      name: 'tokens and elapsed share the row through a separator',
      props: { tokens: 40_500, startedAt: STARTED_AT },
      now: STARTED_AT + 1_000,
    },
    {
      name: 'below the noise floor no counter shows',
      props: { tokens: 19 },
      interactions: [{ type: 'props', props: { tokens: null } }],
    },
    {
      name: 'compact counts keep one decimal and the threshold shows through',
      props: { tokens: 999 },
      interactions: [
        { type: 'props', props: { tokens: 1234 } },
        { type: 'props', props: { tokens: 20 } },
      ],
    },

    // ── Phone-width viewport ────────────────────────────────────────────────
    {
      name: 'on a phone viewport the counter drops and the timer stays',
      viewportWidth: 390,
      props: { tokens: 40_500, startedAt: STARTED_AT },
      now: STARTED_AT + 1_000,
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-renders the phrase, the count and the hint',
      props: { tokens: 40_500 },
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                streaming: {
                  thinking: 'Synthèse…',
                },
                streamingOutputTokens: '~{{count}} jetons',
                streamingOutputTokensHint:
                  'Jetons de sortie estimés pour ce tour — /cost affiche les entrées et les cachés.',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
