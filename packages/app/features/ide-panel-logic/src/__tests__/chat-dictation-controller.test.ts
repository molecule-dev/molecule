/**
 * Unit tests for the chat dictation controller: every engine/path branch, the
 * restart and give-up bookkeeping, and the storage it reads and writes — driven
 * through fake media APIs, since jsdom (let alone Node) never has a working
 * speech service.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

import {
  ChatDictationController,
  type ChatDictationControllerOptions,
  type DictationEngine,
  type DictationStorage,
  type DictationVoiceEventHandlers,
  type DictationVoiceRecognitionOptions,
  MIC_ENGINE_STORAGE_KEY,
  type SpeechRecognitionConstructor,
  type SpeechRecognitionSession,
  WEB_SPEECH_DEAD_STORAGE_KEY,
} from '../components/chat-dictation-controller.js'

const translate: TranslateFunction = (key, _values, options) => options?.defaultValue ?? key

/** One Web Speech session as the browser constructs it, with its calls recorded. */
class FakeSession implements SpeechRecognitionSession {
  start = vi.fn<() => void>()
  stop = vi.fn<() => void>()
  abort = vi.fn<() => void>()
  onstart: (() => void) | null = null
  onresult: ((event: unknown) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  continuous = false
  interimResults = false
  lang = ''
}

/** A constructor producing fake sessions, recording each one it creates. */
function makeConstructor(): {
  ctor: SpeechRecognitionConstructor
  sessions: FakeSession[]
  startThrows: { value: boolean }
} {
  const sessions: FakeSession[] = []
  const startThrows = { value: false }
  class FakeRecognition extends FakeSession {
    constructor() {
      super()
      if (startThrows.value) {
        this.start.mockImplementation(() => {
          throw new Error('InvalidStateError')
        })
      }
      sessions.push(this)
    }
  }
  return { ctor: FakeRecognition, sessions, startThrows }
}

/** A Web Storage area holding the given entries, with calls recorded. */
function makeStore(initial: Record<string, string> = {}): DictationStorage & {
  data: Map<string, string>
} {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key)
    }),
  }
}

/** A bonded on-device provider whose recognition support can be toggled. */
interface FakeProvider {
  isRecognitionSupported(): boolean
  startListening: Mock<
    (opts?: DictationVoiceRecognitionOptions, handlers?: DictationVoiceEventHandlers) => void
  >
  stopListening: Mock<() => void>
  handlers: () => DictationVoiceEventHandlers | undefined
  options: () => DictationVoiceRecognitionOptions | undefined
}

/** A fake on-device provider recording the options and handlers it was given. */
function makeProvider(supported = true): FakeProvider {
  let handlers: DictationVoiceEventHandlers | undefined
  let options: DictationVoiceRecognitionOptions | undefined
  return {
    isRecognitionSupported: () => supported,
    startListening: vi.fn(
      (opts?: DictationVoiceRecognitionOptions, h?: DictationVoiceEventHandlers) => {
        options = opts
        handlers = h
      },
    ),
    stopListening: vi.fn<() => void>(),
    handlers: () => handlers,
    options: () => options,
  }
}

const NATIVE: DictationEngine = { id: 'native', kind: 'native', languages: 'all' }
const ON_DEVICE: DictationEngine = { id: 'whisper', kind: 'on-device', languages: ['en'] }
const ENGINES: DictationEngine[] = [NATIVE, ON_DEVICE]

/** The host's state setters, recorded in order so a test can inspect them. */
function makeHost() {
  return {
    listening: [] as boolean[],
    errors: [] as (string | null)[],
    notices: [] as (string | null)[],
    dead: [] as boolean[],
    engineIds: [] as (string | null)[],
    input: 'draft',
    snippets: [] as string[],
    inserted: 0,
    started: 0,
    closedPopups: 0,
    openedPickers: 0,
    closedPickers: 0,
  }
}

type Host = ReturnType<typeof makeHost>

