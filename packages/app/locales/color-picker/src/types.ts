/** Translation keys for the color-picker locale package. */
export type ColorPickerTranslationKey =
  | 'colorPicker.group'
  | 'colorPicker.hex'
  | 'colorPicker.hue'
  | 'colorPicker.saturation'
  | 'colorPicker.value'
  | 'colorPicker.r'
  | 'colorPicker.g'
  | 'colorPicker.b'

/** Translation record mapping color-picker-react keys to translated strings. */
export type ColorPickerTranslations = Record<ColorPickerTranslationKey, string>
