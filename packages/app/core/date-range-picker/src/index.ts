/**
 * Date range picker core interface for molecule.dev.
 *
 * Framework-agnostic contract for date-range selection **state** (start/end,
 * min/max clamps, presets, single-date mode). Bond a provider (e.g.
 * `@molecule/app-date-range-picker-default`) to supply the logic; your UI
 * renders the calendar/presets and feeds selections into the instance.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/app-date-range-picker'
 * import { provider } from '@molecule/app-date-range-picker-default'
 *
 * setProvider(provider)                    // once, at app startup (bonds.ts)
 *
 * const picker = requireProvider().createPicker({
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 *   presets: [{ label: t('dates.last30', undefined, { defaultValue: 'Last 30 days' }), range: last30 }],
 *   onChange: (range) => loadReport(range),
 * })
 * ```
 *
 * @remarks
 * - **The instance is headless — it renders no calendar.** Render your own
 *   calendar/preset UI (styled via `getClassMap()`/`cm.*`, all labels through
 *   `t('key', values, { defaultValue })`) and drive the instance; `onChange` fires
 *   with a `{ startDate, endDate }` range.
 * - **Wire with THIS package's `setProvider()` or `bond('date-range-picker', …)`** —
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so both
 *   write the same slot; `requireProvider()` throws until one has run.
 * - **There is no `locale` option** — the instance is a pure value store of
 *   `Date` objects and emits no formatted/labelled output, so a locale knob here
 *   would be inert. Format displayed dates in your rendering layer with the i18n
 *   layer (`formatDate` from `@molecule/app-i18n`), never `toLocaleDateString`
 *   with a hardcoded locale.
 * - Send API-bound dates as ISO strings; the server must re-validate the range
 *   (order, bounds) — client clamping via `minDate`/`maxDate` is UX, not a boundary.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual calendar/preset UI and whatever the selected
 * range filters, and check every box off one by one. A box you can't check is
 * an integration bug to fix — not a skip:
 * - [ ] Selecting a start date then an end date produces a valid range with
 *   `startDate <= endDate`, that exact range shows in the input/display, and it
 *   fires once via `onChange` with a `{ startDate, endDate }` payload.
 * - [ ] Picking an end earlier than the start never yields an inverted range —
 *   the UI either swaps them (start stays <= end) or blocks the pick; confirm by
 *   reading both the displayed range and the `onChange` payload.
 * - [ ] Each exposed preset sets the correct range: a "Last 7 days" preset
 *   selects today-minus-6 through today (inclusive), and the calendar + display
 *   reflect that span.
 * - [ ] `minDate`/`maxDate` bounds hold in the UI — a date outside the allowed
 *   window can't be picked (it renders out-of-range/greyed), and any disabled
 *   dates are non-selectable.
 * - [ ] If the app uses single-date mode (`singleDate: true`), picking one day
 *   sets `startDate` and `endDate` to that same day and `onChange` fires with a
 *   same-day range — no second click required.
 * - [ ] The selected range drives its consumer: the filtered list/report/chart
 *   that reads the range re-queries and shows only rows within it — change the
 *   range and the results change with it.
 * - [ ] Clearing resets the selection — the display empties, `getValue()` returns
 *   `null`, and the dependent view returns to its unfiltered/default state.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
