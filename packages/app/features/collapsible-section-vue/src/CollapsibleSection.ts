/**
 * Vue collapsible section and "show more" toggle.
 *
 * Vue counterparts of `@molecule/app-collapsible-section-react`'s
 * `CollapsibleSection` and `ShowMore` — the same props (React names), the same
 * ClassMap tokens, the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: a
 * prop that was given wins (React's single source of truth — a later `null`
 * removes the node, as React does), and the slot is used only while the prop
 * is absent. An absent pair contributes nothing.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns The children to render.
 */
const nodeValue = (prop: VNodeChild, slot: (() => VNodeChild[]) | undefined): VNodeChild[] => {
  if (prop !== undefined) {
    if (prop === null) return []
    // A node-valued prop may carry one node or a list of them.
    return Array.isArray(prop) ? prop : [prop]
  }
  if (slot) return slot()
  return []
}

/**
 * Whether React's `actions && …` branch renders: a given prop decides it by
 * its own truthiness; an absent prop leaves the decision to the slot.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns Whether the wrapper renders.
 */
const shows = (prop: VNodeChild, slot: unknown): boolean =>
  prop !== undefined ? Boolean(prop) : slot !== undefined

/**
 * Expandable section with a clickable heading. Lighter-weight than
 * `<Accordion>` — renders a single toggle, not a group of panels.
 *
 * Expansion is uncontrolled by default (`defaultExpanded`); pass `expanded` to
 * control it — then update it from `onExpandedChange`. The header renders a
 * toggle `<button>` around the label with `actions` beside it as a sibling
 * (a button may not contain other controls), so `actions` MAY contain
 * buttons/links — a click there never reaches the toggle.
 *
 * @param props - Component props (see {@link CollapsibleSectionProps}).
 * @returns The collapsible section component.
 */
export const CollapsibleSection = defineComponent({
  name: 'CollapsibleSection',
  props: {
    title: null,
    children: null,
    expanded: null,
    defaultExpanded: null,
    onExpandedChange: {
      type: Function as PropType<(expanded: boolean) => void>,
      default: undefined,
    },
    badge: null,
    actions: null,
    level: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const internal = ref<boolean>(props.defaultExpanded ?? false)
    const isOpen = computed((): boolean => props.expanded ?? internal.value)
    const heading = computed((): string => `h${props.level ?? 3}`)

    /** Toggles expansion state, updating internal state when uncontrolled. */
    const toggle = (): void => {
      const next = !isOpen.value
      if (props.expanded === undefined) internal.value = next
      props.onExpandedChange?.(next)
    }

    return (): VNode =>
      h('section', { class: cm.cn(cm.stack(2), props.className) }, [
        h(heading.value, [
          // The header row is a container, not a button: a button may not
          // contain other controls, and `actions` typically holds them. The
          // toggle wraps the label; `actions` sits beside it, so a click there
          // never reaches the toggle (no stopPropagation needed).
          h(
            'span',
            {
              class: cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.w('full'),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
              ),
            },
            [
              h(
                'button',
                {
                  type: 'button',
                  onClick: toggle,
                  'aria-expanded': isOpen.value ? 'true' : 'false',
                  class: cm.flex({ align: 'center', gap: 'sm' }),
                },
                [
                  h('span', { 'aria-hidden': 'true' }, isOpen.value ? '▾' : '▸'),
                  h('span', nodeValue(props.title, slots.title)),
                  ...nodeValue(props.badge, slots.badge),
                ],
              ),
              shows(props.actions, slots.actions)
                ? h('span', nodeValue(props.actions, slots.actions))
                : null,
            ],
          ),
        ]),
        isOpen.value ? h('div', nodeValue(props.children, slots.default)) : null,
      ])
  },
})

/**
 * "Show N more" / "Show less" toggle. Simpler than `<CollapsibleSection>` when
 * you just want to truncate a long list.
 *
 * @param props - Component props (see {@link ShowMoreProps}).
 * @returns The show-more component.
 */
export const ShowMore = defineComponent({
  name: 'ShowMore',
  props: {
    children: null,
    initialCount: null,
    moreKey: { type: String, default: 'showMore.more' },
    lessKey: { type: String, default: 'showMore.less' },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const expanded = ref(false)

    return (): VNode => {
      const all = nodeValue(props.children, slots.default)
      const initialCount = props.initialCount ?? 3
      const visible = expanded.value ? all : all.slice(0, initialCount)
      const remaining = Math.max(0, all.length - initialCount)
      return h('div', { class: cm.cn(cm.stack(2), props.className) }, [
        ...visible,
        remaining > 0
          ? h(
              'button',
              {
                type: 'button',
                onClick: () => {
                  expanded.value = !expanded.value
                },
                class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link),
              },
              expanded.value
                ? t(props.lessKey, {}, { defaultValue: 'Show less' })
                : t(props.moreKey, { remaining }, { defaultValue: `Show ${remaining} more` }),
            )
          : null,
      ])
    }
  },
})
