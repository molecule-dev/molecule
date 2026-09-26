import { describe, expect, it } from 'vitest'

import type { AIProvider, ChatEvent, ChatParams } from '@molecule/api-ai'

import { createProvider } from '../provider.js'

/** Captures params and emits a scripted event list. */
function fakeAi(events: ChatEvent[]): { ai: AIProvider; calls: ChatParams[] } {
  const calls: ChatParams[] = []
  return {
    calls,
    ai: {
      name: 'fake',
      async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
        calls.push(params)
        for (const event of events) yield event
      },
    },
  }
}

const IMAGE = { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' }

/** The content blocks of the user message the bond builds. */
type UserContent = Extract<ChatParams['messages'][number]['content'], unknown[]>
const userBlocks = (m: ChatParams['messages'][number]): UserContent => m.content as UserContent

describe('api-ocr-llm', () => {
  it('returns the model answer as a single page, fences stripped', async () => {
    const { ai } = fakeAi([
      { type: 'text', content: '```\nHELLO\nworld\n```' },
      { type: 'done', usage: { inputTokens: 10, outputTokens: 5 } },
    ])
    const result = await createProvider({ ai }).recognize(IMAGE)
    expect(result).toEqual({
      text: 'HELLO\nworld',
      pages: [{ pageNumber: 1, text: 'HELLO\nworld' }],
    })
  })

  it('sends the image as a base64 block plus the transcription instruction', async () => {
    const { ai, calls } = fakeAi([{ type: 'text', content: 'x' }, { type: 'done' }])
    await createProvider({ ai }).recognize(IMAGE)
    const [user] = calls[0].messages
    const content = userBlocks(user)
    expect(content[0]).toEqual({ type: 'image', mediaType: 'image/png', data: 'AQID' })
    expect(JSON.stringify(content[1])).toContain('Transcribe all text')
  })

  it('forwards the language hint, model and instructions', async () => {
    const { ai, calls } = fakeAi([{ type: 'text', content: 'x' }, { type: 'done' }])
    await createProvider({
      ai,
      model: 'vision-mini',
      instructions: 'This is a receipt.',
    }).recognize(IMAGE, { language: 'de' })
    expect(calls[0].model).toBe('vision-mini')
    expect(calls[0].system).toContain('This is a receipt.')
    const content = userBlocks(calls[0].messages[0])
    expect((content[1] as { text: string }).text).toContain('"de"')
  })

  it('falls back to the config language when the call passes none', async () => {
    const { ai, calls } = fakeAi([{ type: 'text', content: 'x' }, { type: 'done' }])
    await createProvider({ ai, language: 'zh-TW' }).recognize(IMAGE)
    const content = userBlocks(calls[0].messages[0])
    expect((content[1] as { text: string }).text).toContain('"zh-TW"')
  })

  it('throws on a model error event', async () => {
    const { ai } = fakeAi([
      { type: 'error', message: 'image too large', errorKey: 'imageTooLarge' },
    ])
    await expect(createProvider({ ai }).recognize(IMAGE)).rejects.toMatchObject({
      message: 'OCR model error: image too large',
      errorKey: 'imageTooLarge',
    })
  })

  it('omits temperature by default (rejectsTemperature models 400 on the parameter)', async () => {
    const { ai, calls } = fakeAi([{ type: 'text', content: 'x' }, { type: 'done' }])
    await createProvider({ ai }).recognize(IMAGE)
    expect(calls[0].temperature).toBeUndefined()
    const { ai: ai2, calls: calls2 } = fakeAi([{ type: 'text', content: 'x' }, { type: 'done' }])
    await createProvider({ ai: ai2, temperature: 0.2 }).recognize(IMAGE)
    expect(calls2[0].temperature).toBe(0.2)
  })
})
