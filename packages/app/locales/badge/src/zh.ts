import type { BadgeTranslations } from './types.js'

/** Badge translations for Chinese. */
export const zh: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`：未设置提供程序。请使用 `BadgeProvider` 实现调用 `setProvider()` — Molecule 未附带此提供程序；请在原生运行时中实现该接口并进行绑定。',
}
