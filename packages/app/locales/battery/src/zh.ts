import type { BatteryTranslations } from './types.js'

/** Battery translations for zh. */
export const zh: Partial<BatteryTranslations> = {
  'battery.unknown': '未知',
  'battery.remainingUnknown': '未知',
  'battery.remainingMinutes': '{{minutes}}分钟',
  'battery.charging': '收费',
  'battery.discharging': '电池供电',
  'battery.full': '已充满电',
  'battery.not-charging': '无法充电',
  'battery.remainingTime': '{{hours}} h {{minutes}}米',
  'battery.error.noProvider':
    '`@molecule/app-battery`：未设置提供程序。请使用 `BatteryProvider` 实现调用 `setProvider()` — Molecule 未附带此提供程序；请在原生运行时中实现该接口并进行绑定。',
}
