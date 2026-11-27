import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Box, RangeField, Text } from '@molecule/app-ui-react/elements'

import type { AudioPlayerProps } from './AudioPlayer.js'

interface AudioPlayerChromeProps extends Pick<
  AudioPlayerProps,
  'title' | 'subtitle' | 'visualizer' | 'className' | 'captionsLang'
> {
  media?: ReactNode
  caption?: string
  playing: boolean
  muted: boolean
  duration: number
  current: number
  toggle: () => void
  seek: (seconds: number) => void
  toggleMute: () => void
}

/** Formats playback time as minutes and zero-padded seconds. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

/** Draws the audio controls and slots with the same UI kit on web and native. */
export function AudioPlayerChrome({
  title: titleProp,
  subtitle: subtitleProp,
  visualizer,
  className,
  media,
  caption,
  captionsLang,
  playing,
  muted,
  duration,
  current,
  toggle,
  seek,
  toggleMute,
}: AudioPlayerChromeProps): JSX.Element {
  const title = slot(titleProp)
  const subtitle = slot(subtitleProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Box as="div" className={cm.cn(cm.stack(2), cm.sp('p', 3), className)}>
      {media}
      {(title || subtitle) && (
        <Box as="header" className={cm.stack(0)}>
          {title && (
            <Text as="span" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text as="span" className={cm.textSize('xs')}>
              {subtitle}
            </Text>
          )}
        </Box>
      )}
      {visualizer}
      <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          data-mol-id="audio-player-toggle"
          aria-label={
            playing
              ? t('audio.pause', {}, { defaultValue: 'Pause' })
              : t('audio.play', {}, { defaultValue: 'Play' })
          }
        >
          <Text as="span" aria-hidden>
            {playing ? '⏸' : '▶'}
          </Text>
        </Button>
        <Text as="span" className={cm.textSize('xs')} style={{ minWidth: 64 }}>
          {formatTime(current)} / {formatTime(duration)}
        </Text>
        <RangeField
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onValueChange={seek}
          aria-label={t('audio.seek', {}, { defaultValue: 'Seek' })}
          data-mol-id="audio-player-seek"
          className={cm.flex1}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          data-mol-id="audio-player-mute"
          aria-label={
            muted
              ? t('audio.unmute', {}, { defaultValue: 'Unmute' })
              : t('audio.mute', {}, { defaultValue: 'Mute' })
          }
        >
          <Text as="span" aria-hidden>
            {muted ? '🔇' : '🔊'}
          </Text>
        </Button>
      </Box>
      {caption !== undefined && (
        <Text
          as="p"
          aria-live="polite"
          data-mol-id="audio-player-captions"
          lang={captionsLang}
          className={cm.textSize('sm')}
          webStyle={{ minHeight: '1.5em', whiteSpace: 'pre-line' }}
        >
          {caption}
        </Text>
      )}
    </Box>
  )
}
