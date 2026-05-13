const { mockGetImageProvider, mockGetAIProvider, mockGetAIProviderByName, mockGenerate, mockChat } =
  vi.hoisted(() => ({
    mockGetImageProvider: vi.fn(),
    mockGetAIProvider: vi.fn(),
    mockGetAIProviderByName: vi.fn(),
    mockGenerate: vi.fn(),
    mockChat: vi.fn(),
  }))

vi.mock('@molecule/api-ai-image-generation', () => ({
  getProvider: mockGetImageProvider,
}))

vi.mock('@molecule/api-ai', () => ({
  getProvider: mockGetAIProvider,
  getProviderByName: mockGetAIProviderByName,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyStyleToPrompt,
  defaultResolveModel,
  enhancePrompt,
  runImageGeneration,
} from '../index.js'

function streamChunks(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) yield { type: 'text', text }
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('applyStyleToPrompt', () => {
  it('appends modifier with comma when present', () => {
    expect(applyStyleToPrompt('a cat', 'photorealistic')).toBe('a cat, photorealistic')
  })

  it('returns prompt unchanged when modifier is empty/null/whitespace', () => {
    expect(applyStyleToPrompt('a cat', null)).toBe('a cat')
    expect(applyStyleToPrompt('a cat', undefined)).toBe('a cat')
    expect(applyStyleToPrompt('a cat', '')).toBe('a cat')
    expect(applyStyleToPrompt('a cat', '   ')).toBe('a cat')
  })
})

describe('defaultResolveModel', () => {
  it('returns undefined for missing brandModel', () => {
    expect(defaultResolveModel(undefined, 'openai')).toBeUndefined()
  })

  it('passes through gpt-image-* + dall-e-* brand names', () => {
    expect(defaultResolveModel('gpt-image-1', 'openai')).toBe('gpt-image-1')
    expect(defaultResolveModel('dall-e-3', 'openai')).toBe('dall-e-3')
  })

  it('maps "reverie-print" → "dall-e-3" on openai', () => {
    expect(defaultResolveModel('reverie-print', 'openai')).toBe('dall-e-3')
  })

  it('defaults other reverie-* models → "gpt-image-1" on openai', () => {
    expect(defaultResolveModel('reverie-xl-v3', 'openai')).toBe('gpt-image-1')
  })

  it('returns undefined for non-openai providers (delegates to caller)', () => {
    expect(defaultResolveModel('reverie-xl-v3', 'stability')).toBeUndefined()
  })
})

describe('runImageGeneration', () => {
  it('returns status=queued when no image provider is bonded', async () => {
    mockGetImageProvider.mockReturnValue(null)
    const out = await runImageGeneration({ prompt: 'a cat' })
    expect(out).toEqual({ imageUrl: null, revisedPrompt: null, status: 'queued', error: null })
  })

  it('applies stylePromptModifier before dispatching to the provider', async () => {
    mockGetImageProvider.mockReturnValue({ generate: mockGenerate })
    mockGenerate.mockResolvedValue({ images: [{ url: 'https://x/img.png' }] })
    await runImageGeneration({
      prompt: 'a cat',
      stylePromptModifier: 'photorealistic',
    })
    expect(mockGenerate.mock.calls[0][0].prompt).toBe('a cat, photorealistic')
  })

  it('defaults size=1024x1024 and style=natural', async () => {
    mockGetImageProvider.mockReturnValue({ generate: mockGenerate })
    mockGenerate.mockResolvedValue({ images: [{ url: 'https://x/img.png' }] })
    await runImageGeneration({ prompt: 'a cat' })
    expect(mockGenerate.mock.calls[0][0].size).toBe('1024x1024')
    expect(mockGenerate.mock.calls[0][0].style).toBe('natural')
  })

  it('uses caller-supplied resolveModel override (not defaultResolveModel)', async () => {
    mockGetImageProvider.mockReturnValue({ generate: mockGenerate })
    mockGenerate.mockResolvedValue({ images: [{ url: 'https://x/img.png' }] })
    const resolveModel = vi.fn().mockReturnValue('custom-model')
    await runImageGeneration({
      prompt: 'a cat',
      model: 'reverie-xl-v3',
      provider: 'openai',
      resolveModel,
    })
    expect(resolveModel).toHaveBeenCalledWith('reverie-xl-v3', 'openai')
    expect(mockGenerate.mock.calls[0][0].model).toBe('custom-model')
  })

  it('normalizes base64 image output to data: URL', async () => {
    mockGetImageProvider.mockReturnValue({ generate: mockGenerate })
    mockGenerate.mockResolvedValue({
      images: [{ base64: 'iVBORw0KG...' }],
    })
    const out = await runImageGeneration({ prompt: 'a cat' })
    expect(out.status).toBe('succeeded')
    expect(out.imageUrl).toBe('data:image/png;base64,iVBORw0KG...')
  })

  it('prefers url over base64 when both present', async () => {
    mockGetImageProvider.mockReturnValue({ generate: mockGenerate })
    mockGenerate.mockResolvedValue({
      images: [{ url: 'https://x/img.png', base64: 'zzz' }],
    })
    const out = await runImageGeneration({ prompt: 'a cat' })
    expect(out.imageUrl).toBe('https://x/img.png')
  })

  it('forwards revisedPrompt from provider', async () => {
    mockGetImageProvider.mockReturnValue({ generate: mockGenerate })
    mockGenerate.mockResolvedValue({
      images: [{ url: 'https://x/img.png', revisedPrompt: 'a fluffy cat' }],
    })
    const out = await runImageGeneration({ prompt: 'a cat' })
    expect(out.revisedPrompt).toBe('a fluffy cat')
  })

  it('returns status=failed with "Provider returned no image" when images array is empty', async () => {
    mockGetImageProvider.mockReturnValue({ generate: mockGenerate })
    mockGenerate.mockResolvedValue({ images: [] })
    const out = await runImageGeneration({ prompt: 'a cat' })
    expect(out.status).toBe('failed')
    expect(out.imageUrl).toBeNull()
    expect(out.error).toBe('Provider returned no image')
  })

  it('returns status=failed with error message when provider throws', async () => {
    mockGetImageProvider.mockReturnValue({ generate: mockGenerate })
    mockGenerate.mockRejectedValue(new Error('rate limited'))
    const out = await runImageGeneration({ prompt: 'a cat' })
    expect(out.status).toBe('failed')
    expect(out.error).toBe('rate limited')
  })
})

describe('enhancePrompt', () => {
  it('returns enhanced=false when no AI provider is bonded', async () => {
    mockGetAIProvider.mockReturnValue(null)
    mockGetAIProviderByName.mockReturnValue(null)
    const out = await enhancePrompt({ prompt: 'a cat' })
    expect(out).toEqual({ text: 'a cat', enhanced: false })
  })

  it('uses providerName lookup when supplied', async () => {
    mockGetAIProviderByName.mockReturnValue({ chat: mockChat })
    mockChat.mockReturnValue(streamChunks(['enhanced cat']))
    await enhancePrompt({ prompt: 'a cat', providerName: 'anthropic' })
    expect(mockGetAIProviderByName).toHaveBeenCalledWith('anthropic')
    expect(mockGetAIProvider).not.toHaveBeenCalled()
  })

  it('falls back to default provider when providerName lookup returns null', async () => {
    mockGetAIProviderByName.mockReturnValue(null)
    mockGetAIProvider.mockReturnValue({ chat: mockChat })
    mockChat.mockReturnValue(streamChunks(['enhanced']))
    await enhancePrompt({ prompt: 'a cat', providerName: 'unknown' })
    expect(mockGetAIProvider).toHaveBeenCalled()
  })

  it('returns enhanced=true with collected text on success', async () => {
    mockGetAIProvider.mockReturnValue({ chat: mockChat })
    mockChat.mockReturnValue(streamChunks(['a striking photorealistic cat,', ' golden hour']))
    const out = await enhancePrompt({ prompt: 'a cat' })
    expect(out.enhanced).toBe(true)
    expect(out.text).toBe('a striking photorealistic cat, golden hour')
  })

  it('accepts both event.content and event.text shapes', async () => {
    mockGetAIProvider.mockReturnValue({ chat: mockChat })
    mockChat.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'text', content: 'A-' } // older shape
        yield { type: 'text', text: 'B' } // newer shape
      },
    })
    const out = await enhancePrompt({ prompt: 'x' })
    expect(out.text).toBe('A-B')
  })

  it('returns enhanced=false (with original prompt) when stream errors', async () => {
    mockGetAIProvider.mockReturnValue({ chat: mockChat })
    mockChat.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'text', text: 'partial-' }
        yield { type: 'error', message: 'boom' } // returns null → fallback
      },
    })
    const out = await enhancePrompt({ prompt: 'original' })
    expect(out).toEqual({ text: 'original', enhanced: false })
  })

  it('returns enhanced=false when AI returns only whitespace', async () => {
    mockGetAIProvider.mockReturnValue({ chat: mockChat })
    mockChat.mockReturnValue(streamChunks(['   \n  ']))
    const out = await enhancePrompt({ prompt: 'a cat' })
    expect(out.enhanced).toBe(false)
    expect(out.text).toBe('a cat')
  })

  it('catches synchronous throws from provider.chat', async () => {
    mockGetAIProvider.mockReturnValue({
      chat: () => {
        throw new Error('boom')
      },
    })
    const out = await enhancePrompt({ prompt: 'a cat' })
    expect(out).toEqual({ text: 'a cat', enhanced: false })
  })

  it('defaults maxTokens=600, temperature=0.7, default system prompt', async () => {
    mockGetAIProvider.mockReturnValue({ chat: mockChat })
    mockChat.mockReturnValue(streamChunks(['x']))
    await enhancePrompt({ prompt: 'a cat' })
    const args = mockChat.mock.calls[0][0]
    expect(args.maxTokens).toBe(600)
    expect(args.temperature).toBe(0.7)
    expect(args.system).toContain('expert prompt engineer')
  })
})
