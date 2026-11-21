/**
 * `@molecule/app-mind-map-canvas-react` cases: the `<MindMapCanvas>` tree
 * editor — radial / horizontal / vertical auto-layout, fold/unfold subtrees,
 * inline edit-on-double-click, the add-child button — and the pure layout and
 * tree helpers it exports.
 *
 * Every case that lets the canvas add a child pins `now` and `random`: the new
 * node's id carries `Date.now()` and `Math.random()`, so the recorded id is
 * stable only with both fixed.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The instant every add-child case's `Date.now()` is pinned to (2026-05-13T12:00:00Z). */
const NOW = Date.UTC(2026, 4, 13, 12, 0, 0)

/** A mind-map node as a case passes it. */
interface CaseNode {
  /** Stable identifier. */
  id: string
  /** Display text. */
  text: string
  /** Direct child subtrees. */
  children: CaseNode[]
  /** Whether the subtree is folded away. */
  collapsed?: boolean
  /** Accent color drawn as the inset bar on the node body. */
  color?: string
}

/**
 * Builds one node.
 *
 * @param id - The node id.
 * @param text - The node text.
 * @param children - The child subtrees.
 * @param extra - `collapsed` / `color`.
 * @returns The node.
 */
const node = (
  id: string,
  text: string,
  children: CaseNode[] = [],
  extra: Partial<CaseNode> = {},
): CaseNode => ({ id, text, children, ...extra })

/** Root + two children, the first with a grandchild. */
const sampleRoot = (): CaseNode =>
  node('r', 'Root', [node('a', 'Alpha', [node('a1', 'A1')]), node('b', 'Beta')])

/** The sample with `a`'s subtree folded away. */
const collapsedRoot = (): CaseNode =>
  node('r', 'Root', [
    node('a', 'Alpha', [node('a1', 'A1')], { collapsed: true }),
    node('b', 'Beta'),
  ])

/** The sample with `a` carrying an accent color. */
const coloredRoot = (): CaseNode =>
  node('r', 'Root', [
    node('a', 'Alpha', [node('a1', 'A1')], { color: '#00ff00' }),
    node('b', 'Beta'),
  ])

/** The sample with `a` and `b` swapped, so a later `root` prop re-orders the branches. */
const reorderedRoot = (): CaseNode =>
  node('r', 'Root', [node('b', 'Beta'), node('a', 'Alpha', [node('a1', 'A1')])])

/** Click on a node's collapse toggle. */
const clickToggleA = { type: 'click', selector: '[data-mol-id="mind-map-node-toggle-a"]' } as const

/** Double-click that opens node `a`'s inline editor. */
const dblclickBodyA = {
  type: 'dblclick',
  selector: '[data-mol-id="mind-map-node-body-a"]',
} as const

/** Type into node `a`'s inline editor. */
const typeIntoInputA = (value: string): { type: 'input'; selector: string; value: string } => ({
  type: 'input',
  selector: '[data-mol-id="mind-map-node-input-a"]',
  value,
})

/** Press a key in node `a`'s inline editor. */
const keyInInputA = (key: string): { type: 'keydown'; selector: string; key: string } => ({
  type: 'keydown',
  selector: '[data-mol-id="mind-map-node-input-a"]',
  key,
})

