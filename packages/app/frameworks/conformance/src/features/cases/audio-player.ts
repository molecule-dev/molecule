/**
 * `@molecule/app-audio-player-react` cases: the HTML5 audio player chrome —
 * the hidden `<audio>` element, the optional title / subtitle header, the
 * visualizer slot, the elapsed / total time display, and the play/pause, seek
 * and mute controls.
 *
 * `AudioPlayer` is the package's only runtime export (the rest of its public
 * surface is types). Media events never fire on their own in jsdom, so the
 * playback branches are driven by dispatching `play`, `pause`, `ended`,
 * `timeupdate` and `loadedmetadata` on the `<audio>` element, and the seek
 * branch by typing into the range input first (its `timeupdate` then reads the
 * position the seek wrote).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The visualizer slot's content: a plain element, as a waveform would be. */
const visualizerNodes = [{ tag: 'canvas', attrs: { 'data-viz': '' } }]

/** The play/pause control's selector (its `data-mol-id`). */
const toggleSelector = 'button[data-mol-id="audio-player-toggle"]'
/** The mute control's selector (its `data-mol-id`). */
const muteSelector = 'button[data-mol-id="audio-player-mute"]'
/** The seek range input's selector. */
const seekSelector = 'input[type="range"]'
/** The hidden media element. */
const audioSelector = 'audio'

