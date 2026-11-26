// @vitest-environment jsdom
/**
 * Unit tests for the Solid `DangerZoneSection` — a port of
 * `@molecule/app-danger-zone-react/src/__tests__/danger-zone.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins tokens, calling function-valued
// args first — the same mock the React tests use.
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

// app-ui-solid stubs: Button forwards disabled + color, Card forwards
// data-mol-id + className — the same markers the React suite's
// `@molecule/app-ui-react` stubs render. The stub ConfirmDialog is the
// sentinel for the re-export identity test.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: (props: { children?: JSX.Element; disabled?: boolean; color?: string }) => (
    <button data-button="" disabled={props.disabled} data-color={props.color}>
      {props.children}
    </button>
  ),
  Card: (props: { children?: JSX.Element; className?: string; 'data-mol-id'?: string }) => (
    <div data-card="" data-mol-id={props['data-mol-id']} class={props.className}>
      {props.children}
    </div>
  ),
  ConfirmDialog: () => <div data-confirm-dialog="" />,
}))

const { DangerZoneSection } = await import('../DangerZoneSection.jsx')
const { ConfirmDialog } = await import('../ConfirmDialog.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders a {@link DangerZoneSection} and returns the markup it produced. */
const html = (props: Record<string, unknown>, children?: JSX.Element): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(() => <DangerZoneSection {...props}>{children}</DangerZoneSection>, container),
  )
  const markup = container.innerHTML
  return markup
}

const noop = (): void => {}

describe('ConfirmDialog re-export', () => {
  it('re-exports the framework bundle component unchanged', async () => {
    const framework = (await import('@molecule/app-ui-solid')) as Record<string, unknown>
    expect(ConfirmDialog).toBe(framework.ConfirmDialog)
  })
})

describe('DangerZoneSection', () => {
  const base = {
    title: 'Delete account',
    description: 'Permanently remove this account.',
    actionLabel: 'Delete account',
    onAction: noop,
  }

  it('renders the title in an <h3> and the description', () => {
    const markup = html(base)
    expect(markup).toContain('<h3')
    expect(markup).toContain('Delete account')
    expect(markup).toContain('Permanently remove this account.')
  })

  it('renders the actionLabel on the button', () => {
    const markup = html(base)
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('data-color="error"')
  })

  it('shows the loading glyph and disables the button while loading', () => {
    const markup = html({ ...base, loading: true })
    expect(markup).toContain('…')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('disables the button when disabled is set', () => {
    const markup = html({ ...base, disabled: true })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders extra children between description and the action button', () => {
    const markup = html(base, <input data-confirm="" />)
    expect(markup).toContain('data-confirm=""')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = html({ ...base, dataMolId: 'danger-x', className: 'dz-cls' })
    expect(markup).toContain('data-mol-id="danger-x"')
    expect(markup).toContain('dz-cls')
  })
})
