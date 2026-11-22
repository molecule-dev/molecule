/**
 * `/report` (and `/bug`) modal form — the Solid counterpart of
 * `@molecule/app-ide-react`'s `ReportModal` (see that file for the design
 * notes): the same props (React names), the same DOM for the same input, the
 * same callbacks and service calls. A centered modal that collects a bug
 * report / feedback — title, description, optional reproduction steps, and an
 * "include recent chat" toggle — and POSTs it to
 * `POST /projects/:id/report`. On success the result goes back to the host
 * through `onSubmitted` (which surfaces the confirmation/link in the chat
 * timeline) and the modal is closed by the host; on failure the error text is
 * shown and the button is handed back.
 *
 * React keeps the title field's `value` ATTRIBUTE in step with the controlled
 * value (the DOM snapshot carries the attribute as well as the live
 * property), so the attribute is mirrored; the textareas carry the property
 * alone, and the checkbox keeps the `checked` ATTRIBUTE it mounts with while
 * the property follows the state — React's exact attribute semantics.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'

import type { ReportFormState, ReportResult } from '@molecule/app-ide-panel-logic'
import {
  buildReportPayload,
  collectClientInfo,
  EMPTY_REPORT_FORM,
  isReportFormValid,
} from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import {
  DEFAULT_PRODUCT_NAME,
  useHttpClient,
  useThemeMode,
  useTranslation,
} from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

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
 *
 * @param props - See {@link ReportModalProps}.
 * @returns The rendered report modal.
 */
