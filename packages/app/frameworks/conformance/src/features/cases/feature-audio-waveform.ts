/**
 * `@molecule/app-feature-audio-waveform-react` cases: the SVG waveform renderer
 * of pre-computed peaks, its progress overlay, click-to-seek and timed region
 * markers, plus its `clamp` / `seekTimeFromClick` helpers.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Eight peaks inside `[0, 1]` — the shape a typical audio analysis returns. */
const peaks = [0.1, 0.3, 0.6, 0.9, 0.8, 0.5, 0.2, 0.7]

/**
 * More peaks than the renderer's gap budget (`floor(1000 / 8) = 125`), so the
 * bar geometry exercises the capped gap and the narrow bars.
 */
const manyPeaks = Array.from({ length: 130 }, (_value, i) => ((i * 37) % 100) / 100)

/** The SVG the click handler reads its bounding box from. */
const svgSelector = '[data-mol-id="audio-waveform-svg"]'

/** `@molecule/app-feature-audio-waveform-react`. */
export const featureAudioWaveformFeature: FeatureCases = {
  package: '@molecule/app-feature-audio-waveform-react',
  families: [
    {
      component: 'AudioWaveform',
      cases: [
        { name: 'empty peaks', props: { peaks: [], duration: 60 } },
        {
          name: 'empty peaks with a className',
          props: { peaks: [], duration: 60, className: 'parity-token' },
        },
        { name: 'single peak', props: { peaks: [0.5], duration: 10 } },
        { name: 'eight peaks', props: { peaks, duration: 60 } },
        { name: 'many peaks', props: { peaks: manyPeaks, duration: 120 } },
        {
          name: 'peaks out of range',
          props: { peaks: [1.5, -0.5, 0, 2], duration: 10 },
        },
        { name: 'all-zero peaks', props: { peaks: [0, 0, 0, 0], duration: 10 } },
        { name: 'progress at the midpoint', props: { peaks, duration: 60, currentTime: 30 } },
        {
          name: 'progress beyond the duration clamps',
          props: { peaks, duration: 60, currentTime: 9999 },
        },
        {
          name: 'negative progress clamps',
          props: { peaks, duration: 60, currentTime: -5 },
        },
        { name: 'custom height', props: { peaks, duration: 60, height: 120 } },
        {
          name: 'custom colors',
          props: { peaks, duration: 60, progressColor: '#abcdef', waveColor: '#123456' },
        },
        {
          name: 'className passthrough',
          props: { peaks, duration: 60, className: 'parity-token' },
        },
        { name: 'negative duration', props: { peaks, duration: -10 } },
        {
          name: 'interactive waveform',
          props: { peaks, duration: 60 },
          callbacks: ['onSeek'],
          layout: [{ selector: svgSelector, rect: { width: 200, height: 64 } }],
          interactions: [{ type: 'click', selector: svgSelector }],
        },
        {
          name: 'click before the waveform origin clamps to zero',
          props: { peaks, duration: 60 },
          callbacks: ['onSeek'],
          layout: [{ selector: svgSelector, rect: { x: -100, width: 200, height: 64 } }],
          interactions: [{ type: 'click', selector: svgSelector }],
        },
        {
          name: 'interactive with a custom height and colors',
          props: {
            peaks,
            duration: 60,
            currentTime: 15,
            height: 100,
            progressColor: '#111111',
            waveColor: '#222222',
            className: 'everything',
          },
          callbacks: ['onSeek'],
          layout: [{ selector: svgSelector, rect: { x: -50, width: 100, height: 100 } }],
          interactions: [{ type: 'click', selector: svgSelector }],
        },
        {
          name: 'zero duration is not interactive',
          props: { peaks, duration: 0 },
          callbacks: ['onSeek'],
          layout: [{ selector: svgSelector, rect: { width: 200, height: 64 } }],
          interactions: [{ type: 'click', selector: svgSelector }],
        },
        {
          name: 'regions',
          props: {
            peaks,
            duration: 60,
            regions: [
              { id: 'r1', startTime: 0, duration: 30 },
              { id: 'r2', startTime: 30, duration: 30, color: '#ff000088' },
            ],
          },
        },
        {
          name: 'invalid regions are skipped',
          props: {
            peaks,
            duration: 60,
            regions: [
              { id: 'good', startTime: 0, duration: 5 },
              { id: 'zero', startTime: 5, duration: 0 },
              { id: 'negative', startTime: 10, duration: -1 },
            ],
          },
        },
        {
          name: 'regions clamp to the duration',
          props: {
            peaks,
            duration: 60,
            regions: [{ id: 'overflow', startTime: 30, duration: 9999 }],
          },
        },
        {
          name: 'a region past the end is hidden',
          props: {
            peaks,
            duration: 60,
            regions: [{ id: 'late', startTime: 120, duration: 5 }],
          },
        },
        { name: 'an empty regions array', props: { peaks, duration: 60, regions: [] } },
        {
          name: 'regions need a positive duration',
          props: {
            peaks,
            duration: 0,
            regions: [{ id: 'hidden', startTime: 0, duration: 5 }],
          },
        },
        {
          name: 'currentTime changes',
          props: { peaks, duration: 60, currentTime: 0 },
          interactions: [{ type: 'props', props: { currentTime: 45 } }],
        },
        {
          name: 'peaks change',
          props: { peaks: [0.2, 0.4], duration: 60 },
          interactions: [{ type: 'props', props: { peaks: [0.9, 0.1, 0.5, 0.3] } }],
        },
        {
          name: 'height and colors change',
          props: { peaks, duration: 60 },
          interactions: [
            {
              type: 'props',
              props: { height: 120, progressColor: '#ffffff', waveColor: '#000000' },
            },
          ],
        },
        {
          name: 'regions change',
          props: {
            peaks,
            duration: 60,
            regions: [{ id: 'first', startTime: 0, duration: 10 }],
          },
          interactions: [
            {
              type: 'props',
              props: {
                regions: [
                  { id: 'second', startTime: 20, duration: 10 },
                  { id: 'third', startTime: 40, duration: 10, color: '#00ff00' },
                ],
              },
            },
          ],
        },
        {
          name: 'className change',
          props: { peaks, duration: 60, className: 'first-class' },
          interactions: [{ type: 'props', props: { className: 'second-class' } }],
        },
        { name: 'a non-finite duration', props: { peaks, duration: NaN } },
        { name: 'a non-finite currentTime', props: { peaks, duration: 60, currentTime: NaN } },
        { name: 'a non-finite peak', props: { peaks: [NaN, 0.5], duration: 60 } },
      ],
    },
  ],
  values: [
    {
      export: 'clamp',
      calls: [
        [0.5, 0, 1],
        [-1, 0, 1],
        [2, 0, 1],
        [NaN, 0, 1],
        [NaN, 5, 10],
        [Infinity, 5, 10],
        [-Infinity, 5, 10],
        [0.5, 10, 0],
        [10, 0, 10],
      ],
    },
    {
      export: 'seekTimeFromClick',
      calls: [
        [50, 0, 60],
        [50, 100, 0],
        [50, -1, 60],
        [50, 100, -1],
        [50, 100, 60],
        [-10, 100, 60],
        [200, 100, 60],
        [25, 100, 80],
        [NaN, 100, 60],
        [50, NaN, 60],
        [50, 100, Infinity],
        [0, 100, 60],
        [100, 100, 60],
      ],
    },
  ],
}
