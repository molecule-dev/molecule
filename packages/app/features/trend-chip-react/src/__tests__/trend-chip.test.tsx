import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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
        // Tone resolvers echo their argument, so assertions can tell which
        // semantic tone (`textTone-success`) the chip picked.
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { TrendChip } = await import('../TrendChip.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('TrendChip', () => {
  it('renders the success tone for a positive delta', () => {
    const markup = html(createElement(TrendChip, { delta: 12 }))
    expect(markup).toContain('▲')
    expect(markup).toContain('12%')
    expect(markup).toContain('textTone-success')
    expect(markup).not.toContain('style=')
  })

  it('renders the error tone for a negative delta', () => {
    const markup = html(createElement(TrendChip, { delta: -8 }))
    expect(markup).toContain('▼')
    expect(markup).toContain('8%')
    expect(markup).toContain('textTone-error')
  })

  it('renders the secondary tone for a zero delta', () => {
    const markup = html(createElement(TrendChip, { delta: 0 }))
    expect(markup).toContain('–')
    expect(markup).toContain('textTone-secondary')
  })

  it('honours an explicit direction override', () => {
    const markup = html(createElement(TrendChip, { delta: 5, direction: 'down' }))
    expect(markup).toContain('▼')
    expect(markup).toContain('textTone-error')
  })

  it('uses the default "%" suffix and a custom suffix', () => {
    expect(html(createElement(TrendChip, { delta: 3 }))).toContain('3%')
    expect(html(createElement(TrendChip, { delta: 3, suffix: 'pts' }))).toContain('3pts')
  })

  it('renders the tonal pill fill for the pill variant', () => {
    const markup = html(createElement(TrendChip, { delta: 4, variant: 'pill' }))
    expect(markup).toContain('bgTone-success')
    expect(markup).toContain('textOnTone')
    expect(markup).toContain('border-radius:999px')
    expect(markup).not.toContain('background:')
    expect(markup).not.toContain('color:')
  })

  it('honours a custom ariaLabel and forwards className', () => {
    const markup = html(
      createElement(TrendChip, { delta: 1, ariaLabel: 'Up one percent', className: 'tc-cls' }),
    )
    expect(markup).toContain('aria-label="Up one percent"')
    expect(markup).toContain('tc-cls')
  })
})
