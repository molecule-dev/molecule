// @vitest-environment jsdom
/**
 * Unit tests for the Vue `CardGrid` and `BentoGrid` — a port of
 * `@molecule/app-card-grid-react/src/__tests__/card-grid.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.grid({...})`). `cn(...)` joins tokens, calling
// any function-valued args first.
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { inlineStyleMismatch } from '@molecule/app-framework-conformance/ui'

import { BentoGrid } from '../BentoGrid.js'
import { CardGrid } from '../CardGrid.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Mounts a component and returns the markup it produced. */
const render = (
  component: unknown,
  props: Record<string, unknown> = {},
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

describe('CardGrid', () => {
  it('renders its children', () => {
    const markup = render(CardGrid, {}, { default: () => [h('div', { 'data-card': '' })] })
    expect(markup).toContain('data-card=""')
  })

  it('forwards className', () => {
    const markup = render(CardGrid, { className: 'grid-cls' }, { default: () => ['x'] })
    expect(markup).toContain('grid-cls')
  })
})

describe('BentoGrid', () => {
  const items = [
    { id: 'a', content: h('div', { 'data-a': '' }) },
    { id: 'b', content: h('div', { 'data-b': '' }) },
  ]

  it('renders each item content', () => {
    const markup = render(BentoGrid, { items })
    expect(markup).toContain('data-a=""')
    expect(markup).toContain('data-b=""')
  })

  it('uses column-span styles in the default (non-areas) mode', () => {
    const markup = render(BentoGrid, { items: [{ id: 'a', content: 'x', colSpan: 6, rowSpan: 2 }] })
    expect(inlineStyleMismatch(markup, { gridColumn: 'span 6', gridRow: 'span 2' })).toBeNull()
  })

  it('defaults col-span to 4 and row-span to 1 when unspecified', () => {
    const markup = render(BentoGrid, { items: [{ id: 'a', content: 'x' }] })
    expect(inlineStyleMismatch(markup, { gridColumn: 'span 4', gridRow: 'span 1' })).toBeNull()
  })

  it('uses grid-template-areas + per-item grid-area in areas mode', () => {
    const markup = render(BentoGrid, {
      areas: "'a a b'",
      items: [{ id: 'a', content: 'x', area: 'a' }],
    })
    expect(markup).toContain('grid-template-areas')
    expect(inlineStyleMismatch(markup, { gridArea: 'a' })).toBeNull()
    expect(inlineStyleMismatch(markup, { gridColumn: 'span 4' })).not.toBeNull()
  })

  it('forwards className', () => {
    const markup = render(BentoGrid, { items, className: 'bento-cls' })
    expect(markup).toContain('bento-cls')
  })
})
