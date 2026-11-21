/**
 * Solid bottom controls bar for a video meeting.
 *
 * Solid counterpart of `@molecule/app-video-call-controls-react`'s
 * `VideoCallControls` — the same props (React names), the same ClassMap
 * tokens, the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { VideoCallControlsProps } from './types.js'

/**
 * Bottom controls bar for a video meeting — mute, camera, screen-share,
 * leave. Pure UI — apps own the WebRTC plumbing.
 *
 * The screen-share button renders only when `onToggleScreenShare` is supplied;
 * `extraControls` slots more buttons before Leave. Control-button glyphs are
 * emoji delivered as i18n default values, so the emoji doubles as the
 * accessible name.
 *
 * @param props - Component props (see {@link VideoCallControlsProps}).
 * @returns The rendered controls bar.
 */
export const VideoCallControls: Component<VideoCallControlsProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const classes = (): string =>
    cm.cn(
      cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
      cm.sp('p', 3),
      props.className,
    )
  return (
    <div class={classes()}>
      <Button
        variant={props.audioEnabled ? 'solid' : 'outline'}
        onClick={props.onToggleAudio}
        aria-pressed={!props.audioEnabled}
      >
        {props.audioEnabled
          ? t('call.muteOn', {}, { defaultValue: '🎙' })
          : t('call.muteOff', {}, { defaultValue: '🔇' })}
      </Button>
      <Button
        variant={props.videoEnabled ? 'solid' : 'outline'}
        onClick={props.onToggleVideo}
        aria-pressed={!props.videoEnabled}
      >
        {props.videoEnabled
          ? t('call.cameraOn', {}, { defaultValue: '📹' })
          : t('call.cameraOff', {}, { defaultValue: '🚫' })}
      </Button>
      {props.onToggleScreenShare && (
        <Button
          variant={props.screenSharing ? 'solid' : 'outline'}
          onClick={props.onToggleScreenShare}
          aria-pressed={!!props.screenSharing}
        >
          {t('call.share', {}, { defaultValue: '🖥' })}
        </Button>
      )}
      {props.extraControls}
      <Button variant="solid" color="error" onClick={props.onLeave}>
        {t('call.leave', {}, { defaultValue: 'Leave' })}
      </Button>
    </div>
  )
}
