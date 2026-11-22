/**
 * `NoticeCard` cases: the one shared tone-accented notice treatment every inline
 * notice and limit/upgrade banner renders through — a matched-weight accent
 * icon and an optional composable body (or plain text) with a row of
 * design-system action buttons.
 *
 * The cases cover each tone (its accent and default icon), multi-line text, the
 * composable body's three segment kinds (text, inline code, an action being a
 * link or a button) and its blocked-scheme fallback, a single action and an
 * array of them (the semantic colour an action takes from its tone or its own
 * `color`, and the monospace `code` label), the external / protocol-relative /
 * app-route link targets, an icon override, content overriding the action row,
 * an empty card, and a `null` action.
 *
 * The card renders no translated text of its own — every label arrives already
 * localized — so the family has no locale case beyond the kit's derived switch.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `NoticeCard`. */
export const noticeCardCases: FeatureComponentCases = {
  component: 'NoticeCard',
  cases: [
    // ── The card at rest ────────────────────────────────────────────────────
    {
      name: 'an info notice renders its icon and text',
      props: { tone: 'info', text: 'Something happened.' },
    },
    {
      name: 'an empty notice renders the card shell',
      props: { tone: 'info', text: '' },
    },
    {
      name: 'multi-line text keeps its line breaks',
      props: { tone: 'info', text: 'First line.\nSecond line.' },
    },
    {
      name: 'an icon override replaces the tone glyph',
      props: { tone: 'success', text: 'Captured a new sign-up.', icon: 'sparkle' },
    },

    // ── Each tone ───────────────────────────────────────────────────────────
    {
      name: 'each tone recolours the accent and swaps the icon',
      props: { tone: 'info', text: 'A notice.' },
      interactions: [
        { type: 'props', props: { tone: 'gold' } },
        { type: 'props', props: { tone: 'upgrade' } },
        { type: 'props', props: { tone: 'success' } },
        { type: 'props', props: { tone: 'signup' } },
      ],
    },

    // ── The composable body ─────────────────────────────────────────────────
    {
      name: 'a composable body interleaves text, inline code and a link',
      props: {
        tone: 'gold',
        text: 'Run npm run deploy, then review.',
        content: [
          'Run ',
          { code: 'npm run deploy' },
          ', then ',
          { label: 'review', href: '/review' },
          '.',
        ],
      },
    },
    {
      name: 'a composable body action button takes its own click',
      props: {
        tone: 'success',
        text: 'Saved script.',
        content: ['Saved script. ', { label: 'Run it', onClick: { $callback: 'onRun' } }],
      },
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'a blocked scheme in the body renders inert text, never an anchor',
      props: {
        tone: 'info',
        text: 'Do not click.',
        content: ['Do not click ', { label: 'this', href: 'javascript:alert(1)' }, '.'],
      },
    },

    // ── Action rows ─────────────────────────────────────────────────────────
    {
      name: 'a single action renders the tone’s button and fires its click',
      props: {
        tone: 'upgrade',
        text: 'You hit a limit.',
        action: { label: 'Upgrade', onClick: { $callback: 'onUpgrade' } },
      },
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'an action array renders one button per action',
      props: {
        tone: 'signup',
        text: 'Sign up to keep your work.',
        action: [
          { label: 'Sign up', href: '/signup' },
          { label: 'Log in', href: '/login', color: 'secondary' },
        ],
      },
    },
    {
      name: 'an action’s own colour and monospace label override the tone',
      props: {
        tone: 'info',
        text: 'Run the command.',
        action: { label: '/deploy', onClick: { $callback: 'onRun' }, code: true, color: 'success' },
      },
    },
    {
      name: 'an external link opens in a new tab and a route link stays put',
      props: {
        tone: 'info',
        text: 'Read more.',
        action: [
          { label: 'Status', href: 'https://status.example.test' },
          { label: 'Docs', href: '/docs' },
          { label: 'Accounts', href: '//accounts.example.test/login' },
        ],
      },
    },
    {
      name: 'a blocked action scheme renders inert text, never a button or anchor',
      props: {
        tone: 'info',
        text: 'Suspicious.',
        action: { label: 'Open', href: 'data:text/html,<script>1</script>' },
      },
    },
    {
      name: 'a null action renders no button row',
      props: { tone: 'info', text: 'Nothing to do.', action: null },
    },
    {
      name: 'a composable body suppresses the action row',
      props: {
        tone: 'gold',
        text: 'See the options.',
        content: ['See the ', { label: 'options', href: '/pricing' }, '.'],
        action: { label: 'Upgrade', href: '/pricing' },
      },
    },
  ],
}
