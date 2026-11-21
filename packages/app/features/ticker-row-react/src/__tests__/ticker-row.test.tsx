// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

import type { TickerRowProps } from '../TickerRow.js'

const { TickerRow } = await import('../TickerRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

/** Mounted roots, unmounted after each test. */
const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
})

/**
 * Mounts the component into the document (the string renderer cannot fire
 * events) and returns its host element.
 */
const mount = (props: TickerRowProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(createElement(TickerRow, props))
  })
  mounted.push(() => {
    act(() => {
      root.unmount()
    })
    host.remove()
  })
  return host
}

/** Dispatches a click with the left button on the element. */
const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

/** The transparent button carrying the row's open action. */
const openButton = (host: HTMLElement): HTMLButtonElement => {
  const el = host.querySelector('button[data-mol-id="ticker-row-open"]')
  if (!el) throw new Error('the open button did not render')
  return el as HTMLButtonElement
}

describe('TickerRow', () => {
  it('renders the symbol, name, and price', () => {
    const markup = html(
      createElement(TickerRow, { symbol: 'BTC', name: 'Bitcoin', price: '$67,000' }),
    )
    expect(markup).toContain('BTC')
    expect(markup).toContain('Bitcoin')
    expect(markup).toContain('$67,000')
  })

  it('renders an up arrow with the theme success class for a positive change', () => {
    const markup = html(createElement(TickerRow, { symbol: 'X', price: '$1', changePct: 3.21 }))
    expect(markup).toContain('▲')
    expect(markup).toContain('3.21%')
    expect(markup).toContain('textSuccess')
    expect(markup).not.toContain('#22c55e')
    expect(markup).not.toContain('textError')
  })

  it('renders a down arrow with the theme error class for a negative change', () => {
    const markup = html(createElement(TickerRow, { symbol: 'X', price: '$1', changePct: -1.5 }))
    expect(markup).toContain('▼')
    expect(markup).toContain('-1.50%')
    expect(markup).toContain('textError')
    expect(markup).not.toContain('#ef4444')
  })

  it('announces the change direction in words for screen readers', () => {
    const up = html(createElement(TickerRow, { symbol: 'X', price: '$1', changePct: 3.21 }))
    expect(up).toContain('aria-hidden="true"')
    expect(up).toContain('srOnly')
    expect(up).toContain('Up')
    const flat = html(createElement(TickerRow, { symbol: 'X', price: '$1', changePct: 0 }))
    expect(flat).toContain('Unchanged')
    expect(flat).toContain('0.00%')
  })

  it('uses changeDisplay over the formatted percentage when supplied', () => {
    const markup = html(
      createElement(TickerRow, {
        symbol: 'X',
        price: '$1',
        changePct: 2,
        changeDisplay: '+$0.50',
      }),
    )
    expect(markup).toContain('+$0.50')
    expect(markup).not.toContain('2.00%')
  })

  it('renders the icon, sparkline, and meta slots', () => {
    const markup = html(
      createElement(TickerRow, {
        symbol: 'X',
        price: '$1',
        icon: createElement('span', { 'data-icon': '' }),
        sparkline: createElement('svg', { 'data-spark': '' }),
        meta: createElement('span', { 'data-meta': '' }),
      }),
    )
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-spark=""')
    expect(markup).toContain('data-meta=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = html(
      createElement(TickerRow, { symbol: 'X', price: '$1', onClick: () => {} }),
    )
    expect(clickable).toContain('cursorPointer')
    expect(clickable).toContain('position')
    const plain = html(createElement(TickerRow, { symbol: 'X', price: '$1', className: 'tr-cls' }))
    expect(plain).not.toContain('cursorPointer')
    expect(plain).not.toContain('position')
    expect(plain).toContain('tr-cls')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = mount({ symbol: 'BTC', price: '$1', onClick })
    click(openButton(host))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith()
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const onMetaClick = vi.fn()
    const host = mount({
      symbol: 'BTC',
      price: '$1',
      onClick,
      meta: createElement(
        'button',
        { type: 'button', onClick: onMetaClick, 'data-meta-control': '' },
        'Watch',
      ),
    })
    const meta = host.querySelector('button[data-meta-control]')
    if (!meta) throw new Error('the meta control did not render')
    click(meta)
    expect(onMetaClick).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const host = mount({ symbol: 'BTC', name: 'Bitcoin', price: '$1', onClick: () => {} })
    const labelledBy = openButton(host).getAttribute('aria-labelledby') ?? ''
    const name = labelledBy
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(name).toBe('BTC')
  })

  it('without onClick there is no open button', () => {
    const host = mount({ symbol: 'BTC', price: '$1' })
    expect(host.querySelector('button')).toBeNull()
    expect(host.querySelector('div')?.getAttribute('style') ?? '').not.toContain('relative')
  })
})