/** Controller options wired to a recorded host, with every override applied. */
function optionsFor(
  host: Host,
  overrides: Partial<ChatDictationControllerOptions> = {},
): ChatDictationControllerOptions {
  return {
    translate,
    selectEngine: () => null,
    engineCoversLanguage: () => true,
    getVoiceProvider: () => null,
    readInput: () => host.input,
    writeInput: (value) => {
      host.input = value
    },
    pushDictatedSnippet: (transcript) => {
      host.snippets.push(transcript)
    },
    onTranscriptInserted: () => {
      host.inserted++
    },
    onDictationStart: () => {
      host.started++
    },
    closeSiblingPopups: () => {
      host.closedPopups++
    },
    openMicPicker: () => {
      host.openedPickers++
    },
    closeMicPicker: () => {
      host.closedPickers++
    },
    setListening: (value) => {
      host.listening.push(value)
    },
    setVoiceError: (message) => {
      host.errors.push(message)
    },
    setVoiceNotice: (message) => {
      host.notices.push(message)
    },
    setWebSpeechDead: (value) => {
      host.dead.push(value)
    },
    setCurrentVoiceEngineId: (value) => {
      host.engineIds.push(value)
    },
    getLanguage: () => 'en-US',
    ...overrides,
  }
}

/** A controller plus its recorded host. */
function makeController(overrides: Partial<ChatDictationControllerOptions> = {}): {
  controller: ChatDictationController
  host: Host
} {
  const host = makeHost()
  const controller = new ChatDictationController(optionsFor(host, overrides))
  return { controller, host }
}

/** One recognition result carrying the final transcripts in `results`. */
function resultEvent(
  transcripts: Array<{ transcript: string; isFinal: boolean }>,
  resultIndex = 0,
): unknown {
  const results = transcripts.map((t) =>
    Object.assign([{ transcript: t.transcript }], { isFinal: t.isFinal }),
  )
  return { results, resultIndex }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('storage keys', () => {
  it('keeps the persisted key names the panel always used', () => {
    expect(WEB_SPEECH_DEAD_STORAGE_KEY).toBe('molecule.ide.webSpeechDead')
    expect(MIC_ENGINE_STORAGE_KEY).toBe('molecule.ide.voiceEngine')
  })
})

describe('construction', () => {
  it('performs no I/O', () => {
    expect(
      () =>
        new ChatDictationController(
          optionsFor(makeHost(), {
            sessionStore: () => {
              throw new Error('session storage must not be read on construction')
            },
            localStore: () => {
              throw new Error('local storage must not be read on construction')
            },
            getVoiceProvider: () => {
              throw new Error('the voice provider must not be read on construction')
            },
            getLanguage: () => {
              throw new Error('the language must not be read on construction')
            },
            selectEngine: () => {
              throw new Error('the engine catalog must not be read on construction')
            },
            setTimer: () => {
              throw new Error('no timer may be scheduled on construction')
            },
            now: () => {
              throw new Error('the clock must not be read on construction')
            },
          }),
        ),
    ).not.toThrow()
  })

  it('defaults to empty engines and a null provider', () => {
    const { controller, host } = makeController()
    // No catalog and no provider: the legacy path shows "unavailable".
    controller.beginDictation()
    expect(host.errors).toEqual([null, 'Dictation is not available in this browser.'])
  })
})

describe('mount', () => {
  it('restores the dead-service flag from session storage', () => {
    const provider = makeProvider()
    const host = makeHost()
    const controller = new ChatDictationController(
      optionsFor(host, {
        speechRecognitionConstructor: makeConstructor().ctor,
        sessionStore: () => makeStore({ [WEB_SPEECH_DEAD_STORAGE_KEY]: '1' }),
        getVoiceProvider: () => provider,
      }),
    )
    controller.mount()
    controller.beginDictation()
    // Dead Web Speech: the legacy path hands straight over to the provider.
    expect(provider.startListening).toHaveBeenCalled()
    expect(host.listening).toEqual([true])
  })

  it('treats an unavailable session store as "not dead"', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller } = makeController({
      sessionStore: () => undefined,
      speechRecognitionConstructor: ctor,
    })
    controller.mount()
    controller.beginDictation()
    expect(sessions).toHaveLength(1)
  })
})

