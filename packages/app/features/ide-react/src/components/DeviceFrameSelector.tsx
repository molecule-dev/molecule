/**
 * Device-frame selector for the preview panel — a themed dropdown menu.
 *
 * The trigger shows the CURRENT frame's icon plus a chevron-down affordance.
 * Opening it lists every device frame (Responsive / Desktop / Tablet / Mobile)
 * with its bonded icon + i18n label; choosing one calls `onChange`. This
 * replaced the old single-button "cycle on click" affordance — selecting a
 * frame directly is far less error-prone than blind-cycling through four.
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
 * A dropdown that selects the preview device frame.
 * @param root0 - The component props.
 * @param root0.current - The currently selected device frame.
 * @param root0.onChange - Callback invoked with the chosen frame.
 * @param root0.className - Optional CSS class name for the trigger button.
 * @returns The rendered device-frame selector element.
 */
export function DeviceFrameSelector({
  current,
  onChange,
  className,
}: DeviceFrameSelectorProps): JSX.Element {
  const cm = getClassMap()

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

  const onTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openMenu(currentIndex)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        openMenu(DEVICE_FRAMES.length - 1)
      }
    },
    [openMenu, currentIndex],
  )

  const onMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setActiveIndex((index) => (index + 1) % DEVICE_FRAMES.length)
          break
        case 'ArrowUp':
          event.preventDefault()
          setActiveIndex((index) => (index - 1 + DEVICE_FRAMES.length) % DEVICE_FRAMES.length)
          break
        case 'Home':
          event.preventDefault()
          setActiveIndex(0)
          break
        case 'End':
          event.preventDefault()
          setActiveIndex(DEVICE_FRAMES.length - 1)
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
    [closeMenu],
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
        </div>
      )}
    </div>
  )
}

DeviceFrameSelector.displayName = 'DeviceFrameSelector'
