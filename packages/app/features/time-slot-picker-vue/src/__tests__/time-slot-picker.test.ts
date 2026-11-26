// @vitest-environment jsdom
/**
 * Unit tests for the Vue `TimeSlotPicker` — a port of
 * `@molecule/app-time-slot-picker-react/src/__tests__/time-slot-picker.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

// `t(key, values, opts)` falls back to the supplied `defaultValue`, as the i18n
// core does for a key with no translation.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { TimeSlotPicker } from '../TimeSlotPicker.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link TimeSlotPicker} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TimeSlotPicker, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const slots = [
  { id: 'am', label: 'Morning (9–12)', meta: 'Free' },
  { id: 'pm', label: 'Afternoon (1–5)' },
  { id: 'eve', label: 'Evening (6–9)', disabled: true },
]

describe('TimeSlotPicker', () => {
  it('renders a radiogroup with one radio per slot', () => {
    const markup = render({ slots, onSelect: () => {} })
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(3)
  })

  it('renders each slot label and the optional meta line', () => {
    const markup = render({ slots, onSelect: () => {} })
    expect(markup).toContain('Morning (9–12)')
    expect(markup).toContain('Free')
    expect(markup).toContain('Afternoon (1–5)')
  })

  it('marks the selected slot with aria-checked', () => {
    const markup = render({ slots, onSelect: () => {}, selectedId: 'pm' })
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('disables a slot flagged disabled', () => {
    const markup = render({ slots, onSelect: () => {} })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(render({ slots, onSelect: () => {}, title: 'Pick a time' })).toContain('Pick a time')
    expect(render({ slots, onSelect: () => {} })).not.toContain('<h3')
  })

  it('forwards className', () => {
    const markup = render({ slots, onSelect: () => {}, className: 'tsp-cls' })
    expect(markup).toContain('tsp-cls')
  })
})
