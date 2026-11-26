// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ImageGalleryEditor`'s drop zone and text — a
 * port of `@molecule/app-image-gallery-editor-react/src/__tests__/drop-and-text.test.ts`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name; Icon records its glyph; ConfirmDialog shows
// its title and description while open — the same mocks the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
vi.mock('@molecule/app-ui-svelte', async (importOriginal) => {
  const { default: Icon } = await import('./stubs/IconStub.svelte')
  const { default: ConfirmDialog } = await import('./stubs/ConfirmDialogDescriptionStub.svelte')
  return { ...(await importOriginal<Record<string, unknown>>()), Icon, ConfirmDialog }
})
// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `«${key}»`,
  }),
}))

import { flushSync, mount, unmount } from 'svelte'
import { fromStore, writable } from 'svelte/store'

import type { PickedFile } from '@molecule/app-filesystem'

import type { ImageGalleryEditorProps } from '../types.js'

const { ImageGalleryEditor } = await import('../components.js')

let teardown: (() => void) | null = null

afterEach(() => {
  teardown?.()
  document.body.innerHTML = ''
  teardown = null
  vi.unstubAllGlobals()
})

/**
 * Mounts the editor in jsdom.
 *
 * @param props - Props over `slots` and a spied `onChange`.
 * @returns The container and the `onChange` spy.
 */
async function mountEditor(props: Partial<Omit<ImageGalleryEditorProps, 'onChange'>>): Promise<{
  container: HTMLElement
  onChange: ReturnType<typeof vi.fn>
  setSlots: (next: (string | null)[]) => void
}> {
  const onChange = vi.fn()
  const slots = writable(props.slots ?? [null])
  const currentSlots = fromStore(slots)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const component = mount(ImageGalleryEditor, {
    target: container,
    props: {
      ...props,
      onChange,
      get slots() {
        return currentSlots.current
      },
    },
  })
  teardown = () => void unmount(component)
  flushSync()
  return {
    container,
    onChange,
    setSlots: (next) => {
      slots.set(next)
      flushSync()
    },
  }
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
  flushSync()
  await Promise.resolve()
  flushSync()
  return event.defaultPrevented
}

const zone = (c: HTMLElement): Element =>
  c.querySelector('[data-mol-id="image-gallery-editor-dropzone"]')!

