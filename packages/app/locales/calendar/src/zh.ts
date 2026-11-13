import type { CalendarTranslations } from './types.js'

/** Calendar translations for Chinese. */
export const zh: CalendarTranslations = {
  'calendar.error.noProvider':
    '`@molecule/app-device-calendar`：未设置提供程序。请使用 `CalendarProvider` 实现调用 `setProvider()` — Molecule 未附带此提供程序；请在原生运行时中实现该接口并进行绑定。',
}
