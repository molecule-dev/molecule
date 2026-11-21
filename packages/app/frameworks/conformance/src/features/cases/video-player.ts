/**
 * `@molecule/app-video-player-react` cases: the HTML5 video player chrome — the
 * `<video>` element with its captions track, the controls row with
 * play/pause, elapsed / total time, the seek range, the mute toggle and the
 * fullscreen button.
 *
 * `VideoPlayer` is the package's only runtime export (the rest of its public
 * surface is types). Media events never fire on their own in jsdom, so the
 * playback branches are driven by dispatching `play`, `pause`, `ended`,
 * `timeupdate` and `loadedmetadata` on the `<video>` element, and the seek
 * branch by typing into the range input first (its `timeupdate` then reads the
 * position the seek wrote). The buttons carry no `data-mol-id` in React, so
 * they are found by their `aria-label`.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The play control's selector while the player is idle (React's `aria-label="Play"`). */
const playSelector = 'button[aria-label="Play"]'
/** The pause control's selector while the player is playing (React's `aria-label="Pause"`). */
const pauseSelector = 'button[aria-label="Pause"]'
/** The mute control's selector while unmuted (React's `aria-label="Mute"`). */
const muteSelector = 'button[aria-label="Mute"]'
/** The mute control's selector while muted (React's `aria-label="Unmute"`). */
const unmuteSelector = 'button[aria-label="Unmute"]'
/** The fullscreen control's selector. */
const fullscreenSelector = 'button[aria-label="Fullscreen"]'
/** The seek range input's selector. */
const seekSelector = 'input[type="range"]'
/** The media element. */
const videoSelector = 'video'

