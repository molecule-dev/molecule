// @vitest-environment jsdom
/**
 * Unit tests for the Vue `FlashcardCard` — a port of
 * `@molecule/app-flashcard-card-react/src/__tests__/flashcard-card.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: { variant: String, color: String, onClick: Function },
      setup(_props, { slots }) {
        return () => h('button', { 'data-button': '' }, slots.default?.())
      },
    }),
    Card: defineComponent({
      name: 'Card',
      props: { className: String },
      setup(props, { slots }) {
        return () => h('div', { 'data-card': '', class: props.className }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { FlashcardCard } from '../FlashcardCard.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link FlashcardCard} with the given props and returns the markup
 * it produced.
 *
 * @param props - The card's props.
 * @param slots - Same-named slots, when the test mounts with slots.
 * @returns The markup.
 */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(FlashcardCard, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('FlashcardCard', () => {
  it('shows the front and a "Show answer" button before reveal', () => {
    const markup = render({ front: 'Q: 2+2?', back: 'A: 4' })
    expect(markup).toContain('Q: 2+2?')
    expect(markup).toContain('Show answer')
    expect(markup).not.toContain('A: 4')
  })

  it('shows the back and the grade buttons when defaultRevealed is set', () => {
    const markup = render({ front: 'Q', back: 'A: 4', defaultRevealed: true })
    expect(markup).toContain('A: 4')
    expect(markup).toContain('Again')
    expect(markup).toContain('Hard')
    expect(markup).toContain('Good')
    expect(markup).toContain('Easy')
  })

  it('renders the progress slot', () => {
    const markup = render({
      front: 'Q',
      back: 'A',
      progress: h('span', { 'data-progress': '' }),
    })
    expect(markup).toContain('data-progress=""')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ front: 'Q', back: 'A', className: 'fc-cls' })
    expect(markup).toContain('fc-cls')
  })
})