describe('restoreSavedEngine', () => {
  it('is a no-op without a catalog', () => {
    const selectEngine = vi.fn(() => null)
    const { controller } = makeController({
      selectEngine,
      localStore: () => makeStore({ [MIC_ENGINE_STORAGE_KEY]: 'native' }),
    })
    controller.restoreSavedEngine()
    expect(selectEngine).not.toHaveBeenCalled()
  })

  it('restores the saved engine so the next mic click uses it', async () => {
    const { ctor, sessions } = makeConstructor()
    const selectEngine = vi.fn((id: string) => (id === 'native' ? NATIVE : null))
    const { controller } = makeController({
      speechRecognitionConstructor: ctor,
      engines: ENGINES,
      selectEngine,
      localStore: () => makeStore({ [MIC_ENGINE_STORAGE_KEY]: 'native' }),
    })
    controller.restoreSavedEngine()
    expect(selectEngine).toHaveBeenCalledWith('native')
    // The chosen engine decides the path: native starts Web Speech directly.
    controller.toggleVoice(false)
    expect(sessions).toHaveLength(1)
  })

  it('ignores a saved id the catalog no longer offers', () => {
    const { controller, host } = makeController({
      speechRecognitionConstructor: makeConstructor().ctor,
      engines: ENGINES,
      selectEngine: () => null,
      localStore: () => makeStore({ [MIC_ENGINE_STORAGE_KEY]: 'gone' }),
    })
    controller.restoreSavedEngine()
    // No engine chosen: the first mic click asks which one to use.
    controller.toggleVoice(false)
    expect(host.openedPickers).toBe(1)
  })

  it('treats an unavailable local store as no saved choice', () => {
    const { controller } = makeController({ engines: ENGINES, localStore: () => undefined })
    controller.restoreSavedEngine()
  })
})

describe('voiceEngineDisabledReason', () => {
  it('reports a missing native service as browser', () => {
    const { controller } = makeController()
    expect(controller.voiceEngineDisabledReason(NATIVE, false)).toBe('browser')
  })

  it('reports a proven-dead native service as browser', () => {
    const { controller } = makeController({ speechRecognitionConstructor: makeConstructor().ctor })
    expect(controller.voiceEngineDisabledReason(NATIVE, true)).toBe('browser')
  })

  it('reports an uncovered language as language', () => {
    const { controller } = makeController({
      engineCoversLanguage: (_engine, language) => language.startsWith('en'),
      getLanguage: () => 'fr-FR',
    })
    expect(controller.voiceEngineDisabledReason(ON_DEVICE, false)).toBe('language')
  })

  it('returns null when the engine can be used', () => {
    const { controller } = makeController({ engineCoversLanguage: () => true })
    expect(controller.voiceEngineDisabledReason(ON_DEVICE, false)).toBeNull()
  })
})

describe('showVoiceError', () => {
  it('shows the message and clears it after eight seconds', () => {
    const { controller, host } = makeController()
    controller.showVoiceError('boom')
    expect(host.errors).toEqual(['boom'])
    vi.advanceTimersByTime(7999)
    expect(host.errors).toEqual(['boom'])
    vi.advanceTimersByTime(1)
    expect(host.errors).toEqual(['boom', null])
  })

  it('replaces a pending clear when a second error arrives', () => {
    const { controller, host } = makeController()
    controller.showVoiceError('first')
    vi.advanceTimersByTime(4000)
    controller.showVoiceError('second')
    vi.advanceTimersByTime(7999)
    expect(host.errors).toEqual(['first', 'second'])
    vi.advanceTimersByTime(1)
    expect(host.errors).toEqual(['first', 'second', null])
  })
})

