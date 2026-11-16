// @vitest-environment jsdom
/**
 * Unit tests for the Solid `BulkActionToolbar` — a port of
 * `@molecule/app-bulk-action-toolbar-react/src/__tests__/bulk-action-toolbar.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * React's suite stubs the wired classmap, `useTranslation` and the UI
 * `Button`; this port stubs the classmap and bonds the real simple i18n
 * provider (empty dictionaries, whose `t` returns the `defaultValue` with
 * `{{count}}` interpolated — the same behavior React's stub encoded), and
 * renders the real Solid `Button` over the stubbed map.
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import type { BulkActionToolbarProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `link`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use, extended so `cm.button(…)`
// echoes its variant/color/size arguments.
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
        if (prop === 'button') {
          return (args: Record<string, unknown>) =>
            `btn-${args.variant}-${args.color}-${args.size}${args.fullWidth ? '-full' : ''}`
        }
        const token = String(prop)
        return (...args: unknown[]) => {
          const arg = args.filter((a) => a != null && a !== '').join('-')
          return arg.length > 0 ? `${token}-${arg}` : token
        }
      },
    }
    return new Proxy({}, handler)
  },
}))

// The bonded provider `useTranslation()` falls back to (React's
// `useTranslation` contract): empty dictionaries, so every `t` returns its
// English defaultValue.
setI18nProvider(
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ]),
)

const { BulkActionToolbar } = await import('../BulkActionToolbar.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a {@link BulkActionToolbar} and returns the markup it produced. */
const renderToolbar = (props: BulkActionToolbarProps): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <BulkActionToolbar {...props} />, container))
  const markup = container.innerHTML
  return markup
}

const actions = [
  { id: 'archive', label: 'Archive', onClick: () => {} },
  { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
]

describe('BulkActionToolbar', () => {
  it('renders nothing when the selection count is 0', () => {
    const markup = renderToolbar({ count: 0, actions })
    expect(markup).not.toContain('role="region"')
    expect(markup).not.toContain('Archive')
  })

  it('renders the selection count when count > 0', () => {
    const markup = renderToolbar({ count: 3, actions })
    expect(markup).toContain('3 selected')
  })

  it('renders a button per action', () => {
    const markup = renderToolbar({ count: 1, actions })
    expect(markup).toContain('Archive')
    expect(markup).toContain('Delete')
  })

  it('colors destructive actions with the error variant', () => {
    const markup = renderToolbar({ count: 1, actions })
    expect(markup).toContain('btn-solid-error-sm')
    expect(markup).toContain('btn-ghost-primary-sm')
  })

  it('disables an action flagged disabled', () => {
    const markup = renderToolbar({
      count: 1,
      actions: [{ id: 'x', label: 'X', onClick: () => {}, disabled: true }],
    })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the clear button only when onClearSelection is supplied', () => {
    const withClear = renderToolbar({ count: 1, actions, onClearSelection: () => {} })
    expect(withClear).toContain('Clear')
    const without = renderToolbar({ count: 1, actions })
    expect(without).not.toContain('Clear')
  })

  it('exposes a labelled region role and forwards className', () => {
    const markup = renderToolbar({ count: 1, actions, className: 'bat-cls' })
    expect(markup).toContain('role="region"')
    expect(markup).toContain('aria-label="Bulk actions"')
    expect(markup).toContain('bat-cls')
  })
})
