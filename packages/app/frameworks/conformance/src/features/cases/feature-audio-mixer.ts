/**
 * `@molecule/app-feature-audio-mixer-react` cases: the channel-strip mixer
 * console, every channel-strip branch (sends row, accent color, muted / solo
 * state, clamped levels), the optional master column, and the two pure
 * clamp helpers plus the four range constants.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A send with a label (the send row shows the label, not the id). */
const reverb = { id: 'reverb', label: 'Rev', level: 0.4 }
/** A send without a label (the send row falls back to the id). */
const delay = { id: 'delay', level: 0.2 }

/** A channel with a sends row (one labelled, one unlabelled send) and an accent color. */
const drums = {
  id: 'drums',
  name: 'Drums',
  level: 0.8,
  pan: -0.25,
  muted: false,
  solo: false,
  sends: [reverb, delay],
  color: '#8b5cf6',
}

/** A channel with no sends and no accent color. */
const bass = { id: 'bass', name: 'Bass', level: 0.7, pan: 0, muted: false, solo: false }

/** A muted, soloed channel. */
const vox = { id: 'vox', name: 'Vox', level: 0.5, pan: 0.3, muted: true, solo: true }

/** The optional master column. */
const master = { id: 'master', name: 'Master', level: 0.9, pan: 0, muted: false, solo: false }

/** Both change callbacks, recorded on every case that can fire one. */
const callbacks = ['onChannelChange', 'onMasterChange']