/** `@molecule/app-audio-player-react`. */
export const audioPlayerFeature: FeatureCases = {
  package: '@molecule/app-audio-player-react',
  families: [
    {
      component: 'AudioPlayer',
      cases: [
        { name: 'defaults', props: { src: 'episode.mp3' } },
        {
          name: 'title and subtitle',
          props: { src: 'episode.mp3', title: 'Episode 1', subtitle: 'My Podcast' },
        },
        { name: 'title only', props: { src: 'episode.mp3', title: 'Episode 1' } },
        { name: 'subtitle only', props: { src: 'episode.mp3', subtitle: 'My Podcast' } },
        {
          name: 'node title and subtitle',
          props: { src: 'episode.mp3' },
          slots: {
            title: [{ tag: 'em', children: ['Episode 1'] }],
            subtitle: ['My ', { tag: 'strong', children: ['Podcast'] }],
          },
        },
        {
          name: 'empty title and subtitle render no header',
          props: { src: 'episode.mp3', title: '', subtitle: '' },
        },
        {
          name: 'visualizer slot',
          props: { src: 'episode.mp3' },
          slots: { visualizer: visualizerNodes },
        },
        {
          name: 'visualizer node prop',
          props: { src: 'episode.mp3', visualizer: { $nodes: visualizerNodes } },
        },
        { name: 'visualizer text', props: { src: 'episode.mp3', visualizer: 'waveform' } },
        {
          name: 'captions track',
          props: {
            src: 'episode.mp3',
            captions: 'captions-en.vtt',
            captionsLang: 'en',
            captionsLabel: 'English',
          },
        },
        {
          name: 'captions track with the i18n label',
          props: { src: 'episode.mp3', captions: 'captions-en.vtt', captionsLang: 'en' },
        },
        {
          name: 'captions line shows each cue playback reaches',
          props: { src: 'episode.mp3', captions: 'captions-en.vtt', captionsLang: 'en' },
          interactions: [
            { type: 'cues', selector: 'track', cues: ['Welcome to the show.'] },
            { type: 'cues', selector: 'track', cues: ['First line', 'second line'] },
            { type: 'cues', selector: 'track', cues: [] },
          ],
        },
        {
          name: 'captions removed from the parent hide the line',
          props: { src: 'episode.mp3', captions: 'captions-en.vtt' },
          interactions: [
            { type: 'cues', selector: 'track', cues: ['Welcome to the show.'] },
            { type: 'props', props: { captions: undefined } },
          ],
        },
        {
          name: 'captions added after mount show the next cue',
          props: { src: 'episode.mp3' },
          interactions: [
            { type: 'props', props: { captions: 'captions-en.vtt' } },
            { type: 'cues', selector: 'track', cues: ['Welcome to the show.'] },
          ],
        },
        { name: 'default muted', props: { src: 'episode.mp3', defaultMuted: true } },
        { name: 'explicitly unmuted', props: { src: 'episode.mp3', defaultMuted: false } },
        { name: 'autoplay', props: { src: 'episode.mp3', autoPlay: true } },
        { name: 'className passthrough', props: { src: 'episode.mp3', className: 'parity-token' } },
        {
          name: 'everything at once',
          props: {
            src: 'episode.mp3',
            title: 'Episode 1',
            subtitle: 'My Podcast',
            defaultMuted: true,
            autoPlay: true,
            className: 'parity-token',
          },
          slots: { visualizer: visualizerNodes },
        },
        {
          name: 'toggle click while paused starts playback',
          props: { src: 'episode.mp3' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [{ type: 'click', selector: toggleSelector }],
        },
        {
          name: 'play event calls onPlay and shows the pause glyph',
          props: { src: 'episode.mp3' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [{ type: 'event', selector: audioSelector, event: 'play' }],
        },
        {
          name: 'pause event calls onPause and shows the play glyph',
          props: { src: 'episode.mp3' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [{ type: 'event', selector: audioSelector, event: 'pause' }],
        },
        {
          name: 'ended event calls onEnded and shows the play glyph',
          props: { src: 'episode.mp3' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [{ type: 'event', selector: audioSelector, event: 'ended' }],
        },
        {
          name: 'play then pause',
          props: { src: 'episode.mp3' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [
            { type: 'event', selector: audioSelector, event: 'play' },
            { type: 'event', selector: audioSelector, event: 'pause' },
          ],
        },
        {
          name: 'play then ended',
          props: { src: 'episode.mp3' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [
            { type: 'event', selector: audioSelector, event: 'play' },
            { type: 'event', selector: audioSelector, event: 'ended' },
          ],
        },
        {
          name: 'toggle click after a play event',
          props: { src: 'episode.mp3' },
          callbacks: ['onPlay', 'onPause', 'onEnded'],
          interactions: [
            { type: 'event', selector: audioSelector, event: 'play' },
            { type: 'click', selector: toggleSelector },
          ],
        },
        {
          name: 'mute toggle unmutes the player',
          props: { src: 'episode.mp3' },
          interactions: [{ type: 'click', selector: muteSelector }],
        },
        {
          name: 'mute toggle twice returns to unmuted',
          props: { src: 'episode.mp3' },
          interactions: [
            { type: 'click', selector: muteSelector },
            { type: 'click', selector: muteSelector },
          ],
        },
        {
          name: 'mute toggle from a muted start unmutes',
          props: { src: 'episode.mp3', defaultMuted: true },
          interactions: [{ type: 'click', selector: muteSelector }],
        },
        {
          name: 'seek then timeupdate shows the new position',
          props: { src: 'episode.mp3' },
          interactions: [
            { type: 'input', selector: seekSelector, value: '65' },
            { type: 'event', selector: audioSelector, event: 'timeupdate' },
          ],
        },
        {
          name: 'seek a fractional position',
          props: { src: 'episode.mp3' },
          interactions: [
            { type: 'input', selector: seekSelector, value: '125.6' },
            { type: 'event', selector: audioSelector, event: 'timeupdate' },
          ],
        },
        {
          name: 'timeupdate before any seek keeps the position',
          props: { src: 'episode.mp3' },
          interactions: [{ type: 'event', selector: audioSelector, event: 'timeupdate' }],
        },
        {
          name: 'loaded metadata keeps the 0:00 duration',
          props: { src: 'episode.mp3' },
          interactions: [{ type: 'event', selector: audioSelector, event: 'loadedmetadata' }],
        },
        {
          name: 'title changes from the parent',
          props: { src: 'episode.mp3', title: 'Episode 1', subtitle: 'My Podcast' },
          interactions: [
            { type: 'props', props: { title: 'Episode 2', subtitle: 'Another Podcast' } },
          ],
        },
        {
          name: 'title and subtitle removed from the parent',
          props: { src: 'episode.mp3', title: 'Episode 1', subtitle: 'My Podcast' },
          interactions: [{ type: 'props', props: { title: undefined, subtitle: undefined } }],
        },
        {
          name: 'src and className change from the parent',
          props: { src: 'episode.mp3', className: 'parity-token' },
          interactions: [{ type: 'props', props: { src: 'other.mp3', className: 'other-token' } }],
        },
        {
          name: 'defaultMuted changes after mount keep the captured state',
          props: { src: 'episode.mp3', defaultMuted: true },
          interactions: [{ type: 'props', props: { defaultMuted: false } }],
        },
        {
          name: 'autoplay added after mount',
          props: { src: 'episode.mp3' },
          interactions: [{ type: 'props', props: { autoPlay: true } }],
        },
        {
          name: 'visualizer added and removed after mount',
          props: { src: 'episode.mp3' },
          interactions: [
            { type: 'props', props: { visualizer: { $nodes: visualizerNodes } } },
            { type: 'props', props: { visualizer: undefined } },
          ],
        },
      ],
    },
  ],
}
