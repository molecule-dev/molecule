// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// React's `act` refuses to run unless the environment opts in.
;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) =>
    createElement('button', { 'data-button': '', type: 'button', onClick }, children),
  Card: ({
    children,
    className,
    ['data-mol-id']: molId,
  }: {
    children?: ReactNode
    className?: string
    'data-mol-id'?: string
  }) => createElement('div', { 'data-card': '', 'data-mol-id': molId, className }, children),
  Switch: ({
    checked,
    onChange: _onChange,
    ...rest
  }: {
    checked?: boolean
    'aria-labelledby'?: string
    'aria-label'?: string
    onChange?: (event: { target: { checked: boolean } }) => void
  }) =>
    createElement('button', {
      type: 'button',
      role: 'switch',
      'aria-checked': checked ? 'true' : 'false',
      'data-switch': '',
      ...rest,
    }),
}))

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

const { ShareLinkCard } = await import('../ShareLinkCard.js')
const { CopyLinkField } = await import('../CopyLinkField.js')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

/** Mounts a `CopyLinkField` in a live root and returns the container plus click/teardown helpers. */
const mountField = async (value: string) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(CopyLinkField, { value }))
  })
  return {
    container,
    button: (): HTMLButtonElement =>
      container.querySelector('button[data-button]') as HTMLButtonElement,
    click: async (): Promise<void> => {
      const button = container.querySelector('button[data-button]') as HTMLButtonElement
      await act(async () => {
        button.click()
      })
    },
    destroy: async (): Promise<void> => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const markup = html(createElement(CopyLinkField, { value: 'https://x.test/abc' }))
    expect(markup).toContain('value="https://x.test/abc"')
    expect(markup).toContain('readOnly')
  })

  it('renders the Copy button with its default label', () => {
    const markup = html(createElement(CopyLinkField, { value: 'https://x.test' }))
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('forwards className', () => {
    const markup = html(createElement(CopyLinkField, { value: 'u', className: 'clf-cls' }))
    expect(markup).toContain('clf-cls')
  })

  it('names the url field with an accessible label', () => {
    const markup = html(createElement(CopyLinkField, { value: 'u' }))
    expect(markup).toContain('aria-label="Share link"')
  })

  it('copies the value when the copy button is clicked', async () => {
    const field = await mountField('https://x.test/abc')
    await field.click()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    expect(field.button().textContent).toBe('Copied!')
    await field.destroy()
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const field = await mountField('https://x.test/abc')
    await field.click()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    expect(field.button().textContent).toBe('Copy')
    await field.destroy()
  })
})

describe('ShareLinkCard', () => {
  it('renders the title in an <h3> and the description', () => {
    const markup = html(
      createElement(ShareLinkCard, { url: 'u', title: 'Share this', description: 'desc-x' }),
    )
    expect(markup).toContain('<h3')
    expect(markup).toContain('Share this')
    expect(markup).toContain('desc-x')
  })

  it('omits the header when neither title nor description is given', () => {
    const markup = html(createElement(ShareLinkCard, { url: 'u' }))
    expect(markup).not.toContain('<header')
  })

  it('renders the CopyLinkField carrying the url', () => {
    const markup = html(createElement(ShareLinkCard, { url: 'https://x.test/share' }))
    expect(markup).toContain('value="https://x.test/share"')
  })

  it('renders the QR slot only when showQR and qr are both set', () => {
    const shown = html(
      createElement(ShareLinkCard, {
        url: 'u',
        showQR: true,
        qr: createElement('svg', { 'data-qr': '' }),
      }),
    )
    expect(shown).toContain('data-qr=""')
    const hidden = html(
      createElement(ShareLinkCard, { url: 'u', qr: createElement('svg', { 'data-qr': '' }) }),
    )
    expect(hidden).not.toContain('data-qr')
  })

  it('renders the password-protect toggle row with the default label when configured', () => {
    const markup = html(
      createElement(ShareLinkCard, {
        url: 'u',
        passwordProtect: { enabled: false, onChange: () => {} },
      }),
    )
    expect(markup).toContain('data-switch=""')
    expect(markup).toContain('Password protect')
  })

  it('honours a custom password-protect label', () => {
    const markup = html(
      createElement(ShareLinkCard, {
        url: 'u',
        passwordProtect: { enabled: true, onChange: () => {}, label: 'Require a password' },
      }),
    )
    expect(markup).toContain('Require a password')
  })

  it('names the password switch from its visible label', () => {
    const markup = html(
      createElement(ShareLinkCard, {
        url: 'u',
        passwordProtect: { enabled: false, onChange: () => {} },
      }),
    )
    const labelId = markup.match(/<span[^>]* id="([^"]+)"[^>]*>Password protect<\/span>/)?.[1]
    expect(labelId).toBeTruthy()
    expect(markup).toContain(`aria-labelledby="${labelId}"`)
  })

  it('falls back to an i18n name for a switch with an empty label', () => {
    const markup = html(
      createElement(ShareLinkCard, {
        url: 'u',
        passwordProtect: { enabled: false, onChange: () => {}, label: '' },
      }),
    )
    expect(markup).not.toContain('aria-labelledby')
    expect(markup).toContain('aria-label="Password protect"')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = html(
      createElement(ShareLinkCard, { url: 'u', dataMolId: 'share-x', className: 'slc-cls' }),
    )
    expect(markup).toContain('data-mol-id="share-x"')
    expect(markup).toContain('slc-cls')
  })
})
