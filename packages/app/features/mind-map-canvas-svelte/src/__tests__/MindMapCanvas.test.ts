// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `MindMapCanvas` — a port of
 * `@molecule/app-mind-map-canvas-react/src/__tests__/MindMapCanvas.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom) and the
 * mocked ClassMap and i18n the React tests use.
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
vi.mock('@molecule/app-svelte', () => ({
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

import { flushSync, mount, unmount } from 'svelte'

import MindMapCanvas from '../MindMapCanvas.svelte'
import type { MindMapCanvasProps, MindMapNode } from '../types.js'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
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
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(MindMapCanvas, { target, props }))
  flushSync()
  return target
}

/**
 * Host that mirrors the controlled-mode pattern apps use: without `onChange`
 * the canvas manages its own copy of the tree, so the fold/edit/add assertions
 * observe the same DOM the React test's stateful host produced.
 */
const renderHost = (initial: MindMapNode, rest: Partial<MindMapCanvasProps> = {}): HTMLElement =>
  renderCanvas({ root: initial, ...rest })

/** Dispatches a double-click, as a user's second click within a double-click does. */
const doubleClick = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
  flushSync()
}

/** Types into an input and fires the input event, as a user's typing does. */
const type = (input: HTMLInputElement, value: string): void => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
}

/** Presses a key in an element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  flushSync()
}

describe('<MindMapCanvas>', () => {
  it('renders the surface and one body per visible node', () => {
    const target = renderCanvas({ root: sample() })
    expect(target.querySelector('[data-mol-id="mind-map-canvas"]')).not.toBeNull()
    expect(target.querySelector('[data-mol-id="canvas-surface"]')).not.toBeNull()
    expect(target.querySelector('[data-mol-id="mind-map-node-body-r"]')).not.toBeNull()
    expect(target.querySelector('[data-mol-id="mind-map-node-body-a"]')).not.toBeNull()
    expect(target.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
    expect(target.querySelector('[data-mol-id="mind-map-node-body-b"]')).not.toBeNull()
  })

  it('draws node.color as the inset accent bar on the body, never a border-left', () => {
    const root = sample()
    root.children[0]!.color = '#00ff00'
    const target = renderCanvas({ root })
    const alpha = target.querySelector('[data-mol-id="mind-map-node-body-a"]') as HTMLElement
    const beta = target.querySelector('[data-mol-id="mind-map-node-body-b"]') as HTMLElement
    expect(alpha.className).toContain('accentCard')
    expect(alpha.style.getPropertyValue('--mol-accent')).toBe('#00ff00')
    expect(alpha.style.borderLeft).toBe('')
    expect(beta.className).not.toContain('accentCard')
  })

  it('hides descendants when the toggle collapses a subtree', () => {
    const target = renderHost(sample())
    expect(target.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
    const toggle = target.querySelector(
      '[data-mol-id="mind-map-node-toggle-a"]',
    ) as HTMLButtonElement
    toggle.click()
    flushSync()
    expect(target.querySelector('[data-mol-id="mind-map-node-body-a1"]')).toBeNull()
    // Re-expand.
    ;(target.querySelector('[data-mol-id="mind-map-node-toggle-a"]') as HTMLButtonElement).click()
    flushSync()
    expect(target.querySelector('[data-mol-id="mind-map-node-body-a1"]')).not.toBeNull()
  })

  it('appends a new child and auto-expands the parent', () => {
    const target = renderHost({ id: 'r', text: 'Root', collapsed: true, children: [] })
    const add = target.querySelector('[data-mol-id="mind-map-node-add-r"]') as HTMLButtonElement
    add.click()
    flushSync()
    // After adding, root is expanded → at least one new body should exist
    // for the appended child (we don't know its exact id since it's
    // randomized, so query loosely).
    const bodies = target.querySelectorAll('[data-mol-id^="mind-map-node-body-"]')
    expect(bodies.length).toBeGreaterThanOrEqual(2)
  })

  it('moves focus into the inline editor when it opens (keyboard users can type at once)', () => {
    const target = renderHost(sample())
    doubleClick(target.querySelector('[data-mol-id="mind-map-node-body-a"]')!)
    const input = target.querySelector('[data-mol-id="mind-map-node-input-a"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(document.activeElement).toBe(input)
  })

  it('enters inline edit on double-click and commits on Enter', () => {
    const onNodeEdit = vi.fn()
    const target = renderHost(sample(), { onNodeEdit })
    doubleClick(target.querySelector('[data-mol-id="mind-map-node-body-a"]')!)
    const input = target.querySelector('[data-mol-id="mind-map-node-input-a"]') as HTMLInputElement
    expect(input).not.toBeNull()
    type(input, 'Alpha v2')
    pressKey(input, 'Enter')
    // Input has been removed; new text rendered.
    expect(target.querySelector('[data-mol-id="mind-map-node-input-a"]')).toBeNull()
    expect(target.querySelector('[data-mol-id="mind-map-node-text-a"]')?.textContent).toBe(
      'Alpha v2',
    )
    expect(onNodeEdit).toHaveBeenCalledWith('a', 'Alpha v2')
  })

  it('cancels inline edit on Escape (text unchanged)', () => {
    const target = renderHost(sample())
    doubleClick(target.querySelector('[data-mol-id="mind-map-node-body-a"]')!)
    const input = target.querySelector('[data-mol-id="mind-map-node-input-a"]') as HTMLInputElement
    type(input, 'should not stick')
    pressKey(input, 'Escape')
    expect(target.querySelector('[data-mol-id="mind-map-node-input-a"]')).toBeNull()
    expect(target.querySelector('[data-mol-id="mind-map-node-text-a"]')?.textContent).toBe('Alpha')
  })

  it('runs in controlled mode: every mutation calls onChange', () => {
    const onChange = vi.fn()
    const root = sample()
    const target = renderCanvas({ root, onChange })
    const toggle = target.querySelector(
      '[data-mol-id="mind-map-node-toggle-a"]',
    ) as HTMLButtonElement
    toggle.click()
    flushSync()
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
