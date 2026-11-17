/**
 * Vue email subscribe form: email field + subscribe button, with its own
 * submitting / error / success state.
 *
 * Vue counterpart of `@molecule/app-newsletter-signup-react`'s
 * `NewsletterSignup` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Input } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

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
 * Resolves a node-valued prop with React's `prop ?? fallback` semantics: only
 * `null`/`undefined` fall through to the same-named slot, then the fallback.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @param fallback - The nodes to render when neither is present.
 * @returns The children to render.
 */
const nullishNode = (
  prop: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
  fallback: () => VNodeChild[],
): VNodeChild[] => {
  if (prop !== undefined && prop !== null) return [prop]
  if (slot) return slot()
  return fallback()
}

/**
 * Email + subscribe button widget. Tracks its own submitting/error/success
 * state. Apps own the actual subscription side-effect via `onSubscribe`.
 *
 * Always pass `successContent` — without it a successful submit only clears
 * the input and re-renders the empty form. Return a Promise from `onSubscribe`
 * so double-submits are blocked while in flight; a rejected Promise renders
 * the error's `message` verbatim below the form.
 *
 * @param props - Component props (see {@link NewsletterSignupProps}).
 * @returns The newsletter signup form component.
 */
export const NewsletterSignup = defineComponent({
  name: 'NewsletterSignup',
  props: {
    onSubscribe: {
      type: Function as PropType<(email: string) => void | Promise<void>>,
      required: true,
    },
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to hide).
    title: null,
    description: null,
    placeholder: String,
    buttonLabel: null,
    successContent: null,
    layout: {
      type: String as PropType<'inline' | 'stacked'>,
      default: 'inline',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const email = ref('')
    const submitting = ref(false)
    const submitted = ref(false)
    const error = ref<string | null>(null)

    /**
     * The success content: React's `successContent !== undefined` gate, so an
     * empty success prop still renders the wrapper.
     *
     * @returns Whether the content was given, and the nodes to render.
     */
    const success = (): { given: boolean; nodes: VNodeChild[] } => {
      if (props.successContent !== undefined) {
        return {
          given: true,
          nodes: props.successContent === null ? [] : [props.successContent],
        }
      }
      if (slots.successContent) return { given: true, nodes: slots.successContent() }
      return { given: false, nodes: [] }
    }

    /**
     * Handles form submit: calls onSubscribe and tracks submitting/error/success state.
     *
     * @param event - The submit event (React's `FormEvent`).
     */
    const handle = async (event: Event): Promise<void> => {
      event.preventDefault()
      if (submitting.value) return
      submitting.value = true
      error.value = null
      try {
        await props.onSubscribe(email.value)
        submitted.value = true
        email.value = ''
      } catch (err: unknown) {
        error.value =
          err instanceof Error
            ? err.message
            : t('newsletter.error.subscriptionFailed', {}, { defaultValue: 'Subscription failed' })
      } finally {
        submitting.value = false
      }
    }

    return (): VNodeChild => {
      const successContent = success()
      if (submitted.value && successContent.given) {
        return h('div', { class: props.className }, successContent.nodes)
      }

      const title = nodeOrSlot(props.title, slots.title)
      const description = nodeOrSlot(props.description, slots.description)
      const inline = props.layout === 'inline'

      return h('form', { onSubmit: handle, class: cm.cn(cm.stack(2), props.className) }, [
        ...(title.length
          ? [h('h4', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, title)]
          : []),
        ...(description.length ? [h('p', { class: cm.textSize('sm') }, description)] : []),
        h('div', { class: inline ? cm.flex({ align: 'center', gap: 'sm' }) : cm.stack(2) }, [
          h(Input, {
            type: 'email',
            value: email.value,
            onChange: (event: Event) => {
              email.value = (event.target as HTMLInputElement).value
            },
            placeholder:
              props.placeholder ?? t('newsletter.placeholder', {}, { defaultValue: 'Your email' }),
            required: true,
            'aria-label': t('newsletter.label.email', {}, { defaultValue: 'Email' }),
            className: inline ? cm.flex1 : undefined,
          }),
          h(
            Button,
            {
              type: 'submit',
              variant: 'solid',
              color: 'primary',
              disabled: submitting.value,
            },
            () =>
              submitting.value
                ? [t('newsletter.subscribing', {}, { defaultValue: 'Subscribing…' })]
                : nullishNode(props.buttonLabel, slots.buttonLabel, () => [
                    t('newsletter.subscribe', {}, { defaultValue: 'Subscribe' }),
                  ]),
          ),
        ]),
        ...(error.value ? [h('p', { class: cm.textSize('sm') }, error.value)] : []),
      ])
    }
  },
})
