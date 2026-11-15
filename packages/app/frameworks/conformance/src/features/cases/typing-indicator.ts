/**
 * `@molecule/app-typing-indicator-react` cases: the three-dot typing pulse.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-typing-indicator-react`. */
export const typingIndicatorFeature: FeatureCases = {
  package: '@molecule/app-typing-indicator-react',
  families: [
    {
      component: 'TypingIndicator',
      cases: [
        { name: 'default' },
        { name: 'hidden', props: { visible: false } },
        { name: 'a custom aria-label', props: { ariaLabel: 'Alice is typing' } },
        { name: 'bigger dots', props: { dotSize: 10 } },
        { name: 'a faster pulse', props: { durationMs: 600 } },
        { name: 'with a className', props: { className: 'parity-token' } },
        {
          name: 'every prop together',
          props: {
            visible: true,
            dotSize: 8,
            durationMs: 900,
            ariaLabel: 'Bob is typing',
            className: 'parity-token',
          },
        },
        {
          name: 'visibility toggles',
          interactions: [
            { type: 'props', props: { visible: false } },
            { type: 'props', props: { visible: true } },
          ],
        },
        {
          name: 'dot size changes',
          props: { dotSize: 8 },
          interactions: [{ type: 'props', props: { dotSize: 12 } }],
        },
        {
          name: 'duration changes',
          props: { durationMs: 1200 },
          interactions: [{ type: 'props', props: { durationMs: 2400 } }],
        },
        {
          name: 'duration changes while hidden',
          props: { durationMs: 1200 },
          interactions: [
            { type: 'props', props: { visible: false, durationMs: 2400 } },
            { type: 'props', props: { visible: true } },
          ],
        },
        {
          name: 'className changes',
          props: { className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
    },
  ],
}
