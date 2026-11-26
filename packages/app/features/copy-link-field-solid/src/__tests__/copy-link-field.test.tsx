// @vitest-environment jsdom
/**
 * Unit tests for the Solid `CopyLinkField` — a port of
 * `@molecule/app-copy-link-field-react/src/__tests__/copy-link-field.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'

import type { CopyLinkFieldProps } from '../types.js'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element rendering its children.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: (props: {
    variant?: string
    size?: string
    onClick?: () => void
    children?: JSX.Element
  }) => (
    <button data-button="" type="button" onClick={props.onClick}>
      {props.children}
    </button>
  ),
}))

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

const { CopyLinkField } = await import('../CopyLinkField.jsx')

const disposers: Array<() => void> = []

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** Render with Solid's browser renderer and return the container's markup. */
function renderField(props: CopyLinkFieldProps): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <CopyLinkField {...props} />, container))
  return container.innerHTML
}

/** Mounts a {@link CopyLinkField} that stays mounted (for the click tests). */
function mountLive(props: CopyLinkFieldProps): { container: HTMLDivElement } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <CopyLinkField {...props} />, container))
  return { container }
}

/** Helper — the copy button inside a mounted container. */
function copyButton(container: HTMLElement): HTMLButtonElement | null {
  return container.querySelector('button[data-button]')
}

/** Flushes the copy promise's microtasks (Solid applies signal writes synchronously). */
function flush(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve))
}

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const markup = renderField({ value: 'https://x.test/abc' })
    expect(markup).toContain('value="https://x.test/abc"')
    expect(markup).toContain('readonly')
  })

  it('selects the whole value when the web field receives focus', () => {
    const value = 'https://x.test/abc'
    const { container } = mountLive({ value })
    const field = container.querySelector('input')
    if (!field) throw new Error('Expected the input')
    field.focus()
    expect(field.selectionStart).toBe(0)
    expect(field.selectionEnd).toBe(value.length)
  })

  it('renders the label when present and omits it otherwise', () => {
    expect(renderField({ value: 'u', label: 'Webhook URL' })).toContain('Webhook URL')
    const without = renderField({ value: 'u' })
    expect(without).not.toContain('Webhook URL')
  })

  it('uses the label as the input aria-label, falling back to a default', () => {
    expect(renderField({ value: 'u', label: 'API key' })).toContain('aria-label="API key"')
    expect(renderField({ value: 'u' })).toContain('aria-label="Link"')
  })

  it('renders the copy button with its default label', () => {
    const markup = renderField({ value: 'u' })
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('forwards className', () => {
    const markup = renderField({ value: 'u', className: 'clf-cls' })
    expect(markup).toContain('clf-cls')
  })

  it('copies the value when the copy button is clicked', async () => {
    const onCopy = vi.fn()
    const { container } = mountLive({ value: 'https://x.test/abc', onCopy })
    const button = copyButton(container)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    expect(copyButton(container)?.textContent).toBe('Copied!')
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const onCopy = vi.fn()
    const { container } = mountLive({ value: 'https://x.test/abc', onCopy })
    const button = copyButton(container)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    expect(copyButton(container)?.textContent).toBe('Copy')
    expect(onCopy).not.toHaveBeenCalled()
  })
})
