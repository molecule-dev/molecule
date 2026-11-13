/**
 * Tooltip parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const triggerButton = [{ tag: 'button', attrs: { type: 'button' }, children: ['Hover me'] }]

/** Tooltip: show/hide on hover, dismiss paths, placements with arrow, delay, cloneable vs plain triggers. */
export const tooltipCases: UIComponentCases = {
  component: 'Tooltip',
  cases: [
    {
      name: 'defaults (hidden)',
      slots: { content: ['Helpful text'] },
      children: triggerButton,
    },
    {
      name: 'hover shows the tooltip and associates it',
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [{ type: 'mouseenter', selector: 'button' }],
    },
    {
      name: 'hover content with elements',
      slots: { content: [{ tag: 'strong', children: ['Bold'] }, ' hint'] },
      children: triggerButton,
      interactions: [{ type: 'mouseenter', selector: 'button' }],
    },
    {
      name: 'mouseleave schedules hide after the grace delay',
      fakeTimers: true,
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [
        { type: 'mouseenter', selector: 'button' },
        { type: 'mouseleave', selector: 'button' },
      ],
    },
    {
      name: 'mouseleave grace delay elapses and hides',
      fakeTimers: true,
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [
        { type: 'mouseenter', selector: 'button' },
        { type: 'mouseleave', selector: 'button' },
        { type: 'advance', ms: 150 },
      ],
    },
    {
      name: 'delayed show waits for the timer',
      fakeTimers: true,
      props: { delay: 300 },
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [{ type: 'mouseenter', selector: 'button' }],
    },
    {
      name: 'delayed show appears after advancing',
      fakeTimers: true,
      props: { delay: 300 },
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [
        { type: 'mouseenter', selector: 'button' },
        { type: 'advance', ms: 300 },
      ],
    },
    {
      name: 'escape hides a visible tooltip',
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [
        { type: 'mouseenter', selector: 'button' },
        { type: 'keydown', selector: 'button', key: 'Escape' },
      ],
    },
    {
      name: 'click hides a visible tooltip',
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [
        { type: 'mouseenter', selector: 'button' },
        { type: 'click', selector: 'button' },
      ],
    },
    {
      name: 'focus does not show without focus-visible',
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [{ type: 'focus', selector: 'button' }],
    },
    {
      // The blur interaction dispatches focusout on the trigger child; it
      // bubbles to the wrapper, whose onBlur hides a visible tooltip.
      name: 'blur hides a visible tooltip',
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [
        { type: 'mouseenter', selector: 'button' },
        { type: 'blur', selector: 'button' },
      ],
    },
    {
      name: 'multiple children keep the wrapper without association',
      slots: { content: ['Helpful text'] },
      children: [
        { tag: 'span', children: ['One'] },
        { tag: 'span', children: ['Two'] },
      ],
      interactions: [{ type: 'mouseenter', selector: 'span' }],
    },
    {
      name: 'text child is wrapped without association',
      slots: { content: ['Helpful text'] },
      children: ['Plain trigger'],
      interactions: [{ type: 'mouseenter', selector: 'div div' }],
    },
    ...(
      [
        'top',
        'bottom',
        'left',
        'right',
        'top-start',
        'top-end',
        'bottom-start',
        'bottom-end',
      ] as const
    ).map((placement) => ({
      name: `placement ${placement} with arrow`,
      props: { placement, hasArrow: true },
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [{ type: 'mouseenter' as const, selector: 'button' }],
    })),
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'tip' },
      slots: { content: ['Helpful text'] },
      children: triggerButton,
      interactions: [{ type: 'mouseenter' as const, selector: 'button' }],
    },
  ],
}
