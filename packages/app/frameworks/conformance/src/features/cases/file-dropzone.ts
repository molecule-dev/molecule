/**
 * `@molecule/app-file-dropzone-react` cases: the drag-over highlight, the
 * hidden file input, accept / max-size filtering, the keyboard activation and
 * the default or slotted copy.
 *
 * Every drop goes through the kit's `transfer` step, so the files a case
 * carries are real `File` objects built by the kit and reach `onFiles` /
 * `onRejected` exactly as a user's drop would.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A small PNG: 3 bytes, accepted by an `image/*` filter. */
const png = { name: 'photo.png', type: 'image/png', content: 'png' }
/** A small PDF: 3 bytes, accepted by a `.pdf` or `application/pdf` filter. */
const pdf = { name: 'report.pdf', type: 'application/pdf', content: 'pdf' }
/** A text file an image filter rejects. */
const txt = { name: 'notes.txt', type: 'text/plain', content: 'text' }
/** A 20-byte PNG: over a 10-byte `maxSize`. */
const big = { name: 'big.png', type: 'image/png', content: 'xxxxxxxxxxxxxxxxxxxx' }

/** The drop surface, selected the way an app's own test would. */
const zone = 'div[data-mol-id="file-dropzone"]'

/** `@molecule/app-file-dropzone-react`. */
export const fileDropzoneFeature: FeatureCases = {
  package: '@molecule/app-file-dropzone-react',
  families: [
    {
      component: 'FileDropzone',
      cases: [
        {
          name: 'default copy',
          callbacks: ['onFiles', 'onRejected'],
        },
        {
          name: 'accept hint',
          props: { accept: '.pdf' },
          callbacks: ['onFiles', 'onRejected'],
        },
        {
          name: 'custom children replace the default copy',
          callbacks: ['onFiles', 'onRejected'],
          children: [{ tag: 'span', attrs: { 'data-custom': '' }, children: ['My uploader'] }],
        },
        {
          name: 'custom children also replace the accept hint',
          props: { accept: '.pdf' },
          callbacks: ['onFiles', 'onRejected'],
          children: [{ tag: 'span', attrs: { 'data-custom': '' }, children: ['My uploader'] }],
        },
        {
          name: 'hidden input carries accept and multiple',
          props: { accept: 'image/*', multiple: true },
          callbacks: ['onFiles', 'onRejected'],
        },
        {
          name: 'disabled',
          props: { disabled: true },
          callbacks: ['onFiles', 'onRejected'],
        },
        {
          name: 'className passthrough',
          props: { className: 'parity-token' },
          callbacks: ['onFiles', 'onRejected'],
        },
        {
          name: 'drag over highlights the zone',
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'dragover', files: [png] }],
        },
        {
          name: 'drag over while disabled does not highlight',
          props: { disabled: true },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'dragover', files: [png] }],
        },
        {
          name: 'drag leave clears the highlight',
          callbacks: ['onFiles', 'onRejected'],
          interactions: [
            { type: 'transfer', selector: zone, event: 'dragover', files: [png] },
            { type: 'transfer', selector: zone, event: 'dragleave' },
          ],
        },
        {
          name: 'drop delivers the first accepted file',
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png, pdf] }],
        },
        {
          name: 'drop with multiple delivers every accepted file',
          props: { multiple: true },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png, pdf] }],
        },
        {
          name: 'drop after a drag over clears the highlight and delivers',
          callbacks: ['onFiles', 'onRejected'],
          interactions: [
            { type: 'transfer', selector: zone, event: 'dragover', files: [png] },
            { type: 'transfer', selector: zone, event: 'drop' },
          ],
        },
        {
          name: 'drop rejects a file that does not match accept',
          props: { accept: 'image/*' },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png, txt] }],
        },
        {
          name: 'drop rejects a file over the maximum size',
          props: { maxSize: 10 },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png, big] }],
        },
        {
          name: 'a file at exactly the maximum size is kept',
          props: { maxSize: 3 },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png] }],
        },
        {
          name: 'accept matches an extension',
          props: { accept: '.pdf' },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [pdf, png] }],
        },
        {
          name: 'accept matches an exact MIME type',
          props: { accept: 'application/pdf' },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [pdf, txt] }],
        },
        {
          name: 'accept star keeps every file',
          props: { accept: '*' },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [txt] }],
        },
        {
          name: 'disabled drop is ignored',
          props: { disabled: true },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'transfer', selector: zone, event: 'drop', files: [png] }],
        },
        {
          name: 'click activates the zone',
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'click', selector: zone }],
        },
        {
          name: 'Enter and Space activate the zone',
          callbacks: ['onFiles', 'onRejected'],
          interactions: [
            { type: 'keydown', selector: zone, key: 'Enter' },
            { type: 'keydown', selector: zone, key: ' ' },
            { type: 'keydown', selector: zone, key: 'Spacebar' },
            { type: 'keydown', selector: zone, key: 'Tab' },
            { type: 'keydown', selector: zone, key: 'a' },
          ],
        },
        {
          name: 'disabled keyboard is inert',
          props: { disabled: true },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [
            { type: 'keydown', selector: zone, key: 'Enter' },
            { type: 'keydown', selector: zone, key: ' ' },
          ],
        },
        {
          name: 'an input change with no files dispatches nothing',
          callbacks: ['onFiles', 'onRejected'],
          interactions: [{ type: 'event', selector: 'input[type="file"]', event: 'change' }],
        },
        {
          name: 'prop changes toggle disabled and accept',
          props: { disabled: true },
          callbacks: ['onFiles', 'onRejected'],
          interactions: [
            { type: 'props', props: { disabled: false } },
            { type: 'props', props: { accept: '.pdf' } },
            { type: 'transfer', selector: zone, event: 'drop', files: [png, pdf] },
          ],
        },
        {
          name: 'the copy follows the i18n bond',
          callbacks: ['onFiles', 'onRejected'],
          context: {
            translations: {
              en: {
                fileDropzone: {
                  dropHere: 'Drop it here',
                  accepts: 'Allowed: {{accept}}',
                },
              },
            },
          },
        },
        {
          name: 'the copy follows a locale switch',
          callbacks: ['onFiles', 'onRejected'],
          context: {
            translations: {
              en: { fileDropzone: { dropHere: 'Drop it here' } },
              fr: { fileDropzone: { dropHere: 'Déposez ici' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
      ],
    },
  ],
}
