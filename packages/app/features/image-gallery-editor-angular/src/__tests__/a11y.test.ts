// @vitest-environment jsdom
/**
 * Unit tests for the Angular `ImageGalleryEditor`'s keyboard accessibility —
 * a port of `@molecule/app-image-gallery-editor-react/src/__tests__/a11y.test.ts`:
 * the same behavioral assertions, rendered with Angular's real renderer in
 * jsdom.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  type Type,
} from '@angular/core'
import { type ApplicationRef, provideZonelessChangeDetection } from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Same cm / Icon / ConfirmDialog mocks as smoke.test.ts: class tokens echo
// their own name, Icon records its glyph, ConfirmDialog renders only when open.
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
        return (..._args: unknown[]) => String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))
// The bonded i18n provider is not mounted here; `t()` falls back to its English
// defaultValue, which is what the accessible-name assertions read.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// Icon stub: records the glyph name; ConfirmDialog stub: shows the title while
// open — the same markers the React suite's `@molecule/app-ui-react` stubs
// render. `styleText` stays the real one.
vi.mock('@molecule/app-ui-angular', async () => {
  const core = await import('@angular/core')
  const actual = await vi.importActual<Record<string, unknown>>('@molecule/app-ui-angular')
  const IconStub = core.Component({
    selector: 'svg[mol-icon-root]',
    standalone: true,
    inputs: ['name', 'size', 'className'],
    host: { '[attr.data-icon]': 'name', '[class]': 'classes' },
    template: '',
  })(
    class IconStub {
      /** The glyph name. */
      name!: string
      /** The caller's class token (a mocked cm token may be a function). */
      className?: unknown

      /** The class list, with a mocked function token unwrapped. */
      get classes(): string | undefined {
        if (typeof this.className === 'function') return String(this.className())
        return typeof this.className === 'string' ? this.className : undefined
      }
    },
  )
  const ConfirmDialogStub = core.Component({
    selector: 'mol-confirm-dialog',
    standalone: true,
    inputs: ['open'],
    outputs: ['close', 'confirm'],
    template: `@if (open) {<div data-confirm-dialog=""><ng-content select="[slot=title]" /></div>}`,
  })(
    class ConfirmDialogStub {
      /** Whether the dialog is open. */
      open?: boolean
      /** The close output (cancel, escape, backdrop). */
      readonly close = new core.EventEmitter<unknown>()
      /** The confirm output. */
      readonly confirm = new core.EventEmitter<unknown>()
    },
  )
  return { ...actual, Icon: IconStub, ConfirmDialog: ConfirmDialogStub }
})

const { ImageGalleryEditor } = await import('../image-gallery-editor.component.js')

/** A mounted spec host: its DOM, a re-render tick, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs change detection (zoneless signals apply on the next tick). */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): void
}

/**
 * Mount the editor client-side (jsdom) and hand back the container.
 *
 * @param slots - The slots array.
 */
async function renderEditor(slots: (string | null)[]): Promise<{ container: HTMLElement }> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ImageGalleryEditor as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<section mol-image-gallery-editor [slots]="slots" (change)="noop()"></section>`,
  })(
    class SpecHost {
      /** The slots the template binds. */
      slots: (string | null)[] = slots

      /** A no-op change handler. */
      noop(): void {}
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  current = {
    host,
    tick: () => {
      appRef.tick()
    },
    destroy: () => {
      appRef.destroy()
      host.remove()
    },
  }
  return { container: host }
}

let current: Mounted | null = null

afterEach(() => {
  current?.destroy()
  current = null
})

/**
 * Dispatch a keydown on an element, then run change detection.
 *
 * @param el - The element.
 * @param key - The key.
 */
async function pressKey(el: Element, key: string): Promise<void> {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  current?.tick()
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

describe('ImageGalleryEditor a11y', () => {
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
    current?.tick()
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
