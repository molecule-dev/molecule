/**
 * The `chatCards` and `voice` area fakes: what a case seeds reaches the component through the
 * same registries and globals a real app fills, each operation the component starts is recorded,
 * the controls play the other side, and after the case everything is as it was before.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  type AIVoiceProvider,
  getProvider as getVoiceProvider,
  listVoiceEngines,
  selectVoiceEngine,
  type VoiceEventHandlers,
} from '@molecule/app-ai-voice'
import { bond } from '@molecule/app-bond'
import { getCustomEventCardFactory, registerCustomEventCard } from '@molecule/app-ide-panel-logic'

import { createChatCardsFakes } from '../bindings/fakes/chat-cards.js'
import { createVoiceFakes } from '../bindings/fakes/voice.js'
import type { AreaFakes } from '../bindings/spec.js'

/**
 * A recording sink, as the composition hands each area.
 *
 * @returns The sink and what it received.
 */
const recorder = () => {
  const calls: { name: string; args: unknown[] }[] = []
  return { calls, record: (name: string, args: unknown[]) => void calls.push({ name, args }) }
}

/**
 * Calls an area's control by name.
 *
 * @param fakes - The area's fakes.
 * @param name - The control.
 * @param args - Its arguments.
 * @returns What the control returns.
 */
const control = (fakes: AreaFakes, name: string, ...args: unknown[]): unknown => {
  const fn = fakes.controls?.[name]
  if (!fn) throw new Error(`no control ${name}`)
  return fn(...args)
}

/**
 * The factory registered for a card name.
 *
 * @param name - The custom event name.
 * @returns The factory.
 */
const factory = (name: string) => {
  const found = getCustomEventCardFactory(name)
  if (!found) throw new Error(`no factory for ${name}`)
  return found
}

describe('chatCards area', () => {
  it("renders each seed as the app's factory would, recording action clicks by name", async () => {
    const { calls, record } = recorder()
    const fakes = createChatCardsFakes(
      {
        areas: {
          chatCards: {
            limit: { text: 'Limit reached', action: { label: 'Upgrade', onClick: 'upgrade' } },
            many: 'data',
            broken: 'throw',
            quiet: null,
          },
        },
      },
      record,
    )
    const card = factory('limit')(undefined)
    expect(card).toMatchObject({ text: 'Limit reached', action: { label: 'Upgrade' } })
    const action = card?.action
    if (!action || Array.isArray(action)) throw new Error('expected one action')
    action.onClick?.()
    expect(calls).toEqual([{ name: 'chatCards.click', args: ['upgrade'] }])

    expect(factory('many')({ text: 'From data', content: ['a ', { code: 'x' }] })).toEqual({
      text: 'From data',
      content: ['a ', { code: 'x' }],
    })
    expect(() => factory('many')({ nope: true })).toThrow('needs data.text')
    expect(() => factory('broken')(undefined)).toThrow('the broken card factory threw')
    expect(factory('quiet')(undefined)).toBeNull()
    await fakes.dispose?.()
  })

  it('puts back the factory a name had, and answers null for a name that had none', async () => {
    const original = () => ({ text: 'the app card' })
    registerCustomEventCard('owned', original)
    const fakes = createChatCardsFakes(
      { areas: { chatCards: { owned: { text: 'case card' }, fresh: { text: 'case card' } } } },
      () => undefined,
    )
    expect(factory('owned')(undefined)).toEqual({ text: 'case card' })
    await fakes.dispose?.()
    expect(getCustomEventCardFactory('owned')).toBe(original)
    expect(factory('fresh')(undefined)).toBeNull()
  })
})

