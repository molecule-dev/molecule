// @vitest-environment jsdom
/**
 * Unit tests for the Vue `EmptyState` and `CtaCard` — a port of
 * `@molecule/app-empty-state-react/src/__tests__/empty-state.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `textCenter`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

import { type Component, createApp, defineComponent, h } from 'vue'

import { CtaCard } from '../CtaCard.js'
import { EmptyState } from '../EmptyState.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a component in jsdom and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - The props to pass.
 * @returns The rendered markup.
 */
const render = (component: Component, props: Record<string, unknown> = {}): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('EmptyState', () => {
  it('renders the title inside an <h3>', () => {
    const markup = render(EmptyState, { title: 'No comments yet' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('No comments yet')
  })

  it('renders the icon badge when an icon is given and omits it otherwise', () => {
    const withIcon = render(EmptyState, {
      title: 'T',
      icon: h('i', { 'data-icon': '' }),
    })
    expect(withIcon).toContain('data-icon=""')
    const without = render(EmptyState, { title: 'T' })
    expect(without).not.toContain('data-icon')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(render(EmptyState, { title: 'T', description: 'desc-x' })).toContain('desc-x')
    expect(render(EmptyState, { title: 'T' })).not.toContain('<p')
  })

  it('renders the action node', () => {
    const markup = render(EmptyState, {
      title: 'T',
      action: h('button', { 'data-act': '' }),
    })
    expect(markup).toContain('data-act=""')
  })

  it('sets data-mol-id and forwards className + iconWrapperClassName', () => {
    const markup = render(EmptyState, {
      title: 'T',
      icon: h('i'),
      dataMolId: 'empty-x',
      className: 'es-cls',
      iconWrapperClassName: 'icon-cls',
    })
    expect(markup).toContain('data-mol-id="empty-x"')
    expect(markup).toContain('es-cls')
    expect(markup).toContain('icon-cls')
  })
})

describe('CtaCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = render(CtaCard, { title: 'Connect your bank' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Connect your bank')
  })

  it('renders the eyebrow when present and omits it otherwise', () => {
    expect(render(CtaCard, { title: 'T', eyebrow: 'NEW' })).toContain('NEW')
    expect(render(CtaCard, { title: 'T' })).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(render(CtaCard, { title: 'T', description: 'desc-x' })).toContain('desc-x')
    expect(render(CtaCard, { title: 'T' })).not.toContain('<p')
  })

  it('renders the action node when present and omits it otherwise', () => {
    const withAction = render(CtaCard, { title: 'T', action: h('button', { 'data-act': '' }) })
    expect(withAction).toContain('data-act=""')
    expect(render(CtaCard, { title: 'T' })).not.toContain('data-act')
  })

  it('renders the media slot when present and omits it otherwise', () => {
    const withMedia = render(CtaCard, { title: 'T', media: h('img', { 'data-media': '' }) })
    expect(withMedia).toContain('data-media=""')
    expect(render(CtaCard, { title: 'T' })).not.toContain('data-media')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render(CtaCard, { title: 'T', dataMolId: 'cta-x', className: 'cta-cls' })
    expect(markup).toContain('data-mol-id="cta-x"')
    expect(markup).toContain('cta-cls')
  })
})
