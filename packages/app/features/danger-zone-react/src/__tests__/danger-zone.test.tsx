import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins tokens, calling function-valued
// args first.
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

// `t(key, values, opts)` echoes the supplied `defaultValue`.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// app-ui-react stubs: Button forwards disabled + color, Card forwards
// data-mol-id + className, Modal gates its children on `open`.
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    disabled,
    color,
  }: {
    children?: ReactNode
    disabled?: boolean
    color?: string
  }) => createElement('button', { 'data-button': '', disabled, 'data-color': color }, children),
  Card: ({
    children,
    className,
    ['data-mol-id']: molId,
  }: {
    children?: ReactNode
    className?: string
    'data-mol-id'?: string
  }) => createElement('div', { 'data-card': '', 'data-mol-id': molId, className }, children),
  Modal: ({ open, children }: { open: boolean; children?: ReactNode }) =>
    open ? createElement('div', { 'data-modal': '' }, children) : null,
}))

const { ConfirmDialog } = await import('../ConfirmDialog.js')
const { DangerZoneSection } = await import('../DangerZoneSection.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const noop = () => {}

describe('ConfirmDialog', () => {
  const base = {
    onClose: noop,
    onConfirm: noop,
    title: 'Delete account',
    description: 'This cannot be undone.',
  }

  it('renders nothing while open is false', () => {
    const markup = html(createElement(ConfirmDialog, { ...base, open: false }))
    expect(markup).toBe('')
  })

  it('renders the title and description once open', () => {
    const markup = html(createElement(ConfirmDialog, { ...base, open: true }))
    expect(markup).toContain('data-modal=""')
    expect(markup).toContain('Delete account')
    expect(markup).toContain('This cannot be undone.')
  })

  it('uses the default Cancel / Confirm labels', () => {
    const markup = html(createElement(ConfirmDialog, { ...base, open: true }))
    expect(markup).toContain('Cancel')
    expect(markup).toContain('Confirm')
  })

  it('honours custom confirm / cancel labels', () => {
    const markup = html(
      createElement(ConfirmDialog, {
        ...base,
        open: true,
        confirmLabel: 'Delete',
        cancelLabel: 'Keep it',
      }),
    )
    expect(markup).toContain('Delete')
    expect(markup).toContain('Keep it')
  })

  it('shows the loading glyph and disables both buttons while loading', () => {
    const markup = html(createElement(ConfirmDialog, { ...base, open: true, loading: true }))
    expect(markup).toContain('…')
    expect(markup.match(/<button[^>]*disabled/g) ?? []).toHaveLength(2)
  })

  it('colors the confirm button error when destructive and primary otherwise', () => {
    const destructive = html(createElement(ConfirmDialog, { ...base, open: true }))
    expect(destructive).toContain('data-color="error"')
    const safe = html(createElement(ConfirmDialog, { ...base, open: true, destructive: false }))
    expect(safe).toContain('data-color="primary"')
  })

  it('renders extra children between description and footer', () => {
    const markup = html(
      createElement(ConfirmDialog, {
        ...base,
        open: true,
        children: createElement('input', { 'data-extra': '' }),
      }),
    )
    expect(markup).toContain('data-extra=""')
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
    const markup = html(createElement(DangerZoneSection, base))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Delete account')
    expect(markup).toContain('Permanently remove this account.')
  })

  it('renders the actionLabel on the button', () => {
    const markup = html(createElement(DangerZoneSection, base))
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('data-color="error"')
  })

  it('shows the loading glyph and disables the button while loading', () => {
    const markup = html(createElement(DangerZoneSection, { ...base, loading: true }))
    expect(markup).toContain('…')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('disables the button when disabled is set', () => {
    const markup = html(createElement(DangerZoneSection, { ...base, disabled: true }))
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders extra children between description and the action button', () => {
    const markup = html(
      createElement(DangerZoneSection, {
        ...base,
        children: createElement('input', { 'data-confirm': '' }),
      }),
    )
    expect(markup).toContain('data-confirm=""')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = html(
      createElement(DangerZoneSection, { ...base, dataMolId: 'danger-x', className: 'dz-cls' }),
    )
    expect(markup).toContain('data-mol-id="danger-x"')
    expect(markup).toContain('dz-cls')
  })
})
