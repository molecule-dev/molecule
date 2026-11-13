import type { HapticsTranslations } from './types.js'

/** Haptics translations for Chinese. */
export const zh: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`：未设置提供程序。请使用 `HapticsProvider` 实现调用 `setProvider()` — Molecule 未附带此提供程序；请在原生运行时中实现该接口并进行绑定。',
}
