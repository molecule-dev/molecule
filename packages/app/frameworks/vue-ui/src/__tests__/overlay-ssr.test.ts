import '@molecule/app-framework-conformance/ui/setup'
import { expect, it, vi } from 'vitest'
import { createSSRApp, h, Teleport, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'

import type * as Binding from '@molecule/app-vue'

import { ConfirmDialog } from '../components/ConfirmDialog.js'
import { Modal } from '../components/Modal.js'
import { ResponsiveAppShell } from '../components/ResponsiveAppShell.js'

vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { shallowRef } = await import('vue')
  const location = shallowRef({ pathname: '/', search: '', hash: '', key: 'home' })
  return {
    ...(await importOriginal<typeof Binding>()),
    useLocation: () => location,
  }
})

function render(render: () => VNode): Promise<string> {
  return renderToString(createSSRApp({ render }))
}

it('renders open Modal and ConfirmDialog inline on a Node server', async () => {
  expect(typeof document).toBe('undefined')
  const modal = await render(() =>
    h('main', [
      h(Modal, { open: true, title: 'A server dialog' }, { default: () => 'Dialog body' }),
    ]),
  )
  const confirm = await render(() =>
    h('main', [
      h(ConfirmDialog, { open: true, title: 'Delete?', description: 'Cannot be undone.' }),
    ]),
  )

  expect(modal).toMatch(/^<main>.*role="presentation"><div[^>]*role="dialog"/)
  expect(modal).toContain('>A server dialog</h2>')
  expect(modal).toContain('>Dialog body</div>')
  expect(confirm).toMatch(/^<main>.*role="presentation"><div[^>]*role="dialog"/)
  expect(confirm).toContain('>Cannot be undone.</p>')
  expect(confirm).toMatch(/aria-labelledby="([^"]+)".*<h2[^>]+id="\1"[^>]*>Delete\?/)
  expect(confirm).toMatch(/aria-describedby="([^"]+)".*<p[^>]+id="\1"[^>]*>Cannot be undone\./)
  expect(confirm.replace(/<!--.*?-->/g, '')).toMatch(/>\s*Confirm\s*<\/button>/)
})

it('renders the mobile shell and omits hosted drawer content in Node', async () => {
  const markup = await render(() =>
    h(ResponsiveAppShell, null, {
      default: () => [
        h(ResponsiveAppShell.TopBar, { brand: h('span', 'Mobile shell') }),
        h(ResponsiveAppShell.Drawer, null, { default: () => 'Drawer content' }),
        h(ResponsiveAppShell.Content, null, { default: () => 'Page content' }),
        h(Teleport, { to: 'body' }, ['Drawer portal']),
      ],
    }),
  )

  expect(markup).toMatch(/<header[^>]*>.*Mobile shell.*<\/header>/)
  expect(markup).toMatch(/<main[^>]*>Page content<\/main>/)
  expect(markup).not.toContain('Drawer content')
  expect(markup).not.toContain('Drawer portal')
  expect(markup).not.toContain('role="dialog"')
})