/** `@molecule/app-feature-audio-mixer-react`. */
export const featureAudioMixerFeature: FeatureCases = {
  package: '@molecule/app-feature-audio-mixer-react',
  families: [
    {
      component: 'AudioMixer',
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // renders the translated aria labels (console, fader, pan, mute, solo).
        { name: 'one channel', props: { channels: [drums] }, callbacks },

        // Every strip branch in one render: accent color and sends (drums),
        // no sends and no color (bass), muted + soloed (vox).
        {
          name: 'three channels with mixed state',
          props: { channels: [drums, bass, vox] },
          callbacks,
        },

        // Empty and near-empty inputs.
        { name: 'no channels', props: { channels: [] }, callbacks },
        { name: 'channel without sends', props: { channels: [bass] }, callbacks },
        {
          name: 'channel with an empty sends list',
          props: { channels: [{ ...bass, sends: [] }] },
          callbacks,
        },
        {
          name: 'send without a label falls back to its id',
          props: { channels: [{ ...bass, sends: [delay] }] },
          callbacks,
        },
        {
          name: 'channel without an accent color',
          props: { channels: [{ ...drums, color: undefined }] },
          callbacks,
        },
        {
          name: 'channel with an empty name',
          props: { channels: [{ ...bass, name: '' }] },
          callbacks,
        },

        // Out-of-range inputs clamp before they reach the faders.
        {
          name: 'out-of-range levels, pans and send levels clamp',
          props: {
            channels: [
              { ...drums, level: 1.7, pan: -2.5, sends: [{ id: 'fx', label: 'FX', level: 3 }] },
              { ...bass, level: -0.4, pan: 2 },
            ],
          },
          callbacks,
        },

        // Props: default fader height, a custom one, and the class passthrough.
        {
          name: 'custom fader height',
          props: { channels: [drums], faderHeight: 240 },
          callbacks,
        },
        {
          name: 'className passthrough',
          props: { channels: [bass], className: 'parity-token' },
          callbacks,
        },

        // The master column and its branches.
        { name: 'master strip', props: { channels: [drums, bass], master }, callbacks },
        {
          name: 'master with an empty name falls back to the master label',
          props: { channels: [bass], master: { ...master, name: '' } },
          callbacks,
        },
        {
          name: 'master omits the sends row',
          props: { channels: [bass], master: { ...master, sends: [reverb] } },
          callbacks,
        },

        // Interactions: fader, pan, mute, solo, sends, then the master column.
        {
          name: 'fader moves',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            { type: 'input', selector: '[data-mol-id="audio-mixer-fader"]', value: '0.42' },
          ],
        },
        {
          name: 'fader above the range clamps',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            { type: 'input', selector: '[data-mol-id="audio-mixer-fader"]', value: '7' },
          ],
        },
        {
          name: 'fader below the range clamps',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            { type: 'input', selector: '[data-mol-id="audio-mixer-fader"]', value: '-3' },
          ],
        },
        {
          name: 'pan knob moves',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            { type: 'input', selector: '[data-mol-id="audio-mixer-pan"]', value: '0.5' },
          ],
        },
        {
          name: 'pan above the range clamps',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            { type: 'input', selector: '[data-mol-id="audio-mixer-pan"]', value: '4' },
          ],
        },
        {
          name: 'mute toggles on',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            {
              type: 'click',
              selector: '[data-channel-id="drums"] [data-mol-id="audio-mixer-mute"]',
            },
          ],
        },
        {
          name: 'mute toggles off',
          props: { channels: [drums, vox] },
          callbacks,
          interactions: [
            { type: 'click', selector: '[data-channel-id="vox"] [data-mol-id="audio-mixer-mute"]' },
          ],
        },
        {
          name: 'solo toggles on',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            {
              type: 'click',
              selector: '[data-channel-id="bass"] [data-mol-id="audio-mixer-solo"]',
            },
          ],
        },
        {
          name: 'solo toggles off',
          props: { channels: [drums, vox] },
          callbacks,
          interactions: [
            { type: 'click', selector: '[data-channel-id="vox"] [data-mol-id="audio-mixer-solo"]' },
          ],
        },
        {
          name: 'send fader moves',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            {
              type: 'input',
              selector: '[data-send-id="reverb"] [data-mol-id="audio-mixer-send-fader"]',
              value: '0.6',
            },
          ],
        },
        {
          name: 'send fader above the range clamps',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            {
              type: 'input',
              selector: '[data-send-id="delay"] [data-mol-id="audio-mixer-send-fader"]',
              value: '9',
            },
          ],
        },
        {
          name: 'master fader moves',
          props: { channels: [bass], master },
          callbacks,
          interactions: [
            { type: 'input', selector: '[data-mol-id="audio-mixer-master-fader"]', value: '0.55' },
          ],
        },
        {
          name: 'master pan moves',
          props: { channels: [bass], master },
          callbacks,
          interactions: [
            {
              type: 'input',
              selector: '[data-mol-id="audio-mixer-master-strip"] [data-mol-id="audio-mixer-pan"]',
              value: '-0.4',
            },
          ],
        },
        {
          name: 'master mute toggles',
          props: { channels: [bass], master },
          callbacks,
          interactions: [
            {
              type: 'click',
              selector: '[data-mol-id="audio-mixer-master-strip"] [data-mol-id="audio-mixer-mute"]',
            },
          ],
        },
        {
          name: 'master solo toggles',
          props: { channels: [bass], master },
          callbacks,
          interactions: [
            {
              type: 'click',
              selector: '[data-mol-id="audio-mixer-master-strip"] [data-mol-id="audio-mixer-solo"]',
            },
          ],
        },

        // A whole sequence on one channel: fader, pan, mute, send.
        {
          name: 'a channel changes one field at a time',
          props: { channels: [drums, bass], master },
          callbacks,
          interactions: [
            { type: 'input', selector: '[data-mol-id="audio-mixer-fader"]', value: '0.3' },
            { type: 'input', selector: '[data-mol-id="audio-mixer-pan"]', value: '-0.9' },
            {
              type: 'click',
              selector: '[data-channel-id="drums"] [data-mol-id="audio-mixer-mute"]',
            },
            {
              type: 'input',
              selector: '[data-send-id="reverb"] [data-mol-id="audio-mixer-send-fader"]',
              value: '0.15',
            },
          ],
        },

        // Prop changes: reorder, level/pan/state, color, sends, height, master.
        {
          name: 'channels prop is replaced',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            { type: 'props', props: { channels: [bass, drums, vox] } },
            { type: 'props', props: { channels: [] } },
          ],
        },
        {
          name: 'channel level and pan change',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            { type: 'props', props: { channels: [{ ...drums, level: 0.2, pan: 0.8 }, bass] } },
            { type: 'props', props: { channels: [{ ...drums, level: 1.5, pan: -5 }, bass] } },
          ],
        },
        {
          name: 'channel mute and solo change',
          props: { channels: [drums, bass] },
          callbacks,
          interactions: [
            { type: 'props', props: { channels: [drums, { ...bass, muted: true, solo: true }] } },
          ],
        },
        {
          name: 'channel color and sends change',
          props: { channels: [bass] },
          callbacks,
          interactions: [
            {
              type: 'props',
              props: { channels: [{ ...bass, color: '#22c55e', sends: [reverb] }] },
            },
            { type: 'props', props: { channels: [{ ...bass, color: undefined, sends: [] }] } },
          ],
        },
        {
          name: 'fader height and className change',
          props: { channels: [drums] },
          callbacks,
          interactions: [
            { type: 'props', props: { faderHeight: 120 } },
            { type: 'props', props: { faderHeight: undefined, className: 'parity-token' } },
          ],
        },
        {
          name: 'master appears and disappears',
          props: { channels: [bass] },
          callbacks,
          interactions: [
            { type: 'props', props: { master } },
            { type: 'props', props: { master: { ...master, name: '', level: 0.4 } } },
            { type: 'props', props: { master: undefined } },
          ],
        },
        {
          name: 'master fader changes with the prop',
          props: { channels: [bass], master },
          callbacks,
          interactions: [{ type: 'props', props: { master: { ...master, level: 0.1, pan: 1 } } }],
        },
      ],
    },
  ],
  values: [
    { export: 'MIN_LEVEL' },
    { export: 'MAX_LEVEL' },
    { export: 'MIN_PAN' },
    { export: 'MAX_PAN' },
    {
      export: 'clampLevel',
      calls: [
        [0],
        [0.5],
        [1],
        [-0.5],
        [1.7],
        [Number.NaN],
        [Number.POSITIVE_INFINITY],
        [Number.NEGATIVE_INFINITY],
      ],
    },
    {
      export: 'clampPan',
      calls: [
        [-1],
        [0],
        [1],
        [-2.5],
        [3],
        [Number.NaN],
        [Number.POSITIVE_INFINITY],
        [Number.NEGATIVE_INFINITY],
      ],
    },
  ],
}
