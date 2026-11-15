/**
 * `@molecule/app-inline-edit-react` cases: the click-to-edit field in its read
 * state (value, placeholder, `renderRead`, `className`), its input and
 * textarea editors, every keyboard branch (Enter, Escape, Cmd/Ctrl+Enter),
 * Save / Cancel, the saving state under a deferred `onSubmit`, and prop
 * changes while idle and mid-edit.
 *
 * `onSubmit` is the only callback and the only export is the component.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A `renderRead` renderer node, the value interpolated as `{0}`. */
const readNodes = [{ tag: 'strong', attrs: { 'data-read': '' }, children: ['{0}'] }]

/** A second `renderRead` renderer node, distinguishable from the first. */
const wrappedReadNodes = [{ tag: 'em', attrs: { 'data-read-strong': '' }, children: ['«{0}»'] }]

/** `@molecule/app-inline-edit-react`. */
export const inlineEditFeature: FeatureCases = {
  package: '@molecule/app-inline-edit-react',
  families: [
    {
      component: 'InlineEdit',
      cases: [
        // First, so the derived locale-switch case renders translated text.
        { name: 'an empty value shows the default placeholder', props: { value: '' } },
        { name: 'renders the value as plain text', props: { value: 'Hello world' } },
        {
          name: 'an empty value shows a custom placeholder',
          props: { value: '', placeholder: 'Add a title' },
        },
        {
          name: 'a value renders instead of the placeholder',
          props: { value: 'Acme renewal', placeholder: 'Add a title' },
        },
        {
          name: 'renderRead formats the value',
          props: { value: 'raw value', renderRead: { $fn: 'renderRead', nodes: readNodes } },
        },
        {
          name: 'renderRead is ignored for an empty value',
          props: {
            value: '',
            placeholder: 'Add a title',
            renderRead: { $fn: 'renderRead', nodes: readNodes },
          },
        },
        {
          name: 'forwards className on the read state',
          props: { value: 'x', className: 'parity-token' },
        },
        {
          name: 'a className-only read state renders no placeholder',
          props: { value: '', className: 'parity-token' },
        },
        {
          name: 'a value change on the read state re-renders the text',
          props: { value: 'first' },
          interactions: [{ type: 'props', props: { value: 'second' } }],
        },
        {
          name: 'a custom placeholder appears on the read state',
          props: { value: 'x', placeholder: 'Add a title' },
          interactions: [{ type: 'props', props: { value: '' } }],
        },
        {
          name: 'a placeholder change re-renders the placeholder',
          props: { value: '', placeholder: 'Add a title' },
          interactions: [{ type: 'props', props: { placeholder: 'Add a subject' } }],
        },
        {
          name: 'clicking the read state opens the input',
          props: { value: 'Hello world' },
          interactions: [{ type: 'click', selector: '[role="button"]' }],
        },
        {
          name: 'an Enter keydown opens the editor',
          props: { value: 'Hello world' },
          interactions: [{ type: 'keydown', selector: '[role="button"]', key: 'Enter' }],
        },
        {
          name: 'another key does not open the editor',
          props: { value: 'Hello world' },
          interactions: [{ type: 'keydown', selector: '[role="button"]', key: 'a' }],
        },
        {
          name: 'the editor forwards className',
          props: { value: 'x', className: 'parity-token' },
          interactions: [{ type: 'click', selector: '[role="button"]' }],
        },
        {
          name: 'typing in the input updates the draft',
          props: { value: 'Hello world' },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Hello there' },
          ],
        },
        {
          name: 'the input takes its aria-label from the placeholder',
          props: { value: 'x', placeholder: 'Add a title' },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Add a title"]', value: 'Renamed' },
          ],
        },
        {
          name: 'Enter commits the draft and closes the editor',
          props: { value: 'Hello world' },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Renamed' },
            { type: 'keydown', selector: 'input[aria-label="Edit"]', key: 'Enter' },
          ],
        },
        {
          name: 'the Save button commits the draft',
          props: { value: 'Hello world' },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Renamed' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
          ],
        },
        {
          name: 'Escape cancels and restores the draft',
          props: { value: 'Hello world' },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Changed' },
            { type: 'keydown', selector: 'input[aria-label="Edit"]', key: 'Escape' },
            { type: 'click', selector: '[role="button"]' },
          ],
        },
        {
          name: 'the Cancel button restores the draft and closes',
          props: { value: 'Hello world' },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Changed' },
            { type: 'click', selector: 'button:nth-of-type(1)' },
            { type: 'click', selector: '[role="button"]' },
          ],
        },
        {
          name: 'saving disables both buttons and shows the saving label',
          props: { value: 'Hello world' },
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { defer: true } },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Renamed' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
            { type: 'settle', callback: 'onSubmit' },
          ],
        },
        {
          name: 'a second save while saving is ignored',
          props: { value: 'Hello world' },
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { defer: true } },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Renamed' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
            { type: 'settle', callback: 'onSubmit' },
          ],
        },
        {
          name: 'a resolved save closes the editor',
          props: { value: 'Hello world' },
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { resolve: undefined } },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Renamed' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
          ],
        },
        {
          name: 'reopening after a save keeps the draft',
          props: { value: 'Hello world' },
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { resolve: undefined } },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Renamed' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
            { type: 'click', selector: '[role="button"]' },
          ],
        },
        {
          name: 'the textarea variant renders a textarea',
          props: { value: 'Some text', variant: 'textarea' },
          interactions: [{ type: 'click', selector: '[role="button"]' }],
        },
        {
          name: 'Enter alone does not commit a textarea',
          props: { value: 'Some text', variant: 'textarea' },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'textarea[aria-label="Edit"]', value: 'Changed' },
            { type: 'keydown', selector: 'textarea[aria-label="Edit"]', key: 'Enter' },
          ],
        },
        {
          name: 'meta+Enter commits a textarea',
          props: { value: 'Some text', variant: 'textarea' },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'textarea[aria-label="Edit"]', value: 'Changed' },
            {
              type: 'keydown',
              selector: 'textarea[aria-label="Edit"]',
              key: 'Enter',
              metaKey: true,
            },
          ],
        },
        {
          name: 'ctrl+Enter commits a textarea',
          props: { value: 'Some text', variant: 'textarea' },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            {
              type: 'keydown',
              selector: 'textarea[aria-label="Edit"]',
              key: 'Enter',
              ctrlKey: true,
            },
          ],
        },
        {
          name: 'Escape cancels the textarea',
          props: { value: 'Some text', variant: 'textarea' },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'textarea[aria-label="Edit"]', value: 'Changed' },
            { type: 'keydown', selector: 'textarea[aria-label="Edit"]', key: 'Escape' },
            { type: 'click', selector: '[role="button"]' },
          ],
        },
        {
          name: 'a value change while editing re-syncs the draft',
          props: { value: 'Hello world' },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'props', props: { value: 'Updated elsewhere' } },
          ],
        },
        {
          name: 'switching the variant while editing keeps the draft',
          props: { value: 'Hello world' },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'input', selector: 'input[aria-label="Edit"]', value: 'Changed' },
            { type: 'props', props: { variant: 'textarea' } },
          ],
        },
        {
          name: 'switching back to the input variant re-renders the input',
          props: { value: 'Hello world', variant: 'textarea' },
          interactions: [
            { type: 'click', selector: '[role="button"]' },
            { type: 'props', props: { variant: 'input' } },
          ],
        },
        {
          name: 'renderRead formats a value that changes while idle',
          props: { value: 'first', renderRead: { $fn: 'renderRead', nodes: readNodes } },
          interactions: [
            {
              type: 'props',
              props: { renderRead: { $fn: 'renderRead', nodes: wrappedReadNodes } },
            },
          ],
        },
      ],
    },
  ],
}
