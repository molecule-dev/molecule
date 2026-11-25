// @vitest-environment jsdom
/**
 * Unit tests for the Solid `TypingIndicator` — a port of
 * `@molecule/app-typing-indicator-react/src/__tests__/typing-indicator.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DotPulseMotion } from '@molecule/app-ui'

// The ClassMap's typing pulse recipe; `undefined` leaves the component on `DEFAULT_TYPING_PULSE`.
let recipe: DotPulseMotion | undefined

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* call was applied without a real bond — the
// same mock the React package's own tests use. The real module is spread in, so
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

const { TypingIndicator } = await import('../TypingIndicator.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('TypingIndicator', () => {
  it('renders nothing when visible is false', () => {
    const container = mount(() => <TypingIndicator visible={false} />)
    expect(container.innerHTML).not.toContain('role="status"')
    expect(container.innerHTML).not.toContain('border-radius')
  })

  it('renders role="status" with a default aria-label', () => {
    const container = mount(() => <TypingIndicator />)
    const status = container.querySelector('span[role="status"]')
    expect(status).not.toBeNull()
    expect(status?.getAttribute('aria-label')).toBe('Typing…')
  })

  it('honours a custom aria-label', () => {
    const container = mount(() => <TypingIndicator ariaLabel="Alice is typing" />)
    expect(container.innerHTML).toContain('aria-label="Alice is typing"')
  })

  it('renders three animated dots', () => {
    const container = mount(() => <TypingIndicator />)
    expect(container.innerHTML.match(/border-radius:\s*50%/g) ?? []).toHaveLength(3)
  })

  it('sizes the dots from the dotSize prop', () => {
    const container = mount(() => <TypingIndicator dotSize={10} />)
    expect(container.innerHTML).toContain('width: 10px')
  })

  it('injects a keyframes <style> tag', () => {
    const container = mount(() => <TypingIndicator />)
    expect(container.innerHTML).toContain('<style')
    expect(container.innerHTML).toContain('@keyframes molecule-typing-pulse')
  })

  it('stops the pulse when motion is reduced', () => {
    const container = mount(() => <TypingIndicator />)
    expect(container.innerHTML).toContain('@media (prefers-reduced-motion: reduce)')
    expect(container.innerHTML).toContain('[data-typing-dot] { animation: none !important; }')
    expect(container.innerHTML.match(/data-typing-dot=""/g) ?? []).toHaveLength(3)
  })

  it('forwards className', () => {
    const container = mount(() => <TypingIndicator className="ti-cls" />)
    expect(container.innerHTML).toContain('ti-cls')
  })

  it('uses the ClassMap pulse recipe through the UI element', () => {
    recipe = { peakAt: 0.25, restAt: 0.75, stagger: 0.125, dimOpacity: 0.2, dimScale: 0.5 }
    try {
      const container = mount(() => <TypingIndicator durationMs={800} />)
      expect(container.innerHTML).toContain(
        '75%, 100% { opacity: 0.2; transform: scale(0.5); } 25%',
      )
      expect(container.innerHTML).toContain('800ms ease-in-out 200ms infinite')
    } finally {
      recipe = undefined
    }
  })
})
