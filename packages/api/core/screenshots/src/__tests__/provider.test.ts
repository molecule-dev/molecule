import { beforeEach, describe, expect, it, vi } from 'vitest'

import { capture, getProvider, hasProvider, setProvider } from '../provider.js'
import type { ScreenshotProvider } from '../types.js'

const mockProvider: ScreenshotProvider = {
  capture: vi.fn().mockResolvedValue(Buffer.from([137, 80, 78, 71])),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('screenshots core provider bond', () => {
  it('starts unbonded and reports capture unavailable', async () => {
    expect(hasProvider()).toBe(false)
    expect(() => getProvider()).toThrow('setProvider() first')
    await expect(capture({ html: '<p>x</p>' })).rejects.toThrow('setProvider() first')
  })

  it('delegates capture to the bonded provider', async () => {
    setProvider(mockProvider)
    const bytes = await capture({ url: 'https://example.com' }, { width: 640, height: 480 })
    expect(mockProvider.capture).toHaveBeenCalledWith(
      { url: 'https://example.com' },
      { width: 640, height: 480 },
    )
    expect(bytes).toEqual(Buffer.from([137, 80, 78, 71]))
  })

  it('passes source and options through unchanged', async () => {
    setProvider(mockProvider)
    await capture({ html: '<h1>og</h1>' }, { format: 'jpeg', quality: 90, scale: 2 })
    expect(mockProvider.capture).toHaveBeenCalledWith(
      { html: '<h1>og</h1>' },
      { format: 'jpeg', quality: 90, scale: 2 },
    )
  })
})
