// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ShareLinkCard` and its internal `CopyLinkField` —
 * a port of `@molecule/app-share-link-card-react/src/__tests__/share-link-card.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The markers the React tests mock `@molecule/app-ui-react` with.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { onClick?: () => void; children?: JSX.Element }) => (
    <button data-button="" type="button" onClick={props.onClick}>
      {props.children}
    </button>
  ),
  Card: (props: { className?: string; 'data-mol-id'?: string; children?: JSX.Element }) => (
    <div data-card="" data-mol-id={props['data-mol-id']} class={props.className}>
      {props.children}
    </div>
  ),
  Switch: (props: { checked?: boolean }) => (
    <input type="checkbox" data-switch="" checked={props.checked} readonly />
  ),
}))

const { CopyLinkField } = await import('../CopyLinkField.jsx')
const { ShareLinkCard } = await import('../ShareLinkCard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a component with the given props and returns the container's markup. */
function renderMarkup(view: () => JSX.Element): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const markup = renderMarkup(() => <CopyLinkField value="https://x.test/abc" />)
    expect(markup).toContain('value="https://x.test/abc"')
    expect(markup).toContain('readonly')
  })

  it('renders the Copy button with its default label', () => {
    const markup = renderMarkup(() => <CopyLinkField value="https://x.test" />)
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('forwards className', () => {
    const markup = renderMarkup(() => <CopyLinkField value="u" className="clf-cls" />)
    expect(markup).toContain('clf-cls')
  })
})

describe('ShareLinkCard', () => {
  it('renders the title in an <h3> and the description', () => {
    const markup = renderMarkup(() => (
      <ShareLinkCard url="u" title="Share this" description="desc-x" />
    ))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Share this')
    expect(markup).toContain('desc-x')
  })

  it('omits the header when neither title nor description is given', () => {
    const markup = renderMarkup(() => <ShareLinkCard url="u" />)
    expect(markup).not.toContain('<header')
  })

  it('renders the CopyLinkField carrying the url', () => {
    const markup = renderMarkup(() => <ShareLinkCard url="https://x.test/share" />)
    expect(markup).toContain('value="https://x.test/share"')
  })

  it('renders the QR slot only when showQR and qr are both set', () => {
    const shown = renderMarkup(() => <ShareLinkCard url="u" showQR qr={<svg data-qr="" />} />)
    expect(shown).toContain('data-qr=""')
    const hidden = renderMarkup(() => <ShareLinkCard url="u" qr={<svg data-qr="" />} />)
    expect(hidden).not.toContain('data-qr')
  })

  it('renders the password-protect toggle row with the default label when configured', () => {
    const markup = renderMarkup(() => (
      <ShareLinkCard url="u" passwordProtect={{ enabled: false, onChange: () => {} }} />
    ))
    expect(markup).toContain('data-switch=""')
    expect(markup).toContain('Password protect')
  })

  it('honours a custom password-protect label', () => {
    const markup = renderMarkup(() => (
      <ShareLinkCard
        url="u"
        passwordProtect={{ enabled: true, onChange: () => {}, label: 'Require a password' }}
      />
    ))
    expect(markup).toContain('Require a password')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = renderMarkup(() => (
      <ShareLinkCard url="u" dataMolId="share-x" className="slc-cls" />
    ))
    expect(markup).toContain('data-mol-id="share-x"')
    expect(markup).toContain('slc-cls')
  })
})
