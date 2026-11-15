// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `DangerZoneSection` — a port of
 * `@molecule/app-danger-zone-react/src/__tests__/danger-zone.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins tokens, calling function-valued
// args first — the same mock the React tests use.
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

// app-ui-svelte stubs: Button forwards disabled + color, Card forwards
// data-mol-id + className — the same markers the React suite's
// `@molecule/app-ui-react` stubs render. The stub ConfirmDialog is the
// sentinel for the re-export identity test.
vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Button } = await import('./stubs/ButtonStub.svelte')
  const { default: Card } = await import('./stubs/CardStub.svelte')
  const { default: ConfirmDialog } = await import('./stubs/ConfirmDialogStub.svelte')
  return { Button, Card, ConfirmDialog }
})

import { createRawSnippet, flushSync, mount, unmount } from 'svelte'

const { ConfirmDialog, DangerZoneSection } = await import('../components.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): ReturnType<typeof createRawSnippet> =>
  createRawSnippet(() => ({ render: () => html }))

/** Renders a {@link DangerZoneSection} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(DangerZoneSection, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(component)
  target.remove()
  return markup
}

const noop = (): void => {}

describe('ConfirmDialog re-export', () => {
  it('re-exports the framework bundle component unchanged', async () => {
    const framework = (await import('@molecule/app-ui-svelte')) as Record<string, unknown>
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
    const markup = render(base)
    expect(markup).toContain('<h3')
    expect(markup).toContain('Delete account')
    expect(markup).toContain('Permanently remove this account.')
  })

  it('renders the actionLabel on the button', () => {
    const markup = render(base)
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('data-color="error"')
  })

  it('shows the loading glyph and disables the button while loading', () => {
    const markup = render({ ...base, loading: true })
    expect(markup).toContain('…')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('disables the button when disabled is set', () => {
    const markup = render({ ...base, disabled: true })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders extra children between description and the action button', () => {
    const markup = render({ ...base, children: raw('<input data-confirm=""/>') })
    expect(markup).toContain('data-confirm=""')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = render({ ...base, dataMolId: 'danger-x', className: 'dz-cls' })
    expect(markup).toContain('data-mol-id="danger-x"')
    expect(markup).toContain('dz-cls')
  })
})
