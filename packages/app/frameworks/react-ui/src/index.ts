/**
 * React UI components for molecule.dev.
 *
 * Provides React implementations of the `@molecule/app-ui` component
 * interfaces using the UIClassMap abstraction from `@molecule/app-ui`.
 *
 * @remarks
 * A11y contracts worth knowing before you debug "it doesn't look like it's
 * doing anything" on these components:
 *
 * - **`Modal`** implements the WAI-ARIA APG dialog pattern: opening moves
 *   focus to the first focusable element inside the dialog (or the dialog
 *   itself when it has none); Tab/Shift+Tab are trapped inside; closing
 *   restores focus to whatever opened it. Stacked dialogs (a confirm above a
 *   drawer) register on a module-level stack — Escape and the Tab trap only
 *   act for the TOPMOST dialog, and the body scroll lock is
 *   reference-counted, so closing one of several open dialogs never unlocks
 *   scroll behind the ones still open. `centered={false}` top-anchors the
 *   dialog instead of vertically centering it (an inline-style exception —
 *   `UIClassMap` has no `dialogWrapper({ centered })` resolver yet).
 * - **`Dropdown`** implements the WAI-ARIA APG menu-button pattern: the
 *   `trigger` is made a real, keyboard-operable control (cloned with
 *   `aria-haspopup`/`aria-expanded`/`aria-controls` when it's a single
 *   element; wrapped in a `role="button" tabIndex={0}` container otherwise).
 *   Enter/Space/ArrowDown open the menu and focus the first item (ArrowUp
 *   opens to the last); once open, ArrowUp/Down/Home/End roving-navigate the
 *   `menuitem`s, Escape closes and returns focus to the trigger, and Tab
 *   closes the menu in sync with focus leaving it (native menus don't trap
 *   Tab). `width="trigger"` never renders literal `width: 'trigger'` CSS on
 *   the not-yet-measurable first-open frame — it renders unset instead.
 * - **`Tooltip`** requires a single element as `children` for its content to
 *   be programmatically associated (`aria-describedby`, injected via
 *   `cloneElement`) with the actually-focused/hovered control — a non-element
 *   `children` still shows visually but without that association.
 *   `hasArrow` renders a small themed pointer at the resolved `placement`.
 * - **`Toast`** pauses its auto-dismiss countdown on hover AND focus (WCAG
 *   2.2.1) and resumes with whatever time was left. The announced role
 *   follows `status`: `warning`/`error` get the assertive `role="alert"`;
 *   every other status gets the polite `role="status"` so a routine
 *   confirmation doesn't interrupt a screen reader mid-sentence.
 * - **`Alert`** takes a `live` prop (default `true`, matching the previous
 *   unconditional behavior): `live={false}` switches it from the assertive
 *   `role="alert"` to the polite `role="status"` for a banner that's part of
 *   the page's normal (not dynamically-appearing) content.
 * - **`UserMenuPopover*`**: `UserMenuPopoverPanel` is a disclosure region
 *   (`aria-expanded` + `aria-controls` on the trigger, no role on the panel
 *   itself), NOT `role="menu"` — it renders a header plus a `<nav>` of
 *   arbitrary links, which is invalid content for `role="menu"` (that role
 *   may contain ONLY `menuitem` descendants).
 * - **`Switch`** dispatches a REAL native `change` Event through its hidden
 *   checkbox — `event.preventDefault()`, `event.currentTarget`, and
 *   `event.stopPropagation()` all behave like they do for any native input
 *   (previously the handler received a synthesized `{ target: { checked } }`
 *   object that crashed on any of those).
 * - **`Tabs`** implements the WAI-ARIA APG tabs pattern: roving tabindex
 *   (only the active tab is in the Tab order) with ArrowLeft/ArrowRight/
 *   Home/End moving focus and selection.
 * - **`FormField`** wires `aria-describedby` from its error paragraph onto
 *   the child input automatically (falling back to a `useId()`-derived id
 *   when no `name` prop is given) — don't duplicate the association by hand.
 * - **`Progress`** clamps `aria-valuenow` into `[0, max]` to match the
 *   clamped visual bar, so out-of-range values never announce impossible
 *   percentages.
 * - **`Textarea`** `autoResize` also works uncontrolled (`defaultValue` +
 *   user typing): it listens to `input` events rather than only reacting to
 *   the controlled `value` prop.
 *
 * @module
 */

export * from './components/index.js'
export * from './types.js'
export * from './utilities.js'
