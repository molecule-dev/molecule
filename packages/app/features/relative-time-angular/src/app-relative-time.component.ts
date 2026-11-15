/**
 * RelativeTime component (React parity).
 *
 * @module
 */

import {
  Component,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  type SimpleChanges,
} from '@angular/core'

import { formatRelativeTime } from './formatRelativeTime.js'
import type { RelativeTimeProps } from './types.js'

/**
 * RelativeTime component.
 *
 * Live-updating relative time display ("5 minutes ago") that re-computes on a
 * timer. The host IS the `<time>` element (`time[mol-relative-time]`),
 * matching React's root exactly.
 */
@Component({
  selector: 'time[mol-relative-time]',
  standalone: true,
  inputs: ['date', 'locale', 'refreshMs', 'titleLocale', 'className'],
  host: {
    '[attr.datetime]': 'iso()',
    '[attr.title]': 'title()',
    '[class]': 'className ?? null',
  },
  template: '{{ text() }}',
})
export class RelativeTime implements RelativeTimeProps, OnChanges, OnInit, OnDestroy {
  /** ISO string, Date, or epoch ms. */
  date!: Date | string | number
  /** Locale override. */
  locale?: string
  /** Auto-refresh interval (ms). Defaults to 60_000 (1 min). Set 0 to disable. */
  refreshMs?: number
  /** When provided, renders the absolute date in a `title` attribute for hover tooltip. */
  titleLocale?: string
  /** Extra classes (applies to the surrounding `<time>` element). */
  className?: string

  /** The clock the last tick (or input change) observed. */
  private readonly clock = signal(Date.now())

  /** The running refresh interval, when one is running. */
  private interval: ReturnType<typeof setInterval> | undefined

  /**
   * The `<time>` element's `datetime` value.
   * @returns The ISO string React writes.
   */
  iso(): string {
    return this.date instanceof Date
      ? this.date.toISOString()
      : typeof this.date === 'string'
        ? this.date
        : new Date(this.date).toISOString()
  }

  /**
   * The absolute-date tooltip, when a `titleLocale` is given.
   * @returns The formatted date, or undefined for no `title` attribute.
   */
  title(): string | undefined {
    return this.titleLocale !== undefined
      ? new Intl.DateTimeFormat(this.titleLocale, {
          dateStyle: 'full',
          timeStyle: 'short',
        }).format(new Date(this.iso()))
      : undefined
  }

  /**
   * The rendered relative text; reads the clock signal so a tick re-renders at
   * the current time (React re-computes the text on every render).
   * @returns The relative time string.
   */
  text(): string {
    this.clock()
    return formatRelativeTime(this.date, Date.now(), this.locale)
  }

  /**
   * Starts the refresh timer for the initial `refreshMs`.
   */
  ngOnInit(): void {
    this.restart()
  }

  /**
   * Restarts the refresh timer when `refreshMs` changes (React re-runs its
   * effect on the same prop).
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshMs']) this.restart()
  }

  /**
   * Stops the refresh timer.
   */
  ngOnDestroy(): void {
    this.stop()
  }

  /**
   * Re-reads the clock and re-creates the refresh interval from `refreshMs`.
   */
  private restart(): void {
    this.stop()
    this.clock.set(Date.now())
    const refreshMs = this.refreshMs ?? 60_000
    if (refreshMs <= 0) return
    this.interval = setInterval(() => {
      this.clock.set(Date.now())
    }, refreshMs)
  }

  /**
   * Stops the running refresh interval, when one is running.
   */
  private stop(): void {
    if (this.interval !== undefined) clearInterval(this.interval)
    this.interval = undefined
  }
}
