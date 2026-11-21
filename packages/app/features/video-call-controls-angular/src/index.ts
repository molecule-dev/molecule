/**
 * Angular video-call participant tile + controls bar — the counterpart of
 * `@molecule/app-video-call-controls-react`: the same exports, the same props
 * and the same DOM for the same input.
 *
 * Exports `<VideoCallControls>` (bottom controls bar: mute/video/screen-share/
 * leave) and `<ParticipantTile>` (single participant card with name, mute,
 * hand-raised, speaking ring).
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { ParticipantTile, VideoCallControls } from '@molecule/app-video-call-controls-angular'
 *
 * @Component({
 *   selector: 'app-call-bar',
 *   standalone: true,
 *   imports: [ParticipantTile, VideoCallControls],
 *   template: `
 *     <div mol-participant-tile [name]="'Alice'" [audioEnabled]="audioOn()" [speaking]="true">
 *       <video slot="videoSlot" #video></video>
 *     </div>
 *     <div
 *       mol-video-call-controls
 *       [audioEnabled]="audioOn()"
 *       [onToggleAudio]="toggleAudio"
 *       [videoEnabled]="videoOn()"
 *       [onToggleVideo]="toggleVideo"
 *       [onLeave]="leave"
 *     ></div>
 *   `,
 * })
 * export class CallBar {
 *   readonly audioOn = signal(true)
 *   readonly videoOn = signal(true)
 *   readonly toggleAudio = (): void => this.audioOn.update((value) => !value)
 *   readonly toggleVideo = (): void => this.videoOn.update((value) => !value)
 *   readonly leave = (): void => console.log('leave call')
 * }
 * ```
 *
 * @remarks
 * - Pure UI — the app owns the WebRTC/SDK plumbing (pair with an
 *   `@molecule/api-video-rooms-*` bond server-side) and passes state + callbacks
 *   down.
 * - Node props are projected content: `[slot=name]`, `[slot=videoSlot]`,
 *   `[slot=avatarSlot]` and `[slot=extraControls]`. A string `name` input also
 *   renders, as React's `{name}` does.
 * - Control-button glyphs are EMOJI delivered as i18n defaultValues
 *   (`t('call.muteOn')` → 🎙 etc.) with no separate aria-labels — the emoji
 *   doubles as the accessible name. In `<ParticipantTile>` the ' (you)' suffix
 *   and the 'Muted' / 'Hand raised' indicator labels are translated too
 *   (`call.label.you`, `call.aria.muted`, `call.aria.handRaised`).
 * - Tiles are fixed 16:9 theme surfaces (`cm.surface` background, theme ink)
 *   with a scrim name badge (`cm.bgScrim`, inverse text) and a success-tone
 *   speaking ring (`cm.textTone('success')` ink, `currentColor` outline);
 *   supply your `<video>` element via `[slot=videoSlot]` and a fallback via
 *   `[slot=avatarSlot]`. The
 *   screen-share button renders only when
 *   `onToggleScreenShare` is provided; `[slot=extraControls]` slots more buttons
 *   before Leave.
 *
 * @module
 */

export * from './participant-tile.component.js'
export * from './types.js'
export * from './video-call-controls.component.js'
