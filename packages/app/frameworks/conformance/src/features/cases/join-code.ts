/**
 * `@molecule/app-join-code-react` cases: the multi-slot join-code input, its
 * three alphabets, and every way a code is typed, pasted, cleared and
 * re-rendered from new props.
 *
 * `JoinCode` is the package's only runtime export; `JoinCodeProps` and
 * `JoinCodeAlphabet` are types.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Shorthand for one slot's selector. */
const slot = (index: number): string => `[data-mol-id="join-code-slot-${index}"]`

/** `@molecule/app-join-code-react`. */
export const joinCodeFeature: FeatureCases = {
  package: '@molecule/app-join-code-react',
  families: [
    {
      component: 'JoinCode',
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // carries the translated group and slot labels.
        { name: 'defaults' },
        { name: 'custom length', props: { length: 4 } },
        { name: 'zero slots', props: { length: 0 } },
        {
          name: 'defaultValue seeds and upper-cases the slots',
          props: { length: 4, defaultValue: 'ab' },
        },
        {
          name: 'defaultValue is sanitized and clamped to length',
          props: { length: 4, defaultValue: 'HELLO-WORLD' },
        },
        {
          name: 'defaultValue outside the numeric alphabet is dropped',
          props: { length: 4, alphabet: 'numeric', defaultValue: '1a2b3' },
        },
        {
          name: 'defaultValue under the letters alphabet drops digits',
          props: { length: 4, alphabet: 'letters', defaultValue: 'a1b2' },
        },
        {
          name: 'controlled value is rendered',
          props: { length: 4, value: 'AB' },
        },
        {
          name: 'controlled value is sanitized at render',
          props: { length: 4, value: 'a-b!' },
        },
        {
          name: 'an empty controlled value clears the slots',
          props: { length: 3, value: '' },
        },
        {
          name: 'className is added to the wrapper',
          props: { className: 'parity-token' },
        },
        {
          name: 'disabled disables every slot',
          props: { length: 4, disabled: true },
        },
        {
          name: 'typing advances through the slots',
          props: { length: 4 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: slot(0), value: 'a' },
            { type: 'input', selector: slot(1), value: 'b' },
            { type: 'input', selector: slot(2), value: '3' },
          ],
        },
        {
          name: 'typing into the last slot keeps focus there',
          props: { length: 2 },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: slot(1), value: 'b' }],
        },
        {
          name: 'characters outside the numeric alphabet are rejected',
          props: { length: 4, alphabet: 'numeric' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: slot(0), value: 'A' },
            { type: 'input', selector: slot(0), value: '7' },
          ],
        },
        {
          name: 'the letters alphabet rejects digits',
          props: { length: 4, alphabet: 'letters' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: slot(0), value: '7' },
            { type: 'input', selector: slot(0), value: 'q' },
          ],
        },
        {
          name: 'a multi-character change fills forward from the slot',
          props: { length: 3, defaultValue: 'X' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: slot(1), value: 'ab' }],
        },
        {
          name: 'backspace on an empty slot clears and focuses the previous one',
          props: { length: 4, defaultValue: 'AB' },
          callbacks: ['onChange'],
          interactions: [{ type: 'keydown', selector: slot(2), key: 'Backspace' }],
        },
        {
          name: 'backspace on a filled slot leaves the code alone',
          props: { length: 4, defaultValue: 'AB' },
          callbacks: ['onChange'],
          interactions: [{ type: 'keydown', selector: slot(1), key: 'Backspace' }],
        },
        {
          name: 'backspace on the first empty slot leaves the code alone',
          props: { length: 4 },
          callbacks: ['onChange'],
          interactions: [{ type: 'keydown', selector: slot(0), key: 'Backspace' }],
        },
        {
          name: 'arrow keys move focus between slots',
          props: { length: 4 },
          interactions: [
            { type: 'focus', selector: slot(0) },
            { type: 'keydown', selector: slot(0), key: 'ArrowRight' },
            { type: 'keydown', selector: slot(1), key: 'ArrowRight' },
            { type: 'keydown', selector: slot(2), key: 'ArrowLeft' },
            { type: 'keydown', selector: slot(0), key: 'ArrowLeft' },
          ],
        },
        {
          name: 'paste fills from the slot and truncates to length',
          props: { length: 4, defaultValue: 'A' },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'transfer',
              selector: slot(1),
              event: 'paste',
              data: { 'text/plain': 'bcdef' },
            },
          ],
        },
        {
          name: 'paste under the numeric alphabet drops invalid characters',
          props: { length: 6, alphabet: 'numeric' },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'transfer',
              selector: slot(0),
              event: 'paste',
              data: { 'text/plain': '12-345' },
            },
          ],
        },
        {
          name: 'a paste with no text is ignored',
          props: { length: 4 },
          callbacks: ['onChange'],
          interactions: [{ type: 'transfer', selector: slot(0), event: 'paste', data: {} }],
        },
        {
          name: 'onComplete fires once when the code is filled',
          props: { length: 3 },
          callbacks: ['onChange', 'onComplete'],
          interactions: [
            { type: 'input', selector: slot(0), value: '1' },
            { type: 'input', selector: slot(1), value: '2' },
            { type: 'input', selector: slot(2), value: '3' },
          ],
        },
        {
          name: 'a complete defaultValue notifies on mount',
          props: { length: 2, defaultValue: '12' },
          callbacks: ['onComplete'],
        },
        {
          name: 'onComplete is suppressed when autoSubmit is false',
          props: { length: 3, autoSubmit: false },
          callbacks: ['onComplete'],
          interactions: [
            { type: 'input', selector: slot(0), value: '1' },
            { type: 'input', selector: slot(1), value: '2' },
            { type: 'input', selector: slot(2), value: '3' },
          ],
        },
        {
          name: 'onComplete fires again for a newly completed code',
          props: { length: 2, defaultValue: '12' },
          callbacks: ['onComplete'],
          interactions: [{ type: 'input', selector: slot(0), value: '3' }],
        },
        {
          name: 'a prop change while the code stays complete does not notify again',
          props: { length: 2, defaultValue: '12' },
          callbacks: ['onComplete'],
          interactions: [
            { type: 'props', props: { autoSubmit: false } },
            { type: 'props', props: { autoSubmit: true } },
          ],
        },
        {
          name: 'disabled changes with props',
          props: { length: 3 },
          interactions: [
            { type: 'props', props: { disabled: true } },
            { type: 'props', props: { disabled: false } },
          ],
        },
        {
          name: 'a controlled value change updates the slots',
          props: { length: 4, value: 'AB' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { value: 'XY' } },
            { type: 'props', props: { value: 'xyz1' } },
          ],
        },
        {
          name: 'length changes re-size the slots',
          props: { length: 2, defaultValue: 'AB' },
          interactions: [
            { type: 'props', props: { length: 4 } },
            { type: 'props', props: { length: 1 } },
          ],
        },
        {
          name: 'an alphabet change re-sanitizes the value',
          props: { length: 4, defaultValue: 'A1B2' },
          interactions: [{ type: 'props', props: { alphabet: 'numeric' } }],
        },
      ],
    },
  ],
}
