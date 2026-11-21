// @vitest-environment jsdom
/**
 * Unit tests of `NodeEditorRadioGroup` — the port of
 * `@molecule/app-node-editor-panel-react`'s own suite. The React suite renders
 * the component and asserts the markup and native radio behaviour; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same things.
 *
 * @module
 */

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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { NodeEditorRadioGroup } from '../node-editor-radio-group.component.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * `sp(...)` returns an empty style object, every other property/method
 * access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<UIClassMap> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      if (prop === 'sp') return () => ({})
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({} as UIClassMap, handler)
}

const OPTIONS = [
  { value: 'conversational', label: 'Conversational' },
  { value: 'structured', label: 'Structured' },
  { value: 'hybrid', label: 'Hybrid' },
]

/** A mounted spec host: its DOM and teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the radio group through a JIT host template, written the way an
 * Angular app would write it.
 *
 * @param props - The props object the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [NodeEditorRadioGroup],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div mol-node-editor-radio-group [options]="p['options']" [value]="p['value']" [onChange]="p['onChange']"></div>`,
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

/** Queries one element, failing the test when it is absent. */
function query(host: HTMLElement, selector: string): HTMLElement {
  const element = host.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  return element
}

/** Mounted instances, torn down after each test. */
const mounted: Mounted[] = []

/**
 * Mounts a radio group and registers it for teardown.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const m = await mount(props)
  mounted.push(m)
  return m
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('<NodeEditorRadioGroup>', () => {
  it('renders a radio group with one checked native radio per option', async () => {
    const { host } = await render({ value: 'structured', onChange: () => {}, options: OPTIONS })
    expect(host.querySelector('[role="radiogroup"]')).toBeTruthy()
    const radios = Array.from(host.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
    expect(radios).toHaveLength(3)
    // One shared name makes them one group: the browser's arrow keys move between them.
    expect(new Set(radios.map((r) => r.name)).size).toBe(1)
    expect(query(host, 'input[value="structured"]')).toHaveProperty('checked', true)
    expect(query(host, 'input[value="conversational"]')).toHaveProperty('checked', false)
    expect(
      query(host, 'input[value="hybrid"]').closest('[data-mol-id="node-editor-radio-hybrid"]'),
    ).toBeTruthy()
  })

  it('clicking an option tile selects it', async () => {
    const onChange = vi.fn<(value: string) => void>()
    const { host } = await render({ value: 'structured', onChange, options: OPTIONS })
    query(host, '[data-mol-id="node-editor-radio-hybrid"]').click()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('hybrid')
  })

  it('choosing a radio (keyboard or assistive technology) selects that option', async () => {
    const onChange = vi.fn<(value: string) => void>()
    const { host } = await render({ value: 'structured', onChange, options: OPTIONS })
    query(host, 'input[value="conversational"]').click()
    expect(onChange).toHaveBeenCalledWith('conversational')
  })

  it('the ring is decoration, hidden from assistive technology', async () => {
    const { host } = await render({ value: 'structured', onChange: () => {}, options: OPTIONS })
    const tile = query(host, '[data-mol-id="node-editor-radio-structured"]')
    expect(tile.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })
})
