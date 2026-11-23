// @vitest-environment jsdom
/**
 * Unit tests of `InlineEdit` — the port of
 * `@molecule/app-inline-edit-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + any templates).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
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
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template for the props every read-state test needs. */
const TEMPLATE = `<mol-inline-edit
  [value]="p['value']"
  [placeholder]="p['placeholder']"
  [className]="p['className']"
  [onSubmit]="p['onSubmit']"
></mol-inline-edit>`

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** Mounts an {@link InlineEdit} and returns the markup it produced. */
const render = async (props: Record<string, unknown>): Promise<string> => {
  const m = await mount(TEMPLATE, { onSubmit: () => {}, ...props })
  mounted.push(m)
  return m.host.innerHTML
}

// The edit state only appears after a click; SSR covers the read state.
describe('InlineEdit (read state)', () => {
  it('renders the value as plain text', async () => {
    const markup = await render({ value: 'Hello world' })
    expect(markup).toContain('Hello world')
  })

  it('exposes a button role for the read-state trigger', async () => {
    const markup = await render({ value: 'x' })
    expect(markup).toContain('role="button"')
  })

  it('shows the placeholder when the value is empty', async () => {
    const def = await render({ value: '' })
    expect(def).toContain('Click to edit')
    const custom = await render({ value: '', placeholder: 'Add a title' })
    expect(custom).toContain('Add a title')
  })

  it('uses renderRead to format the value when supplied', async () => {
    const m = await mount(
      `<mol-inline-edit [value]="p['value']" [renderRead]="read"></mol-inline-edit>
       <ng-template #read let-value><strong data-read>{{ value.toUpperCase() }}</strong></ng-template>`,
      { value: 'raw' },
    )
    mounted.push(m)
    expect(m.host.innerHTML).toContain('data-read')
    expect(m.host.innerHTML).toContain('RAW')
  })

  it('does not render the editor inputs before being clicked', async () => {
    const markup = await render({ value: 'x' })
    expect(markup).not.toContain('mol-input')
    expect(markup).not.toContain('mol-textarea')
  })

  it('forwards className', async () => {
    const markup = await render({ value: 'x', className: 'ie-cls' })
    expect(markup).toContain('ie-cls')
  })

  it('shows and removes the read-state wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div>@if (p['on']) {<mol-inline-edit [value]="'Hello'"></mol-inline-edit>}</div>`,
      { on: false },
    )
    mounted.push(m)
    const read = (): HTMLElement | null => m.host.querySelector('[role="button"]')
    expect(read()).toBeNull()
    await m.setProps({ on: true })
    // React renders the read state beside the (unwrapped) component host.
    expect(read()).not.toBeNull()
    expect(read()?.isConnected).toBe(true)
    expect(m.host.textContent).toContain('Hello')
    await m.setProps({ on: false })
    expect(read()).toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><mol-inline-edit [value]="p['value']"></mol-inline-edit><i>b</i>`,
      {
        value: 'Hello',
      },
    )
    mounted.push(m)
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    // The read-state root is React's <span>, standing in the (removed) host's place.
    expect(children()).toEqual(['i', 'span', 'i'])
    // Clicking the read state opens the editor, whose React root is a <div>.
    ;(m.host.querySelector('[role="button"]') as HTMLElement).click()
    await m.setProps({})
    expect(children()).toEqual(['i', 'div', 'i'])
  })
})
