<!--
  ReportModal: the Svelte counterpart of `@molecule/app-ide-react`'s
  `ReportModal` (see that file for the design notes) — the `/report` (and
  `/bug`) modal form: title, description, optional reproduction steps, and an
  "include recent chat" toggle, POSTed to `POST /projects/:id/report`. On
  success the result goes back to the host through `onSubmitted` (which
  surfaces the confirmation/link in the chat timeline) and the modal is closed
  by the host; on failure the error text is shown and the button is handed
  back.

  React keeps the title field's `value` ATTRIBUTE in step with the controlled
  value (the serialized markup carries the attribute as well as the live
  property), so the attribute is mirrored; the textareas carry the property
  alone, and the checkbox keeps the `checked` ATTRIBUTE it mounts with while
  the property follows the state — React's exact attribute semantics.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import {
    buildReportPayload,
    collectClientInfo,
    EMPTY_REPORT_FORM,
    isReportFormValid,
    type ReportFormState,
    type ReportResult,
  } from '@molecule/app-ide-panel-logic'
  import { getLogger } from '@molecule/app-logger'
  import {
    DEFAULT_PRODUCT_NAME,
    useHttpClient,
    useThemeMode,
    useTranslation,
  } from '@molecule/app-svelte'
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
</script>

<script lang="ts">
  let {
    projectId,
    conversationId,
    initialTitle,
    onClose,
    onSubmitted,
    productName,
    appVersion,
  }: ReportModalProps = $props()

  const http = useHttpClient()
  const { t } = useTranslation()
  const mode = useThemeMode()
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  const cm = $derived(getClassMap())

  // The form state seeds ONCE (React's `useState` initializer): a later
  // `initialTitle` prop never reseeds it.
  // svelte-ignore state_referenced_locally
  let form: ReportFormState = $state({ ...EMPTY_REPORT_FORM, title: initialTitle ?? '' })
  let submitting = $state(false)
  let error = $state<string | null>(null)
  let titleEl = $state<HTMLInputElement | null>(null)
  let chatEl = $state<HTMLInputElement | null>(null)

  const isLight = $derived($mode === 'light')

  // Escape closes the modal (React registers a window keydown; `svelte:window`
  // below is Svelte's own) and the title field is focused on mount (React's
  // `autoFocus`).
  $effect(() => {
    titleEl?.focus()
  })

  const border = $derived(isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)')
  // `background: transparent` rides separately as a `style:background`
  // directive on each field: set through the style attribute string, jsdom's
  // CSSOM drops the transparent background shorthand, while React's own
  // per-property write keeps it.
  const fieldStyle = $derived(
    `width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid ${border}; color: inherit; outline: none${
      // ≥16px on phones/touch so iOS Safari doesn't zoom the page on focus.
      $isNarrow || $isCoarse ? '; font-size: 16px' : ''
    }`,
  )

  // React keeps the title field's `value` ATTRIBUTE in step with the
  // controlled value (Svelte's `value={…}` sets only the property), mirrored
  // here the way the sibling QuickPicker does.
  $effect(() => {
    titleEl?.setAttribute('value', form.title)
  })

  // React keeps the checkbox's `checked` ATTRIBUTE at its mount value and
  // follows the state with the property alone (Svelte's `checked={…}` writes
  // only the property), so the attribute is stamped once at mount.
  $effect(() => {
    if (chatEl?.checked) chatEl.setAttribute('checked', '')
  })

  /**
   * The escape handling: React's handler calls `onClose()` with NO event
   * argument; every other key is ignored.
   *
   * @param event - The key press.
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') onClose()
  }

  /**
   * Submits the report. React wraps this in an arrow and calls it with NO
   * event argument.
   */
  async function handleSubmit(): Promise<void> {
    if (!isReportFormValid(form) || submitting) return
    submitting = true
    error = null
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
      error = t('ide.chat.report.error', undefined, {
        defaultValue: 'Could not submit your report. Please try again.',
      })
      submitting = false
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- The click-away backdrop; the dialog itself handles Escape, as React's does.
     The backdrop is the dialog's PARENT: role="presentation" and a close only
     when the click landed on the backdrop itself (a click inside the dialog
     bubbles here with a different target). -->
<div
  data-mol-id="report-modal-backdrop"
  role="presentation"
  onclick={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}
  style="position: fixed; inset: 0px; z-index: 1300; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.45); padding: 16px"
>
  <!-- React's dialog is role="dialog" with no tabindex — ignored for the
       checker, never for the DOM. -->
  <div
    data-mol-id="report-modal"
    role="dialog"
    aria-modal="true"
    aria-label={t('ide.chat.report.heading', undefined, { defaultValue: 'Report a bug' })}
    class={cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))}
    style="width: 100%; max-width: 460px; max-height: 85vh; overflow-y: auto; border-radius: 8px; padding: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.35)"
  >
    <div class={cm.cn(cm.fontWeight('medium'), cm.textSize('lg'))} style="margin-bottom: 4px">
      {t('ide.chat.report.heading', undefined, { defaultValue: 'Report a bug' })}
    </div>
    <div class={cm.textMuted} style="margin-bottom: 12px; line-height: 1.4">
      {t(
        'ide.chat.report.subheading',
        { productName: productName ?? DEFAULT_PRODUCT_NAME },
        {
          defaultValue:
            'Tell us what went wrong or what you’d like to see. Goes to {{productName}}’s team.',
        },
      )}
    </div>

    <div style="display: flex; flex-direction: column; gap: 10px">
      <label style="display: flex; flex-direction: column; gap: 4px">
        <span class={cm.fontWeight('medium')}>
          {t('ide.chat.report.titleLabel', undefined, { defaultValue: 'Title' })}
        </span>
        <input
          bind:this={titleEl}
          value={form.title}
          data-mol-id="report-title"
          oninput={(event) => {
            form = { ...form, title: event.currentTarget.value }
          }}
          placeholder={t('ide.chat.report.titlePlaceholder', undefined, {
            defaultValue: 'Brief summary',
          })}
          class={cm.textSize('sm')}
          style={fieldStyle}
          style:background="transparent"
        />
      </label>

      <label style="display: flex; flex-direction: column; gap: 4px">
        <span class={cm.fontWeight('medium')}>
          {t('ide.chat.report.descriptionLabel', undefined, { defaultValue: 'Description' })}
        </span>
        <textarea
          value={form.description}
          data-mol-id="report-description"
          oninput={(event) => {
            form = { ...form, description: event.currentTarget.value }
          }}
          placeholder={t('ide.chat.report.descriptionPlaceholder', undefined, {
            defaultValue: 'What happened? What did you expect?',
          })}
          rows={4}
          class={cm.textSize('sm')}
          style={`${fieldStyle}; resize: vertical`}
          style:background="transparent"></textarea>
      </label>

      <label style="display: flex; flex-direction: column; gap: 4px">
        <span class={cm.fontWeight('medium')}>
          {t('ide.chat.report.stepsLabel', undefined, {
            defaultValue: 'Steps to reproduce (optional)',
          })}
        </span>
        <textarea
          value={form.steps}
          data-mol-id="report-steps"
          oninput={(event) => {
            form = { ...form, steps: event.currentTarget.value }
          }}
          placeholder={t('ide.chat.report.stepsPlaceholder', undefined, {
            defaultValue: '1. …\n2. …',
          })}
          rows={3}
          class={cm.textSize('sm')}
          style={`${fieldStyle}; resize: vertical`}
          style:background="transparent"></textarea>
      </label>

      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
        <input
          bind:this={chatEl}
          type="checkbox"
          data-mol-id="report-include-chat"
          checked={form.includeChat}
          onchange={(event) => {
            form = { ...form, includeChat: event.currentTarget.checked }
          }}
        />
        <span>
          {t('ide.chat.report.includeChat', undefined, {
            defaultValue: 'Include recent chat for context',
          })}
        </span>
      </label>

      {#if error}
        <div class={cm.textError} style="line-height: 1.4">{error}</div>
      {/if}
    </div>

    <div
      data-mol-id="report-diagnostics-note"
      class={cm.cn(cm.textMuted, cm.textSize('xs'))}
      style="margin-top: 12px; line-height: 1.4"
    >
      {t('ide.chat.report.diagnosticsNote', undefined, {
        defaultValue: 'Your app version, browser, and screen size are attached to help us debug.',
      })}
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
      <button
        type="button"
        data-mol-id="report-cancel"
        onclick={() => onClose()}
        class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)}
      >
        {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
      </button>
      <button
        type="button"
        data-mol-id="report-submit"
        onclick={() => void handleSubmit()}
        disabled={!isReportFormValid(form) || submitting}
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
          cm.touchTargetCompact,
        )}
      >
        {submitting
          ? t('ide.chat.report.submitting', undefined, { defaultValue: 'Submitting…' })
          : t('ide.chat.report.submit', undefined, { defaultValue: 'Submit report' })}
      </button>
    </div>
  </div>
</div>
