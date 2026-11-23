/**
 * SettingsActionsBar component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  type ElementRef,
  ViewChild,
} from '@angular/core'

import { setElementPresent, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

/**
 * React's sticky inline style (`{ position: 'sticky', bottom: 0, zIndex: 5 }`),
 * serialized the way react-dom writes it to the CSSOM.
 */
const STICKY_STYLE = 'position: sticky; bottom: 0; z-index: 5'

/**
 * Formats an epoch-ms timestamp as a short human-readable relative string
 * (e.g. "3m ago") — React's `formatRelativeShort`, verbatim.
 *
 * @param epochMs - The timestamp, in epoch milliseconds.
 * @returns The shorthand relative time.
 */
function formatRelativeShort(epochMs: number): string {
  const s = Math.floor((Date.now() - epochMs) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/**
 * SettingsActionsBar component.
 *
 * Sticky bottom / inline Save-Cancel bar for settings and forms. The host IS
 * React's root `<div>` (`div[mol-settings-actions-bar]`), with the bar's class
 * list and sticky inline style bound on the host.
 *
 * Features:
 * - Primary Save button with loading/disabled state.
 * - Optional Cancel button (hidden when `onCancel` is omitted).
 * - "Saved Xm ago" status when `savedAt` is provided.
 * - Inline error text (a string input, or projected `[slot=error]` content).
 * - Optional leading slot (`[slot=leading]`) for custom status badges.
 *
 * The inline error span is an always-mounted capture point that
 * {@link setElementPresent} takes out whenever React renders no error — the
 * projected nodes need it in the template, but React's DOM has no such element.
 */
@Component({
  selector: 'div[mol-settings-actions-bar]',
  standalone: true,
  imports: [Button],
  inputs: [
    'onSave',
    'onCancel',
    'loading',
    'disabled',
    'savedAt',
    'error',
    'sticky',
    'leading',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'inlineStyleText()',
  },
  template: `<div [class]="cm().flex({ align: 'center', gap: 'sm' })">
      {{ leadingText() }}<ng-content select="[slot=leading]"></ng-content>
      @if (savedText() !== null) {
        <span [class]="savedClasses()">{{ savedText() }}</span>
      }
      <span #errorSlot [class]="cm().textSize('sm')"
        >{{ errorText() }}<ng-content select="[slot=error]"></ng-content
      ></span>
    </div>
    <div [class]="cm().flex({ align: 'center', gap: 'sm' })">
      @if (onCancel) {
        <button
          mol-button
          [variant]="'ghost'"
          [disabled]="loading === true"
          (click)="handleCancel($event)"
        >
          {{ t('settingsActions.cancel', {}, { defaultValue: 'Cancel' }) }}
        </button>
      }
      <button
        mol-button
        [variant]="'solid'"
        [color]="'primary'"
        [disabled]="isSaveDisabled()"
        (click)="handleSave()"
      >
        {{ saveLabel() }}
      </button>
    </div>`,
})
export class SettingsActionsBar implements AfterViewInit, DoCheck {
  /** Called when Save is clicked. */
  onSave?: () => void | Promise<void>
  /** Called when Cancel is clicked; receives the DOM click event (React's `onClick`). */
  onCancel?: (event?: MouseEvent) => void
  /** When true, the Save button disables and shows a loading label. */
  loading?: boolean
  /** When true, the Save button is disabled without a loading label. */
  disabled?: boolean
  /** When set, shows a "Saved" badge with the relative time. Epoch ms. */
  savedAt?: number | null
  /** Inline error: a string/number renders as text; nodes are `[slot=error]` content. */
  error?: unknown
  /** Sticky-to-bottom (React's default `true`). */
  sticky?: boolean
  /** Content before the buttons (projected as `[slot=leading]`). */
  leading?: unknown
  /** Extra classes. */
  className?: string

  /** The reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  /** The error span's capture wrapper (always mounted; detached when unused). */
  @ViewChild('errorSlot') errorSlot?: ElementRef<HTMLSpanElement>

  /**
   * Whether the projection carried error nodes at view init (Angular projects
   * content at creation, so this is stable for the instance's life). The
   * `{{ errorText() }}` text node is the wrapper's first child and is excluded.
   */
  private hasErrorSlot = false

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the bar's class list (React's `cm.cn(cm.surface, cm.borderT, …)`),
   * with `className` last.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      // A real theme surface + top border so the (sticky) bar is opaque and
      // page content no longer shows through it while scrolling. Both are
      // theme tokens, never hardcoded colors, so light/dark stay correct.
      this.cm().surface,
      this.cm().borderT,
      this.cm().flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
      this.cm().sp('px', 4),
      this.cm().sp('py', 3),
      this.className,
    )
  }

  /**
   * The bar's inline style text (React's `style={sticky ? {…} : undefined}`);
   * null when `sticky` is false, so no `style` attribute renders.
   * @returns The style text, or null.
   */
  inlineStyleText(): string | null {
    return this.sticky === false ? null : STICKY_STYLE
  }

  /**
   * The badge span's class (`cm.textSize('xs')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  savedClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The "Saved …" badge text, or null when React renders no badge
   * (`savedAt === null || savedAt === undefined`; an epoch-ms 0 still shows).
   * @returns The badge text, or null.
   */
  savedText(): string | null {
    const savedAt = this.savedAt
    if (savedAt === null || savedAt === undefined) return null
    return this.t(
      'settingsActions.saved',
      { at: formatRelativeShort(savedAt) },
      {
        defaultValue: 'Saved {{at}}',
      },
    )
  }

  /**
   * The error input's text (React's `{error}` for a text child: strings and
   * numbers render; a node arrives as `[slot=error]` content instead).
   * @returns The text, or `''` for a node error.
   */
  errorText(): string {
    return typeof this.error === 'string' || typeof this.error === 'number'
      ? String(this.error)
      : ''
  }

  /**
   * The leading input's text (React's `{leading}` for a text child).
   * @returns The text, or `''` for a node leading value.
   */
  leadingText(): string {
    return typeof this.leading === 'string' || typeof this.leading === 'number'
      ? String(this.leading)
      : ''
  }

  /**
   * The Save button's disabled state (React's `loading || disabled`).
   * @returns Whether the Save button is disabled.
   */
  isSaveDisabled(): boolean {
    return this.loading === true || this.disabled === true
  }

  /**
   * The Save button's label (React's `loading ? 'Saving…' : 'Save changes'`).
   * @returns The translated label.
   */
  saveLabel(): string {
    return this.loading
      ? this.t('settingsActions.saving', {}, { defaultValue: 'Saving…' })
      : this.t('settingsActions.save', {}, { defaultValue: 'Save changes' })
  }

  /**
   * Runs Save the way React's `() => void onSave()` does: no arguments.
   */
  handleSave(): void {
    void this.onSave?.()
  }

  /**
   * Forwards Cancel the way React's `onClick={onCancel}` does: with the event.
   *
   * @param event - The DOM click event.
   */
  handleCancel(event: MouseEvent): void {
    this.onCancel?.(event)
  }

  /** Reads the projected error content's presence and syncs the wrapper. */
  ngAfterViewInit(): void {
    const el = this.errorSlot?.nativeElement
    this.hasErrorSlot = el
      ? Array.from(el.childNodes)
          .slice(1)
          .some(
            (node) =>
              node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '').trim()),
          )
      : false
    this.syncError()
  }

  /** Re-syncs the error wrapper when the error input or projected content changes. */
  ngDoCheck(): void {
    this.syncError()
  }

  /**
   * Applies React's error branch: the span stays in the DOM only while there is
   * an error input or a projected error node.
   */
  private syncError(): void {
    const el = this.errorSlot?.nativeElement
    if (!el) return
    setElementPresent(el, this.errorText().length > 0 || this.hasErrorSlot)
  }
}
