/**
 * `DeviceFrameSelector` cases: the preview's device-frame dropdown — the closed
 * trigger for each frame and className, the open menu's rows (radio frames,
 * the conditional Rotate toggle and Open-in-new-tab action behind the
 * divider), selecting a frame and running an action with the pointer and with
 * the keyboard (opening at the current frame, roving with wrapping, Home/End,
 * Escape and Tab close, an outside click, the trigger's own toggle), the
 * highlight following the pointer, hover's styled tooltip, a frame and a
 * `rotated` prop change, and the pseudo-locale wrapping every translated
 * label.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The trigger button. */
const TRIGGER = '[data-mol-id="preview-device-cycle"]'

/** The open menu. */
const MENU = 'div[role="menu"]'

/** `DeviceFrameSelector`. */
export const deviceFrameSelectorCases: FeatureComponentCases = {
  component: 'DeviceFrameSelector',
  cases: [
    // ── The closed trigger ───────────────────────────────────────────────────
    { name: 'desktop selected', props: { current: 'desktop' }, callbacks: ['onChange'] },
    { name: 'responsive selected', props: { current: 'none' }, callbacks: ['onChange'] },
    {
      name: 'a className lands on the trigger',
      props: { current: 'none', className: 'parity-extra' },
      callbacks: ['onChange'],
    },
    {
      name: 'hovering the trigger shows the styled tooltip',
      props: { current: 'none' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'mouseenter', selector: TRIGGER },
        { type: 'mouseleave', selector: TRIGGER },
      ],
    },
    {
      name: 'a props change swaps the frame the trigger shows',
      props: { current: 'none' },
      callbacks: ['onChange'],
      interactions: [{ type: 'props', props: { current: 'mobile' } }],
    },

    // ── The open menu: device frames ─────────────────────────────────────────
    {
      name: 'opening the menu lists every frame with the current one checked',
      props: { current: 'tablet' },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: TRIGGER }],
    },
    {
      name: 'hovering a row highlights it and clicking it selects the frame',
      props: { current: 'none' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'click', selector: TRIGGER },
        { type: 'mouseenter', selector: '[data-mol-id="preview-device-option-mobile"]' },
        { type: 'click', selector: '[data-mol-id="preview-device-option-mobile"]' },
      ],
    },
    {
      name: 'clicking the open trigger closes it without refocusing',
      props: { current: 'none' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'click', selector: TRIGGER },
        { type: 'click', selector: TRIGGER },
      ],
    },
    {
      name: 'an outside click closes the menu without refocusing',
      props: { current: 'none' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'click', selector: TRIGGER },
        { type: 'pointerdown', selector: 'body' },
      ],
    },

    // ── The keyboard ─────────────────────────────────────────────────────────
    {
      name: 'the keyboard opens at the current frame and roves with wrapping',
      props: { current: 'tablet' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'keydown', selector: TRIGGER, key: 'ArrowDown' },
        { type: 'keydown', selector: MENU, key: 'ArrowDown' },
        { type: 'keydown', selector: MENU, key: 'Home' },
        { type: 'keydown', selector: MENU, key: 'End' },
        { type: 'keydown', selector: MENU, key: 'ArrowUp' },
        { type: 'keydown', selector: MENU, key: 'Escape' },
      ],
    },
    {
      name: 'Enter and Space open the menu and ArrowUp opens at the last row',
      props: { current: 'none' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'keydown', selector: TRIGGER, key: 'Enter' },
        { type: 'keydown', selector: MENU, key: 'Escape' },
        { type: 'keydown', selector: TRIGGER, key: ' ' },
        { type: 'keydown', selector: MENU, key: 'Escape' },
        { type: 'keydown', selector: TRIGGER, key: 'ArrowUp' },
      ],
    },
    {
      name: 'Tab collapses the menu where the focus is',
      props: { current: 'none' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'click', selector: TRIGGER },
        { type: 'keydown', selector: MENU, key: 'Tab' },
      ],
    },

    // ── The action rows (P4-04) ──────────────────────────────────────────────
    {
      name: 'open in new tab hosts its action row behind a divider',
      props: { current: 'none' },
      callbacks: ['onChange', 'onOpenExternal'],
      interactions: [
        { type: 'click', selector: TRIGGER },
        { type: 'click', selector: '[data-mol-id="preview-open-external"]' },
      ],
    },
    {
      name: 'rotate is a checked toggle on a rotatable frame and fires onRotate',
      props: { current: 'tablet', canRotate: true, rotated: true },
      callbacks: ['onChange', 'onRotate'],
      interactions: [
        { type: 'click', selector: TRIGGER },
        { type: 'click', selector: '[data-mol-id="preview-device-rotate"]' },
      ],
    },
    {
      name: 'rotate hides for a fluid frame while open in new tab stays',
      props: { current: 'none', canRotate: true, rotated: true },
      callbacks: ['onChange', 'onRotate', 'onOpenExternal'],
      interactions: [{ type: 'click', selector: TRIGGER }],
    },
    {
      name: 'rotate needs its handler even on a rotatable frame',
      props: { current: 'tablet', canRotate: true },
      callbacks: ['onChange', 'onOpenExternal'],
      interactions: [{ type: 'click', selector: TRIGGER }],
    },
    {
      name: 'the keyboard crosses the divider into the action rows',
      props: { current: 'mobile', canRotate: true },
      callbacks: ['onChange', 'onRotate', 'onOpenExternal'],
      interactions: [
        { type: 'click', selector: TRIGGER },
        { type: 'keydown', selector: MENU, key: 'ArrowDown' },
        { type: 'keydown', selector: MENU, key: 'ArrowDown' },
        { type: 'keydown', selector: MENU, key: 'ArrowDown' },
      ],
    },
    {
      name: 'a rotated prop change updates the open menu’s toggle',
      props: { current: 'tablet', canRotate: true },
      callbacks: ['onChange', 'onRotate'],
      interactions: [
        { type: 'click', selector: TRIGGER },
        { type: 'props', props: { rotated: true } },
      ],
    },

    // ── i18n ─────────────────────────────────────────────────────────────────
    {
      name: 'the pseudo-locale wraps every translated label',
      props: { current: 'tablet' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'locale', locale: 'en-XA' },
        { type: 'click', selector: TRIGGER },
      ],
    },
  ],
}