describe('startLocalVoice', () => {
  it('returns false without a provider', () => {
    const { controller, host } = makeController()
    expect(controller.startLocalVoice()).toBe(false)
    expect(host.notices).toEqual([])
  })

  it('returns false when the provider does not support recognition', () => {
    const { controller } = makeController({ getVoiceProvider: () => makeProvider(false) })
    expect(controller.startLocalVoice()).toBe(false)
  })

  it('starts listening with the UI language and shows the preparing notice', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    expect(controller.startLocalVoice()).toBe(true)
    expect(provider.options()).toEqual({
      language: 'en-US',
      continuous: true,
      interimResults: false,
    })
    expect(host.notices).toEqual(['Preparing dictation — this can take a moment on first use.'])
  })

  it('appends a final transcript to the draft and records it', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    controller.startLocalVoice()
    provider.handlers()?.onTranscript?.({ transcript: 'hello', isFinal: true, confidence: 1 })
    expect(host.input).toBe('draft hello')
    expect(host.snippets).toEqual(['hello'])
    expect(host.inserted).toBe(1)
  })

  it('ignores interim, empty, and discarded transcripts', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    controller.startLocalVoice()
    provider.handlers()?.onTranscript?.({ transcript: 'part', isFinal: false, confidence: 1 })
    provider.handlers()?.onTranscript?.({ transcript: '', isFinal: true, confidence: 1 })
    expect(host.input).toBe('draft')
    // After submit the trailing transcript is discarded.
    controller.beginDictation()
    controller.stopForSubmit()
    provider.handlers()?.onTranscript?.({ transcript: 'late', isFinal: true, confidence: 1 })
    expect(host.input).toBe('draft')
  })

  it('clears the notice when the provider starts listening', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    controller.startLocalVoice()
    provider.handlers()?.onStateChange?.('listening')
    expect(host.notices).toEqual([
      'Preparing dictation — this can take a moment on first use.',
      null,
    ])
  })

  it('handles a blocked microphone', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    controller.beginDictation()
    provider.handlers()?.onError?.({ code: 'not-allowed', message: 'denied' })
    expect(host.listening).toEqual([true, false])
    expect(host.notices).toEqual([
      'Preparing dictation — this can take a moment on first use.',
      null,
    ])
    expect(host.errors).toEqual([null, 'Microphone access is blocked.'])
  })

  it('reports one failed chunk without stopping the session', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    controller.beginDictation()
    provider.handlers()?.onError?.({ code: 'transcription-failed', message: 'chunk' })
    expect(host.errors).toEqual([null, 'Transcription failed.'])
    expect(host.listening).toEqual([true])
  })

  it('treats any other error as an unusable provider', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    controller.beginDictation()
    provider.handlers()?.onError?.({ code: 'start-failed', message: 'nope' })
    expect(host.listening).toEqual([true, false])
    expect(host.errors).toEqual([null, 'Dictation is not available in this browser.'])
  })
})

describe('beginDictation', () => {
  it('starts recognition on the legacy path when Web Speech exists', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    expect(host.started).toBe(1)
    expect(host.listening).toEqual([true])
    expect(sessions).toHaveLength(1)
    expect(sessions[0].continuous).toBe(true)
    expect(sessions[0].interimResults).toBe(true)
    expect(sessions[0].lang).toBe('en-US')
    expect(sessions[0].start).toHaveBeenCalled()
  })

  it('clears a pending error timer', () => {
    const { ctor } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.showVoiceError('old')
    controller.beginDictation()
    // Short of both the 8s clear and the 5s watchdog: the old clear was cancelled.
    vi.advanceTimersByTime(4000)
    expect(host.errors).toEqual(['old', null])
  })

  it('falls back to the on-device provider without Web Speech', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    controller.beginDictation()
    expect(provider.startListening).toHaveBeenCalled()
    expect(host.errors).toEqual([null])
  })

  it('reports unavailable when no engine works at all', () => {
    const { controller, host } = makeController()
    controller.beginDictation()
    expect(host.listening).toEqual([true, false])
    expect(host.errors).toEqual([null, 'Dictation is not available in this browser.'])
  })

  it('uses the chosen engine in catalog mode', () => {
    const provider = makeProvider()
    const { controller } = makeController({
      speechRecognitionConstructor: makeConstructor().ctor,
      engines: ENGINES,
      getVoiceProvider: () => provider,
      selectEngine: () => ON_DEVICE,
    })
    controller.chooseVoiceEngine(ON_DEVICE, false)
    controller.beginDictation()
    expect(provider.startListening).toHaveBeenCalled()
  })

  it('stays on the native path when the catalog offers a service the browser lacks', () => {
    const { controller, host } = makeController({ engines: ENGINES, selectEngine: () => NATIVE })
    controller.chooseVoiceEngine(NATIVE, true)
    // The picker disables this row (voiceEngineDisabledReason 'browser'); if it
    // is chosen anyway the native attempt simply never starts, as before.
    expect(host.errors).toEqual([null])
    expect(host.listening).toEqual([true])
  })
})

