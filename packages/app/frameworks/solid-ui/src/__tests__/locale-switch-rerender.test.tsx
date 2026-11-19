// @vitest-environment jsdom
/**
 * Regression test for the static-`t` migration: a component that translated
 * through the static `t` from `@molecule/app-i18n` stayed in the old language
 * after `setLocale` — nothing re-rendered it. Components migrated to
 * `useTranslation()` subscribe to the bonded provider's locale notifications,
 * so a switch re-renders them in the new language. Solid counterpart of
 * `@molecule/app-ui-react`'s `locale-switch-rerender.test.tsx`, rendered
 * through the BONDED provider (`setProvider`) — the same path the static `t`
 * read — so the test proves exactly the fixed defect.
 *
 * @module
 */
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import type { LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ClassMapValue, UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

const LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    direction: 'ltr',
    translations: { 'ui.spinner.loading': 'Loading' },
  },
  {
    code: 'fr',
    name: 'French',
    direction: 'ltr',
    translations: { 'ui.spinner.loading': 'Chargement' },
  },
]

/** Minimal genuine ClassMap through the real bond: `cn` merges, tokens echo. */
const flattenClassValue = (value: ClassMapValue): string[] => {
  if (value === null || value === undefined || value === false || value === true) return []
  if (typeof value === 'string' || typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(flattenClassValue)
  return Object.entries(value)
    .filter(([, on]) => !!on)
    .map(([k]) => k)
}
const CALLABLE = new Set(['spinner'])
const classMap = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined
      if (prop === 'cn') {
        return (...classes: ClassMapValue[]) =>
          classes.flatMap(flattenClassValue).filter(Boolean).join(' ')
      }
      if (CALLABLE.has(prop)) return () => prop
      return prop
    },
  },
) as UIClassMap

const { Spinner } = await import('../components/Spinner.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

describe('components re-render in the new language after a locale switch', () => {
  it('Spinner announces its loading label in the switched-to locale', async () => {
    setClassMap(classMap)
    const provider = createSimpleI18nProvider('en', LOCALES)
    setProvider(provider)

    const container = document.createElement('div')
    document.body.appendChild(container)
    disposers.push(render(() => <Spinner />, container))
    const status = document.querySelector('[role="status"]') as HTMLElement
    expect(status.getAttribute('aria-label')).toBe('Loading')

    await provider.setLocale('fr')
    expect(status.getAttribute('aria-label')).toBe('Chargement')
  })
})
