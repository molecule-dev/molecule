import { expect, it, vi } from 'vitest'

import { en } from '../en.js'
import { loadContent } from '../loadContent.js'

const addTranslations = vi.hoisted(() => vi.fn())

vi.mock('@molecule/app-i18n', () => ({
  getProvider: () => ({ addTranslations, getLocale: () => 'loadContent' }),
  registerContent: vi.fn(),
}))

it('uses the English fallback when the locale matches a module function export', async () => {
  await loadContent('privacyPolicy')
  expect(addTranslations).toHaveBeenCalledWith('loadContent', en)
})
