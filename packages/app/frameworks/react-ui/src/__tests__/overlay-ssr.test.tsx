import { type ReactElement, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

import type { ElementHandle } from '@molecule/app-ui'
import { OverlayPortal, useOverlayLayer } from '@molecule/app-ui-react/platform'

import { ConfirmDialog } from '../components/ConfirmDialog.js'
import { Modal } from '../components/Modal.js'
import { ResponsiveAppShell } from '../components/ResponsiveAppShell.js'

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLocation: () => ({ pathname: '/', search: '', hash: '', key: 'home' }),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const resolvers = new Set([
      'button',
      'flex',
      'fontWeight',
      'h',
      'minH',
      'modal',
      'position',
      'sp',
      'stack',
      'textSize',
    ])
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'cn') return (...classes: unknown[]) => classes.filter(Boolean).join(' ')
          const token = String(prop)
          return resolvers.has(token) ? () => token : token
        },
      },
    )
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

it('renders open Modal and ConfirmDialog inline on a Node server', () => {
  expect(typeof document).toBe('undefined')
  const close = vi.fn()
  const modal = renderToString(
    <main>
      <Modal open title="A server dialog" onClose={close}>
        Dialog body
      </Modal>
    </main>,
  )
  const confirm = renderToString(
    <main>
      <ConfirmDialog
        open
        title="Delete?"
        description="Cannot be undone."
        onClose={close}
        onConfirm={close}
      />
    </main>,
  )

  expect(modal).toMatch(/^<main><div.*role="presentation"><div role="dialog"/)
  expect(modal).toContain('>A server dialog</h2>')
  expect(modal).toContain('>Dialog body</div>')
  expect(confirm).toMatch(/^<main><div.*role="presentation"><div role="dialog"/)
  expect(confirm).toContain('>Cannot be undone.</p>')
  expect(confirm).toContain('>Confirm</button>')
})

it('renders the mobile shell and omits hosted drawer content in Node', () => {
  function OpenDrawerPortal(): ReactElement {
    const surface = useRef<ElementHandle>(null)
    const layer = useOverlayLayer({ open: true, kind: 'modal', surface })
    return (
      <OverlayPortal layer={layer} presentation="host" server="omit">
        Drawer portal
      </OverlayPortal>
    )
  }
  const markup = renderToString(
    <ResponsiveAppShell>
      <ResponsiveAppShell.TopBar brand="Mobile shell" />
      <ResponsiveAppShell.Drawer>Drawer content</ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>Page content</ResponsiveAppShell.Content>
      <OpenDrawerPortal />
    </ResponsiveAppShell>,
  )

  expect(markup).toMatch(/<header[^>]*>.*Mobile shell.*<\/header>/)
  expect(markup).toMatch(/<main[^>]*>Page content<\/main>/)
  expect(markup).not.toContain('Drawer content')
  expect(markup).not.toContain('Drawer portal')
})
