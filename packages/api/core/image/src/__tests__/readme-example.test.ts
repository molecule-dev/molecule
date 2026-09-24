/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real Sharp bond on a
 * real JPEG written to a temp file. Nothing is mocked.
 *
 * @module
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'

import { createProvider } from '@molecule/api-image-sharp'

import { getMetadata, optimize, resize, setProvider, thumbnail } from '../index.js'

let dir: string | undefined

describe('README @example', () => {
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
  })

  it('bonds Sharp and produces a bounded WebP and a square avatar from an upload', async () => {
    dir = await mkdtemp(join(tmpdir(), 'image-readme-'))
    const path = join(dir, 'photo.jpg')
    const jpeg = await sharp({
      create: { width: 2400, height: 1600, channels: 3, background: { r: 200, g: 80, b: 40 } },
    })
      .jpeg()
      .toBuffer()
    await writeFile(path, jpeg)

    setProvider(createProvider({ defaultWebpQuality: 80, limitInputPixels: 50_000_000 }))

    async function processUpload(upload: Buffer): Promise<{
      width: number
      height: number
      webp: Buffer
      avatar: Buffer
    }> {
      const meta = await getMetadata(upload)
      const display = await resize(upload, { width: 1200, fit: 'inside', withoutEnlargement: true })
      const webp = await optimize(display, { format: 'webp', quality: 80 })
      const avatar = await thumbnail(upload, 256)
      return { width: meta.width, height: meta.height, webp, avatar }
    }

    const variants = await processUpload(await readFile(path))

    expect(variants.width).toBe(2400)
    expect(variants.height).toBe(1600)
    const webpMeta = await getMetadata(variants.webp)
    expect(webpMeta).toMatchObject({ format: 'webp', width: 1200, height: 800 })
    const avatarMeta = await getMetadata(variants.avatar)
    expect(avatarMeta).toMatchObject({ format: 'jpeg', width: 256, height: 256 })

    await expect(getMetadata(Buffer.from('not an image'))).rejects.toThrow()
  })
})
