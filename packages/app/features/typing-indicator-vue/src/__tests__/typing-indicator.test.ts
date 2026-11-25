// @vitest-environment jsdom
/**
 * Unit tests for the Vue `TypingIndicator` — a port of
 * `@molecule/app-typing-indicator-react/src/__tests__/typing-indicator.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DotPulseMotion } from '@molecule/app-ui'

// The ClassMap's typing pulse recipe; `undefined` leaves the component on `DEFAULT_TYPING_PULSE`.
let recipe: DotPulseMotion | undefined

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use. The real module is spread in, so
// `DEFAULT_TYPING_PULSE` is the real value.
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

import { createApp, defineComponent, h } from 'vue'

import { TypingIndicator } from '../TypingIndicator.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link TypingIndicator} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TypingIndicator, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('TypingIndicator', () => {
  it('renders nothing when visible is false', () => {
    expect(render({ visible: false })).not.toContain('role="status"')
    expect(render({ visible: false })).not.toContain('<span')
  })

  it('renders role="status" with a default aria-label', () => {
    const markup = render({})
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Typing…')
  })

  it('honours a custom aria-label', () => {
    const markup = render({ ariaLabel: 'Alice is typing' })
    expect(markup).toContain('aria-label="Alice is typing"')
  })

  it('renders three animated dots', () => {
    const markup = render({})
    expect(markup.match(/border-radius:\s*50%/g) ?? []).toHaveLength(3)
  })

  it('sizes the dots from the dotSize prop', () => {
    const markup = render({ dotSize: 10 })
    expect(markup).toContain('width: 10px')
  })

  it('injects a keyframes <style> tag', () => {
    const markup = render({})
    expect(markup).toContain('<style')
    expect(markup).toContain('@keyframes molecule-typing-pulse')
  })

  it('stops the pulse when motion is reduced', () => {
    const markup = render({})
    expect(markup).toContain('@media (prefers-reduced-motion: reduce)')
    expect(markup).toContain('[data-typing-dot] { animation: none !important; }')
    expect(markup.match(/data-typing-dot=""/g) ?? []).toHaveLength(3)
  })

  it('forwards className', () => {
    const markup = render({ className: 'ti-cls' })
    expect(markup).toContain('ti-cls')
  })

  it('uses the ClassMap pulse recipe through the UI element', () => {
    recipe = { peakAt: 0.25, restAt: 0.75, stagger: 0.125, dimOpacity: 0.2, dimScale: 0.5 }
    try {
      const markup = render({ durationMs: 800 })
      expect(markup).toContain('75%, 100% { opacity: 0.2; transform: scale(0.5); } 25%')
      expect(markup).toContain('800ms ease-in-out 200ms infinite')
    } finally {
      recipe = undefined
    }
  })
})
