// @vitest-environment jsdom
/**
 * i18n for the Svelte `NoteCard`'s own text — a port of
 * `@molecule/app-note-card-react/src/__tests__/note-card-i18n.test.tsx`: the
 * same test names and assertions, rendered with Svelte in jsdom. The pinned
 * marker's accessible label goes through `t()`; the provider here marks every
 * translation it serves (`«key»`), so a string that bypassed `t()` shows up
 * as plain English.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { default: NoteCard } = await import('../NoteCard.svelte')

/** Mounted instances, unmounted after each test. */
const instances: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** Renders a pinned {@link NoteCard} and returns the markup it produced. */
const pinnedCard = (): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(NoteCard, { target, props: { body: 'b', pinned: true } }))
  flushSync()
  return target.innerHTML
}

describe('NoteCard i18n', () => {
  it('takes the pinned marker label through i18n by default', () => {
    expect(pinnedCard()).toContain('aria-label="«noteCard.aria.pinned»"')
  })

  it('renders the pinned marker with an image role so screen readers announce the label', () => {
    expect(pinnedCard()).toContain('role="img"')
  })
})
