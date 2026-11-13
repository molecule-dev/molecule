/**
 * Layout primitive parity cases: Container, Flex, Grid and Spacer.
 *
 * @module
 */

import type { NodeSpec, UIComponentCases } from '../../spec.js'

const cell = (label: string): NodeSpec[] => [{ tag: 'span', children: [label] }]

/** Container: max-width scale, centering, passthrough and the ignored paddingX. */
export const containerCases: UIComponentCases = {
  component: 'Container',
  cases: [
    { name: 'defaults', children: ['Contained'] },
    ...(['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const).map((maxWidth) => ({
      name: `maxWidth ${maxWidth}`,
      props: { maxWidth },
      children: ['Contained'],
    })),
    { name: 'maxWidth arbitrary string', props: { maxWidth: '1200px' }, children: ['Contained'] },
    { name: 'not centered', props: { centered: false }, children: ['Contained'] },
    {
      name: 'paddingX accepted but has no effect',
      props: { paddingX: 'lg' },
      children: ['Contained'],
    },
    {
      name: 'className, style and testId',
      props: {
        className: 'parity-token',
        style: { marginBottom: '8px' },
        testId: 'page-container',
      },
      children: ['Contained'],
    },
    {
      name: 'passes through id, aria and data attributes',
      props: {
        id: 'container',
        role: 'region',
        'aria-label': 'Main column',
        'data-mol-id': 'container',
      },
      children: ['Contained'],
    },
    {
      name: 'element children',
      children: [
        { tag: 'p', children: ['First paragraph'] },
        { tag: 'p', children: ['Second paragraph'] },
      ],
    },
    {
      name: 'click calls onClick',
      props: { testId: 'clickable-container' },
      callbacks: ['onClick'],
      children: ['Contained'],
      interactions: [{ type: 'click', selector: '[data-testid="clickable-container"]' }],
    },
  ],
}

/** Flex: direction, justify, align, wrap, named and raw gaps, passthrough, click. */
export const flexCases: UIComponentCases = {
  component: 'Flex',
  cases: [
    { name: 'defaults', children: ['One', 'Two'] },
    ...(['row', 'column', 'row-reverse', 'column-reverse'] as const).map((direction) => ({
      name: `direction ${direction}`,
      props: { direction },
      children: cell('A').concat(cell('B')),
    })),
    ...(['start', 'end', 'center', 'between', 'around', 'evenly'] as const).map((justify) => ({
      name: `justify ${justify}`,
      props: { justify },
      children: cell('A').concat(cell('B')),
    })),
    ...(['start', 'end', 'center', 'baseline', 'stretch'] as const).map((align) => ({
      name: `align ${align}`,
      props: { align },
      children: cell('A').concat(cell('B')),
    })),
    ...(['wrap', 'nowrap', 'wrap-reverse'] as const).map((wrap) => ({
      name: `wrap ${wrap}`,
      props: { wrap },
      children: cell('A').concat(cell('B')),
    })),
    ...(['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const).map((gap) => ({
      name: `gap ${gap}`,
      props: { gap },
      children: cell('A').concat(cell('B')),
    })),
    {
      name: 'numeric gap uses inline style',
      props: { gap: 4 },
      children: cell('A').concat(cell('B')),
    },
    {
      name: 'raw string gap uses inline style',
      props: { gap: '13px' },
      children: cell('A').concat(cell('B')),
    },
    {
      name: 'direction, align, justify and gap combined',
      props: { direction: 'column', align: 'center', justify: 'between', gap: 'sm' },
      children: cell('A').concat(cell('B'), cell('C')),
    },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { padding: '4px' }, testId: 'row' },
      children: cell('A'),
    },
    {
      name: 'passes through aria and data attributes',
      props: { 'aria-label': 'Toolbar', 'data-mol-id': 'toolbar' },
      children: cell('A'),
    },
    {
      name: 'click calls onClick',
      props: { testId: 'clickable-flex' },
      callbacks: ['onClick'],
      children: cell('A'),
      interactions: [{ type: 'click', selector: '[data-testid="clickable-flex"]' }],
    },
  ],
}

/** Grid: column counts and templates, row templates, gaps, passthrough. */
export const gridCases: UIComponentCases = {
  component: 'Grid',
  cases: [
    { name: 'defaults', children: cell('A').concat(cell('B')) },
    ...([1, 2, 3, 4, 12] as const).map((columns) => ({
      name: `columns ${columns}`,
      props: { columns },
      children: cell('A').concat(cell('B')),
    })),
    {
      name: 'columns template string',
      props: { columns: 'repeat(2, minmax(0, 1fr))' },
      children: cell('A').concat(cell('B')),
    },
    {
      name: 'rows template string',
      props: { rows: 'auto 1fr' },
      children: cell('A').concat(cell('B')),
    },
    ...(['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const).map((gap) => ({
      name: `gap ${gap}`,
      props: { gap },
      children: cell('A').concat(cell('B')),
    })),
    {
      name: 'numeric gap uses inline style',
      props: { gap: 6 },
      children: cell('A').concat(cell('B')),
    },
    {
      name: 'raw string gap uses inline style',
      props: { gap: '11px' },
      children: cell('A').concat(cell('B')),
    },
    {
      name: 'numeric column and row gaps use inline styles',
      props: { columnGap: 2, rowGap: 8 },
      children: cell('A').concat(cell('B')),
    },
    {
      name: 'string column and row gaps use inline styles',
      props: { columnGap: '4px', rowGap: '12px' },
      children: cell('A').concat(cell('B')),
    },
    {
      name: 'columns, gap and children combined',
      props: { columns: 3, gap: 'md' },
      children: cell('A').concat(cell('B'), cell('C')),
    },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'grid' },
      children: cell('A'),
    },
    {
      name: 'passes through aria and data attributes',
      props: { 'aria-label': 'Results', 'data-mol-id': 'results' },
      children: cell('A'),
    },
  ],
}

/** Spacer: named and raw sizes, vertical and horizontal. */
export const spacerCases: UIComponentCases = {
  component: 'Spacer',
  cases: [
    { name: 'defaults' },
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { size },
    })),
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `horizontal size ${size}`,
      props: { size, horizontal: true },
    })),
    { name: 'numeric size uses inline style', props: { size: 32 } },
    { name: 'numeric horizontal size uses inline style', props: { size: 48, horizontal: true } },
    { name: 'raw string size uses inline style', props: { size: '2rem' } },
    {
      name: 'raw string horizontal size uses inline style',
      props: { size: '10%', horizontal: true },
    },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { flexShrink: 0 }, testId: 'gap' },
    },
    {
      name: 'passes through aria and data attributes',
      props: { 'aria-hidden': true, 'data-mol-id': 'section-gap' },
    },
  ],
}
