/**
 * Vue Modal UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, onUnmounted, type PropType, Teleport, watch } from 'vue'

import { t } from '@molecule/app-i18n'
import type { ModalSize } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Vue Modal UI component with UIClassMap-driven styling.
 */
export const Modal = defineComponent({
  name: 'MModal',
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    title: String,
    size: {
      type: String as PropType<ModalSize>,
      default: 'md',
    },
    showCloseButton: {
      type: Boolean,
      default: true,
    },
    closeOnOverlayClick: {
      type: Boolean,
      default: true,
    },
    closeOnEscape: {
      type: Boolean,
      default: true,
    },
    preventScroll: {
      type: Boolean,
      default: true,
    },
    closeLabel: String,
    class: String,
  },
  emits: ['close'],
  setup(props, { emit, slots }) {
    const cm = getClassMap()

    const handleEscape = (e: KeyboardEvent): void => {
      if (props.closeOnEscape && e.key === 'Escape') {
        emit('close')
      }
    }

    const handleOverlayClick = (e: MouseEvent): void => {
      if (props.closeOnOverlayClick && e.target === e.currentTarget) {
        emit('close')
      }
    }

    watch(
      () => props.open,
      (isOpen) => {
        if (isOpen) {
          document.addEventListener('keydown', handleEscape)
          if (props.preventScroll) {
            document.body.style.overflow = 'hidden'
          }
        } else {
          document.removeEventListener('keydown', handleEscape)
          if (props.preventScroll) {
            document.body.style.overflow = ''
          }
        }
      },
      { immediate: true },
    )

    onUnmounted(() => {
      document.removeEventListener('keydown', handleEscape)
      if (props.preventScroll) {
        document.body.style.overflow = ''
      }
    })

    return () => {
      if (!props.open) {
        return null
      }

      const modalContent = [
        // Overlay background
        h('div', {
          class: cm.dialogOverlay,
          'aria-hidden': true,
        }),
        // Centering wrapper
        h(
          'div',
          {
            class: cm.dialogWrapper,
            onClick: handleOverlayClick,
          },
          [
            // Content
            h(
              'div',
              {
                role: 'dialog',
                'aria-modal': true,
                'aria-labelledby': props.title ? 'modal-title' : undefined,
                class: cm.cn(cm.modal({ size: props.size }), props.class),
                onClick: (e: MouseEvent) => e.stopPropagation(),
              },
              [
                // Header
                (props.title || props.showCloseButton) &&
                  h('div', { class: cm.dialogHeader }, [
                    props.title
                      ? h('h2', { id: 'modal-title', class: cm.dialogTitle }, props.title)
                      : props.showCloseButton
                        ? h('div')
                        : null,
                    props.showCloseButton &&
                      h(
                        'button',
                        {
                          type: 'button',
                          onClick: () => emit('close'),
                          class: cm.dialogClose,
                          'aria-label':
                            props.closeLabel ??
                            t('ui.modal.close', undefined, { defaultValue: 'Close' }),
                        },
                        renderIcon('x-mark', cm.iconMd),
                      ),
                  ]),
                // Body
                h('div', { class: cm.dialogBody }, slots.default?.()),
                // Footer
                slots.footer && h('div', { class: cm.dialogFooter }, slots.footer()),
              ],
            ),
          ],
        ),
      ]

      return h(Teleport, { to: 'body' }, modalContent)
    }
  },
})
