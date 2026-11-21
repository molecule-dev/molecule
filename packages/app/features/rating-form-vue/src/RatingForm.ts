/**
 * Vue star-rating + comment form: a star radiogroup, a comment textarea and a
 * submit button, with its own hover / submitting state.
 *
 * Vue counterpart of `@molecule/app-rating-form-react`'s `RatingForm` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Textarea } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { RatingFormProps } from './types.js'

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
 * `null`/`undefined` fall through to the same-named slot, then the fallback, so
 * an empty string still wins over the default text.
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
  if (prop !== undefined && prop !== null) return prop === '' ? [] : [prop]
  if (slot) return slot()
  return fallback()
}

/**
 * The star button's inline style: the same four properties React assigns, set
 * through the CSSOM so the shorthand `border` serializes exactly as React's.
 *
 * @param filled - Whether the star draws in the filled colour.
 * @returns The style object for a star button.
 */
const starStyle = (filled: boolean): Record<string, string> => ({
  background: 'none',
  border: 'none',
  fontSize: '28px',
  color: filled
    ? 'var(--mol-color-warning, #facc15)'
    : 'var(--mol-color-border, rgba(128,128,128,0.4))',
})

/**
 * Interactive star-rating + comment form. Used for review submission
 * (product reviews, course feedback, support-ticket CSAT).
 *
 * The submit button stays disabled until a star rating is selected, and
 * `requireComment` blocks submission on blank comments silently (no inline
 * error is rendered). Rejected `onSubmit` promises propagate — handle errors in
 * your handler.
 *
 * @param props - Component props (see {@link RatingFormProps}).
 * @returns The rating form component.
 */
export const RatingForm = defineComponent({
  name: 'RatingForm',
  props: {
    onSubmit: {
      type: Function as PropType<RatingFormProps['onSubmit']>,
      required: true,
    },
    max: { type: Number, default: 5 },
    defaultRating: { type: Number, default: 0 },
    requireComment: Boolean,
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to hide).
    title: null,
    commentPlaceholder: String,
    submitLabel: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const rating = ref(props.defaultRating)
    const hover = ref(0)
    const comment = ref('')
    const submitting = ref(false)
    /** The star buttons by number, for the keyboard handler's focus moves. */
    const starEls = new Map<number, HTMLButtonElement>()

    /**
     * The star holding the group's one tab stop: the selected one, or the first
     * when no star is selected — no rating yet, or a `defaultRating` outside
     * 1..max, which marks no star (an out-of-range value must still leave the
     * group reachable from the keyboard).
     *
     * @returns The star number that is tabbable.
     */
    const tabStop = (): number =>
      rating.value >= 1 && rating.value <= props.max ? rating.value : 1

    /**
     * Handles form submission: validates state, delegates to onSubmit, and
     * manages the submitting flag.
     *
     * @param event - The submit event (React's `FormEvent`).
     */
    const handle = async (event: Event): Promise<void> => {
      event.preventDefault()
      if (submitting.value || !rating.value) return
      if (props.requireComment && !comment.value.trim()) return
      submitting.value = true
      try {
        await props.onSubmit(rating.value, comment.value)
      } finally {
        submitting.value = false
      }
    }

    /**
     * Selects a star and moves focus with it — the APG radio group's roving
     * tabindex, where the checked star is the group's one keyboard stop.
     *
     * @param n - The star to select.
     */
    const selectAndFocus = (n: number): void => {
      rating.value = n
      starEls.get(n)?.focus()
    }

    /**
     * Handles the radio keys on a star (the APG radio group pattern):
     * ArrowRight / ArrowDown select and focus the next star, ArrowLeft /
     * ArrowUp the previous one, both wrapping; Home and End jump to the first
     * and last. The handled keys are prevented (they would otherwise scroll or
     * move focus); Space and Enter stay the native button click, and any other
     * key is ignored.
     *
     * @param event - The key event on a star button.
     */
    const onStarKeydown = (event: KeyboardEvent): void => {
      const current = tabStop()
      let next: number
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = current >= props.max ? 1 : current + 1
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          next = current <= 1 ? props.max : current - 1
          break
        case 'Home':
          next = 1
          break
        case 'End':
          next = props.max
          break
        default:
          return
      }
      event.preventDefault()
      selectAndFocus(next)
    }

    return (): VNode => {
      const display = hover.value || rating.value
      const stars: VNode[] = Array.from({ length: props.max }, (_v, i) => i + 1).map((n) =>
        h(
          'button',
          {
            key: n,
            ref: (el) => {
              if (el instanceof HTMLButtonElement) starEls.set(n, el)
              else starEls.delete(n)
            },
            type: 'button',
            role: 'radio',
            'data-mol-id': 'rating-form-star',
            tabindex: n === tabStop() ? 0 : -1,
            'aria-checked': rating.value === n,
            'aria-label': t(
              'rating.star',
              { n, max: props.max },
              { defaultValue: '{{n}} of {{max}}' },
            ),
            onClick: () => {
              rating.value = n
            },
            onKeydown: onStarKeydown,
            onMouseenter: () => {
              hover.value = n
            },
            class: cm.cn(cm.cursorPointer, cm.touchTarget),
            style: starStyle(n <= display),
          },
          '★',
        ),
      )

      const title = nodeOrSlot(props.title, slots.title)

      return h('form', { onSubmit: handle, class: cm.cn(cm.stack(3), props.className) }, [
        ...(title.length
          ? [h('h3', { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) }, title)]
          : []),
        h(
          'div',
          {
            role: 'radiogroup',
            // jsx-a11y's interactive-supports-focus asks the group (it carries
            // onMouseleave) to be focusable, so it keeps a tabindex — but at
            // -1 the group is only ever focused through script, never a tab
            // stop. The stars carry the keyboard instead (React's
            // `tabIndex={-1}`, the APG radio group's roving tabindex).
            tabindex: -1,
            'aria-label': t('rating.label', {}, { defaultValue: 'Rating' }),
            class: cm.flex({ align: 'center', gap: 'xs' }),
            onMouseleave: () => {
              hover.value = 0
            },
          },
          stars,
        ),
        h(Textarea, {
          value: comment.value,
          onChange: (event: Event) => {
            comment.value = (event.target as HTMLTextAreaElement).value
          },
          placeholder:
            props.commentPlaceholder ??
            t(
              'rating.commentPlaceholder',
              {},
              {
                defaultValue: 'Share your thoughts (optional)',
              },
            ),
          rows: 4,
          'aria-label': t('rating.comment', {}, { defaultValue: 'Comment' }),
        }),
        h(
          Button,
          {
            type: 'submit',
            variant: 'solid',
            color: 'primary',
            disabled: submitting.value || !rating.value,
          },
          () =>
            submitting.value
              ? [t('rating.submitting', {}, { defaultValue: 'Submitting…' })]
              : nullishNode(props.submitLabel, slots.submitLabel, () => [
                  t('rating.submit', {}, { defaultValue: 'Submit review' }),
                ]),
        ),
      ])
    }
  },
})
