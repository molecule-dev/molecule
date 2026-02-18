/**
 * Vue Avatar UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref } from 'vue'

import { t } from '@molecule/app-i18n'
import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Get initials from a name.
 * @param name - The name.
 * @returns The resulting string.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Vue Avatar UI component with UIClassMap-driven styling.
 */
export const Avatar = defineComponent({
  name: 'MAvatar',
  props: {
    src: String,
    alt: String,
    name: String,
    size: {
      type: [String, Number] as PropType<Size | number>,
      default: 'md',
    },
    rounded: {
      type: Boolean,
      default: true,
    },
    class: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const imageError = ref(false)

    return () => {
      const cmSize = typeof props.size === 'number' ? undefined : props.size
      const showFallback = !props.src || imageError.value

      const containerClasses = cm.cn(
        cm.avatar({ size: cmSize }),
        !props.rounded && cm.avatarSquare,
        props.class,
      )

      const customSize =
        typeof props.size === 'number'
          ? { width: `${props.size}px`, height: `${props.size}px` }
          : undefined

      return h(
        'div',
        {
          class: containerClasses,
          style: customSize,
        },
        [
          !showFallback
            ? h('img', {
                src: props.src,
                alt:
                  props.alt ||
                  props.name ||
                  t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' }),
                class: cm.avatarImage,
                onError: () => {
                  imageError.value = true
                },
              })
            : h('div', { class: cm.avatarFallback }, [
                slots.fallback
                  ? slots.fallback()
                  : props.name
                    ? h('span', { class: cm.avatarInitials }, getInitials(props.name))
                    : renderIcon('user', cm.avatarFallbackIcon),
              ]),
        ],
      )
    }
  },
})
