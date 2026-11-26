// @vitest-environment jsdom

/**
 * The editor field's label follows the provider's locale.
 *
 * `useTranslation()` subscribes through `useSyncExternalStore`, so a component
 * reading `t` from the hook re-renders on `setLocale`. This test bonds a
 * provider with an `en` and a `fr` value for `inlineEdit.aria.edit`, opens the
 * editor in `en` (the key is untranslated there, so the English default
 * shows), switches to `fr`, and asserts the label is now French.
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import type { InlineEditProps } from '../InlineEdit.js'

// Class tokens echo their own name, so a class assertion names the token.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .map((c) => (typeof c === 'function' ? c() : c))
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : () => String(prop),
      },
    ),
}))
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({ children }: { children?: React.ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Input: ({ 'aria-label': label }: { 'aria-label'?: string }) =>
    createElement('input', { 'data-input': '', 'aria-label': label }),
  Textarea: ({ 'aria-label': label }: { 'aria-label'?: string }) =>
    createElement('textarea', { 'data-textarea': '', 'aria-label': label }),
}))

const { InlineEdit } = await import('../InlineEdit.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

let root: Root | null = null
let host: HTMLElement | null = null

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'fr', name: 'French', translations: { 'inlineEdit.aria.edit': 'Modifier' } },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  // Reset the global i18n singleton to a clean English provider so a locale
  // registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts the editor in jsdom against the bonded provider.
 *
 * @param props - Props over the component.
 * @returns The container the component rendered into.
 */
async function mount(props: Omit<InlineEditProps, 'onSubmit'>): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(InlineEdit, { onSubmit: () => {}, ...props }))
  })
  return host
}

/**
 * Opens the editor the way a user does: a click on the read state.
 *
 * @param container - The container the component rendered into.
 */
async function openEditor(container: HTMLElement): Promise<void> {
  const trigger = container.querySelector('[role="button"]')
  if (!trigger) throw new Error('no read-state trigger rendered')
  await act(async () => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('InlineEdit locale switch', () => {
  it('switches the editor field label with the provider locale', async () => {
    const container = await mount({ value: 'Hello world' })
    await openEditor(container)
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Edit')

    // The switch itself: the label must follow the provider. Against the
    // hardcoded `placeholder ?? 'Edit'` fallback this stayed English.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Modifier')
  })
})
