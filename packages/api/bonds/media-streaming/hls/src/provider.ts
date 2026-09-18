/**
 * HLS implementation of StreamingProvider.
 *
 * Uses ffmpeg (via `child_process`) for media segmentation and transcoding,
 * and pure-TypeScript M3U8 generation for playlist creation. Requires ffmpeg
 * to be installed on the host system.
 *
 * @module
 */

import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { promisify } from 'node:util'

import type {
  StreamingProvider,
  StreamManifest,
  StreamOptions,
  StreamSegment,
  TranscodeProfile,
  TranscodeResult,
  TranscodeVariant,
} from '@molecule/api-media-streaming'

import { generateMasterPlaylist, generateMediaPlaylist } from './m3u8.js'
import type { HlsConfig } from './types.js'
import { assertSafePathComponent, assertSegmentIndex, resolveWithinBase } from './validate.js'

const execFileAsync = promisify(execFile)

/**
 * Matches a URL scheme prefix (`scheme:`) the way ffmpeg's own protocol
 * handler resolution does — including scheme-only forms like `http:host/x`
 * that carry no `//`.
 */
const URL_SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:/i

/**
 * Asserts that a caller-supplied string input is a LOCAL ABSOLUTE FILE PATH.
 *
 * String inputs are passed verbatim as ffmpeg's `-i` argument, and ffmpeg
 * natively speaks `http`, `https`, `tcp`, `tls`, `concat`, `gopher`, and
 * more. Forwarding an unvalidated string therefore turns this bond into an
 * SSRF / file-read primitive: `http://169.254.169.254/…` (cloud metadata),
 * `http://intra-host/…`, or any other URL the host can reach, executed by
 * ffmpeg with the server's network position. We reject:
 *
 * - anything containing `://` (absolute URLs),
 * - anything with a `scheme:` prefix (ffmpeg accepts `http:host/x` too),
 * - anything that is not an absolute path (`/…`) — a relative path would
 *   resolve against ffmpeg's CWD, not the caller's.
 *
 * Applications that need remote media must fetch the bytes themselves (with
 * their own SSRF guard) and pass a `Buffer`.
 *
 * Module-private: not part of the package's public export surface.
 *
 * @param inputPath - The caller-supplied string input.
 * @returns The validated path, unchanged.
 * @throws {Error} When the string is not a local absolute file path.
 */
const assertLocalInputPath = (inputPath: string): string => {
  if (inputPath.includes('://') || URL_SCHEME_PREFIX.test(inputPath) || !isAbsolute(inputPath)) {
    throw new Error(
      `Invalid media input: string inputs must be local absolute file paths (got ${JSON.stringify(inputPath)}). ` +
        'Fetch remote media yourself (with an SSRF guard) and pass a Buffer instead — ffmpeg URLs are rejected to prevent server-side request forgery.',
    )
  }
  return inputPath
}

let streamCounter = 0

/**
 * Generates a unique stream identifier.
 *
 * @returns A unique stream ID string.
 */
const generateStreamId = (): string => {
  streamCounter += 1
  return `hls-${Date.now()}-${streamCounter}`
}

/**
 * Writes a Buffer input to a temporary file for ffmpeg processing.
 *
 * @param input - The media data.
 * @param dir - The directory to write to.
 * @returns The path to the written file.
 */
const prepareInput = async (input: Buffer | string, dir: string): Promise<string> => {
  if (typeof input === 'string') {
    // SSRF guard: a string is treated as a local absolute FILE path only —
    // ffmpeg speaks http/tcp/… natively, so an unvalidated string is a
    // fetch-anything primitive. Remote media must arrive as a Buffer.
    return assertLocalInputPath(input)
  }
  const inputPath = join(dir, 'input.tmp')
  await writeFile(inputPath, input)
  return inputPath
}

/**
 * Parses segment files from an output directory and builds segment metadata.
 *
 * @param dir - The directory containing `.ts` segment files.
 * @param baseUri - Base URI prefix for segment URIs.
 * @param segmentDuration - Expected segment duration in seconds.
 * @returns An array of stream segments.
 */
const parseSegments = async (
  dir: string,
  baseUri: string,
  segmentDuration: number,
): Promise<StreamSegment[]> => {
  const files = await readdir(dir)
  const tsFiles = files.filter((f) => f.endsWith('.ts')).sort()

  return tsFiles.map((file, index) => ({
    index,
    duration: segmentDuration,
    uri: `${baseUri}/${file}`,
  }))
}

/**
 * Creates an HLS streaming provider.
 *
 * @param config - Optional provider configuration.
 * @returns A `StreamingProvider` backed by HLS / ffmpeg.
 */
