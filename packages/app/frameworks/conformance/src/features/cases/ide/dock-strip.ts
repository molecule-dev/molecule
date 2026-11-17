/**
 * `DockStrip` cases: the shared chrome of the strips stacked above the
 * composer — the disclosure header row (chevron, leading icon, muted label,
 * quieter hint, right-hand actions), the chevron's rotation with `expanded`,
 * the indented detail underneath, `onActivate` replacing the inline disclosure
 * with a direct open (no chevron, no `aria-expanded`, no detail, even when
 * `expanded` and `children` are given), the icon-only header (`hideLabel`:
 * the string label becomes the control's accessible name, a node label names
 * nothing), extra `rootProps` on the root, and the overlay disclosure button.
 *
 * The row holds an `actions` slot, and a button may not contain controls (axe
 * `nested-interactive`), so the row is a plain container whose FIRST child is
 * an empty, transparent native button over it — `data-mol-id` lives on that
 * button, which is why the selectors below still name the row. A native
 * button turns Enter and Space into a click itself, so the kit presses no keys
 * here; the keyboard path is the button's own activation behavior. The action
 * buttons are the overlay's siblings in a `position: relative` wrapper, so
 * their clicks never reach it.
 *
 * `chipLabel`, `chipTitle` and the work-tray branch (a chip + detail portalled
 * into a `WorkTrayContext`) are the tray's own surface: the kit mounts one
 * component with no tray provider, so every case here is a standalone strip
 * and the tray-only props pass through with no effect on the DOM.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The strip's clickable header row. */
const TOGGLE = '[data-mol-id="plan-toggle"]'
/** A button passed in `actions`, inside the header row. */
const ACTION = '[data-mol-id="plan-action"]'

/** `DockStrip`. */
export const dockStripCases: FeatureComponentCases = {
  component: 'DockStrip',
  cases: [
    {
      name: 'a collapsed strip toggled by its overlay button',
      props: {
        molId: 'plan-strip',
        toggleMolId: 'plan-toggle',
        expanded: false,
        label: 'Working plan',
      },
      callbacks: ['onToggle'],
      interactions: [
        { type: 'click', selector: TOGGLE },
        { type: 'click', selector: TOGGLE },
      ],
    },
    {
      name: 'an expanded strip shows its detail and folds it away',
      props: {
        molId: 'plan-strip',
        toggleMolId: 'plan-toggle',
        expanded: true,
        label: 'Working plan',
        hint: 'updating todos',
      },
      callbacks: ['onToggle'],
      children: [{ tag: 'div', attrs: { 'data-mol-id': 'plan-detail' } }],
      interactions: [
        { type: 'props', props: { expanded: false } },
        { type: 'props', props: { expanded: true } },
      ],
    },
    {
      name: 'an activation opens elsewhere instead of disclosing',
      props: {
        molId: 'plan-strip',
        toggleMolId: 'plan-toggle',
        expanded: true,
        label: 'Tests',
        onActivate: { $callback: 'onActivate' },
      },
      callbacks: ['onToggle', 'onActivate'],
      children: [{ tag: 'div', attrs: { 'data-mol-id': 'plan-detail' } }],
      interactions: [{ type: 'click', selector: TOGGLE }],
    },
    {
      name: 'a hidden label names the row for the reader',
      props: {
        molId: 'files-strip',
        toggleMolId: 'files-toggle',
        expanded: false,
        label: 'Uncommitted files',
        hideLabel: true,
        // The tray chip's shorter label and hover text: no effect on a
        // standalone strip, whose header is the row itself.
        chipLabel: '2 files',
        chipTitle: '2 files to commit',
      },
      callbacks: ['onToggle'],
      interactions: [{ type: 'click', selector: '[data-mol-id="files-toggle"]' }],
    },
    {
      name: 'a node label and a node hint render as nodes with no accessible name',
      props: {
        molId: 'files-strip',
        toggleMolId: 'files-toggle',
        expanded: false,
        label: { $nodes: [{ tag: 'span', attrs: { 'data-mol-id': 'label-node' } }, ' files'] },
        hideLabel: true,
        hint: { $nodes: [{ tag: 'em', attrs: { 'data-mol-id': 'hint-node' } }] },
      },
      callbacks: ['onToggle'],
      interactions: [{ type: 'click', selector: '[data-mol-id="files-toggle"]' }],
    },
    {
      name: 'actions and detail actions sit right of the label',
      props: {
        molId: 'files-strip',
        toggleMolId: 'files-toggle',
        expanded: false,
        label: 'Uncommitted files',
        icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'commit' } }] },
        actions: {
          $nodes: [
            {
              tag: 'button',
              attrs: { type: 'button', 'data-mol-id': 'plan-action' },
              children: ['Commit'],
            },
          ],
        },
        detailActions: {
          $nodes: [
            {
              tag: 'button',
              attrs: { type: 'button', 'data-mol-id': 'plan-detail-action' },
              children: ['Discard'],
            },
          ],
        },
      },
      callbacks: ['onToggle'],
      interactions: [
        // The action sits in a wrapper above the overlay button, so its click
        // is its own — the row does not toggle.
        { type: 'click', selector: ACTION },
        { type: 'click', selector: '[data-mol-id="files-toggle"]' },
      ],
    },
    {
      name: 'the root carries the extra attributes it is given',
      props: {
        molId: 'plan-strip',
        toggleMolId: 'plan-toggle',
        expanded: false,
        label: 'Working plan',
        rootProps: { 'data-tone': 'running' },
      },
      callbacks: ['onToggle'],
      interactions: [{ type: 'props', props: { rootProps: { 'data-tone': 'failed' } } }],
    },
  ],
}