/** `@molecule/app-mind-map-canvas-react`. */
export const mindMapCanvasFeature: FeatureCases = {
  package: '@molecule/app-mind-map-canvas-react',
  families: [
    {
      component: 'MindMapCanvas',
      cases: [
        // The first case also runs again with a pseudo-locale switch
        // ("…, then a locale switch"): the surface, node, edge and button
        // labels are translated, so the switched snapshot reads the
        // pseudo-locale's `⟦…⟧`.
        { name: 'the default radial canvas', props: { root: sampleRoot() } },
        { name: 'horizontal layout', props: { root: sampleRoot(), layout: 'horizontal' } },
        { name: 'vertical layout', props: { root: sampleRoot(), layout: 'vertical' } },
        {
          name: 'custom size and node dimensions',
          props: {
            root: sampleRoot(),
            width: 400,
            height: 300,
            nodeWidth: 120,
            nodeHeight: 40,
          },
        },
        {
          name: 'className is merged onto the wrapper',
          props: { root: sampleRoot(), className: 'parity-token' },
        },
        {
          name: 'a collapsed subtree renders without its descendants',
          props: { root: collapsedRoot() },
        },
        {
          name: 'a node color drives the accent bar on its body',
          props: { root: coloredRoot() },
        },
        {
          name: 'clicking the collapse toggle calls onChange in controlled mode',
          props: { root: sampleRoot() },
          callbacks: ['onChange', 'onNodeClick'],
          interactions: [clickToggleA],
        },
        {
          name: 'clicking the collapse toggle folds the uncontrolled canvas',
          props: { root: sampleRoot() },
          interactions: [clickToggleA],
        },
        {
          name: 'double-click opens the inline editor and a click while editing is ignored',
          props: { root: sampleRoot() },
          interactions: [
            dblclickBodyA,
            { type: 'click', selector: '[data-mol-id="mind-map-node-body-a"]' },
          ],
        },
        {
          name: 'Enter commits the edit in controlled mode',
          props: { root: sampleRoot() },
          callbacks: ['onChange', 'onNodeEdit'],
          interactions: [dblclickBodyA, typeIntoInputA('Alpha v2'), keyInInputA('Enter')],
        },
        {
          name: 'Escape cancels the edit',
          props: { root: sampleRoot() },
          interactions: [dblclickBodyA, typeIntoInputA('should not stick'), keyInInputA('Escape')],
        },
        {
          name: 'moving focus out of the editor commits the edit',
          props: { root: sampleRoot() },
          callbacks: ['onChange', 'onNodeEdit'],
          interactions: [
            dblclickBodyA,
            typeIntoInputA('Alpha v3'),
            // Moving focus to a button outside the editor blurs the input
            // (jsdom's `blur()` here fires both `blur` and the bubbling
            // `focusout` React's delegated `onBlur` handles), which commits.
            { type: 'focus', selector: '[data-mol-id="mind-map-node-add-b"]' },
          ],
        },
        {
          name: 'the add-child button appends a node in uncontrolled mode',
          props: { root: sampleRoot() },
          now: NOW,
          random: [7],
          interactions: [{ type: 'click', selector: '[data-mol-id="mind-map-node-add-b"]' }],
        },
        {
          name: 'the add-child button calls onChange in controlled mode',
          props: { root: sampleRoot() },
          callbacks: ['onChange'],
          now: NOW,
          random: [3],
          interactions: [{ type: 'click', selector: '[data-mol-id="mind-map-node-add-r"]' }],
        },
        {
          name: 'adding a child to a collapsed node expands it in uncontrolled mode',
          props: { root: collapsedRoot() },
          now: NOW,
          random: [5],
          interactions: [{ type: 'click', selector: '[data-mol-id="mind-map-node-add-a"]' }],
        },
        {
          name: 'later props re-render the controlled canvas',
          props: { root: sampleRoot() },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { root: reorderedRoot() } },
            { type: 'props', props: { layout: 'horizontal' } },
          ],
        },
        {
          name: 'an uncontrolled canvas ignores a later root prop',
          props: { root: sampleRoot() },
          interactions: [{ type: 'props', props: { root: reorderedRoot() } }],
        },
        {
          name: 'clicking a node fires onNodeClick',
          props: { root: sampleRoot() },
          callbacks: ['onNodeClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="mind-map-node-body-a"]' }],
        },
      ],
    },
  ],
  values: [
    { export: 'DEFAULT_NODE_WIDTH' },
    { export: 'DEFAULT_NODE_HEIGHT' },
    { export: 'DEFAULT_RADIAL_RING' },
    { export: 'DEFAULT_HORIZONTAL_STEP_X' },
    { export: 'DEFAULT_HORIZONTAL_STEP_Y' },
    {
      export: 'walkVisible',
      calls: [[sampleRoot(), () => undefined]],
    },
    {
      export: 'computeRadialPositions',
      calls: [
        [sampleRoot()],
        [sampleRoot(), { origin: { x: 100, y: 100 } }],
        [sampleRoot(), { nodeWidth: 120, nodeHeight: 40 }],
        [collapsedRoot()],
        [sampleRoot(), { ringSpacing: 100 }],
      ],
    },
    {
      export: 'computeHorizontalTreePositions',
      calls: [
        [sampleRoot()],
        [sampleRoot(), { origin: { x: 0, y: 0 }, stepX: 200, stepY: 50 }],
        [sampleRoot(), { origin: { x: 0, y: 0 }, stepX: 200, stepY: 50 }, 'vertical'],
        [collapsedRoot()],
      ],
    },
    {
      export: 'findNode',
      calls: [
        [sampleRoot(), 'a1'],
        [sampleRoot(), 'missing'],
      ],
    },
    {
      export: 'updateNode',
      calls: [
        [sampleRoot(), 'a1', (n: unknown) => ({ ...(n as CaseNode), text: 'A1!' })],
        [sampleRoot(), 'missing', (n: unknown) => ({ ...(n as CaseNode), text: 'X' })],
      ],
    },
    {
      export: 'setNodeText',
      calls: [
        [sampleRoot(), 'a', 'Alpha v2'],
        [sampleRoot(), 'missing', 'X'],
      ],
    },
    {
      export: 'toggleCollapsed',
      calls: [
        [sampleRoot(), 'a'],
        [collapsedRoot(), 'a'],
      ],
    },
    {
      export: 'addChild',
      calls: [
        [sampleRoot(), 'a', node('new', 'New idea')],
        [collapsedRoot(), 'r', node('new', 'New idea')],
        [sampleRoot(), 'missing', node('new', 'New idea')],
      ],
    },
    {
      export: 'removeNode',
      calls: [
        [sampleRoot(), 'a1'],
        [sampleRoot(), 'r'],
        [sampleRoot(), 'missing'],
      ],
    },
  ],
}
