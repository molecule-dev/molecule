// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ProgressBar` / `ProgressCard` — a port of
 * `@molecule/app-progress-bar-react/src/__tests__/progress-bar.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the components produce.
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

// The Card marker the React tests mock `@molecule/app-ui-react` with: a
// `data-card` element carrying the className it received.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
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

import { ProgressBar } from '../ProgressBar.js'
import { ProgressCard } from '../ProgressCard.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a component with the given props (and optional slots) and returns the markup. */
const render = (
  component: unknown,
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('ProgressBar', () => {
  it('renders the label and valueLabel header row when given', () => {
    const markup = render(ProgressBar, { value: 50, label: 'Storage', valueLabel: '50%' })
    expect(markup).toContain('Storage')
    expect(markup).toContain('50%')
  })

  it('omits the header row when neither label nor valueLabel is given', () => {
    const markup = render(ProgressBar, { value: 50 })
    expect(markup).not.toContain('<span')
  })

  it('exposes progressbar a11y attributes', () => {
    const markup = render(ProgressBar, { value: 30, max: 60 })
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="30"')
    expect(markup).toContain('aria-valuemin="0"')
    expect(markup).toContain('aria-valuemax="60"')
  })

  it('sets the fill width to value/max as a percentage', () => {
    expect(render(ProgressBar, { value: 25, max: 100 })).toContain('width: 25%')
    expect(render(ProgressBar, { value: 50, max: 200 })).toContain('width: 25%')
  })

  it('clamps the fill width to the 0–100 range', () => {
    expect(render(ProgressBar, { value: 500, max: 100 })).toContain('width: 100%')
    expect(render(ProgressBar, { value: -10, max: 100 })).toContain('width: 0%')
  })

  it('renders 0% width when max is 0', () => {
    expect(render(ProgressBar, { value: 10, max: 0 })).toContain('width: 0%')
  })

  it('forwards className', () => {
    const markup = render(ProgressBar, { value: 10, className: 'pb-cls' })
    expect(markup).toContain('pb-cls')
  })
})

describe('ProgressCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = render(ProgressCard, { title: 'Budget', value: 40 })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Budget')
  })

  it('renders the description and icon when present', () => {
    const markup = render(
      ProgressCard,
      { title: 'T', value: 40, description: 'desc-x' },
      { icon: () => [h('i', { 'data-icon': '' })] },
    )
    expect(markup).toContain('desc-x')
    expect(markup).toContain('data-icon=""')
  })

  it('renders the valueLabel', () => {
    const markup = render(ProgressCard, { title: 'T', value: 40, valueLabel: '40%' })
    expect(markup).toContain('40%')
  })

  it('renders the inner ProgressBar', () => {
    const markup = render(ProgressCard, { title: 'T', value: 40 })
    expect(markup).toContain('role="progressbar"')
  })

  it('renders the children slot below the bar', () => {
    const markup = render(
      ProgressCard,
      { title: 'T', value: 40 },
      {
        default: () => [h('div', { 'data-extra': '' })],
      },
    )
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className onto the Card', () => {
    const markup = render(ProgressCard, { title: 'T', value: 40, className: 'pc-cls' })
    expect(markup).toContain('pc-cls')
  })
})
