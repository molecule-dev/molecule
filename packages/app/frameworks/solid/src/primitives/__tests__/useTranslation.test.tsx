// @vitest-environment jsdom
/**
 * The Solid counterparts of React's `useTranslation.test.tsx`: the same
 * cases, under the same titles, asserting what a caller of the translation
 * primitives observes.
 *
 * Solid has no rerenders, so a React case is translated to the framework-neutral
 * fact it pins: the text read after a change is the changed one, and the
 * provider read by the primitive is the one a caller would see.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider, InterpolationValues } from '@molecule/app-i18n'
import { createSimpleI18nProvider, I18nError, setProvider } from '@molecule/app-i18n'

import { I18nContext } from '../../context.js'
import { useI18nError, useI18nProvider, useT, useTranslation } from '../i18n.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container and the disposer that removes the tree.
 */
function mount(app: () => JSX.Element): { container: HTMLElement; dispose: () => void } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const disposeRoot = render(app, container)
  const dispose = (): void => {
    disposeRoot()
    container.remove()
  }
  disposers.push(dispose)
  return { container, dispose }
}

/**
 * Lets Solid's update queue flush before an assertion reads the DOM.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Reads a probe's text.
 *
 * @param container - The mounted tree's container.
 * @param testId - The probe's `data-testid`.
 * @returns The element's text content.
 */
function textOf(container: HTMLElement, testId: string): string | null | undefined {
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent
}

// Minimal mock I18nProvider — only the methods useTranslation() actually reads
const createMockProvider = (tFn?: I18nProvider['t']): I18nProvider => ({
  getLocale: () => 'en',
  setLocale: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getLocales: () => [{ code: 'en', name: 'English' }],
  addLocale: vi.fn(),
  removeLocale: vi.fn().mockReturnValue(true),
  addTranslations: vi.fn(),
  // Like a real provider: an unknown key resolves to the caller's defaultValue
  // (when given) before falling back to the key itself.
  t:
    tFn ??
    ((key: string, _values?: InterpolationValues, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key),
  exists: () => true,
  formatNumber: (v: number) => String(v),
  formatDate: (v: Date | number | string) => String(v),
  formatRelativeTime: (v: Date | number) => String(v),
  formatList: (v: string[]) => v.join(', '),
  onLocaleChange: () => () => {},
  getDirection: () => 'ltr',
})

describe('the translation hooks outside an I18nProvider', () => {
  // A component that renders without an I18nProvider used the static `t`, which reads the
  // bonded provider. The hooks read that same provider there, and they also re-render the
  // component on a locale switch, which the static `t` never did.
  const bondedProvider = (): I18nProvider => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: { greeting: 'Hello' } },
      { code: 'fr', name: 'Français', translations: { greeting: 'Bonjour' } },
    ])
    setProvider(provider)
    return provider
  }

  it('reads the bonded provider instead of throwing', () => {
    const provider = bondedProvider()
    let captured: I18nProvider | undefined
    function Probe(): JSX.Element {
      captured = useI18nProvider()
      return <></>
    }
    mount(() => <Probe />)
    expect(captured).toBe(provider)
  })

  it('re-renders with the new language when the bonded provider switches locale', async () => {
    const provider = bondedProvider()
    function Translation(): JSX.Element {
      const { t } = useTranslation()
      return <span data-testid="translation">{t('greeting')}</span>
    }
    function Shorthand(): JSX.Element {
      const t = useT()
      return <span data-testid="shorthand">{t('greeting', 'Hello')}</span>
    }
    const { container } = mount(() => (
      <>
        <Translation />
        <Shorthand />
      </>
    ))
    expect(textOf(container, 'translation')).toBe('Hello')
    expect(textOf(container, 'shorthand')).toBe('Hello')
    await provider.setLocale('fr')
    await settle()
    expect(textOf(container, 'translation')).toBe('Bonjour')
    expect(textOf(container, 'shorthand')).toBe('Bonjour')
  })

  it('still prefers the provider an enclosing I18nProvider supplies', () => {
    bondedProvider()
    const scoped = createMockProvider(() => 'scoped')
    function Probe(): JSX.Element {
      const { t } = useTranslation()
      return <span data-testid="scoped">{t('greeting')}</span>
    }
    const { container } = mount(() => (
      <I18nContext.Provider value={scoped}>
        <Probe />
      </I18nContext.Provider>
    ))
    expect(textOf(container, 'scoped')).toBe('scoped')
  })
})

/**
 * Mounts a probe that creates `useI18nError` under the given provider.
 *
 * @param error - The error to translate, or `null`/`undefined`.
 * @param provider - The i18n provider the probe reads.
 * @returns An accessor of the translated message.
 */
function mountErrorRead(
  error: Error | null | undefined,
  provider: I18nProvider,
): () => string | null {
  let read: (() => string | null) | undefined
  function Probe(): JSX.Element {
    read = useI18nError(error)
    return <></>
  }
  mount(() => (
    <I18nContext.Provider value={provider}>
      <Probe />
    </I18nContext.Provider>
  ))
  if (!read) throw new Error('the probe did not create the accessor')
  return read
}

describe('useI18nError', () => {
  it('returns null when error is null', () => {
    const read = mountErrorRead(null, createMockProvider())
    expect(read()).toBeNull()
  })

  it('returns null when error is undefined', () => {
    const read = mountErrorRead(undefined, createMockProvider())
    expect(read()).toBeNull()
  })

  it('returns error.message for a plain Error', () => {
    const error = new Error('Something went wrong')
    const read = mountErrorRead(error, createMockProvider())
    expect(read()).toBe('Something went wrong')
  })

  it('translates the key for an I18nError with no values', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Translated message')
    const error = new I18nError('some.error.key', undefined, 'English fallback')
    const read = mountErrorRead(error, createMockProvider(tFn))
    expect(tFn).toHaveBeenCalledWith('some.error.key', undefined, {
      defaultValue: 'English fallback',
    })
    expect(read()).toBe('Translated message')
  })

  it('passes interpolation values when translating an I18nError', () => {
    const tFn = vi.fn<I18nProvider['t']>().mockReturnValue('Hello Alice')
    const values: InterpolationValues = { name: 'Alice' }
    const error = new I18nError('greeting.key', values, 'Hello fallback')
    const read = mountErrorRead(error, createMockProvider(tFn))
    expect(tFn).toHaveBeenCalledWith('greeting.key', values, {
      defaultValue: 'Hello fallback',
    })
    expect(read()).toBe('Hello Alice')
  })

  it("falls back to the error's own message — NEVER the raw key — when the dictionary lacks the key", () => {
    // The regression this guards: a server errorKey the client dictionary
    // doesn't carry once rendered literally ("user.error.passwordTooShort")
    // because the hook translated without a defaultValue. The I18nError's
    // message (the throw site's fallback — for server errors, the server's
    // own translated text) must surface instead.
    const error = new I18nError('user.error.passwordTooShort', undefined, 'Password is too short')
    const read = mountErrorRead(error, createMockProvider())
    expect(read()).toBe('Password is too short')
  })

  it('still shows the key for an I18nError thrown with no fallback text (worst case)', () => {
    // I18nError's message defaults to the key when no fallback is given —
    // nothing better exists to show. Throw sites should always pass fallback.
    const error = new I18nError('some.error.key')
    const read = mountErrorRead(error, createMockProvider())
    expect(read()).toBe('some.error.key')
  })
})
