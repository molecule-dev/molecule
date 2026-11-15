// @vitest-environment jsdom
/**
 * Unit tests for the Vue `MedicationRow` — a port of
 * `@molecule/app-medication-row-react/src/__tests__/medication-row.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex1`), so tests can assert which cm.* class was applied without a real
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

// The translation mock the React tests use: the default value with `{{name}}`
// placeholders filled in from the values object.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

// The Card marker the React tests mock `@molecule/app-ui-react` with: a
// `data-card` element carrying the className it received.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Card: defineComponent({
      name: 'Card',
      props: { className: { type: String, default: undefined } },
      setup(props, { slots }) {
        return () => h('div', { 'data-card': '', class: props.className }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { MedicationRow } from '../MedicationRow.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link MedicationRow} and returns the host the markup landed in. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(MedicationRow, props, slots) }))
  app.mount(host)
  return host
}

describe('MedicationRow', () => {
  it('renders the drug name in an <h3>', () => {
    const markup = render({ name: 'Ibuprofen' }).innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Ibuprofen')
  })

  it('renders dosage, form, and instructions when present', () => {
    const markup = render({
      name: 'X',
      dosage: '10mg',
      form: 'tablet',
      instructions: 'Take with food',
    }).innerHTML
    expect(markup).toContain('10mg')
    expect(markup).toContain('tablet')
    expect(markup).toContain('Take with food')
  })

  it('renders the color pill swatch when a color is given', () => {
    const swatch = render({ name: 'X', color: '#ff8800' }).querySelector<HTMLElement>(
      '[aria-hidden="true"]',
    )
    expect(swatch?.style.background).toBe('rgb(255, 136, 0)')
    expect(swatch?.style.width).toBe('24px')
    expect(swatch?.style.height).toBe('24px')
  })

  it('renders prescriber, supply days, and refills when present', () => {
    const markup = render({
      name: 'X',
      prescriber: 'Dr. Smith',
      supplyDays: 30,
      refills: 2,
    }).innerHTML
    expect(markup).toContain('Prescribed by')
    expect(markup).toContain('Dr. Smith')
    expect(markup).toContain('30 day supply')
    expect(markup).toContain('2 refills')
  })

  it('renders the actions slot', () => {
    const markup = render(
      { name: 'X' },
      { actions: () => [h('button', { 'data-actions': '' })] },
    ).innerHTML
    expect(markup).toContain('data-actions=""')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ name: 'X', className: 'mr-cls' }).innerHTML
    expect(markup).toContain('mr-cls')
  })
})
