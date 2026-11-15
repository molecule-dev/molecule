/**
 * `@molecule/app-copy-link-field-react` cases: the read-only input + copy
 * button with "Copied!" feedback.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-copy-link-field-react`. */
export const copyLinkFieldFeature: FeatureCases = {
  package: '@molecule/app-copy-link-field-react',
  families: [
    {
      component: 'CopyLinkField',
      cases: [
        { name: 'value only', props: { value: 'https://example.com/invite/abc123' } },
        {
          name: 'label, md size, className',
          props: {
            value: 'https://x.test/abc',
            label: 'Share link',
            size: 'md',
            className: 'parity-token',
          },
        },
        {
          name: 'value changes',
          props: { value: 'https://x.test/one' },
          interactions: [{ type: 'props', props: { value: 'https://x.test/two' } }],
        },
        {
          name: 'label changes and disappears',
          props: { value: 'u', label: 'Webhook URL' },
          interactions: [
            { type: 'props', props: { label: 'API key' } },
            { type: 'props', props: { label: null } },
          ],
        },
        {
          name: 'click, focus and key presses',
          props: { value: 'https://x.test/abc', label: 'Webhook URL' },
          callbacks: ['onCopy'],
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'focus', selector: 'input' },
            { type: 'keydown', selector: 'input', key: 'Tab' },
            { type: 'blur', selector: 'input' },
          ],
        },
        {
          name: 'copy click under fake timers with a custom feedbackMs',
          props: { value: 'https://x.test/abc', feedbackMs: 300 },
          callbacks: ['onCopy'],
          fakeTimers: true,
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'advance', ms: 300 },
          ],
        },
      ],
    },
  ],
}
