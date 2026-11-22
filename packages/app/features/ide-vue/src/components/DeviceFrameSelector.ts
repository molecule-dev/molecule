/**
 * Device-frame selector for the preview panel — a themed dropdown menu.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `DeviceFrameSelector` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, the same callbacks. The trigger shows the CURRENT
 * frame's icon plus a chevron-down affordance; opening it lists every device
 * frame with its bonded icon + i18n label, then — after a divider — the
 * preview's Rotate (a `menuitemcheckbox` toggle, shown only where relevant)
 * and Open-in-new-tab actions sharing the frame rows' roving focus.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express, written the way the DOM takes them (Vue, unlike
 * React, does not append `px` to numeric style values, so the pixels spell
 * their unit). All user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, onBeforeUnmount, type PropType, ref, watch } from 'vue'

import type { IconName } from '@molecule/app-icons'
import type { DeviceFrameSelectorProps } from '@molecule/app-ide-panel-logic'
import { DEVICE_FRAMES, DEVICE_META } from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { Icon } from './Icon.js'

/** One device frame (the shared frame union, read off the panel-logic list). */
type Frame = (typeof DEVICE_FRAMES)[number]

/**
 * Props for {@link DeviceFrameSelector}, extending the shared
 * {@link DeviceFrameSelectorProps} with the in-dropdown action callbacks (P4-04):
 * the device dropdown also hosts the Rotate and Open-in-new-tab controls that
 * used to be separate toolbar buttons.
 */
export interface DeviceFrameSelectorWithActionsProps extends DeviceFrameSelectorProps {
  /** Whether the current frame can be rotated — gates the Rotate item ("when/where relevant"). */
  canRotate?: boolean
  /** Whether the preview is currently rotated to landscape — renders Rotate as a CHECKED toggle. */
  rotated?: boolean
  /** Rotate the current fixed-frame device portrait ⇄ landscape. Omit to hide the Rotate item. */
  onRotate?: () => void
  /** Open the preview URL in a new browser tab. Omit to hide the Open-in-new-tab item. */
  onOpenExternal?: () => void
}

/**
 * A dropdown that selects the preview device frame and hosts the Rotate +
 * Open-in-new-tab actions.
 *
 * @param props - See {@link DeviceFrameSelectorWithActionsProps}.
 * @returns The rendered device-frame selector.
 */
