// @vitest-environment jsdom
/**
 * The Svelte `Sparkline`'s own text goes through i18n — a port of
 * `@molecule/app-sparkline-react/src/__tests__/sparkline-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real mount (jsdom). A
 * `useTranslation` whose `t` returns a marker proves the default aria-label
 * went through `t()` with its key; a default that bypassed `t()` would show
 * up as plain English.
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import Sparkline from '../Sparkline.svelte'
import type { SparklineProps } from '../types.js'

afterEach(async () => {
  document.body.innerHTML = ''
})

/**
 * Mounts `Sparkline` with the given props and returns the target markup.
 *
 * @param props - The sparkline props.
 * @returns The markup of the mounted sparkline.
 */
function render(props: SparklineProps): string {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(Sparkline, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(instance)
  target.remove()
  return markup
}

describe('Sparkline i18n', () => {
  it('renders the default aria-label through t with its key', () => {
    const markup = render({ values: [1, 2, 3] })
    expect(markup).toContain('aria-label="«sparkline.aria.trendSparkline»"')
  })

  it('lets an explicit ariaLabel override the translated default', () => {
    const markup = render({ values: [1, 2], ariaLabel: 'Sales trend' })
    expect(markup).toContain('aria-label="Sales trend"')
    expect(markup).not.toContain('«sparkline.aria.trendSparkline»')
  })
})