export const createProvider = (config: HlsConfig = {}): StreamingProvider => {
  const ffmpegPath = config.ffmpegPath ?? 'ffmpeg'
  const outputBasePath = config.outputBasePath ?? tmpdir()
  const defaultSegmentDuration = config.segmentDuration ?? 6
  const hlsVersion = config.hlsVersion ?? 3

  /** In-memory segment store keyed by `streamId:segmentIndex`. */
  const segmentStore = new Map<string, Buffer>()

  return {
    async createStream(input: Buffer | string, options?: StreamOptions): Promise<StreamManifest> {
      const streamId = generateStreamId()
      const segmentDuration = options?.segmentDuration ?? defaultSegmentDuration
      const outputDir = join(options?.outputPath ?? outputBasePath, streamId)
      await mkdir(outputDir, { recursive: true })

      const inputPath = await prepareInput(input, outputDir)

      await execFileAsync(ffmpegPath, [
        // Defense-in-depth behind the string-input SSRF guard: restrict ffmpeg
        // to LOCAL protocols only (file, crypto). Network protocols (http,
        // https, tcp, tls) are deliberately NOT whitelisted — a string input
        // must be a local absolute file path (see assertLocalInputPath), so
        // nothing legitimate ever needs network access here. [P5BONDS DiD]
        '-protocol_whitelist',
        'file,crypto',
        '-i',
        inputPath,
        '-codec',
        'copy',
        '-start_number',
        '0',
        '-hls_time',
        String(segmentDuration),
        '-hls_list_size',
        '0',
        '-hls_segment_filename',
        join(outputDir, 'seg-%03d.ts'),
        '-f',
        'hls',
        join(outputDir, 'index.m3u8'),
      ])

      const segments = await parseSegments(outputDir, `/${streamId}`, segmentDuration)

      // Store segments for later retrieval via getSegment
      for (const segment of segments) {
        const fileName = segment.uri.split('/').pop()!
        const data = await readFile(join(outputDir, fileName))
        segmentStore.set(`${streamId}:${segment.index}`, data)
      }

      const duration = segments.reduce((sum, s) => sum + s.duration, 0)

      return {
        id: streamId,
        protocol: 'hls',
        manifestUri: `/${streamId}/index.m3u8`,
        duration,
        segments,
      }
    },

    async transcode(
      input: Buffer | string,
      profiles: TranscodeProfile[],
    ): Promise<TranscodeResult> {
      const streamId = generateStreamId()
      const outputDir = join(outputBasePath, streamId)
      await mkdir(outputDir, { recursive: true })

      const inputPath = await prepareInput(input, outputDir)
      const variants: TranscodeVariant[] = []

      for (const profile of profiles) {
        // Reject untrusted profile names that could escape the output dir or
        // inject ffmpeg args; the validated name is safe for fs paths + URIs.
        assertSafePathComponent(profile.name, 'profile name')
        const profileDir = resolveWithinBase(outputDir, profile.name)
        await mkdir(profileDir, { recursive: true })

        const codec = profile.codec ?? 'h264'
        const args: string[] = [
          // Defense-in-depth behind the string-input SSRF guard: local
          // protocols only — see the createStream whitelist comment.
          // [P5BONDS DiD]
          '-protocol_whitelist',
          'file,crypto',
          '-i',
          inputPath,
          '-c:v',
          codec === 'h264' ? 'libx264' : codec,
          '-b:v',
          String(profile.videoBitrate),
          '-c:a',
          'aac',
          '-b:a',
          String(profile.audioBitrate),
          '-vf',
          `scale=${profile.width}:${profile.height}`,
          '-start_number',
          '0',
          '-hls_time',
          String(defaultSegmentDuration),
          '-hls_list_size',
          '0',
          '-hls_segment_filename',
          join(profileDir, 'seg-%03d.ts'),
          '-f',
          'hls',
          join(profileDir, 'index.m3u8'),
        ]

        await execFileAsync(ffmpegPath, args)

        variants.push({
          profile: profile.name,
          uri: `/${streamId}/${profile.name}/index.m3u8`,
          width: profile.width,
          height: profile.height,
          bitrate: profile.videoBitrate,
        })
      }

      const masterPlaylist = generateMasterPlaylist(variants)
      const masterPath = join(outputDir, 'master.m3u8')
      await writeFile(masterPath, masterPlaylist, 'utf-8')

      return {
        id: streamId,
        masterManifestUri: `/${streamId}/master.m3u8`,
        variants,
      }
    },

    generateManifest(segments: StreamSegment[], options?: StreamOptions): string {
      return generateMediaPlaylist(segments, {
        version: hlsVersion,
        targetDuration: options?.segmentDuration ?? defaultSegmentDuration,
      })
    },

    async getSegment(streamId: string, segmentIndex: number): Promise<Buffer> {
      // Validate caller-supplied lookup values before any fs access — an
      // unvalidated streamId ('../…') would escape the output base on the
      // disk-fallback path below.
      assertSafePathComponent(streamId, 'stream id')
      assertSegmentIndex(segmentIndex)

      const key = `${streamId}:${segmentIndex}`
      const data = segmentStore.get(key)
      if (!data) {
        // Fall back to reading from disk
        const segmentPath = resolveWithinBase(
          outputBasePath,
          streamId,
          `seg-${String(segmentIndex).padStart(3, '0')}.ts`,
        )
        return readFile(segmentPath)
      }
      return data
    },
  }
}

/**
 * The provider implementation with default configuration.
 */
export const provider: StreamingProvider = createProvider()
