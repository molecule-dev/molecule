/**
 * The consistent session-and-allowance rows for the context tooltip and
 * modal: what the current conversation spent (prompt and output tokens, a
 * live mark while the turn streams) and what remains of the project owner's
 * AI allowance (the percent, its window, and when it resets).
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `ContextSessionUsage`
 * (see that file for the design notes): the same inputs (React prop names),
 * the same DOM for the same input. Presentational — the totals arrive whole
 * as inputs; the load-on-hover fetch is the `useContextSessionUsage` hook in
 * `src/hooks`, the counterpart of React's hook of the same name.
 *
 * The host element IS React's root `<div>` (`div[mol-context-session-usage]`),
 * so the row container's own attributes and classes sit on it through host
 * bindings, and every derived value is a method the template reads, so each
 * change-detection pass renders the current state the way React's render
 * does. Styling uses `getClassMap()` (`cm.*`); the component adds no inline
 * styles. All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { ChatUsageTokens } from '@molecule/app-ide-panel-logic/panels'
import { formatTokenTotal, totalPromptTokens } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** The usage the hook loads from `GET /projects/:id/chat-usage`. */
export interface SessionUsage extends ChatUsageTokens {
  /** The owner's remaining-allowance percent spent, when the plan meters it. */
  allowancePercent?: number | null
  /** When the allowance window rolls over (epoch milliseconds). */
  allowanceResetAt?: number | null
  /** The allowance's window: monthly against the billing period, or daily. */
  allowanceWindow?: 'daily' | 'billing-period'
  /** The model the conversation ran on. */
  model?: string
  /** Whether the conversation's turn is streaming right now. */
  streaming?: boolean
}

/** Props for {@link ContextSessionUsage} — the React prop names, React's own contract. */
export interface ContextSessionUsageProps {
  /** The loaded usage, or `null` before the first reply. */
  data: SessionUsage | null
  /** Whether a load is in flight (shown only while there is nothing to show). */
  loading: boolean
  /** Whether the last refresh failed (stated on the allowance row). */
  failed: boolean
}

/**
 * Consistent session and allowance rows for the context tooltip and modal.
 */
@Component({
  selector: 'div[mol-context-session-usage]',
  standalone: true,
  inputs: ['data', 'loading', 'failed'],
  host: {
    '[attr.aria-live]': '"polite"',
    '[class]': 'rootClass()',
  },
  // prettier-ignore
  template: `<div>
    <div [class]="headerClass()">
      <span>{{ sessionLabel() }}</span>
      <strong>{{ sessionTotal() }}</strong>
    </div>
    @if (available()) {
      <div [class]="mutedClass()">{{ sessionDetail() }}</div>
    }
  </div>
  <div>
    <div [class]="headerClass()">
      <span>{{ allowanceLabel() }}</span>
      <strong [class]="totalClass()">{{ allowanceValue() }}</strong>
    </div>
    <div [class]="mutedClass()">{{ allowanceNote() }}</div>
  </div>`,
})
export class ContextSessionUsage {
  /** The loaded usage, or `null` before the first reply. */
  data!: SessionUsage | null

  /** Whether a load is in flight (shown only while there is nothing to show). */
  loading!: boolean

  /** Whether the last refresh failed (stated on the allowance row). */
  failed!: boolean

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template's label bindings. */
  protected readonly t = this.i18n.t

  /** The active locale code (a change re-runs the bindings that read it). */
  protected readonly locale = this.i18n.locale

  /** Whether there are totals to show: a payload arrived and it has not failed. */
  protected available(): boolean {
    return this.data !== null && !this.failed
  }

  /**
   * The clamped remaining-allowance percent (`null` when it cannot be one).
   * @returns The remaining percent, or null.
   */
  protected remaining(): number | null {
    const percent = this.data?.allowancePercent
    return typeof percent === 'number' && Number.isFinite(percent)
      ? Math.max(0, Math.min(100, 100 - percent))
      : null
  }

  /**
   * The rows' classes: the column flex the root and its two header rows share,
   * composed exactly as React composes them.
   * @returns The resolved class string.
   */
  protected rootClass(): string {
    return this.cm.flex({ direction: 'col', gap: 'sm' })
  }

  /**
   * A row header's classes: the label and its figure spread apart.
   * @returns The resolved class string.
   */
  protected headerClass(): string {
    return this.cm.flex({ justify: 'between', gap: 'md', align: 'baseline' })
  }

