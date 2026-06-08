import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const { FileDropzone } = await import('../FileDropzone.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('FileDropzone', () => {
  it('renders the default upload copy', () => {
    const markup = html(createElement(FileDropzone, { onFiles: () => {} }))
    expect(markup).toContain('Drop files here or click to browse')
  })

  it('renders custom children in place of the default copy', () => {
    const markup = html(
      createElement(FileDropzone, {
        onFiles: () => {},
        children: createElement('span', { 'data-custom': '' }, 'My uploader'),
      }),
    )
    expect(markup).toContain('data-custom=""')
    expect(markup).not.toContain('Drop files here')
  })

  it('renders the accept hint when an accept filter is given', () => {
    const markup = html(createElement(FileDropzone, { onFiles: () => {}, accept: '.pdf' }))
    expect(markup).toContain('Accepts:')
    expect(markup).toContain('.pdf')
  })

  it('exposes a button role and a hidden file input carrying accept + multiple', () => {
    const markup = html(
      createElement(FileDropzone, { onFiles: () => {}, accept: 'image/*', multiple: true }),
    )
    expect(markup).toContain('role="button"')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('accept="image/*"')
    expect(markup).toContain('multiple')
  })

  it('reflects the disabled state via aria-disabled', () => {
    const markup = html(createElement(FileDropzone, { onFiles: () => {}, disabled: true }))
    expect(markup).toContain('aria-disabled="true"')
  })

  it('forwards className', () => {
    const markup = html(createElement(FileDropzone, { onFiles: () => {}, className: 'fd-cls' }))
    expect(markup).toContain('fd-cls')
  })
})
