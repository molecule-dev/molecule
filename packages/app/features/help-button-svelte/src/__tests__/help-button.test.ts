// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `HelpButton` — a port of
 * `@molecule/app-help-button-react/src/__tests__/help-button.test.tsx`: the
 * same behavioral assertions, rendered with a real Svelte mount in jsdom.
 *
 * @module
 */

import { createRawSnippet, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* call was applied without a real bond — the same mock the
// React package's own tests use.
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

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import type { HelpButtonProps } from '../types.js'

const { default: HelpButton } = await import('../HelpButton.svelte')

/** A snippet rendering the given markup, the way a caller fills the icon prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link HelpButton} and returns the markup it produced.
 *
 * @param props - The component props.
 * @returns The rendered markup.
 */
const html = (props: HelpButtonProps = {}): string => root(props).parentElement?.innerHTML ?? ''

/**
 * Mounts a {@link HelpButton} and returns its root element.
 *
 * @param props - The component props.
 * @returns The rendered root element.
 */
const root = (props: HelpButtonProps = {}): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(HelpButton, { target, props }))
  const el = target.firstElementChild
  if (!(el instanceof HTMLElement)) throw new Error('no HelpButton root rendered')
  return el
}

describe('HelpButton', () => {
  it('renders a <button> when no href is supplied', () => {
    expect(root({ onClick: () => {} }).tagName).toBe('BUTTON')
  })

  it('renders an <a> when href is supplied', () => {
    const anchor = root({ href: '/support' })
    expect(anchor.tagName).toBe('A')
    expect(anchor.getAttribute('href')).toBe('/support')
  })

  it('renders the default "?" glyph and a custom icon override', () => {
    expect(html()).toContain('?')
    const custom = html({ icon: raw('<span data-icon=""></span>') })
    expect(custom).toContain('data-icon=""')
  })

  it('uses the default "Help" aria-label and a custom label', () => {
    expect(html()).toContain('aria-label="Help"')
    expect(html({ label: 'Get support' })).toContain('aria-label="Get support"')
  })

  it('renders the notification dot only when hasNotification is set', () => {
    // the dot is a small absolute-positioned span with a border-radius
    const withDot = html({ hasNotification: true })
    expect(withDot).toMatch(/border-radius:\s*50%/)
    const without = html()
    expect(without).not.toMatch(/border-radius:\s*50%/)
  })

  it('uses fixed positioning for a corner position and drops it for inline', () => {
    expect(html({ position: 'bottom-right' })).toMatch(/position:\s*fixed/)
    expect(html({ position: 'inline' })).not.toMatch(/position:\s*fixed/)
  })

  it('forwards className', () => {
    const markup = html({ className: 'hb-cls' })
    expect(markup).toContain('hb-cls')
  })
})