export const DeviceFrameSelector = defineComponent({
  name: 'DeviceFrameSelector',
  inheritAttrs: false,
  props: {
    /** The frame the preview currently shows. */
    current: { type: String as PropType<Frame>, required: true },
    /** Selects a frame from the menu. */
    onChange: { type: Function as PropType<(device: Frame) => void>, required: true },
    /** Extra class on the trigger button. */
    className: { type: String, required: false, default: undefined },
    /** Whether the current frame can be rotated — gates the Rotate item. */
    canRotate: { type: Boolean, required: false, default: undefined },
    /** Whether the preview is rotated to landscape — renders Rotate as CHECKED. */
    rotated: { type: Boolean, required: false, default: undefined },
    /** Rotate the current fixed-frame device portrait ⇄ landscape. */
    onRotate: { type: Function as PropType<() => void>, required: false, default: undefined },
    /** Open the preview URL in a new browser tab. */
    onOpenExternal: { type: Function as PropType<() => void>, required: false, default: undefined },
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()

    const open = ref(false)
    // Index of the menu item with roving focus while the menu is open.
    const activeIndex = ref(0)
    const rootRef = ref<HTMLDivElement | null>(null)
    const triggerRef = ref<HTMLButtonElement | null>(null)
    // Filled during the patch by the rows' ref functions (React's `itemRefs`).
    const itemRefs: Array<HTMLButtonElement | null> = []

    /**
     * Closes the menu, returning focus to the trigger unless the close should
     * leave focus where it is (React's `closeMenu(refocus)`).
     * @param refocus - Whether the trigger takes focus back (default `true`).
     */
    const closeMenu = (refocus = true): void => {
      open.value = false
      if (refocus) triggerRef.value?.focus()
    }

    /**
     * Opens the menu with roving focus on the given row.
     * @param index - The row the focus starts on.
     */
    const openMenu = (index: number): void => {
      activeIndex.value = index
      open.value = true
    }

    // Close on outside pointer-down (React's `useEffect` on `open`).
    const onOutsidePointerDown = (event: MouseEvent): void => {
      if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
        open.value = false
      }
    }
    watch(
      open,
      (isOpen) => {
        if (typeof document === 'undefined') return
        if (isOpen) document.addEventListener('mousedown', onOutsidePointerDown)
        else document.removeEventListener('mousedown', onOutsidePointerDown)
      },
      { immediate: true },
    )
    onBeforeUnmount(() => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousedown', onOutsidePointerDown)
      }
    })

    // Move real DOM focus to the active row whenever the menu opens / moves
    // (React's `useEffect` on `[open, activeIndex]`, after the patch).
    watch(
      [open, activeIndex],
      () => {
        if (open.value) itemRefs[activeIndex.value]?.focus()
      },
      { flush: 'post' },
    )

    /**
     * Selects a frame: fires `onChange` and closes the menu.
     * @param frame - The chosen frame.
     */
    const select = (frame: Frame): void => {
      props.onChange(frame)
      closeMenu()
    }

    /**
     * Runs an action row (Rotate / Open in new tab) then closes the menu.
     * @param run - The action's callback.
     */
    const runAction = (run: () => void): void => {
      run()
      closeMenu()
    }

    /**
     * The trigger's keyboard handling: ArrowDown / Enter / Space open at the
     * current frame, ArrowUp opens at the last row.
     * @param event - The key press.
     */
    const onTriggerKeyDown = (event: KeyboardEvent): void => {
      const itemCount =
        DEVICE_FRAMES.length +
        Number(Boolean(props.canRotate && props.onRotate)) +
        Number(Boolean(props.onOpenExternal))
      const currentIndex = Math.max(0, DEVICE_FRAMES.indexOf(props.current))
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openMenu(currentIndex)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        openMenu(itemCount - 1)
      }
    }

    /**
     * The menu's keyboard handling: the arrows move the roving focus with
     * wrapping, Home/End jump to the ends, Escape closes (refocusing the
     * trigger) and Tab lets focus leave while the menu collapses.
     * @param event - The key press.
     */
    const onMenuKeyDown = (event: KeyboardEvent): void => {
      const itemCount =
        DEVICE_FRAMES.length +
        Number(Boolean(props.canRotate && props.onRotate)) +
        Number(Boolean(props.onOpenExternal))
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          activeIndex.value = (activeIndex.value + 1) % itemCount
          break
        case 'ArrowUp':
          event.preventDefault()
          activeIndex.value = (activeIndex.value - 1 + itemCount) % itemCount
          break
        case 'Home':
          event.preventDefault()
          activeIndex.value = 0
          break
        case 'End':
          event.preventDefault()
          activeIndex.value = itemCount - 1
          break
        case 'Escape':
          event.preventDefault()
          closeMenu()
          break
        case 'Tab':
          // Let focus leave naturally, but collapse the menu.
          open.value = false
          break
        default:
          break
      }
    }

    /**
     * One menu row's inline style: the shared icon + label row treatment whose
     * highlight is a theme token (never a hex, never a ClassMap background).
     * @param isActive - Whether the row holds the roving focus.
     * @returns The style object.
     */
    const rowStyle = (isActive: boolean): Record<string, string> => ({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      padding: '6px 8px',
      textAlign: 'left',
      border: 'none',
      borderRadius: '6px',
      color: 'inherit',
      cursor: 'pointer',
      font: 'inherit',
      // Highlight (hover + keyboard) via a theme token — kept inline so it
      // doesn't fight a ClassMap background class.
      background: isActive ? 'var(--mol-color-surface-secondary, transparent)' : 'transparent',
    })

    return () => {
      // Action rows shown below the device frames (P4-04), after a divider:
      // Rotate (only "where relevant" — a rotatable frame AND a wired handler)
      // and Open in new tab (whenever a handler is wired). Built per render so
      // the labels follow a locale switch, exactly like React.
      const actionItems: ReadonlyArray<{
        id: string
        icon: IconName
        label: string
        run: () => void
        /** When set, the row renders as a `menuitemcheckbox` reflecting this state. */
        checked?: boolean
      }> = [
        ...(props.canRotate && props.onRotate
          ? [
              {
                id: 'preview-device-rotate',
                icon: 'rotate' as const,
                label: t('ide.device.rotate', undefined, { defaultValue: 'Rotate' }),
                run: props.onRotate,
                // Rotate is a TOGGLE (portrait ⇄ landscape) — show its state
                // with a check, so it reads as a toggle, not a one-shot action.
                checked: !!props.rotated,
              },
            ]
          : []),
        ...(props.onOpenExternal
          ? [
              {
                id: 'preview-open-external',
                icon: 'link-external' as const,
                label: t('ide.preview.openNewTab', undefined, {
                  defaultValue: 'Open in new tab',
                }),
                run: props.onOpenExternal,
              },
            ]
          : []),
      ]
      const currentIndex = Math.max(0, DEVICE_FRAMES.indexOf(props.current))
      const selectLabel = t('ide.device.select', undefined, { defaultValue: 'Device frame' })
      const currentLabel = t(DEVICE_META[props.current].labelKey, undefined, {
        defaultValue: DEVICE_META[props.current].label,
      })

      const rows = [
        ...DEVICE_FRAMES.map((frame, index) => {
          const label = t(DEVICE_META[frame].labelKey, undefined, {
            defaultValue: DEVICE_META[frame].label,
          })
          const isCurrent = frame === props.current
          const isActive = index === activeIndex.value
          /* mol-bespoke-button: a menuitemradio ROW inside the device menu —
             icon + label + check, the menu's own treatment, not a CTA. Its
             highlight is a theme token and its hit floor is the ClassMap's
             36px row floor (the trigger's 44px would double the menu). */
          return h(
            'button',
            {
              key: frame,
              ref: (node: unknown) => {
                itemRefs[index] = (node as HTMLButtonElement | null) ?? null
              },
              type: 'button',
              role: 'menuitemradio',
              'aria-checked': isCurrent,
              tabindex: isActive ? 0 : -1,
              'data-mol-id': `preview-device-option-${frame}`,
              onClick: () => select(frame),
              onMouseenter: () => {
                activeIndex.value = index
              },
              class: cm.touchTargetCompact,
              style: rowStyle(isActive),
            },
            [
              h(Icon, { name: DEVICE_META[frame].icon, size: 16, 'aria-hidden': 'true' }),
              h('span', { style: { flex: '1 1 0%' } }, [label]),
              isCurrent ? h(Icon, { name: 'check', size: 14, 'aria-hidden': 'true' }) : null,
            ],
          )
        }),
        // Divider between the device frames and the action rows (P4-04). A
        // thin theme-token line, never a hex.
        ...(actionItems.length > 0
          ? [
              h('div', {
                key: 'separator',
                role: 'separator',
                'aria-hidden': 'true',
                'data-mol-id': 'preview-device-menu-separator',
                style: {
                  height: '1px',
                  margin: '4px 0px',
                  background: 'var(--mol-color-border, rgba(128,128,128,0.2))',
                },
              }),
            ]
          : []),
        // Rotate / Open in new tab — the same icon + label row styling as the
        // frame options above, but plain `menuitem`s (actions, not radio
        // choices).
        ...actionItems.map((item, actionIdx) => {
          const index = DEVICE_FRAMES.length + actionIdx
          const isActive = index === activeIndex.value
          /* mol-bespoke-button: the action ROWS of the same menu — identical
             row treatment and hit floor to the frame options above, so the
             menu reads as one list. */
          return h(
            'button',
            {
              key: item.id,
              ref: (node: unknown) => {
                itemRefs[index] = (node as HTMLButtonElement | null) ?? null
              },
              type: 'button',
              role: item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem',
              'aria-checked': item.checked,
              tabindex: isActive ? 0 : -1,
              'data-mol-id': item.id,
              onClick: () => runAction(item.run),
              onMouseenter: () => {
                activeIndex.value = index
              },
              class: cm.touchTargetCompact,
              style: rowStyle(isActive),
            },
            [
              h(Icon, { name: item.icon, size: 16, 'aria-hidden': 'true' }),
              h('span', { style: { flex: '1 1 0%' } }, [item.label]),
              // Toggle rows (Rotate) show a check when on — the selected
              // device row's affordance, so it reads as a toggle.
              item.checked ? h(Icon, { name: 'check', size: 14, 'aria-hidden': 'true' }) : null,
            ],
          )
        }),
      ]

      return h('div', { ref: rootRef, style: { position: 'relative', display: 'inline-flex' } }, [
        h(Tooltip, { content: selectLabel, placement: 'bottom' }, () =>
          h(
            'button',
            {
              ref: triggerRef,
              type: 'button',
              'data-mol-id': 'preview-device-cycle',
              'aria-haspopup': 'menu',
              'aria-expanded': open.value,
              'aria-label': `${selectLabel}: ${currentLabel}`,
              onClick: () => (open.value ? closeMenu(false) : openMenu(currentIndex)),
              onKeydown: onTriggerKeyDown,
              class: cm.cn(
                cm.button({ variant: 'ghost', size: 'xs' }),
                cm.touchTarget,
                props.className,
              ),
            },
            [
              h(Icon, {
                name: DEVICE_META[props.current].icon,
                size: 16,
                'aria-hidden': 'true',
              }),
              h(Icon, {
                name: 'chevron-down',
                size: 12,
                'aria-hidden': 'true',
                style: { marginLeft: '1px' },
              }),
            ],
          ),
        ),
        open.value
          ? h(
              'div',
              {
                role: 'menu',
                'aria-label': selectLabel,
                // tabindex={-1}: the WAI-ARIA menu pattern keeps focus on the
                // items, but the menu itself must be able to HOLD focus
                // programmatically.
                tabindex: -1,
                onKeydown: onMenuKeyDown,
                class: cm.cn(cm.surface, cm.borderAll, cm.shadowLifted, cm.textSize('xs')),
                style: {
                  position: 'absolute',
                  top: '100%',
                  right: '0px',
                  marginTop: '4px',
                  minWidth: '168px',
                  padding: '4px',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  zIndex: 30,
                },
              },
              rows,
            )
          : null,
      ])
    }
  },
})
