/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real Jimp, real files in a temp dir.
 *
 * @module
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Jimp } from 'jimp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { convert, getMetadata, resize, setProvider, thumbnail } from '@molecule/api-image'

import { createProvider, getSupportedFormats } from '../index.js'

describe('README @example', () => {
  let dir = ''

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'image-jimp-readme-'))
    const source = new Jimp({ width: 400, height: 300, color: 0x3366ccff })
    await writeFile(join(dir, 'photo.png'), await source.getBuffer('image/png'))
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('bonds jimp and processes an uploaded photo through the core', async () => {
    setProvider(createProvider({ defaultJpegQuality: 80 }))

    const photo = await readFile(join(dir, 'photo.png'))
    const { width, height, format } = await getMetadata(photo)
    expect([width, height, format]).toEqual([400, 300, 'png'])

    const preview = await resize(photo, { width: 200 })
    const previewMeta = await getMetadata(preview)
    expect([previewMeta.width, previewMeta.height]).toEqual([200, 150])

    const avatar = await thumbnail(photo, 64)
    const avatarMeta = await getMetadata(avatar)
    expect([avatarMeta.width, avatarMeta.height]).toEqual([64, 64])

    const jpeg = await convert(preview, 'jpeg', 75)
    await writeFile(join(dir, 'photo-preview.jpg'), jpeg)
    const written = await getMetadata(await readFile(join(dir, 'photo-preview.jpg')))
    expect(written.format).toBe('jpeg')
    expect([written.width, written.height]).toEqual([200, 150])

    expect([...getSupportedFormats()]).toEqual(['jpeg', 'png', 'gif', 'tiff'])
  })
})
