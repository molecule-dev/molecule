/**
 * Vue kebab / overflow action menu: a trigger button that opens a popover list
 * of actions.
 *
 * Vue counterpart of `@molecule/app-action-menu-react`'s `ActionMenu` — the
 * same props (React names), the same DOM for the same input, and the same
 * click callbacks.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { ActionMenuItem } from './types.js'

/**
 * The children a node value contributes: an array stays a list of siblings, a
 * single node is one child, and an absent value contributes nothing — the way
 * React renders `{node}`.
 *
 * @param value - A node value.
 * @returns The child nodes.
 */
const childrenOf = (value: VNodeChild): VNodeChild[] => {
  if (value === null || value === undefined || value === false) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Compact overflow / kebab menu button that opens a popover list of actions on
 * click. Closes on outside-click and Escape.
 *
 * Pure uncontrolled — the component manages its own open state.
 *
 * @param props - Component props (see {@link ActionMenuProps}).
 * @returns The action-menu component.
 */
export const ActionMenu = defineComponent({
  name: 'ActionMenu',
  // As in React (which never spreads unknown props onto an element): a prop
  // this component does not declare must not leak onto the wrapper as an
  // attribute.
  inheritAttrs: false,
  props: {
    items: {
      type: Array as PropType<ActionMenuItem[]>,
      required: true,
    },
    // Node-valued (a VNode or text): `null` accepts any runtime type, the way
    // Vue declares a slot-ish prop.
    trigger: null,
    align: {
      type: String as PropType<'left' | 'right'>,
      default: 'right',
    },
    // Falls back to the translated `actionMenu.aria.trigger` at read time
    // (React's `triggerAriaLabel ?? t(...)` default), so no English literal
    // sits in the prop itself.
    triggerAriaLabel: {
      type: String,
      default: undefined,
    },
    className: String,
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    const cm = getClassMap()
    const open = ref(false)
    const wrapper = ref<HTMLSpanElement | null>(null)

    /**
     * The trigger's label: the prop when given, else the translated default
     * (read in render, so a locale switch re-renders it).
     * @returns The label text.
     */
    const triggerLabel = (): string =>
      props.triggerAriaLabel ?? t('actionMenu.aria.trigger', undefined, { defaultValue: 'Actions' })

    /**
     * Closes the menu when a mousedown occurs outside the wrapper element.
     * @param event - The document mousedown.
     */
    function onDoc(event: MouseEvent): void {
      if (!wrapper.value?.contains(event.target as Node)) open.value = false
    }

    /**
     * Closes the menu when the Escape key is pressed.
     * @param event - The document keydown.
     */
    function onEsc(event: KeyboardEvent): void {
      if (event.key === 'Escape') open.value = false
    }

    // As in React's effect: the listeners exist only while the menu is open.
    watch(open, (isOpen) => {
      if (isOpen) {
        document.addEventListener('mousedown', onDoc)
        document.addEventListener('keydown', onEsc)
        return
      }
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    })

    /**
     * The trigger content: the same-named slot wins, then the prop, then the
     * default "⋮" glyph (React's `trigger ?? '⋮'`).
     * @returns The trigger child nodes.
     */
    const triggerNodes = (): VNodeChild[] => {
      const content = slots.trigger?.()
      // An empty slot result is absent (React's `slot()`): fall through to the
      // prop, then the default glyph.
      if (toChildArray(content).length > 0) return content as VNodeChild[]
      const fromProp = childrenOf(props.trigger)
      return toChildArray(fromProp).length > 0 ? fromProp : ['⋮']
    }

    /**
     * The classes of an item rendered as a button (React's button branch).
     * @param item - The item.
     * @returns The class string.
     */
    const buttonClasses = (item: ActionMenuItem): string =>
      cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.w('full'),
        cm.sp('px', 2),
        cm.sp('py', 2),
        cm.textSize('sm'),
        item.destructive && cm.textError,
        item.destructive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
      )

    /**
     * The classes of an item rendered as an anchor (React's anchor branch,
     * which has no `w('full')`).
     * @param item - The item.
     * @returns The class string.
     */
    const anchorClasses = (item: ActionMenuItem): string =>
      cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 2),
        cm.sp('py', 2),
        cm.textSize('sm'),
        item.destructive && cm.textError,
        item.destructive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
      )

    /**
     * One list entry: the anchor or button, then the optional divider.
     * @param item - The item.
     * @returns The rendered `<li>`.
     */
    const renderItem = (item: ActionMenuItem): VNode => {
      const content: VNodeChild[] = [
        ...childrenOf(item.icon),
        h('span', null, childrenOf(item.label)),
      ]
      const entry = item.href
        ? h(
            'a',
            {
              href: item.href,
              role: 'menuitem',
              'data-mol-id': `action-menu-item-${item.id}`,
              onClick: () => {
                open.value = false
              },
              class: anchorClasses(item),
              style: { opacity: item.disabled ? 0.5 : 1 },
            },
            content,
          )
        : h(
            'button',
            {
              type: 'button',
              role: 'menuitem',
              'data-mol-id': `action-menu-item-${item.id}`,
              onClick: () => {
                if (item.disabled) return
                item.onClick?.()
                open.value = false
              },
              disabled: item.disabled,
              class: buttonClasses(item),
            },
            content,
          )
      const children: VNodeChild[] = [entry]
      if (item.divider)
        children.push(
          h('span', {
            'aria-hidden': 'true',
            class: cm.cn(cm.displayBlock, cm.bgBorder),
            style: { height: '1px', margin: '4px 0' },
          }),
        )
      return h('li', { key: item.id, role: 'none' }, children)
    }

    return (): VNode =>
      h(
        'span',
        {
          ref: wrapper,
          class: cm.cn(cm.position('relative'), props.className),
          style: { display: 'inline-block' },
        },
        [
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: () => {
                open.value = !open.value
              },
              'aria-label': triggerLabel(),
              'aria-haspopup': 'menu',
              'aria-expanded': open.value,
              'data-mol-id': 'action-menu-trigger',
            },
            () => triggerNodes(),
          ),
          open.value
            ? h(
                'ul',
                {
                  role: 'menu',
                  'data-mol-id': 'action-menu-list',
                  class: cm.cn(cm.stack(0 as const), cm.sp('p', 1), cm.surface, cm.borderAll),
                  style: {
                    position: 'absolute',
                    top: '100%',
                    [props.align === 'right' ? 'right' : 'left']: 0,
                    minWidth: '160px',
                    zIndex: 50,
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                },
                props.items.map(renderItem),
              )
            : null,
        ],
      )
  },
})
