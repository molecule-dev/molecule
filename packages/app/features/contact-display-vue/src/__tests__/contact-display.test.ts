// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ContactDisplay` — a port of
 * `@molecule/app-contact-display-react/src/__tests__/contact-display.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use. `flex` encodes its direction so
// the tests can distinguish the card (column) layout from the row/compact
// (row) layouts.
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
        if (prop === 'flex') {
          return (opts?: { direction?: string }) =>
            `flex${opts?.direction ? ` flex-${opts.direction}` : ''}`
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  // The same stub the React tests install for `@molecule/app-ui-react`:
  // an `<img data-avatar data-avatar-name>`.
  return {
    Avatar: defineComponent({
      name: 'AvatarStub',
      props: {
        src: { type: String, default: undefined },
        name: { type: String, default: undefined },
      },
      setup(props) {
        return () =>
          h('img', { 'data-avatar': props.src ?? '', 'data-avatar-name': props.name ?? '' })
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

const { ContactDisplay } = await import('../ContactDisplay.js')

const apps: Array<{ unmount: () => void; host: HTMLElement }> = []

afterEach(() => {
  for (const app of apps.splice(0)) {
    app.unmount()
    app.host.remove()
  }
})

/** Mounts a {@link ContactDisplay} and returns the markup it produced. */
const html = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ContactDisplay, props) }))
  app.mount(host)
  apps.push({ unmount: () => app.unmount(), host })
  return host.innerHTML
}

const contact = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+15551234',
  role: 'CTO',
  company: 'Acme Inc.',
  address: '123 Main St',
}

describe('ContactDisplay', () => {
  it('renders the name and role', () => {
    const markup = html({ contact })
    expect(markup).toContain('Jane Doe')
    expect(markup).toContain('CTO')
  })

  it('renders the avatar carrying the contact name', () => {
    const markup = html({ contact })
    expect(markup).toContain('data-avatar-name="Jane Doe"')
  })

  it('renders email and phone as mailto/tel links in the card layout', () => {
    const markup = html({ contact })
    expect(markup).toContain('href="mailto:jane@example.com"')
    expect(markup).toContain('href="tel:+15551234"')
    expect(markup).toContain('123 Main St')
  })

  it('hides email/phone/address in the compact layout', () => {
    const markup = html({ contact, layout: 'compact' })
    expect(markup).not.toContain('mailto:')
    expect(markup).not.toContain('tel:')
    expect(markup).toContain('Jane Doe')
  })

  it('renders the company', () => {
    const markup = html({ contact })
    expect(markup).toContain('Acme Inc.')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = html({ contact, onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = html({ contact })
    expect(plain).not.toContain('cursorPointer')
  })

  it('lays the card layout out as a column and row/compact as a row', () => {
    // Regression: the outer flex direction used to be `col ? 'row' : 'row'`
    // (both branches 'row'), so the card layout never became a column.
    const card = html({ contact, layout: 'card' })
    expect(card).toContain('flex-col')
    expect(card).not.toContain('flex-row')

    const row = html({ contact, layout: 'row' })
    expect(row).toContain('flex-row')
    expect(row).not.toContain('flex-col')

    const compact = html({ contact, layout: 'compact' })
    expect(compact).toContain('flex-row')
    expect(compact).not.toContain('flex-col')
  })

  it('renders the actions slot and forwards className', () => {
    const markup = html({
      contact,
      actions: h('button', { 'data-actions': '' }),
      className: 'cd-cls',
    })
    expect(markup).toContain('data-actions=""')
    expect(markup).toContain('cd-cls')
  })
})
