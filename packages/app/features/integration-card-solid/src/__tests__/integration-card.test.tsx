// @vitest-environment jsdom
/**
 * Unit tests for the Solid `IntegrationCard` — a port of
 * `@molecule/app-integration-card-react/src/__tests__/integration-card.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      i18nState.dict[key] ?? opts?.defaultValue ?? key,
  }),
}))

/** React-style inline styles as Solid's `style` prop takes them (kebab keys, px numbers). */
const solidStyle = (style?: Record<string, string | number>): Record<string, string> | undefined =>
  style
    ? Object.fromEntries(
        Object.entries(style).map(([key, value]) => [
          key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`),
          typeof value === 'number' ? `${value}px` : value,
        ]),
      )
    : undefined

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    disabled?: boolean
    onClick?: (event?: MouseEvent) => void
  }) => (
    <button data-button="" disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  ),
  Card: (props: {
    children?: JSX.Element
    className?: string
    style?: Record<string, string | number>
    'data-mol-id'?: string
  }) => (
    <div
      data-card=""
      class={props.className}
      style={solidStyle(props.style)}
      data-mol-id={props['data-mol-id']}
    >
      {props.children}
    </div>
  ),
}))

const { IntegrationCard } = await import('../IntegrationCard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  i18nState.dict = {}
})

/**
 * Renders a view with Solid's browser renderer and returns the wrapper element.
 *
 * @param view - The view to render.
 * @returns The wrapper element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('IntegrationCard', () => {
  it('renders the title inside an <h3>', () => {
    const container = mount(() => <IntegrationCard title="Slack" />)
    expect(container.innerHTML).toContain('<h3')
    expect(container.innerHTML).toContain('Slack')
  })

  it('renders the description and icon when present', () => {
    const container = mount(() => (
      <IntegrationCard
        title="Slack"
        description="Send notifications to Slack"
        icon={<span data-icon="" />}
      />
    ))
    expect(container.innerHTML).toContain('Send notifications to Slack')
    expect(container.innerHTML).toContain('data-icon=""')
  })

  it('renders the English defaultValue status label for each status', () => {
    expect(mount(() => <IntegrationCard title="S" status="connected" />).innerHTML).toContain(
      'Connected',
    )
    expect(mount(() => <IntegrationCard title="S" status="pending" />).innerHTML).toContain(
      'Connecting',
    )
    expect(mount(() => <IntegrationCard title="S" status="error" />).innerHTML).toContain('Error')
    // `disconnected` is the default status.
    expect(mount(() => <IntegrationCard title="S" status="disconnected" />).innerHTML).toContain(
      'Not connected',
    )
    expect(mount(() => <IntegrationCard title="S" />).innerHTML).toContain('Not connected')
  })

  it('routes every status label through t() — a locale override replaces the English default', () => {
    // If the labels were hardcoded English, none of these overrides could win.
    i18nState.dict = {
      'integrationCard.status.connected': 'Conectado',
      'integrationCard.status.pending': 'Conectando…',
      'integrationCard.status.error': 'Erro',
      'integrationCard.status.disconnected': 'Desconectado',
    }
    const connected = mount(() => <IntegrationCard title="S" status="connected" />).innerHTML
    expect(connected).toContain('Conectado')
    expect(connected).not.toContain('Connected')

    expect(mount(() => <IntegrationCard title="S" status="pending" />).innerHTML).toContain(
      'Conectando…',
    )
    expect(mount(() => <IntegrationCard title="S" status="error" />).innerHTML).toContain('Erro')

    const disconnected = mount(() => <IntegrationCard title="S" status="disconnected" />).innerHTML
    expect(disconnected).toContain('Desconectado')
    expect(disconnected).not.toContain('Not connected')
  })

  it('renders the action as a button (onClick) or anchor (href)', () => {
    const onClick = mount(() => (
      <IntegrationCard title="S" action={{ label: 'Connect', onClick: () => {} }} />
    )).innerHTML
    expect(onClick).toContain('data-button=""')
    expect(onClick).toContain('Connect')
    const href = mount(() => (
      <IntegrationCard title="S" action={{ label: 'Connect', href: '/oauth' }} />
    )).innerHTML
    expect(href).toContain('href="/oauth"')
  })

  it('shows the loading glyph when the action is loading', () => {
    const container = mount(() => (
      <IntegrationCard title="S" action={{ label: 'Connect', onClick: () => {}, loading: true }} />
    ))
    expect(container.innerHTML).toContain('…')
  })

  it('applies a gradient background for the cta variant', () => {
    const container = mount(() => <IntegrationCard title="S" variant="cta" />)
    expect(container.innerHTML).toContain('linear-gradient')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const container = mount(() => (
      <IntegrationCard title="S" dataMolId="int-x" className="ic-cls" />
    ))
    expect(container.innerHTML).toContain('data-mol-id="int-x"')
    expect(container.innerHTML).toContain('ic-cls')
  })
})
