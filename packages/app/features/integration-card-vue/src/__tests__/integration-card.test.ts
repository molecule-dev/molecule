// @vitest-environment jsdom
/**
 * Unit tests for the Vue `IntegrationCard` — a port of
 * `@molecule/app-integration-card-react/src/__tests__/integration-card.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Mutable translation dictionary so a test can simulate a locale override and
// prove the status labels resolve through `t()` (a hardcoded string couldn't
// change). Hoisted so the `vi.mock` factory below can reference it.
const { i18nState } = vi.hoisted(() => ({ i18nState: { dict: {} as Record<string, string> } }))

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `shrink0`), so tests can assert which cm.* class was applied without a real
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

// `t(key, values, opts)` returns the dictionary translation when present,
// otherwise echoes the inline `defaultValue` — the canonical English fallback.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      i18nState.dict[key] ?? opts?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: { disabled: Boolean, onClick: Function },
      setup(props, { slots }) {
        return () =>
          h(
            'button',
            { 'data-button': '', disabled: props.disabled, onClick: props.onClick },
            slots.default?.(),
          )
      },
    }),
    Card: defineComponent({
      name: 'Card',
      inheritAttrs: false,
      props: { className: String, style: Object },
      setup(props, { attrs, slots }) {
        return () =>
          h(
            'div',
            {
              'data-card': '',
              'data-mol-id': attrs['data-mol-id'],
              class: props.className,
              style: props.style,
            },
            slots.default?.(),
          )
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import { IntegrationCard } from '../IntegrationCard.js'

afterEach(() => {
  document.body.innerHTML = ''
  i18nState.dict = {}
})

/**
 * Mounts an {@link IntegrationCard} with the given props and returns the
 * markup it produced.
 *
 * @param props - The card's props.
 * @returns The markup.
 */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(IntegrationCard, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('IntegrationCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = render({ title: 'Slack' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Slack')
  })

  it('renders the description and icon when present', () => {
    const markup = render({
      title: 'Slack',
      description: 'Send notifications to Slack',
      icon: h('span', { 'data-icon': '' }),
    })
    expect(markup).toContain('Send notifications to Slack')
    expect(markup).toContain('data-icon=""')
  })

  it('renders the English defaultValue status label for each status', () => {
    expect(render({ title: 'S', status: 'connected' })).toContain('Connected')
    expect(render({ title: 'S', status: 'pending' })).toContain('Connecting')
    expect(render({ title: 'S', status: 'error' })).toContain('Error')
    // `disconnected` is the default status.
    expect(render({ title: 'S', status: 'disconnected' })).toContain('Not connected')
    expect(render({ title: 'S' })).toContain('Not connected')
  })

  it('routes every status label through t() — a locale override replaces the English default', () => {
    // If the labels were hardcoded English, none of these overrides could win.
    i18nState.dict = {
      'integrationCard.status.connected': 'Conectado',
      'integrationCard.status.pending': 'Conectando…',
      'integrationCard.status.error': 'Erro',
      'integrationCard.status.disconnected': 'Desconectado',
    }
    const connected = render({ title: 'S', status: 'connected' })
    expect(connected).toContain('Conectado')
    expect(connected).not.toContain('Connected')

    expect(render({ title: 'S', status: 'pending' })).toContain('Conectando…')
    expect(render({ title: 'S', status: 'error' })).toContain('Erro')

    const disconnected = render({ title: 'S', status: 'disconnected' })
    expect(disconnected).toContain('Desconectado')
    expect(disconnected).not.toContain('Not connected')
  })

  it('renders the action as a button (onClick) or anchor (href)', () => {
    const onClick = render({
      title: 'S',
      action: { label: 'Connect', onClick: () => {} },
    })
    expect(onClick).toContain('data-button=""')
    expect(onClick).toContain('Connect')
    const href = render({ title: 'S', action: { label: 'Connect', href: '/oauth' } })
    expect(href).toContain('href="/oauth"')
  })

  it('shows the loading glyph when the action is loading', () => {
    const markup = render({
      title: 'S',
      action: { label: 'Connect', onClick: () => {}, loading: true },
    })
    expect(markup).toContain('…')
  })

  it('applies a gradient background for the cta variant', () => {
    const markup = render({ title: 'S', variant: 'cta' })
    expect(markup).toContain('linear-gradient')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = render({ title: 'S', dataMolId: 'int-x', className: 'ic-cls' })
    expect(markup).toContain('data-mol-id="int-x"')
    expect(markup).toContain('ic-cls')
  })
})
