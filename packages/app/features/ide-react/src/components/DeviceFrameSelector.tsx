/**
 * Device frame picker for preview panel.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import type { DeviceFrame } from '@molecule/app-live-preview'
import { getClassMap } from '@molecule/app-ui'

import type { DeviceFrameSelectorProps } from '../types.js'

/**
 * Shared SVG wrapper for the device-frame glyphs.
 * @param root0 - The component props.
 * @param root0.active - Whether the parent button is currently selected.
 * @param root0.children - The SVG primitives that draw the glyph.
 * @returns The rendered SVG icon element.
 */
function DeviceIcon({
  active,
  children,
}: {
  active: boolean
  children: JSX.Element | JSX.Element[]
}): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: active ? 1 : 0.7, display: 'block' }}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/**
 * Returns the glyph for a given device frame.
 * @param frame - The device frame to draw.
 * @param active - Whether the parent button is currently selected.
 * @returns The rendered icon element.
 */
function frameIcon(frame: DeviceFrame, active: boolean): JSX.Element {
  switch (frame) {
    case 'desktop':
      return (
        <DeviceIcon active={active}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </DeviceIcon>
      )
    case 'tablet':
      return (
        <DeviceIcon active={active}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </DeviceIcon>
      )
    case 'mobile':
      return (
        <DeviceIcon active={active}>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </DeviceIcon>
      )
    default:
      // 'none' → responsive: fluid width (arrows pushing both edges)
      return (
        <DeviceIcon active={active}>
          <polyline points="8 7 4 12 8 17" />
          <polyline points="16 7 20 12 16 17" />
          <line x1="4" y1="12" x2="20" y2="12" />
        </DeviceIcon>
      )
  }
}

/**
 * Radio group for selecting a device frame in the preview panel.
 * @param root0 - The component props.
 * @param root0.current - The currently selected device frame.
 * @param root0.onChange - Callback invoked when a device frame is selected.
 * @param root0.className - Optional CSS class name for the container.
 * @returns The rendered device frame selector element.
 */
export function DeviceFrameSelector({
  current,
  onChange,
  className,
}: DeviceFrameSelectorProps): JSX.Element {
  const cm = getClassMap()

  const devices: { frame: DeviceFrame; label: string }[] = [
    { frame: 'none', label: t('ide.device.responsive') },
    { frame: 'desktop', label: t('ide.device.desktop') },
    { frame: 'tablet', label: t('ide.device.tablet') },
    { frame: 'mobile', label: t('ide.device.mobile') },
  ]

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'row', align: 'center', gap: 'xs' }), className)}
      role="radiogroup"
      aria-label={t('ide.device.label')}
    >
      {devices.map(({ frame, label }) => {
        const isActive = current === frame
        return (
          <button
            key={frame}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => onChange(frame)}
            className={cm.cn(
              cm.button({ variant: isActive ? 'solid' : 'ghost', size: 'xs' }),
              !isActive && cm.borderAll,
            )}
          >
            {frameIcon(frame, isActive)}
          </button>
        )
      })}
    </div>
  )
}

DeviceFrameSelector.displayName = 'DeviceFrameSelector'
