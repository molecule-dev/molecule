/**
 * React UI components for molecule.dev.
 *
 * Provides React implementations of the `@molecule/app-ui` component
 * interfaces using the UIClassMap abstraction from `@molecule/app-ui`.
 *
 * @example
 * ```tsx
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * import { Button, Modal, Icon, EmptyState } from '@molecule/app-ui-react'
 * import { useState } from 'react'
 *
 * // Once at startup, before first render — components throw without it:
 * setClassMap(classMap)
 *
 * function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
 *   const [open, setOpen] = useState(false)
 *   return (
 *     <>
 *       <Button color="error" onClick={() => setOpen(true)}>
 *         <Icon name="trash" size={16} /> Delete
 *       </Button>
 *       <Modal open={open} onClose={() => setOpen(false)} title="Delete item?" data-mol-id="confirm-delete">
 *         <EmptyState title="This cannot be undone" />
 *         <Button color="error" onClick={onConfirm}>Confirm</Button>
 *       </Modal>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * Wiring prerequisites — get these right before debugging anything else:
 *
 * - **A ClassMap bond must be set before first render.** Every component resolves styling via
 *   `getClassMap()` from `@molecule/app-ui`, which THROWS ("No UIClassMap has been set") until
 *   `setClassMap(...)` runs with a bond like `@molecule/app-ui-tailwind`. Scaffolded apps do
 *   this in `bonds/index.ts` — keep that import first in `main.tsx`.
 * - **Some components require molecule providers from `@molecule/app-react`** and throw without
 *   them: `UserMenu`, `UserMenuPopover`, `LanguagePicker`, `SidebarUserCard`, `AuthGuard`, and
 *   `ThemeToggle` need `I18nProvider` (via `MoleculeProvider i18n={...}`); `ThemeToggle` also
 *   needs `ThemeProvider`; `AuthGuard` also needs `AuthProvider`. The primitive components
 *   (Button, Modal, Input, …) need only the ClassMap.
 * - **Router-linked components** (`UserMenu`, `UserMenuPopover`, `SidebarUserCard`, `Dropdown`
 *   item `href`s, `AuthGuard` redirects) render react-router `<Link>`/navigation — they need a
 *   react-router context (`<BrowserRouter>`) and, in workspace dev setups, the Vite
 *   `resolve.dedupe: ['react', 'react-dom', 'react-router-dom', 'react-router']` entry; a
 *   duplicate copy surfaces as "useHref may be used only in the context of a <Router>".
 * - **`UserMenu` panel content is `children`** (rendered inside the popover, with
 *   `PanelClose`/`usePanelClose` available) — there is no `renderPanel` prop.
 * - **`Icon` names are kebab-case `IconName`s from `@molecule/app-icons`** — an unknown name is
 *   a runtime error, not a blank. Extend via `CustomIconNames` augmentation, never raw SVG.
 * - **Name collisions with feature packages** — several feature packages export a
 *   same-named component; import from the package whose props/behavior you want:
 *   - `EmptyState` — also `@molecule/app-empty-state-react` (adds an icon badge,
 *     per-brand `className`/`dataMolId`, and a companion `<CtaCard>`). THIS one is the
 *     primitive icon/title/description/action variant.
 *   - `PageHeader` — also `@molecule/app-page-chrome-react` (adds `subtitle`, `icon`,
 *     `meta`, `emphasis` + a `<HeroSection>`). THIS one takes
 *     `title`/`description`/`actions`/`breadcrumbs`.
 *   - `Pagination` — the low-level page-window control (no "showing X of Y" text, no
 *     page-size selector); for those use `<PaginationBar>` from
 *     `@molecule/app-pagination-bar-react`.
 *
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
