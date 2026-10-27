/**
 * Per-key codecs in the localStorage bond.
 *
 * Regression for the legacy-compatibility defect: the app's PREVIOUS storage
 * helper wrote free-form strings verbatim (`localStorage.setItem(key, prompt)`),
 * while the bonded provider JSON-decodes every entry. After the switch a raw
 * prompt / conversation id / project id was unparseable, so it read as absent
 * and the value was silently reset. A string codec reads those keys in BOTH
 * shapes — the verbatim text the old helper wrote and the JSON string the bonded
 * store writes — WITHOUT changing the encoding of typed keys, which continue to
 * round-trip through JSON (and still treat a corrupt entry as absent).
 */

import { describe, expect, it, vi } from 'vitest'

import { createStringCodec } from '@molecule/app-storage'

import { createLocalStorageProvider } from '../index.js'

/** A minimal synchronous `Storage`. */
function createMockStorage(initial: Record<string, string> = {}): Storage & {
  values: Map<string, string>
} {
  const values = new Map<string, string>(Object.entries(initial))
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, String(value)),
    removeItem: (key: string) => void values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size
    },
  }
}

const stringKeys = createStringCodec((key) => key.startsWith('mol_initial_prompt_'))

describe('createStringCodec keys', () => {
  it('reads a value an older raw-string helper wrote', () => {
    const storage = createMockStorage({ mol_initial_prompt_p1: 'build me a thing' })
    const provider = createLocalStorageProvider({ storage, codecs: [stringKeys] })

    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('build me a thing')
  })

  it('reads it through the async path too', async () => {
    const storage = createMockStorage({ mol_initial_prompt_p1: '3 + 3 = 6, not JSON' })
    const provider = createLocalStorageProvider({ storage, codecs: [stringKeys] })

    await expect(provider.get('mol_initial_prompt_p1')).resolves.toBe('3 + 3 = 6, not JSON')
  })

  it('reads a JSON string an earlier revision of the store wrote', () => {
    // The window where these keys were persisted through the bonded provider
    // WITHOUT a codec: the value on disk is a quoted JSON string. It must read
    // as the plain string, not as a value with literal quotes in it.
    const storage = createMockStorage({ mol_initial_prompt_p1: '"build me a thing"' })
    const provider = createLocalStorageProvider({ storage, codecs: [stringKeys] })

    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('build me a thing')
  })

  it('keeps a legacy text that happens to be JSON-shaped as that text', () => {
    const storage = createMockStorage({
      mol_initial_prompt_p1: '42',
      'mol-chat-conv:p1': 'true',
    })
    const provider = createLocalStorageProvider({
      storage,
      codecs: [
        createStringCodec(
          (key) => key.startsWith('mol_initial_prompt_') || key.startsWith('mol-chat-conv:'),
        ),
      ],
    })

    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('42')
    expect(provider.getSync!('mol-chat-conv:p1')).toBe('true')
  })

  it('writes a JSON string that reads back as the same value', async () => {
    const storage = createMockStorage()
    const provider = createLocalStorageProvider({ storage, codecs: [stringKeys] })

    await provider.set('mol_initial_prompt_p1', 'ship it')

    expect(storage.values.get('mol_initial_prompt_p1')).toBe('"ship it"')
    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('ship it')
  })

  it('applies to prefixed keys by matching the UNPREFIXED key', () => {
    const storage = createMockStorage({ app_mol_initial_prompt_p1: 'raw prompt' })
    const provider = createLocalStorageProvider({
      storage,
      prefix: 'app_',
      codecs: [stringKeys],
    })

    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('raw prompt')
  })

  it('matches an exact key too', async () => {
    const storage = createMockStorage()
    const provider = createLocalStorageProvider({
      storage,
      codecs: [createStringCodec('molecule_last_project')],
    })

    await provider.set('molecule_last_project', '3f2b8a52-6c1e-4d57-9a43-0b6f9a1c2d3e')

    expect(provider.getSync!('molecule_last_project')).toBe('3f2b8a52-6c1e-4d57-9a43-0b6f9a1c2d3e')
  })

  it('decodes an external (other-tab) change through the codec', () => {
    const listeners = new Set<(event: StorageEvent) => void>()
    vi.stubGlobal('window', {
      addEventListener: (_type: string, listener: (event: StorageEvent) => void) =>
        void listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: StorageEvent) => void) =>
        void listeners.delete(listener),
    })
    try {
      const provider = createLocalStorageProvider({
        storage: createMockStorage(),
        codecs: [stringKeys],
      })
      const listener = vi.fn()
      provider.subscribe!('mol_initial_prompt_p1', listener)

      for (const notify of listeners) {
        notify({ key: 'mol_initial_prompt_p1', newValue: 'raw from another tab' } as StorageEvent)
      }

      expect(listener).toHaveBeenCalledWith('raw from another tab')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('reads a throwing codec as absent, never as a crash', () => {
    const storage = createMockStorage({ mol_initial_prompt_p1: 'anything' })
    const provider = createLocalStorageProvider({
      storage,
      codecs: [
        {
          matches: () => true,
          encode: () => '',
          decode: () => {
            throw new Error('cannot decode')
          },
        },
      ],
    })

    expect(provider.getSync!('mol_initial_prompt_p1')).toBeNull()
  })
})

describe('keys without a codec keep the JSON codec', () => {
  it('still round-trips a typed value alongside a string key', async () => {
    const storage = createMockStorage()
    const provider = createLocalStorageProvider({ storage, codecs: [stringKeys] })

    await provider.set('mol_initial_prompt_p1', 'plain prompt')
    await provider.set('molecule_workspace_advanced', true)

    expect(storage.values.get('mol_initial_prompt_p1')).toBe('"plain prompt"')
    expect(storage.values.get('molecule_workspace_advanced')).toBe('true')
    expect(provider.getSync!('molecule_workspace_advanced')).toBe(true)
  })

  it('a corrupt JSON entry on a non-codec key is still absent (counterexample)', () => {
    const storage = createMockStorage({ mol_initial_prompt_p1: 'raw-ok', other: 'not json{{' })
    const provider = createLocalStorageProvider({ storage, codecs: [stringKeys] })

    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('raw-ok')
    expect(provider.getSync!('other')).toBeNull()
  })
})
