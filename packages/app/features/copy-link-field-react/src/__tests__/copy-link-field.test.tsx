// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) =>
    createElement('button', { 'data-button': '', type: 'button', onClick }, children),
}))

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

const { CopyLinkField } = await import('../CopyLinkField.js')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** Helper — the copy button. */
function copyButton(): HTMLButtonElement {
  return document.querySelector('button[data-button]') as HTMLButtonElement
}

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const markup = html(createElement(CopyLinkField, { value: 'https://x.test/abc' }))
    expect(markup).toContain('value="https://x.test/abc"')
    expect(markup).toContain('readOnly')
  })

  it('renders the label when present and omits it otherwise', () => {
    expect(html(createElement(CopyLinkField, { value: 'u', label: 'Webhook URL' }))).toContain(
      'Webhook URL',
    )
    const without = html(createElement(CopyLinkField, { value: 'u' }))
    expect(without).not.toContain('Webhook URL')
  })

  it('uses the label as the input aria-label, falling back to a default', () => {
    expect(html(createElement(CopyLinkField, { value: 'u', label: 'API key' }))).toContain(
      'aria-label="API key"',
    )
    expect(html(createElement(CopyLinkField, { value: 'u' }))).toContain('aria-label="Link"')
  })

  it('renders the copy button with its default label', () => {
    const markup = html(createElement(CopyLinkField, { value: 'u' }))
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('forwards className', () => {
    const markup = html(createElement(CopyLinkField, { value: 'u', className: 'clf-cls' }))
    expect(markup).toContain('clf-cls')
  })

  it('copies the value when the copy button is clicked', async () => {
    const onCopy = vi.fn()
    render(createElement(CopyLinkField, { value: 'https://x.test/abc', onCopy }))
    fireEvent.click(copyButton())
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    await waitFor(() => expect(copyButton().textContent).toBe('Copied!'))
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const onCopy = vi.fn()
    render(createElement(CopyLinkField, { value: 'https://x.test/abc', onCopy }))
    fireEvent.click(copyButton())
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    await act(async () => {
      await Promise.resolve()
    })
    expect(copyButton().textContent).toBe('Copy')
    expect(onCopy).not.toHaveBeenCalled()
  })
})
