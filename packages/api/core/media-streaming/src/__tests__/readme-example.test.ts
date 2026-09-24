/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the HLS bond. Only the
 * `ffmpeg` process (`node:child_process` `execFile`) is mocked, the same way
 * the bond's own tests mock it — the fake ffmpeg writes real segment files
 * into a temp output directory so the bond's own disk handling runs.
 *
 * @module
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

const { ffmpegCalls } = vi.hoisted(() => ({ ffmpegCalls: [] as string[][] }))

vi.mock('node:child_process', () => ({
  execFile: (
    _cmd: string,
    args: string[],
    callback: (err: Error | null, stdout: string, stderr: string) => void,
  ): void => {
    ffmpegCalls.push(args)
    const pattern = args[args.indexOf('-hls_segment_filename') + 1] ?? ''
    const outDir = dirname(pattern)
    void Promise.all([
      writeFile(join(outDir, 'seg-000.ts'), 'segment-0'),
      writeFile(join(outDir, 'seg-001.ts'), 'segment-1'),
      writeFile(join(outDir, 'index.m3u8'), '#EXTM3U\n'),
    ]).then(
      () => callback(null, '', ''),
      (error: Error) => callback(error, '', ''),
    )
  },
}))

import { createProvider } from '@molecule/api-media-streaming-hls'

import { createStream, generateManifest, getSegment, setProvider } from '../index.js'

let dir: string | undefined

describe('README @example', () => {
  afterEach(async () => {
    vi.unstubAllEnvs()
    if (dir) await rm(dir, { recursive: true, force: true })
  })

  it('bonds HLS, segments a local file, builds the playlist and serves a segment', async () => {
    dir = await mkdtemp(join(tmpdir(), 'hls-readme-'))
    vi.stubEnv('HLS_OUTPUT_DIR', dir)

    setProvider(
      createProvider({
        outputBasePath: process.env.HLS_OUTPUT_DIR ?? '/srv/media/hls',
        segmentDuration: 6,
      }),
    )

    const stream = await createStream('/srv/uploads/lecture-01.mp4', { segmentDuration: 6 })
    expect(stream.id).toMatch(/^hls-/)
    expect(stream.manifestUri).toBe(`/${stream.id}/index.m3u8`)
    expect(stream.duration).toBe(12)
    expect(stream.segments.map((s) => s.uri)).toEqual([
      `/${stream.id}/seg-000.ts`,
      `/${stream.id}/seg-001.ts`,
    ])

    const playlist = generateManifest(stream.segments, { segmentDuration: 6 })
    expect(playlist).toContain('#EXTM3U')
    expect(playlist).toContain('#EXT-X-TARGETDURATION:6')
    expect(playlist).toContain(`/${stream.id}/seg-001.ts`)
    expect(playlist).toContain('#EXT-X-ENDLIST')

    const firstSegment = await getSegment(stream.id, 0)
    expect(firstSegment.toString()).toBe('segment-0')

    const args = ffmpegCalls[0] ?? []
    expect(args[args.indexOf('-i') + 1]).toBe('/srv/uploads/lecture-01.mp4')
    expect(args[args.indexOf('-protocol_whitelist') + 1]).toBe('file,crypto')

    await expect(createStream('https://evil.example/video.mp4')).rejects.toThrow(
      'string inputs must be local absolute file paths',
    )
  })
})
