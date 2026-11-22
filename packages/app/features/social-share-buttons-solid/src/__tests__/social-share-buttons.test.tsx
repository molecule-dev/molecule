// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SocialShareButtons` — a port of
 * `@molecule/app-social-share-buttons-react/src/__tests__/social-share-buttons.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SocialShareButtonsProps } from '../types.js'

// Flipped on by the literal-key tests: the mock's `t` then answers with the
// key itself, so the test sees exactly which key the component asked for.
const marker = vi.hoisted(() => ({ on: false }))

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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) => {
      if (marker.on) return `[${key}]`
      return opts?.defaultValue ?? key
    },
  }),
}))

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element rendering its children and forwarding the
// `aria-label` the copy platform passes.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    variant?: string
    size?: string
    onClick?: () => void
    'aria-label'?: string
    children?: JSX.Element
  }) => (
    <button data-button="" type="button" aria-label={props['aria-label']} onClick={props.onClick}>
      {props.children}
    </button>
  ),
}))

const { SocialShareButtons } = await import('../SocialShareButtons.jsx')

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

const disposers: Array<() => void> = []

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders the row and returns its live container, for the tests that click into it. */
function renderLive(props: SocialShareButtonsProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <SocialShareButtons {...props} />, container))
  return container
}

/** Render with Solid's browser renderer and return the container's markup. */
function renderRow(props: SocialShareButtonsProps): string {
  return renderLive(props).innerHTML
}

describe('SocialShareButtons', () => {
  it('renders the default platform set (twitter, linkedin, facebook, copy)', () => {
    const markup = renderRow({ url: 'https://x.test/post' })
    expect(markup).toContain('twitter.com/intent/tweet')
    expect(markup).toContain('linkedin.com/sharing')
    expect(markup).toContain('facebook.com/sharer')
    // the 3 link platforms render as <a>; copy renders as a bare button
    expect(markup.match(/<a /g) ?? []).toHaveLength(3)
  })

  it('encodes the url into each share link', () => {
    const markup = renderRow({ url: 'https://x.test/a b' })
    expect(markup).toContain(encodeURIComponent('https://x.test/a b'))
  })

  it('honours a custom platform list and order', () => {
    const markup = renderRow({ url: 'https://x.test', platforms: ['reddit', 'email'] })
    expect(markup).toContain('reddit.com/submit')
    expect(markup).toContain('mailto:')
    expect(markup).not.toContain('twitter.com')
  })

  it('renders the copy platform as a button with an aria-label', () => {
    const markup = renderRow({ url: 'https://x.test', platforms: ['copy'] })
    expect(markup).toContain('<button')
    expect(markup).toContain('aria-label="Copy"')
  })

  it('forwards className', () => {
    const markup = renderRow({ url: 'https://x.test', className: 'ssb-cls' })
    expect(markup).toContain('ssb-cls')
  })

  it('copies the url when the copy button is clicked', async () => {
    const container = renderLive({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = container.querySelector('button[data-button]')
    if (!button) throw new Error('no copy button rendered')
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/click')
    expect(button.textContent).toContain('Copied!')
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const container = renderLive({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = container.querySelector('button[data-button]')
    if (!button) throw new Error('no copy button rendered')
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/click')
    expect(button.textContent).not.toContain('Copied!')
    expect(button.textContent).toContain('⧉')
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
      const markup = renderRow({ url: 'https://x.test', platforms: [...PLATFORMS] })
      for (const p of PLATFORMS) {
        expect(markup).toContain(`aria-label="[share.${p}]"`)
      }
    } finally {
      marker.on = false
    }
  })

  it('falls back to the English platform name when no translation is loaded', () => {
    const markup = renderRow({ url: 'https://x.test', platforms: [...PLATFORMS] })
    // the inline English default is the platform's name — the bond's en.ts text
    for (const p of PLATFORMS) {
      expect(markup).toContain(`aria-label="${ENGLISH[p]}"`)
    }
  })
})
