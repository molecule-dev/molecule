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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { CodeBlock } = await import('../CodeBlock.js')

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

const code = 'const x = 1\nconst y = 2\nconsole.log(x + y)'

describe('CodeBlock', () => {
  it('renders the source code', () => {
    const markup = html(createElement(CodeBlock, { code }))
    expect(markup).toContain('console.log(x + y)')
  })

  it('renders the filename and language tag in the header', () => {
    const markup = html(createElement(CodeBlock, { code, filename: 'sum.ts', language: 'ts' }))
    expect(markup).toContain('sum.ts')
    expect(markup).toContain('ts')
  })

  it('omits the header when there is no filename/language and copy is disabled', () => {
    const markup = html(createElement(CodeBlock, { code, showCopy: false }))
    expect(markup).not.toContain('<header')
  })

  it('renders the copy button by default', () => {
    const markup = html(createElement(CodeBlock, { code }))
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', () => {
    const withNums = html(createElement(CodeBlock, { code }))
    expect(withNums).toContain('>1<')
    expect(withNums).toContain('>2<')
    expect(withNums).toContain('>3<')
    const without = html(createElement(CodeBlock, { code, showLineNumbers: false }))
    expect(without).not.toContain('>1<')
  })

  it('forwards className', () => {
    const markup = html(createElement(CodeBlock, { code, className: 'cb-cls' }))
    expect(markup).toContain('cb-cls')
  })

  it('copies the displayed code when the copy button is clicked', async () => {
    render(createElement(CodeBlock, { code }))
    fireEvent.click(copyButton())
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith(code)
    await waitFor(() => expect(copyButton().textContent).toBe('Copied!'))
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    render(createElement(CodeBlock, { code }))
    fireEvent.click(copyButton())
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith(code)
    await act(async () => {
      await Promise.resolve()
    })
    expect(copyButton().textContent).toBe('Copy')
  })
})
