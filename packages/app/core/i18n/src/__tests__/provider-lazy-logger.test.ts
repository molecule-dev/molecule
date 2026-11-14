import { describe, expect, it, vi } from 'vitest'

describe('i18n provider logger lookup', () => {
  it('importing the module or creating a provider bonds no logger, so an app can bond its own', async () => {
    vi.resetModules()
    const { isBonded } = await import('@molecule/app-bond')
    const { createSimpleI18nProvider } = await import('../provider.js')
    createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: { a: 'A' } }])
    expect(isBonded('app-logger')).toBe(false)
  })

  it('still logs through the bonded logger once it has something to say', async () => {
    vi.resetModules()
    const { isBonded } = await import('@molecule/app-bond')
    const { createSimpleI18nProvider } = await import('../provider.js')
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: {} },
    ])
    // A key with no translation and no default is the case the provider logs.
    expect(provider.t('missing.key')).toBe('missing.key')
    expect(isBonded('app-logger')).toBe(true)
  })

  it('logs through a logger bonded after its first log, not the one it found first', async () => {
    vi.resetModules()
    const { createSimpleI18nProvider } = await import('../provider.js')
    const { getProvider, setProvider } = await import('@molecule/app-logger')
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: {} },
    ])
    provider.t('missing.first') // bonds and uses the default console logger
    const fallback = getProvider()
    const debug = vi.fn()
    const recording = { ...fallback.getLogger('i18n'), debug }
    setProvider({ ...fallback, getLogger: () => recording })
    provider.t('missing.second')
    expect(debug).toHaveBeenCalledWith('Missing translation key', 'missing.second', 'en')
    expect(debug).not.toHaveBeenCalledWith('Missing translation key', 'missing.first', 'en')
  })
})
