// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SocialShareButtons` — a port of
 * `@molecule/app-social-share-buttons-react/src/__tests__/social-share-buttons.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Flipped on by the literal-key tests: the mock's `t` then answers with the
// key itself, so the test sees exactly which key the component asked for.
const marker = vi.hoisted(() => ({ on: false }))

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) => {
      if (marker.on) return `[${key}]`
      return opts?.defaultValue ?? key
    },
  }),
}))

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element rendering its default slot and forwarding the
// `aria-label` the copy platform passes.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

import { createApp, defineComponent, h } from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'

import { SocialShareButtons } from '../SocialShareButtons.js'
import type { SocialShareButtonsProps } from '../types.js'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** Mounts the row and leaves it live, for the tests that click into it. */
const mountRow = (props: SocialShareButtonsProps): { host: HTMLElement; unmount: () => void } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(SocialShareButtons, props) }))
  app.mount(host)
  return {
    host,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
}

/** Renders a {@link SocialShareButtons} and returns the markup it produced. */
const render = (props: SocialShareButtonsProps): string => {
  const { host, unmount } = mountRow(props)
  const markup = host.innerHTML
  unmount()
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
    expect(markup).toContain('aria-label="Copy"')
  })

  it('forwards className', () => {
    const markup = render({ url: 'https://x.test', className: 'ssb-cls' })
    expect(markup).toContain('ssb-cls')
  })

  it('copies the url when the copy button is clicked', async () => {
    const { host, unmount } = mountRow({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = host.querySelector('button')
    if (!button) throw new Error('no copy button rendered')
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/click')
    expect(button.textContent).toContain('Copied!')
    unmount()
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const { host, unmount } = mountRow({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = host.querySelector('button')
    if (!button) throw new Error('no copy button rendered')
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/click')
    expect(button.textContent).not.toContain('Copied!')
    expect(button.textContent).toContain('⧉')
    unmount()
  })
})

describe('SocialShareButtons platform label keys', () => {
  /** The English name each platform's label falls back to (the bond's en.ts text). */
  const ENGLISH: Record<string, string> = {
    twitter: 'Twitter',
    x: 'X',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    reddit: 'Reddit',
    email: 'Email',
    copy: 'Copy',
  }

  /** Every platform the component's union can take, in its order. */
  const PLATFORMS = ['twitter', 'x', 'linkedin', 'facebook', 'reddit', 'email', 'copy'] as const

  it('resolves every platform label through its literal key', () => {
    // One literal `share.<platform>` key per platform: the rendered aria-label
    // is the key the mock answered with, so a marker here proves the component
    // asked for that exact literal key (a runtime-built key would miss).
    marker.on = true
    try {
      const markup = render({ url: 'https://x.test', platforms: [...PLATFORMS] })
      for (const p of PLATFORMS) {
        expect(markup).toContain(`aria-label="[share.${p}]"`)
      }
    } finally {
      marker.on = false
    }
  })

  it('falls back to the English platform name when no translation is loaded', () => {
    const markup = render({ url: 'https://x.test', platforms: [...PLATFORMS] })
    // the inline English default is the platform's name — the bond's en.ts text
    for (const p of PLATFORMS) {
      expect(markup).toContain(`aria-label="${ENGLISH[p]}"`)
    }
  })
})
