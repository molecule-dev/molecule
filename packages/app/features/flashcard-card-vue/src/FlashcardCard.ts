/**
 * Vue flashcard study card — front face → reveal back → SM-2 style grade
 * buttons (Again / Hard / Good / Easy).
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { SrsGrade } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * prop when the caller passed one, otherwise the slot, otherwise nothing.
 *
 * @param value - The prop's value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @returns The children to render.
 */
const nodeOrSlot = (
  value: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (value !== undefined && value !== null && value !== false && value !== '') return [value]
  return slot ? slot() : []
}

/**
 * Flashcard study component — front face → reveal back → SM-2 style grade
 * buttons (Again / Hard / Good / Easy). Apps own the spaced-repetition
 * scheduling logic.
 *
 * Vue counterpart of `@molecule/app-flashcard-card-react`'s `FlashcardCard` —
 * the same props (React names), the same ClassMap tokens and the same DOM for
 * the same input. Grading flips the card back to its front face; the button
 * labels go through `useTranslation()` with React's exact keys and English
 * defaults.
 *
 * @param props - Component props (see {@link FlashcardCardProps} in
 *   `./types.js`).
 * @returns The flashcard component.
 */
export const FlashcardCard = defineComponent({
  name: 'FlashcardCard',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null`).
    front: { type: null, required: true },
    back: { type: null, required: true },
    progress: null,
    onGrade: Function as PropType<(grade: SrsGrade) => void>,
    defaultRevealed: Boolean,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const revealed = ref(!!props.defaultRevealed)

    /**
     * Forwards the selected grade to the parent and resets the card to hidden.
     *
     * @param grade - The selected SM-2 grade.
     */
    const grade = (grade: SrsGrade): void => {
      props.onGrade?.(grade)
      revealed.value = false
    }

    return (): VNode => {
      const progress = toChildArray(nodeOrSlot(props.progress, slots.progress))
      return h(Card, { className: props.className }, () => [
        h('div', { class: cm.stack(4) }, [
          progress.length > 0
            ? h(
                'div',
                { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter) },
                progress,
              )
            : null,
          h(
            'div',
            { class: cm.cn(cm.sp('p', 6), cm.textCenter, cm.cn(cm.textSize('xl'))) },
            revealed.value
              ? nodeOrSlot(props.back, slots.back)
              : nodeOrSlot(props.front, slots.front),
          ),
          !revealed.value
            ? h(
                Button,
                {
                  variant: 'solid',
                  color: 'primary',
                  onClick: () => {
                    revealed.value = true
                  },
                },
                () => t('flashcard.reveal', {}, { defaultValue: 'Show answer' }),
              )
            : h('div', { class: cm.grid({ cols: 4, gap: 'sm' }) }, [
                h(
                  Button,
                  { variant: 'outline', color: 'error', onClick: () => grade('again') },
                  () => t('flashcard.again', {}, { defaultValue: 'Again' }),
                ),
                h(
                  Button,
                  { variant: 'outline', color: 'warning', onClick: () => grade('hard') },
                  () => t('flashcard.hard', {}, { defaultValue: 'Hard' }),
                ),
                h(
                  Button,
                  { variant: 'outline', color: 'primary', onClick: () => grade('good') },
                  () => t('flashcard.good', {}, { defaultValue: 'Good' }),
                ),
                h(
                  Button,
                  { variant: 'outline', color: 'success', onClick: () => grade('easy') },
                  () => t('flashcard.easy', {}, { defaultValue: 'Easy' }),
                ),
              ]),
        ]),
      ])
    }
  },
})