/** `@molecule/app-video-player-react`. */
export const videoPlayerFeature: FeatureCases = {
  package: '@molecule/app-video-player-react',
  families: [
    {
      component: 'VideoPlayer',
      cases: [
        { name: 'defaults', props: { src: 'clip.mp4' } },
        { name: 'poster', props: { src: 'clip.mp4', poster: 'poster.jpg' } },
        {
          name: 'captions with the default language',
          props: { src: 'clip.mp4', captionsSrc: 'caps.vtt' },
        },
        {
          name: 'captions with another language',
          props: { src: 'clip.mp4', captionsSrc: 'caps.vtt', captionsLang: 'fr' },
        },
        {
          name: 'empty captionsSrc renders a track with no source',
          props: { src: 'clip.mp4', captionsSrc: '' },
        },
        {
          name: 'captions label passthrough',
          props: { src: 'clip.mp4', captionsSrc: 'caps.vtt', captionsLabel: 'English' },
        },
        { name: 'default muted', props: { src: 'clip.mp4', defaultMuted: true } },
        { name: 'explicitly unmuted', props: { src: 'clip.mp4', defaultMuted: false } },
        { name: 'autoplay', props: { src: 'clip.mp4', autoPlay: true } },
        {
          name: 'className passthrough',
          props: { src: 'clip.mp4', className: 'parity-token' },
        },
        {
          name: 'everything at once',
          props: {
            src: 'clip.mp4',
            poster: 'poster.jpg',
            captionsSrc: 'caps.vtt',
            captionsLang: 'de',
            defaultMuted: true,
            autoPlay: true,
            className: 'parity-token',
          },
        },
        {
          name: 'toggle click while paused starts playback',
          props: { src: 'clip.mp4' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [{ type: 'click', selector: playSelector }],
        },
        {
          name: 'play event calls onPlay and shows the pause glyph',
          props: { src: 'clip.mp4' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [{ type: 'event', selector: videoSelector, event: 'play' }],
        },
        {
          name: 'pause event calls onPause and shows the play glyph',
          props: { src: 'clip.mp4' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [{ type: 'event', selector: videoSelector, event: 'pause' }],
        },
        {
          name: 'ended event calls onEnded and shows the play glyph',
          props: { src: 'clip.mp4' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [{ type: 'event', selector: videoSelector, event: 'ended' }],
        },
        {
          name: 'play then pause',
          props: { src: 'clip.mp4' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [
            { type: 'event', selector: videoSelector, event: 'play' },
            { type: 'event', selector: videoSelector, event: 'pause' },
          ],
        },
        {
          name: 'play then ended',
          props: { src: 'clip.mp4' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [
            { type: 'event', selector: videoSelector, event: 'play' },
            { type: 'event', selector: videoSelector, event: 'ended' },
          ],
        },
        {
          name: 'toggle click after a play event',
          props: { src: 'clip.mp4' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [
            { type: 'event', selector: videoSelector, event: 'play' },
            { type: 'click', selector: pauseSelector },
          ],
        },
        {
          name: 'mute toggle unmutes the player',
          props: { src: 'clip.mp4' },
          interactions: [{ type: 'click', selector: muteSelector }],
        },
        {
          name: 'mute toggle twice returns to unmuted',
          props: { src: 'clip.mp4' },
          interactions: [
            { type: 'click', selector: muteSelector },
            { type: 'click', selector: unmuteSelector },
          ],
        },
        {
          name: 'mute toggle from a muted start unmutes',
          props: { src: 'clip.mp4', defaultMuted: true },
          interactions: [{ type: 'click', selector: unmuteSelector }],
        },
        {
          name: 'fullscreen button click',
          props: { src: 'clip.mp4' },
          interactions: [{ type: 'click', selector: fullscreenSelector }],
        },
        {
          name: 'seek then timeupdate shows the new position',
          props: { src: 'clip.mp4' },
          interactions: [
            { type: 'input', selector: seekSelector, value: '65' },
            { type: 'event', selector: videoSelector, event: 'timeupdate' },
          ],
        },
        {
          name: 'seek a fractional position',
          props: { src: 'clip.mp4' },
          interactions: [
            { type: 'input', selector: seekSelector, value: '125.6' },
            { type: 'event', selector: videoSelector, event: 'timeupdate' },
          ],
        },
        {
          name: 'timeupdate before any seek keeps the position',
          props: { src: 'clip.mp4' },
          interactions: [{ type: 'event', selector: videoSelector, event: 'timeupdate' }],
        },
        {
          name: 'loaded metadata keeps the 0:00 duration',
          props: { src: 'clip.mp4' },
          interactions: [{ type: 'event', selector: videoSelector, event: 'loadedmetadata' }],
        },
        {
          name: 'arrow key press on the seek control keeps the position',
          props: { src: 'clip.mp4' },
          interactions: [{ type: 'keydown', selector: seekSelector, key: 'ArrowRight' }],
        },
        {
          name: 'src and className change from the parent',
          props: { src: 'clip.mp4', className: 'parity-token' },
          interactions: [{ type: 'props', props: { src: 'other.mp4', className: 'other-token' } }],
        },
        {
          name: 'poster added and removed after mount',
          props: { src: 'clip.mp4' },
          interactions: [
            { type: 'props', props: { poster: 'poster.jpg' } },
            { type: 'props', props: { poster: undefined } },
          ],
        },
        {
          name: 'captions added and removed after mount',
          props: { src: 'clip.mp4' },
          interactions: [
            { type: 'props', props: { captionsSrc: 'caps.vtt' } },
            { type: 'props', props: { captionsSrc: undefined } },
          ],
        },
        {
          name: 'captions language changes from the parent',
          props: { src: 'clip.mp4', captionsSrc: 'caps.vtt', captionsLang: 'en' },
          interactions: [{ type: 'props', props: { captionsLang: 'ja' } }],
        },
        {
          name: 'defaultMuted changes after mount keep the captured state',
          props: { src: 'clip.mp4', defaultMuted: true },
          interactions: [{ type: 'props', props: { defaultMuted: false } }],
        },
        {
          name: 'autoplay added after mount',
          props: { src: 'clip.mp4' },
          interactions: [{ type: 'props', props: { autoPlay: true } }],
        },
      ],
    },
  ],
}
