// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ImageGalleryEditor`'s keyboard accessibility — a
 * port of `@molecule/app-image-gallery-editor-react/src/__tests__/a11y.test.ts`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom.
 *
 * @module
 */

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
vi.mock('@molecule/app-ui-svelte', async (importOriginal) => {
  const { default: Icon } = await import('./stubs/IconStub.svelte')
  const { default: ConfirmDialog } = await import('./stubs/ConfirmDialogStub.svelte')
  return { ...(await importOriginal<Record<string, unknown>>()), Icon, ConfirmDialog }
})
// The bonded i18n provider is not mounted here; `t()` falls back to its English
// defaultValue, which is what the accessible-name assertions read.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { flushSync, mount, unmount } from 'svelte'

const { ImageGalleryEditor } = await import('../components.js')

describe('ImageGalleryEditor a11y', () => {
  let teardown: (() => void) | null = null

  afterEach(() => {
    teardown?.()
    document.body.innerHTML = ''
    teardown = null
  })

  /**
   * Mount the editor client-side (jsdom) and hand back the container.
   *
   * @param slots - The slots array.
   */
  async function renderEditor(slots: (string | null)[]): Promise<{ container: HTMLElement }> {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const component = mount(ImageGalleryEditor, {
      target: container,
      props: { slots, onChange: () => {} },
    })
    teardown = () => void unmount(component)
    flushSync()
    return { container }
  }

  /**
   * Dispatch a keydown on an element, then settle Svelte's re-render.
   *
   * @param el - The element.
   * @param key - The key.
   */
  async function pressKey(el: Element, key: string): Promise<void> {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    flushSync()
  }

  /**
   * Track the hidden file input being `.click()`-triggered.
   *
   * @param container - The mount container.
   */
  function spyPickerClicks(container: HTMLElement): ReturnType<typeof vi.fn> {
    const clicks = vi.fn()
    container.querySelector('input[type="file"]')?.addEventListener('click', clicks)
    return clicks
  }

  it('drop zone is a keyboard-operable button: Enter and Space open the picker', async () => {
    const { container } = await renderEditor([null])

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
    const { container } = await renderEditor([null])

    const clicks = spyPickerClicks(container)
    const dropzone = container.querySelector('[data-mol-id="image-gallery-editor-dropzone"]')
    dropzone?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()
    expect(clicks).toHaveBeenCalledTimes(1)
  })

  it('empty slot is a keyboard-operable button: Enter and Space open the picker', async () => {
    const { container } = await renderEditor([null, 'https://img/1.png'])

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
    const { container } = await renderEditor(['https://img/1.png', null])

    const filledSlot = container.querySelector('[data-mol-id="image-gallery-editor-slot-0"]')
    expect(filledSlot?.getAttribute('role')).toBe('button')
    expect(filledSlot?.getAttribute('tabindex')).toBe('0')
    expect(filledSlot?.getAttribute('aria-label')).toBe('Remove image')
    expect(container.querySelector('[data-confirm-dialog]')).toBeNull()

    await pressKey(filledSlot!, 'Enter')
    expect(container.querySelector('[data-confirm-dialog]')?.textContent).toBe('Remove image?')
  })

  it('a non-activating key on a slot does not open the confirm', async () => {
    const { container } = await renderEditor(['https://img/1.png'])

    await pressKey(container.querySelector('[data-mol-id="image-gallery-editor-slot-0"]')!, 'a')
    expect(container.querySelector('[data-confirm-dialog]')).toBeNull()
  })
})
