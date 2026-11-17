/**
 * `TipCard` cases: the auto-tip card the chat timeline surfaces on a fresh
 * conversation and after an idle rotation — a dismissable, non-interrupting
 * info card that never triggers the model.
 *
 * The card is PRESENTATIONAL: the text arrives already translated, so the
 * states are plain prop sets. The `/` and `@` tokens in the tip text are the
 * component's own rendering job (they split the string and set the code
 * segments apart in monospace), so the cases give it every token shape the
 * real tips carry — a slash command, a bare `@`, an `@file`, and a text with
 * both kinds — plus the accent + icon overrides the semantic tips pass (the
 * gold viewer tip, the warning upgrade tip), the hover state of the dismiss
 * mark, the dismissal itself, and a locale switch re-labelling the button.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `TipCard`. */
export const tipCardCases: FeatureComponentCases = {
  component: 'TipCard',
  cases: [
    // ── The card at rest ────────────────────────────────────────────────────
    {
      name: 'a plain tip with no tokens and the defaults',
      props: { text: 'Plain tip text.' },
      callbacks: ['onDismiss'],
    },
    {
      name: 'an empty text renders the card shell',
      props: { text: '' },
      callbacks: ['onDismiss'],
    },

    // ── The command / @file code tokens ─────────────────────────────────────
    {
      name: 'a slash command renders as inline code',
      props: { text: 'Type / to browse every command.' },
      callbacks: ['onDismiss'],
    },
    {
      name: 'a hyphenated slash command keeps the whole token',
      props: { text: 'Run /fix-all to repair the failing files.' },
      callbacks: ['onDismiss'],
    },
    {
      name: 'a bare @ renders as inline code',
      props: { text: 'Type @ to mention a file.' },
      callbacks: ['onDismiss'],
    },
    {
      name: 'an @file token keeps the name after the sign',
      props: { text: 'Attach @filename to give the agent a file to work from.' },
      callbacks: ['onDismiss'],
    },
    {
      name: 'both token kinds share one sentence',
      props: { text: 'Tip: type / to see every command, or @ a filename to work from.' },
      callbacks: ['onDismiss'],
    },

    // ── The accent + icon overrides ─────────────────────────────────────────
    {
      name: 'an accent recolours the tint and the icon',
      props: { text: 'Team-only messages are treated differently.', accent: '#e0a100' },
      callbacks: ['onDismiss'],
    },
    {
      name: 'a css-var accent colours through the theme token',
      props: {
        text: 'The plan is waiting on your upgrade.',
        accent: 'var(--mol-color-warning, #e0a100)',
      },
      callbacks: ['onDismiss'],
    },
    {
      name: 'an icon override replaces the lightbulb',
      props: { text: 'Captured a new sign-up.', icon: 'sparkle' },
      callbacks: ['onDismiss'],
    },
    {
      name: 'accent and icon override together make the semantic tip',
      props: {
        text: 'Run finished — every test passed.',
        accent: '#3fb950',
        icon: 'check-circle',
      },
      callbacks: ['onDismiss'],
    },

    // ── Dismissal ───────────────────────────────────────────────────────────
    {
      name: 'the dismiss button calls onDismiss and the card stays',
      props: { text: 'Plain tip text.' },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="chat-tip-dismiss"]' },
        { type: 'click', selector: '[data-mol-id="chat-tip-dismiss"]' },
      ],
    },

    // ── The dismiss mark's hover ────────────────────────────────────────────
    {
      name: 'hovering the dismiss mark raises it, leaving restores it',
      props: { text: 'Plain tip text.' },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="chat-tip-dismiss"]' },
        { type: 'mouseleave', selector: '[data-mol-id="chat-tip-dismiss"]' },
        { type: 'mouseenter', selector: '[data-mol-id="chat-tip-dismiss"]' },
      ],
    },

    // ── Prop changes ────────────────────────────────────────────────────────
    {
      name: 'a new text re-splits the tokens',
      props: { text: 'Type / to browse every command.' },
      callbacks: ['onDismiss'],
      interactions: [
        { type: 'props', props: { text: 'Now attach @filename to work from a file.' } },
      ],
    },
    {
      name: 'a new accent recolours the card and the icon in place',
      props: { text: 'Team-only messages are treated differently.', accent: '#e0a100' },
      callbacks: ['onDismiss'],
      interactions: [{ type: 'props', props: { accent: '#3fb950', icon: 'check-circle' } }],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-labels the dismiss button',
      props: { text: 'Plain tip text.' },
      callbacks: ['onDismiss'],
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                tip: {
                  dismiss: 'Masquer l’astuce',
                },
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
