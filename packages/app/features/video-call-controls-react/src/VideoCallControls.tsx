import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

interface VideoCallControlsProps {
  audioEnabled: boolean
  onToggleAudio: () => void
  videoEnabled: boolean
  onToggleVideo: () => void
  screenSharing?: boolean
  onToggleScreenShare?: () => void
  onLeave: () => void
  /** Additional buttons to render before the leave button (chat, participants, etc.). */
  extraControls?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Bottom controls bar for a video meeting — mute, camera, screen-share,
 * leave. Pure UI — apps own the WebRTC plumbing.
 * @param root0
 * @param root0.audioEnabled
 * @param root0.onToggleAudio
 * @param root0.videoEnabled
 * @param root0.onToggleVideo
 * @param root0.screenSharing
 * @param root0.onToggleScreenShare
 * @param root0.onLeave
 * @param root0.extraControls
 * @param root0.className
 */
export function VideoCallControls({
  audioEnabled,
  onToggleAudio,
  videoEnabled,
  onToggleVideo,
  screenSharing,
  onToggleScreenShare,
  onLeave,
  extraControls,
  className,
}: VideoCallControlsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
        cm.sp('p', 3),
        className,
      )}
    >
      <Button
        variant={audioEnabled ? 'solid' : 'outline'}
        onClick={onToggleAudio}
        aria-pressed={!audioEnabled}
      >
        {audioEnabled
          ? t('call.muteOn', {}, { defaultValue: '🎙' })
          : t('call.muteOff', {}, { defaultValue: '🔇' })}
      </Button>
      <Button
        variant={videoEnabled ? 'solid' : 'outline'}
        onClick={onToggleVideo}
        aria-pressed={!videoEnabled}
      >
        {videoEnabled
          ? t('call.cameraOn', {}, { defaultValue: '📹' })
          : t('call.cameraOff', {}, { defaultValue: '🚫' })}
      </Button>
      {onToggleScreenShare && (
        <Button
          variant={screenSharing ? 'solid' : 'outline'}
          onClick={onToggleScreenShare}
          aria-pressed={!!screenSharing}
        >
          {t('call.share', {}, { defaultValue: '🖥' })}
        </Button>
      )}
      {extraControls}
      <Button variant="solid" color="error" onClick={onLeave}>
        {t('call.leave', {}, { defaultValue: 'Leave' })}
      </Button>
    </div>
  )
}
