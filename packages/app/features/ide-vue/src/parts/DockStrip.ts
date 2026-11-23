/**
 * The strips stacked above the composer — working plan, background tasks, tests,
 * uncommitted files — are one family. {@link DockStrip} is their shared chrome
 * (hairline top border, chevron, muted label, right-hand actions, indented
 * detail) and {@link StatusMark} is their shared status icon, so they cannot
 * drift apart.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `DockStrip` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. Node-valued props (`icon`, `label`,
 * `hint`, `actions`, `detailActions`, `chipLabel`) are Vue VNodes; the strip's
 * detail is the default slot. Inside a work tray ({@link WorkTrayContext}) the
 * chip and, when open, the detail are teleported into the tray's header and
 * detail elements.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  inject,
  type InjectionKey,
  type PropType,
  type Ref,
  Teleport,
  useId,
  type VNode,
  type VNodeChild,
} from 'vue'

import { getClassMap, moleculeSpinnerMarkSvg } from '@molecule/app-ui'
import { toChildArray, useThemeMode } from '@molecule/app-vue'

/** The pixel size of a strip's status icon at its default. */
/**
 * Whether a node prop or slot content renders anything, by React's `slot(node)` rule: an empty
 * list, `null` or `false` counts as not passed.
 *
 * @param node - The prop's value, or what the slot returned.
 * @returns True when it renders something.
 */
const renders = (node: VNodeChild | undefined): boolean => toChildArray(node).length > 0

const MARK_SIZE = 16

/**
 * The one-row work tray (see WorkCard). When a {@link DockStrip} sits inside
 * it, the strip draws a compact chip where it stands — the tray's chip row holds
 * the strips, so the chips keep the strips' order — and, while it is the open
 * one, its detail into `detailEl`, so every section shares a single row instead
 * of stacking one bar each. The fields are refs so a tray whose open section
 * changes re-renders every strip in it.
 */
export interface WorkTrayValue {
  /** Where the open section's detail goes. Null until the tray has mounted. */
  detailEl: Ref<HTMLElement | null>
  /** The open section's `molId`, if any. */
  openId: Ref<string | null>
  /** Open this section (or close it, when it is already the open one). */
  toggle: (id: string) => void
}

/** Provided by the work tray; absent when a strip stands alone. */
export const WorkTrayContext: InjectionKey<WorkTrayValue> = Symbol('WorkTrayContext')

/** The states a strip row can be in. */
export type StatusMarkState = 'done' | 'active' | 'todo' | 'failed' | 'waiting' | 'stopped'

/**
 * One status icon for every strip row: the landing page's green check circle
 * when done, the platform's molecule spinner while active, a red crossed circle
 * when failed, an empty ring when still to do.
 *
 * @param props - See {@link StatusMarkProps}.
 * @returns The icon.
 */