  /**
   * A muted line's classes: the muted colour at the xs text scale.
   * @returns The resolved class string.
   */
  protected mutedClass(): string {
    return this.cm.cn(this.cm.textMuted, this.cm.textSize('xs'))
  }

  /**
   * The strong figure's classes: red only when a metered remainder is at or
   * under ten percent (`null` removes the binding the way React's
   * `undefined` omits the class).
   * @returns The class token, or null.
   */
  protected totalClass(): string | null {
    const rest = this.remaining()
    return this.available() && rest !== null && rest <= 10 ? this.cm.textError : null
  }

  /**
   * The session row's left label.
   * @returns The translated label.
   */
  protected sessionLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.session', undefined, { defaultValue: 'Current session' })
  }

  /**
   * The right-hand session total (or the loading / unavailable fallback).
   * @returns The translated figure.
   */
  protected sessionTotal(): string {
    void this.locale()
    const data = this.data
    if (data !== null && !this.failed) {
      return this.t(
        'ide.chat.context.sessionTotal',
        { tokens: formatTokenTotal(totalPromptTokens(data) + data.outputTokens) },
        { defaultValue: '{{tokens}} tokens' },
      )
    }
    return this.loading
      ? this.t('ide.chat.context.loading', undefined, { defaultValue: 'Loading…' })
      : this.t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
  }

  /**
   * The session line's muted detail, with the live mark while streaming.
   * @returns The translated detail.
   */
  protected sessionDetail(): string {
    void this.locale()
    const data = this.data
    if (data === null || this.failed) return ''
    const detail = this.t(
      'ide.chat.context.sessionDetail',
      {
        input: formatTokenTotal(totalPromptTokens(data)),
        output: formatTokenTotal(data.outputTokens),
      },
      { defaultValue: '{{input}} input (incl. cache) · {{output}} output' },
    )
    return data.streaming
      ? `${detail} · ${this.t('ide.chat.context.live', undefined, { defaultValue: 'Live' })}`
      : detail
  }

  /**
   * The allowance row's left label.
   * @returns The translated label.
   */
  protected allowanceLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.allowance', undefined, {
      defaultValue: 'Overall AI allowance',
    })
  }

  /**
   * The right-hand allowance figure (or the loading / unavailable fallback).
   * @returns The translated figure.
   */
  protected allowanceValue(): string {
    void this.locale()
    const rest = this.remaining()
    const percent = this.data?.allowancePercent
    if (!this.available()) {
      return this.loading
        ? this.t('ide.chat.context.loading', undefined, { defaultValue: 'Loading…' })
        : this.t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
    }
    if (rest !== null) {
      return this.t(
        'ide.chat.context.remainingPercent',
        { percent: rest },
        { defaultValue: '~{{percent}}% remaining' },
      )
    }
    return percent === null
      ? this.t('ide.chat.context.unmetered', undefined, { defaultValue: 'Unmetered' })
      : this.t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
  }

  /**
   * The allowance row's muted line: the error, the shared-across-projects
   * note, the window, and the reset moment — the segments React renders (the
   * falsy ones as nothing), joined the way the DOM draws them.
   * @returns The translated note.
   */
  protected allowanceNote(): string {
    void this.locale()
    const data = this.data
    let note = ''
    if (this.failed) {
      note += this.t('ide.chat.context.usageError', undefined, {
        defaultValue: 'Usage could not be refreshed. Open details to retry.',
      })
    } else if (this.available()) {
      note += this.t('ide.chat.context.ownerAllowance', undefined, {
        defaultValue: 'Shared across the project owner’s projects.',
      })
    }
    if (this.available() && data?.allowanceWindow) {
      note += ' '
      note +=
        data.allowanceWindow === 'billing-period'
          ? this.t('ide.chat.context.monthly', undefined, { defaultValue: 'Monthly allowance.' })
          : this.t('ide.chat.context.daily', undefined, { defaultValue: 'Daily allowance.' })
    }
    const rest = this.remaining()
    if (
      this.available() &&
      rest !== null &&
      typeof data?.allowanceResetAt === 'number' &&
      Number.isFinite(data.allowanceResetAt)
    ) {
      note += ' '
      note += this.t(
        'ide.chat.context.resets',
        {
          at: new Date(data.allowanceResetAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
        { defaultValue: 'Resets {{at}}.' },
      )
    }
    return note
  }
}
