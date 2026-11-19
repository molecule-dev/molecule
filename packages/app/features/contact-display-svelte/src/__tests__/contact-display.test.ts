// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ContactDisplay` — a port of
 * `@molecule/app-contact-display-react/src/__tests__/contact-display.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import {
  type ComponentProps,
  createRawSnippet,
  flushSync,
  mount,
  type Snippet,
  unmount,
} from 'svelte'
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

vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Avatar } = await import('./stubs/AvatarStub.svelte')
  return { Avatar }
})

import ContactDisplay from '../ContactDisplay.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of instances.splice(0)) unmount(instance)
  document.body.innerHTML = ''
})

/** Renders a {@link ContactDisplay} and returns its target element. */
const mountInto = (props: ComponentProps<typeof ContactDisplay>): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(ContactDisplay, { target, props }))
  flushSync()
  return target
}

/** Renders a {@link ContactDisplay} and returns the markup it produced. */
const html = (props: ComponentProps<typeof ContactDisplay>): string => mountInto(props).innerHTML

/** The row's transparent open button. */
const openButton = (target: HTMLElement): HTMLButtonElement =>
  target.querySelector('[data-mol-id="contact-display-open"]')!

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
    expect(clickable).toContain('position')
    const plain = html({ contact })
    expect(plain).not.toContain('position')
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
      actions: raw('<button data-actions=""></button>'),
      className: 'cd-cls',
    })
    expect(markup).toContain('data-actions=""')
    expect(markup).toContain('cd-cls')
  })

  it('renders the open button only when onClick is supplied', () => {
    const clickable = html({ contact, onClick: () => {} })
    expect(clickable).toContain('<button type="button"')
    const plain = html({ contact })
    expect(plain).not.toContain('<button')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const target = mountInto({ contact, onClick })
    openButton(target).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const target = mountInto({
      contact,
      onClick,
      actions: raw('<button data-actions=""></button>'),
    })
    target
      .querySelector('[data-actions]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const target = mountInto({ contact, onClick: () => {} })
    const namedBy = openButton(target).getAttribute('aria-labelledby')!
    expect(document.getElementById(namedBy)?.textContent).toBe('Jane Doe')
  })

  it('without onClick there is no open button', () => {
    const target = mountInto({ contact })
    expect(target.querySelector('button')).toBeNull()
    expect(target.querySelector('[data-mol-id="contact-display-open"]')).toBeNull()
  })
})
