import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { DotPulseMotion } from '@molecule/app-ui'

let recipe: DotPulseMotion | undefined

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'typingPulse') return recipe
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

const { TypingIndicator } = await import('../TypingIndicator.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('TypingIndicator', () => {
  it('renders nothing when visible is false', () => {
    expect(html(createElement(TypingIndicator, { visible: false }))).toBe('')
  })

  it('renders role="status" with a default aria-label', () => {
    const markup = html(createElement(TypingIndicator, {}))
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Typing')
  })

  it('honours a custom aria-label', () => {
    const markup = html(createElement(TypingIndicator, { ariaLabel: 'Alice is typing' }))
    expect(markup).toContain('aria-label="Alice is typing"')
  })

  it('renders three animated dots', () => {
    const markup = html(createElement(TypingIndicator, {}))
    expect(markup.match(/border-radius:50%/g) ?? []).toHaveLength(3)
  })

  it('sizes the dots from the dotSize prop', () => {
    const markup = html(createElement(TypingIndicator, { dotSize: 10 }))
    expect(markup).toContain('width:10px')
  })

  it('injects a keyframes <style> tag', () => {
    const markup = html(createElement(TypingIndicator, {}))
    expect(markup).toContain('<style')
    expect(markup).toContain('@keyframes molecule-typing-pulse')
  })

  it('stops the pulse when motion is reduced', () => {
    const markup = html(createElement(TypingIndicator, {}))
    expect(markup).toContain('@media (prefers-reduced-motion: reduce)')
    expect(markup).toContain('[data-typing-dot] { animation: none !important; }')
    expect(markup.match(/data-typing-dot=""/g) ?? []).toHaveLength(3)
  })

  it('forwards className', () => {
    const markup = html(createElement(TypingIndicator, { className: 'ti-cls' }))
    expect(markup).toContain('ti-cls')
  })

  it('uses the ClassMap pulse recipe through the UI element', () => {
    recipe = { peakAt: 0.25, restAt: 0.75, stagger: 0.125, dimOpacity: 0.2, dimScale: 0.5 }
    try {
      const markup = html(createElement(TypingIndicator, { durationMs: 800 }))
      expect(markup).toContain('75%, 100% { opacity: 0.2; transform: scale(0.5); } 25%')
      expect(markup).toContain('800ms ease-in-out 200ms infinite')
    } finally {
      recipe = undefined
    }
  })
})
