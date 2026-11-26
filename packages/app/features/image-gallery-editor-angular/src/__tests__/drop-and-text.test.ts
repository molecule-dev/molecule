// @vitest-environment jsdom
/**
 * Unit tests for the Angular `ImageGalleryEditor`'s drop zone and text — a
 * port of `@molecule/app-image-gallery-editor-react/src/__tests__/drop-and-text.test.ts`:
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

import { provideDomPlacement } from '@molecule/app-angular'

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
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `«${key}»`,
  }),
}))

// Icon stub: records the glyph name; ConfirmDialog stub: shows the title and
// description while open — the same markers the React suite's
// `@molecule/app-ui-react` stubs render. `styleText` stays the real one.
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
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-confirm-dialog',
    standalone: true,
    inputs: ['open'],
    outputs: ['close', 'confirm'],
    template: `@if (open) {<div data-confirm-dialog=""><ng-content select="[slot=title]" />{{ sep }}<ng-content select="[slot=description]" /></div>}`,
  })(
    class ConfirmDialogStub {
      /** Whether the dialog is open. */
      open?: boolean
      /** The close output (cancel, escape, backdrop). */
      readonly close = new core.EventEmitter<unknown>()
      /** The confirm output. */
      readonly confirm = new core.EventEmitter<unknown>()
      /**
           The separator between the title and the description (an interpolated
          bound text, so Angular's whitespace stripping cannot move it).
       */
      readonly sep = ' | '
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
 * Mounts the editor through a JIT host template with the given props.
 *
 * @param props - The props the host binds (over a `slots: [null]` base).
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ImageGalleryEditor as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<section mol-image-gallery-editor [slots]="p['slots'] ?? [null]" [onPickFiles]="p['onPickFiles']" [dropZoneTitle]="p['dropZoneTitle']" [dropZoneHint]="p['dropZoneHint']" [confirmRemoveMessage]="p['confirmRemoveMessage']" (change)="p['onChange'] && p['onChange']($event)"></section>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    tick: () => {
      appRef.tick()
    },
    destroy: () => {
      appRef.destroy()
      host.remove()
    },
  }
}

let mounted: Mounted | null = null

afterEach(() => {
  mounted?.destroy()
  mounted = null
})

/**
 * Mounts the editor in jsdom.
 *
 * @param props - Props over `slots` and a spied `onChange`.
 * @returns The container and the `onChange` spy.
 */
async function mountEditor(
  props: Record<string, unknown>,
): Promise<{ container: HTMLElement; onChange: ReturnType<typeof vi.fn> }> {
  const onChange = vi.fn()
  mounted = await mount({ slots: [null], onChange, ...props })
  await Promise.resolve()
  mounted.tick()
  return { container: mounted.host, onChange }
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
  await Promise.resolve()
  return event.defaultPrevented
}

const zone = (c: HTMLElement): Element =>
  c.querySelector('[data-mol-id="image-gallery-editor-dropzone"]')!

describe('ImageGalleryEditor drop zone', () => {
  it('accepts a drag over it, so the browser lets the drop through', async () => {
    const { container } = await mountEditor({})
    const over = new Event('dragover', { bubbles: true, cancelable: true })
    zone(container).dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)
  })

  it('dropped images fill the empty slots in order', async () => {
    const onPickFiles = vi.fn((files: FileList) => Array.from(files).map((f) => `url:${f.name}`))
    const { container, onChange } = await mountEditor({ slots: ['kept', null, null], onPickFiles })
    const prevented = await drop(zone(container), [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ])
    mounted?.tick()
    expect(prevented).toBe(true)
    expect(onPickFiles).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(['kept', 'url:a.png', 'url:b.jpg'])
  })

  it('refuses a drop that carries a file the picker would not take', async () => {
    const onPickFiles = vi.fn(() => ['url'])
    const { container, onChange } = await mountEditor({ onPickFiles })
    const prevented = await drop(zone(container), [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
    ])
    mounted?.tick()
    // Still prevented, so the browser does not open the dropped file instead.
    expect(prevented).toBe(true)
    expect(onPickFiles).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
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
    mounted?.tick()
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
    mounted?.tick()
    expect(container.querySelector('[data-confirm-dialog]')?.textContent).toContain('Delete it?')
  })
})
