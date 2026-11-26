// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AnnouncementBar` — a port of
 * `@molecule/app-announcement-bar-react/src/__tests__/announcement-bar.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `textSize`), so tests can assert which cm.* class was applied without a real
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { AnnouncementBar } from '../AnnouncementBar.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders an `AnnouncementBar` and returns the element it mounted into. */
const mount = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AnnouncementBar, props, slots) }))
  app.mount(host)
  return host
}

/** Renders an `AnnouncementBar` and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => mount(props, slots).innerHTML

describe('AnnouncementBar', () => {
  it('renders the message with role="status" and the kind data attribute', () => {
    const markup = render({ kind: 'promo' }, { default: () => ['New feature!'] })
    expect(markup).toContain('role="status"')
    expect(markup).toContain('data-kind="promo"')
    expect(markup).toContain('New feature!')
  })

  it('defaults the kind to "info"', () => {
    const markup = render({}, { default: () => ['X'] })
    expect(markup).toContain('data-kind="info"')
  })

  it('renders the icon slot', () => {
    const markup = render(
      {},
      { default: () => ['X'], icon: () => [h('span', { 'data-icon': '' })] },
    )
    expect(markup).toContain('data-icon=""')
  })

  it('renders an action as a link when href is given, a button otherwise', () => {
    const asLink = render(
      { action: { label: 'Learn more', href: '/more' } },
      { default: () => ['X'] },
    )
    expect(asLink).toContain('href="/more"')
    expect(asLink).toContain('Learn more')
    const asButton = render(
      { action: { label: 'Do it', onClick: () => {} } },
      { default: () => ['X'] },
    )
    expect(asButton).toContain('Do it')
    expect(asButton).not.toContain('href=')
  })

  it('renders the dismiss button by default and hides it when dismissible is false', () => {
    const withDismiss = render({}, { default: () => ['X'] })
    expect(withDismiss).toContain('aria-label="Dismiss"')
    const without = render({ dismissible: false }, { default: () => ['X'] })
    expect(without).not.toContain('aria-label="Dismiss"')
  })

  it('renders nothing when controlled visible is false', () => {
    const host = mount({ visible: false }, { default: () => ['X'] })
    expect(host.innerHTML).not.toContain('role="status"')
    expect(host.textContent).toBe('')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({ dataMolId: 'ann-x', className: 'ab-cls' }, { default: () => ['X'] })
    expect(markup).toContain('data-mol-id="ann-x"')
    expect(markup).toContain('ab-cls')
  })
})
