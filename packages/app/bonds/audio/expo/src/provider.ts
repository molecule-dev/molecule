import { createAudioPlayer } from 'expo-audio'

import type { AudioPlayerInstance, AudioPlayerOptions, AudioProvider } from '@molecule/app-audio'
import { getLogger } from '@molecule/app-logger'

const UPDATE_INTERVAL_MS = 100
const SOURCE_LOAD_TIMEOUT_MS = 10_000

/** Keeps native unknown-duration sentinels and nonfinite times out of the portable interface. */
const seconds = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0)
const volume = (value: number): number => Math.min(1, seconds(value))

/**
 * Manages one Expo player and its native status subscription.
 *
 * @param options - Portable player configuration.
 * @returns A playback instance whose reads come from the native player.
 */
function createPlayer(options: AudioPlayerOptions): AudioPlayerInstance {
  const sources = (typeof options.src === 'string' ? [options.src] : options.src).filter(Boolean)
  const player = createAudioPlayer(sources[0] ?? null, UPDATE_INTERVAL_MS)
  let sourceIndex = 0
  let loadTimeout: ReturnType<typeof setTimeout> | undefined
  let wantsPlayback = options.autoplay ?? false
  let ended = false
  let destroyed = false
  let playRequest = 0
  let pendingSeek: Promise<boolean> | undefined

  /** Seeks in seconds and lets play wait for an in-flight seek or a rewind after completion. */
  function seekTo(time: number): Promise<boolean> {
    const position = seconds(time)
    const operation = player.seekTo(position).then(
      () => {
        if (!destroyed && pendingSeek === operation && position < player.duration) ended = false
        return true
      },
      (error: unknown) => {
        if (!destroyed) getLogger().warn('Could not seek the Expo audio player.', { error })
        return false
      },
    )
    pendingSeek = operation
    void operation.then(() => {
      if (pendingSeek === operation) pendingSeek = undefined
    })
    return operation
  }

  /** Advances to a fallback on failure or when the SDK provides no failure event. */
  function nextSource(): void {
    clearTimeout(loadTimeout)
    const source = sources[sourceIndex + 1]
    if (!source || destroyed) return
    sourceIndex += 1
    pendingSeek = undefined
    ended = false
    playRequest += 1
    watchSourceLoad()
    player.replace(source)
    if (wantsPlayback) player.play()
  }

  /** Leaves a single source, or the last fallback, under the native player's loading policy. */
  function watchSourceLoad(): void {
    if (sources[sourceIndex + 1]) loadTimeout = setTimeout(nextSource, SOURCE_LOAD_TIMEOUT_MS)
  }

  try {
    player.volume = volume(options.volume ?? 1)
    player.loop = options.loop ?? false
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (destroyed) return
      if (status.playbackState === 'failed' && sources[sourceIndex + 1]) {
        nextSource()
        return
      }
      // Android may transiently report isLoaded while its playback state is idle.
      if (status.isLoaded && status.playbackState !== 'idle') clearTimeout(loadTimeout)

      const finished = status.didJustFinish && !ended
      if (finished) {
        ended = true
        wantsPlayback = false
        playRequest += 1
      }
      options.onProgress?.(seconds(status.currentTime), seconds(status.duration))
      if (finished && !destroyed) options.onEnd?.()
    })

    watchSourceLoad()
    if (wantsPlayback && sources.length) player.play()

    return {
      play() {
        if (destroyed || !sources.length) return
        wantsPlayback = true
        const request = ++playRequest
        const seek = pendingSeek ?? (ended ? seekTo(0) : undefined)
        if (!seek) {
          player.play()
          return
        }
        void seek
          .then((ready) => {
            if (ready && request === playRequest) player.play()
          })
          .catch((error: unknown) => {
            getLogger().warn('Could not resume Expo audio playback after seeking.', { error })
          })
      },
      pause() {
        if (destroyed) return
        playRequest += 1
        wantsPlayback = false
        player.pause()
      },
      stop() {
        if (destroyed) return
        playRequest += 1
        wantsPlayback = false
        player.pause()
        void seekTo(0)
      },
      seek(time) {
        if (!destroyed) void seekTo(time)
      },
      setVolume(level) {
        if (!destroyed) player.volume = volume(level)
      },
      getVolume: () => (destroyed ? 0 : player.volume),
      getDuration: () => (destroyed ? 0 : seconds(player.duration)),
      getCurrentTime: () => (destroyed ? 0 : seconds(player.currentTime)),
      isPlaying: () => !destroyed && player.playing,
      destroy() {
        if (destroyed) return
        destroyed = true
        playRequest += 1
        clearTimeout(loadTimeout)
        try {
          subscription.remove()
        } finally {
          // The SDK's remove() only unregisters the player. SharedObject.release() frees it.
          player.release()
        }
      },
    }
  } catch (error) {
    destroyed = true
    clearTimeout(loadTimeout)
    player.release()
    throw error
  }
}

/** Audio playback through the Expo SDK's native player. */
export const provider: AudioProvider = { name: 'expo', createPlayer }
