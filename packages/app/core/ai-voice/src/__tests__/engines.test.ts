import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getSelectedVoiceEngineId,
  listVoiceEngines,
  registerVoiceEngines,
  selectVoiceEngine,
  voiceEngineCoversLanguage,
} from '../engines.js'
import { getProvider } from '../provider.js'
import type { AIVoiceProvider, VoiceEngineDef } from '../index.js'

function fakeProvider(name: string): AIVoiceProvider {
  return {
    name,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    speak: vi.fn(async () => undefined),
    stopSpeaking: vi.fn(),
    getState: () => 'idle',
    isSupported: () => true,
    isRecognitionSupported: () => true,
    isSynthesisSupported: () => true,
    getAvailableVoices: async () => [],
    dispose: vi.fn(),
  }
}

const engines: VoiceEngineDef[] = [
  {
    id: 'native',
    label: 'Browser dictation',
    kind: 'native',
    accuracy: 2,
    languages: 'all',
    create: () => fakeProvider('native'),
  },
  {
    id: 'tiny',
    label: 'Tiny model',
    kind: 'on-device',
    downloadMB: 60,
    accuracy: 1,
    languages: ['en'],
    create: () => fakeProvider('tiny'),
  },
  {
    id: 'big',
    label: 'Big model',
    kind: 'on-device',
    downloadMB: [650, 1240],
    accuracy: 3,
    languages: ['en', 'fr', 'ja'],
    create: () => fakeProvider('big'),
  },
]

describe('voice engine catalog', () => {
  beforeEach(() => {
    registerVoiceEngines(engines)
  })

  it('lists registered engines in order', () => {
    expect(listVoiceEngines().map((e) => e.id)).toEqual(['native', 'tiny', 'big'])
  })

  it('selectVoiceEngine wires the provider and remembers the choice', () => {
    const def = selectVoiceEngine('big')
    expect(def?.id).toBe('big')
    expect(getSelectedVoiceEngineId()).toBe('big')
    expect(getProvider()?.name).toBe('big')
  })

  it('selectVoiceEngine returns null for unknown ids without touching state', () => {
    selectVoiceEngine('tiny')
    expect(selectVoiceEngine('nope')).toBeNull()
    expect(getSelectedVoiceEngineId()).toBe('tiny')
  })

  it('voiceEngineCoversLanguage matches base subtags case-insensitively', () => {
    const tiny = engines[1]
    const big = engines[2]
    expect(voiceEngineCoversLanguage(engines[0], 'zz')).toBe(true)
    expect(voiceEngineCoversLanguage(tiny, 'en-US')).toBe(true)
    expect(voiceEngineCoversLanguage(tiny, 'fr-FR')).toBe(false)
    expect(voiceEngineCoversLanguage(big, 'JA')).toBe(true)
  })
})
