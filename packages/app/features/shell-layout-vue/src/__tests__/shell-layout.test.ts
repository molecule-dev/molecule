// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AppShellLayout` — a port of
 * `@molecule/app-shell-layout-react/src/__tests__/shell-layout.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
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

// The Container marker the React tests mock `@molecule/app-ui-react` with:
// a `data-container` element carrying the maxWidth it received.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Container: defineComponent({
      name: 'Container',
      props: { maxWidth: { type: String, default: 'lg' } },
      setup(props, { slots }) {
        return () =>
          h('div', { 'data-container': '', 'data-max-width': props.maxWidth }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { AppShellLayout } from '../AppShellLayout.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders an {@link AppShellLayout} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AppShellLayout, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('AppShellLayout', () => {
  it('renders the children inside a Container', () => {
    const markup = render({}, { default: () => [h('div', { 'data-content': '' })] })
    expect(markup).toContain('data-container=""')
    expect(markup).toContain('data-content=""')
  })

  it('renders the header and footer slots when present', () => {
    const markup = render(
      {
        header: h('header', { 'data-header': '' }, 'Acme'),
        footer: h('footer', { 'data-footer': '' }, '© Acme'),
      },
      { default: () => ['x'] },
    )
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
  })

  it('renders the header and footer when passed as same-named slots', () => {
    const markup = render(
      {},
      {
        default: () => ['x'],
        header: () => [h('header', { 'data-header': '' })],
        footer: () => [h('footer', { 'data-footer': '' })],
      },
    )
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
  })

  it('omits header/footer when not supplied', () => {
    const markup = render({}, { default: () => ['x'] })
    expect(markup).not.toContain('data-header')
    expect(markup).not.toContain('data-footer')
  })

  it('passes the default maxWidth to the Container and honours an override', () => {
    expect(render({}, { default: () => ['x'] })).toContain('data-max-width="xl"')
    expect(render({ maxWidth: '2xl' }, { default: () => ['x'] })).toContain('data-max-width="2xl"')
  })

  it('leaves <main> with no class attribute when mainClassName is omitted', () => {
    const markup = render({}, { default: () => ['x'] })
    expect(markup).toContain('<main>')
  })

  it('forwards mainClassName onto the inner <main> element', () => {
    const markup = render({ mainClassName: 'main-pad-y' }, { default: () => ['x'] })
    expect(markup).toContain('<main class="main-pad-y">')
  })

  it('applies the page frame tokens to the outer wrapper', () => {
    const markup = render({}, { default: () => ['x'] })
    expect(markup).toContain('class="page appLayout"')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({ dataMolId: 'shell-x', className: 'sl-cls' }, { default: () => ['x'] })
    expect(markup).toContain('data-mol-id="shell-x"')
    expect(markup).toContain('sl-cls')
  })
})
