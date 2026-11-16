/**
 * Vue transport bar — play / pause / stop / record / skip / loop controls
 * for editor playback (music DAW, video editor, animation tool).
 *
 * Exports `<TransportBar>`. All styling routes through `getClassMap()`
 * and all button labels translate via the companion
 * `@molecule/app-locales-feature-transport-bar` locale bond. It is the Vue
 * counterpart of `@molecule/app-feature-transport-bar-react`: the same props,
 * the same DOM for the same input, and the same callbacks.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { TransportBar } from '@molecule/app-feature-transport-bar-vue'
 *
 * const Editor = defineComponent({
 *   setup() {
 *     const playing = ref(false)
 *     const recording = ref(false)
 *     const loop = ref(false)
 *     return () =>
 *       h(TransportBar, {
 *         isPlaying: playing.value,
 *         isRecording: recording.value,
 *         loop: loop.value,
 *         onPlayToggle: () => (playing.value = !playing.value),
 *         onStop: () => (playing.value = false),
 *         onRecordToggle: () => (recording.value = !recording.value),
 *         onLoopToggle: () => (loop.value = !loop.value),
 *         timeDisplay: '0:42 / 3:10',
 *       })
 *   },
 * })
 *
 * createApp(Editor).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise).
 * - All user-visible text (button labels) routes through `t()` via the
 *   companion `@molecule/app-locales-feature-transport-bar` locale bond.
 * - `timeDisplay` is React's optional time-display slot: pass it as a prop or
 *   as the same-named slot. The default slot (`children`) is used when
 *   `timeDisplay` is omitted, and is ignored when it is set.
 *
 * @module
 */

export * from './TransportBar.js'
export * from './types.js'
