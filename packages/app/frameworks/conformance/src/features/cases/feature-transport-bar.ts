/**
 * `@molecule/app-feature-transport-bar-react` cases: the playback transport
 * bar — the toolbar region, the play/pause, stop, skip, record and loop
 * buttons (each with its translated `aria-label` and its pressed state), and
 * the time-display slot.
 *
 * Every button renders conditionally (the skip, record and loop buttons exist
 * only while their handler is provided), `canStop` / `canSkip` disable an
 * existing button, and the time-display div renders only while the slot value
 * is truthy — `timeDisplay` wins over `children` unless it is `null` or
 * `undefined`.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The play/pause button's selector (its `data-mol-id`). */
const playSelector = 'button[data-mol-id="transport-bar-play-toggle"]'
/** The stop button's selector. */
const stopSelector = 'button[data-mol-id="transport-bar-stop"]'
/** The skip-back button's selector. */
const skipBackSelector = 'button[data-mol-id="transport-bar-skip-back"]'
/** The skip-forward button's selector. */
const skipForwardSelector = 'button[data-mol-id="transport-bar-skip-forward"]'
/** The record button's selector. */
const recordSelector = 'button[data-mol-id="transport-bar-record-toggle"]'
/** The loop button's selector. */
const loopSelector = 'button[data-mol-id="transport-bar-loop-toggle"]'

/** The time-display slot's content, as a caller would pass it. */
const timeNodes = [
  { tag: 'span', attrs: { 'data-mol-id': 'custom-time' }, children: ['0:00 / 1:23'] },
]

/** The same slot's content, passed as `children` instead. */
const childTimeNodes = [{ tag: 'span', attrs: { 'data-mol-id': 'child-time' }, children: ['0:42'] }]

/** Every callback prop, so every conditional button renders. */
const allCallbacks = [
  'onPlayToggle',
  'onStop',
  'onSkipBack',
  'onSkipForward',
  'onRecordToggle',
  'onLoopToggle',
]

