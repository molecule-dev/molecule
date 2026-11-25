import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.sp('ml', 2)`) and also usable bare (`cm.flex1`).
// `cn(...)` joins tokens, calling any function-valued args first.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// `Avatar` is `AvatarStack`'s only import from `@molecule/app-ui-react` — stub
// it to an inspectable <img> carrying the supplied src + name, as
// avatar-stack.test.tsx does. `Box` and `Text` come from
// `@molecule/app-ui-react/elements`, a separate module: they are the real ones.
vi.mock('@molecule/app-ui-react', () => ({
  Avatar: ({ src, name }: { src?: string; name?: string }) =>
    createElement('img', { 'data-avatar': src ?? '', 'data-avatar-name': name ?? '' }),
}))

import { createSimpleI18nProvider, type Translations } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'

const { AvatarStack } = await import('../AvatarStack.js')

/** French values for both keys. Neither equals its English default. */
const FRENCH: Translations = {
  'avatarStack.more': '+{{count}} de plus',
  'avatarStack.overflowPrefix': '»',
}

const people = [
  { name: 'Alice' },
  { name: 'Bob' },
  { name: 'Carol' },
  { name: 'Dave' },
  { name: 'Eve' },
  { name: 'Frank' },
]

/** Renders the stack under an i18n provider, to markup. */
const render = (provider: ReturnType<typeof createSimpleI18nProvider>): string =>
  renderToStaticMarkup(
    createElement(I18nProvider, {
      provider,
      children: createElement(AvatarStack, { people, max: 4 }),
    }),
  )

/** The overflow chip's accessible name and visible text, read from rendered markup. */
const overflowChip = (markup: string): { label: string; text: string } => {
  const chip = /<span\b[^>]*\baria-label="([^"]*)"[^>]*>([^<]*)<\/span>/.exec(markup)
  if (!chip) throw new Error('no overflow chip rendered')
  return { label: chip[1], text: chip[2] }
}

describe('AvatarStack', () => {
  it('translates the overflow label through the avatarStack keys', () => {
    // French carries a value for both keys: the count goes where its value puts {{count}}.
    const french = overflowChip(
      render(
        createSimpleI18nProvider('fr', [
          { code: 'en', name: 'English', translations: {} },
          { code: 'fr', name: 'French', translations: FRENCH },
        ]),
      ),
    )
    expect(french).toEqual({ label: '+2 de plus', text: '»2' })

    // English carries none, so the component's own defaults render.
    expect(overflowChip(render(createSimpleI18nProvider('en')))).toEqual({
      label: '+2 more',
      text: '+2',
    })
  })
})
