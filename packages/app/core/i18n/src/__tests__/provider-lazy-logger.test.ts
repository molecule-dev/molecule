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
})
