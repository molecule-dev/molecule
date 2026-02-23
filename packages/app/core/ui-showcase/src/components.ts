/**
 * Component showcase specifications.
 *
 * Defines every component and its visual variation axes for cross-framework
 * visual regression testing. Each entry generates a matrix of all prop
 * combinations to render and screenshot.
 *
 * @module
 */

import type { ComponentShowcase } from './types.js'

const COLORS = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/**
 * Full showcase specification for all molecule UI components.
 *
 * Components are ordered by category: actions, form inputs, data display,
 * feedback, layout, and overlay/interactive.
 */
export const showcaseComponents: ComponentShowcase[] = [
  // ── Actions ──────────────────────────────────────────────────────────

  {
    name: 'Button',
    propMatrix: {
      variant: ['solid', 'outline', 'ghost', 'link'],
      color: [...COLORS],
      size: [...SIZES],
    },
    children: 'Button',
    svelteElement: 'button',
  },

  // ── Form Inputs ──────────────────────────────────────────────────────

  {
    name: 'Input',
    propMatrix: {
      size: [...SIZES],
    },
    defaultProps: { placeholder: 'Enter text...' },
    children: false,
    svelteElement: 'input',
  },
  {
    name: 'Input',
    propMatrix: {
      error: ['', 'This field is required'],
    },
    defaultProps: { placeholder: 'With error state', size: 'md', label: 'Label' },
    children: false,
    svelteElement: 'input',
  },
  {
    name: 'Textarea',
    propMatrix: {
      size: [...SIZES],
    },
    defaultProps: { placeholder: 'Enter text...', rows: 3 },
    children: false,
    svelteElement: 'textarea',
  },
  {
    name: 'Select',
    propMatrix: {
      size: [...SIZES],
    },
    defaultProps: {
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
        { value: 'c', label: 'Option C' },
      ],
      placeholder: 'Select...',
    },
    children: false,
    svelteElement: 'select',
  },
  {
    name: 'Checkbox',
    propMatrix: {
      checked: [false, true],
      size: ['sm', 'md', 'lg'],
    },
    defaultProps: { label: 'Checkbox label' },
    children: false,
  },
  {
    name: 'RadioGroup',
    propMatrix: {
      size: ['sm', 'md', 'lg'],
      direction: ['horizontal', 'vertical'],
    },
    defaultProps: {
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
        { value: 'c', label: 'Option C' },
      ],
      value: 'a',
    },
    children: false,
  },
  {
    name: 'Switch',
    propMatrix: {
      checked: [false, true],
      color: [...COLORS],
      size: ['sm', 'md', 'lg'],
    },
    defaultProps: { label: 'Toggle' },
    children: false,
  },

  // ── Data Display ─────────────────────────────────────────────────────

  {
    name: 'Badge',
    propMatrix: {
      variant: ['solid', 'outline', 'subtle'],
      color: [...COLORS],
      size: [...SIZES],
    },
    children: 'Badge',
  },
  {
    name: 'Avatar',
    propMatrix: {
      size: [...SIZES],
    },
    defaultProps: { name: 'John Doe' },
    children: false,
  },
  {
    name: 'Table',
    propMatrix: {
      bordered: [false, true],
      striped: [false, true],
    },
    defaultProps: {
      data: [
        { id: '1', name: 'Alice', role: 'Engineer' },
        { id: '2', name: 'Bob', role: 'Designer' },
        { id: '3', name: 'Charlie', role: 'Manager' },
      ],
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'role', header: 'Role' },
      ],
      rowKey: 'id',
      size: 'md',
    },
    children: false,
  },
  {
    name: 'Tabs',
    propMatrix: {
      variant: ['line', 'enclosed', 'soft-rounded', 'solid-rounded'],
      size: ['sm', 'md', 'lg'],
    },
    defaultProps: {
      items: [
        { value: 'tab1', label: 'Tab 1', content: 'Content 1' },
        { value: 'tab2', label: 'Tab 2', content: 'Content 2' },
        { value: 'tab3', label: 'Tab 3', content: 'Content 3' },
      ],
      defaultValue: 'tab1',
    },
    children: false,
  },
  {
    name: 'Accordion',
    propMatrix: {
      multiple: [false, true],
    },
    defaultProps: {
      items: [
        { value: 'item1', header: 'Section 1', content: 'Content for section 1.' },
        { value: 'item2', header: 'Section 2', content: 'Content for section 2.' },
        { value: 'item3', header: 'Section 3', content: 'Content for section 3.' },
      ],
      defaultValue: 'item1',
      collapsible: true,
    },
    children: false,
  },
  {
    name: 'Pagination',
    propMatrix: {
      size: ['sm', 'md', 'lg'],
    },
    defaultProps: {
      page: 3,
      totalPages: 10,
      onChange: () => {},
      showPrevNext: true,
      showFirstLast: true,
    },
    children: false,
  },

  // ── Feedback ─────────────────────────────────────────────────────────

  {
    name: 'Alert',
    propMatrix: {
      status: [...COLORS],
    },
    defaultProps: { title: 'Alert Title' },
    children: 'This is an alert message with details.',
  },
  {
    name: 'Spinner',
    propMatrix: {
      size: [...SIZES],
      color: ['primary', 'secondary', 'success', 'error'],
    },
    children: false,
  },
  {
    name: 'Progress',
    propMatrix: {
      color: [...COLORS],
      size: ['sm', 'md', 'lg'],
    },
    defaultProps: { value: 65, max: 100 },
    children: false,
  },
  {
    name: 'Skeleton',
    propMatrix: {
      animation: ['pulse', 'wave', 'none'],
    },
    defaultProps: { width: 200, height: 20 },
    children: false,
  },
  {
    name: 'Toast',
    propMatrix: {
      status: ['success', 'warning', 'error', 'info'],
    },
    defaultProps: { title: 'Toast Title', description: 'Toast description text.' },
    children: false,
  },

  // ── Layout ───────────────────────────────────────────────────────────

  {
    name: 'Card',
    propMatrix: {
      variant: ['elevated', 'outlined', 'filled'],
      padding: ['sm', 'md', 'lg'],
    },
    children: 'Card content goes here.',
  },
  {
    name: 'Separator',
    propMatrix: {
      orientation: ['horizontal', 'vertical'],
    },
    children: false,
  },
]
