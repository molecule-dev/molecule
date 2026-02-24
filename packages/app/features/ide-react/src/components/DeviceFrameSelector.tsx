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
            onClick={() => onChange(frame)}
            className={cm.cn(
              cm.button({ variant: isActive ? 'solid' : 'ghost', size: 'xs' }),
              !isActive && cm.borderAll,
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

DeviceFrameSelector.displayName = 'DeviceFrameSelector'
