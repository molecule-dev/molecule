import { type ReactElement, useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/** Props for the {@link VideoPlayer} component. */
export interface VideoPlayerProps {
  /** Video URL. */
  src: string
  /** Optional poster image URL. */
  poster?: string
  /** Caption track URL (.vtt). */
  captionsSrc?: string
  /** Caption language code. */
  captionsLang?: string
  /**
   * Human-readable name of the captions track (the track's `label`, which
   * screen readers and the browser's caption menu announce). Defaults
   * through i18n (`video.captions`, English "Captions").
   */
  captionsLabel?: string
  /** Autoplay (must be muted to work in most browsers). */
  autoPlay?: boolean
  /** Initial muted state. */
  defaultMuted?: boolean
  /** Called on play/pause/end events. */
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Formats a time value in seconds as `m:ss`.
 * @param s
 */
function fmtTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * HTML5 video player with custom chrome — play/pause, scrub bar,
 * elapsed/total time, mute, fullscreen. Native controls are hidden so
 * the bar styles match the rest of the app (via ClassMap). The `<video>`
 * always carries a captions `<track>` (the `captionsSrc`/`captionsLang`
 * WebVTT file, named through `captionsLabel`).
 * @param props - Component props (see {@link VideoPlayerProps}).
 */
export function VideoPlayer({
  src,
  poster,
  captionsSrc,
  captionsLang = 'en',
  captionsLabel,
  autoPlay,
  defaultMuted,
  onPlay,
  onPause,
  onEnded,
  className,
}: VideoPlayerProps): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The captions track renders on every <video> (a media element needs a
  // captions <track> for keyboard and screen-reader users); without a
  // `captionsSrc` it is a captions track with no source yet.
  const captionsText = captionsLabel ?? t('video.captions', {}, { defaultValue: 'Captions' })
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(!!autoPlay)
  const [muted, setMuted] = useState(!!defaultMuted || !!autoPlay)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    /** Updates current-time state on each timeupdate event. */
    function onTime(): void {
      setCurrent(v!.currentTime)
    }
    /** Stores video duration once metadata is loaded. */
    function onMeta(): void {
      setDuration(v!.duration)
    }
    /** Syncs playing state and calls the onPlay callback. */
    function onP(): void {
      setPlaying(true)
      onPlay?.()
    }
    /** Syncs playing state and calls the onPause callback. */
    function onPa(): void {
      setPlaying(false)
      onPause?.()
    }
    /** Syncs playing state and calls the onEnded callback. */
    function onE(): void {
      setPlaying(false)
      onEnded?.()
    }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onP)
    v.addEventListener('pause', onPa)
    v.addEventListener('ended', onE)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onP)
      v.removeEventListener('pause', onPa)
      v.removeEventListener('ended', onE)
    }
  }, [onPlay, onPause, onEnded])

  /** Toggles play/pause on the video element. */
  function toggle(): void {
    const v = ref.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }
  /**
   * Seeks the video to the given time in seconds.
   * @param s
   */
  function seek(s: number): void {
    const v = ref.current
    if (!v) return
    v.currentTime = s
  }
  /** Toggles the muted state of the video element. */
  function toggleMute(): void {
    const v = ref.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }
  /** Requests or exits fullscreen for the video element. */
  function toggleFullscreen(): void {
    const v = ref.current
    if (!v) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void v.requestFullscreen?.()
  }

  return (
    <div
      className={cm.cn(cm.position('relative'), cm.bgScrim, className)}
      style={{ borderRadius: 8, overflow: 'hidden' }}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        {/* An empty captionsSrc is no source at all (an empty `src` makes the
            browser fetch the page itself), so it renders without one. */}
        <track
          kind="captions"
          src={captionsSrc || undefined}
          srcLang={captionsLang}
          label={captionsText}
          default
        />
      </video>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.bgScrim,
          cm.textOnTone,
          cm.sp('px', 3),
          cm.sp('py', 2),
        )}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          aria-label={
            playing
              ? t('video.pause', {}, { defaultValue: 'Pause' })
              : t('video.play', {}, { defaultValue: 'Play' })
          }
        >
          {playing ? '⏸' : '▶'}
        </Button>
        <span className={cm.textSize('xs')} style={{ minWidth: 64 }}>
          {fmtTime(current)} / {fmtTime(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={t('video.seek', {}, { defaultValue: 'Seek' })}
          className={cm.flex1}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          aria-label={
            muted
              ? t('video.unmute', {}, { defaultValue: 'Unmute' })
              : t('video.mute', {}, { defaultValue: 'Mute' })
          }
        >
          {muted ? '🔇' : '🔊'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          aria-label={t('video.fullscreen', {}, { defaultValue: 'Fullscreen' })}
        >
          ⛶
        </Button>
      </div>
    </div>
  )
}