describe('startRecognition', () => {
  it('does nothing without a constructor', () => {
    const { controller, host } = makeController()
    controller.startRecognition()
    expect(host.listening).toEqual([])
  })

  it('inserts a final result into the draft', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    sessions[0].onresult?.(resultEvent([{ transcript: 'hi', isFinal: true }]))
    expect(host.input).toBe('draft hi')
    expect(host.snippets).toEqual(['hi'])
    expect(host.inserted).toBe(1)
  })

  it('clears the watchdog when the session starts', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    sessions[0].onstart?.()
    vi.advanceTimersByTime(5000)
    expect(host.dead).toEqual([])
  })

  it('restarts immediately after a session that produced results', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    sessions[0].onresult?.(resultEvent([{ transcript: 'hi', isFinal: true }]))
    sessions[0].onend?.()
    expect(sessions).toHaveLength(2)
    expect(sessions[1].start).toHaveBeenCalled()
  })

  it('turns the button off when the intent was cleared before the end', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    controller.stopForSubmit()
    sessions[0].onend?.()
    expect(host.listening).toEqual([true, false, false])
  })

  it('gives up after three rapid no-result failures', () => {
    const now = vi.fn(() => 1000)
    const { ctor, sessions } = makeConstructor()
    const store = makeStore()
    const { controller, host } = makeController({
      speechRecognitionConstructor: ctor,
      now,
      sessionStore: () => store,
    })
    controller.beginDictation()
    // Three no-result sessions, each ending within 1s of its start.
    for (let attempt = 0; attempt < 3; attempt++) {
      sessions[attempt].onend?.()
      vi.advanceTimersByTime(300)
    }
    expect(sessions).toHaveLength(3)
    expect(host.dead).toEqual([true])
    expect(store.setItem).toHaveBeenCalledWith(WEB_SPEECH_DEAD_STORAGE_KEY, '1')
    expect(sessions[2].abort).toHaveBeenCalled()
    expect(host.listening).toEqual([true, false])
    expect(host.errors).toEqual([null, 'Dictation is not available in this browser.'])
  })

  it('resets the failure count after a slow session', () => {
    let clock = 0
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({
      speechRecognitionConstructor: ctor,
      now: () => clock,
    })
    controller.beginDictation()
    clock = 2000
    sessions[0].onend?.()
    vi.advanceTimersByTime(300)
    clock = 5000
    sessions[1].onend?.()
    vi.advanceTimersByTime(300)
    clock = 8000
    sessions[2].onend?.()
    vi.advanceTimersByTime(300)
    expect(host.dead).toEqual([])
    expect(sessions).toHaveLength(4)
  })

  it('gives up on a network error', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    sessions[0].onerror?.({ error: 'network' })
    expect(host.dead).toEqual([true])
    expect(host.errors).toEqual([null, 'Dictation is not available in this browser.'])
  })

  it('reports a blocked microphone on a not-allowed error', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    sessions[0].onerror?.({ error: 'not-allowed' })
    expect(host.dead).toEqual([])
    expect(host.listening).toEqual([true, false])
    expect(host.errors).toEqual([null, 'Microphone access is blocked.'])
  })

  it('gives up when start() throws', () => {
    const { ctor, startThrows } = makeConstructor()
    startThrows.value = true
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    expect(host.dead).toEqual([true])
    expect(host.errors).toEqual([null, 'Dictation is not available in this browser.'])
  })

  it('gives up when the watchdog fires', () => {
    const { ctor } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    vi.advanceTimersByTime(5000)
    expect(host.dead).toEqual([true])
  })

  it('hands a dead native engine over to the on-device provider', () => {
    const provider = makeProvider()
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({
      speechRecognitionConstructor: ctor,
      getVoiceProvider: () => provider,
    })
    controller.beginDictation()
    sessions[0].onerror?.({ error: 'network' })
    expect(provider.startListening).toHaveBeenCalled()
    expect(host.errors).toEqual([null])
  })

  it('clears a dead native choice and reopens the picker in catalog mode', () => {
    const local = makeStore({ [MIC_ENGINE_STORAGE_KEY]: 'native' })
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({
      speechRecognitionConstructor: ctor,
      engines: ENGINES,
      selectEngine: () => NATIVE,
      localStore: () => local,
    })
    controller.restoreSavedEngine()
    controller.beginDictation()
    expect(sessions).toHaveLength(1)
    sessions[0].onerror?.({ error: 'language-not-supported' })
    expect(host.engineIds).toEqual([null])
    expect(local.removeItem).toHaveBeenCalledWith(MIC_ENGINE_STORAGE_KEY)
    expect(host.closedPopups).toBe(1)
    expect(host.openedPickers).toBe(1)
  })
})

