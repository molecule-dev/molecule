// @vitest-environment jsdom
/**
 * Accessible-naming tests for the Angular `NodeEditorSlider` and
 * `NodeEditorToggle` — ports of
 * `@molecule/app-node-editor-panel-react/src/__tests__/NodeEditorLabeling.test.tsx`:
 * the range input is named by the section's `<label for>`, and the switch is
 * named by its title paragraph (`aria-labelledby`) or an explicit `ariaLabel`,
 * and described by its subtitle (`aria-describedby`).
 *
 * @module
 */

// Bonds the reference ClassMap before any UI package is imported: `<mol-switch>` styles its
// hidden checkbox from `cm().srOnly`, a plain token Angular's class binding needs as a string.
import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import { NodeEditorSlider } from '../node-editor-slider.component.js'
import { NodeEditorToggle } from '../node-editor-toggle.component.js'

/** A mounted spec host: its DOM and teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Every spec host gets its own selector: Angular flags a repeated component id (NG0912). */
let nextHostId = 0

/**
 * Mounts a component through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param directive - The component class the template marks its host with.
 * @param template - The host template, binding `p` for props.
 * @param props - The props object the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  directive: Type<unknown>,
  template: string,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${nextHostId++}`,
    standalone: true,
    imports: [directive],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
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

/**
 * The text of the element an id names.
 *
 * @param host - The rendered tree.
 * @param id - The id the ARIA attribute carries.
 * @returns The referenced element's text.
 */
function textOfId(host: HTMLElement, id: string): string | null {
  return query(host, `[id="${id}"]`).textContent
}

/** Mounted instances, torn down after each test. */
const mounted: Mounted[] = []

/**
 * Mounts a component and registers it for teardown.
 *
 * @param directive - The component class the template marks its host with.
 * @param template - The host template, binding `p` for props.
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(
  directive: Type<unknown>,
  template: string,
  props: Record<string, unknown>,
): Promise<HTMLElement> {
  const m = await mount(directive, template, props)
  mounted.push(m)
  return m.host
}

/** The host template for a slider, binding the props the tests pass. */
const SLIDER_TEMPLATE = `<div
  mol-node-editor-slider
  [label]="p['label']"
  [value]="p['value']"
  [onChange]="p['onChange']"
  [valueDisplay]="p['valueDisplay']"
></div>`

/** The host template for a toggle, binding the props the tests pass. */
const TOGGLE_TEMPLATE = `<div
  mol-node-editor-toggle
  [title]="p['title']"
  [subtitle]="p['subtitle']"
  [ariaLabel]="p['ariaLabel']"
  [checked]="p['checked']"
  [onChange]="p['onChange']"
></div>`

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('<NodeEditorSlider>', () => {
  it('the label names the range input', async () => {
    const host = await render(NodeEditorSlider, SLIDER_TEMPLATE, {
      label: 'Temperature',
      value: 0.7,
      onChange: () => {},
    })
    const label = query(host, 'label')
    const input = query(host, 'input[type="range"]')
    expect(label.getAttribute('for')).toBe(input.id)
    expect(label.getAttribute('for')).not.toBe('')
    expect(label.textContent?.trim()).toBe('Temperature')
  })

  it('a string value display is announced as the value text', async () => {
    const host = await render(NodeEditorSlider, SLIDER_TEMPLATE, {
      label: 'Temperature',
      value: 0.7,
      onChange: () => {},
      valueDisplay: '70%',
    })
    expect(query(host, 'input[type="range"]').getAttribute('aria-valuetext')).toBe('70%')
  })

  it('a node value display sets no value text', async () => {
    const host = await render(
      NodeEditorSlider,
      `<div mol-node-editor-slider [label]="p['label']" [value]="p['value']" [onChange]="p['onChange']">
        <em slot="valueDisplay">70%</em>
      </div>`,
      { label: 'Temperature', value: 0.7, onChange: () => {} },
    )
    expect(query(host, 'input[type="range"]').hasAttribute('aria-valuetext')).toBe(false)
  })
})

describe('<NodeEditorToggle>', () => {
  it('the switch is named by the title', async () => {
    const host = await render(NodeEditorToggle, TOGGLE_TEMPLATE, {
      title: 'Knowledge Base',
      checked: false,
      onChange: () => {},
    })
    const button = query(host, 'button[role="switch"]')
    const labelledBy = button.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(textOfId(host, labelledBy!)?.trim()).toBe('Knowledge Base')
  })

  it('an aria label overrides the title as the name', async () => {
    const host = await render(NodeEditorToggle, TOGGLE_TEMPLATE, {
      title: 'Knowledge Base',
      ariaLabel: 'Toggle knowledge base',
      checked: false,
      onChange: () => {},
    })
    const button = query(host, 'button[role="switch"]')
    expect(button.getAttribute('aria-label')).toBe('Toggle knowledge base')
    expect(button.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('the subtitle describes the switch', async () => {
    const host = await render(NodeEditorToggle, TOGGLE_TEMPLATE, {
      title: 'Knowledge Base',
      subtitle: 'Uses your documents',
      checked: false,
      onChange: () => {},
    })
    const describedBy = query(host, 'button[role="switch"]').getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(textOfId(host, describedBy!)?.trim()).toBe('Uses your documents')
  })

  it('no subtitle sets no description', async () => {
    const host = await render(NodeEditorToggle, TOGGLE_TEMPLATE, {
      title: 'Knowledge Base',
      checked: false,
      onChange: () => {},
    })
    expect(query(host, 'button[role="switch"]').hasAttribute('aria-describedby')).toBe(false)
  })
})
