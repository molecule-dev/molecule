/**
 * `/report` (and `/bug`) modal form — the Angular counterpart of
 * `@molecule/app-ide-react`'s `ReportModal` (see that file for the design
 * notes): the same inputs (React prop names), the same DOM for the same
 * input, the same callbacks and service calls. A centered modal that collects
 * a bug report / feedback — title, description, optional reproduction steps,
 * and an "include recent chat" toggle — and POSTs it to
 * `POST /projects/:id/report`. On success the result goes back to the host
 * through `onSubmitted` (which surfaces the confirmation/link in the chat
 * timeline) and the modal is closed by the host; on failure the error text is
 * shown and the button is handed back.
 *
 * React's component has ONE root (the backdrop div), so the host element IS
 * that root: the backdrop's `data-mol-id`, click handler and style live on
 * the host, and the template renders exactly React's tree inside it. Inputs
 * are declared the way the kit's other Angular feature components declare
 * them — one plain field per React prop, named in the decorator's `inputs`
 * array — and every derived value is a method the template reads, so each
 * change-detection pass renders the current state the way React's render
 * does. Form state lives in signals, so a POST that settles outside an event
 * re-renders the way React's `setState` does. Styling uses `getClassMap()`
 * (`cm.*`) and the only inline styles are layout the ClassMap can't express,
 * serialized through `styleText` the way React writes numbers (`16` →
 * `16px`). All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component, ElementRef, inject, type OnInit, signal, ViewChild } from '@angular/core'

import {
  DEFAULT_PRODUCT_NAME,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  useHttpClient,
  usePlacement,
  useThemeMode,
  useTranslation,
} from '@molecule/app-angular'
import type { ReportFormState, ReportResult } from '@molecule/app-ide-panel-logic'
import {
  buildReportPayload,
  collectClientInfo,
  EMPTY_REPORT_FORM,
  isReportFormValid,
} from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { elementTarget, Modal, styleText } from '@molecule/app-ui-angular'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'

const logger = getLogger('report-modal')

/** Props for {@link ReportModal} — the React prop names, React's own contract. */
export interface ReportModalProps {
  /** The project the report is about (the POST route's id). */
  projectId: string
  /** The conversation to attach for context; omit for none. */
  conversationId?: string | null
  /** Seeds the title field (from `/report <title>`); read ONCE at mount. */
  initialTitle?: string
  /** Called when the modal should close (Escape, the backdrop, Cancel). */
  onClose: () => void
  /** Hands the recorded report back to the host on a successful POST. */
  onSubmitted: (result: ReportResult) => void
  /** The product's name, shown in the subheading. */
  productName?: string
  /** The running build version, attached to the report's diagnostics. */
  appVersion?: string
}

/**
 * The bug-report / feedback modal opened by `/report`, `/bug`, and the header
 * bug-report button.
 */
