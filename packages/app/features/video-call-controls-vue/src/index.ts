/**
 * Vue video-call participant tile + controls bar.
 *
 * Exports:
 * - `VideoCallControls` — bottom controls bar (mute/video/screen-share/leave).
 * - `ParticipantTile` — single participant card with name, mute, hand-raised, speaking ring.
 *
 * Pure UI — the app owns the WebRTC/SDK plumbing (pair with an
 * `@molecule/api-video-rooms-*` bond server-side) and passes state + callbacks
 * down. It is the Vue counterpart of
 * `@molecule/app-video-call-controls-react`: same exports, same props and the
 * same DOM for the same input, so an app switches framework by changing only
 * the package name.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { ParticipantTile, VideoCallControls } from '@molecule/app-video-call-controls-vue'
 *
 * const CallBar = defineComponent({
 *   setup() {
 *     const audioOn = ref(true)
 *     const videoOn = ref(true)
 *     return () =>
 *       h('div', [
 *         h(ParticipantTile, { name: 'Alice', audioEnabled: audioOn.value, speaking: true }),
 *         h(VideoCallControls, {
 *           audioEnabled: audioOn.value,
 *           onToggleAudio: () => {
 *             audioOn.value = !audioOn.value
 *           },
 *           videoEnabled: videoOn.value,
 *           onToggleVideo: () => {
 *             videoOn.value = !videoOn.value
 *           },
 *           onLeave: () => console.log('leave call'),
 *         }),
 *       ])
 *   },
 * })
 *
 * createApp(CallBar).mount('#app')
 * ```
 *
 * @remarks
 * Control-button glyphs are EMOJI delivered as i18n defaultValues
 * (`t('call.muteOn')` → 🎙 etc.) with no separate aria-labels — the emoji
 * doubles as the accessible name. In `ParticipantTile` the ' (you)' suffix and
 * the 'Muted' / 'Hand raised' indicator labels are translated too
 * (`call.label.you`, `call.aria.muted`, `call.aria.handRaised`). Tiles are
 * fixed 16:9 theme surfaces (`cm.surface` background, theme ink) with a scrim
 * name badge (`cm.bgScrim`, inverse text) and a success-tone speaking ring
 * (`cm.textTone('success')` ink, `currentColor` outline); supply your `<video>`
 * element via `videoSlot` and a fallback via
 * `avatarSlot` — node-valued props arrive as a prop AND a same-named slot;
 * components accept either. The screen-share button renders only when
 * `onToggleScreenShare` is provided; `extraControls` slots more buttons before
 * Leave.
 *
 * @module
 */

export * from './ParticipantTile.js'
export * from './types.js'
export * from './VideoCallControls.js'
