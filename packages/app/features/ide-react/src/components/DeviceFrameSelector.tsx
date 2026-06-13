/**
 * Single-button device-frame cycler for the preview panel.
 *
 * One click advances the preview through the device-frame cycle
 * (responsive → desktop → tablet → mobile → responsive). The button shows the
 * CURRENT frame's icon and a tooltip naming the current frame and the next one
 * a click will switch to. Icons come from the bonded `@molecule/app-icons` set
 * (no unicode glyphs, no ad-hoc SVG paths).
 *
 * The button carries `cm.touchTarget`, so its compact `xs` desktop size grows to
 * a WCAG-compliant >=44x44px hit-area on touch (coarse-pointer) devices.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { DeviceFrameSelectorProps } from '../types.js'
import { DEVICE_META, deviceIconName, nextDevice } from './device-cycle.js'
import { Icon } from './Icon.js'

/**
 * A single button that cycles the preview device frame on click.
 * @param root0 - The component props.
 * @param root0.current - The currently selected device frame.
 * @param root0.onChange - Callback invoked with the next frame when clicked.
 * @param root0.className - Optional CSS class name for the button.
 * @returns The rendered device-cycle button element.
 */
export function DeviceFrameSelector({
  current,
  onChange,
  className,
}: DeviceFrameSelectorProps): JSX.Element {
  const cm = getClassMap()

  const next = nextDevice(current)
  const currentLabel = t(
    DEVICE_META[current].labelKey,
    {},
    { defaultValue: DEVICE_META[current].label },
  )
  const nextLabel = t(DEVICE_META[next].labelKey, {}, { defaultValue: DEVICE_META[next].label })
  // Tooltip: current frame + the frame a click will switch to.
  const title = t(
    'ide.device.cycleHint',
    { current: currentLabel, next: nextLabel },
    { defaultValue: '{{current}} — click for {{next}}' },
  )

  return (
    <button
      type="button"
      data-mol-id="preview-device-cycle"
      aria-label={title}
      title={title}
      onClick={() => onChange(next)}
      className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget, className)}
    >
      <Icon name={deviceIconName(current)} size={16} aria-hidden="true" />
    </button>
  )
}

DeviceFrameSelector.displayName = 'DeviceFrameSelector'