@Component({
  selector: 'div[mol-report-modal]',
  standalone: true,
  imports: [Modal],
  inputs: [
    'projectId',
    'conversationId',
    'initialTitle',
    'onClose',
    'onSubmitted',
    'productName',
    'appVersion',
  ],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `<mol-modal [open]="true" [title]="t('ide.chat.report.heading', undefined, { defaultValue: 'Report a bug' })" [showCloseButton]="false" [initialFocus]="titleTarget" (close)="onClose()" data-mol-id="report-modal">
    <div [class]="cm.textMuted" [attr.style]="s.subheading">{{ subheadingText() }}</div>
    <div [attr.style]="s.fields">
      <label [attr.style]="s.fieldLabel">
        <span [class]="cm.fontWeight('medium')">{{ t('ide.chat.report.titleLabel', undefined, { defaultValue: 'Title' }) }}</span>
        <input #title [value]="form().title" [attr.value]="form().title" data-mol-id="report-title" (input)="onTitle($event)" [attr.placeholder]="t('ide.chat.report.titlePlaceholder', undefined, { defaultValue: 'Brief summary' })" [class]="cm.textSize('sm')" [attr.style]="fieldStyle()" />
      </label>
      <label [attr.style]="s.fieldLabel">
        <span [class]="cm.fontWeight('medium')">{{ t('ide.chat.report.descriptionLabel', undefined, { defaultValue: 'Description' }) }}</span>
        <textarea [value]="form().description" data-mol-id="report-description" (input)="onDescription($event)" [attr.placeholder]="t('ide.chat.report.descriptionPlaceholder', undefined, { defaultValue: 'What happened? What did you expect?' })" rows="4" [class]="cm.textSize('sm')" [attr.style]="textareaStyle()"></textarea>
      </label>
      <label [attr.style]="s.fieldLabel">
        <span [class]="cm.fontWeight('medium')">{{ t('ide.chat.report.stepsLabel', undefined, { defaultValue: 'Steps to reproduce (optional)' }) }}</span>
        <textarea [value]="form().steps" data-mol-id="report-steps" (input)="onSteps($event)" [attr.placeholder]="stepsPlaceholder()" rows="3" [class]="cm.textSize('sm')" [attr.style]="textareaStyle()"></textarea>
      </label>
      <label [attr.style]="s.checkLabel">
        <input type="checkbox" data-mol-id="report-include-chat" [checked]="form().includeChat" [attr.checked]="mountedIncludeChat ? '' : null" (change)="onIncludeChat($event)" />
        <span>{{ t('ide.chat.report.includeChat', undefined, { defaultValue: 'Include recent chat for context' }) }}</span>
      </label>
      @if (error(); as message) {
        <div [class]="cm.textError" [attr.style]="s.error">{{ message }}</div>
      }
    </div>
    <div data-mol-id="report-diagnostics-note" [class]="cm.cn(cm.textMuted, cm.textSize('xs'))" [attr.style]="s.diagnostics">{{ t('ide.chat.report.diagnosticsNote', undefined, { defaultValue: 'Your app version, browser, and screen size are attached to help us debug.' }) }}</div>
    <div [attr.style]="s.footer">
      <button type="button" data-mol-id="report-cancel" (click)="cancel($event)" [class]="cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)">{{ t('common.cancel', undefined, { defaultValue: 'Cancel' }) }}</button>
      <button type="button" data-mol-id="report-submit" (click)="submit()" [disabled]="!isFormValid() || submitting()" [class]="cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'sm' }), cm.touchTargetCompact)">{{ submitting() ? t('ide.chat.report.submitting', undefined, { defaultValue: 'Submitting…' }) : t('ide.chat.report.submit', undefined, { defaultValue: 'Submit report' }) }}</button>
    </div>
  </mol-modal>`,
})
export class ReportModal implements OnInit {
  /** The project the report is about (the POST route's id). */
  projectId = ''

  /** The conversation to attach for context; omit for none. */
  conversationId?: string | null

  /** Seeds the title field (from `/report <title>`); the FIRST value only. */
  initialTitle?: string

  /** Called when the modal should close (Escape, the backdrop, Cancel). */
  onClose: () => void = () => {}

  /** Hands the recorded report back to the host on a successful POST. */
  onSubmitted: (result: ReportResult) => void = () => {}

  /** The product's name, shown in the subheading. */
  productName?: string

  /** The running build version, attached to the report's diagnostics. */
  appVersion?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The neutral product name, when the host passes none. */
  protected readonly defaultProductName = DEFAULT_PRODUCT_NAME

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The bonded HTTP client. */
  protected readonly http = useHttpClient()

  /** The theme mode signal (the field border follows it). */
  protected readonly mode = useThemeMode()

  /** Whether the viewport is phone-width (fields grow to 16px). */
  protected readonly isNarrow = useNarrowViewport()

  /** Whether the primary pointer is coarse (fields grow to 16px). */
  protected readonly isCoarse = useCoarsePointer()

  /** The static style texts. */
  protected readonly s = STYLES

  /** The form state. */
  protected readonly form = signal<ReportFormState>({ ...EMPTY_REPORT_FORM })

  /** Whether a submit is in flight (React leaves it set after success). */
  protected readonly submitting = signal(false)

  /** The submit failure's message, when the POST failed. */
  protected readonly error = signal<string | null>(null)

  /** The checkbox state at MOUNT — the `checked` attribute's frozen value. */
  protected mountedIncludeChat = false

  /** The title input, for the autofocus. */
  @ViewChild('title') private title?: ElementRef<HTMLInputElement>

  /** Title field focused when the report opens. */
  protected readonly titleTarget = elementTarget(() => this.title?.nativeElement)

  /** Seeds the form once (React's `useState` initializer). */
  ngOnInit(): void {
    this.form.set({ ...EMPTY_REPORT_FORM, title: this.initialTitle ?? '' })
    this.mountedIncludeChat = this.form().includeChat
  }

  constructor() {
    const host: ElementRef<HTMLElement> = inject(ElementRef)
    usePlacement(() => {
      const element = host.nativeElement
      placeContentBefore(element, element)
      setElementPresent(element, false)
    })
  }

  /**
   * Whether the form can be submitted (a non-empty title and description).
   * @returns Whether the form is valid.
   */
  protected isFormValid(): boolean {
    return isReportFormValid(this.form())
  }

  /**
   * The subheading: the product name interpolated in, so the interpolation
   * braces never reach the Angular template's own parser.
   * @returns The translated subheading.
   */
  protected subheadingText(): string {
    return this.t(
      'ide.chat.report.subheading',
      { productName: this.productName ?? this.defaultProductName },
      {
        defaultValue:
          'Tell us what went wrong or what you’d like to see. Goes to {{productName}}’s team.',
      },
    )
  }

