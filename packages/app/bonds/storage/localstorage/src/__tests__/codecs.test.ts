/**
 * Per-key codecs in the localStorage bond.
 *
 * Regression for the legacy-compatibility defect: the app's PREVIOUS storage
 * helper wrote free-form strings verbatim (`localStorage.setItem(key, prompt)`),
 * while the bonded provider JSON-decodes every entry. After the switch a raw
 * prompt / conversation id / project id was unparseable, so it read as absent
 * and the value was silently reset. A raw-string codec keeps those keys
 * readable (and keeps writing them in the same shape) WITHOUT changing the
 * encoding of typed keys, which continue to round-trip through JSON.
 */

import { describe, expect, it, vi } from 'vitest'

import { createRawStringCodec } from '@molecule/app-storage'

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

const rawStrings = createRawStringCodec((key) => key.startsWith('mol_initial_prompt_'))

describe('createRawStringCodec keys', () => {
  it('reads a value an older raw-string helper wrote', () => {
    const storage = createMockStorage({ mol_initial_prompt_p1: 'build me a thing' })
    const provider = createLocalStorageProvider({ storage, codecs: [rawStrings] })

    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('build me a thing')
  })

  it('reads it through the async path too', async () => {
    const storage = createMockStorage({ mol_initial_prompt_p1: '3 + 3 = 6, not JSON' })
    const provider = createLocalStorageProvider({ storage, codecs: [rawStrings] })

    await expect(provider.get('mol_initial_prompt_p1')).resolves.toBe('3 + 3 = 6, not JSON')
  })

  it('keeps writing the key in the raw shape so the next visit still reads it', async () => {
    const storage = createMockStorage()
    const provider = createLocalStorageProvider({ storage, codecs: [rawStrings] })

    await provider.set('mol_initial_prompt_p1', 'ship it')

    expect(storage.values.get('mol_initial_prompt_p1')).toBe('ship it')
    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('ship it')
  })

  it('applies to prefixed keys by matching the UNPREFIXED key', () => {
    const storage = createMockStorage({ app_mol_initial_prompt_p1: 'raw prompt' })
    const provider = createLocalStorageProvider({
      storage,
      prefix: 'app_',
      codecs: [rawStrings],
    })

    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('raw prompt')
  })

  it('matches an exact key too', async () => {
    const storage = createMockStorage()
    const provider = createLocalStorageProvider({
      storage,
      codecs: [createRawStringCodec('molecule_last_project')],
    })

    await provider.set('molecule_last_project', '3f2b8a52-6c1e-4d57-9a43-0b6f9a1c2d3e')

    expect(storage.values.get('molecule_last_project')).toBe('3f2b8a52-6c1e-4d57-9a43-0b6f9a1c2d3e')
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
        codecs: [rawStrings],
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
  it('still round-trips a typed value alongside a raw-string key', async () => {
    const storage = createMockStorage()
    const provider = createLocalStorageProvider({ storage, codecs: [rawStrings] })

    await provider.set('mol_initial_prompt_p1', 'plain prompt')
    await provider.set('molecule_workspace_advanced', true)

    expect(storage.values.get('mol_initial_prompt_p1')).toBe('plain prompt')
    expect(storage.values.get('molecule_workspace_advanced')).toBe('true')
    expect(provider.getSync!('molecule_workspace_advanced')).toBe(true)
  })

  it('a corrupt JSON entry on a non-codec key is still absent (counterexample)', () => {
    const storage = createMockStorage({ mol_initial_prompt_p1: 'raw-ok', other: 'not json{{' })
    const provider = createLocalStorageProvider({ storage, codecs: [rawStrings] })

    expect(provider.getSync!('mol_initial_prompt_p1')).toBe('raw-ok')
    expect(provider.getSync!('other')).toBeNull()
  })
})
