// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `FileDropzone` — a port of
 * `@molecule/app-file-dropzone-react/src/__tests__/file-dropzone.test.tsx`:
 * the same behavioral assertions, rendered with Svelte in jsdom.
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

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

import FileDropzone from '../FileDropzone.svelte'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts a `FileDropzone` into a fresh target and returns the target. */
function render(props: Record<string, unknown>, children?: Snippet): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(FileDropzone, {
    target,
    props: { onFiles: () => {}, ...props, ...(children ? { children } : {}) },
  })
  mounted.push(instance)
  flushSync()
  return target
}

/** A snippet rendering the given markup, the way a caller fills the slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

describe('FileDropzone', () => {
  it('renders the default upload copy', () => {
    const markup = render({}).innerHTML
    expect(markup).toContain('Drop files here or click to browse')
  })

  it('renders custom children in place of the default copy', () => {
    const markup = render({}, raw('<span data-custom="">My uploader</span>')).innerHTML
    expect(markup).toContain('data-custom=""')
    expect(markup).not.toContain('Drop files here')
  })

  it('renders the accept hint when an accept filter is given', () => {
    const markup = render({ accept: '.pdf' }).innerHTML
    expect(markup).toContain('Accepts:')
    expect(markup).toContain('.pdf')
  })

  it('exposes a button role and a hidden file input carrying accept + multiple', () => {
    const markup = render({ accept: 'image/*', multiple: true }).innerHTML
    expect(markup).toContain('role="button"')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('accept="image/*"')
    expect(markup).toContain('multiple')
  })

  it('reflects the disabled state via aria-disabled', () => {
    const markup = render({ disabled: true }).innerHTML
    expect(markup).toContain('aria-disabled="true"')
  })

  it('forwards className', () => {
    const markup = render({ className: 'fd-cls' }).innerHTML
    expect(markup).toContain('fd-cls')
  })
})

describe('FileDropzone (keyboard activation)', () => {
  /** Renders the dropzone and returns its interactive wrapper + hidden input. */
  function mountZone(props: Record<string, unknown>): {
    zone: HTMLElement
    input: HTMLInputElement
  } {
    const container = render(props)
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
    const { zone } = mountZone({})
    expect(zone.getAttribute('role')).toBe('button')
    expect(zone.getAttribute('tabindex')).toBe('0')
  })

  it('rejects one byte and delivers an empty file when maxSize is zero', () => {
    const onFiles = vi.fn()
    const onRejected = vi.fn()
    const { zone } = mountZone({ onFiles, onRejected, maxSize: 0 })
    const one = new File(['x'], 'one.txt', { type: 'text/plain' })
    const empty = new File([], 'empty.txt', { type: 'text/plain' })
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [one, empty] } })

    zone.dispatchEvent(drop)

    expect(onFiles).toHaveBeenCalledExactlyOnceWith([empty])
    expect(onFiles.mock.calls[0][0][0]).toBe(empty)
    expect(onRejected).toHaveBeenCalledExactlyOnceWith([one])
    expect(onRejected.mock.calls[0][0][0]).toBe(one)
  })

  it('opens the chooser once when the input click bubbles back to the target', () => {
    const { zone, input } = mountZone({ onFiles: () => {} })
    const click = vi.spyOn(input, 'click')
    try {
      zone.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(click).toHaveBeenCalledTimes(1)
    } finally {
      click.mockRestore()
    }
  })

  it('opens the file dialog when Enter is pressed (and prevents default)', () => {
    const { zone, input } = mountZone({})
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = keydown(zone, 'Enter')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('opens the file dialog when Space is pressed (and prevents default)', () => {
    const { zone, input } = mountZone({})
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const event = keydown(zone, ' ')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not open on other keys', () => {
    const { zone, input } = mountZone({})
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    keydown(zone, 'Tab')
    keydown(zone, 'a')
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('does not open when disabled', () => {
    const { zone, input } = mountZone({ disabled: true })
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    keydown(zone, 'Enter')
    keydown(zone, ' ')
    expect(clickSpy).not.toHaveBeenCalled()
  })
})