export const StatusMark = defineComponent({
  name: 'StatusMark',
  props: {
    /** The row's state. */
    state: { type: String as PropType<StatusMarkState>, required: true },
    /** Pixel size (default 16). */
    size: { type: Number, required: false, default: MARK_SIZE },
  },
  setup(props) {
    const mode = useThemeMode()
    const gradientId = `mol-mark-spinner-${useId().replace(/[:]/g, '')}`

    return (): VNodeChild => {
      const isLight = mode.value === 'light'
      const size = props.size
      if (props.state === 'active') {
        return h('span', {
          'aria-hidden': 'true',
          style: { display: 'inline-flex', flexShrink: '0' },
          innerHTML: moleculeSpinnerMarkSvg({ size, gradientId }),
        })
      }
      if (props.state === 'todo') {
        return h('span', {
          'aria-hidden': 'true',
          style: {
            display: 'inline-block',
            flexShrink: '0',
            boxSizing: 'border-box',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            border: `1.5px solid ${isLight ? '#afb8c1' : '#6e7681'}`,
          },
        })
      }
      if (props.state === 'waiting' || props.state === 'stopped') {
        // Not running: a still ring that says why — a question mark when the
        // person has to answer, a dash when the work simply stopped.
        const ink =
          props.state === 'waiting'
            ? isLight
              ? '#9a6700'
              : '#e3b341'
            : isLight
              ? '#6e7781'
              : '#8b949e'
        return h(
          'span',
          {
            'aria-hidden': 'true',
            style: {
              display: 'inline-flex',
              flexShrink: '0',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              border: `1px solid ${ink}`,
              color: ink,
              fontSize: `${size * 0.7}px`,
              fontWeight: '700',
              lineHeight: '1',
            },
          },
          [props.state === 'waiting' ? '?' : '–'],
        )
      }
      const failed = props.state === 'failed'
      const ink = failed ? (isLight ? '#cf222e' : '#f47067') : isLight ? '#1e7a00' : '#5bb98c'
      const tint = failed
        ? isLight
          ? 'rgba(207, 34, 46, 0.1)'
          : 'rgba(244, 112, 103, 0.16)'
        : isLight
          ? 'rgba(30, 122, 0, 0.12)'
          : 'rgba(91, 185, 140, 0.16)'
      return h(
        'span',
        {
          'aria-hidden': 'true',
          style: {
            display: 'inline-flex',
            flexShrink: '0',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            border: `1px solid ${ink}`,
            color: ink,
            background: tint,
          },
        },
        [
          h(
            'svg',
            {
              // Attributes, not CSS: React writes the numbers bare (a `px`
              // suffix would land in the attribute text).
              width: `${size * 0.56}`,
              height: `${size * 0.56}`,
              viewBox: '0 0 10 10',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '1.8',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
            },
            [
              h('path', {
                d: failed ? 'M2.5 2.5 7.5 7.5M7.5 2.5 2.5 7.5' : 'M2 5.2 4 7.2 8 3',
              }),
            ],
          ),
        ],
      )
    }
  },
})

/** Props for {@link DockStrip} — the React prop names, React's own contract. */
export interface DockStripProps {
  /** `data-mol-id` of the strip root. */
  molId: string
  /** `data-mol-id` of the header row's overlay disclosure button. */
  toggleMolId?: string
  /** Whether the detail is shown. */
  expanded: boolean
  /** Toggle the detail. */
  onToggle: () => void
  /** Open a full view directly instead of disclosing inline detail. */
  onActivate?: () => void
  /** Leading icon, before the label. */
  icon?: VNode | VNode[]
  /** The strip's one-line summary. */
  label: VNodeChild
  /** Use an icon-only disclosure when the adjacent action already carries the summary. */
  hideLabel?: boolean
  /** A shorter label for the tray chip (defaults to `label`). */
  chipLabel?: VNode | VNode[]
  /** Hover text for the tray chip. */
  chipTitle?: string
  /** Quieter text after the label (the thing in flight). */
  hint?: VNode | VNode[]
  /** Right-hand readout and action buttons; they sit above the disclosure overlay and take their own clicks. */
  actions?: VNode | VNode[]
  /** Secondary actions: at the top of the open detail in the tray, beside `actions` when standalone. */
  detailActions?: VNode | VNode[]
  /** Extra attributes for the root (e.g. a tone `data-*`). */
  rootProps?: Record<string, string>
  /** The detail shown when expanded (the default slot). */
  children?: VNodeChild
}

/**
 * Shared chrome for the strips above the composer.
 *
 * @param props - See {@link DockStripProps}.
 * @returns The strip.
 */
