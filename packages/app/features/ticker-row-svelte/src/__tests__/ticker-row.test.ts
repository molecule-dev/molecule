// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `TickerRow` — a port of
 * `@molecule/app-ticker-row-react/src/__tests__/ticker-row.test.tsx`: the same
 * behavioral assertions, rendered with a real Svelte 5 mount (jsdom) and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

import TickerRow from '../TickerRow.svelte'
import type { TickerRowProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The mounted components, unmounted after each test. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const component of mounted.splice(0)) void unmount(component)
  document.body.innerHTML = ''
})

/** Mounts the component into the document and returns the markup it produced. */
const render = (props: TickerRowProps): string => {
  const target = mountRow(props)
  const markup = target.innerHTML
  target.remove()
  return markup
}

/**
 * Mounts the component into the document and returns its target element (the
 * markup cannot fire events before it is read).
 */
const mountRow = (props: TickerRowProps): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(TickerRow, { target, props }))
  flushSync()
  return target
}

/** Dispatches a click with the left button on the element. */
const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

/** The transparent button carrying the row's open action. */
const openButton = (target: HTMLElement): HTMLButtonElement => {
  const el = target.querySelector('button[data-mol-id="ticker-row-open"]')
  if (!el) throw new Error('the open button did not render')
  return el as HTMLButtonElement
}

describe('TickerRow', () => {
  it('renders the symbol, name, and price', () => {
    const markup = render({ symbol: 'BTC', name: 'Bitcoin', price: '$67,000' })
    expect(markup).toContain('BTC')
    expect(markup).toContain('Bitcoin')
    expect(markup).toContain('$67,000')
  })

  it('renders an up arrow with the theme success class for a positive change', () => {
    const markup = render({ symbol: 'X', price: '$1', changePct: 3.21 })
    expect(markup).toContain('▲')
    expect(markup).toContain('3.21%')
    expect(markup).toContain('textSuccess')
    expect(markup).not.toContain('#22c55e')
    expect(markup).not.toContain('textError')
  })

  it('renders a down arrow with the theme error class for a negative change', () => {
    const markup = render({ symbol: 'X', price: '$1', changePct: -1.5 })
    expect(markup).toContain('▼')
    expect(markup).toContain('-1.50%')
    expect(markup).toContain('textError')
    expect(markup).not.toContain('#ef4444')
  })

  it('announces the change direction in words for screen readers', () => {
    const up = render({ symbol: 'X', price: '$1', changePct: 3.21 })
    expect(up).toContain('aria-hidden="true"')
    expect(up).toContain('srOnly')
    expect(up).toContain('Up')
    const flat = render({ symbol: 'X', price: '$1', changePct: 0 })
    expect(flat).toContain('Unchanged')
    expect(flat).toContain('0.00%')
  })

  it('uses changeDisplay over the formatted percentage when supplied', () => {
    const markup = render({ symbol: 'X', price: '$1', changePct: 2, changeDisplay: '+$0.50' })
    expect(markup).toContain('+$0.50')
    expect(markup).not.toContain('2.00%')
  })

  it('renders the icon, sparkline, and meta slots', () => {
    const markup = render({
      symbol: 'X',
      price: '$1',
      icon: raw('<span data-icon=""></span>'),
      sparkline: raw('<svg data-spark=""></svg>'),
      meta: raw('<span data-meta=""></span>'),
    })
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-spark=""')
    expect(markup).toContain('data-meta=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = render({ symbol: 'X', price: '$1', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    expect(clickable).toContain('position')
    const plain = render({ symbol: 'X', price: '$1', className: 'tr-cls' })
    expect(plain).not.toContain('cursorPointer')
    expect(plain).not.toContain('position')
    expect(plain).toContain('tr-cls')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const target = mountRow({ symbol: 'BTC', price: '$1', onClick })
    click(openButton(target))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith()
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const onMetaClick = vi.fn()
    const target = mountRow({
      symbol: 'BTC',
      price: '$1',
      onClick,
      meta: raw('<button type="button" data-meta-control="">Watch</button>'),
    })
    const meta = target.querySelector('button[data-meta-control]')
    if (!meta) throw new Error('the meta control did not render')
    meta.addEventListener('click', () => onMetaClick())
    click(meta)
    expect(onMetaClick).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const target = mountRow({ symbol: 'BTC', name: 'Bitcoin', price: '$1', onClick: () => {} })
    const labelledBy = openButton(target).getAttribute('aria-labelledby') ?? ''
    const name = labelledBy
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(name).toBe('BTC')
  })

  it('without onClick there is no open button', () => {
    const target = mountRow({ symbol: 'BTC', price: '$1' })
    expect(target.querySelector('button')).toBeNull()
    expect(target.querySelector('div')?.getAttribute('style') ?? '').not.toContain('relative')
  })
})
