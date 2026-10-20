import { beforeEach, describe, expect, it, vi } from 'vitest'

import { extractContent, fetchContent, getProvider, hasProvider, setProvider } from '../provider.js'
import type { WebContentProvider, WebContentResult } from '../types.js'

const mockResult: WebContentResult = {
  url: 'https://example.com/post',
  title: 'A post',
  content: '# A post\n\nBody text.',
  format: 'markdown',
  truncated: false,
  bytes: 1024,
}

const mockProvider: WebContentProvider = {
  fetch: vi.fn().mockResolvedValue(mockResult),
  extract: vi.fn().mockResolvedValue({ ...mockResult, url: undefined }),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('web content core provider bond', () => {
  it('starts unbonded and reports fetch unavailable', async () => {
    expect(hasProvider()).toBe(false)
    expect(() => getProvider()).toThrow('setProvider() first')
    await expect(fetchContent({ url: 'https://example.com' })).rejects.toThrow(
      'setProvider() first',
    )
    await expect(extractContent({ html: '<p>x</p>' })).rejects.toThrow('setProvider() first')
  })

  it('delegates fetch to the bonded provider', async () => {
    setProvider(mockProvider)
    const page = await fetchContent({ url: 'https://example.com/post' }, { mode: 'browser' })
    expect(mockProvider.fetch).toHaveBeenCalledWith(
      { url: 'https://example.com/post' },
      { mode: 'browser' },
    )
    expect(page.title).toBe('A post')
    expect(page.format).toBe('markdown')
  })

  it('delegates extract to the bonded provider with the base URL', async () => {
    setProvider(mockProvider)
    await extractContent(
      { html: '<h1>og</h1>', baseUrl: 'https://example.com/' },
      {
        format: 'text',
      },
    )
    expect(mockProvider.extract).toHaveBeenCalledWith(
      { html: '<h1>og</h1>', baseUrl: 'https://example.com/' },
      { format: 'text' },
    )
  })
})
