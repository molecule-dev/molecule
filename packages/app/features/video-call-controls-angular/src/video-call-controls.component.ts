/**
 * VideoCallControls component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

/**
 * VideoCallControls component.
 *
 * Bottom controls bar for a video meeting — mute, camera, screen-share, leave.
 * Pure UI — apps own the WebRTC plumbing. The host IS the outer `<div>`
 * (`div[mol-video-call-controls]`), matching React's root exactly.
 *
 * The screen-share button renders only when `onToggleScreenShare` is supplied;
 * extra controls are projected as `[slot=extraControls]` before Leave.
 * Control-button glyphs are emoji delivered as i18n default values, so the
 * emoji doubles as the accessible name.
 */
@Component({
  selector: 'div[mol-video-call-controls]',
  standalone: true,
  imports: [Button],
  inputs: [
    'audioEnabled',
    'videoEnabled',
    'screenSharing',
    'onToggleAudio',
    'onToggleVideo',
    'onToggleScreenShare',
    'onLeave',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<button mol-button [variant]="audioEnabled ? 'solid' : 'outline'" [attr.aria-pressed]="!audioEnabled" (click)="onToggleAudio?.($event)">{{ muteGlyph() }}</button><button mol-button [variant]="videoEnabled ? 'solid' : 'outline'" [attr.aria-pressed]="!videoEnabled" (click)="onToggleVideo?.($event)">{{ cameraGlyph() }}</button>@if (onToggleScreenShare) {<button mol-button [variant]="screenSharing ? 'solid' : 'outline'" [attr.aria-pressed]="!!screenSharing" (click)="onToggleScreenShare($event)">{{ shareGlyph() }}</button>}<ng-content select="[slot=extraControls]"></ng-content><button mol-button [variant]="'solid'" [color]="'error'" (click)="onLeave?.($event)">{{ leaveLabel() }}</button>`,
})
export class VideoCallControls {
  /** Whether the local microphone is on. */
  audioEnabled?: boolean
  /** Whether the local camera is on. */
  videoEnabled?: boolean
  /** Whether the local screen share is running. */
  screenSharing?: boolean
  /** Called when the mute button is pressed (React's `onToggleAudio`). */
  onToggleAudio?: (event?: MouseEvent) => void
  /** Called when the camera button is pressed (React's `onToggleVideo`). */
  onToggleVideo?: (event?: MouseEvent) => void
  /** Called when the screen-share button is pressed (React's `onToggleScreenShare`). */
  onToggleScreenShare?: (event?: MouseEvent) => void
  /** Called when the leave button is pressed (React's `onLeave`). */
  onLeave?: (event?: MouseEvent) => void
  /** Extra classes. */
  className?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the glyphs re-render on a locale switch (the static `t` does not).
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the bar's class list (React's `cm.cn(cm.flex(…), cm.sp('p', 3), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center', gap: 'sm' }),
      this.cm().sp('p', 3),
      this.className,
    )
  }

  /**
   * The mute button's glyph (React's `t('call.muteOn')` / `t('call.muteOff')`).
   * @returns The glyph text.
   */
  muteGlyph(): string {
    return this.audioEnabled
      ? this.i18n.t('call.muteOn', {}, { defaultValue: '🎙' })
      : this.i18n.t('call.muteOff', {}, { defaultValue: '🔇' })
  }

  /**
   * The camera button's glyph (React's `t('call.cameraOn')` / `t('call.cameraOff')`).
   * @returns The glyph text.
   */
  cameraGlyph(): string {
    return this.videoEnabled
      ? this.i18n.t('call.cameraOn', {}, { defaultValue: '📹' })
      : this.i18n.t('call.cameraOff', {}, { defaultValue: '🚫' })
  }

  /**
   * The screen-share button's glyph (React's `t('call.share')`).
   * @returns The glyph text.
   */
  shareGlyph(): string {
    return this.i18n.t('call.share', {}, { defaultValue: '🖥' })
  }

  /**
   * The leave button's label (React's `t('call.leave')`).
   * @returns The label text.
   */
  leaveLabel(): string {
    return this.i18n.t('call.leave', {}, { defaultValue: 'Leave' })
  }
}
