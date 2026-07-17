import { cleanup, createEvent, fireEvent, render } from '@testing-library/react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

describe('FileDropzone (keyboard activation)', () => {
  afterEach(() => cleanup())

  /**
   * Render the dropzone and return its interactive wrapper + hidden file input.
   * @param props - Props to pass to `<FileDropzone>`.
   */
  function renderZone(props: Parameters<typeof FileDropzone>[0]): {
    zone: HTMLElement
    input: HTMLInputElement
  } {
    const { container } = render(createElement(FileDropzone, props))
    const zone = container.querySelector<HTMLElement>('[data-mol-id="file-dropzone"]')
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    if (!zone || !input) throw new Error('dropzone or input not found')
    return { zone, input }
  }

  it('is a keyboard-focusable button', () => {
    const { zone } = renderZone({ onFiles: () => {} })
    expect(zone.getAttribute('role')).toBe('button')
    expect(zone.getAttribute('tabindex')).toBe('0')
  })

  it('opens the file dialog when Enter is pressed (and prevents default)', () => {
    const { zone, input } = renderZone({ onFiles: () => {} })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = createEvent.keyDown(zone, { key: 'Enter' })
    fireEvent(zone, event)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('opens the file dialog when Space is pressed (and prevents default)', () => {
    const { zone, input } = renderZone({ onFiles: () => {} })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = createEvent.keyDown(zone, { key: ' ' })
    fireEvent(zone, event)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not open on other keys', () => {
    const { zone, input } = renderZone({ onFiles: () => {} })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    fireEvent.keyDown(zone, { key: 'Tab' })
    fireEvent.keyDown(zone, { key: 'a' })
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('does not open when disabled', () => {
    const { zone, input } = renderZone({ onFiles: () => {}, disabled: true })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    fireEvent.keyDown(zone, { key: 'Enter' })
    fireEvent.keyDown(zone, { key: ' ' })
    expect(clickSpy).not.toHaveBeenCalled()
  })
})
