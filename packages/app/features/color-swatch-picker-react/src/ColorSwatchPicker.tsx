import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface ColorSwatch {
  /** Value stored in state (can be the raw color or a semantic id). */
  value: string
  /** CSS color (any valid color string). */
  color: string
  /** Optional label shown as tooltip / aria-label. */
  label?: string
}

interface ColorSwatchPickerProps {
  /** Swatch definitions. */
  swatches: ColorSwatch[]
  /** Currently selected swatch value. */
  value: string
  /** Called when a swatch is picked. */
  onChange: (value: string) => void
  /** Swatch diameter in pixels. Defaults to 28. */
  size?: number
  /** Gap between swatches. */
  gap?: 'xs' | 'sm' | 'md'
  /** Optional child rendered below (e.g. a live preview). */
  preview?: ReactNode
  /** Extra classes. */
  className?: string
  /** `aria-label` for the group. */
  ariaLabel?: string
}

/**
 * Grid of colored circles with single-select state. Used for tag
 * colors, label colors, theme accent swatches, etc.
 * @param root0
 * @param root0.swatches
 * @param root0.value
 * @param root0.onChange
 * @param root0.size
 * @param root0.gap
 * @param root0.preview
 * @param root0.className
 * @param root0.ariaLabel
 */
export function ColorSwatchPicker({
  swatches,
  value,
  onChange,
  size = 28,
  gap = 'sm',
  preview,
  className,
  ariaLabel,
}: ColorSwatchPickerProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.stack(2), className)}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className={cm.flex({ align: 'center', gap, wrap: 'wrap' })}
      >
        {swatches.map((s) => {
          const selected = s.value === value
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={s.label ?? s.value}
              onClick={() => onChange(s.value)}
              className={cm.roundedFull}
              style={{
                width: size,
                height: size,
                background: s.color,
                outline: selected ? '2px solid currentColor' : 'none',
                outlineOffset: 2,
                border: 'none',
                cursor: 'pointer',
              }}
            />
          )
        })}
      </div>
      {preview}
    </div>
  )
}
