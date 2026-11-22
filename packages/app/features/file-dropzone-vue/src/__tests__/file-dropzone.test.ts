// @vitest-environment jsdom
/**
 * Unit tests for the Vue `FileDropzone` — a port of
 * `@molecule/app-file-dropzone-react/src/__tests__/file-dropzone.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `textCenter`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { FileDropzone } from '../FileDropzone.js'
import type { FileDropzoneProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a `FileDropzone` and returns the markup it produced. */
const render = (props: FileDropzoneProps, slots?: Record<string, () => VNodeChild[]>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(FileDropzone, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('FileDropzone', () => {
  it('renders the default upload copy', () => {
    const markup = render({ onFiles: () => {} })
    expect(markup).toContain('Drop files here or click to browse')
  })

  it('renders custom children in place of the default copy', () => {
    const markup = render(
      { onFiles: () => {} },
      {
        default: () => [h('span', { 'data-custom': '' }, 'My uploader')],
      },
    )
    expect(markup).toContain('data-custom=""')
    expect(markup).not.toContain('Drop files here')
  })

  it('renders the accept hint when an accept filter is given', () => {
    const markup = render({ onFiles: () => {}, accept: '.pdf' })
    expect(markup).toContain('Accepts:')
    expect(markup).toContain('.pdf')
  })

  it('exposes a button role and a hidden file input carrying accept + multiple', () => {
    const markup = render({ onFiles: () => {}, accept: 'image/*', multiple: true })
    expect(markup).toContain('role="button"')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('accept="image/*"')
    expect(markup).toContain('multiple')
  })

  it('reflects the disabled state via aria-disabled', () => {
    const markup = render({ onFiles: () => {}, disabled: true })
    expect(markup).toContain('aria-disabled="true"')
  })

  it('forwards className', () => {
    const markup = render({ onFiles: () => {}, className: 'fd-cls' })
    expect(markup).toContain('fd-cls')
  })
})

describe('FileDropzone (keyboard activation)', () => {
  /** Mounts the dropzone and returns its interactive wrapper + hidden input. */
  function mountZone(props: FileDropzoneProps): {
    zone: HTMLElement
    input: HTMLInputElement
    unmount: () => void
  } {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(defineComponent({ render: () => h(FileDropzone, props) }))
    app.mount(host)
    const zone = host.querySelector<HTMLElement>('[data-mol-id="file-dropzone"]')
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')
    if (!zone || !input) throw new Error('dropzone or input not found')
    return { zone, input, unmount: () => app.unmount() }
  }

  /** Dispatches a cancelable bubbling keydown on the zone. */
  const keydown = (zone: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    zone.dispatchEvent(event)
    return event
  }

  it('is a keyboard-focusable button', () => {
    const { zone, unmount } = mountZone({ onFiles: () => {} })
    expect(zone.getAttribute('role')).toBe('button')
    expect(zone.getAttribute('tabindex')).toBe('0')
    unmount()
  })

  it('opens the file dialog when Enter is pressed (and prevents default)', () => {
    const { zone, input, unmount } = mountZone({ onFiles: () => {} })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = keydown(zone, 'Enter')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    unmount()
  })

  it('opens the file dialog when Space is pressed (and prevents default)', () => {
    const { zone, input, unmount } = mountZone({ onFiles: () => {} })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = keydown(zone, ' ')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    unmount()
  })

  it('does not open on other keys', () => {
    const { zone, input, unmount } = mountZone({ onFiles: () => {} })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    keydown(zone, 'Tab')
    keydown(zone, 'a')
    expect(clickSpy).not.toHaveBeenCalled()
    unmount()
  })

  it('does not open when disabled', () => {
    const { zone, input, unmount } = mountZone({ onFiles: () => {}, disabled: true })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    keydown(zone, 'Enter')
    keydown(zone, ' ')
    expect(clickSpy).not.toHaveBeenCalled()
    unmount()
  })
})