/** `@molecule/app-feature-transport-bar-react`. */
export const featureTransportBarFeature: FeatureCases = {
  package: '@molecule/app-feature-transport-bar-react',
  families: [
    {
      component: 'TransportBar',
      cases: [
        { name: 'defaults', props: { isPlaying: false }, callbacks: ['onPlayToggle', 'onStop'] },
        { name: 'playing', props: { isPlaying: true }, callbacks: ['onPlayToggle', 'onStop'] },
        // React's `aria-pressed={isPlaying}`: an absent prop leaves the
        // attribute off and keeps the paused branch.
        { name: 'isPlaying omitted', callbacks: ['onPlayToggle', 'onStop'] },
        {
          name: 'stop disabled by canStop',
          props: { isPlaying: false, canStop: false },
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'stop explicitly enabled',
          props: { isPlaying: false, canStop: true },
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'skip handlers render both skip buttons',
          props: { isPlaying: false },
          callbacks: ['onPlayToggle', 'onStop', 'onSkipBack', 'onSkipForward'],
        },
        {
          name: 'skip buttons disabled by canSkip',
          props: { isPlaying: false, canSkip: false },
          callbacks: ['onPlayToggle', 'onStop', 'onSkipBack', 'onSkipForward'],
        },
        {
          name: 'skip buttons explicitly enabled',
          props: { isPlaying: false, canSkip: true },
          callbacks: ['onPlayToggle', 'onStop', 'onSkipBack', 'onSkipForward'],
        },
        {
          name: 'record button while idle',
          props: { isPlaying: false, isRecording: false },
          callbacks: ['onPlayToggle', 'onStop', 'onRecordToggle'],
        },
        {
          name: 'record button while recording',
          props: { isPlaying: false, isRecording: true },
          callbacks: ['onPlayToggle', 'onStop', 'onRecordToggle'],
        },
        {
          name: 'record handler without isRecording',
          props: { isPlaying: false },
          callbacks: ['onPlayToggle', 'onStop', 'onRecordToggle'],
        },
        {
          name: 'loop button off',
          props: { isPlaying: false, loop: false },
          callbacks: ['onPlayToggle', 'onStop', 'onLoopToggle'],
        },
        {
          name: 'loop button on',
          props: { isPlaying: false, loop: true },
          callbacks: ['onPlayToggle', 'onStop', 'onLoopToggle'],
        },
        {
          name: 'loop handler without loop',
          props: { isPlaying: false },
          callbacks: ['onPlayToggle', 'onStop', 'onLoopToggle'],
        },
        {
          name: 'every control',
          props: {
            isPlaying: true,
            isRecording: true,
            canStop: true,
            canSkip: true,
            loop: true,
          },
          callbacks: allCallbacks,
        },
        {
          name: 'no callbacks',
          props: { isPlaying: false, isRecording: true, loop: true },
        },
        {
          name: 'className passthrough',
          props: { isPlaying: false, className: 'parity-token' },
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'time-display slot',
          props: { isPlaying: false },
          slots: { timeDisplay: timeNodes },
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'time-display node prop',
          props: { isPlaying: false, timeDisplay: { $nodes: timeNodes } },
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'time-display text',
          props: { isPlaying: false, timeDisplay: '0:42 / 3:10' },
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'time-display number',
          props: { isPlaying: false, timeDisplay: 42 },
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'children slot',
          props: { isPlaying: false },
          children: childTimeNodes,
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'children text',
          props: { isPlaying: false },
          children: ['0:42'],
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'time display wins over children',
          props: { isPlaying: false, timeDisplay: { $nodes: timeNodes } },
          children: childTimeNodes,
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'null time display falls back to children',
          props: { isPlaying: false, timeDisplay: null },
          children: childTimeNodes,
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'empty time display renders no slot',
          props: { isPlaying: false, timeDisplay: '' },
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'zero time display renders no slot',
          props: { isPlaying: false, timeDisplay: 0 },
          callbacks: ['onPlayToggle', 'onStop'],
        },
        {
          name: 'every button calls its callback',
          props: { isPlaying: false, isRecording: false, loop: false },
          callbacks: allCallbacks,
          interactions: [
            { type: 'click', selector: skipBackSelector },
            { type: 'click', selector: playSelector },
            { type: 'click', selector: stopSelector },
            { type: 'click', selector: skipForwardSelector },
            { type: 'click', selector: recordSelector },
            { type: 'click', selector: loopSelector },
          ],
        },
        {
          name: 'play state changes from the parent',
          props: { isPlaying: false },
          callbacks: ['onPlayToggle', 'onStop'],
          interactions: [
            { type: 'props', props: { isPlaying: true } },
            { type: 'props', props: { isPlaying: false } },
          ],
        },
        {
          name: 'record state changes from the parent',
          props: { isPlaying: false, isRecording: false },
          callbacks: ['onPlayToggle', 'onStop', 'onRecordToggle'],
          interactions: [
            { type: 'props', props: { isRecording: true } },
            { type: 'props', props: { isRecording: false } },
          ],
        },
        {
          name: 'loop state changes from the parent',
          props: { isPlaying: false, loop: false },
          callbacks: ['onPlayToggle', 'onStop', 'onLoopToggle'],
          interactions: [
            { type: 'props', props: { loop: true } },
            { type: 'props', props: { loop: false } },
          ],
        },
        {
          name: 'stop disabled and enabled from the parent',
          props: { isPlaying: false, canStop: false },
          callbacks: ['onPlayToggle', 'onStop'],
          interactions: [{ type: 'props', props: { canStop: true } }],
        },
        {
          name: 'skip handlers added after mount',
          props: { isPlaying: false },
          callbacks: ['onPlayToggle', 'onStop'],
          interactions: [
            {
              type: 'props',
              props: { onSkipBack: { $callback: 'onSkipBack' }, canSkip: false },
            },
            {
              type: 'props',
              props: { onSkipForward: { $callback: 'onSkipForward' }, canSkip: true },
            },
          ],
        },
        {
          name: 'record and loop handlers added after mount',
          props: { isPlaying: false },
          callbacks: ['onPlayToggle', 'onStop'],
          interactions: [
            {
              type: 'props',
              props: {
                onRecordToggle: { $callback: 'onRecordToggle' },
                onLoopToggle: { $callback: 'onLoopToggle' },
              },
            },
          ],
        },
        {
          name: 'record handler removed after mount',
          // The handler starts as a callback prop (a spy), not a `callbacks`
          // entry, so a later `props` step can take it away again.
          props: {
            isPlaying: false,
            isRecording: true,
            onRecordToggle: { $callback: 'onRecordToggle' },
          },
          callbacks: ['onPlayToggle', 'onStop'],
          interactions: [{ type: 'props', props: { onRecordToggle: undefined } }],
        },
        {
          name: 'className changes from the parent',
          props: { isPlaying: false, className: 'parity-token' },
          callbacks: ['onPlayToggle', 'onStop'],
          interactions: [{ type: 'props', props: { className: 'other-token' } }],
        },
        {
          name: 'time display added after mount',
          props: { isPlaying: false },
          callbacks: ['onPlayToggle', 'onStop'],
          interactions: [{ type: 'props', props: { timeDisplay: { $nodes: timeNodes } } }],
        },
        {
          name: 'time display text changes from the parent',
          props: { isPlaying: false, timeDisplay: '0:00 / 1:23' },
          callbacks: ['onPlayToggle', 'onStop'],
          interactions: [{ type: 'props', props: { timeDisplay: '0:05 / 1:23' } }],
        },
        {
          name: 'time display removed after mount',
          props: { isPlaying: false, timeDisplay: { $nodes: timeNodes } },
          callbacks: ['onPlayToggle', 'onStop'],
          interactions: [{ type: 'props', props: { timeDisplay: undefined } }],
        },
      ],
    },
  ],
}
