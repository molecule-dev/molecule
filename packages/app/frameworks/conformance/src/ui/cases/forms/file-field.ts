/**
 * Browser picker cases. The callback goldens record each accepted and
 * rejected file in order, and one recorder entry per callback invocation.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const target = '[data-mol-id="file-field"]'
const input = `${target} > input[type="file"]`
const png = { name: 'photo.png', type: 'image/png', content: 'png' }
const pdf = { name: 'report.pdf', type: 'application/pdf', content: 'pdf!' }
const txt = { name: 'notes.txt', type: 'text/plain', content: 'notes' }

/** The file selection element's reference DOM and callback behavior. */
export const fileField: UIComponentCases = {
  component: 'FileField',
  handle: {
    pick: { observeEvent: 'click', repeatWithProps: [{ disabled: true }, { disabled: false }] },
  },
  cases: [
    {
      name: 'browse delivers both files in selection order',
      props: {
        accept: 'image/*,.pdf',
        multiple: true,
        id: 'attachments',
        className: 'parity-token',
        'aria-label': 'Attachments',
      },
      children: [{ tag: 'span', children: ['Choose attachments'] }],
      callbacks: ['onValueChange', 'onRejected', 'onPickError'],
      interactions: [
        { type: 'focus', selector: target },
        { type: 'chooseFiles', selector: input, files: [png, pdf] },
      ],
    },
    {
      name: 'reselecting the same file calls back twice',
      props: { 'aria-label': 'Attachments' },
      callbacks: ['onValueChange'],
      interactions: [
        { type: 'chooseFiles', selector: input, files: [pdf] },
        { type: 'chooseFiles', selector: input, files: [pdf] },
      ],
    },
    {
      name: 'cancelling keeps the previous selection without a callback',
      props: { 'aria-label': 'Attachments' },
      callbacks: ['onValueChange', 'onRejected', 'onPickError'],
      interactions: [
        { type: 'chooseFiles', selector: input, files: [pdf] },
        { type: 'event', selector: input, event: 'cancel', bubbles: true },
        { type: 'chooseFiles', selector: input, files: [] },
      ],
    },
    {
      name: 'disabling the field keeps the previous selection',
      props: { 'aria-label': 'Attachments' },
      callbacks: ['onValueChange', 'onRejected', 'onPickError'],
      interactions: [
        { type: 'chooseFiles', selector: input, files: [pdf] },
        { type: 'props', props: { disabled: true } },
        { type: 'chooseFiles', selector: input, files: [png] },
        { type: 'transfer', selector: target, event: 'dragover', files: [txt] },
        { type: 'transfer', selector: target, event: 'drop', files: [txt] },
      ],
    },
    {
      name: 'browse and drop apply the same inclusive per-file maximum',
      props: { maxSize: 4, multiple: true, 'aria-label': 'Attachments' },
      callbacks: ['onValueChange', 'onRejected'],
      interactions: [
        { type: 'chooseFiles', selector: input, files: [txt, pdf] },
        { type: 'transfer', selector: target, event: 'drop', files: [png, txt] },
      ],
    },
    {
      name: 'a zero-byte maximum keeps an empty file and rejects one byte',
      props: { maxSize: 0, 'aria-label': 'Attachments' },
      callbacks: ['onValueChange', 'onRejected'],
      interactions: [
        {
          type: 'chooseFiles',
          selector: input,
          files: [
            { ...txt, content: 'x' },
            { ...pdf, content: '' },
          ],
        },
      ],
    },
    {
      name: 'single selection keeps the first accepted file after filtering',
      props: { accept: ' .PDF, IMAGE/*, application/octet-stream ', 'aria-label': 'Attachments' },
      callbacks: ['onValueChange', 'onRejected'],
      interactions: [{ type: 'transfer', selector: target, event: 'drop', files: [txt, pdf, png] }],
    },
  ],
}