/** The Web Speech constructor the fake installs, as a component reads it. */
type RecognitionCtor = new () => {
  continuous: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

/**
 * The installed `window.SpeechRecognition`.
 *
 * @returns The constructor.
 */
const speechCtor = (): RecognitionCtor => Reflect.get(window, 'SpeechRecognition')

describe('voice area', () => {
  it('plays a Web Speech session and removes the constructor afterwards', async () => {
    expect('SpeechRecognition' in window).toBe(false)
    const { calls, record } = recorder()
    const fakes = createVoiceFakes({ areas: { voice: { webSpeech: {} } } }, record)
    const recognition = new (speechCtor())()
    const events: unknown[] = []
    recognition.continuous = true
    recognition.lang = 'en-US'
    recognition.onstart = () => events.push('start')
    recognition.onresult = (event) => events.push(event)
    recognition.onerror = (event) => events.push(event)
    recognition.onend = () => events.push('end')
    recognition.start()
    control(fakes, 'voice.start')
    control(fakes, 'voice.result', 'hello', false)
    control(fakes, 'voice.result', 'hello world')
    control(fakes, 'voice.error', 'no-speech')
    control(fakes, 'voice.end')
    recognition.stop()
    recognition.abort()
    expect(calls.map((c) => c.name)).toEqual(['speech.start', 'speech.stop', 'speech.abort'])
    expect(calls[0].args).toEqual([{ continuous: true, interimResults: false, lang: 'en-US' }])
    expect(events[0]).toBe('start')
    expect(events[2]).toMatchObject({
      resultIndex: 1,
      results: [
        Object.assign([{ transcript: 'hello', confidence: 1 }], { isFinal: false }),
        Object.assign([{ transcript: 'hello world', confidence: 1 }], { isFinal: true }),
      ],
    })
    expect(events[3]).toEqual({ error: 'no-speech', message: '' })
    expect(events[4]).toBe('end')
    await fakes.dispose?.()
    expect('SpeechRecognition' in window).toBe(false)
  })

  it('throws from start() when the case asks, and refuses a control before any session', async () => {
    const { calls, record } = recorder()
    const fakes = createVoiceFakes(
      { areas: { voice: { webSpeech: { startThrows: true } } } },
      record,
    )
    expect(() => new (speechCtor())().start()).toThrow('recognition has already started')
    expect(calls.map((c) => c.name)).toEqual(['speech.start'])
    expect(() => control(fakes, 'voice.result', 'x')).toThrow('reached no dictation session')
    await fakes.dispose?.()
  })

  it('bonds a recording provider, plays its session and restores the bond', async () => {
    const previous: AIVoiceProvider | null = getVoiceProvider()
    const { calls, record } = recorder()
    const fakes = createVoiceFakes({ areas: { voice: { provider: {} } } }, record)
    const provider = getVoiceProvider()
    if (!provider) throw new Error('no provider bonded')
    const seen: unknown[] = []
    const handlers: VoiceEventHandlers = {
      onStateChange: (state) => seen.push(state),
      onTranscript: (event) => seen.push(event),
      onError: (event) => seen.push(event),
    }
    provider.startListening({ language: 'en' }, handlers)
    control(fakes, 'voice.start')
    control(fakes, 'voice.result', 'hi')
    control(fakes, 'voice.error', 'audio-capture')
    expect(() => control(fakes, 'voice.state', 'dancing')).toThrow('voice.state takes one of')
    control(fakes, 'voice.state', 'processing')
    control(fakes, 'voice.end')
    provider.stopListening()
    expect(provider.getState()).toBe('idle')
    expect(provider.isRecognitionSupported()).toBe(true)
    expect(seen).toEqual([
      'listening',
      { transcript: 'hi', isFinal: true, confidence: 1 },
      { code: 'audio-capture', message: 'audio-capture' },
      'processing',
      'idle',
    ])
    expect(calls.map((c) => c.name)).toEqual(['voice.startListening', 'voice.stopListening'])
    await fakes.dispose?.()
    expect(getVoiceProvider()).toBe(previous)
  })

  it('registers the engine catalog, records an engine being created, and clears both', async () => {
    const { calls, record } = recorder()
    const fakes = createVoiceFakes(
      {
        areas: {
          voice: {
            engines: [
              { id: 'native', label: 'Browser', kind: 'native', accuracy: 2, languages: 'all' },
              { id: 'small', label: 'Small', kind: 'on-device', accuracy: 1, languages: ['en'] },
            ],
          },
        },
      },
      record,
    )
    expect(listVoiceEngines().map((engine) => engine.id)).toEqual(['native', 'small'])
    selectVoiceEngine('small')
    expect(calls).toEqual([{ name: 'voice.engine.create', args: ['small'] }])
    expect(getVoiceProvider()?.name).toBe('conformance-voice')
    await fakes.dispose?.()
    expect(listVoiceEngines()).toEqual([])
    expect(getVoiceProvider()).toBeNull()
  })

  it('leaves a provider the case did not replace in place', async () => {
    const outside: AIVoiceProvider = {
      name: 'outside',
      startListening: () => undefined,
      stopListening: () => undefined,
      speak: async () => undefined,
      stopSpeaking: () => undefined,
      getState: () => 'idle',
      isSupported: () => false,
      isRecognitionSupported: () => false,
      isSynthesisSupported: () => false,
      getAvailableVoices: async () => [],
      dispose: () => undefined,
    }
    bond('ai-voice', outside)
    const fakes = createVoiceFakes({ areas: { voice: { webSpeech: {} } } }, () => undefined)
    expect(getVoiceProvider()).toBe(outside)
    await fakes.dispose?.()
    expect(getVoiceProvider()).toBe(outside)
    bond('ai-voice', null)
  })
})
