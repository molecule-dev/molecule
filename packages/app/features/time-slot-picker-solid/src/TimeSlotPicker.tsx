/**
 * Solid time-slot picker: a radiogroup of selectable delivery / appointment
 * slots, each with a label and an optional meta line, in a list or a
 * fixed-column grid.
 *
 * Solid counterpart of `@molecule/app-time-slot-picker-react`'s
 * `TimeSlotPicker` — the same props (React names), the same DOM for the same
 * input, and the same `onSelect(slot)` calls.
 *
 * @module
 */

import { type Component, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { TimeSlot, TimeSlotPickerProps } from './types.js'

/**
 * Picker for delivery / appointment / reservation time slots. Each slot
 * shows a label + optional secondary meta (date, fee, remaining
 * capacity). Disabled slots are dimmed and not clickable.
 *
 * Selection is conveyed by `aria-checked` plus a bolder label only; the
 * component keeps no state, so the caller persists the pick from `onSelect`.
 *
 * @param props - Component props (see {@link TimeSlotPickerProps}).
 * @returns The rendered time-slot picker.
 */
export const TimeSlotPicker: Component<TimeSlotPickerProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // One stable record per slot id, so `<For>` (which keys by reference) keeps
  // a slot's DOM when the caller passes equal slots as new objects — React's
  // `key={s.id}`. A re-created button would re-write its `disabled` attribute,
  // which React only writes when the flag changes.
  interface Row {
    id: string
  }
  const rows = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const list = props.slots.map((slot) => {
      seen.add(slot.id)
      let row = rows.get(slot.id)
      if (!row) {
        row = { id: slot.id }
        rows.set(slot.id, row)
      }
      return row
    })
    for (const id of [...rows.keys()]) if (!seen.has(id)) rows.delete(id)
    return list
  }
  const slotFor = (id: string): TimeSlot | undefined => props.slots.find((slot) => slot.id === id)

  /**
   * React's radiogroup aria-label: the title text when it is a plain string
   * (a node title falls back to the translated label).
   * @returns The accessible name.
   */
  const ariaLabel = (): string =>
    typeof props.title === 'string'
      ? props.title
      : t('timeSlot.aria', {}, { defaultValue: 'Time slots' })

  /**
   * The slot container's class list: React's fixed-column grid or the list
   * stack.
   * @returns The class string.
   */
  const groupClass = (): string =>
    props.layout === 'grid' ? cm.grid({ cols: props.columns ?? 2, gap: 'sm' }) : cm.stack(2)

  /**
   * One slot button's class list (React's selected / unselected weight switch).
   * @param slot - The slot.
   * @returns The class string.
   */
  const buttonClass = (slot: TimeSlot): string =>
    cm.cn(
      cm.flex({ direction: 'col', align: 'start' }),
      cm.sp('p', 3),
      cm.textSize('sm'),
      slot.id === props.selectedId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )

  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      <Show when={props.title}>
        <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.title}</h3>
      </Show>
      <div role="radiogroup" aria-label={ariaLabel()} class={groupClass()}>
        <For each={keyedRows()}>
          {(row) => {
            const slot = (): TimeSlot => slotFor(row.id) as TimeSlot
            return (
              <button
                type="button"
                role="radio"
                aria-checked={slot().id === props.selectedId ? 'true' : 'false'}
                disabled={slot().disabled}
                onClick={() => {
                  if (!slot().disabled) props.onSelect?.(slot())
                }}
                class={buttonClass(slot())}
                style={slot().disabled ? { opacity: 0.4 } : undefined}
              >
                <span>{slot().label}</span>
                <Show when={slot().meta}>
                  <span class={cm.textSize('xs')}>{slot().meta}</span>
                </Show>
              </button>
            )
          }}
        </For>
      </div>
    </div>
  )
}