/** Simulates a browser delivering the selected files in a chooser change event. */
function chooseFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperties(input, {
    files: { value: fileList(files), configurable: true },
    value: { value: 'selected', writable: true, configurable: true },
  })
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('ImageGalleryEditor drop zone', () => {
  it('accepts a drag over it, so the browser lets the drop through', async () => {
    const { container } = await mountEditor({})
    const over = new Event('dragover', { bubbles: true, cancelable: true })
    zone(container).dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)
  })

  it('dropped images fill the empty slots in order', async () => {
    const onPickFiles = vi.fn((files: readonly PickedFile[]) =>
      files.map((file) => `url:${file.name}`),
    )
    const { container, onChange } = await mountEditor({ slots: ['kept', null, null], onPickFiles })
    const png = new File(['a'], 'a.png', { type: 'image/png' })
    const jpg = new File(['b'], 'b.jpg', { type: 'image/jpeg' })
    const prevented = await drop(zone(container), [png, jpg])
    expect(prevented).toBe(true)
    expect(onPickFiles).toHaveBeenCalledTimes(1)
    const picked = onPickFiles.mock.lastCall?.[0]
    expect(picked).toEqual([
      expect.objectContaining({ name: png.name, appendTo: expect.any(Function) }),
      expect.objectContaining({ name: jpg.name, appendTo: expect.any(Function) }),
    ])
    if (!picked) throw new Error('The gallery did not deliver the dropped images')
    const form = new FormData()
    for (const file of picked) file.appendTo(form, 'photos')
    expect(form.getAll('photos')).toEqual([png, jpg])
    expect(onChange).toHaveBeenCalledAfter(onPickFiles)
    expect(onChange).toHaveBeenCalledExactlyOnceWith(['kept', 'url:a.png', 'url:b.jpg'])
  })

  it('refuses a drop that carries a file the picker would not take', async () => {
    const onPickFiles = vi.fn(() => ['url'])
    const { container, onChange } = await mountEditor({ onPickFiles })
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

describe('ImageGalleryEditor chooser and previews', () => {
  it('resets the shared chooser before calling onPickFiles and updates the triggering slot', async () => {
    const onPickFiles = vi.fn<(files: readonly PickedFile[]) => (string | null)[]>()
    const { container, onChange } = await mountEditor({ slots: [null, null, 'kept'], onPickFiles })
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    const slot = container.querySelector<HTMLElement>('[data-mol-id="image-gallery-editor-slot-1"]')
    if (!input || !slot) throw new Error('The gallery did not render its chooser and empty slot')
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(1)
    expect(input.multiple).toBe(false)
    expect(input.style.display).toBe('none')
    const clicks = vi.fn()
    input.addEventListener('click', clicks)
    zone(container).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    slot.click()
    expect(clicks).toHaveBeenCalledTimes(2)

    let valueAtCallback: string | undefined
    onPickFiles.mockImplementation(() => {
      valueAtCallback = input.value
      return ['persisted']
    })
    const first = new File(['png'], 'photo.png', { type: 'image/png' })
    const second = new File(['gif'], 'photo.gif', { type: 'image/gif' })
    chooseFiles(input, [first, second])
    expect(valueAtCallback).toBe('')
    expect(onPickFiles).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        name: first.name,
        type: first.type,
        size: first.size,
        appendTo: expect.any(Function),
        arrayBuffer: expect.any(Function),
      }),
    ])
    expect(onChange).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(onChange).toHaveBeenCalledExactlyOnceWith([null, 'persisted', 'kept'])
  })

  it('releases local object URLs after slot replacement and on unmount', async () => {
    const first = 'blob:preview-1'
    const second = 'blob:preview-2'
    const createObjectURL = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
    const revokeObjectURL = vi.fn()
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL
        static revokeObjectURL = revokeObjectURL
      },
    )
    const { container, onChange, setSlots } = await mountEditor({ slots: [null, null, 'kept'] })
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    if (!input) throw new Error('The gallery did not render its chooser')
    const photo = new File(['png'], 'photo.png', { type: 'image/png' })

    chooseFiles(input, [photo])
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledExactlyOnceWith([first, null, 'kept']))
    await setSlots([first, null, 'kept'])
    expect(revokeObjectURL).not.toHaveBeenCalled()

    await setSlots(['persisted', null, 'kept'])
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith(first)

    chooseFiles(input, [photo])
    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith(['persisted', second, 'kept']))
    await setSlots(['persisted', second, 'kept'])
    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)

    teardown?.()
    teardown = null
    expect(revokeObjectURL.mock.calls).toEqual([[first], [second]])
  })
})

describe('ImageGalleryEditor text', () => {
  it('takes the drop-zone heading and hint through i18n by default', async () => {
    const { container } = await mountEditor({})
    expect(zone(container).textContent).toContain('«imageGalleryEditor.dropZone.title»')
    expect(zone(container).textContent).toContain('«imageGalleryEditor.dropZone.hint»')
  })

  it('takes the remove confirmation through i18n by default', async () => {
    const { container } = await mountEditor({ slots: ['x'] })
    const slot = container.querySelector('[data-mol-id="image-gallery-editor-slot-0"]')!
    slot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()
    expect(container.querySelector('[data-confirm-dialog]')?.textContent).toBe(
      '«imageGalleryEditor.remove.title» | «imageGalleryEditor.remove.message»',
    )
  })

  it('keeps the caller’s own heading, hint and message', async () => {
    const { container } = await mountEditor({
      slots: ['x'],
      dropZoneTitle: 'Drop photos',
      dropZoneHint: 'or pick some',
      confirmRemoveMessage: 'Delete it?',
    })
    expect(zone(container).textContent).toContain('Drop photos')
    expect(zone(container).textContent).toContain('or pick some')
    const slot = container.querySelector('[data-mol-id="image-gallery-editor-slot-0"]')!
    slot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()
    expect(container.querySelector('[data-confirm-dialog]')?.textContent).toContain('Delete it?')
  })
})
