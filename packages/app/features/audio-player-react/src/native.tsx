import { type JSX, useEffect, useRef, useState } from 'react'

import { type AudioPlayerInstance, requireProvider } from '@molecule/app-audio'
import { useTranslation } from '@molecule/app-react'
import { useEffectEvent } from '@molecule/app-react/render'

import type { AudioPlayerProps } from './AudioPlayer.js'
import { AudioPlayerChrome } from './AudioPlayerChrome.js'
import { useCaption } from './captions.js'

export type { AudioPlayerProps } from './AudioPlayer.js'

/**
 * Plays audio through the active audio bond with native controls.
 *
 * @param props - The same props as the browser audio player.
 * @returns The audio player.
 */
export function AudioPlayer({
  src,
  defaultMuted,
  autoPlay,
  onPlay,
  onPause,
  onEnded,
  captions,
  captionsLang,
  captionsLabel: _captionsLabel,
  ...chrome
}: AudioPlayerProps): JSX.Element {
  const { t } = useTranslation()
  let provider
  try {
    provider = requireProvider()
  } catch (cause) {
    throw new Error(
      t(
        'audio.error.missingProvider',
        { bond: '@molecule/app-audio-expo', core: '@molecule/app-audio' },
        {
          defaultValue:
            'No audio provider is bonded. Import `provider` from {{bond}} and call `setProvider(provider)` from {{core}} in `setupProviders()`.',
        },
      ),
      { cause },
    )
  }

  const player = useRef<AudioPlayerInstance | null>(null)
  const playbackRequested = useRef(false)
  const canAutoplay = useRef(true)
  const volumeBeforeMute = useRef(1)
  const [playing, setPlaying] = useState(Boolean(src && autoPlay))
  const [muted, setMuted] = useState(Boolean(defaultMuted))
  const [{ current, duration }, setProgress] = useState({ current: 0, duration: 0 })
  const caption = useCaption(captions, current)
  const readSettings = useEffectEvent(() => ({
    autoplay: Boolean(src && autoPlay),
    volume: muted ? 0 : volumeBeforeMute.current,
  }))
  const notifyAutoplay = useEffectEvent(() => onPlay?.())
  const notifyEnd = useEffectEvent((wasPlaying: boolean) => {
    if (wasPlaying) onPause?.()
    onEnded?.()
  })

  useEffect(() => {
    let active = true
    const settings = readSettings()
    playbackRequested.current = settings.autoplay
    canAutoplay.current = !settings.autoplay
    setPlaying(settings.autoplay)
    setProgress({ current: 0, duration: 0 })
    const audio = provider.createPlayer({
      src,
      ...settings,
      onProgress: (current, duration) => {
        if (active) setProgress({ current, duration })
      },
      onEnd: () => {
        if (!active) return
        const wasPlaying = playbackRequested.current
        playbackRequested.current = false
        setPlaying(false)
        notifyEnd(wasPlaying)
      },
    })
    player.current = audio
    if (settings.autoplay) {
      queueMicrotask(() => {
        if (active) notifyAutoplay()
      })
    }
    return () => {
      active = false
      player.current = null
      audio.destroy()
    }
  }, [provider, src])

  useEffect(() => {
    const audio = player.current
    if (!autoPlay || !src || !audio || !canAutoplay.current) return
    canAutoplay.current = false
    audio.play()
    playbackRequested.current = true
    setPlaying(true)
    notifyAutoplay()
  }, [autoPlay, src])

  /** Changes the requested playback state even when the source is still buffering. */
  function toggle(): void {
    const audio = player.current
    if (!audio || !src) return
    canAutoplay.current = false
    if (playbackRequested.current) {
      audio.pause()
      playbackRequested.current = false
      setPlaying(false)
      onPause?.()
    } else {
      audio.play()
      playbackRequested.current = true
      setPlaying(true)
      onPlay?.()
    }
  }

  /** Mutes or restores the previous volume without interrupting playback. */
  function toggleMute(): void {
    const audio = player.current
    if (!audio) return
    if (muted) audio.setVolume(volumeBeforeMute.current)
    else {
      volumeBeforeMute.current = audio.getVolume()
      audio.setVolume(0)
    }
    setMuted(!muted)
  }

  return (
    <AudioPlayerChrome
      {...chrome}
      caption={captions ? caption : undefined}
      captionsLang={captionsLang}
      playing={playing}
      muted={muted}
      current={current}
      duration={duration}
      toggle={toggle}
      seek={(time) => player.current?.seek(time)}
      toggleMute={toggleMute}
    />
  )
}
