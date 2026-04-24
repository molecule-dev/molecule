import { getClassMap } from '@molecule/app-ui'

interface PriceRangeSliderProps {
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
 * @param root0
 * @param root0.min
 * @param root0.max
 * @param root0.value
 * @param root0.onChange
 * @param root0.step
 * @param root0.formatValue
 * @param root0.label
 * @param root0.className
 */
export function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatValue,
  label,
  className,
}: PriceRangeSliderProps) {
  const cm = getClassMap()
  const [low, high] = value
  const fmt = formatValue ?? ((n: number) => `$${n.toLocaleString()}`)
  return (
    <div className={cm.cn(cm.stack(2), className)}>
      {label && (
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{label}</span>
      )}
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <span className={cm.textSize('sm')}>{fmt(low)}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => onChange([Math.min(Number(e.target.value), high), high])}
          className={cm.flex1}
          aria-label="Minimum"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => onChange([low, Math.max(Number(e.target.value), low)])}
          className={cm.flex1}
          aria-label="Maximum"
        />
        <span className={cm.textSize('sm')}>{fmt(high)}</span>
      </div>
    </div>
  )
}