export function ReportModal(props: ReportModalProps): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const mode = useThemeMode()
  const isLight = (): boolean => mode() === 'light'
  // The form state seeds ONCE (React's `useState` initializer): a later
  // `initialTitle` prop never reseeds it.
  const [form, setForm] = createSignal<ReportFormState>({
    ...EMPTY_REPORT_FORM,
    title: props.initialTitle ?? '',
  })
  const [submitting, setSubmitting] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let titleEl: HTMLInputElement | undefined
  let chatEl: HTMLInputElement | undefined

  // Escape closes the modal.
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') props.onClose()
  }
  onMount(() => window.addEventListener('keydown', onKey))
  onCleanup(() => window.removeEventListener('keydown', onKey))

  // Focus the title field on mount (React's `autoFocus`).
  onMount(() => titleEl?.focus())

  // React keeps the checkbox's `checked` ATTRIBUTE at its mount value and
  // follows the state with the property alone (Solid's `checked` prop writes
  // only the property), so the attribute is stamped once at mount.
  onMount(() => {
    if (chatEl?.checked) chatEl.setAttribute('checked', '')
  })

  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()

  const border = (): string => (isLight() ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)')
  const fieldStyle = (): JSX.CSSProperties => ({
    width: '100%',
    padding: '6px 8px',
    'border-radius': '4px',
    border: `1px solid ${border()}`,
    background: 'transparent',
    color: 'inherit',
    outline: 'none',
    // ≥16px on phones/touch so iOS Safari doesn't zoom the page on focus.
    ...(isNarrow() || isCoarse() ? { 'font-size': '16px' } : {}),
  })

  // React keeps the title field's `value` ATTRIBUTE in step with the
  // controlled value; Solid's `value` prop writes only the property, so the
  // attribute is mirrored here (the sibling QuickPicker does the same).
  createEffect(() => {
    titleEl?.setAttribute('value', form().title)
  })

  /**
   * Submits the report. React wraps this in an arrow and calls it with NO
   * event argument.
   */
  async function handleSubmit(): Promise<void> {
    if (!isReportFormValid(form()) || submitting()) return
    setSubmitting(true)
    setError(null)
    try {
      const url = props.conversationId
        ? `/projects/${props.projectId}/report?conversationId=${encodeURIComponent(props.conversationId)}`
        : `/projects/${props.projectId}/report`
      const clientInfo = collectClientInfo({
        appVersion: props.appVersion,
        theme: isLight() ? 'light' : 'dark',
      })
      const res = await http.post<ReportResult>(url, buildReportPayload(form(), clientInfo))
      props.onSubmitted(res.data)
    } catch (err) {
      logger.warn('Failed to submit bug report', { error: err })
      setError(
        t('ide.chat.report.error', undefined, {
          defaultValue: 'Could not submit your report. Please try again.',
        }),
      )
      setSubmitting(false)
    }
  }

  return (
    <div
      data-mol-id="report-modal-backdrop"
      // The backdrop is the dialog's PARENT: role="presentation" and a close
      // only when the click landed on the backdrop itself (a click inside the
      // dialog bubbles here with a different target).
      role="presentation"
      onClick={(e: MouseEvent) => {
        if (e.target === e.currentTarget) props.onClose()
      }}
      style={{
        position: 'fixed',
        inset: '0px',
        // Dialog layer (1300) — must paint above ambient status chrome like the
        // host's HealthBanner (z 1100), which otherwise overlaps this on phones.
        'z-index': '1300',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        background: 'rgba(0, 0, 0, 0.45)',
        padding: '16px',
      }}
    >
      <div
        data-mol-id="report-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('ide.chat.report.heading', undefined, { defaultValue: 'Report a bug' })}
        class={cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))}
        style={{
          width: '100%',
          'max-width': '460px',
          'max-height': '85vh',
          'overflow-y': 'auto',
          'border-radius': '8px',
          padding: '16px',
          'box-shadow': '0 10px 40px rgba(0,0,0,0.35)',
        }}
      >
        <div
          class={cm.cn(cm.fontWeight('medium'), cm.textSize('lg'))}
          style={{ 'margin-bottom': '4px' }}
        >
          {t('ide.chat.report.heading', undefined, { defaultValue: 'Report a bug' })}
        </div>
        <div class={cm.textMuted} style={{ 'margin-bottom': '12px', 'line-height': '1.4' }}>
          {t(
            'ide.chat.report.subheading',
            { productName: props.productName ?? DEFAULT_PRODUCT_NAME },
            {
              defaultValue:
                'Tell us what went wrong or what you’d like to see. Goes to {{productName}}’s team.',
            },
          )}
        </div>

        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
          <label style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
            <span class={cm.fontWeight('medium')}>
              {t('ide.chat.report.titleLabel', undefined, { defaultValue: 'Title' })}
            </span>
            <input
              ref={(el: HTMLInputElement) => {
                titleEl = el
              }}
              value={form().title}
              data-mol-id="report-title"
              onInput={(e) => setForm((f) => ({ ...f, title: e.currentTarget.value }))}
              placeholder={t('ide.chat.report.titlePlaceholder', undefined, {
                defaultValue: 'Brief summary',
              })}
              class={cm.textSize('sm')}
              style={fieldStyle()}
            />
          </label>

          <label style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
            <span class={cm.fontWeight('medium')}>
              {t('ide.chat.report.descriptionLabel', undefined, { defaultValue: 'Description' })}
            </span>
            <textarea
              value={form().description}
              data-mol-id="report-description"
              onInput={(e) => setForm((f) => ({ ...f, description: e.currentTarget.value }))}
              placeholder={t('ide.chat.report.descriptionPlaceholder', undefined, {
                defaultValue: 'What happened? What did you expect?',
              })}
              rows={4}
              class={cm.textSize('sm')}
              style={{ ...fieldStyle(), resize: 'vertical' }}
            />
          </label>

          <label style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
            <span class={cm.fontWeight('medium')}>
              {t('ide.chat.report.stepsLabel', undefined, {
                defaultValue: 'Steps to reproduce (optional)',
              })}
            </span>
            <textarea
              value={form().steps}
              data-mol-id="report-steps"
              onInput={(e) => setForm((f) => ({ ...f, steps: e.currentTarget.value }))}
              placeholder={t('ide.chat.report.stepsPlaceholder', undefined, {
                defaultValue: '1. …\n2. …',
              })}
              rows={3}
              class={cm.textSize('sm')}
              style={{ ...fieldStyle(), resize: 'vertical' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              ref={(el: HTMLInputElement) => {
                chatEl = el
              }}
              type="checkbox"
              data-mol-id="report-include-chat"
              checked={form().includeChat}
              onChange={(e) => setForm((f) => ({ ...f, includeChat: e.currentTarget.checked }))}
            />
            <span>
              {t('ide.chat.report.includeChat', undefined, {
                defaultValue: 'Include recent chat for context',
              })}
            </span>
          </label>

          {error() && (
            <div class={cm.textError} style={{ 'line-height': '1.4' }}>
              {error()}
            </div>
          )}
        </div>

        <div
          data-mol-id="report-diagnostics-note"
          class={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style={{ 'margin-top': '12px', 'line-height': '1.4' }}
        >
          {t('ide.chat.report.diagnosticsNote', undefined, {
            defaultValue:
              'Your app version, browser, and screen size are attached to help us debug.',
          })}
        </div>

        <div
          style={{
            display: 'flex',
            'justify-content': 'flex-end',
            gap: '8px',
            'margin-top': '16px',
          }}
        >
          <button
            type="button"
            data-mol-id="report-cancel"
            onClick={() => props.onClose()}
            class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)}
          >
            {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            data-mol-id="report-submit"
            onClick={() => void handleSubmit()}
            disabled={!isReportFormValid(form()) || submitting()}
            // No inline opacity — the CVA fades a real `disabled` button itself,
            // and an inline value would override whatever it chooses.
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
              cm.touchTargetCompact,
            )}
          >
            {submitting()
              ? t('ide.chat.report.submitting', undefined, { defaultValue: 'Submitting…' })
              : t('ide.chat.report.submit', undefined, { defaultValue: 'Submit report' })}
          </button>
        </div>
      </div>
    </div>
  )
}
