/**
 * Device-frame selector for the preview panel — a themed dropdown menu.
 *
 * The trigger shows the CURRENT frame's icon plus a chevron-down affordance.
 * Opening it lists every device frame (Responsive / Desktop / Tablet / Mobile)
 * with its bonded icon + i18n label; choosing one calls `onChange`. This
 * replaced the old single-button "cycle on click" affordance — selecting a
 * frame directly is far less error-prone than blind-cycling through four.
 *
 * Below the frames (after a divider) the menu also hosts the preview's "Rotate"
 * and "Open in new tab" actions (P4-04) that used to be separate toolbar
 * buttons. "Rotate" is a TOGGLE — a `menuitemcheckbox` that shows a check when the
 * preview is rotated to landscape — shown only "where relevant", i.e. when the
 * current frame is rotatable (fixed-frame tablet/mobile) and an `onRotate` handler
 * is wired;
 * "Open in new tab" is shown whenever an `onOpenExternal` handler is wired.
 * Both share the frame rows' icon + label styling and the same roving focus.
 *
 * The menu is a minimal, accessible, fully themed popover built from ClassMap
 * tokens + bonded `<Icon>`s (keyboard navigable, outside-click + Escape close,
 * `role="menu"` / `role="menuitemradio"` with roving focus). It deliberately
 * does NOT use the framework `Dropdown`: that component imports
 * `react-router-dom` via `useLocation`, and this feature package is kept free
 * of that dependency (the same reason {@link Tooltip} is subpath-imported here,
 * never the package barrel).
 *
 * The trigger carries `cm.touchTarget`, so its compact `xs` desktop size grows
 * to a WCAG-compliant >=44×44px hit-area on touch (coarse-pointer) devices.
 *
 * @module
 */

