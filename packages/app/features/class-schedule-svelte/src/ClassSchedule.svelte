<!--
  ClassSchedule: the Svelte counterpart of `@molecule/app-class-schedule-react`'s
  `ClassSchedule` — a 7-day × N-hour weekly timetable with absolutely
  positioned event tiles inside each day column. Overlapping events on the same
  weekday split into side-by-side lanes, and click handlers fire separately for
  event tiles and empty time slots. Same props (React names), same DOM for the
  same input.
-->
<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity'

  import { useLocale, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { assignLanes, formatHourLabel } from './helpers.js'
  import type { ClassScheduleProps, ScheduleEvent } from './types.js'

  let {
    events,
    weekStartsOn = 1,
    dayHours = [8, 18],
    cellHeight = 60,
    showWeekendCols = true,
    locale,
    onEventClick,
    onSlotClick,
    className,
  }: ClassScheduleProps = $props()

  // Base of the day headers' ids — the columns' `aria-labelledby` names them
  // (a generated id, never one derived from data); `$props.id()` is this
  // instance's stable id (React's `useId()`).
  const baseId = $props.id()

  /** Minutes in one hour. */
  const MINUTES_PER_HOUR = 60
  /** Weekday numbers that fall on the weekend (`0` = Sunday, `6` = Saturday). */
  const WEEKEND_DAYS = new Set<number>([0, 6])
  /** The ISO weekday numbers, Sunday first. */
  const ALL_WEEKDAYS: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [0, 1, 2, 3, 4, 5, 6]

  /** One positioned event tile. */
  interface TileModel {
    event: ScheduleEvent
    topPx: number
    heightPx: number
    leftPct: number
    widthPct: number
    label: string
  }

  const cm = getClassMap()
  const { t } = useTranslation()
  // Read through `$activeLocale` in the derived below, so the weekday headers
  // re-word on a locale switch. An explicit `locale` prop still wins.
  const activeLocale = useLocale()

  const safeStart = $derived(Math.max(0, Math.min(23, Math.floor(dayHours[0]))))
  const safeEnd = $derived(Math.max(safeStart + 1, Math.min(24, Math.floor(dayHours[1]))))
  const startMinutes = $derived(safeStart * MINUTES_PER_HOUR)
  const endMinutes = $derived(safeEnd * MINUTES_PER_HOUR)
  const totalMinutes = $derived(endMinutes - startMinutes)
  const hourCount = $derived(safeEnd - safeStart)
  const totalHeightPx = $derived(hourCount * cellHeight)
  const hours = $derived(Array.from({ length: hourCount }, (_, i) => i))

  // Column ordering: rotate weekdays so `weekStartsOn` is first.
  const rotated = $derived([
    ...ALL_WEEKDAYS.slice(weekStartsOn),
    ...ALL_WEEKDAYS.slice(0, weekStartsOn),
  ])
  const visibleWeekdays = $derived(
    showWeekendCols ? rotated : rotated.filter((d) => !WEEKEND_DAYS.has(d)),
  )

  // Localized weekday header — locale data, not phrases, so it is Intl output
  // in the app's active locale (an explicit `locale` prop still wins), and it
  // follows a locale switch. Use a known reference Sunday (1970-01-04 was a
  // Sunday) so each weekday number maps to a real Date the formatter renders.
  const weekdayFmt = $derived(
    new Intl.DateTimeFormat(locale ?? $activeLocale, { weekday: 'short' }),
  )

  /**
   * Localized short weekday name for a given ISO weekday number.
   *
   * @param weekday - ISO weekday number (0 = Sunday … 6 = Saturday).
   * @returns Localized short weekday name, e.g. `"Mon"`.
   */
  function weekdayLabel(weekday: number): string {
    return weekdayFmt.format(new Date(Date.UTC(1970, 0, 4 + weekday)))
  }

  // Group events by weekday + run lane assignment per day.
  const eventsByDay = $derived.by(() => {
    const map = new SvelteMap<number, ScheduleEvent[]>()
    for (const event of events) {
      if (!visibleWeekdays.includes(event.weekday)) continue
      const list = map.get(event.weekday) ?? []
      list.push(event)
      map.set(event.weekday, list)
    }
    return map
  })

  /**
   * The positioned event tiles of one day column, in input order (events
   * outside the visible hours are dropped, as React returns `null` for them).
   *
   * @param weekday - The day column.
   * @returns The tiles to render.
   */
  function tilesFor(weekday: number): TileModel[] {
    const tiles: TileModel[] = []
    for (const { event, lane, lanes } of assignLanes(eventsByDay.get(weekday) ?? [])) {
      const eventStart = Math.max(event.start, startMinutes)
      const eventEnd = Math.min(event.end, endMinutes)
      if (eventEnd <= eventStart) continue
      tiles.push({
        event,
        topPx: ((eventStart - startMinutes) / totalMinutes) * totalHeightPx,
        heightPx: ((eventEnd - eventStart) / totalMinutes) * totalHeightPx,
        leftPct: (lane / lanes) * 100,
        widthPct: (1 / lanes) * 100,
        label: t(
          'classSchedule.aria.event',
          {
            weekday: weekdayLabel(weekday),
            start: formatHourLabel(event.start),
            end: formatHourLabel(event.end),
          },
          { defaultValue: '{{weekday}} {{start}} – {{end}}' },
        ),
      })
    }
    return tiles
  }

  /**
   * The accessible label of one empty-slot hit target.
   *
   * @param weekday - The day column.
   * @param slotStart - The slot's start in minutes from midnight.
   * @returns The translated label.
   */
  function slotLabel(weekday: number, slotStart: number): string {
    return t(
      'classSchedule.aria.slot',
      { weekday: weekdayLabel(weekday), time: formatHourLabel(slotStart) },
      { defaultValue: 'Empty slot, {{weekday}} {{time}}' },
    )
  }

  /**
   * Writes the inline style as the element's literal `style` attribute.
   *
   * Svelte's own style handling assigns `node.style.cssText`, and jsdom's CSS
   * parser then discards a `background` shorthand declaration — so the
   * attribute is written directly, which keeps every declaration React emits.
   *
   * @param node - The element to style.
   * @param value - The style declarations.
   * @returns The action's update hook.
   */
  function styleAttribute(node: HTMLElement, value: string): { update(next: string): void } {
    node.setAttribute('style', value)
    return {
      update(next: string): void {
        node.setAttribute('style', next)
      },
    }
  }

  /**
   * The inline style of one slot hit target (an invisible overlay).
   *
   * @param index - The hour row.
   * @returns The style declarations.
   */
  function slotStyle(index: number): string {
    return `position: absolute; top: ${index * cellHeight}px; left: 0px; right: 0px; height: ${cellHeight}px; background: transparent; border: 0px; padding: 0px; cursor: pointer`
  }

  /**
   * The inline style of one event tile.
   *
   * @param tile - The tile to style.
   * @returns The style declarations.
   */
  function tileStyle(tile: TileModel): string {
    const style = `position: absolute; top: ${tile.topPx}px; height: ${tile.heightPx}px; left: calc(${tile.leftPct}% + 2px); width: calc(${tile.widthPct}% - 4px); overflow: hidden; text-align: left; cursor: ${onEventClick ? 'pointer' : 'default'}`
    // The caller's accentColor drives an inset bar (DESIGN.md → "Accent
    // bars") through the CSS variable, not a hard border-left.
    return tile.event.accentColor ? `${style}; --mol-accent: ${tile.event.accentColor}` : style
  }
</script>

<!-- A named `group`, not a `grid`: the layout is a CSS grid, not an ARIA
     grid — it has no rows and no grid keyboard model, and `role="grid"`
     would promise one (axe: aria-required-children). -->
<div
  class={cm.cn(className)}
  data-mol-id="class-schedule"
  role="group"
  aria-label={t('classSchedule.aria.region', {}, { defaultValue: 'Weekly class schedule' })}
>
  <div
    class={cm.cn(cm.grid({ cols: visibleWeekdays.length + 1, gap: 'none' }))}
    style="grid-template-columns: auto repeat({visibleWeekdays.length}, minmax(0, 1fr))"
  >
    <!-- Header row -->
    <div
      class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.sp('p', 2))}
      aria-hidden="true"
    ></div>
    {#each visibleWeekdays as weekday (weekday)}
      <div
        id={`${baseId}-day-${weekday}`}
        data-mol-id="class-schedule-day-header"
        data-weekday={weekday}
        class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter, cm.sp('p', 2))}
      >
        {weekdayLabel(weekday)}
      </div>
    {/each}

    <!-- Time-axis column -->
    <div
      data-mol-id="class-schedule-time-axis"
      class={cm.cn(cm.position('relative'))}
      style="height: {totalHeightPx}px"
    >
      {#each hours as index (index)}
        <div
          data-mol-id="class-schedule-hour-label"
          class={cm.cn(cm.textSize('xs'), cm.sp('px', 2))}
          style="position: absolute; top: {index *
            cellHeight}px; height: {cellHeight}px; right: 0px; left: 0px; text-align: right;"
        >
          {formatHourLabel(startMinutes + index * MINUTES_PER_HOUR)}
        </div>
      {/each}
    </div>

    <!-- Day columns — each one a `group` named by its weekday header. -->
    {#each visibleWeekdays as weekday (weekday)}
      <div
        role="group"
        aria-labelledby={`${baseId}-day-${weekday}`}
        data-mol-id="class-schedule-day-column"
        data-weekday={weekday}
        class={cm.cn(cm.position('relative'))}
        style="height: {totalHeightPx}px"
      >
        <!-- Empty-slot click targets — one button per hour row, only while
             `onSlotClick` is set: a focusable button that does nothing would
             be a keyboard trap. -->
        {#if onSlotClick}
          {#each hours as index (index)}
            <button
              type="button"
              data-mol-id="class-schedule-slot"
              data-weekday={weekday}
              data-start={startMinutes + index * MINUTES_PER_HOUR}
              aria-label={slotLabel(weekday, startMinutes + index * MINUTES_PER_HOUR)}
              onclick={() =>
                onSlotClick?.({ weekday, start: startMinutes + index * MINUTES_PER_HOUR })}
              use:styleAttribute={slotStyle(index)}
            ></button>
          {/each}
        {/if}

        <!-- Event tiles -->
        {#each tilesFor(weekday) as tile (tile.event.id)}
          {#snippet tileInner(event: ScheduleEvent, label: string)}
            <span data-mol-id="class-schedule-event-title"
              >{#if typeof event.title === 'function'}{@render event.title?.()}{:else}{event.title ??
                  ''}{/if}</span
            >
            {#if event.subtitle}
              <span
                data-mol-id="class-schedule-event-subtitle"
                class={cm.cn(cm.textSize('xs'), cm.fontWeight('normal'))}
                >{#if typeof event.subtitle === 'function'}{@render event.subtitle?.()}{:else}{event.subtitle}{/if}</span
              >
            {/if}
            {#if event.meta}
              <span
                data-mol-id="class-schedule-event-meta"
                class={event.accentColor
                  ? cm.accentCardLabel({ tone: 'custom' })
                  : cm.cn(cm.textSize('xs'), cm.fontWeight('normal'))}
                >{#if typeof event.meta === 'function'}{@render event.meta?.()}{:else}{event.meta}{/if}</span
              >
            {/if}
            <!-- The tile's accessible name is its content — title, subtitle,
                 meta, then the time, through a visually hidden run (the
                 former `aria-label` REPLACED that content as the name, so a
                 screen reader never heard the class). -->
            <span class={cm.srOnly}>{label}</span>
          {/snippet}
          <!-- A `<button>` only while `onEventClick` is set: without a
               handler the tile is static content — a focusable button that
               does nothing would be a keyboard trap. -->
          {#if onEventClick}
            <button
              type="button"
              data-mol-id="class-schedule-event"
              data-event-id={tile.event.id}
              onclick={() => onEventClick?.(tile.event)}
              class={cm.cn(
                cm.flex({ direction: 'col', align: 'start' }),
                cm.sp('p', 1),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                tile.event.accentColor && cm.accentCard({ tone: 'custom' }),
              )}
              use:styleAttribute={tileStyle(tile)}
            >
              {@render tileInner(tile.event, tile.label)}
            </button>
          {:else}
            <div
              data-mol-id="class-schedule-event"
              data-event-id={tile.event.id}
              class={cm.cn(
                cm.flex({ direction: 'col', align: 'start' }),
                cm.sp('p', 1),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                tile.event.accentColor && cm.accentCard({ tone: 'custom' }),
              )}
              use:styleAttribute={tileStyle(tile)}
            >
              {@render tileInner(tile.event, tile.label)}
            </div>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</div>
