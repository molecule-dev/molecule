// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Required by React's act() outside @testing-library.
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// Flipped on by the literal-key tests: the mock's `t` then answers with the
// key itself, so the test sees exactly which key the component asked for.
const marker = vi.hoisted(() => ({ on: false }))

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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) => {
      if (marker.on) return `[${key}]`
      return opts?.defaultValue ?? key
    },
  }),
}))

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({
    children,
    onClick,
    ['aria-label']: ariaLabel,
  }: {
    children?: ReactNode
    onClick?: () => void
    'aria-label'?: string
  }) => createElement('button', { 'data-button': '', 'aria-label': ariaLabel, onClick }, children),
}))

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

import type { SocialShareButtonsProps } from '../SocialShareButtons.js'

const { SocialShareButtons } = await import('../SocialShareButtons.js')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

/** The roots mounted by the interaction tests, unmounted in `afterEach`. */
const roots: ReturnType<typeof createRoot>[] = []

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await act(async () => {
      root.unmount()
    })
  }
  document.body.innerHTML = ''
})

/** Renders the row in jsdom and returns its container (cleaned up in `afterEach`). */
async function renderRow(props: SocialShareButtonsProps): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(SocialShareButtons, props))
  })
  roots.push(root)
  return container
}

/** Every platform the component's union can take, in its order. */
const PLATFORMS = ['twitter', 'x', 'linkedin', 'facebook', 'reddit', 'email', 'copy'] as const

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('SocialShareButtons', () => {
  it('renders the default platform set (twitter, linkedin, facebook, copy)', () => {
    const markup = html(createElement(SocialShareButtons, { url: 'https://x.test/post' }))
    expect(markup).toContain('twitter.com/intent/tweet')
    expect(markup).toContain('linkedin.com/sharing')
    expect(markup).toContain('facebook.com/sharer')
    // the 3 link platforms render as <a>; copy renders as a bare button
    expect(markup.match(/<a /g) ?? []).toHaveLength(3)
  })

  it('encodes the url into each share link', () => {
    const markup = html(createElement(SocialShareButtons, { url: 'https://x.test/a b' }))
    expect(markup).toContain(encodeURIComponent('https://x.test/a b'))
  })

  it('honours a custom platform list and order', () => {
    const markup = html(
      createElement(SocialShareButtons, { url: 'https://x.test', platforms: ['reddit', 'email'] }),
    )
    expect(markup).toContain('reddit.com/submit')
    expect(markup).toContain('mailto:')
    expect(markup).not.toContain('twitter.com')
  })

  it('renders the copy platform as a button with an aria-label', () => {
    const markup = html(
      createElement(SocialShareButtons, { url: 'https://x.test', platforms: ['copy'] }),
    )
    expect(markup).toContain('<button')
    expect(markup).toContain('aria-label="Copy"')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(SocialShareButtons, { url: 'https://x.test', className: 'ssb-cls' }),
    )
    expect(markup).toContain('ssb-cls')
  })

  it('copies the url when the copy button is clicked', async () => {
    const container = await renderRow({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = container.querySelector('button')
    if (!button) throw new Error('no copy button rendered')
    await act(async () => {
      button.click()
      await Promise.resolve()
    })
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/click')
    expect(button.textContent).toContain('Copied!')
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const container = await renderRow({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = container.querySelector('button')
    if (!button) throw new Error('no copy button rendered')
    await act(async () => {
      button.click()
      await Promise.resolve()
    })
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

  it('resolves every platform label through its literal key', () => {
    // One literal `share.<platform>` key per platform: the rendered aria-label
    // is the key the mock answered with, so a marker here proves the component
    // asked for that exact literal key (a runtime-built key would miss).
    marker.on = true
    try {
      const markup = html(
        createElement(SocialShareButtons, { url: 'https://x.test', platforms: [...PLATFORMS] }),
      )
      for (const p of PLATFORMS) {
        expect(markup).toContain(`aria-label="[share.${p}]"`)
      }
    } finally {
      marker.on = false
    }
  })

  it('falls back to the English platform name when no translation is loaded', () => {
    const markup = html(
      createElement(SocialShareButtons, { url: 'https://x.test', platforms: [...PLATFORMS] }),
    )
    // the inline English default is the platform's name — the bond's en.ts text
    for (const p of PLATFORMS) {
      expect(markup).toContain(`aria-label="${ENGLISH[p]}"`)
    }
  })
})
