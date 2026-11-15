// @vitest-environment jsdom
/**
 * Unit tests for `MedicationRow` — the port of
 * `@molecule/app-medication-row-react`'s own suite: the same test names and
 * the same behavioral assertions, rendered with a real Svelte mount (jsdom)
 * and the mocked ClassMap the React suite uses.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

import MedicationRow from '../MedicationRow.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: unknown[] = []

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts a {@link MedicationRow} and returns the host whose markup it produced.
 *
 * @param props - The row props.
 * @param slots - Snippet markup for the row's slots.
 * @returns The rendered host element.
 */
function render(props: Record<string, unknown>, slots: Record<string, string> = {}): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const slotProps: Record<string, Snippet> = {}
  for (const [name, html] of Object.entries(slots)) slotProps[name] = raw(html)
  const instance = mount(MedicationRow, {
    target,
    props: { ...props, ...slotProps } as never,
  })
  instances.push(instance)
  flushSync()
  return target
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
    const markup = render({ name: 'X' }, { actions: '<button data-actions></button>' }).innerHTML
    expect(markup).toContain('data-actions')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ name: 'X', className: 'mr-cls' }).innerHTML
    expect(markup).toContain('mr-cls')
  })
})
