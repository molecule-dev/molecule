/**
 * Vue generic contact form: name + email + message fields, plus an
 * `extraFields` slot for app-specific inputs.
 *
 * Vue counterpart of `@molecule/app-contact-form-react`'s `ContactForm` — the
 * same props (React names), the same DOM for the same input, and the same
 * callback: `onSubmit` receives `{ name, email, message }`.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Textarea } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { ContactFormValues } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot, with
 * React's `prop && …` truthiness: a truthy prop wins, otherwise the slot, and
 * an absent pair contributes nothing.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @returns The children to render.
 */
const nodeOrSlot = (
  prop: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (prop) return [prop]
  if (slot) return slot()
  return []
}

/**
 * Generic name + email + message contact form with submit handling and
 * success state. `extraFields` slot lets apps add domain-specific inputs
 * (subject, phone, agent id, etc.).
 *
 * Always pass `successContent`: without it the form clears silently after a
 * successful submit with no user feedback. If `onSubmit` rejects, the thrown
 * `Error.message` is shown verbatim below the form — throw translated,
 * user-safe messages.
 *
 * @param props - Component props (see {@link ContactFormProps}).
 * @returns The contact form component.
 */
export const ContactForm = defineComponent({
  name: 'ContactForm',
  props: {
    onSubmit: {
      type: Function as PropType<(values: ContactFormValues) => void | Promise<void>>,
      required: true,
    },
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to hide).
    title: null,
    description: null,
    submitLabel: null,
    successContent: null,
    extraFields: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const name = ref('')
    const email = ref('')
    const message = ref('')
    const submitting = ref(false)
    const submitted = ref(false)
    const error = ref<string | null>(null)

    /**
     * Handles form submission: calls `onSubmit` with collected values and manages submitting/error state.
     *
     * @param event - The submit event (React's `FormEvent`).
     */
    const handle = async (event: Event): Promise<void> => {
      event.preventDefault()
      if (submitting.value) return
      submitting.value = true
      error.value = null
      try {
        await props.onSubmit({ name: name.value, email: email.value, message: message.value })
        submitted.value = true
        name.value = ''
        email.value = ''
        message.value = ''
      } catch (err: unknown) {
        // React hardcodes this fallback (no i18n key), so the ports keep the
        // same string for DOM parity.
        error.value = err instanceof Error ? err.message : 'Submission failed'
      } finally {
        submitting.value = false
      }
    }

    /**
     * The submit button's children: React's
     * `submitting ? t('contactForm.sending') : (submitLabel ?? t('contactForm.send'))`.
     *
     * @returns The nodes to render inside the button.
     */
    const labelNodes = (): VNodeChild[] => {
      if (submitting.value) return [t('contactForm.sending', {}, { defaultValue: 'Sending…' })]
      if (props.submitLabel !== undefined && props.submitLabel !== null) return [props.submitLabel]
      if (slots.submitLabel) return slots.submitLabel()
      return [t('contactForm.send', {}, { defaultValue: 'Send message' })]
    }

    /**
     * The success content: React's `successContent !== undefined` gate, so an
     * empty success prop still renders the wrapper.
     *
     * @returns Whether the content was given, and the nodes to render.
     */
    const success = (): { given: boolean; nodes: VNodeChild[] } => {
      if (props.successContent !== undefined) {
        return { given: true, nodes: props.successContent === null ? [] : [props.successContent] }
      }
      if (slots.successContent) return { given: true, nodes: slots.successContent() }
      return { given: false, nodes: [] }
    }

    return (): VNodeChild => {
      const successContent = success()
      if (submitted.value && successContent.given) {
        return h('div', { class: props.className }, successContent.nodes)
      }

      const title = nodeOrSlot(props.title, slots.title)
      const description = nodeOrSlot(props.description, slots.description)
      const extraFields = nodeOrSlot(props.extraFields, slots.extraFields)

      const headerChildren: VNodeChild[] = []
      if (title.length)
        headerChildren.push(
          h('h3', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('semibold')) }, title),
        )
      if (description.length) headerChildren.push(h('p', { class: cm.textSize('sm') }, description))

      return h('form', { onSubmit: handle, class: cm.cn(cm.stack(3), props.className) }, [
        ...(headerChildren.length ? [h('header', { class: cm.stack(1) }, headerChildren)] : []),
        h(Input, {
          type: 'text',
          value: name.value,
          onChange: (event: Event) => {
            name.value = (event.target as HTMLInputElement).value
          },
          placeholder: t('contactForm.name', {}, { defaultValue: 'Your name' }),
          required: true,
          'aria-label': 'Name',
        }),
        h(Input, {
          type: 'email',
          value: email.value,
          onChange: (event: Event) => {
            email.value = (event.target as HTMLInputElement).value
          },
          placeholder: t('contactForm.email', {}, { defaultValue: 'you@example.com' }),
          required: true,
          'aria-label': 'Email',
        }),
        ...extraFields,
        h(Textarea, {
          value: message.value,
          onChange: (event: Event) => {
            message.value = (event.target as HTMLTextAreaElement).value
          },
          placeholder: t('contactForm.message', {}, { defaultValue: 'How can we help?' }),
          required: true,
          rows: 5,
          'aria-label': 'Message',
        }),
        ...(error.value ? [h('p', { class: cm.textSize('sm') }, error.value)] : []),
        h(
          Button,
          { type: 'submit', variant: 'solid', color: 'primary', disabled: submitting.value },
          () => labelNodes(),
        ),
      ])
    }
  },
})
