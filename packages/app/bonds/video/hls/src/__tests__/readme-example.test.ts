// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the REAL `@molecule/app-video`
 * core and native player in happy-dom. Only hls.js (network + MSE) is mocked,
 * the same way `provider.test.ts` mocks it.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => {
  const hlsInstance = {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    destroy: vi.fn(),
    levels: [
      { height: 720, width: 1280, bitrate: 2_500_000 },
      { height: 1080, width: 1920, bitrate: 5_000_000 },
    ],
    currentLevel: -1,
  }
  const Hls = vi.fn(function HlsMock() {
    return hlsInstance
  }) as unknown as { new (): typeof hlsInstance; isSupported: ReturnType<typeof vi.fn> }
  Hls.isSupported = vi.fn(() => true)
  return { hlsInstance, Hls }
})

vi.mock('hls.js', () => ({ default: hoisted.Hls }))

import type { QualityLevel } from '@molecule/app-video'
import { createPlayer, setProvider } from '@molecule/app-video'

import { provider } from '../index.js'

describe('README @example', () => {
  it('streams the .m3u8 through hls.js, exposes variants on loadedmetadata, and tears down', async () => {
    setProvider(provider)

    const container = document.createElement('div')
    document.body.append(container)

    const player = await createPlayer({
      container,
      sources: [
        { src: 'https://cdn.example.com/movie/master.m3u8', type: 'application/x-mpegurl' },
        { src: 'https://cdn.example.com/movie/720p.mp4', type: 'video/mp4' },
      ],
      controls: true,
      playsinline: true,
    })

    let levels: QualityLevel[] = []
    player.on('loadedmetadata', () => {
      levels = player.getQualityLevels()
    })
    const pickQuality = (level: QualityLevel): void => player.setQuality(level)
    const unmount = (): void => player.destroy()

    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.controls).toBe(true)
    // Only the MP4 fallback is a <source>; hls.js feeds the stream.
    expect(Array.from(video?.querySelectorAll('source') ?? []).map((s) => s.type)).toEqual([
      'video/mp4',
    ])
    expect(hoisted.hlsInstance.loadSource).toHaveBeenCalledWith(
      'https://cdn.example.com/movie/master.m3u8',
    )
    expect(hoisted.hlsInstance.attachMedia).toHaveBeenCalledWith(video)

    video?.dispatchEvent(new Event('loadedmetadata'))
    expect(levels.map((level) => level.label)).toEqual(['Auto', '720p', '1080p'])

    const hd = levels[2]
    if (!hd) throw new Error('missing 1080p level')
    pickQuality(hd)
    expect(hoisted.hlsInstance.currentLevel).toBe(1)
    expect(player.getQuality()?.label).toBe('1080p')

    unmount()
    expect(hoisted.hlsInstance.destroy).toHaveBeenCalledTimes(1)
    expect(container.querySelector('video')).toBeNull()
  })
})
