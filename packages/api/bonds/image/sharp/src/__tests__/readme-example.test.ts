/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real sharp, real files in a temp dir.
 *
 * @module
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getMetadata, optimize, resize, setProvider, thumbnail } from '@molecule/api-image'

import { createProvider } from '../index.js'

describe('README @example', () => {
  let dir = ''

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'image-sharp-readme-'))
    const source = await sharp({
      create: { width: 1600, height: 1200, channels: 3, background: { r: 40, g: 90, b: 160 } },
    })
      .jpeg()
      .toBuffer()
    await writeFile(join(dir, 'photo.jpg'), source)
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('bonds sharp and processes an uploaded photo through the core', async () => {
    setProvider(createProvider({ defaultWebpQuality: 75, stripMetadata: true }))

    const photo = await readFile(join(dir, 'photo.jpg'))
    const { width, height, format } = await getMetadata(photo)
    expect([width, height, format]).toEqual([1600, 1200, 'jpeg'])

    const hero = await resize(photo, { width: 1200, height: 630, fit: 'cover' })
    const heroMeta = await getMetadata(hero)
    expect([heroMeta.width, heroMeta.height, heroMeta.format]).toEqual([1200, 630, 'jpeg'])

    const avatar = await thumbnail(photo, 128)
    const avatarMeta = await getMetadata(avatar)
    expect([avatarMeta.width, avatarMeta.height]).toEqual([128, 128])

    const webp = await optimize(hero, { format: 'webp', quality: 75 })
    await writeFile(join(dir, 'photo-hero.webp'), webp)
    const written = await getMetadata(await readFile(join(dir, 'photo-hero.webp')))
    expect([written.width, written.height, written.format]).toEqual([1200, 630, 'webp'])
  })
})
