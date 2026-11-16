// @vitest-environment jsdom
/**
 * Unit tests for the Solid `FileDropzone` — a port of
 * `@molecule/app-file-dropzone-react/src/__tests__/file-dropzone.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import type { JSX } from 'solid-js'
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

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { FileDropzone } = await import('../FileDropzone.jsx')
const { render } = await import('solid-js/web')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders with Solid's browser renderer and disposes after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('FileDropzone', () => {
  it('renders the default upload copy', () => {
    const container = mount(() => <FileDropzone onFiles={() => {}} />)
    expect(container.innerHTML).toContain('Drop files here or click to browse')
  })

  it('renders custom children in place of the default copy', () => {
    const container = mount(() => (
      <FileDropzone onFiles={() => {}}>
        <span data-custom="">My uploader</span>
      </FileDropzone>
    ))
    expect(container.innerHTML).toContain('data-custom=""')
    expect(container.innerHTML).not.toContain('Drop files here')
  })

  it('renders the accept hint when an accept filter is given', () => {
    const container = mount(() => <FileDropzone onFiles={() => {}} accept=".pdf" />)
    expect(container.innerHTML).toContain('Accepts:')
    expect(container.innerHTML).toContain('.pdf')
  })

  it('exposes a button role and a hidden file input carrying accept + multiple', () => {
    const container = mount(() => <FileDropzone onFiles={() => {}} accept="image/*" multiple />)
    expect(container.innerHTML).toContain('role="button"')
    expect(container.innerHTML).toContain('type="file"')
    expect(container.innerHTML).toContain('accept="image/*"')
    expect(container.innerHTML).toContain('multiple')
  })

  it('reflects the disabled state via aria-disabled', () => {
    const container = mount(() => <FileDropzone onFiles={() => {}} disabled />)
    expect(container.innerHTML).toContain('aria-disabled="true"')
  })

  it('forwards className', () => {
    const container = mount(() => <FileDropzone onFiles={() => {}} className="fd-cls" />)
    expect(container.innerHTML).toContain('fd-cls')
  })
})

describe('FileDropzone (keyboard activation)', () => {
  /** Renders the dropzone and returns its interactive wrapper + hidden input. */
  function mountZone(props: { onFiles: (files: File[]) => void; disabled?: boolean }): {
    zone: HTMLElement
    input: HTMLInputElement
  } {
    const container = mount(() => <FileDropzone {...props} />)
    const zone = container.querySelector<HTMLElement>('[data-mol-id="file-dropzone"]')
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    if (!zone || !input) throw new Error('dropzone or input not found')
    return { zone, input }
  }

  /** Dispatches a cancelable bubbling keydown on the zone. */
  const keydown = (zone: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    zone.dispatchEvent(event)
    return event
  }

  it('is a keyboard-focusable button', () => {
    const { zone } = mountZone({ onFiles: () => {} })
    expect(zone.getAttribute('role')).toBe('button')
    expect(zone.getAttribute('tabindex')).toBe('0')
  })

  it('opens the file dialog when Enter is pressed (and prevents default)', () => {
    const { zone, input } = mountZone({ onFiles: () => {} })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = keydown(zone, 'Enter')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('opens the file dialog when Space is pressed (and prevents default)', () => {
    const { zone, input } = mountZone({ onFiles: () => {} })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = keydown(zone, ' ')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not open on other keys', () => {
    const { zone, input } = mountZone({ onFiles: () => {} })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    keydown(zone, 'Tab')
    keydown(zone, 'a')
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('does not open when disabled', () => {
    const { zone, input } = mountZone({ onFiles: () => {}, disabled: true })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    keydown(zone, 'Enter')
    keydown(zone, ' ')
    expect(clickSpy).not.toHaveBeenCalled()
  })
})
