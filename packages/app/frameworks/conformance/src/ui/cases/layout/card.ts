/**
 * Card compound-family parity cases: Card, CardHeader, CardTitle,
 * CardDescription, CardContent and CardFooter.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Card: variants, padding scale, interactive, passthrough and click behavior. */
export const cardCases: UIComponentCases = {
  component: 'Card',
  cases: [
    { name: 'defaults', children: ['Body text'] },
    ...(['elevated', 'outlined', 'filled'] as const).map((variant) => ({
      name: `variant ${variant}`,
      props: { variant },
      children: ['Body text'],
    })),
    ...(['xs', 'sm', 'md', 'lg', 'xl', 'none'] as const).map((padding) => ({
      name: `padding ${padding}`,
      props: { padding },
      children: ['Body text'],
    })),
    { name: 'interactive', props: { interactive: true }, children: ['Clickable card'] },
    {
      name: 'interactive click calls onClick',
      props: { interactive: true },
      callbacks: ['onClick'],
      children: ['Clickable card'],
      interactions: [{ type: 'click', selector: '[role="button"]' }],
    },
    {
      name: 'click on plain card calls onClick',
      props: { testId: 'plain-card' },
      callbacks: ['onClick'],
      children: ['Plain card'],
      interactions: [{ type: 'click', selector: '[data-testid="plain-card"]' }],
    },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'billing-card' },
      children: ['Body text'],
    },
    {
      name: 'passes through aria and data attributes',
      props: { 'aria-label': 'Billing summary', 'data-mol-id': 'billing-card' },
      children: ['Body text'],
    },
    {
      name: 'element children',
      children: [{ tag: 'strong', children: ['Bold'] }, ' and plain text'],
    },
    {
      name: 'full compound composition',
      children: [
        {
          component: 'CardHeader',
          children: [
            { component: 'CardTitle', children: ['Team members'] },
            { component: 'CardDescription', children: ['Everyone with access to this workspace.'] },
          ],
        },
        { component: 'CardContent', children: ['Member list goes here.'] },
        { component: 'CardFooter', children: ['Updated 2 hours ago'] },
      ],
    },
    {
      name: 'interactive toggles off',
      props: { interactive: true },
      children: ['Clickable card'],
      interactions: [{ type: 'props', props: { interactive: false } }],
    },
  ],
}

/** CardHeader: header row of a card, class/style/passthrough and events. */
export const cardHeaderCases: UIComponentCases = {
  component: 'CardHeader',
  cases: [
    { name: 'defaults', children: ['Header'] },
    {
      name: 'className and style',
      props: { className: 'parity-token', style: { marginBottom: '4px' } },
      children: ['Header'],
    },
    {
      name: 'passes through aria, data and id',
      props: { id: 'card-header', 'aria-label': 'Card header', 'data-mol-id': 'header' },
      children: ['Header'],
    },
    {
      name: 'component children',
      children: [
        { component: 'CardTitle', children: ['Title'] },
        { component: 'CardDescription', children: ['Subtitle'] },
      ],
    },
    {
      name: 'click calls onClick',
      props: { 'data-mol-id': 'clickable-header' },
      callbacks: ['onClick'],
      children: ['Header'],
      interactions: [{ type: 'click', selector: '[data-mol-id="clickable-header"]' }],
    },
  ],
}

/** CardTitle: the h3 title of a card. */
export const cardTitleCases: UIComponentCases = {
  component: 'CardTitle',
  cases: [
    { name: 'defaults', children: ['Title'] },
    {
      name: 'className and style',
      props: { className: 'parity-token', style: { fontSize: '18px' } },
      children: ['Title'],
    },
    {
      name: 'passes through aria and data attributes',
      props: { id: 'card-title', 'aria-level': '2', 'data-mol-id': 'title' },
      children: ['Title'],
    },
    { name: 'element children', children: ['Project ', { tag: 'strong', children: ['Apollo'] }] },
    {
      name: 'click calls onClick',
      callbacks: ['onClick'],
      children: ['Title'],
      interactions: [{ type: 'click', selector: 'h3' }],
    },
  ],
}

/** CardDescription: the muted description paragraph of a card. */
export const cardDescriptionCases: UIComponentCases = {
  component: 'CardDescription',
  cases: [
    { name: 'defaults', children: ['A short description.'] },
    {
      name: 'className and style',
      props: { className: 'parity-token', style: { lineHeight: '1.4' } },
      children: ['A short description.'],
    },
    {
      name: 'passes through aria and data attributes',
      props: { id: 'card-desc', 'aria-label': 'Description', 'data-mol-id': 'desc' },
      children: ['A short description.'],
    },
    { name: 'element children', children: ['Runs ', { tag: 'em', children: ['daily'] }, '.'] },
  ],
}

/** CardContent: the body region of a card. */
export const cardContentCases: UIComponentCases = {
  component: 'CardContent',
  cases: [
    { name: 'defaults', children: ['Content'] },
    {
      name: 'className and style',
      props: { className: 'parity-token', style: { paddingTop: '8px' } },
      children: ['Content'],
    },
    {
      name: 'passes through aria and data attributes',
      props: { id: 'card-content', 'aria-label': 'Content', 'data-mol-id': 'content' },
      children: ['Content'],
    },
    {
      name: 'nested layout children',
      children: [
        {
          tag: 'ul',
          children: [
            { tag: 'li', children: ['First'] },
            { tag: 'li', children: ['Second'] },
          ],
        },
      ],
    },
    {
      name: 'click calls onClick',
      props: { 'data-mol-id': 'clickable-content' },
      callbacks: ['onClick'],
      children: ['Content'],
      interactions: [{ type: 'click', selector: '[data-mol-id="clickable-content"]' }],
    },
  ],
}

/** CardFooter: the footer row of a card. */
export const cardFooterCases: UIComponentCases = {
  component: 'CardFooter',
  cases: [
    { name: 'defaults', children: ['Footer'] },
    {
      name: 'className and style',
      props: { className: 'parity-token', style: { marginTop: '8px' } },
      children: ['Footer'],
    },
    {
      name: 'passes through aria and data attributes',
      props: { id: 'card-footer', 'aria-label': 'Footer', 'data-mol-id': 'footer' },
      children: ['Footer'],
    },
    {
      name: 'element children',
      children: [
        { tag: 'span', children: ['Save'] },
        { tag: 'span', children: ['·'] },
        { tag: 'span', children: ['Cancel'] },
      ],
    },
  ],
}
