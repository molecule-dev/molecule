import '@molecule/app-framework-conformance/ui/setup'
import { renderToString } from 'solid-js/web'
import { expect, it, vi } from 'vitest'

import type * as Binding from '@molecule/app-solid'
import { BodyPortal } from '@molecule/app-solid'

import { ConfirmDialog } from '../components/ConfirmDialog.jsx'
import { Modal } from '../components/Modal.jsx'
import { ResponsiveAppShell } from '../components/ResponsiveAppShell.jsx'

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<typeof Binding>()),
  useLocation: () => () => ({ pathname: '/', search: '', hash: '', key: 'home' }),
}))

it('renders open Modal and ConfirmDialog inline on a Node server', () => {
  expect(typeof document).toBe('undefined')
  const close = vi.fn()
  const modal = renderToString(() => (
    <main>
      <Modal open title="A server dialog" onClose={close}>
        Dialog body
      </Modal>
    </main>
  ))
  const confirm = renderToString(() => (
    <main>
      <ConfirmDialog
        open
        title="Delete?"
        description="Cannot be undone."
        onClose={close}
        onConfirm={close}
      />
    </main>
  ))

  expect(modal).toMatch(/^<main[^>]*>.*role="presentation"><div[^>]*role="dialog"/)
  expect(modal).toContain('>A server dialog</h2>')
  expect(modal).toContain('>Dialog body</div>')
  expect(confirm).toMatch(/^<main[^>]*>.*role="presentation"><div[^>]*role="dialog"/)
  expect(confirm).toContain('>Cannot be undone.</p>')
  expect(confirm).toMatch(/aria-labelledby="([^"]+)".*<h2[^>]+id="\1"[^>]*>Delete\?/)
  expect(confirm).toMatch(/aria-describedby="([^"]+)".*<p[^>]+id="\1"[^>]*>Cannot be undone\./)
  expect(confirm.replace(/<!--.*?-->/g, '')).toMatch(/>\s*Confirm\s*<\/button>/)
})

it('renders the mobile shell and omits hosted drawer content in Node', () => {
  const markup = renderToString(() => (
    <ResponsiveAppShell>
      <ResponsiveAppShell.TopBar brand="Mobile shell" />
      <ResponsiveAppShell.Drawer>Drawer content</ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>Page content</ResponsiveAppShell.Content>
      <BodyPortal>Drawer portal</BodyPortal>
    </ResponsiveAppShell>
  ))

  expect(markup).toMatch(/<header[^>]*>.*Mobile shell.*<\/header>/)
  expect(markup).toMatch(/<main[^>]*>Page content<\/main>/)
  expect(markup).not.toContain('Drawer content')
  expect(markup).not.toContain('Drawer portal')
  expect(markup).not.toContain('role="dialog"')
})
