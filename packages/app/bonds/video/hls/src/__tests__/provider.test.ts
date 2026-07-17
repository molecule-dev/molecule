import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerConfig } from '@molecule/app-video'

// Mock the native player (the control surface the bond reuses) + hls.js, so we can
// assert the HLS wiring + quality overrides without a real DOM or network.
const hoisted = vi.hoisted(() => {
  const video = {
    canPlayType: vi.fn(() => ''), // default: no native HLS → hls.js path
    src: '',
  } as unknown as HTMLVideoElement

  const nativePlayer = {
    play: vi.fn(), // arbitrary passthrough method — proves the spread reuses native
    getVideoElement: vi.fn(() => video),
    getQualityLevels: vi.fn(() => [{ id: 0, label: '720p (native)' }]),
    setQuality: vi.fn(),
    getQuality: vi.fn(() => ({ id: 0, label: '720p (native)' })),
    getSource: vi.fn(() => ({ src: 'fallback.mp4' })),
    load: vi.fn(),
    destroy: vi.fn(),
  }
  const createNativePlayer = vi.fn(() => nativePlayer)

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
  // Regular (non-arrow) function so `new Hls()` is valid; returning an object
  // makes `new` yield that shared instance, which the assertions inspect.
  const Hls = vi.fn(function HlsMock() {
    return hlsInstance
  }) as unknown as {
    new (): typeof hlsInstance
    isSupported: ReturnType<typeof vi.fn>
  }
  Hls.isSupported = vi.fn(() => true)

  return { video, nativePlayer, createNativePlayer, hlsInstance, Hls }
})

vi.mock('@molecule/app-video', () => ({ createNativePlayer: hoisted.createNativePlayer }))
vi.mock('hls.js', () => ({ default: hoisted.Hls }))

const { provider, createHlsPlayer } = await import('../provider.js')

const hlsCfg = (): PlayerConfig => ({
  container: {} as HTMLElement,
  sources: [{ src: 'https://x/stream.m3u8', type: 'application/x-mpegurl' }],
})

describe('@molecule/app-video-hls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.hlsInstance.currentLevel = -1
    hoisted.video.src = ''
    hoisted.video.canPlayType = vi.fn(() => '') as HTMLVideoElement['canPlayType']
  })

  it('reports name, loaded state, formats, and HLS-but-not-DASH support', () => {
    expect(provider.getName()).toBe('hls.js')
    expect(provider.isLoaded()).toBe(true)
    expect(provider.getSupportedFormats()).toContain('application/x-mpegurl')
    expect(provider.supportsHls()).toBe(true)
    expect(provider.supportsDash()).toBe(false)
  })

  it('attaches hls.js to the native video element for an .m3u8 source', () => {
    provider.createPlayer(hlsCfg())
    // Native gets ONLY the non-HLS sources (none here), then hls.js feeds the stream.
    expect(hoisted.createNativePlayer).toHaveBeenCalledWith(
      expect.objectContaining({ sources: [] }),
    )
    expect(hoisted.hlsInstance.loadSource).toHaveBeenCalledWith('https://x/stream.m3u8')
    expect(hoisted.hlsInstance.attachMedia).toHaveBeenCalledWith(hoisted.video)
  })

  it('exposes hls.js levels (Auto + variants, bitrate in kbps) when hls is active', () => {
    const player = createHlsPlayer(hlsCfg())
    expect(player.getQualityLevels()).toEqual([
      { id: -1, label: 'Auto' },
      { id: 0, label: '720p', height: 720, width: 1280, bitrate: 2500 },
      { id: 1, label: '1080p', height: 1080, width: 1920, bitrate: 5000 },
    ])
  })

  it('setQuality maps to hls.js currentLevel (-1 = Auto)', () => {
    const player = createHlsPlayer(hlsCfg())
    player.setQuality(1)
    expect(hoisted.hlsInstance.currentLevel).toBe(1)
    player.setQuality(-1)
    expect(hoisted.hlsInstance.currentLevel).toBe(-1)
  })

  it('getQuality reflects the active hls.js level', () => {
    const player = createHlsPlayer(hlsCfg())
    expect(player.getQuality()).toEqual({ id: -1, label: 'Auto' })
    hoisted.hlsInstance.currentLevel = 1
    expect(player.getQuality()).toMatchObject({ id: 1, label: '1080p' })
  })

  it('destroy() tears down BOTH the hls.js instance and the native player', () => {
    const player = createHlsPlayer(hlsCfg())
    player.destroy()
    expect(hoisted.hlsInstance.destroy).toHaveBeenCalled()
    expect(hoisted.nativePlayer.destroy).toHaveBeenCalled()
  })

  it('uses native HLS (no hls.js) on Safari/iOS', () => {
    hoisted.video.canPlayType = vi.fn(() => 'maybe') as HTMLVideoElement['canPlayType']
    const player = createHlsPlayer(hlsCfg())
    expect(hoisted.Hls).not.toHaveBeenCalled()
    expect(hoisted.video.src).toBe('https://x/stream.m3u8')
    // With no hls.js instance, quality falls back to the native player.
    expect(player.getQualityLevels()).toEqual([{ id: 0, label: '720p (native)' }])
  })

  it('delegates to the native player (and passes through its methods) for non-HLS sources', () => {
    const player = createHlsPlayer({
      container: {} as HTMLElement,
      sources: [{ src: 'movie.mp4', type: 'video/mp4' }],
    })
    expect(hoisted.Hls).not.toHaveBeenCalled()
    expect(player.getQualityLevels()).toEqual([{ id: 0, label: '720p (native)' }])
    player.setQuality(0)
    expect(hoisted.nativePlayer.setQuality).toHaveBeenCalledWith(0)
    expect(typeof player.play).toBe('function') // spread reuses the native surface
  })
})
