import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// The same ClassMap proxy mock the main suite uses (echoing each token back).
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
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
}))

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { BulkActionToolbar } = await import('../BulkActionToolbar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const actions = [
  { id: 'archive', label: 'Archive', onClick: () => {} },
  { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
]

describe('BulkActionToolbar i18n', () => {
  it('takes the toolbar label through i18n by default', () => {
    const markup = html(createElement(BulkActionToolbar, { count: 1, actions }))
    expect(markup).toContain('aria-label="«bulkActions.aria.toolbar»"')
    expect(markup).not.toContain('aria-label="Bulk actions"')
  })
})