  /**
   * The steps field's placeholder.
   * @returns The translated placeholder.
   */
  protected stepsPlaceholder(): string {
    return this.t('ide.chat.report.stepsPlaceholder', undefined, {
      defaultValue: '1. …\n2. …',
    })
  }

  /**
   * The field border (the theme's, with the same literal React writes).
   * @returns The border value.
   */
  protected border(): string {
    return this.mode() === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
  }

  /**
   * A text field's inline style: 16px on phones/touch — below that iOS Safari
   * zooms the page when the (autofocused) input receives focus.
   * @returns The style attribute text.
   */
  protected fieldStyle(): string | null {
    const grow = this.isNarrow() || this.isCoarse()
    return styleText({
      width: '100%',
      padding: '6px 8px',
      borderRadius: 4,
      border: `1px solid ${this.border()}`,
      background: 'transparent',
      color: 'inherit',
      outline: 'none',
      fontSize: grow ? 16 : undefined,
    })
  }

  /**
   * A textarea's inline style: the text field's plus the resizable grip.
   * @returns The style attribute text.
   */
  protected textareaStyle(): string | null {
    return styleText({
      width: '100%',
      padding: '6px 8px',
      borderRadius: 4,
      border: `1px solid ${this.border()}`,
      background: 'transparent',
      color: 'inherit',
      outline: 'none',
      fontSize: this.isNarrow() || this.isCoarse() ? 16 : undefined,
      resize: 'vertical',
    })
  }

  /**
   * Typing the title.
   * @param event - The input event.
   */
  protected onTitle(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.form.update((f) => ({ ...f, title: value }))
  }

  /**
   * Typing the description.
   * @param event - The input event.
   */
  protected onDescription(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value
    this.form.update((f) => ({ ...f, description: value }))
  }

  /**
   * Typing the reproduction steps.
   * @param event - The input event.
   */
  protected onSteps(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value
    this.form.update((f) => ({ ...f, steps: value }))
  }

  /**
   * Toggling the "include recent chat" checkbox.
   * @param event - The change event.
   */
  protected onIncludeChat(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked
    this.form.update((f) => ({ ...f, includeChat: checked }))
  }

  /**
   * Cancel closes the modal. React binds the BARE `onClose` reference as the
   * button's handler, so the click event itself is the call's argument even
   * though the callback's type takes none.
   * @param event - The native click event.
   */
  protected cancel(event: Event): void {
    const close: (event: Event) => void = this.onClose
    close(event)
  }

  /**
   * Submits the report: POSTs to the project's report route (carrying the
   * conversation for context when there is one), hands the recorded report
   * back on success, and on failure shows the error text and hands the
   * button back.
   */
  protected async submit(): Promise<void> {
    if (!isReportFormValid(this.form()) || this.submitting()) return
    this.submitting.set(true)
    this.error.set(null)
    try {
      const conversationId = this.conversationId
      const url = conversationId
        ? `/projects/${this.projectId}/report?conversationId=${encodeURIComponent(conversationId)}`
        : `/projects/${this.projectId}/report`
      const clientInfo = collectClientInfo({
        appVersion: this.appVersion,
        theme: this.mode() === 'light' ? 'light' : 'dark',
      })
      const res = await this.http.post<ReportResult>(
        url,
        buildReportPayload(this.form(), clientInfo),
      )
      this.onSubmitted(res.data)
    } catch (err) {
      logger.warn('Failed to submit bug report', { error: err })
      this.error.set(
        this.t('ide.chat.report.error', undefined, {
          defaultValue: 'Could not submit your report. Please try again.',
        }),
      )
      this.submitting.set(false)
    }
  }
}

/**
 * The modal's inline-style texts that never change, serialized once with
 * `styleText` (React's camelCase numbers become `px` exactly the way React
 * writes them; the conformance normalizer sorts declarations, so key order is
 * free).
 */
const STYLES = {
  /** The muted subheading. */
  subheading: styleText({ marginBottom: 12, lineHeight: 1.4 }),
  /** The fields column. */
  fields: styleText({ display: 'flex', flexDirection: 'column', gap: 10 }),
  /** A text field's label. */
  fieldLabel: styleText({ display: 'flex', flexDirection: 'column', gap: 4 }),
  /** The checkbox's label. */
  checkLabel: styleText({ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }),
  /** The submit error. */
  error: styleText({ lineHeight: 1.4 }),
  /** The diagnostics note. */
  diagnostics: styleText({ marginTop: 12, lineHeight: 1.4 }),
  /** The footer's actions row. */
  footer: styleText({ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }),
} as const
