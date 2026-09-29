import { describe, expect, it } from 'vitest'

import type { AIProvider, ChatEvent, ChatParams } from '@molecule/api-ai'
import type { AISpeechProvider } from '@molecule/api-ai-speech'

import {
  audioMediaType,
  createProvider,
  parseSpeakerLines,
  provider as lazyProvider,
} from '../provider.js'

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

const AUDIO = new Uint8Array([1, 2, 3])

/** The content blocks of the user message the bond builds. */
type UserContent = Extract<ChatParams['messages'][number]['content'], unknown[]>
const userBlocks = (m: ChatParams['messages'][number]): UserContent => m.content as UserContent

const done: ChatEvent = { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } }

describe('api-ai-speech-llm', () => {
  it('sends the audio as a base64 block and returns the answer, fences stripped', async () => {
    const { ai, calls } = fakeAi([{ type: 'text', content: '```\nhello world\n```' }, done])

    const result = await createProvider({ ai }).transcribe!({ audio: AUDIO, filename: 'memo.webm' })

    expect(result).toEqual({ text: 'hello world' })
    const content = userBlocks(calls[0].messages[0])
    expect(content[0]).toEqual({ type: 'audio', mediaType: 'audio/webm', data: 'AQID' })
    expect(JSON.stringify(content[1])).toContain('Transcribe this audio')
    expect(calls[0].system).toContain('speech-to-text engine')
    expect(calls[0].temperature).toBeUndefined()
    expect(calls[0].maxTokens).toBe(1024)
  })

  it('forwards language, prompt, model, temperature and instructions', async () => {
    const { ai, calls } = fakeAi([{ type: 'text', content: 'bonjour' }, done])

    const result = await createProvider({ ai, model: 'cfg-model', instructions: 'Keep fillers' })
      .transcribe!({
      audio: AUDIO,
      language: 'fr',
      prompt: 'Synthase',
      model: 'call-model',
      temperature: 0.1,
    })

    expect(result).toEqual({ text: 'bonjour', language: 'fr' })
    expect(calls[0].model).toBe('call-model')
    expect(calls[0].temperature).toBe(0.1)
    expect(calls[0].system).toContain('Keep fillers')
    const text = (userBlocks(calls[0].messages[0])[1] as { text: string }).text
    expect(text).toContain('"fr"')
    expect(text).toContain('Synthase')
  })

  it('asks for speaker labels and parses them into segments when diarize is set', async () => {
    const { ai, calls } = fakeAi([
      { type: 'text', content: 'speaker_0: hi there\nspeaker_1: hello\nhow are you' },
      done,
    ])

    const result = await createProvider({ ai }).transcribe!({
      audio: AUDIO,
      diarize: true,
      maxSpeakers: 2,
    })

    expect(calls[0].system).toContain('speaker_<n>')
    expect(calls[0].system).toContain('at most 2 speakers')
    expect(result).toEqual({
      text: 'hi there\nhello how are you',
      segments: [
        { id: 0, start: 0, end: 0, text: 'hi there', speaker: 'speaker_0' },
        { id: 1, start: 0, end: 0, text: 'hello how are you', speaker: 'speaker_1' },
      ],
    })
  })

  it('falls back to plain text when the model ignored the speaker format', async () => {
    const { ai } = fakeAi([{ type: 'text', content: 'no labels here' }, done])
    const result = await createProvider({ ai }).transcribe!({ audio: AUDIO, diarize: true })
    expect(result).toEqual({ text: 'no labels here' })
  })

  it('refuses srt/vtt output', async () => {
    const { ai } = fakeAi([done])
    await expect(
      createProvider({ ai }).transcribe!({ audio: AUDIO, responseFormat: 'srt' }),
    ).rejects.toThrow(/no timings/)
  })

  it('surfaces a model error with its errorKey', async () => {
    const { ai } = fakeAi([{ type: 'error', message: 'audio not supported', errorKey: 'ai.bad' }])
    await expect(createProvider({ ai }).transcribe!({ audio: AUDIO })).rejects.toMatchObject({
      message: 'Transcription model error: audio not supported',
      errorKey: 'ai.bad',
    })
  })

  it('offers batch transcription only', () => {
    const speech = createProvider({ ai: fakeAi([]).ai })
    expect(speech.name).toBe('llm')
    expect(speech.transcribeStream).toBeUndefined()
    expect(speech.diarize).toBeUndefined()
  })

  it('maps filename extensions to audio MIME types', () => {
    expect(audioMediaType('a.m4a')).toBe('audio/mp4')
    expect(audioMediaType('a.MP3')).toBe('audio/mpeg')
    expect(audioMediaType(undefined)).toBe('audio/wav')
    expect(audioMediaType('a.xyz')).toBe('audio/wav')
  })

  it('parses bold speaker labels', () => {
    expect(parseSpeakerLines('**Speaker 2:** yes')?.segments[0].speaker).toBe('speaker_2')
  })
})

describe('provider — lazy singleton export', () => {
  it('is typed as the core AISpeechProvider', () => {
    const typed: AISpeechProvider = lazyProvider
    expect(typed.name).toBe('llm')
  })
})
