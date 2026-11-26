/**
 * `/report` (and `/bug`) modal form — the Vue counterpart of
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
 * property), so the attribute is mirrored on mount and update; the
 * textareas carry the property alone, and the checkbox keeps the `checked`
 * ATTRIBUTE it mounts with while the property follows the state — React's
 * exact attribute semantics.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import type { ReportFormState, ReportResult } from '@molecule/app-ide-panel-logic'
import {
  buildReportPayload,
  collectClientInfo,
  EMPTY_REPORT_FORM,
  isReportFormValid,
} from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import { getClassMap, type OverlayTarget } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-vue'
import {
  DEFAULT_PRODUCT_NAME,
  useHttpClient,
  useThemeMode,
  useTranslation,
} from '@molecule/app-vue'

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
 * Keeps a form field's `value` ATTRIBUTE in step with the controlled value
 * (React's controlled-input attribute behavior).
 *
 * @param vnode - The input's vnode.
 */
function syncValueAttr(vnode: VNode): void {
  const el = vnode.el as HTMLInputElement | null
  if (el) el.setAttribute('value', el.value)
}

/**
 * Asserts a controlled field's DOM value as a PROPERTY alone (React's
 * textarea carries the value property, never a `value` attribute — Vue's own
 * `value` binding writes the attribute, so the property is set directly).
 *
 * @param vnode - The field's vnode.
 * @param value - The controlled value.
 */
function setControlledValue(vnode: VNode, value: string): void {
  const el = vnode.el as HTMLTextAreaElement | null
  if (el) el.value = value
}

/**
 * The bug-report / feedback modal opened by `/report`, `/bug`, and the header
 * bug-report button.
 *
 * @param props - See {@link ReportModalProps}.
 * @returns The rendered report modal.
 */
