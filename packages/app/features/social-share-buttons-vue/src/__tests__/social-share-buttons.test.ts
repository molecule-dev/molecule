// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SocialShareButtons` — a port of
 * `@molecule/app-social-share-buttons-react/src/__tests__/social-share-buttons.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element rendering its default slot and forwarding the
// `aria-label` the copy platform passes.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: {
        variant: String,
        size: String,
        ariaLabel: String,
        onClick: { type: Function, default: undefined },
      },
      setup(props, { slots }) {
        return () =>
          h(
            'button',
            {
              'data-button': '',
              type: 'button',
              'aria-label': props.ariaLabel,
              onClick: props.onClick,
            },
            slots.default?.(),
          )
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import { SocialShareButtons } from '../SocialShareButtons.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link SocialShareButtons} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(SocialShareButtons, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('SocialShareButtons', () => {
  it('renders the default platform set (twitter, linkedin, facebook, copy)', () => {
    const markup = render({ url: 'https://x.test/post' })
    expect(markup).toContain('twitter.com/intent/tweet')
    expect(markup).toContain('linkedin.com/sharing')
    expect(markup).toContain('facebook.com/sharer')
    // the 3 link platforms render as <a>; copy renders as a bare button
    expect(markup.match(/<a /g) ?? []).toHaveLength(3)
  })

  it('encodes the url into each share link', () => {
    const markup = render({ url: 'https://x.test/a b' })
    expect(markup).toContain(encodeURIComponent('https://x.test/a b'))
  })

  it('honours a custom platform list and order', () => {
    const markup = render({ url: 'https://x.test', platforms: ['reddit', 'email'] })
    expect(markup).toContain('reddit.com/submit')
    expect(markup).toContain('mailto:')
    expect(markup).not.toContain('twitter.com')
  })

  it('renders the copy platform as a button with an aria-label', () => {
    const markup = render({ url: 'https://x.test', platforms: ['copy'] })
    expect(markup).toContain('<button')
    expect(markup).toContain('aria-label="copy"')
  })

  it('forwards className', () => {
    const markup = render({ url: 'https://x.test', className: 'ssb-cls' })
    expect(markup).toContain('ssb-cls')
  })
})
