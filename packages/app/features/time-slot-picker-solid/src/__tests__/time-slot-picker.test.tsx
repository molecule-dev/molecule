// @vitest-environment jsdom
/**
 * Unit tests for the Solid `TimeSlotPicker` — a port of
 * `@molecule/app-time-slot-picker-react/src/__tests__/time-slot-picker.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TimeSlot } from '../types.js'

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

// `t(key, values, opts)` falls back to the supplied `defaultValue`, as the i18n
// core does for a key with no translation.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TimeSlotPicker } = await import('../TimeSlotPicker.jsx')

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

const slots: TimeSlot[] = [
  { id: 'am', label: 'Morning (9–12)', meta: 'Free' },
  { id: 'pm', label: 'Afternoon (1–5)' },
  { id: 'eve', label: 'Evening (6–9)', disabled: true },
]

describe('TimeSlotPicker', () => {
  it('renders a radiogroup with one radio per slot', () => {
    const container = mount(() => <TimeSlotPicker slots={slots} onSelect={() => {}} />)
    expect(container.innerHTML).toContain('role="radiogroup"')
    expect(container.innerHTML.match(/role="radio"/g) ?? []).toHaveLength(3)
  })

  it('renders each slot label and the optional meta line', () => {
    const container = mount(() => <TimeSlotPicker slots={slots} onSelect={() => {}} />)
    expect(container.innerHTML).toContain('Morning (9–12)')
    expect(container.innerHTML).toContain('Free')
    expect(container.innerHTML).toContain('Afternoon (1–5)')
  })

  it('marks the selected slot with aria-checked', () => {
    const container = mount(() => (
      <TimeSlotPicker slots={slots} selectedId="pm" onSelect={() => {}} />
    ))
    expect(container.innerHTML.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('disables a slot flagged disabled', () => {
    const container = mount(() => <TimeSlotPicker slots={slots} onSelect={() => {}} />)
    expect(container.innerHTML).toMatch(/<button[^>]*disabled/)
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(
      mount(() => <TimeSlotPicker slots={slots} title="Pick a time" onSelect={() => {}} />)
        .innerHTML,
    ).toContain('Pick a time')
    expect(
      mount(() => <TimeSlotPicker slots={slots} onSelect={() => {}} />).innerHTML,
    ).not.toContain('<h3')
  })

  it('forwards className', () => {
    const container = mount(() => (
      <TimeSlotPicker slots={slots} className="tsp-cls" onSelect={() => {}} />
    ))
    expect(container.innerHTML).toContain('tsp-cls')
  })
})
