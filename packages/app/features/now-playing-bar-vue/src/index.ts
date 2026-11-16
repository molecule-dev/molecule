/**
 * Vue persistent now-playing bar — track artwork, title/artist, transport
 * controls (prev/play-pause/next), scrubber, and volume slider.
 *
 * Vue counterpart of `@molecule/app-now-playing-bar-react`: the same exports,
 * the same props (React names), the same DOM for the same input. Used by
 * music-streaming, podcast, and audiobook apps as a sticky dock at the bottom
 * of the page (or panel) showing what's currently playing.
 *
 * Sticky positioning is intentionally NOT enforced inside the component — the
 * caller wraps `<NowPlayingBar>` in their own `position: sticky` /
 * `position: fixed` container at whatever scope makes sense (page, layout
 * shell, panel).
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { NowPlayingBar } from '@molecule/app-now-playing-bar-vue'
 *
 * const Player = defineComponent({
 *   setup() {
 *     const playing = ref(false)
 *     const time = ref(0)
 *     return () =>
 *       h('div', { style: { position: 'sticky', bottom: 0 } }, [
 *         h(NowPlayingBar, {
 *           track: { id: 't1', title: 'Untitled', artist: 'Various' },
 *           isPlaying: playing.value,
 *           onPlay: () => (playing.value = true),
 *           onPause: () => (playing.value = false),
 *           currentTime: time.value,
 *           duration: 240,
 *           onSeek: (seconds: number) => (time.value = seconds),
 *         }),
 *       ])
 *   },
 * })
 * ```
 *
 * @remarks
 * Pair with `@molecule/app-locales-now-playing-bar` for translations in 79
 * languages. All styling routes through `getClassMap()`; all user-facing text
 * routes through `t()`.
 *
 * `track` is optional: pass `null`/`undefined` (or omit it) when nothing is
 * playing and the bar renders a compact empty state ("Nothing playing")
 * instead of throwing, so you can leave it mounted rather than conditionally
 * unmounting it. Requires a wired ClassMap bond and the Vue binding's i18n
 * provider ancestor — `getClassMap()` and `useTranslation()` both throw before
 * wiring. Transport buttons render text glyphs (not an icon set), so their
 * size tracks the app font. The `trailing` node prop also arrives as a
 * same-named slot; the component accepts either.
 *
 * @module
 */

export * from './NowPlayingBar.js'
export * from './types.js'
