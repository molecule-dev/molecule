/**
 * `/report` (and `/bug`) modal form.
 *
 * A centered modal that collects a bug report / feedback — title, description,
 * optional reproduction steps, and an "include recent chat" toggle — and POSTs
 * it to `POST /projects/:id/report`. The backend files a GitHub issue when a
 * report repo + token are configured (else records a DB row) and always
 * persists a DB row, returning `{ ok, url?, id }`. On success the modal hands
 * the result back to the parent via `onSubmitted` (which surfaces the
 * confirmation/link in the chat timeline) and closes.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import { DEFAULT_PRODUCT_NAME, useHttpClient, useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ReportFormState, ReportResult } from './chat-report-utilities.js'
import {
  buildReportPayload,
  collectClientInfo,
  EMPTY_REPORT_FORM,
  isReportFormValid,
} from './chat-report-utilities.js'

const logger = getLogger('report-modal')

/**
 * The bug-report / feedback modal opened by `/report`, `/bug`, and the header
 * bug-report button.
 *
 * @param root0 - Component props.
 * @param root0.projectId - The project the report is filed against.
 * @param root0.conversationId - The active conversation id (attached so the backend pulls the right recent chat when "include recent chat" is on).
 * @param root0.initialTitle - Seed title from `/report <title>` (empty otherwise).
 * @param root0.onClose - Called when the modal is dismissed (Cancel, Escape, backdrop).
 * @param root0.onSubmitted - Called with the server result after a successful POST.
 * @param root0.productName - Display name of the host product, interpolated into the subheading (neutral default: "the IDE").
 * @param root0.appVersion - Running build version, attached to the report's client diagnostics.
 * @returns The rendered report modal.
 */
export function ReportModal({
  projectId,
  conversationId,
  initialTitle,
  onClose,
  onSubmitted,
  productName = DEFAULT_PRODUCT_NAME,
  appVersion,
}: {
  projectId: string
  conversationId?: string | null
  initialTitle?: string
  onClose: () => void
  onSubmitted: (result: ReportResult) => void
  productName?: string
  appVersion?: string
}): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const isLight = useThemeMode() === 'light'
  const [form, setForm] = useState<ReportFormState>({
    ...EMPTY_REPORT_FORM,
    title: initialTitle ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Escape closes the modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const valid = isReportFormValid(form)
  const border = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'
  const fieldStyle = {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 4,
    border: `1px solid ${border}`,
    background: 'transparent',
    color: 'inherit',
    outline: 'none',
  } as const

  const handleSubmit = useCallback(async () => {
    if (!isReportFormValid(form) || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const url = conversationId
        ? `/projects/${projectId}/report?conversationId=${encodeURIComponent(conversationId)}`
        : `/projects/${projectId}/report`
      const clientInfo = collectClientInfo({
        appVersion,
        theme: isLight ? 'light' : 'dark',
      })
      const res = await http.post<ReportResult>(url, buildReportPayload(form, clientInfo))
      onSubmitted(res.data)
    } catch (err) {
      logger.warn('Failed to submit bug report', { error: err })
      setError(
        t('ide.chat.report.error', undefined, {
          defaultValue: 'Could not submit your report. Please try again.',
        }),
      )
      setSubmitting(false)
    }
  }, [form, submitting, conversationId, projectId, http, onSubmitted, appVersion, isLight])

  return (
    <div
      data-mol-id="report-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        padding: 16,
      }}
    >
      <div
        data-mol-id="report-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('ide.chat.report.heading', undefined, { defaultValue: 'Report a bug' })}
        onClick={(e) => e.stopPropagation()}
        className={cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))}
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: 8,
          padding: 16,
          boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        }}
      >
        <div
          className={cm.cn(cm.fontWeight('medium'), cm.textSize('lg'))}
          style={{ marginBottom: 4 }}
        >
          {t('ide.chat.report.heading', undefined, { defaultValue: 'Report a bug' })}
        </div>
        <div className={cm.textMuted} style={{ marginBottom: 12, lineHeight: 1.4 }}>
          {t(
            'ide.chat.report.subheading',
            { productName },
            {
              defaultValue:
                'Tell us what went wrong or what you’d like to see. Goes to {{productName}}’s team.',
            },
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className={cm.fontWeight('medium')}>
              {t('ide.chat.report.titleLabel', undefined, { defaultValue: 'Title' })}
            </span>
            <input
              value={form.title}
              data-mol-id="report-title"
              autoFocus
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={t('ide.chat.report.titlePlaceholder', undefined, {
                defaultValue: 'Brief summary',
              })}
              className={cm.textSize('sm')}
              style={fieldStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className={cm.fontWeight('medium')}>
              {t('ide.chat.report.descriptionLabel', undefined, { defaultValue: 'Description' })}
            </span>
            <textarea
              value={form.description}
              data-mol-id="report-description"
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t('ide.chat.report.descriptionPlaceholder', undefined, {
                defaultValue: 'What happened? What did you expect?',
              })}
              rows={4}
              className={cm.textSize('sm')}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className={cm.fontWeight('medium')}>
              {t('ide.chat.report.stepsLabel', undefined, {
                defaultValue: 'Steps to reproduce (optional)',
              })}
            </span>
            <textarea
              value={form.steps}
              data-mol-id="report-steps"
              onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))}
              placeholder={t('ide.chat.report.stepsPlaceholder', undefined, {
                defaultValue: '1. …\n2. …',
              })}
              rows={3}
              className={cm.textSize('sm')}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              data-mol-id="report-include-chat"
              checked={form.includeChat}
              onChange={(e) => setForm((f) => ({ ...f, includeChat: e.target.checked }))}
            />
            <span>
              {t('ide.chat.report.includeChat', undefined, {
                defaultValue: 'Include recent chat for context',
              })}
            </span>
          </label>

          {error && (
            <div className={cm.textError} style={{ lineHeight: 1.4 }}>
              {error}
            </div>
          )}
        </div>

        <div
          data-mol-id="report-diagnostics-note"
          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style={{ marginTop: 12, lineHeight: 1.4 }}
        >
          {t('ide.chat.report.diagnosticsNote', undefined, {
            defaultValue:
              'Your app version, browser, and screen size are attached to help us debug.',
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            data-mol-id="report-cancel"
            onClick={onClose}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
          >
            {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            data-mol-id="report-submit"
            onClick={() => void handleSubmit()}
            disabled={!valid || submitting}
            className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'sm' }))}
            style={{ opacity: !valid || submitting ? 0.6 : 1 }}
          >
            {submitting
              ? t('ide.chat.report.submitting', undefined, { defaultValue: 'Submitting…' })
              : t('ide.chat.report.submit', undefined, { defaultValue: 'Submit report' })}
          </button>
        </div>
      </div>
    </div>
  )
}
