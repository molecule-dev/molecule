// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `TimeSlotPicker` — a port of
 * `@molecule/app-time-slot-picker-react/src/__tests__/time-slot-picker.test.tsx`:
 * the same behavioral assertions, rendered with Svelte in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TimeSlot } from '../types.js'

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
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { default: TimeSlotPicker } = await import('../TimeSlotPicker.svelte')

/** The props a test renders the picker with. */
interface RenderProps {
  slots: TimeSlot[]
  selectedId?: string
  onSelect?: (slot: TimeSlot) => void
  layout?: 'list' | 'grid'
  columns?: 2 | 3 | 4
  title?: string
  className?: string
}

/** Mounts {@link TimeSlotPicker} into jsdom and returns its markup and teardown. */
const render = (props: RenderProps): { markup: string; done: () => Promise<void> } => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(TimeSlotPicker, {
    target,
    props: { onSelect: () => {}, ...props },
  })
  flushSync()
  return {
    markup: target.innerHTML,
    done: async () => {
      await unmount(instance)
      target.remove()
    },
  }
}

const slots: TimeSlot[] = [
  { id: 'am', label: 'Morning (9–12)', meta: 'Free' },
  { id: 'pm', label: 'Afternoon (1–5)' },
  { id: 'eve', label: 'Evening (6–9)', disabled: true },
]

afterEach(() => {
  document.body.innerHTML = ''
})

describe('TimeSlotPicker', () => {
  it('renders a radiogroup with one radio per slot', async () => {
    const { markup, done } = render({ slots })
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(3)
    await done()
  })

  it('renders each slot label and the optional meta line', async () => {
    const { markup, done } = render({ slots })
    expect(markup).toContain('Morning (9–12)')
    expect(markup).toContain('Free')
    expect(markup).toContain('Afternoon (1–5)')
    await done()
  })

  it('marks the selected slot with aria-checked', async () => {
    const { markup, done } = render({ slots, selectedId: 'pm' })
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
    await done()
  })

  it('disables a slot flagged disabled', async () => {
    const { markup, done } = render({ slots })
    expect(markup).toMatch(/<button[^>]*disabled/)
    await done()
  })

  it('renders the title when present and omits it otherwise', async () => {
    const withTitle = render({ slots, title: 'Pick a time' })
    expect(withTitle.markup).toContain('Pick a time')
    await withTitle.done()
    const withoutTitle = render({ slots })
    expect(withoutTitle.markup).not.toContain('<h3')
    await withoutTitle.done()
  })

  it('forwards className', async () => {
    const { markup, done } = render({ slots, className: 'tsp-cls' })
    expect(markup).toContain('tsp-cls')
    await done()
  })
})
