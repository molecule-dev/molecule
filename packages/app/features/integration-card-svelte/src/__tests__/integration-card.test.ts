// @vitest-environment jsdom
/**
 * Unit tests for `IntegrationCard`, ported from
 * `@molecule/app-integration-card-react`'s own suite: the same behavioral
 * assertions, rendered with a real Svelte mount in jsdom.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mutable translation dictionary so a test can simulate a locale override and
// prove the status labels resolve through `t()` (a hardcoded string couldn't
// change). Hoisted so the `vi.mock` factory below can reference it.
const { i18nState } = vi.hoisted(() => ({ i18nState: { dict: {} as Record<string, string> } }))

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* call was applied without a real bond — the same mock the
// React package's own tests use.
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
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      i18nState.dict[key] ?? opts?.defaultValue ?? key,
  }),
}))

// The stubs render the same `<button data-button>` / `<div data-card>` markup
// the React suite's UI mocks produce.
vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Button } = await import('./stubs/ButtonStub.svelte')
  const { default: Card } = await import('./stubs/CardStub.svelte')
  return { Button, Card }
})

import IntegrationCard from '../IntegrationCard.svelte'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  i18nState.dict = {}
})

/**
 * Mounts an {@link IntegrationCard} and returns the markup it produced.
 *
 * @param props - The component props.
 * @returns The rendered markup.
 */
const render = (props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(IntegrationCard, { target, props }))
  flushSync()
  return target.innerHTML
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
      icon: raw('<span data-icon></span>'),
    })
    expect(markup).toContain('Send notifications to Slack')
    expect(markup).toContain('data-icon')
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
