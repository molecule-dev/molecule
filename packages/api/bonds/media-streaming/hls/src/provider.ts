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
import { join } from 'node:path'
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

const execFileAsync = promisify(execFile)

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
    return input
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
        const profileDir = join(outputDir, profile.name)
        await mkdir(profileDir, { recursive: true })

        const codec = profile.codec ?? 'h264'
        const args: string[] = [
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
      const key = `${streamId}:${segmentIndex}`
      const data = segmentStore.get(key)
      if (!data) {
        // Fall back to reading from disk
        const segmentPath = join(
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