export const DockStrip = defineComponent({
  name: 'DockStrip',
  inheritAttrs: false,
  props: {
    /** `data-mol-id` of the strip root. */
    molId: { type: String, required: true },
    /** `data-mol-id` of the header row's overlay disclosure button. */
    toggleMolId: { type: String, required: false, default: undefined },
    /** Whether the detail is shown. */
    expanded: { type: Boolean, required: true },
    /** Toggle the detail. */
    onToggle: { type: Function as PropType<() => void>, required: true },
    /** Open a full view directly instead of disclosing inline detail. */
    onActivate: { type: Function as PropType<() => void>, required: false, default: undefined },
    /** Leading icon, before the label. */
    icon: {
      type: null as PropType<VNode | VNode[]> | null,
      required: false,
      default: undefined,
    },
    /** The strip's one-line summary. */
    label: { type: null as PropType<VNodeChild> | null, required: true },
    /** Use an icon-only disclosure when the adjacent action already carries the summary. */
    hideLabel: { type: Boolean, required: false, default: false },
    /** A shorter label for the tray chip (defaults to `label`). */
    chipLabel: {
      type: null as PropType<VNode | VNode[]> | null,
      required: false,
      default: undefined,
    },
    /** Hover text for the tray chip. */
    chipTitle: { type: String, required: false, default: undefined },
    /** Quieter text after the label (the thing in flight). */
    hint: {
      type: null as PropType<VNode | VNode[]> | null,
      required: false,
      default: undefined,
    },
    /** Right-hand readout and action buttons; they sit above the disclosure overlay and take their own clicks. */
    actions: {
      type: null as PropType<VNode | VNode[]> | null,
      required: false,
      default: undefined,
    },
    /**
     * Secondary actions: at the top of the open detail in the tray, beside
     * `actions` when standalone.
     */
    detailActions: {
      type: null as PropType<VNode | VNode[]> | null,
      required: false,
      default: undefined,
    },
    /** Extra attributes for the root (e.g. a tone `data-*`). */
    rootProps: {
      type: Object as PropType<Record<string, string>>,
      required: false,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const tray = inject(WorkTrayContext, null)
    const rowClasses = computed(() =>
      cm.cn(cm.button({ variant: 'ghost', color: 'secondary', size: 'xs' }), cm.touchTargetCompact),
    )
    const labelClasses = computed(() => cm.cn(cm.textMuted, cm.textSize('xs')))

    // Names the overlay disclosure button through `aria-labelledby`; taken once, as React's
    // `useId()` is stable across renders.
    const labelId = useId()

    /** The row's accessible name: the label, but only when it is plain text. */
    const rowAriaLabel = computed(() =>
      props.hideLabel && typeof props.label === 'string' ? props.label : undefined,
    )

    return (): VNodeChild => {
      const onKeydown =
        (activateIt: () => void) =>
        (event: KeyboardEvent): void => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            activateIt()
          }
        }
      if (tray) {
        // Read inside the render's reactive effect, so an open-section change
        // re-renders this strip.
        const open = !props.onActivate && tray.openId.value === props.molId
        // The detail's content, taken once while the section is open: React's `slot(children)`
        // decides from what it renders, so an empty list opens no detail.
        const detail = open ? slots.default?.() : undefined
        const chipTitle =
          props.chipTitle ??
          (props.hideLabel && typeof props.label === 'string' ? props.label : undefined)
        const trayActivate = (): void => {
          if (props.onActivate) props.onActivate()
          else tray.toggle(props.molId)
        }
        return [
          h(
            'div',
            {
              'data-mol-id': props.molId,
              ...(props.rootProps ?? {}),
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                maxWidth: '100%',
              },
            },
            [
              h(
                'div',
                {
                  role: 'button',
                  tabindex: 0,
                  'data-mol-id': props.toggleMolId,
                  'aria-expanded': props.onActivate ? undefined : open ? 'true' : 'false',
                  'aria-label': rowAriaLabel.value,
                  title: chipTitle,
                  class: rowClasses.value,
                  'data-state': open ? 'open' : 'closed',
                  onClick: () => trayActivate(),
                  onKeydown: onKeydown(trayActivate),
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: '0',
                    ...(open ? { boxShadow: 'inset 0 0 0 1px currentColor' } : {}),
                  },
                },
                [
                  props.icon ?? null,
                  props.hideLabel
                    ? h(
                        'svg',
                        {
                          'aria-hidden': 'true',
                          width: '12',
                          height: '12',
                          viewBox: '0 0 16 16',
                        },
                        [
                          h('path', {
                            d: open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4',
                            fill: 'none',
                            stroke: 'currentColor',
                            'stroke-width': '1.5',
                          }),
                        ],
                      )
                    : h(
                        'span',
                        {
                          class: labelClasses.value,
                          style: {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        },
                        [renders(props.chipLabel) ? props.chipLabel : props.label],
                      ),
                ],
              ),
              props.actions ?? null,
            ],
          ),
          open && (renders(detail) || renders(props.detailActions)) && tray.detailEl.value
            ? h(Teleport, { to: tray.detailEl.value }, [
                h(
                  'div',
                  {
                    'data-mol-id': `${props.molId}-detail`,
                    style: { padding: '2px 10px 8px' },
                  },
                  [
                    renders(props.detailActions)
                      ? h(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '6px',
                            },
                          },
                          [props.detailActions],
                        )
                      : null,
                    detail ?? null,
                  ],
                ),
              ])
            : null,
        ]
      }
      // The detail's content, taken once while the strip is expanded (React's `slot(children)`).
      const detail = !props.onActivate && props.expanded ? slots.default?.() : undefined
      return h(
        'div',
        {
          'data-mol-id': props.molId,
          ...(props.rootProps ?? {}),
          style: { borderTop: '1px solid rgba(128,128,128,0.15)', padding: '8px 8px 8px 10px' },
        },
        [
          h(
            'div',
            {
              // A container with real controls inside: the disclosure is the
              // transparent overlay button below, and the actions paint above it.
              class: cm.cn(rowClasses.value, cm.position('relative')),
              /* mol-bespoke-button: the strip's HEADER ROW — chevron, label and
                 actions on one disclosure line. */
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                cursor: 'pointer',
              },
            },
            [
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': props.toggleMolId,
                  'aria-expanded': props.onActivate ? undefined : props.expanded ? 'true' : 'false',
                  'aria-labelledby': props.hideLabel ? undefined : labelId,
                  'aria-label':
                    props.hideLabel && typeof props.label === 'string' ? props.label : undefined,
                  onClick: props.onActivate ?? props.onToggle,
                  /* mol-bespoke-button: the whole row is the disclosure's hit
                   area, not a CTA — an empty, transparent button over the row;
                   the inline background/border/padding are native resets. A
                   `hideLabel` toggle whose label is a NODE (not a string) has
                   no text to name it, so the node renders inside in a visually
                   hidden wrapper — its text names the button without changing
                   the row's pixels. */
                  class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
                  style: { background: 'transparent', border: 'none', padding: 0 },
                },
                [
                  props.hideLabel && typeof props.label !== 'string'
                    ? h('span', { class: cm.srOnly }, [props.label])
                    : null,
                ],
              ),
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: '0' } },
                [
                  !props.onActivate
                    ? h(
                        'svg',
                        {
                          xmlns: 'http://www.w3.org/2000/svg',
                          viewBox: '0 0 16 16',
                          width: '12',
                          height: '12',
                          'aria-hidden': 'true',
                          style: {
                            transform: props.expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 120ms',
                            opacity: '0.5',
                            flexShrink: '0',
                          },
                        },
                        [
                          h('path', {
                            d: 'M6 4l4 4-4 4',
                            fill: 'none',
                            stroke: 'currentColor',
                            'stroke-width': '1.5',
                            'stroke-linecap': 'round',
                            'stroke-linejoin': 'round',
                          }),
                        ],
                      )
                    : null,
                  props.icon ?? null,
                  !props.hideLabel
                    ? h(
                        'span',
                        {
                          id: labelId,
                          class: labelClasses.value,
                          style: {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        },
                        [props.label],
                      )
                    : null,
                  renders(props.hint)
                    ? h(
                        'span',
                        {
                          class: labelClasses.value,
                          style: {
                            opacity: '0.75',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: '0',
                          },
                        },
                        [props.hint],
                      )
                    : null,
                ],
              ),
              renders(props.actions) || renders(props.detailActions)
                ? h(
                    'div',
                    {
                      class: cm.position('relative'),
                      style: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: '0' },
                    },
                    [props.actions ?? null, props.detailActions ?? null],
                  )
                : null,
            ],
          ),
          renders(detail)
            ? h('div', { style: { marginTop: '6px', paddingLeft: '18px' } }, [detail])
            : null,
        ],
      )
    }
  },
})
