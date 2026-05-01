/**
 * Public types for `<ColorPicker>`.
 *
 * @module
 */

/** RGB color, 8-bit components (0–255). */
export interface RgbColor {
  /** Red (0–255). */
  r: number
  /** Green (0–255). */
  g: number
  /** Blue (0–255). */
  b: number
}

/** HSV color, hue degrees + saturation/value 0–1. */
export interface HsvColor {
  /** Hue in degrees (0–360). */
  h: number
  /** Saturation (0–1). */
  s: number
  /** Value / brightness (0–1). */
  v: number
}

/** Props for {@link ColorPicker}. */
export interface ColorPickerProps {
  /** Current color as a 6-character HEX string with leading `#`. */
  value: string
  /** Called whenever the user picks a new color. Receives a `#rrggbb` string. */
  onChange: (hex: string) => void
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
