/**
 * Button parity cases.
 *
 * @module
 */

import type { NodeSpec, UIComponentCases } from '../spec.js'

const icon = (name: string): NodeSpec[] => [
  { tag: 'svg', attrs: { 'data-icon': name, viewBox: '0 0 24 24' } },
]

/** Button: every variant, color, size, loading, icons, disabled, type and click behavior. */
export const buttonCases: UIComponentCases = {
  component: 'Button',
  cases: [
    { name: 'defaults', children: ['Save'] },
    ...(['solid', 'outline', 'ghost', 'link'] as const).map((variant) => ({
      name: `variant ${variant}`,
      props: { variant },
      children: ['Go'],
    })),
    ...(['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const).map((color) => ({
      name: `color ${color}`,
      props: { color },
      children: ['Go'],
    })),
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { size },
      children: ['Go'],
    })),
    { name: 'full width', props: { fullWidth: true }, children: ['Wide'] },
    { name: 'loading', props: { loading: true }, children: ['Saving'] },
    {
      name: 'loading with text',
      props: { loading: true, loadingText: 'Saving…' },
      children: ['Save'],
    },
    {
      name: 'left and right icons',
      slots: { leftIcon: icon('plus'), rightIcon: icon('chevron') },
      children: ['Add'],
    },
    {
      name: 'loading hides icons',
      props: { loading: true },
      slots: { leftIcon: icon('plus'), rightIcon: icon('chevron') },
      children: ['Add'],
    },
    { name: 'disabled', props: { disabled: true }, children: ['No'] },
    { name: 'submit type', props: { type: 'submit' }, children: ['Send'] },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'save-button' },
      children: ['Save'],
    },
    {
      name: 'passes through aria and data attributes',
      props: { 'aria-label': 'Close dialog', 'data-mol-id': 'close-button' },
      children: ['×'],
    },
    {
      name: 'click calls onClick',
      callbacks: ['onClick'],
      children: ['Click'],
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'disabled click does not call onClick',
      props: { disabled: true },
      callbacks: ['onClick'],
      children: ['Click'],
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'loading toggles off',
      props: { loading: true, loadingText: 'Saving…' },
      children: ['Save'],
      interactions: [{ type: 'props', props: { loading: false } }],
    },
  ],
}
