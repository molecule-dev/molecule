/**
 * `@molecule/app-image-gallery-editor-react` cases: the hero drop zone, the
 * thumbnail slot grid, the keyboard activation, the remove confirmation and
 * the drop / pick-file flows.
 *
 * Every drop goes through the kit's `transfer` step, so the files a case
 * carries are real `File` objects built by the kit and reach `onPickFiles`
 * exactly as a user's drop would. Every drop case passes `onPickFiles`: the
 * default local object URLs need `URL.createObjectURL`, which jsdom does not
 * implement.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A small PNG: 3 bytes, an image the drop accepts. */
const png = { name: 'photo.png', type: 'image/png', content: 'png' }
/** A JPEG: 3 bytes, a second image. */
const jpg = { name: 'pic.jpg', type: 'image/jpeg', content: 'jpg' }
/** A text file the picker (`accept="image/*"`) would refuse. */
const txt = { name: 'notes.txt', type: 'text/plain', content: 'text' }

/** The hero drop zone, selected the way an app's own test would. */
const zone = 'div[data-mol-id="image-gallery-editor-dropzone"]'
/** A thumbnail slot, by its position. */
const slot = (index: number): string => `[data-mol-id="image-gallery-editor-slot-${index}"]`
/** The remove confirmation's buttons (the shared `ConfirmDialog`). */
const cancel = '[role="dialog"] button:nth-last-of-type(2)'
const confirm = '[role="dialog"] div > button:nth-of-type(2)'

/** `@molecule/app-image-gallery-editor-react`. */
export const imageGalleryEditorFeature: FeatureCases = {
  package: '@molecule/app-image-gallery-editor-react',
  families: [
    {
      component: 'ImageGalleryEditor',
      cases: [
        {
          name: 'defaults',
          props: { slots: [null, 'https://img/1.png', null] },
          callbacks: ['onChange'],
        },
        {
          name: 'no slots at all',
          props: { slots: [] },
          callbacks: ['onChange'],
        },
        {
          name: 'header, counter and status message',
          slots: {
            header: [{ tag: 'h3', children: ['Gallery'] }],
            counter: ['3 / 24 Photos'],
            statusMessage: ['Saved just now'],
          },
          props: { slots: [null] },
          callbacks: ['onChange'],
        },
        {
          name: 'counter without header renders the placeholder',
          slots: { counter: ['1 / 24 Photos'] },
          props: { slots: [null] },
          callbacks: ['onChange'],
        },
        {
          name: 'header without counter',
          slots: { header: [{ tag: 'strong', children: ['Trip photos'] }] },
          props: { slots: [null] },
          callbacks: ['onChange'],
        },
        {
          name: 'custom drop zone title and hint',
          props: {
            slots: [null],
            dropZoneTitle: 'Drop photos',
            dropZoneHint: 'or pick some files',
          },
          callbacks: ['onChange'],
        },
        {
          name: 'custom empty slot icon',
          props: { slots: [null], emptySlotIcon: 'star' },
          callbacks: ['onChange'],
        },
        {
          name: 'custom confirm message',
          props: { slots: ['https://img/1.png'], confirmRemoveMessage: 'Delete this photo?' },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: slot(0) }],
        },
        {
          name: 'click on the drop zone opens the picker',
          props: { slots: [null] },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: zone }],
        },
        {
          name: 'click on an empty slot opens the picker',
          props: { slots: [null] },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: slot(0) }],
        },
        {
          name: 'click on a filled slot opens the remove confirm',
          props: { slots: ['https://img/1.png'] },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: slot(0) }],
        },
        {
          name: 'cancel keeps the image',
          props: { slots: ['https://img/1.png'] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: slot(0) },
            { type: 'click', selector: cancel },
          ],
        },
        {
          name: 'confirm removes the image',
          props: { slots: ['a.png', 'b.png'] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: slot(1) },
            { type: 'click', selector: confirm },
          ],
        },
        {
          name: 'Enter opens the remove confirm',
          props: { slots: ['https://img/1.png'] },
          callbacks: ['onChange'],
          interactions: [{ type: 'keydown', selector: slot(0), key: 'Enter' }],
        },
        {
          name: 'Space opens the remove confirm',
          props: { slots: ['https://img/1.png'] },
          callbacks: ['onChange'],
          interactions: [{ type: 'keydown', selector: slot(0), key: ' ' }],
        },
        {
          name: 'other keys do not activate a slot',
          props: { slots: ['https://img/1.png'] },
          callbacks: ['onChange'],
          interactions: [{ type: 'keydown', selector: slot(0), key: 'a' }],
        },
        {
          name: 'dragover lets the drop through',
          props: { slots: [null] },
          callbacks: ['onChange'],
          interactions: [{ type: 'transfer', selector: zone, event: 'dragover', files: [png] }],
        },
        {
          name: 'drop fills the empty slots in order',
          props: { slots: ['kept', null, null] },
          callbacks: ['onChange', 'onPickFiles'],
          callbackResults: { onPickFiles: { resolve: ['url:a.png', 'url:b.jpg'] } },
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png, jpg] }],
        },
        {
          name: 'drop refuses a non-image file',
          props: { slots: [null, null] },
          callbacks: ['onChange', 'onPickFiles'],
          callbackResults: { onPickFiles: { resolve: ['url'] } },
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png, txt] }],
        },
        {
          name: 'drop on a full gallery reports the slots unchanged',
          props: { slots: ['a.png', 'b.png'] },
          callbacks: ['onChange', 'onPickFiles'],
          callbackResults: { onPickFiles: { resolve: ['url:x'] } },
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png] }],
        },
        {
          name: 'drop respects maxImages',
          props: { slots: [null, null, null], maxImages: 2 },
          callbacks: ['onChange', 'onPickFiles'],
          callbackResults: { onPickFiles: { resolve: ['url:a.png', 'url:b.jpg'] } },
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png, jpg] }],
        },
        {
          name: 'a synchronous onPickFiles works too',
          props: { slots: [null] },
          callbacks: ['onChange', 'onPickFiles'],
          callbackResults: { onPickFiles: { returns: ['url:one'] } },
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png] }],
        },
        {
          name: 'an onPickFiles resolving null keeps the slot empty',
          props: { slots: [null] },
          callbacks: ['onChange', 'onPickFiles'],
          callbackResults: { onPickFiles: { resolve: [null] } },
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png] }],
        },
        {
          name: 'an input change with no files does nothing',
          props: { slots: [null] },
          callbacks: ['onChange'],
          interactions: [{ type: 'event', selector: 'input[type="file"]', event: 'change' }],
        },
        {
          name: 'prop changes replace the slots',
          props: { slots: [null, 'https://img/1.png'] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { slots: ['https://img/2.png', null, 'https://img/3.png'] } },
          ],
        },
        {
          name: 'the status message clears',
          props: { slots: [null], statusMessage: 'Uploading' },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { statusMessage: '' } }],
        },
      ],
    },
  ],
}
