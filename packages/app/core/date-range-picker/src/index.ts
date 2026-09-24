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
 * import type { DatePreset, DateRange } from '@molecule/app-date-range-picker'
 * import { requireProvider, setProvider } from '@molecule/app-date-range-picker'
 * import { provider } from '@molecule/app-date-range-picker-default'
 * import { t } from '@molecule/app-i18n'
 *
 * setProvider(provider) // once, at app startup (bonds.ts)
 *
 * const DAY_MS = 86_400_000
 * const today = new Date()
 * const daysAgo = (n: number): Date => new Date(today.getTime() - n * DAY_MS)
 * const last30: DatePreset = {
 *   label: t('dates.last30', undefined, { defaultValue: 'Last 30 days' }),
 *   range: { startDate: daysAgo(30), endDate: today },
 * }
 *
 * let reportRange: DateRange | null = null
 * const picker = requireProvider().createPicker({
 *   startDate: daysAgo(7),
 *   endDate: today,
 *   maxDate: today, // picks after today are clamped to today
 *   presets: [last30], // your UI renders these as buttons
 *   onChange: (range) => {
 *     reportRange = range // re-query the report
 *   },
 * })
 *
 * // A preset button's click handler feeds its range into the instance.
 * const onPresetClick = (preset: DatePreset): void => picker.setValue(preset.range)
 * onPresetClick(last30)
 * const selected = picker.getValue() // DateRange | null
 * const query = { from: selected?.startDate.toISOString(), to: selected?.endDate.toISOString() }
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
 * - **The default bond only CLAMPS to `minDate`/`maxDate` — it never swaps an
 *   inverted range** (`startDate > endDate` is stored as given). Order the two dates
 *   in your UI before `setValue()`. `presets` are not applied by the instance: your
 *   preset button calls `setValue(preset.range)`. `onChange` fires only from
 *   `setValue()` (not from the initial options or `clear()`).
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
