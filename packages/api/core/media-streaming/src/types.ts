/**
 * Type definitions for the media-streaming core interface.
 *
 * @module
 */

/**
 * Supported streaming protocol.
 */
export type StreamProtocol = 'hls' | 'dash'

/**
 * Status of a streaming session.
 */
export type StreamStatus = 'pending' | 'processing' | 'ready' | 'error'

/**
 * A single segment of a media stream (e.g. an HLS `.ts` chunk).
 */
export interface StreamSegment {
  /** Zero-based index of the segment within the stream. */
  index: number

  /** Duration of the segment in seconds. */
  duration: number

  /** URI to access the segment (relative or absolute). */
  uri: string
}

/**
 * Options for creating a stream from a source file.
 */
export interface StreamOptions {
  /** Target segment duration in seconds. Defaults to `6`. */
  segmentDuration?: number

  /** Streaming protocol to use. Defaults to `'hls'`. */
  protocol?: StreamProtocol

  /** Output directory or bucket path for generated segments. */
  outputPath?: string
}

/**
 * Manifest describing a generated stream.
 */
export interface StreamManifest {
  /** Unique stream identifier. */
  id: string

  /** The streaming protocol used. */
  protocol: StreamProtocol

  /** URI of the manifest / playlist file (e.g. `.m3u8` or `.mpd`). */
  manifestUri: string

  /** Total duration of the stream in seconds. */
  duration: number

  /** Ordered list of segments that compose the stream. */
  segments: StreamSegment[]
}

/**
 * A transcoding profile describing the desired output quality.
 */
export interface TranscodeProfile {
  /** Human-readable name for the profile (e.g. `'720p'`). */
  name: string

  /** Target video width in pixels. */
  width: number

  /** Target video height in pixels. */
  height: number

  /** Target video bitrate in bits per second. */
  videoBitrate: number

  /** Target audio bitrate in bits per second. */
  audioBitrate: number

  /** Video codec to use (e.g. `'h264'`, `'vp9'`). */
  codec?: string
}

/**
 * Result of a transcoding operation for a single profile.
 */
export interface TranscodeVariant {
  /** Profile name used for this variant. */
  profile: string

  /** URI to the transcoded output. */
  uri: string

  /** Output width in pixels. */
  width: number

  /** Output height in pixels. */
  height: number

  /** Output bitrate in bits per second. */
  bitrate: number
}

/**
 * Aggregated result of a multi-profile transcoding operation.
 */
export interface TranscodeResult {
  /** Unique identifier for the transcode job. */
  id: string

  /** URI to the master manifest (adaptive bitrate). */
  masterManifestUri: string

  /** Individual variant results. */
  variants: TranscodeVariant[]
}

/**
 * Media streaming provider interface.
 *
 * All media streaming providers must implement this interface. Bond packages
 * (HLS, DASH, etc.) provide concrete implementations.
 */
export interface StreamingProvider {
  /**
   * Creates a stream from a media source.
   *
   * @param input - The source media as a Buffer or file path.
   * @param options - Optional streaming configuration.
   * @returns A manifest describing the generated stream.
   */
  createStream(input: Buffer | string, options?: StreamOptions): Promise<StreamManifest>

  /**
   * Transcodes a media source into multiple quality variants.
   *
   * @param input - The source media as a Buffer or file path.
   * @param profiles - One or more target quality profiles.
   * @returns The aggregated transcode result with variant URIs.
   */
  transcode(input: Buffer | string, profiles: TranscodeProfile[]): Promise<TranscodeResult>

  /**
   * Generates a playlist / manifest string from a list of segments.
   *
   * @param segments - Ordered stream segments.
   * @param options - Optional streaming configuration.
   * @returns The manifest content as a string (e.g. M3U8 or MPD).
   */
  generateManifest(segments: StreamSegment[], options?: StreamOptions): string

  /**
   * Retrieves a specific segment of a stream.
   *
   * @param streamId - The stream identifier.
   * @param segmentIndex - Zero-based index of the segment.
   * @returns The raw segment data.
   */
  getSegment(streamId: string, segmentIndex: number): Promise<Buffer>
}

/**
 * Configuration options for media streaming providers.
 */
export interface StreamingConfig {
  /** Default segment duration in seconds. */
  segmentDuration?: number

  /** Default streaming protocol. */
  protocol?: StreamProtocol

  /** Base path for output files. */
  outputBasePath?: string
}
