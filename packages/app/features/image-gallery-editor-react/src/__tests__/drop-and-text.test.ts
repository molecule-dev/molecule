import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PickedFile } from '@molecule/app-filesystem'

import type { ImageGalleryEditorProps } from '../ImageGalleryEditor.js'

// Class tokens echo their own name; Icon records its glyph; ConfirmDialog shows its title and
// description while open.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c).join(' ')
            : () => String(prop),
      },
    ),
}))
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Icon: ({ name }: { name: string }) => createElement('i', { 'data-icon': name }),
  ConfirmDialog: ({
    open,
    title,
    description,
  }: {
    open: boolean
    title?: string
    description?: string
  }) =>
    open
      ? createElement('div', { 'data-confirm-dialog': '' }, `${title ?? ''} | ${description ?? ''}`)
      : null,
}))
// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { ImageGalleryEditor } = await import('../ImageGalleryEditor.js')

let root: Root | null = null
let host: HTMLElement | null = null

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  vi.unstubAllGlobals()
})

/**
 * Mounts the editor in jsdom.
 *
 * @param props - Props over `slots` and a spied `onChange`.
 * @returns The container and the `onChange` spy.
 */
async function mount(
  props: Partial<ImageGalleryEditorProps>,
): Promise<{ container: HTMLElement; onChange: ReturnType<typeof vi.fn> }> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  const onChange = vi.fn()
  await act(async () => {
    root?.render(createElement(ImageGalleryEditor, { slots: [null], onChange, ...props }))
  })
  return { container: host, onChange }
}

/**
 * A FileList jsdom can carry on a drop event.
 *
 * @param files - The files.
 * @returns The list.
 */
const fileList = (files: File[]): FileList =>
  Object.assign([...files], { item: (i: number) => files[i] ?? null })

/**
 * Drops files on an element and reports whether the drop's default was prevented.
 *
 * @param el - The drop target.
 * @param files - The dropped files.
 * @returns Whether a listener called preventDefault.
 */
async function drop(el: Element, files: File[]): Promise<boolean> {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { files: fileList(files) } })
  await act(async () => {
    el.dispatchEvent(event)
  })
  return event.defaultPrevented
}

function target(container: HTMLElement, id: string): Element {
  const node = container.querySelector(`[data-mol-id="${id}"]`)
  if (!node) throw new Error(`Missing gallery target ${id}`)
  return node
}

const zone = (container: HTMLElement): Element => target(container, 'image-gallery-editor-dropzone')

describe('ImageGalleryEditor drop zone', () => {
  it('accepts a drag over it, so the browser lets the drop through', async () => {
    const { container } = await mount({})
    const over = new Event('dragover', { bubbles: true, cancelable: true })
    zone(container).dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)
  })

  it('dropped images fill the empty slots in order', async () => {
    const onPickFiles = vi.fn((files: readonly PickedFile[]) =>
      files.map((file) => `url:${file.name}`),
    )
    const { container, onChange } = await mount({ slots: ['kept', null, null], onPickFiles })
    const png = new File(['a'], 'a.png', { type: 'image/png' })
    const jpg = new File(['b'], 'b.jpg', { type: 'image/jpeg' })
    const prevented = await drop(zone(container), [png, jpg])
    expect(prevented).toBe(true)
    expect(onPickFiles).toHaveBeenCalledTimes(1)
    const picked = onPickFiles.mock.lastCall?.[0]
    if (!picked) throw new Error('The gallery did not deliver the dropped images')
    const form = new FormData()
    for (const file of picked) file.appendTo(form, 'photos')
    expect(form.getAll('photos')).toEqual([png, jpg])
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
    const slot = target(container, 'image-gallery-editor-slot-0')
    await act(async () => {
      slot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
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
    const slot = target(container, 'image-gallery-editor-slot-0')
    await act(async () => {
      slot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('[data-confirm-dialog]')?.textContent).toContain('Delete it?')
  })
})
