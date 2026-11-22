// @vitest-environment jsdom
/**
 * Unit tests for the Vue `MindMapCanvas` — a port of
 * `@molecule/app-mind-map-canvas-react/src/__tests__/MindMapCanvas.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
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

import { type App, createApp, defineComponent, h, nextTick, ref } from 'vue'

import { MindMapCanvas } from '../MindMapCanvas.js'
import type { MindMapCanvasProps, MindMapNode } from '../types.js'

/** The apps mounted during one test, unmounted afterwards. */
const apps: App[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

beforeEach(() => {
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = vi.fn()
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  }
})

/** The sample tree the React tests use. */
const sample = (): MindMapNode => ({
  id: 'r',
  text: 'Root',
  children: [
    { id: 'a', text: 'Alpha', children: [{ id: 'a1', text: 'A1', children: [] }] },
    { id: 'b', text: 'Beta', children: [] },
  ],
})

/** Renders `<MindMapCanvas>` with plain props and returns its mount host. */
const renderCanvas = (props: MindMapCanvasProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(MindMapCanvas, props) }))
  app.mount(host)
  apps.push(app)
  return host
}

/**
 * Stateful host that mirrors the controlled-mode pattern apps use: it owns
 * the tree and feeds every `onChange` back into the canvas.
 */
const renderHost = (initial: MindMapNode, rest: Partial<MindMapCanvasProps> = {}): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      setup() {
        const root = ref<MindMapNode>(initial)
        return () =>
          h(MindMapCanvas, {
            root: root.value,
            onChange: (next: MindMapNode) => {
              root.value = next
            },
            ...rest,
          })
      },
    }),
  )
  app.mount(host)
  apps.push(app)
  return host
}

/** Dispatches a double-click, as a user's second click within a double-click does. */
const doubleClick = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
}

/** Types into an input and fires the input event, as a user's typing does. */
const type = (input: HTMLInputElement, value: string): void => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Presses a key in an element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('<MindMapCanvas>', () => {
  it('renders the surface and one body per visible node', () => {
    const host = renderCanvas({ root: sample() })
    expect(host.querySelector('[data-mol-id="mind-map-canvas"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="canvas-surface"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="mind-map-node-body-r"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="mind-map-node-body-a"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="mind-map-node-body-b"]')).not.toBeNull()
  })

  it('draws node.color as the inset accent bar on the body, never a border-left', () => {
    const root = sample()
    root.children[0]!.color = '#00ff00'
    const host = renderCanvas({ root })
    const alpha = host.querySelector('[data-mol-id="mind-map-node-body-a"]') as HTMLElement
    const beta = host.querySelector('[data-mol-id="mind-map-node-body-b"]') as HTMLElement
    expect(alpha.className).toContain('accentCard')
    expect(alpha.style.getPropertyValue('--mol-accent')).toBe('#00ff00')
    expect(alpha.style.borderLeft).toBe('')
    expect(beta.className).not.toContain('accentCard')
  })

  it('hides descendants when the toggle collapses a subtree', async () => {
    const host = renderHost(sample())
    expect(host.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
    const toggle = host.querySelector('[data-mol-id="mind-map-node-toggle-a"]') as HTMLButtonElement
    toggle.click()
    await nextTick()
    expect(host.querySelector('[data-mol-id="mind-map-node-body-a1"]')).toBeNull()
    // Re-expand.
    ;(host.querySelector('[data-mol-id="mind-map-node-toggle-a"]') as HTMLButtonElement).click()
    await nextTick()
    expect(host.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
  })

  it('appends a new child and auto-expands the parent', async () => {
    const host = renderHost({ id: 'r', text: 'Root', collapsed: true, children: [] })
    const add = host.querySelector('[data-mol-id="mind-map-node-add-r"]') as HTMLButtonElement
    add.click()
    await nextTick()
    // After adding, root is expanded → at least one new body should exist
    // for the appended child (we don't know its exact id since it's
    // randomized, so query loosely).
    const bodies = host.querySelectorAll('[data-mol-id^="mind-map-node-body-"]')
    expect(bodies.length).toBeGreaterThanOrEqual(2)
  })

  it('moves focus into the inline editor when it opens (keyboard users can type at once)', async () => {
    const host = renderHost(sample())
    doubleClick(host.querySelector('[data-mol-id="mind-map-node-body-a"]')!)
    await nextTick()
    await nextTick()
    const input = host.querySelector('[data-mol-id="mind-map-node-input-a"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(document.activeElement).toBe(input)
  })

  it('enters inline edit on double-click and commits on Enter', async () => {
    const onNodeEdit = vi.fn()
    const host = renderHost(sample(), { onNodeEdit })
    doubleClick(host.querySelector('[data-mol-id="mind-map-node-body-a"]')!)
    await nextTick()
    const input = host.querySelector('[data-mol-id="mind-map-node-input-a"]') as HTMLInputElement
    expect(input).not.toBeNull()
    type(input, 'Alpha v2')
    await nextTick()
    pressKey(input, 'Enter')
    await nextTick()
    // Input has been removed; new text rendered.
    expect(host.querySelector('[data-mol-id="mind-map-node-input-a"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="mind-map-node-text-a"]')?.textContent).toBe('Alpha v2')
    expect(onNodeEdit).toHaveBeenCalledWith('a', 'Alpha v2')
  })

  it('cancels inline edit on Escape (text unchanged)', async () => {
    const host = renderHost(sample())
    doubleClick(host.querySelector('[data-mol-id="mind-map-node-body-a"]')!)
    await nextTick()
    const input = host.querySelector('[data-mol-id="mind-map-node-input-a"]') as HTMLInputElement
    type(input, 'should not stick')
    await nextTick()
    pressKey(input, 'Escape')
    await nextTick()
    expect(host.querySelector('[data-mol-id="mind-map-node-input-a"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="mind-map-node-text-a"]')?.textContent).toBe('Alpha')
  })

  it('runs in controlled mode: every mutation calls onChange', () => {
    const onChange = vi.fn()
    const root = sample()
    const host = renderCanvas({ root, onChange })
    const toggle = host.querySelector('[data-mol-id="mind-map-node-toggle-a"]') as HTMLButtonElement
    toggle.click()
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]![0] as MindMapNode
    expect(next.children[0]!.collapsed).toBe(true)
  })

  it('respects the layout prop (radial vs horizontal produces different positions)', () => {
    const root: MindMapNode = {
      id: 'r',
      text: 'Root',
      children: [
        { id: 'a', text: 'A', children: [] },
        { id: 'b', text: 'B', children: [] },
      ],
    }
    const radial = renderCanvas({ root, layout: 'radial' })
    const radialA = (radial.querySelector('[data-canvas-node-id="a"]') as HTMLElement).style.left

    const horizontal = renderCanvas({ root, layout: 'horizontal' })
    const horizontalA = (horizontal.querySelector('[data-canvas-node-id="a"]') as HTMLElement).style
      .left
    expect(radialA).not.toEqual(horizontalA)
  })
})
