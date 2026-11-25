import type React from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, RangeField, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link PriceRangeSlider}. */
export interface PriceRangeSliderProps {
  /** Minimum possible value. */
  min: number
  /** Maximum possible value. */
  max: number
  /** Current [low, high] tuple. If only one value is relevant, set low === min. */
  value: [number, number]
  /** Called whenever either handle moves. */
  onChange: (value: [number, number]) => void
  /** Step increment. Defaults to 1. */
  step?: number
  /** Called to format each endpoint label — defaults to USD currency formatting. */
  formatValue?: (n: number) => string
  /** Optional label above. */
  label?: React.ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Dual-handle numeric range slider using two native `<input type="range">`
 * controls. Apps supply min/max/step and a `formatValue` to render the
 * endpoint labels (typical use: currency-formatted prices).
 * @param props - Component props (see {@link PriceRangeSliderProps}).
 */
export function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatValue,
  label: labelProp,
  className,
}: PriceRangeSliderProps): React.ReactElement {
  const label = slot(labelProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  const [low, high] = value
  const fmt = formatValue ?? ((n: number) => `$${n.toLocaleString()}`)
  return (
    <Box as="div" className={cm.cn(cm.stack(2), className)}>
      {label && (
        <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {label}
        </Text>
      )}
      <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Text as="span" className={cm.textSize('sm')}>
          {fmt(low)}
        </Text>
        <RangeField
          min={min}
          max={max}
          step={step}
          value={low}
          onValueChange={(next) => onChange([Math.min(next, high), high])}
          className={cm.flex1}
          aria-label={t('priceRangeSlider.aria.minimum', undefined, { defaultValue: 'Minimum' })}
        />
        <RangeField
          min={min}
          max={max}
          step={step}
          value={high}
          onValueChange={(next) => onChange([low, Math.max(next, low)])}
          className={cm.flex1}
          aria-label={t('priceRangeSlider.aria.maximum', undefined, { defaultValue: 'Maximum' })}
        />
        <Text as="span" className={cm.textSize('sm')}>
          {fmt(high)}
        </Text>
      </Box>
    </Box>
  )
}
