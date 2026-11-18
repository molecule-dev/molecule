/**
 * `@molecule/app-audio-recorder-react` cases: the mic-permission / MediaRecorder
 * wrapper — the status badge, the elapsed readout, the transport buttons and the
 * error line.
 *
 * `AudioRecorder` is the package's only runtime export (the rest of its public
 * surface is types). jsdom ships no `MediaRecorder` and no
 * `navigator.mediaDevices`, so the cases drive the state machine through the
 * branch every environment without the API reaches: a Record click lands in the
 * error state with the translated "not supported" message and calls `onError`.
 * The recording, pause and stop branches need a MediaRecorder stub, which the
 * package's own unit tests install.
 *
 * The `<audio>`-free wrapper attributes (`data-state`, `role`, `aria-label`, the
 * extra `className`) and the wrapper's `dataMolId` default are checked directly
 * by the cases below, and the derived locale-switch case proves the translated
 * labels re-render through `useTranslation()`.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The Record button's selector (its `data-action`). */
const recordSelector = 'button[data-action="record"]'

/** `@molecule/app-audio-recorder-react`. */
export const audioRecorderFeature: FeatureCases = {
  package: '@molecule/app-audio-recorder-react',
  families: [
    {
      component: 'AudioRecorder',
      cases: [
        { name: 'defaults', props: {}, callbacks: ['onRecorded'] },
        {
          name: 'className and a dataMolId',
          props: { className: 'parity-token', dataMolId: 'voice-note' },
          callbacks: ['onRecorded'],
        },
        {
          name: 'a custom mime type and a max duration',
          props: { mimeType: 'audio/ogg;codecs=opus', maxDurationSeconds: 120 },
          callbacks: ['onRecorded'],
        },
        {
          name: 'unlimited recording',
          props: { maxDurationSeconds: 0 },
          callbacks: ['onRecorded'],
        },
        {
          name: 'an unsupported browser lands in the error state',
          props: {},
          callbacks: ['onRecorded', 'onError'],
          interactions: [{ type: 'click', selector: recordSelector }],
        },
        {
          name: 'a second record click reports the error again',
          props: {},
          callbacks: ['onRecorded', 'onError'],
          interactions: [
            { type: 'click', selector: recordSelector },
            { type: 'click', selector: recordSelector },
          ],
        },
        {
          name: 'dataMolId changes from the parent',
          props: { dataMolId: 'voice-note' },
          callbacks: ['onRecorded'],
          interactions: [{ type: 'props', props: { dataMolId: 'meeting-note' } }],
        },
        {
          name: 'className changes from the parent',
          props: { className: 'parity-a' },
          callbacks: ['onRecorded'],
          interactions: [{ type: 'props', props: { className: 'parity-b' } }],
        },
      ],
    },
  ],
}
