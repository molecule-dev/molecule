// @vitest-environment jsdom
/**
 * Unit tests of `MindMapCanvas` — the port of
 * `@molecule/app-mind-map-canvas-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
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
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `accentCard`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default, with `{{key}}` placeholders
// interpolated from the values (as the real simple provider does).
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (
      _key: string,
      values?: Record<string, unknown> | null,
      opts?: { defaultValue?: string },
    ) => {
      const text = opts?.defaultValue ?? _key
      if (!values) return text
      return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
        values[name] === undefined ? match : String(values[name]),
      )
    },
  }),
}))

import { MindMapCanvas } from '../mind-map-canvas.component.js'
import type { MindMapNode } from '../types.js'

/** The input bindings every host template passes through `p`. */
const BIND = `[root]="p['root']" [onChange]="p['onChange']" [layout]="p['layout']" [width]="p['width']" [height]="p['height']" [nodeWidth]="p['nodeWidth']" [nodeHeight]="p['nodeHeight']" [onNodeClick]="p['onNodeClick']" [onNodeEdit]="p['onNodeEdit']" [className]="p['className']"`

/** The sample tree the React tests use. */
const sample = (): MindMapNode => ({
  id: 'r',
  text: 'Root',
  children: [
    { id: 'a', text: 'Alpha', children: [{ id: 'a1', text: 'A1', children: [] }] },
    { id: 'b', text: 'Beta', children: [] },
  ],
})

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Flushes change detection, as an event does before the browser draws. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): void
}

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountCanvas(props: Record<string, unknown> = {}): Promise<Mounted> {
  const template = `<div mol-mind-map ${BIND}></div>`
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [MindMapCanvas],
    changeDetection: ChangeDetectionStrategy.Eager,
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

beforeEach(() => {
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = vi.fn()
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  }
})

describe('<MindMapCanvas>', () => {
  it('renders the surface and one body per visible node', async () => {
    const mounted = await mountCanvas({ root: sample() })
    expect(mounted.host.querySelector('[data-mol-id="mind-map-canvas"]')).not.toBeNull()
    expect(mounted.host.querySelector('[data-mol-id="canvas-surface"]')).not.toBeNull()
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-body-r"]')).not.toBeNull()
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-body-a"]')).not.toBeNull()
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-body-b"]')).not.toBeNull()
    mounted.destroy()
  })

  it('draws node.color as the inset accent bar on the body, never a border-left', async () => {
    const root = sample()
    root.children[0]!.color = '#00ff00'
    const mounted = await mountCanvas({ root })
    const alpha = mounted.host.querySelector('[data-mol-id="mind-map-node-body-a"]') as HTMLElement
    const beta = mounted.host.querySelector('[data-mol-id="mind-map-node-body-b"]') as HTMLElement
    expect(alpha.className).toContain('accentCard')
    expect(alpha.style.getPropertyValue('--mol-accent')).toBe('#00ff00')
    expect(alpha.style.borderLeft).toBe('')
    expect(beta.className).not.toContain('accentCard')
    mounted.destroy()
  })

  it('hides descendants when the toggle collapses a subtree', async () => {
    const mounted = await mountCanvas({ root: sample() })
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
    const toggle = mounted.host.querySelector(
      '[data-mol-id="mind-map-node-toggle-a"]',
    ) as HTMLButtonElement
    toggle.click()
    mounted.tick()
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-body-a1"]')).toBeNull()
    // Re-expand.
    ;(
      mounted.host.querySelector('[data-mol-id="mind-map-node-toggle-a"]') as HTMLButtonElement
    ).click()
    mounted.tick()
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
    mounted.destroy()
  })

  it('appends a new child and auto-expands the parent', async () => {
    const mounted = await mountCanvas({
      root: { id: 'r', text: 'Root', collapsed: true, children: [] },
    })
    const add = mounted.host.querySelector(
      '[data-mol-id="mind-map-node-add-r"]',
    ) as HTMLButtonElement
    add.click()
    mounted.tick()
    // After adding, root is expanded → at least one new body should exist
    // for the appended child (we don't know its exact id since it's
    // randomized, so query loosely).
    const bodies = mounted.host.querySelectorAll('[data-mol-id^="mind-map-node-body-"]')
    expect(bodies.length).toBeGreaterThanOrEqual(2)
    mounted.destroy()
  })

  it('moves focus into the inline editor when it opens (keyboard users can type at once)', async () => {
    const mounted = await mountCanvas({ root: sample() })
    const body = mounted.host.querySelector('[data-mol-id="mind-map-node-body-a"]') as HTMLElement
    body.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    mounted.tick()
    const input = mounted.host.querySelector(
      '[data-mol-id="mind-map-node-input-a"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    expect(document.activeElement).toBe(input)
    mounted.destroy()
  })

  it('enters inline edit on double-click and commits on Enter', async () => {
    const onNodeEdit = vi.fn()
    const mounted = await mountCanvas({ root: sample(), onNodeEdit })
    const body = mounted.host.querySelector('[data-mol-id="mind-map-node-body-a"]') as HTMLElement
    body.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    mounted.tick()
    const input = mounted.host.querySelector(
      '[data-mol-id="mind-map-node-input-a"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = 'Alpha v2'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    mounted.tick()
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    mounted.tick()
    // Input has been removed; new text rendered.
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-input-a"]')).toBeNull()
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-text-a"]')?.textContent).toBe(
      'Alpha v2',
    )
    expect(onNodeEdit).toHaveBeenCalledWith('a', 'Alpha v2')
    mounted.destroy()
  })

  it('cancels inline edit on Escape (text unchanged)', async () => {
    const mounted = await mountCanvas({ root: sample() })
    const body = mounted.host.querySelector('[data-mol-id="mind-map-node-body-a"]') as HTMLElement
    body.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    mounted.tick()
    const input = mounted.host.querySelector(
      '[data-mol-id="mind-map-node-input-a"]',
    ) as HTMLInputElement
    input.value = 'should not stick'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    mounted.tick()
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    mounted.tick()
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-input-a"]')).toBeNull()
    expect(mounted.host.querySelector('[data-mol-id="mind-map-node-text-a"]')?.textContent).toBe(
      'Alpha',
    )
    mounted.destroy()
  })

  it('runs in controlled mode: every mutation calls onChange', async () => {
    const onChange = vi.fn()
    const root = sample()
    const mounted = await mountCanvas({ root, onChange })
    const toggle = mounted.host.querySelector(
      '[data-mol-id="mind-map-node-toggle-a"]',
    ) as HTMLButtonElement
    toggle.click()
    mounted.tick()
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]![0] as MindMapNode
    expect(next.children[0]!.collapsed).toBe(true)
    mounted.destroy()
  })

  it('respects the layout prop (radial vs horizontal produces different positions)', async () => {
    const root: MindMapNode = {
      id: 'r',
      text: 'Root',
      children: [
        { id: 'a', text: 'A', children: [] },
        { id: 'b', text: 'B', children: [] },
      ],
    }
    const radial = await mountCanvas({ root, layout: 'radial' })
    const radialA = (radial.host.querySelector('[data-canvas-node-id="a"]') as HTMLElement).style
      .left
    radial.destroy()

    const horizontal = await mountCanvas({ root, layout: 'horizontal' })
    const horizontalA = (horizontal.host.querySelector('[data-canvas-node-id="a"]') as HTMLElement)
      .style.left
    horizontal.destroy()
    expect(radialA).not.toEqual(horizontalA)
  })
})
