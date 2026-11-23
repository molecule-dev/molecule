// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `EditorLayout` — a port of
 * `@molecule/app-editor-layout-react/src/__tests__/editor-layout.test.tsx`:
 * the same behavioral assertions, mounted with Svelte 5 in jsdom and asserted
 * on the DOM the component produces.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import EditorLayout from '../EditorLayout.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

interface Mounted {
  instance: ReturnType<typeof mount>
  wrapper: HTMLElement | null
}

/**
 * Mounts `EditorLayout` with the given props and slot markup.
 *
 * @param props - The layout props.
 * @param slots - Markup for the topBar/canvas/sidePanel slots.
 * @returns The mounted instance and the layout's root element.
 */
const render = (
  props: Record<string, unknown> = {},
  slots: { topBar?: string; canvas?: string; sidePanel?: string } = {},
): Mounted => {
  const targetProps: Record<string, unknown> = {
    ...props,
    topBar: raw(slots.topBar ?? '<div data-topbar>Toolbar</div>'),
    canvas: raw(slots.canvas ?? '<div data-canvas>Canvas</div>'),
  }
  if (slots.sidePanel !== undefined) targetProps.sidePanel = raw(slots.sidePanel)
  const instance = mount(EditorLayout, { target: document.body, props: targetProps })
  flushSync()
  return { instance, wrapper: document.body.firstElementChild as HTMLElement | null }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('EditorLayout', () => {
  it('renders the topBar and canvas', () => {
    const { wrapper } = render()
    expect(wrapper).not.toBeNull()
    expect(wrapper!.querySelector('[data-topbar]')).not.toBeNull()
    expect(wrapper!.querySelector('[data-canvas]')).not.toBeNull()
  })

  it('renders the side panel after the canvas by default (right)', () => {
    const { wrapper } = render({}, { sidePanel: '<div data-panel>Panel</div>' })
    expect(wrapper).not.toBeNull()
    expect(wrapper!.querySelector('aside')).not.toBeNull()
    const canvas = wrapper?.querySelector('[data-canvas]') as HTMLElement
    const panel = wrapper?.querySelector('[data-panel]') as HTMLElement
    expect(canvas.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders the side panel before the canvas when sidePanelPosition is left', () => {
    const { wrapper } = render(
      { sidePanelPosition: 'left' },
      { sidePanel: '<div data-panel>Panel</div>' },
    )
    const canvas = wrapper?.querySelector('[data-canvas]') as HTMLElement
    const panel = wrapper?.querySelector('[data-panel]') as HTMLElement
    expect(panel.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('hides the side panel when sidePanelOpen is false', () => {
    const { wrapper } = render(
      { sidePanelOpen: false },
      { sidePanel: '<div data-panel>Panel</div>' },
    )
    expect(wrapper?.querySelector('[data-panel]')).toBeNull()
  })

  it('renders no <aside> when no side panel is supplied', () => {
    const { wrapper } = render()
    expect(wrapper?.querySelector('aside')).toBeNull()
  })

  it('renders the topBar in a sticky container', () => {
    const { wrapper } = render()
    const sticky = wrapper?.firstElementChild as HTMLElement
    expect(sticky.getAttribute('style')).toContain('position: sticky')
  })

  it('sets data-mol-id and forwards className', () => {
    const { wrapper } = render({ dataMolId: 'el-x', className: 'el-cls' })
    expect(wrapper?.getAttribute('data-mol-id')).toBe('el-x')
    expect(wrapper?.getAttribute('class')).toContain('el-cls')
  })
})
