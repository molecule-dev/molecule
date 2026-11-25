import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'svelte/server'
import { expect, it } from 'vitest'

import Host from './OverlaySsrHost.svelte'

// Svelte's SSR markers are hydration anchors interleaved with the consumer's markup.
const markup = (part: 'modal' | 'confirm' | 'shell'): string =>
  render(Host, { props: { part } }).body.replace(/<!--.*?-->/g, '')

it('renders open Modal and ConfirmDialog inline on a Node server', () => {
  expect(typeof document).toBe('undefined')
  const modal = markup('modal')
  const confirm = markup('confirm')

  expect(modal).toMatch(/^<main>.*role="presentation"><div[^>]*role="dialog"/)
  expect(modal).toContain('>A server dialog</h2>')
  expect(modal).toMatch(/>\s*Dialog body\s*<\/div>/)
  expect(modal).toContain('align-items:flex-start')
  expect(modal).toContain('padding-top:8px;opacity:0.5')
  expect(confirm).toMatch(/^<main>.*role="presentation"><div[^>]*role="dialog"/)
  expect(confirm).toContain('>Cannot be undone.</p>')
  expect(confirm).toMatch(/aria-labelledby="([^"]+)".*<h2[^>]+id="\1"[^>]*>Delete\?/)
  expect(confirm).toMatch(/aria-describedby="([^"]+)".*<p[^>]+id="\1"[^>]*>Cannot be undone\./)
  expect(confirm.replace(/<!--.*?-->/g, '')).toMatch(/>\s*Confirm\s*<\/button>/)
})

it('renders the mobile shell and omits hosted drawer content in Node', () => {
  const shell = markup('shell')

  expect(shell).toMatch(/<header[^>]*>.*Mobile shell.*<\/header>/)
  expect(shell).toMatch(/<main[^>]*>Page content<\/main>/)
  expect(shell).not.toContain('Drawer content')
  expect(shell).not.toContain('role="dialog"')
})
