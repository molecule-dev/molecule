/**
 * Vue status-page summary: grouped component list with colored badges and an
 * overall banner derived from the worst child status.
 *
 * Vue counterpart of `@molecule/app-status-summary-react`'s `StatusSummary` —
 * the same props (React names), the same ClassMap tokens, the same i18n keys
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { ComponentStatus, StatusGroup } from './types.js'

/**
 * The semantic tone colouring each status: the theme's success green for
 * operational, its warning amber for degraded and partial outage, its error
 * red for a major outage and its info blue for maintenance.
 */
const STATUS_TONE: Record<ComponentStatus, ColorVariant> = {
  operational: 'success',
  degraded: 'warning',
  'partial-outage': 'warning',
  'major-outage': 'error',
  maintenance: 'info',
}

/** The statuses from most to least severe (React's `worst` order). */
const SEVERITY_ORDER: ComponentStatus[] = [
  'major-outage',
  'partial-outage',
  'degraded',
  'maintenance',
  'operational',
]

/**
 * Returns the most severe status from an array of ComponentStatus values.
 *
 * @param statuses - Every component status in the summary.
 * @returns The worst status found, or `'operational'` for an empty list.
 */
function worst(statuses: ComponentStatus[]): ComponentStatus {
  for (const status of SEVERITY_ORDER) {
    if (statuses.includes(status)) return status
  }
  return 'operational'
}

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns The children to render.
 */
const nodeValue = (prop: VNodeChild, slot?: () => VNodeChild[]): VNodeChild[] => {
  if (slot) return slot()
  if (prop === undefined || prop === null) return []
  return Array.isArray(prop) ? prop : [prop]
}

/**
 * Status-page summary — grouped component list with colored badges and an
 * overall banner derived from the worst child status.
 *
 * When `overallStatus` is omitted the banner shows the worst status found
 * across all components (major-outage > partial-outage > degraded >
 * maintenance > operational). The banner renders `header`, the grid renders
 * one section per group and `footer` renders below it — any of them may be
 * passed as a prop or as the same-named slot.
 *
 * @param props - Component props (see {@link StatusSummaryProps}).
 * @returns The status summary component.
 */
export const StatusSummary = defineComponent({
  name: 'StatusSummary',
  props: {
    groups: { type: Array as PropType<StatusGroup[]>, required: true },
    overallStatus: { type: String as PropType<ComponentStatus>, default: undefined },
    header: null,
    footer: null,
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * The label for one status, through its literal i18n key with the English
     * fallback (the same text the `common` locale bond's en.ts ships).
     *
     * @param status - The status to label.
     * @returns The translated label.
     */
    const statusLabel = (status: ComponentStatus): string => {
      switch (status) {
        case 'operational':
          return t('status.operational', {}, { defaultValue: 'Operational' })
        case 'degraded':
          return t('status.degraded', {}, { defaultValue: 'Degraded performance' })
        case 'partial-outage':
          return t('status.partial-outage', {}, { defaultValue: 'Partial outage' })
        case 'major-outage':
          return t('status.major-outage', {}, { defaultValue: 'Major outage' })
        case 'maintenance':
          return t('status.maintenance', {}, { defaultValue: 'Under maintenance' })
      }
    }

    return (): VNode => {
      const allStatuses = props.groups.flatMap((group) =>
        group.components.map((component) => component.status),
      )
      const overall = props.overallStatus ?? worst(allStatuses)
      return h('div', { class: cm.cn(cm.stack(4), props.className) }, [
        h(
          'div',
          {
            class: cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              cm.sp('p', 3),
              cm.bgTone(STATUS_TONE[overall]),
              cm.textOnTone,
            ),
            style: { borderRadius: '8px' },
          },
          [
            h('span', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) }, [
              statusLabel(overall),
            ]),
            ...nodeValue(props.header, slots.header),
          ],
        ),
        ...props.groups.map((group) =>
          h('section', { key: group.id, class: cm.stack(2) }, [
            h(
              'h3',
              { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
              nodeValue(group.name),
            ),
            h(
              'ul',
              { class: cm.stack(1) },
              group.components.map((component) =>
                h(
                  'li',
                  {
                    key: component.id,
                    class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  },
                  [
                    h('div', undefined, [
                      h(
                        'span',
                        { class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium')) },
                        nodeValue(component.name),
                      ),
                      component.subtitle
                        ? h(
                            'span',
                            { class: cm.cn(cm.sp('ml', 2), cm.textSize('xs')) },
                            nodeValue(component.subtitle),
                          )
                        : null,
                    ]),
                    h(
                      'span',
                      {
                        class: cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.bgTone(STATUS_TONE[component.status]),
                          cm.textOnTone,
                        ),
                        style: { borderRadius: '4px' },
                      },
                      [statusLabel(component.status)],
                    ),
                  ],
                ),
              ),
            ),
          ]),
        ),
        ...nodeValue(props.footer, slots.footer),
      ])
    }
  },
})
