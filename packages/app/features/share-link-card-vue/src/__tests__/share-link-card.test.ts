// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ShareLinkCard` and its internal `CopyLinkField` — a
 * port of `@molecule/app-share-link-card-react/src/__tests__/share-link-card.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The markers the React tests mock `@molecule/app-ui-react` with: a
// `data-card` div carrying its className and data-mol-id, a `data-button`
// button, and a `data-switch` checkbox.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: { variant: String, size: String, onClick: { type: Function, default: undefined } },
      setup(props, { slots }) {
        return () =>
          h('button', { 'data-button': '', type: 'button', onClick: props.onClick }, [
            slots.default?.(),
          ])
      },
    }),
    Card: defineComponent({
      name: 'Card',
      inheritAttrs: false,
      props: { className: String },
      setup(props, { attrs, slots }) {
        return () =>
          h(
            'div',
            {
              'data-card': '',
              'data-mol-id': (attrs as Record<string, unknown>)['data-mol-id'],
              class: props.className,
            },
            slots.default?.(),
          )
      },
    }),
    Switch: defineComponent({
      name: 'Switch',
      inheritAttrs: false,
      props: { checked: Boolean, onChange: { type: Function, default: undefined } },
      setup(props, { attrs }) {
        return () =>
          h('button', {
            type: 'button',
            role: 'switch',
            'data-switch': '',
            'aria-checked': String(!!props.checked),
            ...attrs,
          })
      },
    }),
  }
})

import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

const { CopyLinkField } = await import('../CopyLinkField.js')
const { ShareLinkCard } = await import('../ShareLinkCard.js')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a component with the given props and returns the markup it produced. */
const render = (
  component: unknown,
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const markup = render(CopyLinkField, { value: 'https://x.test/abc' })
    expect(markup).toContain('value="https://x.test/abc"')
    expect(markup).toContain('readonly')
  })

  it('renders the Copy button with its default label', () => {
    const markup = render(CopyLinkField, { value: 'https://x.test' })
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('forwards className', () => {
    const markup = render(CopyLinkField, { value: 'u', className: 'clf-cls' })
    expect(markup).toContain('clf-cls')
  })

  it('names the url field with an accessible label', () => {
    const markup = render(CopyLinkField, { value: 'u' })
    expect(markup).toContain('aria-label="Share link"')
  })

  it('copies the value when the copy button is clicked', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({ render: () => h(CopyLinkField as never, { value: 'https://x.test/abc' }) }),
    )
    app.mount(host)
    const button = host.querySelector('button[data-button]') as HTMLButtonElement
    button.click()
    await vi.waitFor(() => expect(button.textContent).toBe('Copied!'))
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    app.unmount()
    host.remove()
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({ render: () => h(CopyLinkField as never, { value: 'https://x.test/abc' }) }),
    )
    app.mount(host)
    const button = host.querySelector('button[data-button]') as HTMLButtonElement
    button.click()
    await vi.waitFor(() =>
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc'),
    )
    await nextTick()
    expect(button.textContent).toBe('Copy')
    app.unmount()
    host.remove()
  })
})

describe('ShareLinkCard', () => {
  it('renders the title in an <h3> and the description', () => {
    const markup = render(ShareLinkCard, {
      url: 'u',
      title: 'Share this',
      description: 'desc-x',
    })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Share this')
    expect(markup).toContain('desc-x')
  })

  it('omits the header when neither title nor description is given', () => {
    const markup = render(ShareLinkCard, { url: 'u' })
    expect(markup).not.toContain('<header')
  })

  it('renders the CopyLinkField carrying the url', () => {
    const markup = render(ShareLinkCard, { url: 'https://x.test/share' })
    expect(markup).toContain('value="https://x.test/share"')
  })

  it('renders the QR slot only when showQR and qr are both set', () => {
    const shown = render(ShareLinkCard, {
      url: 'u',
      showQR: true,
      qr: h('svg', { 'data-qr': '' }),
    })
    expect(shown).toContain('data-qr=""')
    const hidden = render(ShareLinkCard, { url: 'u', qr: h('svg', { 'data-qr': '' }) })
    expect(hidden).not.toContain('data-qr')
  })

  it('renders the password-protect toggle row with the default label when configured', () => {
    const markup = render(ShareLinkCard, {
      url: 'u',
      passwordProtect: { enabled: false, onChange: () => {} },
    })
    expect(markup).toContain('data-switch=""')
    expect(markup).toContain('Password protect')
  })

  it('honours a custom password-protect label', () => {
    const markup = render(ShareLinkCard, {
      url: 'u',
      passwordProtect: { enabled: true, onChange: () => {}, label: 'Require a password' },
    })
    expect(markup).toContain('Require a password')
  })

  it('names the password switch from its visible label', () => {
    const markup = render(ShareLinkCard, {
      url: 'u',
      passwordProtect: { enabled: false, onChange: () => {} },
    })
    const labelId = markup.match(/<span[^>]* id="([^"]+)"[^>]*>Password protect<\/span>/)?.[1]
    expect(labelId).toBeTruthy()
    expect(markup).toContain(`aria-labelledby="${labelId}"`)
  })

  it('falls back to an i18n name for a switch with an empty label', () => {
    const markup = render(ShareLinkCard, {
      url: 'u',
      passwordProtect: { enabled: false, onChange: () => {}, label: '' },
    })
    expect(markup).not.toContain('aria-labelledby')
    expect(markup).toContain('aria-label="Password protect"')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = render(ShareLinkCard, {
      url: 'u',
      dataMolId: 'share-x',
      className: 'slc-cls',
    })
    expect(markup).toContain('data-mol-id="share-x"')
    expect(markup).toContain('slc-cls')
  })
})
