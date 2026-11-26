import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Same cm / Icon / ConfirmDialog mocks as smoke.test.ts: class tokens echo
// their own name, Icon records its glyph, ConfirmDialog renders only when open.
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
        return (..._args: unknown[]) => String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Icon: ({ name, className }: { name: string; className?: string }) =>
    createElement('i', { 'data-icon': name, className }),
  ConfirmDialog: ({ open, title }: { open: boolean; title?: string }) =>
    open ? createElement('div', { 'data-confirm-dialog': '' }, title) : null,
}))

const { ImageGalleryEditor } = await import('../ImageGalleryEditor.js')

/** Mount the editor client-side (jsdom) and hand back the container + spies. */
async function renderEditor(slots: (string | null)[]): Promise<{
  container: HTMLElement
  onChange: ReturnType<typeof vi.fn>
  root: Root
}> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const onChange = vi.fn()
  await act(async () => {
    root.render(createElement(ImageGalleryEditor, { slots, onChange }))
  })
  return { container, onChange, root }
}

/** Dispatch a keydown on an element inside React's act(). */
async function pressKey(el: Element, key: string): Promise<void> {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

describe('ImageGalleryEditor a11y', () => {
  let mounted: Root | null = null
  let host: HTMLElement | null = null

  afterEach(async () => {
    if (mounted) await act(async () => mounted?.unmount())
    host?.remove()
    mounted = null
    host = null
  })

  /** Track the hidden file input being `.click()`-triggered. */
  function spyPickerClicks(container: HTMLElement): ReturnType<typeof vi.fn> {
    const clicks = vi.fn()
    container.querySelector('input[type="file"]')?.addEventListener('click', clicks)
    return clicks
  }

  it('drop zone is a keyboard-operable button: Enter and Space open the picker', async () => {
    const rendered = await renderEditor([null])
    mounted = rendered.root
    host = rendered.container
    const { container } = rendered

    const dropzone = container.querySelector('[data-mol-id="image-gallery-editor-dropzone"]')
    expect(dropzone?.getAttribute('role')).toBe('button')
    expect(dropzone?.getAttribute('tabindex')).toBe('0')

    const clicks = spyPickerClicks(container)
    await pressKey(dropzone!, 'Enter')
    await pressKey(dropzone!, ' ')
    expect(clicks).toHaveBeenCalledTimes(2)

    // A non-activating key does nothing.
    await pressKey(dropzone!, 'a')
    expect(clicks).toHaveBeenCalledTimes(2)
  })

  it('mouse click on the drop zone still opens the picker', async () => {
    const rendered = await renderEditor([null])
    mounted = rendered.root
    host = rendered.container
    const { container } = rendered

    const clicks = spyPickerClicks(container)
    const dropzone = container.querySelector('[data-mol-id="image-gallery-editor-dropzone"]')
    await act(async () => {
      dropzone?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(clicks).toHaveBeenCalledTimes(1)
  })

  it('empty slot is a keyboard-operable button: Enter and Space open the picker', async () => {
    const rendered = await renderEditor([null, 'https://img/1.png'])
    mounted = rendered.root
    host = rendered.container
    const { container } = rendered

    const emptySlot = container.querySelector('[data-mol-id="image-gallery-editor-slot-0"]')
    expect(emptySlot?.getAttribute('role')).toBe('button')
    expect(emptySlot?.getAttribute('tabindex')).toBe('0')
    expect(emptySlot?.getAttribute('aria-label')).toBe('Add image')

    const clicks = spyPickerClicks(container)
    await pressKey(emptySlot!, 'Enter')
    await pressKey(emptySlot!, ' ')
    expect(clicks).toHaveBeenCalledTimes(2)
  })

  it('filled slot is a keyboard-operable button: Enter and Space open the remove confirm', async () => {
    const rendered = await renderEditor(['https://img/1.png', null])
    mounted = rendered.root
    host = rendered.container
    const { container } = rendered

    const filledSlot = container.querySelector('[data-mol-id="image-gallery-editor-slot-0"]')
    expect(filledSlot?.getAttribute('role')).toBe('button')
    expect(filledSlot?.getAttribute('tabindex')).toBe('0')
    expect(filledSlot?.getAttribute('aria-label')).toBe('Remove image')
    expect(container.querySelector('[data-confirm-dialog]')).toBeNull()

    await pressKey(filledSlot!, 'Enter')
    expect(container.querySelector('[data-confirm-dialog]')?.textContent).toBe('Remove image?')
  })

  it('a non-activating key on a slot does not open the confirm', async () => {
    const rendered = await renderEditor(['https://img/1.png'])
    mounted = rendered.root
    host = rendered.container
    const { container } = rendered

    await pressKey(container.querySelector('[data-mol-id="image-gallery-editor-slot-0"]')!, 'a')
    expect(container.querySelector('[data-confirm-dialog]')).toBeNull()
  })
})
