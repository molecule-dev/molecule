/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The only stand-in is the native
 * `ffmpeg` binary: `FFMPEG_PATH` points at a tiny shell script that writes the
 * files real ffmpeg would (two `.ts` segments + `index.m3u8`) at the paths the
 * bond passes it. child_process and the filesystem are real.
 *
 * @module
 */
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createStream,
  generateManifest,
  getSegment,
  setProvider,
} from '@molecule/api-media-streaming'

import { createProvider } from '../index.js'

const FAKE_FFMPEG = `#!/bin/sh
# Records its argv, then writes what \`ffmpeg ... -hls_segment_filename P -f hls OUT\` would.
echo "$@" > "$(dirname "$0")/ffmpeg-args.txt"
pattern=""
out=""
while [ $# -gt 0 ]; do
  if [ "$1" = "-hls_segment_filename" ]; then pattern="$2"; shift; fi
  out="$1"
  shift
done
printf 'segment-0' > "$(printf "$pattern" 0)"
printf 'segment-1' > "$(printf "$pattern" 1)"
printf '#EXTM3U\\n' > "$out"
`

describe('README @example', () => {
  const originalEnv = process.env
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'hls-readme-'))
    await mkdir(join(root, 'bin'))
    await mkdir(join(root, 'uploads'))
    await mkdir(join(root, 'hls'))
    await writeFile(join(root, 'bin/ffmpeg'), FAKE_FFMPEG)
    await chmod(join(root, 'bin/ffmpeg'), 0o755)
    await writeFile(join(root, 'uploads/lecture-01.mp4'), Buffer.from('fake mp4 bytes'))
    process.env = {
      ...originalEnv,
      FFMPEG_PATH: join(root, 'bin/ffmpeg'),
      HLS_OUTPUT_DIR: join(root, 'hls'),
      UPLOADS_DIR: join(root, 'uploads'),
    }
  })

  afterAll(async () => {
    process.env = originalEnv
    await rm(root, { recursive: true, force: true })
  })

  it('segments an uploaded file with ffmpeg and serves the playlist and segments', async () => {
    setProvider(
      createProvider({
        ffmpegPath: process.env.FFMPEG_PATH ?? 'ffmpeg',
        outputBasePath: process.env.HLS_OUTPUT_DIR ?? '/srv/media/hls',
        segmentDuration: 6,
      }),
    )

    const upload = join(process.env.UPLOADS_DIR ?? '/srv/uploads', 'lecture-01.mp4')
    const stream = await createStream(upload)

    expect(stream.id).toMatch(/^hls-\d+-\d+$/)
    expect(stream).toMatchObject({
      protocol: 'hls',
      manifestUri: `/${stream.id}/index.m3u8`,
      duration: 12,
      segments: [
        { index: 0, duration: 6, uri: `/${stream.id}/seg-000.ts` },
        { index: 1, duration: 6, uri: `/${stream.id}/seg-001.ts` },
      ],
    })

    const args = await readFile(join(root, 'bin/ffmpeg-args.txt'), 'utf8')
    expect(args).toContain(`-protocol_whitelist file,crypto -i ${upload} -codec copy`)
    expect(args).toContain(`-hls_time 6`)
    expect(args).toContain(join(root, 'hls', stream.id, 'index.m3u8'))

    const playlist = generateManifest(stream.segments)
    expect(playlist).toContain('#EXTM3U')
    expect(playlist).toContain(`/${stream.id}/seg-000.ts`)
    expect(playlist).toContain('#EXT-X-ENDLIST')

    const firstSegment = await getSegment(stream.id, 0)
    expect(firstSegment.toString()).toBe('segment-0')

    await expect(createStream('https://example.com/video.mp4')).rejects.toThrow(
      'string inputs must be local absolute file paths',
    )
  })
})
