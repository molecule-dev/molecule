// @vitest-environment jsdom
/**
 * `<InlineEdit>` draft resets — the port of
 * `@molecule/app-inline-edit-react/src/__tests__/inline-edit-draft-reset.test.tsx`:
 * a new `value` prop replaces the draft in the same change-detection pass,
 * while an unchanged prop leaves a typed draft alone. The port mounts the same
 * tree through Angular's real renderer (the conformance kit's `mount` shape)
 * and asserts on the same input value.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

import { InlineEdit } from '../inline-edit.component.js'

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): void
  /** Flushes one change-detection pass. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param template - The host template the component element lives in.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [InlineEdit],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
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
  const flush = (): void => appRef.tick()
  return {
    host,
    setProps: (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      flush()
    },
    flush,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template binding the props this test needs. */
const TEMPLATE = `<mol-inline-edit
  [value]="p['value']"
  [onSubmit]="p['onSubmit']"
></mol-inline-edit>`

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts an {@link InlineEdit} that stays mounted, so a test can click into it.
 *
 * @param value - The initial value prop.
 * @returns The mounted host.
 */
async function render(value: string): Promise<Mounted> {
  const m = await mount(TEMPLATE, { value, onSubmit: () => {} })
  mounted.push(m)
  return m
}

/** The mounted editor input. */
function editor(host: HTMLElement): HTMLInputElement {
  const input = host.querySelector('input')
  if (!(input instanceof HTMLInputElement)) throw new Error('no editor input rendered')
  return input
}

/** Clicks the read-state trigger open and flushes the render. */
function open(m: Mounted): void {
  m.host.querySelector('[role="button"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  m.flush()
}

/** Types a new value into the editor input and flushes the render. */
function type(m: Mounted, next: string): void {
  const input = editor(m.host)
  input.value = next
  input.dispatchEvent(new Event('input', { bubbles: true }))
  m.flush()
}

describe('<InlineEdit> draft reset', () => {
  it('shows a new value prop in the same commit as the prop change', async () => {
    const m = await render('alpha')
    open(m)
    expect(editor(m.host).value).toBe('alpha')
    type(m, 'typed')
    expect(editor(m.host).value).toBe('typed')
    m.setProps({ value: 'beta' })
    expect(editor(m.host).value).toBe('beta')
  })

  it('keeps a typed draft when the value prop is unchanged', async () => {
    const m = await render('alpha')
    open(m)
    type(m, 'typed')
    m.setProps({ value: 'alpha' })
    expect(editor(m.host).value).toBe('typed')
  })
})
