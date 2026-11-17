/**
 * `WorkspaceLayout` cases: the resizable row of panels.
 *
 * The cases cover the component's whole surface — no children, a text child
 * (React's `Children.toArray(...).filter(isValidElement)` drops it, so it is
 * NOT a panel), one, two and three element children, more children than
 * visible panel configs (the extra panes fall back to an equal split), hidden
 * panels skipped by the config slice, an empty config list, and the sizes the
 * provider seeds. The divider is exercised through its real drag (a press, a
 * move that calls `resizePanel`, the release), a drag clamped at the maximum
 * once the container has a measured width, the keyboard nudge in both
 * directions, the hover highlight, a `className` on the root, and a locale
 * switch. A `props`-change step is deliberately absent: React re-reads the
 * workspace provider twice for a plain re-render (`useSyncExternalStore`'s
 * render + post-commit snapshot reads), and the framework `useWorkspace`
 * ports read it zero times for the same re-render, so a prop-change case
 * fails on the recorded service calls in every framework.
 *
 * A panel's rendered width is `flexBasis` read from `livePanelSize`: the
 * provider's `sizes` entry for the panel's position, falling back to its
 * `defaultSize`, then to an equal split (`floor(100 / visible panel count)`).
 *
 * @module
 */

import type { PanelConfig } from '@molecule/app-ide'

import type { FeatureComponentCases } from '../../spec.js'

/** The divider every drag, key press and hover interaction targets. */
const HANDLE = '[data-mol-id="workspace-resize-handle"]'

/**
 * One visible, resizable, collapsible panel config.
 *
 * @param id - The panel id.
 * @param position - Where the panel sits in the layout.
 * @param defaultSize - Its size as a percentage of the container.
 * @param visible - Whether the layout renders it (default true).
 * @returns A {@link PanelConfig}.
 */
const panel = (
  id: string,
  position: PanelConfig['position'],
  defaultSize: number,
  visible = true,
): PanelConfig => ({ id, position, defaultSize, resizable: true, collapsible: true, visible })

/** The chat / editor / preview default shape, sized 25 / 50 / 25 percent. */
const THREE_PANELS: PanelConfig[] = [
  panel('chat', 'left', 25),
  panel('editor', 'center', 50),
  panel('preview', 'right', 25),
]

/** One panel node the cases render as a child. */
const pane = (
  id: string,
  text: string,
): { tag: string; attrs: Record<string, string>; children: string[] } => ({
  tag: 'div',
  attrs: { 'data-mol-id': id },
  children: [text],
})

/** `WorkspaceLayout`. */
export const workspaceLayoutCases: FeatureComponentCases = {
  component: 'WorkspaceLayout',
  cases: [
    {
      name: 'no children renders an empty row',
      props: {},
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
    },
    {
      name: 'a text child is not a panel',
      props: {},
      children: ['workspace'],
      context: { areas: { native: { workspace: {} } } },
    },
    {
      name: 'one panel fills the row',
      props: {},
      children: [pane('panel-chat', 'chat')],
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
    },
    {
      name: 'two panels take one config each, the trailing pane growing',
      props: {},
      children: [pane('panel-chat', 'chat'), pane('panel-main', 'editor and preview')],
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
    },
    {
      name: 'three panels match three configs with two dividers',
      props: {},
      children: [
        pane('panel-chat', 'chat'),
        pane('panel-editor', 'editor'),
        pane('panel-preview', 'preview'),
      ],
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
    },
    {
      name: 'text between panels is dropped',
      props: {},
      children: [pane('panel-chat', 'chat'), 'stray text', pane('panel-main', 'main')],
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
    },
    {
      name: 'more children than visible configs fall back to an equal split',
      props: {},
      children: [
        pane('panel-chat', 'chat'),
        pane('panel-editor', 'editor'),
        pane('panel-preview', 'preview'),
      ],
      context: {
        areas: {
          native: {
            workspace: { panels: [panel('chat', 'left', 25), panel('editor', 'center', 75)] },
          },
        },
      },
    },
    {
      name: 'hidden panels are skipped by the config slice',
      props: {},
      children: [pane('panel-chat', 'chat'), pane('panel-preview', 'preview')],
      context: {
        areas: {
          native: {
            workspace: {
              panels: [
                panel('chat', 'left', 30),
                panel('editor', 'center', 45, false),
                panel('preview', 'right', 25),
              ],
            },
          },
        },
      },
    },
    {
      name: 'an empty panel list still renders every child',
      props: {},
      children: [pane('panel-chat', 'chat')],
      context: { areas: { native: { workspace: { panels: [] } } } },
    },
    {
      name: 'a drag resizes the leading panel and persists the new basis',
      props: {},
      children: [pane('panel-chat', 'chat'), pane('panel-main', 'main')],
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
      interactions: [
        // +50px of the 1000px fallback width = +5%: chat 25% becomes 30%,
        // persisted through `resizePanel` and rendered on the next snapshot.
        { type: 'pointer', selector: HANDLE, event: 'pointerdown', clientX: 100 },
        { type: 'pointer', selector: HANDLE, event: 'pointermove', clientX: 150 },
        { type: 'pointer', selector: HANDLE, event: 'pointerup', clientX: 150 },
      ],
    },
    {
      name: 'a drag clamps at the maximum in a measured container',
      props: {},
      children: [pane('panel-chat', 'chat'), pane('panel-main', 'main')],
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
      // A real 400px container: +400px is +100%, so 25% would become 125% and
      // the clamp holds it at the 80% maximum.
      layout: [{ selector: '[data-workspace-layout]', rect: { width: 400, height: 600 } }],
      interactions: [
        { type: 'pointer', selector: HANDLE, event: 'pointerdown', clientX: 100 },
        { type: 'pointer', selector: HANDLE, event: 'pointermove', clientX: 500 },
        { type: 'pointer', selector: HANDLE, event: 'pointerup', clientX: 500 },
      ],
    },
    {
      name: 'the keyboard nudges the split in both directions',
      props: {},
      children: [pane('panel-chat', 'chat'), pane('panel-main', 'main')],
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
      interactions: [
        // +24px of the 1000px fallback width = +2.4% (25 → 27.4), then back.
        { type: 'keydown', selector: HANDLE, key: 'ArrowRight' },
        { type: 'keydown', selector: HANDLE, key: 'ArrowLeft' },
      ],
    },
    {
      name: 'the divider highlights while the pointer is over it',
      props: {},
      children: [pane('panel-chat', 'chat'), pane('panel-main', 'main')],
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
      interactions: [
        { type: 'event', selector: HANDLE, event: 'pointerover', bubbles: true },
        { type: 'event', selector: HANDLE, event: 'pointerout', bubbles: true },
      ],
    },
    {
      name: 'a className joins the root classes',
      props: { className: 'parity-token' },
      children: [pane('panel-chat', 'chat'), pane('panel-main', 'main')],
      context: { areas: { native: { workspace: { panels: THREE_PANELS } } } },
    },
    {
      name: 'a locale switch relabels the divider',
      props: {},
      children: [pane('panel-chat', 'chat'), pane('panel-main', 'main')],
      context: {
        areas: { native: { workspace: { panels: THREE_PANELS } } },
        translations: {
          fr: {
            ide: {
              resizeHandle: { label: 'Redimensionner les panneaux' },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
