import type { JSX, ReactNode } from 'react'
import { createElement, useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'

import { AudioPlayerChrome } from './AudioPlayerChrome.js'

/** Props for {@link AudioPlayer}. */
export interface AudioPlayerProps {
  src: string
  /** Optional title / track name. */
  title?: ReactNode
  /** Optional artist / source label. */
  subtitle?: ReactNode
  /** Optional waveform / visualizer slot rendered above the controls. */
  visualizer?: ReactNode
  /**
   * WebVTT captions file URL. The current caption appears in a polite live
   * region below the controls.
   */
  captions?: string
  /** BCP 47 language for the captions track and its visible caption text. */
  captionsLang?: string
  /**
   * Human-readable name of the browser's captions track. Defaults through i18n
   * (`audio.captions`, English "Captions").
   */
  captionsLabel?: string
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
  captions,
  captionsLang,
  captionsLabel,
  defaultMuted,
  autoPlay,
  onPlay,
  onPause,
  onEnded,
  className,
}: AudioPlayerProps): JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(!!autoPlay)
  const [muted, setMuted] = useState(!!defaultMuted)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const trackRef = useRef<HTMLTrackElement>(null)
  const [caption, setCaption] = useState('')

  // The <audio> element is hidden behind the custom controls, so the browser
  // paints no captions: the track is set to `hidden` (it still fires
  // `cuechange`) and the player shows the active cue text itself.
  useEffect(() => {
    const track = trackRef.current?.track
    if (!captions || !track) return
    track.mode = 'hidden'
    const onCue = (): void => {
      const cues = track.activeCues ? Array.from(track.activeCues) : []
      setCaption(cues.map((cue) => ('text' in cue ? String(cue.text) : '')).join('\n'))
    }
    track.addEventListener('cuechange', onCue)
    return () => {
      track.removeEventListener('cuechange', onCue)
      setCaption('')
    }
  }, [captions])

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

  // This media element exists only in the browser entry. The controls are portable.
  const media = createElement(
    'audio',
    { ref, src, autoPlay, muted, preload: 'metadata', style: { display: 'none' } },
    createElement('track', {
      ref: trackRef,
      kind: 'captions',
      src: captions,
      srcLang: captionsLang,
      label: captionsLabel ?? t('audio.captions', {}, { defaultValue: 'Captions' }),
    }),
  )

  return (
    <AudioPlayerChrome
      title={title}
      subtitle={subtitle}
      visualizer={visualizer}
      className={className}
      media={media}
      caption={captions ? caption : undefined}
      captionsLang={captionsLang}
      playing={playing}
      muted={muted}
      current={current}
      duration={duration}
      toggle={toggle}
      seek={seek}
      toggleMute={toggleMute}
    />
  )
}
