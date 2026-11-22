// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ImageGalleryEditor`'s drop zone and text — a port of
 * `@molecule/app-image-gallery-editor-react/src/__tests__/drop-and-text.test.ts`:
 * the same behavioral assertions, rendered with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name; Icon records its glyph; ConfirmDialog shows
// its title and description while open — the same mocks the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .map((c) => (typeof c === 'function' ? c() : c))
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : (..._args: unknown[]) => String(prop),
      },
    ),
}))
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  const Icon = defineComponent({
    props: {
      name: { type: String, required: true },
      className: { type: null, default: undefined },
    },
    setup(props) {
      return () =>
        h('i', {
          'data-icon': props.name,
          class: typeof props.className === 'function' ? props.className() : props.className,
        })
    },
  })
  const ConfirmDialog = defineComponent({
    props: {
      open: Boolean,
      title: { type: null, default: undefined },
      description: { type: null, default: undefined },
    },
    setup(props) {
      return () =>
        props.open
          ? h(
              'div',
              { 'data-confirm-dialog': '' },
              `${props.title ?? ''} | ${props.description ?? ''}`,
            )
          : null
    },
  })
  return { Icon, ConfirmDialog }
})
// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `«${key}»`,
  }),
}))

import { createApp, defineComponent, h, nextTick } from 'vue'

const { ImageGalleryEditor } = await import('../ImageGalleryEditor.js')

let unmount: (() => void) | null = null

afterEach(() => {
  unmount?.()
  document.body.innerHTML = ''
  unmount = null
})

/**
 * Mounts the editor in jsdom.
 *
 * @param props - Props over `slots` and a spied `onChange`.
 * @returns The container and the `onChange` spy.
 */
async function mount(
  props: Record<string, unknown>,
): Promise<{ container: HTMLElement; onChange: ReturnType<typeof vi.fn> }> {
  const onChange = vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({ render: () => h(ImageGalleryEditor, { slots: [null], onChange, ...props }) }),
  )
  app.mount(host)
  unmount = () => app.unmount()
  await nextTick()
  return { container: host, onChange }
}

/**
 * A FileList jsdom can carry on a drop event.
 *
 * @param files - The files.
 * @returns The list.
 */
const fileList = (files: File[]): unknown =>
  Object.assign([...files], { item: (i: number) => files[i] ?? null })

/**
 * Drops files on an element and reports whether the drop's default was
 * prevented.
 *
 * @param el - The drop target.
 * @param files - The dropped files.
 * @returns Whether a listener called preventDefault.
 */
async function drop(el: Element, files: File[]): Promise<boolean> {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { files: fileList(files) } })
  el.dispatchEvent(event)
  await nextTick()
  await Promise.resolve()
  await nextTick()
  return event.defaultPrevented
}

const zone = (c: HTMLElement): Element =>
  c.querySelector('[data-mol-id="image-gallery-editor-dropzone"]')!

describe('ImageGalleryEditor drop zone', () => {
  it('accepts a drag over it, so the browser lets the drop through', async () => {
    const { container } = await mount({})
    const over = new Event('dragover', { bubbles: true, cancelable: true })
    zone(container).dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)
  })

  it('dropped images fill the empty slots in order', async () => {
    const onPickFiles = vi.fn((files: FileList) => Array.from(files).map((f) => `url:${f.name}`))
    const { container, onChange } = await mount({ slots: ['kept', null, null], onPickFiles })
    const prevented = await drop(zone(container), [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ])
    expect(prevented).toBe(true)
    expect(onPickFiles).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(['kept', 'url:a.png', 'url:b.jpg'])
  })

  it('refuses a drop that carries a file the picker would not take', async () => {
    const onPickFiles = vi.fn(() => ['url'])
    const { container, onChange } = await mount({ onPickFiles })
    const prevented = await drop(zone(container), [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
    ])
    // Still prevented, so the browser does not open the dropped file instead.
    expect(prevented).toBe(true)
    expect(onPickFiles).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('ImageGalleryEditor text', () => {
  it('takes the drop-zone heading and hint through i18n by default', async () => {
    const { container } = await mount({})
    expect(zone(container).textContent).toContain('«imageGalleryEditor.dropZone.title»')
    expect(zone(container).textContent).toContain('«imageGalleryEditor.dropZone.hint»')
  })

  it('takes the remove confirmation through i18n by default', async () => {
    const { container } = await mount({ slots: ['x'] })
    const slot = container.querySelector('[data-mol-id="image-gallery-editor-slot-0"]')!
    slot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(container.querySelector('[data-confirm-dialog]')?.textContent).toBe(
      '«imageGalleryEditor.remove.title» | «imageGalleryEditor.remove.message»',
    )
  })

  it('keeps the caller’s own heading, hint and message', async () => {
    const { container } = await mount({
      slots: ['x'],
      dropZoneTitle: 'Drop photos',
      dropZoneHint: 'or pick some',
      confirmRemoveMessage: 'Delete it?',
    })
    expect(zone(container).textContent).toContain('Drop photos')
    expect(zone(container).textContent).toContain('or pick some')
    const slot = container.querySelector('[data-mol-id="image-gallery-editor-slot-0"]')!
    slot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(container.querySelector('[data-confirm-dialog]')?.textContent).toContain('Delete it?')
  })
})
