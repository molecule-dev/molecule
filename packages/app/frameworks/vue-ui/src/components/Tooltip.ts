/**
 * Vue Tooltip UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  type Component,
  defineComponent,
  h,
  onUnmounted,
  type PropType,
  ref,
  Teleport,
  type VNode,
  type VNodeArrayChildren,
  type VNodeChild,
  watch,
} from 'vue'

import { measureTooltipPosition, OverlayLayer } from '@molecule/app-overlay-dom'
import type { TooltipPlacement, TooltipProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, type RenderableChildren, restAttrs, styleOf } from '../utilities/attrs.js'
import { useElementRef } from '../utilities/elementRef.js'
import { setDisplayName } from './displayName.js'

interface Position {
  top: number
  left: number
}

/** Arrow square size (px) before the 45° rotation that turns it into a diamond. */
const ARROW_SIZE = 8

// Coordinate hover and delayed shows across all tooltip instances in a page.
// A document key avoids sharing an active control between distinct documents.
const activeTooltips = new WeakMap<Document, () => void>()

/**
 * Returns the arrow's inline position style for a given placement. The arrow
 * has no dedicated ClassMap resolver (`tooltip()` takes no options), so its
 * shape/position is expressed via a small inline style — the sanctioned
 * exception for values ClassMap cannot express. Its color is NOT hardcoded:
 * `var(--color-surface)` / `var(--color-border)` are the same CSS custom
 * properties the `bg-surface`/`border` Tailwind utilities in `tooltipContent`
 * resolve to (see `@molecule/app-ui-tailwind/base.css`), so the arrow always
 * matches the tooltip body in both themes.
 * @param placement - The tooltip's resolved placement.
 * @returns Inline style positioning the rotated-square arrow for that placement.
 */