import { type JSX, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import type { DeviceFrameSelectorProps } from '../types.js'
import { DEVICE_FRAMES, DEVICE_META } from './device-cycle.js'
import { Icon } from './Icon.js'

/**
 * Props for {@link DeviceFrameSelector}, extending the shared
 * {@link DeviceFrameSelectorProps} with the in-dropdown action callbacks (P4-04):
 * the device dropdown now also hosts the Rotate and Open-in-new-tab controls that
 * used to be separate toolbar buttons.
 */
interface DeviceFrameSelectorWithActionsProps extends DeviceFrameSelectorProps {
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
 * @param root0 - The component props.
 * @param root0.current - The currently selected device frame.
 * @param root0.onChange - Callback invoked with the chosen frame.
 * @param root0.className - Optional CSS class name for the trigger button.
 * @param root0.canRotate - Whether the current frame is rotatable (gates the Rotate item).
 * @param root0.rotated - Whether the preview is currently landscape (renders Rotate as a checked toggle).
 * @param root0.onRotate - Rotate the current fixed-frame device; omit to hide the Rotate item.
 * @param root0.onOpenExternal - Open the preview in a new tab; omit to hide the item.
 * @returns The rendered device-frame selector element.
 */
export function DeviceFrameSelector({
  current,
  onChange,
  className,
  canRotate,
  rotated,
  onRotate,
  onOpenExternal,
}: DeviceFrameSelectorWithActionsProps): JSX.Element {
  const cm = getClassMap()

  // Action rows shown below the device frames (P4-04), after a divider: Rotate
  // (only "where relevant" — when the current frame is rotatable AND a handler
  // is wired) and Open in new tab (whenever a handler is wired). Built as data so
  // they share the frame rows' roving-focus model + menu-item styling.
  const actionItems: ReadonlyArray<{
    id: string
    icon: string
    label: string
    run: () => void
    /** When set, the row renders as a `menuitemcheckbox` toggle reflecting this state. */
    checked?: boolean
  }> = [
    ...(canRotate && onRotate
      ? [
          {
            id: 'preview-device-rotate',
            icon: 'rotate',
            label: t('ide.device.rotate', {}, { defaultValue: 'Rotate' }),
            run: onRotate,
            // Rotate is a TOGGLE (portrait ⇄ landscape) — show its on/off state with a
            // check, so it reads as a toggle rather than a one-shot action.
            checked: !!rotated,
          },
        ]
      : []),
    ...(onOpenExternal
      ? [
          {
            id: 'preview-open-external',
            icon: 'link-external',
            label: t('ide.preview.openNewTab', {}, { defaultValue: 'Open in new tab' }),
            run: onOpenExternal,
          },
        ]
      : []),
  ]
  // Total roving-focus targets = device frames + the conditional action rows.
  const itemCount = DEVICE_FRAMES.length + actionItems.length

  const [open, setOpen] = useState(false)
  // Index of the menu item with roving focus while the menu is open.
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const currentIndex = Math.max(0, DEVICE_FRAMES.indexOf(current))
  const selectLabel = t('ide.device.select', {}, { defaultValue: 'Device frame' })

  const closeMenu = useCallback((refocusTrigger = true) => {
    setOpen(false)
    if (refocusTrigger) triggerRef.current?.focus()
  }, [])

  const openMenu = useCallback((index: number) => {
    setActiveIndex(index)
    setOpen(true)
  }, [])

  // Close on outside pointer-down.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Move real DOM focus to the active item whenever the menu opens / moves.
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const select = useCallback(
    (frame: (typeof DEVICE_FRAMES)[number]) => {
      onChange(frame)
      closeMenu()
    },
    [onChange, closeMenu],
  )

  // Run an action row (Rotate / Open in new tab) then close the menu.
  const runAction = useCallback(
    (run: () => void) => {
      run()
      closeMenu()
    },
    [closeMenu],
  )

  const onTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openMenu(currentIndex)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        openMenu(itemCount - 1)
      }
    },
    [openMenu, currentIndex, itemCount],
  )

  const onMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setActiveIndex((index) => (index + 1) % itemCount)
          break
        case 'ArrowUp':
          event.preventDefault()
          setActiveIndex((index) => (index - 1 + itemCount) % itemCount)
          break
        case 'Home':
          event.preventDefault()
          setActiveIndex(0)
          break
        case 'End':
          event.preventDefault()
          setActiveIndex(itemCount - 1)
          break
        case 'Escape':
          event.preventDefault()
          closeMenu()
          break
        case 'Tab':
          // Let focus leave naturally, but collapse the menu.
          setOpen(false)
          break
        default:
          break
      }
    },
    [closeMenu, itemCount],
  )

  const currentLabel = t(
    DEVICE_META[current].labelKey,
    {},
    { defaultValue: DEVICE_META[current].label },
  )

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <Tooltip content={selectLabel} placement="bottom">
        <button
          ref={triggerRef}
          type="button"
          data-mol-id="preview-device-cycle"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`${selectLabel}: ${currentLabel}`}
          onClick={() => (open ? closeMenu(false) : openMenu(currentIndex))}
          onKeyDown={onTriggerKeyDown}
          className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget, className)}
        >
          <Icon name={DEVICE_META[current].icon} size={16} aria-hidden="true" />
          <Icon name="chevron-down" size={12} aria-hidden="true" style={{ marginLeft: 1 }} />
        </button>
      </Tooltip>

      {open && (
        <div
          role="menu"
          aria-label={selectLabel}
          onKeyDown={onMenuKeyDown}
          className={cm.cn(cm.surface, cm.borderAll, cm.shadowLifted, cm.textSize('xs'))}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 168,
            padding: 4,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            zIndex: 30,
          }}
        >
          {DEVICE_FRAMES.map((frame, index) => {
            const label = t(
              DEVICE_META[frame].labelKey,
              {},
              { defaultValue: DEVICE_META[frame].label },
            )
            const isCurrent = frame === current
            const isActive = index === activeIndex
            return (
              <button
                key={frame}
                ref={(node) => {
                  itemRefs.current[index] = node
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                tabIndex={isActive ? 0 : -1}
                data-mol-id={`preview-device-option-${frame}`}
                onClick={() => select(frame)}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 8px',
                  textAlign: 'left',
                  border: 'none',
                  borderRadius: 6,
                  color: 'inherit',
                  cursor: 'pointer',
                  font: 'inherit',
                  // Highlight (hover + keyboard) via a theme token, never a hex —
                  // kept inline so it doesn't fight a ClassMap background class.
                  background: isActive
                    ? 'var(--mol-color-surface-secondary, transparent)'
                    : 'transparent',
                }}
              >
                <Icon name={DEVICE_META[frame].icon} size={16} aria-hidden="true" />
                <span style={{ flex: 1 }}>{label}</span>
                {isCurrent && <Icon name="check" size={14} aria-hidden="true" />}
              </button>
            )
          })}

          {/* Divider between the device frames and the action rows (P4-04). A thin
              theme-token line, never a hex. */}
          {actionItems.length > 0 && (
            <div
              role="separator"
              aria-hidden="true"
              data-mol-id="preview-device-menu-separator"
              style={{
                height: 1,
                margin: '4px 0',
                background: 'var(--mol-color-border, rgba(128,128,128,0.2))',
              }}
            />
          )}

          {/* Rotate / Open in new tab — same icon + label row styling as the frame
              options above, but plain `menuitem`s (actions, not radio choices). */}
          {actionItems.map((item, actionIdx) => {
            const index = DEVICE_FRAMES.length + actionIdx
            const isActive = index === activeIndex
            return (
              <button
                key={item.id}
                ref={(node) => {
                  itemRefs.current[index] = node
                }}
                type="button"
                role={item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
                aria-checked={item.checked}
                tabIndex={isActive ? 0 : -1}
                data-mol-id={item.id}
                onClick={() => runAction(item.run)}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 8px',
                  textAlign: 'left',
                  border: 'none',
                  borderRadius: 6,
                  color: 'inherit',
                  cursor: 'pointer',
                  font: 'inherit',
                  // Highlight (hover + keyboard) via a theme token, never a hex —
                  // matching the frame rows above.
                  background: isActive
                    ? 'var(--mol-color-surface-secondary, transparent)'
                    : 'transparent',
                }}
              >
                <Icon name={item.icon} size={16} aria-hidden="true" />
                <span style={{ flex: 1 }}>{item.label}</span>
                {/* Toggle rows (Rotate) show a check when on — same affordance as the
                    selected device row, so it reads as a toggle, not a one-shot action. */}
                {item.checked && <Icon name="check" size={14} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

DeviceFrameSelector.displayName = 'DeviceFrameSelector'
