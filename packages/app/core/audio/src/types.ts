/**
 * Audio player types for molecule.dev.
 *
 * Defines the provider interface and data types for audio playback
 * UI components.
 *
 * @module
 */

/**
 * Configuration options for creating an audio player.
 */
export interface AudioPlayerOptions {
  /** Audio source URL(s). Multiple URLs provide format fallbacks. */
  src: string | string[]

  /** Whether to start playing automatically. Defaults to `false`. */
  autoplay?: boolean

  /** Whether to loop playback. Defaults to `false`. */
  loop?: boolean

  /** Initial volume level (0.0 to 1.0). Defaults to `1.0`. */
  volume?: number

  /** Callback when playback reaches the end. */
  onEnd?: () => void

  /** Callback invoked during playback with current time and total duration. */
  onProgress?: (time: number, duration: number) => void
}

/**
 * A live audio player instance returned by the provider.
 */
export interface AudioPlayerInstance {
  /**
   * Starts or resumes playback.
   */
  play(): void

  /**
   * Pauses playback.
   */
  pause(): void

  /**
   * Stops playback and resets position to the beginning.
   */
  stop(): void

  /**
   * Seeks to a specific time position.
   *
   * @param time - Position in seconds to seek to.
   */
  seek(time: number): void

  /**
   * Sets the playback volume.
   *
   * @param volume - Volume level from 0.0 (muted) to 1.0 (full).
   */
  setVolume(volume: number): void

  /**
   * Returns the current playback volume.
   *
   * @returns Volume level from 0.0 to 1.0.
   */
  getVolume(): number

  /**
   * Returns the total duration of the audio in seconds.
   *
   * @returns Duration in seconds.
   */
  getDuration(): number

  /**
   * Returns the current playback position in seconds.
   *
   * @returns Current time in seconds.
   */
  getCurrentTime(): number

  /**
   * Checks whether the audio is currently playing.
   *
   * @returns `true` if audio is playing.
   */
  isPlaying(): boolean

  /**
   * Destroys the player instance and releases all resources.
   */
  destroy(): void
}

/**
 * Audio player provider interface.
 *
 * All audio providers must implement this interface to create
 * and manage audio playback.
 */
export interface AudioProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new audio player instance.
   *
   * @param options - Configuration for the player.
   * @returns An audio player instance.
   */
  createPlayer(options: AudioPlayerOptions): AudioPlayerInstance
}
