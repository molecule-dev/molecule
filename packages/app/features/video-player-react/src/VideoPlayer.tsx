import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

interface VideoPlayerProps {
  /** Video URL. */
  src: string
  /** Optional poster image URL. */
  poster?: string
  /** Caption track URL (.vtt). */
  captionsSrc?: string
  /** Caption language code. */
  captionsLang?: string
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
 *
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
 * the bar styles match the rest of the app (via ClassMap).
 * @param root0
 * @param root0.src
 * @param root0.poster
 * @param root0.captionsSrc
 * @param root0.captionsLang
 * @param root0.autoPlay
 * @param root0.defaultMuted
 * @param root0.onPlay
 * @param root0.onPause
 * @param root0.onEnded
 * @param root0.className
 */
export function VideoPlayer({
  src,
  poster,
  captionsSrc,
  captionsLang = 'en',
  autoPlay,
  defaultMuted,
  onPlay,
  onPause,
  onEnded,
  className,
}: VideoPlayerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(!!autoPlay)
  const [muted, setMuted] = useState(!!defaultMuted || !!autoPlay)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    /**
     *
     */
    function onTime() {
      setCurrent(v!.currentTime)
    }
    /**
     *
     */
    function onMeta() {
      setDuration(v!.duration)
    }
    /**
     *
     */
    function onP() {
      setPlaying(true)
      onPlay?.()
    }
    /**
     *
     */
    function onPa() {
      setPlaying(false)
      onPause?.()
    }
    /**
     *
     */
    function onE() {
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

  /**
   *
   */
  function toggle() {
    const v = ref.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }
  /**
   *
   * @param s
   */
  function seek(s: number) {
    const v = ref.current
    if (!v) return
    v.currentTime = s
  }
  /**
   *
   */
  function toggleMute() {
    const v = ref.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }
  /**
   *
   */
  function toggleFullscreen() {
    const v = ref.current
    if (!v) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void v.requestFullscreen?.()
  }

  return (
    <div
      className={cm.cn(cm.position('relative'), className)}
      style={{ background: '#000', borderRadius: 8, overflow: 'hidden' }}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        {captionsSrc && <track kind="captions" src={captionsSrc} srcLang={captionsLang} default />}
      </video>
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 3), cm.sp('py', 2))}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
          color: '#fff',
        }}
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
          aria-label="Seek"
          className={cm.flex1}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '🔇' : '🔊'}
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleFullscreen} aria-label="Fullscreen">
          ⛶
        </Button>
      </div>
    </div>
  )
}