function getArrowStyle(placement: TooltipPlacement): Record<string, string | number> {
  const half = ARROW_SIZE / 2
  // Vue does not auto-append `px` to numeric style values the way React does,
  // so the pixel values are written as unit strings here.
  const base: Record<string, string | number> = {
    position: 'absolute',
    width: `${ARROW_SIZE}px`,
    height: `${ARROW_SIZE}px`,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }
  switch (placement) {
    case 'top':
      return {
        ...base,
        bottom: `${-half}px`,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
    case 'top-start':
      return { ...base, bottom: `${-half}px`, left: '12px', transform: 'rotate(45deg)' }
    case 'top-end':
      return { ...base, bottom: `${-half}px`, right: '12px', transform: 'rotate(45deg)' }
    case 'bottom':
      return {
        ...base,
        top: `${-half}px`,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
    case 'bottom-start':
      return { ...base, top: `${-half}px`, left: '12px', transform: 'rotate(45deg)' }
    case 'bottom-end':
      return { ...base, top: `${-half}px`, right: '12px', transform: 'rotate(45deg)' }
    case 'left':
      return {
        ...base,
        right: `${-half}px`,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
    case 'right':
      return {
        ...base,
        left: `${-half}px`,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
    default:
      return base
  }
}

/** Per-instance counter backing each Tooltip's unique describedby id. */
let nextTooltipId = 0

/**
 * Vue Tooltip UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Tooltip. `children` (the
 * default slot) should be a single element node for the tooltip's content to
 * be programmatically associated with it via `aria-describedby` while
 * visible; a plain-text or multi-node trigger still shows the tooltip on
 * hover/focus, but without that association. `hasArrow` renders a small
 * themed pointer at the resolved `placement` edge. Entering another tooltip
 * trigger immediately dismisses the previous tooltip, including any pending
 * delayed show.
 */
export const Tooltip = defineComponent({
  name: 'MTooltip',
  inheritAttrs: false,
  props: {
    content: {
      type: null,
      required: true,
    },
    placement: {
      type: String as PropType<TooltipPlacement>,
      default: 'top',
    },
    delay: {
      type: Number,
      default: 0,
    },
    hasArrow: Boolean,
    className: String,
    style: [String, Object] as PropType<TooltipProps['style']>,
    testId: String,
  },
  setup(props, { attrs, slots, expose }) {
    const cm = getClassMap()
    // Programmatically associates the tooltip with its trigger. The wrapper
    // is not itself the focused element, so its `aria-describedby` would
    // never be announced for the child that actually receives focus (see
    // the single-child clone below).
    const generatedTooltipId = `mol-tooltip-${nextTooltipId++}`
    const isVisible = ref(false)
    const position = ref<Position>({ top: 0, left: 0 })
    const triggerRef = ref<HTMLElement | null>(null)
    // The visible tooltip box is React's `forwardRef` target; it holds `null`
    // while the tooltip is closed.
    const tooltipRef = useElementRef<HTMLDivElement>(expose)
    let showTimeout: ReturnType<typeof setTimeout> | undefined
    let hideTimeout: ReturnType<typeof setTimeout> | undefined
    let owner: Document | undefined
    const layer = new OverlayLayer()

    const updatePosition = (): void => {
      if (triggerRef.value && tooltipRef.value)
        position.value = measureTooltipPosition(triggerRef.value, tooltipRef.value, props.placement)
    }

    const hide = (): void => {
      if (showTimeout) {
        clearTimeout(showTimeout)
      }
      clearTimeout(hideTimeout)
      if (owner && activeTooltips.get(owner) === hide) activeTooltips.delete(owner)
      owner = undefined
      isVisible.value = false
    }

    const show = (): void => {
      const doc = triggerRef.value?.ownerDocument
      if (doc) {
        if (owner && owner !== doc && activeTooltips.get(owner) === hide)
          activeTooltips.delete(owner)
        owner = doc
        const previous = activeTooltips.get(doc)
        if (previous !== hide) previous?.()
        // Claim before scheduling so another trigger also cancels pending shows.
        activeTooltips.set(doc, hide)
      }
      clearTimeout(hideTimeout)
      if (showTimeout) {
        clearTimeout(showTimeout)
      }
      if (props.delay > 0) {
        showTimeout = setTimeout(() => {
          isVisible.value = true
        }, props.delay)
      } else {
        isVisible.value = true
      }
    }

    // Allow the pointer to cross the placement gap into the tooltip itself.
    const scheduleHide = (): void => {
      if (showTimeout) {
        clearTimeout(showTimeout)
      }
      clearTimeout(hideTimeout)
      hideTimeout = setTimeout(hide, 150)
    }

    const keepVisible = (): void => {
      clearTimeout(hideTimeout)
    }

    // Show on focus ONLY for keyboard focus (:focus-visible). A mouse click or a
    // programmatic .focus() — e.g. a dropdown/menu returning focus to its trigger
    // after it closes — must NOT re-show a tooltip the click was meant to dismiss.
    // Guarded: engines without :focus-visible support (older browsers, jsdom) throw
    // on the unknown selector — there we simply skip the focus-show (hover still
    // works), the safe default.
    const handleFocus = (event: FocusEvent): void => {
      const target = event.target as HTMLElement
      try {
        if (typeof target.matches === 'function' && target.matches(':focus-visible')) {
          show()
        }
      } catch (_error) {
        // :focus-visible unsupported here — don't show on focus; hover still applies.
      }
    }

    // Vue hears mouseover/mouseout (what bubbles across the boundary), and
    // re-derives React's synthetic enter/leave semantics from `relatedTarget`:
    // only a crossing of the wrapper's boundary shows/hides — moving between
    // descendants (or into the tooltip gap) does neither.
    const handleMouseEnter = (e: MouseEvent): void => {
      if (triggerRef.value?.contains(e.relatedTarget as Node)) return
      show()
    }

    const handleMouseLeave = (e: MouseEvent): void => {
      if (triggerRef.value?.contains(e.relatedTarget as Node)) return
      scheduleHide()
    }

    const handleTooltipMouseEnter = (e: MouseEvent): void => {
      const el = tooltipRef.value
      if (el?.parentElement?.contains(e.relatedTarget as Node)) return
      keepVisible()
    }

    const handleTooltipMouseLeave = (e: MouseEvent): void => {
      const el = tooltipRef.value
      if (el?.parentElement?.contains(e.relatedTarget as Node)) return
      scheduleHide()
    }

    // The layout-effect equivalent: measure + place in the same update the
    // tooltip mounts in (post-flush runs right after the patch, before the
    // harness snapshot), so the first painted frame carries the real position
    // instead of the {0,0} default. Re-measures when content or placement
    // changes while visible, like React's layout-effect dependency list.
    watch(
      [isVisible, () => props.content, () => props.placement],
      ([visible]) => {
        if (visible) updatePosition()
        layer.sync({
          open: visible,
          kind: 'tooltip',
          surface: { current: tooltipRef.value },
          anchor: { current: triggerRef.value },
          dismissKey: true,
          onDismiss: hide,
        })
      },
      { flush: 'post' },
    )

    onUnmounted(() => {
      if (showTimeout) {
        clearTimeout(showTimeout)
      }
      clearTimeout(hideTimeout)
      layer.release()
      if (owner && activeTooltips.get(owner) === hide) activeTooltips.delete(owner)
    })

    return () => {
      // A caller's `id` names the tooltip box, so the trigger's
      // `aria-describedby` points at it (React: `rest.id ?? useId()`).
      const tooltipId = typeof attrs.id === 'string' ? attrs.id : generatedTooltipId
      // Single-child API (mirrors every mainstream tooltip library): when the
      // trigger is exactly one element node, re-create it with
      // `aria-describedby` while the tooltip is visible — that id is what a
      // screen reader announces alongside the element's accessible name. For
      // anything other than a single element node (plain text, a fragment,
      // multiple nodes) there is no single DOM node to attach the id to, so
      // the association is skipped rather than guessed.
      const child = slots.default?.() as VNodeChild | undefined
      const single = Array.isArray(child) && child.length === 1 ? child[0] : child
      // A VNode, not a text/fragment/comment placeholder (those have symbol types).
      const isCloneableChild =
        !!single &&
        typeof single === 'object' &&
        'type' in single &&
        typeof (single as { type: unknown }).type !== 'symbol'
      let describedChildren: VNodeChild | undefined = child
      if (isCloneableChild && isVisible.value) {
        const vnode = single as VNode
        // Element/component children keep their normalized children shape
        // (string | VNodeArrayChildren | slots); `h` re-creates the same
        // node with the describedby id injected on top of its own props.
        describedChildren = h(
          vnode.type as string | Component,
          {
            ...vnode.props,
            'aria-describedby': [vnode.props?.['aria-describedby'], tooltipId]
              .filter(Boolean)
              .join(' '),
          },
          typeof vnode.children === 'string'
            ? vnode.children
            : ((vnode.children ?? undefined) as VNodeArrayChildren),
        )
      }

      // The wrapper is not a control: it listens for the events that bubble
      // up from the control inside it (hover, focus, Escape, a click), so it
      // is a presentation element and the control keeps its own role.
      const trigger = h(
        'div',
        {
          ref: triggerRef,
          role: 'presentation',
          onMouseover: handleMouseEnter,
          onMouseout: handleMouseLeave,
          onFocusin: handleFocus,
          onFocusout: () => hide(),
          // WCAG 1.4.13: hover/focus-triggered content must be dismissable
          // WITHOUT moving the pointer or focus — Escape hides the tooltip
          // (the keydown on the focused child bubbles up to this wrapper).
          onKeydown: (e: KeyboardEvent) => {
            if (!isVisible.value && e.key === 'Escape') hide()
          },
          // Any click on a tooltip-wrapped control hides the tooltip — clicking a
          // button shouldn't leave its hover/focus tooltip lingering.
          onClick: () => hide(),
          class: cm.tooltipTrigger,
        },
        // VNodeChild's null/undefined atoms are the "no children" case; `h`
        // takes those as an omitted parameter instead.
        describedChildren as RenderableChildren,
      )

      // Outer positioned wrapper carries the top/left/zIndex placement; the
      // arrow renders as its SIBLING (not nested inside the visible box),
      // because `tooltipContent` sets `overflow-hidden` — an arrow meant to
      // poke past the box's own edge would be clipped invisible if it were a
      // descendant of that element instead.
      const body = triggerRef.value?.ownerDocument.body
      const tooltipElement =
        isVisible.value && body
          ? h(
              Teleport,
              { to: body },
              h(
                'div',
                {
                  style: {
                    position: 'absolute',
                    top: `${position.value.top}px`,
                    left: `${position.value.left}px`,
                    zIndex: 9999,
                  },
                  onMouseover: handleTooltipMouseEnter,
                  onMouseout: handleTooltipMouseLeave,
                },
                [
                  h(
                    'div',
                    {
                      ref: tooltipRef,
                      role: 'tooltip',
                      class: cm.cn(cm.tooltipContent, ...classOf(props.className, attrs)),
                      style: styleOf(props.style, attrs),
                      'data-testid': props.testId,
                      // The box carries every declared prop (title, aria-*, data-*,
                      // automationId as data-mol-id, handlers); the box's id is the
                      // caller's or the generated one.
                      ...restAttrs(attrs),
                      id: tooltipId,
                    },
                    props.content ?? slots.content?.(),
                  ),
                  props.hasArrow
                    ? h('span', { 'aria-hidden': 'true', style: getArrowStyle(props.placement) })
                    : null,
                ],
              ),
            )
          : null

      return [trigger, tooltipElement]
    }
  },
})

setDisplayName(Tooltip, 'Tooltip')
