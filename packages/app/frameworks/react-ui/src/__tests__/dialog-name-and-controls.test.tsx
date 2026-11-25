// @vitest-environment jsdom
/**
 * Accessible-name wiring for the framework dialogs and the Tabs
 * `aria-controls` contract (axe `aria-dialog-name` / `aria-valid-attr-value`):
 *
 * - ConfirmDialog and PromptDialog label their dialog element with the
 *   rendered title (and PromptDialog its rendered description) instead of
 *   leaving `<div role="dialog">` unnamed;
 * - SidebarUserCard's settings drawer (a title-less Modal) is named with the
 *   localized `sidebarUserCard.drawer` label;
 * - a Tabs tab only carries `aria-controls` when its panel is actually
 *   rendered (the active tab, when its item has content), and the value
 *   resolves to that panel's id.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '../components/ConfirmDialog.js'
import { PromptDialog } from '../components/PromptDialog.js'
import { SidebarUserCard } from '../components/SidebarUserCard.js'
import { Tabs } from '../components/Tabs.js'

// A mutable location the mocked `useLocation` returns — SidebarUserCard
// closes its drawer on route change.
const mockLocation = { pathname: '/', search: '' }

// PromptDialog renders the kit's Input, which also reads `fieldLayout` from this module, so the
// actual module stays and only the ClassMap is replaced.
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
        // Every other token is a callable that returns its own name —
        // components use both `cm.foo` and `cm.foo({...})` forms.
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The drawer label test reads a TRANSLATED value, so the stub resolves keys
// through a small table before falling back to the defaultValue.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLocation: () => ({ ...mockLocation }),
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      ({ 'sidebarUserCard.drawer': 'Konto' })[key] ?? opts?.defaultValue ?? key,
  }),
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'u1', name: 'Ada', email: 'ada@example.com' },
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

afterEach(() => {
  cleanup()
  mockLocation.pathname = '/'
  mockLocation.search = ''
})

describe('dialog and drawer accessible names', () => {
  it("ConfirmDialog's dialog aria-labelledby resolves to the title text", () => {
    render(
      createElement(
        ConfirmDialog,
        {
          open: true,
          onClose: () => {},
          onConfirm: () => {},
          title: 'Delete vault?',
          description: 'This action cannot be undone.',
        },
        null,
      ),
    )
    const dialog = screen.getByRole('dialog')
    const labelledby = dialog.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    // Modal portals to document.body, so the title is found there.
    const title = document.getElementById(labelledby!)
    expect(title?.tagName.toLowerCase()).toBe('h2')
    expect(title?.textContent).toBe('Delete vault?')
  })

  it("ConfirmDialog's dialog aria-describedby resolves to the description text", () => {
    render(
      createElement(ConfirmDialog, {
        open: true,
        onClose: () => {},
        onConfirm: () => {},
        title: 'Delete vault?',
        description: 'This action cannot be undone.',
      }),
    )
    const dialog = screen.getByRole('dialog')
    const describedby = dialog.getAttribute('aria-describedby')
    expect(describedby).toBeTruthy()
    const description = document.getElementById(describedby!)
    expect(description?.tagName.toLowerCase()).toBe('p')
    expect(description?.textContent).toBe('This action cannot be undone.')
  })

  it('ConfirmDialog carries no aria-describedby without a description', () => {
    render(
      createElement(ConfirmDialog, {
        open: true,
        onClose: () => {},
        onConfirm: () => {},
        title: 'Delete vault?',
        description: undefined,
      }),
    )
    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBeNull()
  })

  it("PromptDialog's dialog aria-labelledby resolves to the title text", () => {
    render(
      createElement(PromptDialog, {
        open: true,
        onClose: () => {},
        onSubmit: () => {},
        title: 'Rename board',
      }),
    )
    const dialog = screen.getByRole('dialog')
    const labelledby = dialog.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const title = document.getElementById(labelledby!)
    expect(title?.tagName.toLowerCase()).toBe('h2')
    expect(title?.textContent).toBe('Rename board')
  })

  it("PromptDialog's dialog aria-describedby resolves to the rendered description", () => {
    render(
      createElement(PromptDialog, {
        open: true,
        onClose: () => {},
        onSubmit: () => {},
        title: 'Rename board',
        description: 'The slug updates automatically.',
      }),
    )
    const dialog = screen.getByRole('dialog')
    const describedby = dialog.getAttribute('aria-describedby')
    expect(describedby).toBeTruthy()
    const description = document.getElementById(describedby!)
    expect(description?.tagName.toLowerCase()).toBe('p')
    expect(description?.textContent).toBe('The slug updates automatically.')
  })

  it('ConfirmDialog points its dialog at no heading when the title renders nothing', () => {
    render(
      createElement(ConfirmDialog, {
        open: true,
        onClose: () => {},
        onConfirm: () => {},
        title: [false, null],
        description: 'This action cannot be undone.',
      }),
    )
    expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBeNull()
    expect(document.querySelector('h2')).not.toBeNull()
    expect(document.querySelector('h2')!.id).toBe('')
  })

  it('PromptDialog points its dialog at no heading when the title renders nothing', () => {
    render(
      createElement(PromptDialog, {
        open: true,
        onClose: () => {},
        onSubmit: () => {},
        title: [false, null],
      }),
    )
    expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBeNull()
    expect(document.querySelector('h2')).not.toBeNull()
    expect(document.querySelector('h2')!.id).toBe('')
  })

  it('PromptDialog carries no aria-describedby without a description', () => {
    render(
      createElement(PromptDialog, {
        open: true,
        onClose: () => {},
        onSubmit: () => {},
        title: 'Rename board',
      }),
    )
    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBeNull()
  })

  it('the SidebarUserCard drawer has the translated label', () => {
    render(
      createElement(SidebarUserCard, {
        children: createElement('div', null, 'panel'),
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }))
    const drawer = screen.getByRole('dialog')
    expect(drawer.getAttribute('aria-label')).toBe('Konto')
  })
})

describe('Tabs aria-controls', () => {
  const ITEMS = [
    { value: 'account', label: 'Account', content: 'Account settings' },
    { value: 'profile', label: 'Profile', content: 'Profile settings' },
  ]

  it('the active tab with content has an aria-controls that resolves to the rendered panel', () => {
    render(createElement(Tabs, { items: ITEMS }))
    const active = screen.getByRole('tab', { name: 'Account' })
    const controls = active.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    const panel = document.getElementById(controls!)
    expect(panel?.getAttribute('role')).toBe('tabpanel')
    expect(panel?.textContent).toBe('Account settings')
  })

  it('a tab whose panel is not rendered has no aria-controls', () => {
    render(createElement(Tabs, { items: ITEMS }))
    // Profile has content, but only the active tab's panel is rendered.
    expect(screen.getByRole('tab', { name: 'Profile' }).getAttribute('aria-controls')).toBeNull()
  })

  it('an active tab without content has no aria-controls', () => {
    render(
      createElement(Tabs, {
        items: [
          { value: 'a', label: 'A', content: 'A body' },
          { value: 'b', label: 'B' },
        ],
        value: 'b',
      }),
    )
    expect(screen.getByRole('tab', { name: 'B' }).getAttribute('aria-controls')).toBeNull()
    expect(document.querySelector('[role="tabpanel"]')).toBeNull()
  })

  it('no tab carries aria-controls when no item has content', () => {
    render(
      createElement(Tabs, {
        items: ITEMS.map(({ value, label }) => ({ value, label })),
      }),
    )
    for (const tab of screen.getAllByRole('tab'))
      expect(tab.getAttribute('aria-controls')).toBeNull()
  })
})
