/**
 * `@molecule/app-now-playing-bar-react` cases: the empty state, artwork, title /
 * artist, transport controls, scrubber, volume control, the trailing slot and
 * the `formatTime` helper.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const artwork = 'https://example.test/art.jpg'

/** The references every non-empty case passes as required callbacks. */
const required = ['onPlay', 'onPause', 'onSeek']

/** A complete track, with artwork. */
const track = { id: 't1', title: 'Midnight City', artist: 'M83', artwork }

/** The scrubber and time fields of a playing track. */
const timing = { currentTime: 65, duration: 245 }

/** `@molecule/app-now-playing-bar-react`. */
export const nowPlayingBarFeature: FeatureCases = {
  package: '@molecule/app-now-playing-bar-react',
  families: [
    {
      component: 'NowPlayingBar',
      cases: [
        {
          name: 'empty state when track is null',
          props: { track: null, isPlaying: false, currentTime: 0, duration: 0 },
          callbacks: required,
        },
        {
          name: 'empty state when track is omitted',
          props: { isPlaying: false, currentTime: 0, duration: 0 },
          callbacks: required,
        },
        {
          name: 'track with title, artist and artwork',
          props: { track, isPlaying: false, ...timing },
          callbacks: required,
        },
        {
          name: 'artwork placeholder when the track has no artwork',
          props: {
            track: { id: 't2', title: 'Empty', artist: 'Nobody' },
            isPlaying: false,
            currentTime: 0,
            duration: 0,
          },
          callbacks: required,
        },
        {
          name: 'playing shows the pause glyph and aria-pressed',
          props: { track, isPlaying: true, ...timing },
          callbacks: required,
        },
        {
          name: 'next and previous controls when their handlers are provided',
          props: { track, isPlaying: false, ...timing },
          callbacks: [...required, 'onPrev', 'onNext'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="now-playing-bar-prev"]' },
            { type: 'click', selector: '[data-mol-id="now-playing-bar-next"]' },
          ],
        },
        {
          name: 'the toggle plays while paused',
          props: { track, isPlaying: false, ...timing },
          callbacks: required,
          interactions: [{ type: 'click', selector: '[data-mol-id="now-playing-bar-play"]' }],
        },
        {
          name: 'the toggle pauses while playing',
          props: { track, isPlaying: true, ...timing },
          callbacks: required,
          interactions: [{ type: 'click', selector: '[data-mol-id="now-playing-bar-play"]' }],
        },
        {
          name: 'current time and duration are formatted as m:ss',
          props: { track, isPlaying: false, currentTime: 65, duration: 245 },
          callbacks: required,
        },
        {
          name: 'a zero duration clamps the scrubber to zero',
          props: { track, isPlaying: false, currentTime: 30, duration: 0 },
          callbacks: required,
        },
        {
          name: 'a current time past the duration clamps the scrubber',
          props: { track, isPlaying: false, currentTime: 300, duration: 180 },
          callbacks: required,
        },
        {
          name: 'scrubbing calls onSeek with a number',
          props: { track, isPlaying: false, ...timing },
          callbacks: required,
          interactions: [
            { type: 'input', selector: '[data-mol-id="now-playing-bar-seek"]', value: '42' },
          ],
        },
        {
          name: 'volume is hidden without a change handler',
          props: { track, isPlaying: false, ...timing, volume: 0.5 },
          callbacks: required,
        },
        {
          name: 'volume is hidden without a level',
          props: { track, isPlaying: false, ...timing },
          callbacks: [...required, 'onVolumeChange'],
        },
        {
          name: 'volume control with an audible level',
          props: { track, isPlaying: false, ...timing, volume: 0.5 },
          callbacks: [...required, 'onVolumeChange'],
        },
        {
          name: 'a muted volume shows the muted glyph',
          props: { track, isPlaying: false, ...timing, volume: 0 },
          callbacks: [...required, 'onVolumeChange'],
        },
        {
          name: 'changing the volume calls onVolumeChange with a number',
          props: { track, isPlaying: false, ...timing, volume: 0.5 },
          callbacks: [...required, 'onVolumeChange'],
          interactions: [
            {
              type: 'input',
              selector: '[data-mol-id="now-playing-bar-volume-slider"]',
              value: '0.8',
            },
          ],
        },
        {
          name: 'trailing slot',
          props: { track, isPlaying: false, ...timing },
          callbacks: required,
          slots: {
            trailing: [
              {
                tag: 'button',
                attrs: { type: 'button', 'data-mol-id': 'custom-queue' },
                children: ['Q'],
              },
            ],
          },
        },
        {
          name: 'className is merged onto the root element',
          props: { track, isPlaying: false, ...timing, className: 'parity-token' },
          callbacks: required,
        },
        {
          name: 'playing state changes',
          props: { track, isPlaying: false, ...timing },
          callbacks: required,
          interactions: [{ type: 'props', props: { isPlaying: true } }],
        },
        {
          name: 'the track changes',
          props: { track, isPlaying: false, ...timing },
          callbacks: required,
          interactions: [
            {
              type: 'props',
              props: { track: { id: 't9', title: 'Outro', artist: 'M83' } },
            },
          ],
        },
        {
          name: 'the empty state becomes a playing track',
          props: { track: null, isPlaying: false, currentTime: 0, duration: 0 },
          callbacks: required,
          interactions: [{ type: 'props', props: { track, isPlaying: true, ...timing } }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'formatTime',
      calls: [[0], [60], [125], [59.9], [61.5], [3600], [NaN], [Infinity], [-1]],
    },
  ],
}
