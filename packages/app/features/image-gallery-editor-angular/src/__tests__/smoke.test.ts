// @vitest-environment jsdom
/**
 * Unit tests for the Angular `ImageGalleryEditor` — a port of
 * `@molecule/app-image-gallery-editor-react/src/__tests__/smoke.test.ts`:
 * the same behavioral assertions, rendered with Angular's real renderer in
 * jsdom (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses).
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
        return (..._args: unknown[]) => String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// Icon stub: records the glyph name (the mocked cm values are functions, so a
// function class token is called first); ConfirmDialog stub: shows the title
// while open — the same markers the React suite's `@molecule/app-ui-react`
// stubs render. `styleText` stays the real one (it never touches the bonds).
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
 * Mounts the editor through a JIT host template, written exactly the way an
 * Angular app would write it, with the given props.
 *
 * @param props - The props the host binds (over a `slots: [null]` base).
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ImageGalleryEditor as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<section mol-image-gallery-editor [slots]="p['slots'] ?? [null]" [onPickFiles]="p['onPickFiles']" [maxImages]="p['maxImages']" [header]="p['header']" [counter]="p['counter']" [dropZoneTitle]="p['dropZoneTitle']" [dropZoneHint]="p['dropZoneHint']" [confirmRemoveMessage]="p['confirmRemoveMessage']" [statusMessage]="p['statusMessage']" [emptySlotIcon]="p['emptySlotIcon']" (change)="p['onChange'] && p['onChange']($event)"></section>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
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

/** Renders the editor with the given props and returns the markup it produced. */
const html = async (props: Record<string, unknown>): Promise<string> => {
  mounted = await mount(props)
  return mounted.host.innerHTML
}

describe('ImageGalleryEditor', () => {
  const baseSlots: (string | null)[] = [null, 'https://img/1.png', null]

  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod.ImageGalleryEditor).toBe('function')
  })

  it('hides the file input via a real display:none style, not a raw `hidden` class', async () => {
    const markup = await html({ slots: baseSlots, onChange: () => {} })
    const input = markup.match(/<input[^>]*type="file"[^>]*>/)?.[0] ?? ''
    expect(input).not.toBe('')
    // Inline display:none actually hides it out of the box (generates nothing).
    expect(input).toMatch(/style="[^"]*display:\s*none/)
    // ...and NOT the raw `hidden` utility that never generated in a scaffold.
    expect(input).not.toMatch(/class="[^"]*\bhidden\b/)
  })

  it('styles every element through cm.* tokens — no raw Tailwind/M3 literals', async () => {
    const markup = await html({
      slots: baseSlots,
      onChange: () => {},
      counter: '1 / 3',
      statusMessage: 'Uploading',
    })
    // Real cm tokens present (the mock echoes each token name into className).
    expect(markup).toContain('surfaceSecondary')
    expect(markup).toContain('grid')
    expect(markup).toContain('flex')
    expect(markup).toContain('trackingWide') // cm.trackingWide, not raw `tracking-widest`
    // None of the raw M3 / Tailwind literals a plain scaffold never @source-scans.
    for (const raw of [
      'bg-surface-container',
      'col-span-',
      'aspect-[',
      'rounded-xl',
      'border-outline-variant',
      'border-dashed',
      'text-on-surface',
      'text-stone-',
      'text-secondary',
      'font-headline',
      'material-symbols',
      'group-hover',
      'tracking-widest',
      'object-cover',
    ]) {
      expect(markup).not.toContain(raw)
    }
  })

  it('renders real SVG Icon glyphs (upload / trash / image), not font ligatures', async () => {
    const markup = await html({ slots: ['https://img/1.png', null], onChange: () => {} })
    expect(markup).toContain('data-icon="upload"') // drop zone
    expect(markup).toContain('data-icon="trash"') // filled-slot delete affordance
    expect(markup).toContain('data-icon="image"') // empty slot (default emptySlotIcon)
  })

  it('honors a custom emptySlotIcon', async () => {
    const markup = await html({ slots: [null], onChange: () => {}, emptySlotIcon: 'star' })
    expect(markup).toContain('data-icon="star"')
  })

  it('renders header, counter and status message content', async () => {
    const markup = await html({
      slots: [null],
      onChange: () => {},
      counter: '0 / 24',
      statusMessage: 'Saved',
    })
    expect(markup).toContain('0 / 24')
    expect(markup).toContain('Saved')
    expect(markup).toContain('data-mol-id="image-gallery-editor-status"')
  })
})
