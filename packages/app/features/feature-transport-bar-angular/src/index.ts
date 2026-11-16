/**
 * Angular transport bar — play / pause / stop / record / skip / loop controls
 * for editor playback (music DAW, video editor, animation tool).
 *
 * Exports `<div mol-transport-bar>` (`TransportBar`). All styling routes
 * through `getClassMap()` and all button labels translate via the companion
 * `@molecule/app-locales-feature-transport-bar` locale bond. It is the Angular
 * counterpart of `@molecule/app-feature-transport-bar-react`: the same props,
 * the same DOM for the same input, and the same callbacks.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { TransportBar } from '@molecule/app-feature-transport-bar-angular'
 *
 * @Component({
 *   selector: 'app-editor-transport',
 *   standalone: true,
 *   imports: [TransportBar],
 *   template: `
 *     <div
 *       mol-transport-bar
 *       [isPlaying]="playing"
 *       [isRecording]="recording"
 *       [loop]="loop"
 *       [onPlayToggle]="togglePlay"
 *       [onStop]="stop"
 *       [onRecordToggle]="toggleRecord"
 *       [onLoopToggle]="toggleLoop"
 *       timeDisplay="0:42 / 3:10"
 *     ></div>
 *   `,
 * })
 * export class EditorTransport {
 *   playing = false
 *   recording = false
 *   loop = false
 *   togglePlay(): void {
 *     this.playing = !this.playing
 *   }
 *   stop(): void {
 *     this.playing = false
 *   }
 *   toggleRecord(): void {
 *     this.recording = !this.recording
 *   }
 *   toggleLoop(): void {
 *     this.loop = !this.loop
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise).
 * - All user-visible text (button labels) routes through `t()` via the
 *   companion `@molecule/app-locales-feature-transport-bar` locale bond.
 * - Node props are projected content: the time-display slot is
 *   `[slot=timeDisplay]` content, and `children` is the element's default
 *   content. The named slot takes precedence over the default content, as
 *   React's `timeDisplay` does over `children`.
 *
 * @module
 */

export * from './transport-bar.component.js'
export * from './types.js'
