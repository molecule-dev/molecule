// @vitest-environment jsdom
import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryRouter } from '@molecule/app-routing'
import type * as SolidBinding from '@molecule/app-solid'

// A mutable i18n catalog the tests can seed to simulate an app that registered
// real legal HTML. Hoisted so the `vi.mock` factory below can reference it.
const { catalog } = vi.hoisted(() => ({
  catalog: {} as Record<string, string>,
}))

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `prose`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React package's own tests use.
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

// `t()` consults the seeded catalog first, then the inline defaultValue — the
// same resolution order the real i18n provider uses (bond value → fallback).
// The About link is the binding's real `Link`, over the real router context.
vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof SolidBinding>()
  return {
    Link: actual.Link,
    RouterContext: actual.RouterContext,
    useTranslation: () => ({
      t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
        let out = key in catalog ? catalog[key] : (opts?.defaultValue ?? key)
        if (values)
          for (const [k, v] of Object.entries(values)) out = out.replaceAll(`{{${k}}}`, String(v))
        return out
      },
      locale: () => 'en',
      setLocale: () => Promise.resolve(),
      locales: () => [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Español' },
      ],
    }),
    useVersion: () => ({ state: () => ({ version: '2.0.0' }) }),
  }
})

vi.mock('@molecule/app-ui-solid', () => ({
  Icon: (props: { name?: string }) => <span data-icon={props.name} />,
  // Render children only when open, like the real Modal — so a closed modal
  // has no body and an opened one exposes exactly what the footer put inside
  // it.
  Modal: (props: { open: boolean; children?: JSX.Element }) => (
    <Show when={props.open}>
      <div data-modal="">{props.children}</div>
    </Show>
  ),
}))

const { AppFooter } = await import('../AppFooter.js')
const { RouterContext } = await import('@molecule/app-solid')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  for (const k of Object.keys(catalog)) delete catalog[k]
})

/** Let Solid's async effect queue flush between the click and the assertions. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/** The footer button carrying exactly the given label text. */
function buttonWithLabel(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent === label,
  )
  if (!button) throw new Error(`no button labelled ${label}`)
  return button
}

/** Open the Privacy or Terms modal and return the rendered modal element. */
async function openLegalModal(label: 'Privacy Policy' | 'Terms of Service'): Promise<HTMLElement> {
  const container = mountFooter({ appName: 'Acme', aboutHref: '/about' })
  buttonWithLabel(container, label).click()
  await settle()
  const modal = container.querySelector<HTMLElement>('[data-modal]')
  if (!modal) throw new Error(`${label} modal did not open`)
  return modal
}

/** Render the footer and return its mount container. */
function mountFooter(props: { appName: string; aboutHref: string }): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const router = createMemoryRouter({ initialEntries: ['/'] })
  disposers.push(
    render(
      () => (
        <RouterContext.Provider value={router}>
          <AppFooter {...props} />
        </RouterContext.Provider>
      ),
      container,
    ),
  )
  return container
}

describe('AppFooter legal modals — no silently-blank modal (empty content)', () => {
  it('shows the honest placeholder in the Privacy modal when content is empty', async () => {
    const modal = await openLegalModal('Privacy Policy')
    // The modal is not blank — it carries the configured-placeholder message.
    expect(modal.textContent).toContain('This content has not been configured yet')
    expect(modal.textContent).toContain('app owner must provide it')
    expect((modal.textContent ?? '').trim().length).toBeGreaterThan(0)
    // Placeholder branch renders the message as plain text in a <p> — NOT an
    // injected-HTML <div> (which would be blank when content is empty).
    expect(modal.firstElementChild?.tagName).toBe('P')
  })

  it('shows the honest placeholder in the Terms modal when content is empty', async () => {
    const modal = await openLegalModal('Terms of Service')
    expect(modal.textContent).toContain('This content has not been configured yet')
    expect(modal.firstElementChild?.tagName).toBe('P')
  })
})

describe('AppFooter legal modals — {{appName}} is HTML-escaped before entering legal HTML', () => {
  it('a markup-carrying appName renders inert, not as script/img tags', async () => {
    catalog['content.privacyPolicy'] = '<p>Privacy Policy for {{appName}}.</p>'
    const container = mountFooter({
      appName: 'Acme<img src=x onerror=alert(1)><script>evil()</script>',
      aboutHref: '/about',
    })
    buttonWithLabel(container, 'Privacy Policy').click()
    await settle()
    const modal = container.querySelector<HTMLElement>('[data-modal]')!
    const html = modal.firstElementChild!.innerHTML
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img')
    // No live script/img element was created from the appName.
    expect(modal.querySelector('script')).toBeNull()
    expect(modal.querySelector('img')).toBeNull()
  })
})

describe('AppFooter legal modals — app-registered content renders as HTML', () => {
  it('renders registered privacy HTML instead of the placeholder', async () => {
    catalog['content.privacyPolicy'] = '<h2>Acme Privacy</h2><p>We collect nothing.</p>'
    const modal = await openLegalModal('Privacy Policy')
    // Registered content branch renders the raw HTML inside a <div>.
    expect(modal.firstElementChild?.tagName).toBe('DIV')
    expect(modal.firstElementChild?.innerHTML).toContain('<h2>Acme Privacy</h2>')
    // The placeholder must NOT appear once real content exists.
    expect(modal.textContent).not.toContain('has not been configured yet')
  })

  it('interpolates {{appName}} into registered terms HTML', async () => {
    catalog['content.termsOfService'] = '<p>These terms govern {{appName}}.</p>'
    const modal = await openLegalModal('Terms of Service')
    expect(modal.firstElementChild?.tagName).toBe('DIV')
    expect(modal.firstElementChild?.innerHTML).toContain('These terms govern Acme.')
    expect(modal.textContent).not.toContain('has not been configured yet')
  })
})
