/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the OpenAI image bond and the
 * Anthropic chat bond. Only the network is mocked: `fetch` answers the OpenAI
 * Images API with JSON and the Anthropic Messages API with an SSE stream.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setAIProvider } from '@molecule/api-ai'
import { createProvider as createChatProvider } from '@molecule/api-ai-anthropic'
import { setProvider as setImageProvider } from '@molecule/api-ai-image-generation'
import { createProvider as createImageProvider } from '@molecule/api-ai-image-generation-openai'

import { enhancePrompt, runImageGeneration } from '../index.js'

/**
 * Builds a streaming fetch Response whose Anthropic SSE stream yields `text` as one text block.
 *
 * @param text - The model's full reply text.
 * @returns A minimal streaming Response.
 */
function sseTextResponse(text: string): Response {
  const events: Array<Record<string, unknown>> = [
    { type: 'message_start', message: { usage: { input_tokens: 40 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', usage: { output_tokens: 30 } },
    { type: 'message_stop' },
  ]
  const body = events.map((e) => `data: ${JSON.stringify(e)}`).join('\n') + '\n'
  return new Response(new TextEncoder().encode(body), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

const ENHANCED = 'a tabby cat on a sunlit windowsill, 50mm lens, shallow depth of field'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('enhances the prompt, then generates an image through the bonded providers', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-test')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/v1/messages')) return sseTextResponse(ENHANCED)
      if (url.endsWith('/v1/images/generations')) {
        return new Response(JSON.stringify({ created: 1, data: [{ b64_json: 'iVBORw0KGgo=' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    setImageProvider(createImageProvider({ apiKey: process.env.OPENAI_API_KEY }))
    setAIProvider(createChatProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

    const enhanced = await enhancePrompt({ prompt: 'a cat on a windowsill' })
    expect(enhanced).toEqual({ text: ENHANCED, enhanced: true })

    const result = await runImageGeneration({
      prompt: enhanced.text,
      size: '1024x1024',
      stylePromptModifier: 'photorealistic, golden hour lighting',
      model: 'gpt-image-1',
    })

    expect(result.status).toBe('succeeded')
    expect(result.error).toBeNull()
    expect(result.imageUrl).toBe('data:image/png;base64,iVBORw0KGgo=')

    const imageCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/v1/images/generations'))
    expect(imageCall).toBeDefined()
    const init = (imageCall as unknown as [string, RequestInit])[1]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-openai-test')
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'gpt-image-1',
      prompt: `${ENHANCED}, photorealistic, golden hour lighting`,
      size: '1024x1024',
    })
  })
})