export const ReportModal = defineComponent({
  name: 'ReportModal',
  inheritAttrs: false,
  props: {
    /** The project the report is about (the POST route's id). */
    projectId: { type: String, required: true },
    /** The conversation to attach for context; omit for none. */
    conversationId: {
      type: [String, null] as PropType<string | null>,
      required: false,
      default: undefined,
    },
    /** Seeds the title field (from `/report <title>`); read ONCE at mount. */
    initialTitle: { type: String, required: false, default: undefined },
    /** Called when the modal should close (Escape, the backdrop, Cancel). */
    onClose: { type: Function as PropType<() => void>, required: true },
    /** Hands the recorded report back to the host on a successful POST. */
    onSubmitted: {
      type: Function as PropType<(result: ReportResult) => void>,
      required: true,
    },
    /** The product's name, shown in the subheading. */
    productName: { type: String, required: false, default: undefined },
    /** The running build version, attached to the report's diagnostics. */
    appVersion: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const http = useHttpClient()
    const { t } = useTranslation()
    const mode = useThemeMode()
    const isLight = computed(() => mode.value === 'light')
    // The form state seeds ONCE (React's `useState` initializer): a later
    // `initialTitle` prop never reseeds it.
    const form = ref<ReportFormState>({ ...EMPTY_REPORT_FORM, title: props.initialTitle ?? '' })
    const submitting = ref(false)
    const error = ref<string | null>(null)
    const titleInput = ref<HTMLInputElement | null>(null)

    const titleTarget: OverlayTarget = {
      get current() {
        return titleInput.value
      },
    }

    const isNarrow = useNarrowViewport()
    const isCoarse = useCoarsePointer()

    const border = computed(() =>
      isLight.value ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
    )
    const fieldStyle = computed<Record<string, string>>(() => ({
      width: '100%',
      padding: '6px 8px',
      borderRadius: '4px',
      border: `1px solid ${border.value}`,
      background: 'transparent',
      color: 'inherit',
      outline: 'none',
      // ≥16px on phones/touch so iOS Safari doesn't zoom the page on focus.
      ...(isNarrow.value || isCoarse.value ? { fontSize: '16px' } : {}),
    }))

    /**
     * Submits the report. React wraps this in an arrow and calls it with NO
     * event argument.
     */
    async function handleSubmit(): Promise<void> {
      if (!isReportFormValid(form.value) || submitting.value) return
      submitting.value = true
      error.value = null
      try {
        const url = props.conversationId
          ? `/projects/${props.projectId}/report?conversationId=${encodeURIComponent(props.conversationId)}`
          : `/projects/${props.projectId}/report`
        const clientInfo = collectClientInfo({
          appVersion: props.appVersion,
          theme: isLight.value ? 'light' : 'dark',
        })
        const res = await http.post<ReportResult>(url, buildReportPayload(form.value, clientInfo))
        props.onSubmitted(res.data)
      } catch (err) {
        logger.warn('Failed to submit bug report', { error: err })
        error.value = t('ide.chat.report.error', undefined, {
          defaultValue: 'Could not submit your report. Please try again.',
        })
        submitting.value = false
      }
    }

    return (): VNodeChild =>
      h(
        Modal,
        {
          open: true,
          onClose: props.onClose,
          title: t('ide.chat.report.heading', undefined, { defaultValue: 'Report a bug' }),
          showCloseButton: false,
          'data-mol-id': 'report-modal',
          initialFocus: titleTarget,
        },
        {
          default: () => [
            h('div', { class: cm.textMuted, style: { marginBottom: '12px', lineHeight: '1.4' } }, [
              t(
                'ide.chat.report.subheading',
                { productName: props.productName ?? DEFAULT_PRODUCT_NAME },
                {
                  defaultValue:
                    'Tell us what went wrong or what you’d like to see. Goes to {{productName}}’s team.',
                },
              ),
            ]),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, [
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, [
                h('span', { class: cm.fontWeight('medium') }, [
                  t('ide.chat.report.titleLabel', undefined, { defaultValue: 'Title' }),
                ]),
                h('input', {
                  value: form.value.title,
                  'data-mol-id': 'report-title',
                  ref: titleInput,
                  onInput: (event: Event) => {
                    form.value = {
                      ...form.value,
                      title: (event.target as HTMLInputElement).value,
                    }
                  },
                  placeholder: t('ide.chat.report.titlePlaceholder', undefined, {
                    defaultValue: 'Brief summary',
                  }),
                  class: cm.textSize('sm'),
                  style: fieldStyle.value,
                  onVnodeMounted: syncValueAttr,
                  onVnodeUpdated: syncValueAttr,
                }),
              ]),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, [
                h('span', { class: cm.fontWeight('medium') }, [
                  t('ide.chat.report.descriptionLabel', undefined, {
                    defaultValue: 'Description',
                  }),
                ]),
                h('textarea', {
                  // React's textarea carries the value PROPERTY alone —
                  // never a `value` attribute (Vue's own `value` binding
                  // writes the attribute), so the property is asserted in
                  // the vnode hooks.
                  onVnodeMounted: (vnode: VNode) => {
                    setControlledValue(vnode, form.value.description)
                  },
                  onVnodeUpdated: (vnode: VNode) => {
                    setControlledValue(vnode, form.value.description)
                  },
                  'data-mol-id': 'report-description',
                  onInput: (event: Event) => {
                    form.value = {
                      ...form.value,
                      description: (event.target as HTMLTextAreaElement).value,
                    }
                  },
                  placeholder: t('ide.chat.report.descriptionPlaceholder', undefined, {
                    defaultValue: 'What happened? What did you expect?',
                  }),
                  rows: 4,
                  class: cm.textSize('sm'),
                  style: { ...fieldStyle.value, resize: 'vertical' },
                }),
              ]),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, [
                h('span', { class: cm.fontWeight('medium') }, [
                  t('ide.chat.report.stepsLabel', undefined, {
                    defaultValue: 'Steps to reproduce (optional)',
                  }),
                ]),
                h('textarea', {
                  // The value PROPERTY alone, as above.
                  onVnodeMounted: (vnode: VNode) => {
                    setControlledValue(vnode, form.value.steps)
                  },
                  onVnodeUpdated: (vnode: VNode) => {
                    setControlledValue(vnode, form.value.steps)
                  },
                  'data-mol-id': 'report-steps',
                  onInput: (event: Event) => {
                    form.value = {
                      ...form.value,
                      steps: (event.target as HTMLTextAreaElement).value,
                    }
                  },
                  placeholder: t('ide.chat.report.stepsPlaceholder', undefined, {
                    defaultValue: '1. …\n2. …',
                  }),
                  rows: 3,
                  class: cm.textSize('sm'),
                  style: { ...fieldStyle.value, resize: 'vertical' },
                }),
              ]),
              h(
                'label',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  },
                },
                [
                  h('input', {
                    type: 'checkbox',
                    'data-mol-id': 'report-include-chat',
                    onChange: (event: Event) => {
                      form.value = {
                        ...form.value,
                        includeChat: (event.target as HTMLInputElement).checked,
                      }
                    },
                    // React keeps the `checked` ATTRIBUTE at its mount value
                    // and follows the state with the property alone (Vue's
                    // own `checked` binding writes both), so both are
                    // asserted in the vnode hooks.
                    onVnodeMounted: (vnode: VNode) => {
                      const el = vnode.el as HTMLInputElement
                      el.checked = form.value.includeChat
                      if (el.checked) el.setAttribute('checked', '')
                    },
                    onVnodeUpdated: (vnode: VNode) => {
                      ;(vnode.el as HTMLInputElement).checked = form.value.includeChat
                    },
                  }),
                  h('span', [
                    t('ide.chat.report.includeChat', undefined, {
                      defaultValue: 'Include recent chat for context',
                    }),
                  ]),
                ],
              ),
              error.value
                ? h('div', { class: cm.textError, style: { lineHeight: '1.4' } }, [error.value])
                : null,
            ]),
            h(
              'div',
              {
                'data-mol-id': 'report-diagnostics-note',
                class: cm.cn(cm.textMuted, cm.textSize('xs')),
                style: { marginTop: '12px', lineHeight: '1.4' },
              },
              [
                t('ide.chat.report.diagnosticsNote', undefined, {
                  defaultValue:
                    'Your app version, browser, and screen size are attached to help us debug.',
                }),
              ],
            ),
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '16px',
                },
              },
              [
                h(
                  'button',
                  {
                    type: 'button',
                    'data-mol-id': 'report-cancel',
                    onClick: () => props.onClose(),
                    class: cm.cn(
                      cm.button({ variant: 'ghost', size: 'sm' }),
                      cm.touchTargetCompact,
                    ),
                  },
                  [t('common.cancel', undefined, { defaultValue: 'Cancel' })],
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    'data-mol-id': 'report-submit',
                    onClick: () => void handleSubmit(),
                    disabled: !isReportFormValid(form.value) || submitting.value,
                    // No inline opacity — the CVA fades a real `disabled`
                    // button itself, and an inline value would override
                    // whatever it chooses.
                    class: cm.cn(
                      cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
                      cm.touchTargetCompact,
                    ),
                  },
                  [
                    submitting.value
                      ? t('ide.chat.report.submitting', undefined, {
                          defaultValue: 'Submitting…',
                        })
                      : t('ide.chat.report.submit', undefined, {
                          defaultValue: 'Submit report',
                        }),
                  ],
                ),
              ],
            ),
          ],
        },
      )
  },
})
