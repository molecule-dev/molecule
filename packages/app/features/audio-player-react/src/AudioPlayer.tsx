import type { JSX, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

export interface AudioPlayerProps {
  src: string
  /** Optional title / track name. */
  title?: ReactNode
  /** Optional artist / source label. */
  subtitle?: ReactNode
  /** Optional waveform / visualizer slot rendered above the controls. */
  visualizer?: ReactNode
  /** Initial muted state. */
  defaultMuted?: boolean
  /** Autoplay (browser may block). */
  autoPlay?: boolean
  /** Callbacks. */
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Formats a duration in seconds as M:SS (e.g. 90 → "1:30").
 * @param s
 */
function fmt(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * HTML5 audio player chrome — play/pause, scrub, time, mute, optional
 * visualizer slot. Use for podcasts, voice notes, music previews,
 * narrated lessons.
 * @param props - Component props (see {@link AudioPlayerProps}).
 */
export function AudioPlayer({
  src,
  title,
  subtitle,
  visualizer,
  defaultMuted,
  autoPlay,
  onPlay,
  onPause,
  onEnded,
  className,
}: AudioPlayerProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(!!autoPlay)
  const [muted, setMuted] = useState(!!defaultMuted)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const a = ref.current
    if (!a) return
    const u = (): void => setCurrent(a.currentTime)
    const m = (): void => setDuration(a.duration)
    const p = (): void => {
      setPlaying(true)
      onPlay?.()
    }
    const pa = (): void => {
      setPlaying(false)
      onPause?.()
    }
    const e = (): void => {
      setPlaying(false)
      onEnded?.()
    }
    a.addEventListener('timeupdate', u)
    a.addEventListener('loadedmetadata', m)
    a.addEventListener('play', p)
    a.addEventListener('pause', pa)
    a.addEventListener('ended', e)
    return () => {
      a.removeEventListener('timeupdate', u)
      a.removeEventListener('loadedmetadata', m)
      a.removeEventListener('play', p)
      a.removeEventListener('pause', pa)
      a.removeEventListener('ended', e)
    }
  }, [onPlay, onPause, onEnded])

  /**
   * Toggles play/pause on the audio element.
   */
  function toggle(): void {
    const a = ref.current
    if (!a) return
    if (a.paused) void a.play()
    else a.pause()
  }
  /**
   * Seeks the audio element to a given position in seconds.
   * @param s
   */
  function seek(s: number): void {
    const a = ref.current
    if (a) a.currentTime = s
  }
  /**
   * Toggles the muted state on the audio element and syncs React state.
   */
  function toggleMute(): void {
    const a = ref.current
    if (!a) return
    a.muted = !a.muted
    setMuted(a.muted)
  }

  return (
    <div className={cm.cn(cm.stack(2), cm.sp('p', 3), className)}>
      <audio
        ref={ref}
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        preload="metadata"
        style={{ display: 'none' }}
      />
      {(title || subtitle) && (
        <header className={cm.stack(0 as const)}>
          {title && (
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{title}</span>
          )}
          {subtitle && <span className={cm.textSize('xs')}>{subtitle}</span>}
        </header>
      )}
      {visualizer}
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Button variant="ghost" size="sm" onClick={toggle}>
          {playing ? '⏸' : '▶'}
        </Button>
        <span className={cm.textSize('xs')} style={{ minWidth: 64 }}>
          {fmt(current)} / {fmt(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={t('audio.seek', {}, { defaultValue: 'Seek' })}
          className={cm.flex1}
        />
        <Button variant="ghost" size="sm" onClick={toggleMute}>
          {muted ? '🔇' : '🔊'}
        </Button>
      </div>
    </div>
  )
}
