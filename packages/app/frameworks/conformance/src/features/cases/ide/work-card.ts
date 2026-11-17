/**
 * `WorkCard` cases: the work tray above the composer — one full-width frame
 * with a chip row (its header element), an open section's detail (its detail
 * element) and the strips themselves, which draw their chips and open details
 * into the tray through a `DockStrip` (the sections' shared chrome, itself a
 * part). The cases render the tray with one or two strips inside: a chip
 * click opens that section and a second click closes it, opening another
 * section closes the first, Enter and Space work the chip, an `onActivate`
 * chip opens elsewhere instead of disclosing, a chip's `actions` take their
 * own clicks, the dark theme swaps the frame's border and surface, and plain
 * children (or none) leave the frame standing.
 *
 * The strips are the tray's `DockStrip` part: `expanded` and its `onToggle`
 * are inert here (the tray chip toggles the tray's one open section instead),
 * which is why the recorded calls stay empty except where an `onActivate`
 * fires.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The plan section's chip in the tray's header row. */
const PLAN_CHIP = '[data-mol-id="plan-toggle"]'
/** The uncommitted-files section's chip. */
const FILES_CHIP = '[data-mol-id="files-toggle"]'
/** A button the files section passes in `actions`. */
const FILES_ACTION = '[data-mol-id="files-action"]'

/** The plan section: a labeled strip with a detail to show when open. */
const planStrip = {
  component: 'DockStrip',
  props: {
    molId: 'plan-strip',
    toggleMolId: 'plan-toggle',
    expanded: false,
    label: 'Working plan',
    onToggle: { $callback: 'onToggle' },
  },
  children: [{ tag: 'div', attrs: { 'data-mol-id': 'plan-detail-content' } }],
}

/** The uncommitted-files section: an icon-only chip with an action beside it. */
const filesStrip = {
  component: 'DockStrip',
  props: {
    molId: 'files-strip',
    toggleMolId: 'files-toggle',
    expanded: false,
    label: 'Uncommitted files',
    hideLabel: true,
    chipTitle: '2 files to commit',
    actions: {
      $nodes: [
        {
          tag: 'button',
          attrs: { type: 'button', 'data-mol-id': 'files-action' },
          children: ['Commit 2 files'],
        },
      ],
    },
    onToggle: { $callback: 'onToggle' },
  },
  children: [{ tag: 'div', attrs: { 'data-mol-id': 'files-detail-content' } }],
}

/** `WorkCard`. */
export const workCardCases: FeatureComponentCases = {
  component: 'WorkCard',
  cases: [
    {
      name: 'the tray frame holds its chips with nothing open',
      children: [planStrip, filesStrip],
    },
    {
      name: 'a chip click opens its section and a second click closes it',
      children: [planStrip],
      interactions: [
        { type: 'click', selector: PLAN_CHIP },
        { type: 'click', selector: PLAN_CHIP },
      ],
    },
    {
      name: 'opening another section closes the first',
      children: [planStrip, filesStrip],
      interactions: [
        { type: 'click', selector: PLAN_CHIP },
        { type: 'click', selector: FILES_CHIP },
      ],
    },
    {
      name: 'Enter and Space work the chip as they work the row',
      children: [planStrip],
      interactions: [
        { type: 'keydown', selector: PLAN_CHIP, key: 'Enter' },
        { type: 'keydown', selector: PLAN_CHIP, key: ' ' },
      ],
    },
    {
      name: 'an activation opens elsewhere instead of disclosing',
      children: [
        {
          component: 'DockStrip',
          props: {
            molId: 'plan-strip',
            toggleMolId: 'plan-toggle',
            expanded: true,
            label: 'Tests',
            onActivate: { $callback: 'onActivate' },
            onToggle: { $callback: 'onToggle' },
          },
          children: [{ tag: 'div', attrs: { 'data-mol-id': 'plan-detail-content' } }],
        },
      ],
      interactions: [{ type: 'click', selector: PLAN_CHIP }],
    },
    {
      name: 'the dark theme swaps the frame border and surface',
      children: [planStrip],
      context: { theme: 'dark' },
    },
    {
      name: 'a chip action click is its own and the chip still toggles',
      children: [filesStrip],
      interactions: [
        { type: 'click', selector: FILES_ACTION },
        { type: 'click', selector: FILES_CHIP },
      ],
    },
    {
      name: 'plain children render inside the frame after the header and detail',
      children: [
        { tag: 'div', attrs: { 'data-mol-id': 'one' }, children: ['first'] },
        { tag: 'div', attrs: { 'data-mol-id': 'two' }, children: ['second'] },
      ],
    },
    {
      name: 'no children leaves the header and detail alone',
    },
  ],
}
