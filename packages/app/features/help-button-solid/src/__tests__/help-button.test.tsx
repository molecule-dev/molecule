// @vitest-environment jsdom
/**
 * Unit tests for the Solid `HelpButton` — a port of
 * `@molecule/app-help-button-react/src/__tests__/help-button.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { HelpButton } = await import('../HelpButton.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a {@link HelpButton} with Solid's browser renderer and returns the
 * markup it produced.
 *
 * @param view - The element to render.
 * @returns The rendered markup.
 */
const html = (view: () => JSX.Element): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

describe('HelpButton', () => {
  it('renders a <button> when no href is supplied', () => {
    const markup = html(() => <HelpButton onClick={() => {}} />)
    expect(markup.startsWith('<button')).toBe(true)
  })

  it('renders an <a> when href is supplied', () => {
    const markup = html(() => <HelpButton href="/support" />)
    expect(markup.startsWith('<a')).toBe(true)
    expect(markup).toContain('href="/support"')
  })

  it('renders the default "?" glyph and a custom icon override', () => {
    expect(html(() => <HelpButton />)).toContain('?')
    const custom = html(() => <HelpButton icon={<span data-icon="" />} />)
    expect(custom).toContain('data-icon=""')
  })

  it('uses the default "Help" aria-label and a custom label', () => {
    expect(html(() => <HelpButton />)).toContain('aria-label="Help"')
    expect(html(() => <HelpButton label="Get support" />)).toContain('aria-label="Get support"')
  })

  it('renders the notification dot only when hasNotification is set', () => {
    // the dot is a small absolute-positioned span with a border-radius
    const withDot = html(() => <HelpButton hasNotification />)
    expect(withDot).toMatch(/border-radius:\s*50%/)
    const without = html(() => <HelpButton />)
    expect(without).not.toMatch(/border-radius:\s*50%/)
  })

  it('uses fixed positioning for a corner position and drops it for inline', () => {
    expect(html(() => <HelpButton position="bottom-right" />)).toMatch(/position:\s*fixed/)
    expect(html(() => <HelpButton position="inline" />)).not.toMatch(/position:\s*fixed/)
  })

  it('forwards className', () => {
    const markup = html(() => <HelpButton className="hb-cls" />)
    expect(markup).toContain('hb-cls')
  })
})
