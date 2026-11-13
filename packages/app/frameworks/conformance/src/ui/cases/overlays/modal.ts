/**
 * Modal parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Modal: sizes, title/footer, close behaviors (button, overlay, escape), passthrough. */
export const modalCases: UIComponentCases = {
  component: 'Modal',
  cases: [
    {
      name: 'defaults',
      props: { open: true, title: 'Delete item?' },
      callbacks: ['onClose'],
      children: ['This action cannot be undone.'],
    },
    {
      name: 'closed renders nothing',
      props: { open: false, title: 'Hidden' },
      callbacks: ['onClose'],
      children: ['Secret body'],
    },
    ...(['sm', 'lg', 'xl', 'full'] as const).map((size) => ({
      name: `size ${size}`,
      props: { open: true, title: `Size ${size}`, size },
      callbacks: ['onClose'],
      children: ['Body'],
    })),
    {
      name: 'without title uses floating close button',
      props: { open: true },
      callbacks: ['onClose'],
      children: ['No title here'],
    },
    {
      name: 'showCloseButton false',
      props: { open: true, title: 'No chrome', showCloseButton: false },
      callbacks: ['onClose'],
      children: ['Body'],
    },
    {
      name: 'custom closeLabel',
      props: { open: true, title: 'Close label', closeLabel: 'Dismiss dialog' },
      callbacks: ['onClose'],
      children: ['Body'],
    },
    {
      name: 'footer slot',
      props: { open: true, title: 'With footer' },
      callbacks: ['onClose'],
      slots: {
        footer: [
          { component: 'Button', props: { variant: 'ghost' }, children: ['Cancel'] },
          { component: 'Button', props: { color: 'error' }, children: ['Delete'] },
        ],
      },
      children: ['Body'],
    },
    {
      name: 'top anchored when not centered',
      props: { open: true, title: 'Top anchored', centered: false },
      callbacks: ['onClose'],
      children: ['Body'],
    },
    {
      name: 'preventScroll false',
      props: { open: true, title: 'Scroll free', preventScroll: false },
      callbacks: ['onClose'],
      children: ['Body'],
    },
    {
      name: 'component children',
      props: { open: true, title: 'Actions' },
      callbacks: ['onClose'],
      children: [
        'Are you sure? ',
        { component: 'Button', props: { color: 'error' }, children: ['Confirm'] },
      ],
    },
    {
      name: 'element children',
      props: { open: true, title: 'Rich body' },
      callbacks: ['onClose'],
      children: [{ tag: 'strong', children: ['Bold'] }, ' trailing text'],
    },
    {
      name: 'className, style and testId',
      props: {
        open: true,
        title: 'Tokens',
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'confirm-modal',
      },
      callbacks: ['onClose'],
      children: ['Body'],
    },
    {
      name: 'passes through aria and data attributes',
      props: {
        open: true,
        title: 'Passthrough',
        'aria-label': 'Confirm deletion',
        'data-mol-id': 'delete-modal',
      },
      callbacks: ['onClose'],
      children: ['Body'],
    },
    {
      name: 'overlay click calls onClose',
      props: { open: true, title: 'Overlay' },
      callbacks: ['onClose'],
      children: ['Body'],
      interactions: [{ type: 'click', selector: 'body > div:nth-child(3)' }],
    },
    {
      name: 'closeOnOverlayClick false ignores overlay click',
      props: { open: true, title: 'Sticky', closeOnOverlayClick: false },
      callbacks: ['onClose'],
      children: ['Body'],
      interactions: [{ type: 'click', selector: 'body > div:nth-child(3)' }],
    },
    {
      name: 'escape calls onClose',
      props: { open: true, title: 'Escape' },
      callbacks: ['onClose'],
      children: ['Body'],
      interactions: [{ type: 'keydown', selector: '[role="dialog"]', key: 'Escape' }],
    },
    {
      name: 'closeOnEscape false ignores escape',
      props: { open: true, title: 'No escape', closeOnEscape: false },
      callbacks: ['onClose'],
      children: ['Body'],
      interactions: [{ type: 'keydown', selector: '[role="dialog"]', key: 'Escape' }],
    },
    {
      name: 'close button click calls onClose',
      props: { open: true, title: 'Chrome' },
      callbacks: ['onClose'],
      children: ['Body'],
      interactions: [{ type: 'click', selector: '[data-mol-id="modal-close"]' }],
    },
    {
      // Opening through a props step: focus must move into the dialog (the
      // first focusable is the header close button).
      name: 'focus moves into the dialog on open',
      props: { open: false, title: 'Focus me' },
      callbacks: ['onClose'],
      children: ['Body'],
      interactions: [{ type: 'props', props: { open: true } }],
    },
    {
      name: 'dialog without focusables focuses the dialog itself',
      props: { open: false, title: 'Bare', showCloseButton: false },
      callbacks: ['onClose'],
      children: ['Plain text only'],
      interactions: [{ type: 'props', props: { open: true } }],
    },
    {
      name: 'tab wraps from the last focusable to the first',
      props: { open: false, title: 'Trap' },
      callbacks: ['onClose'],
      slots: {
        footer: [
          { component: 'Button', props: { variant: 'ghost' }, children: ['Cancel'] },
          { component: 'Button', children: ['Save'] },
        ],
      },
      children: ['Body'],
      interactions: [
        { type: 'props', props: { open: true } },
        { type: 'focus', selector: '[role="dialog"] div:last-child button:last-of-type' },
        { type: 'keydown', selector: '[role="dialog"]', key: 'Tab' },
      ],
    },
    {
      name: 'shift tab wraps from the first focusable to the last',
      props: { open: false, title: 'Trap' },
      callbacks: ['onClose'],
      slots: {
        footer: [
          { component: 'Button', props: { variant: 'ghost' }, children: ['Cancel'] },
          { component: 'Button', children: ['Save'] },
        ],
      },
      children: ['Body'],
      interactions: [
        { type: 'props', props: { open: true } },
        { type: 'keydown', selector: '[role="dialog"]', key: 'Tab', shiftKey: true },
      ],
    },
    {
      name: 'closing drops focus off the removed dialog',
      props: { open: true, title: 'Restore' },
      callbacks: ['onClose'],
      children: ['Body'],
      interactions: [{ type: 'props', props: { open: false } }],
    },
  ],
}
