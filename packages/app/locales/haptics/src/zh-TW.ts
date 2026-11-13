import type { HapticsTranslations } from './types.js'

/** Haptics translations for Chinese (Traditional). */
export const zhTW: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`：未設定提供者。請呼叫`setProvider()`並傳入`HapticsProvider`實作－Molecule 沒有提供該提供者；請在您的原生執行時間環境中實作該介面並將其綁定。',
}