describe('chooseVoiceEngine', () => {
  it('ignores an id the catalog does not have', () => {
    const { controller, host } = makeController({ engines: ENGINES, selectEngine: () => null })
    controller.chooseVoiceEngine(ON_DEVICE, true)
    expect(host.closedPickers).toBe(1)
    expect(host.engineIds).toEqual([])
  })

  it('persists the choice and starts dictation when asked', () => {
    const local = makeStore()
    const provider = makeProvider()
    const { controller, host } = makeController({
      engines: ENGINES,
      selectEngine: () => ON_DEVICE,
      localStore: () => local,
      getVoiceProvider: () => provider,
    })
    controller.chooseVoiceEngine(ON_DEVICE, true)
    expect(host.closedPickers).toBe(1)
    expect(host.engineIds).toEqual(['whisper'])
    expect(local.setItem).toHaveBeenCalledWith(MIC_ENGINE_STORAGE_KEY, 'whisper')
    expect(provider.startListening).toHaveBeenCalled()
  })

  it('does not start dictation for a settings-only choice', () => {
    const { controller, host } = makeController({
      engines: ENGINES,
      selectEngine: () => ON_DEVICE,
      localStore: () => makeStore(),
    })
    controller.chooseVoiceEngine(ON_DEVICE, false)
    expect(host.listening).toEqual([])
  })

  it('tolerates an unavailable local store', () => {
    const { controller, host } = makeController({
      engines: ENGINES,
      selectEngine: () => ON_DEVICE,
      localStore: () => undefined,
    })
    expect(() => controller.chooseVoiceEngine(ON_DEVICE, false)).not.toThrow()
    expect(host.engineIds).toEqual(['whisper'])
  })
})

describe('toggleVoice', () => {
  it('stops the on-device provider when listening', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    controller.beginDictation()
    controller.toggleVoice(true)
    expect(provider.stopListening).toHaveBeenCalled()
    expect(host.listening).toEqual([true, false])
    expect(host.notices).toEqual([
      'Preparing dictation — this can take a moment on first use.',
      null,
    ])
  })

  it('stops the recognition session when listening', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    controller.toggleVoice(true)
    expect(sessions[0].stop).toHaveBeenCalled()
  })

  it('cancels pending restart and watchdog timers when listening', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    sessions[0].onend?.()
    controller.toggleVoice(true)
    vi.advanceTimersByTime(10000)
    // No restart and no watchdog give-up after the stop.
    expect(sessions).toHaveLength(1)
    expect(host.dead).toEqual([])
  })

  it('asks which engine to use on the first mic click in catalog mode', () => {
    const { controller, host } = makeController({ engines: ENGINES })
    controller.toggleVoice(false)
    expect(host.closedPopups).toBe(1)
    expect(host.openedPickers).toBe(1)
    expect(host.listening).toEqual([])
  })

  it('begins dictation when an engine is already chosen', () => {
    const { ctor } = makeConstructor()
    const { controller, host } = makeController({
      speechRecognitionConstructor: ctor,
      engines: ENGINES,
      selectEngine: () => NATIVE,
      localStore: () => makeStore({ [MIC_ENGINE_STORAGE_KEY]: 'native' }),
    })
    controller.restoreSavedEngine()
    controller.toggleVoice(false)
    expect(host.openedPickers).toBe(0)
    expect(host.listening).toEqual([true])
  })
})

describe('stopForSubmit', () => {
  it('stops recognition and clears the watchdog', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    controller.stopForSubmit()
    expect(sessions[0].stop).toHaveBeenCalled()
    expect(host.listening).toEqual([true, false])
    expect(host.notices).toEqual([null])
    vi.advanceTimersByTime(5000)
    expect(host.dead).toEqual([])
  })

  it('stops the provider and discards trailing transcripts', () => {
    const provider = makeProvider()
    const { controller, host } = makeController({ getVoiceProvider: () => provider })
    controller.beginDictation()
    controller.stopForSubmit()
    expect(provider.stopListening).toHaveBeenCalled()
    provider.handlers()?.onTranscript?.({ transcript: 'late', isFinal: true, confidence: 1 })
    expect(host.input).toBe('draft')
  })
})

describe('dispose', () => {
  it('aborts recognition and clears every timer', () => {
    const { ctor, sessions } = makeConstructor()
    const { controller, host } = makeController({ speechRecognitionConstructor: ctor })
    controller.beginDictation()
    controller.dispose()
    expect(sessions[0].abort).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(10000)
    expect(host.dead).toEqual([])
  })

  it('stops the on-device provider', () => {
    const provider = makeProvider()
    const { controller } = makeController({ getVoiceProvider: () => provider })
    controller.beginDictation()
    controller.dispose()
    expect(provider.stopListening).toHaveBeenCalled()
  })
})
